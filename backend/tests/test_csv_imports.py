import pytest

from test_studio import account, client, workspace


def test_staging_reconciles_again_at_approval_and_preserves_zero():
    owner, _, _ = account()
    outsider, _, _ = account()
    root = f'/api/studio/{workspace(owner)}'
    url = root + '/imports/csv'
    payload = {'source':'Ledger','columns':{'source_id':'Ref','metric':'Metric','value':'Amount','unit':'Unit','observed_on':'Date'},
               'csv_text':'Ref,Metric,Amount,Unit,Date\na,Sales,0,USD,2026-11-01\na,Sales,0.00,USD,2026-11-01\na,Sales,8,USD,2026-11-01\nb,Sales,NaN,USD,2026-11-01\nc,Orders,2,count,2026-11-01'}
    first = client.post(url, headers=owner, json=payload)
    assert first.status_code == 201, first.text
    batch = first.json()
    assert batch['data']['counts'] == {'ready':2,'duplicate':1,'conflict':1,'invalid':1}
    assert client.get(root+'/records?kind=metric', headers=owner).json() == []
    second = client.post(url, headers=owner, json=payload).json()
    def approve(row, headers=owner):
        return client.post(f"{url}/{row['id']}/approve", headers=headers,json={'confirmed':True,'version':row['version']})
    assert approve(batch, outsider).status_code == 404
    assert approve(batch).json()['data']['counts']['imported'] == 2
    assert approve(batch).json()['data']['counts']['imported'] == 2
    assert approve(second).json()['data']['counts']['duplicate'] == 3
    metrics = client.get(root+'/records?kind=metric', headers=owner).json()
    assert sorted(r['data']['value'] for r in metrics) == [0,2]
    assert client.delete(root+'/records/'+batch['id'], headers=owner).status_code == 409
    assert client.post(url,headers=owner,json={**payload,'csv_text':'wrong,headers\na,b'}).status_code == 422

def test_hubspot_deal_snapshots_use_existing_staging_rules():
    from app.csv_imports import parse
    from app.hubspot_observations import stageable_deals

    deal = {'id':'123', 'updatedAt':'2026-11-18T00:30:00+01:00',
            'properties':{'amount':'25.00','deal_currency_code':'EUR'}}
    payload, skipped = stageable_deals('78', [deal, {**deal,'archived':True}])
    assert skipped == 1
    seen = {}
    rows = parse(payload, seen)
    assert rows[0]['observation']['observed_on'] == '2026-11-17'
    assert rows[0]['observation']['value'] == '25'
    assert rows[0]['status'] == 'ready'
    assert parse(payload, seen)[0]['status'] == 'duplicate'

def test_hubspot_incremental_page_preserves_window_and_maps_deals():
    import httpx
    import json
    from app.hubspot_observations import fetch_deal_page, stageable_deals

    def provider(request):
        assert request.url.host == 'api.hubapi.com'
        assert request.headers['Authorization'] == 'Bearer fixture'
        body = json.loads(request.content)
        assert body['after'] == '200'
        assert [item['operator'] for item in body['filterGroups'][0]['filters']] == ['GTE','LT']
        assert [item['value'] for item in body['filterGroups'][0]['filters']] == ['1000','2000']
        return httpx.Response(200, json={'results':[{
            'id':'9','updatedAt':'2026-11-18T12:00:00Z',
            'properties':{'amount':'45','deal_currency_code':'USD'},
        }], 'paging':{'next':{'after':'400'}}})

    with httpx.Client(transport=httpx.MockTransport(provider)) as client:
        deals, cursor = fetch_deal_page(client,'fixture',since_ms=1000,until_ms=2000,after='200')
    payload, skipped = stageable_deals('78',deals)
    assert cursor == '400' and skipped == 0
    assert '45,USD,2026-11-18' in payload.csv_text

def test_hubspot_pages_detect_invalid_and_nonprogressing_cursors():
    import httpx
    import pytest
    from app.hubspot_observations import HubSpotWindowTooLarge, fetch_deal_page

    for paging, error in (
        ({'next': {'after': '200'}}, HubSpotWindowTooLarge),
        ({'next': {'after': '10000'}}, HubSpotWindowTooLarge),
        ({'next': {}}, RuntimeError),
    ):
        def provider(_):
            return httpx.Response(200, json={'results': [], 'paging': paging})

        with httpx.Client(transport=httpx.MockTransport(provider)) as client, pytest.raises(error):
            fetch_deal_page(client, 'fixture', since_ms=1000, until_ms=2000, after='200')

def test_hubspot_workspace_stages_pages_without_publishing_and_resumes(monkeypatch):
    from app import hubspot_imports

    owner, _, _ = account()
    outsider, _, _ = account()
    sid = workspace(owner)
    root = '/api/studio/' + sid
    endpoint = root + '/imports/hubspot'
    monkeypatch.setenv('EXECAI_HUBSPOT_WORKSPACE',sid)
    monkeypatch.setenv('EXECAI_HUBSPOT_PORTAL_ID','78')
    monkeypatch.setenv('EXECAI_HUBSPOT_ACCESS_TOKEN','fixture-secret')
    calls = []

    def fetch(client, token, **window):
        calls.append(window)
        assert token == 'fixture-secret'
        if len(calls) == 2:
            raise RuntimeError('provider down')
        return [{'id':str(len(calls)), 'updatedAt':'2026-11-18T12:00:00Z',
                 'properties':{'amount':'25','deal_currency_code':'USD'}}], ('200' if len(calls)==1 else None)

    monkeypatch.setattr(hubspot_imports,'fetch_deal_page',fetch)
    assert client.post(endpoint+'/sync',headers=outsider).status_code == 404
    response = client.post(endpoint+'/sync',headers=owner)
    assert response.status_code == 200,response.text
    first = response.json()
    assert first['batch']['data']['state'] == 'staged'
    assert first['checkpoint']['after'] == '200'
    assert client.get(root+'/records?kind=metric',headers=owner).json() == []
    def denied(*args, **window):
        assert window['after'] == '200'
        raise hubspot_imports.HubSpotAccessDenied()

    monkeypatch.setattr(hubspot_imports, 'fetch_deal_page', denied)
    revoked = client.post(endpoint+'/sync', headers=owner)
    assert revoked.status_code == 409, revoked.text
    assert 'crm.objects.deals.read' in revoked.json()['detail']
    assert client.get(endpoint, headers=owner).json()['checkpoint'] == first['checkpoint']
    assert client.get(root+'/records?kind=metric', headers=owner).json() == []
    monkeypatch.setattr(hubspot_imports, 'fetch_deal_page', fetch)
    assert client.post(endpoint+'/sync',headers=owner).status_code == 502
    assert client.get(endpoint,headers=owner).json()['checkpoint'] == first['checkpoint']
    second = client.post(endpoint+'/sync',headers=owner).json()
    assert second['checkpoint']['after'] is None
    assert second['checkpoint']['since_ms'] == first['checkpoint']['until_ms']
    assert calls[1] == calls[2]

    # An oversized first window is narrowed without advancing its lower bound.
    monkeypatch.setattr(hubspot_imports.time, 'time', lambda: (second['checkpoint']['since_ms'] + 900_000) / 1000)
    oversized = []
    def dense(*args, **window):
        oversized.append(window)
        if len(oversized) == 1:
            raise hubspot_imports.HubSpotWindowTooLarge()
        return [], None

    monkeypatch.setattr(hubspot_imports, 'fetch_deal_page', dense)
    split = client.post(endpoint+'/sync',headers=owner).json()
    assert split['window_narrowed'] and split['batch'] is None
    assert split['checkpoint']['since_ms'] == second['checkpoint']['since_ms']
    assert client.get(endpoint,headers=owner).json()['checkpoint'] == split['checkpoint']
    resumed = client.post(endpoint+'/sync',headers=owner).json()
    assert oversized[1]['until_ms'] == split['checkpoint']['until_ms']
    assert resumed['checkpoint']['since_ms'] == split['checkpoint']['until_ms']

def test_hubspot_oauth_connect_refresh_and_disconnect(monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Event
    from urllib.parse import parse_qs, urlsplit
    from cryptography.fernet import Fernet
    from app import hubspot_imports

    owner, _, _ = account()
    sid = workspace(owner)
    root = f'/api/studio/{sid}/imports/hubspot'
    for name, value in {
        'CLIENT_ID':'fixture', 'CLIENT_SECRET':'fixture-secret',
        'REDIRECT_URI':'http://localhost/api/studio/hubspot/oauth/callback',
        'CREDENTIAL_KEY':Fernet.generate_key().decode(),
    }.items():
        monkeypatch.setenv('EXECAI_HUBSPOT_'+name,value)

    refreshes = []
    def exchange(fields):
        if fields['grant_type'] == 'refresh_token':
            refreshes.append(fields['refresh_token'])
            return {'hub_id':78,'refresh_token':f'rotated-{len(refreshes)}','access_token':'short-lived'}
        return {'hub_id':78,'refresh_token':'private-refresh','access_token':'short-lived'}

    monkeypatch.setattr(hubspot_imports,'exchange_token',exchange)
    monkeypatch.setattr(hubspot_imports,'fetch_deal_page',lambda client,token,**window: ([],None))
    response = client.post(root+'/oauth/start',headers=owner)
    assert response.status_code == 200,response.text
    state = parse_qs(urlsplit(response.json()['url']).query)['state'][0]
    params = {'state':state,'code':'fixture-code'}
    callback = '/api/studio/hubspot/oauth/callback'
    result = client.get(callback,params=params)
    assert result.status_code == 200,result.text
    assert 'private-refresh' not in result.text
    assert client.get(callback,params=params).status_code == 400
    assert client.get(root,headers=owner).json()['oauth_linked']
    def failed_page(*args, **kwargs):
        raise RuntimeError('Provider unavailable')

    monkeypatch.setattr(hubspot_imports, 'fetch_deal_page', failed_page)
    assert client.post(root+'/sync',headers=owner).status_code == 502
    assert client.get(root,headers=owner).json()['checkpoint'] is None

    def valid_page(*args, **kwargs):
        return [{'id':'77','updatedAt':'2026-01-01T12:00:00Z',
                 'properties':{'amount':'50','deal_currency_code':'USD'}}],None

    prepare = hubspot_imports.prepare_batch
    def failed_staging(sid, payload, db, user):
        from sqlalchemy.exc import IntegrityError
        batch = prepare(sid, payload, db, user)
        db.flush()
        assert batch.id is not None
        raise IntegrityError('fixture staging failure', {}, Exception('fixture'))

    monkeypatch.setattr(hubspot_imports, 'fetch_deal_page', valid_page)
    monkeypatch.setattr(hubspot_imports, 'prepare_batch', failed_staging)
    assert client.post(root+'/sync',headers=owner).status_code == 502
    assert client.get(root,headers=owner).json()['checkpoint'] is None
    assert client.get(f'/api/studio/{sid}/imports/csv',headers=owner).json() == []

    monkeypatch.setattr(hubspot_imports, 'prepare_batch', prepare)
    monkeypatch.setattr(hubspot_imports,'fetch_deal_page',lambda client,token,**window: ([],None))
    assert client.post(root+'/sync',headers=owner).status_code == 200
    assert refreshes == ['private-refresh', 'rotated-1', 'rotated-2']
    original_checkpoint = client.get(root, headers=owner).json()['checkpoint']

    def different_portal(fields):
        assert fields['refresh_token'] == 'rotated-3'
        return {'hub_id': 79, 'refresh_token': 'wrong-portal', 'access_token': 'wrong-portal'}

    def never_fetch(*args, **kwargs):
        pytest.fail('A different portal must be rejected before fetching data')

    monkeypatch.setattr(hubspot_imports, 'exchange_token', different_portal)
    monkeypatch.setattr(hubspot_imports, 'fetch_deal_page', never_fetch)
    mismatch = client.post(root+'/sync', headers=owner)
    assert mismatch.status_code == 502, mismatch.text
    assert mismatch.json()['detail'] == 'HubSpot returned a different portal'
    assert client.get(root, headers=owner).json()['checkpoint'] == original_checkpoint

    monkeypatch.setattr(hubspot_imports, 'exchange_token', exchange)
    monkeypatch.setattr(hubspot_imports, 'fetch_deal_page', lambda *args, **kwargs: ([], None))
    assert client.post(root+'/sync', headers=owner).status_code == 200
    assert refreshes[-1] == 'rotated-3'
    checkpoint = client.get(root, headers=owner).json()['checkpoint']
    monkeypatch.setattr(hubspot_imports.time, 'time', lambda: (checkpoint['since_ms'] + 600_000) / 1000)
    fetching, release_page, disconnect_waiting = Event(), Event(), Event()
    workspace_lock = hubspot_imports.lock_workspace

    def slow_page(*args, **kwargs):
        fetching.set()
        assert release_page.wait(5), 'Test did not release the provider response'
        return valid_page(*args, **kwargs)

    def observe_lock(*args, **kwargs):
        if fetching.is_set():
            disconnect_waiting.set()
        return workspace_lock(*args, **kwargs)

    monkeypatch.setattr(hubspot_imports, 'fetch_deal_page', slow_page)
    monkeypatch.setattr(hubspot_imports, 'lock_workspace', observe_lock)
    with ThreadPoolExecutor(2) as pool:
        in_flight = pool.submit(client.post, root+'/sync', headers=owner)
        try:
            assert fetching.wait(5), 'Sync never reached the provider'
            disconnecting = pool.submit(client.delete, root+'/oauth', headers=owner)
            assert disconnect_waiting.wait(5), 'Disconnect never attempted to lock the workspace'
        finally:
            release_page.set()
        staged = in_flight.result(timeout=10)
        assert staged.status_code == 200, staged.text
        assert staged.json()['batch']['data']['state'] == 'staged'
        disconnected = disconnecting.result(timeout=10)
        assert disconnected.status_code == 200, disconnected.text
    assert not client.get(root,headers=owner).json()['available']
    assert client.post(root+'/sync',headers=owner).status_code == 409
    assert client.get(f'/api/studio/{sid}/records?kind=metric',headers=owner).json() == []


def test_hubspot_company_headcount_is_staged_with_separate_checkpoint(monkeypatch):
    from app import hubspot_imports

    owner, _, _ = account()
    sid = workspace(owner)
    root = f'/api/studio/{sid}'
    monkeypatch.setenv('EXECAI_HUBSPOT_WORKSPACE', sid)
    monkeypatch.setenv('EXECAI_HUBSPOT_PORTAL_ID', '78')
    monkeypatch.setenv('EXECAI_HUBSPOT_ACCESS_TOKEN', 'fixture-only')

    def companies(api_client, token, **window):
        assert token == 'fixture-only'
        assert window['after'] is None
        return [
            {'id': '77', 'updatedAt': '2026-11-18T12:00:00Z',
             'properties': {'name': 'Fixture company', 'numberofemployees': '0'}},
            {'id': '78', 'properties': {'name': 'Unknown headcount'}},
        ], 'next-company'

    monkeypatch.setattr(hubspot_imports, 'fetch_company_page', companies)
    response = client.post(root+'/imports/hubspot/sync?object_type=companies', headers=owner)
    assert response.status_code == 200, response.text
    result = response.json()
    assert result['skipped'] == 1
    batch = result['batch']
    observation = batch['data']['rows'][0]['observation']
    assert (observation['value'], observation['unit']) == ('0', 'employees')
    assert 'Fixture company' in observation['metric']
    assert client.get(root+'/imports/hubspot', headers=owner).json()['checkpoint'] is None
    companies_status = client.get(root+'/imports/hubspot?object_type=companies', headers=owner)
    assert companies_status.json()['checkpoint']['after'] == 'next-company'
    def denied(*args, **kwargs):
        raise hubspot_imports.HubSpotAccessDenied()

    monkeypatch.setattr(hubspot_imports, 'fetch_company_page', denied)
    rejected = client.post(root+'/imports/hubspot/sync?object_type=companies', headers=owner)
    assert rejected.status_code == 409
    assert 'crm.objects.companies.read' in rejected.json()['detail']
    assert client.get(root+'/imports/hubspot?object_type=companies', headers=owner).json() == companies_status.json()
    assert len(client.get(root+'/imports/csv', headers=owner).json()) == 1
    assert client.get(root+'/records?kind=metric', headers=owner).json() == []
    approved = client.post(root+f"/imports/csv/{batch['id']}/approve",
                           headers=owner, json={'version': batch['version'], 'confirmed': True})
    assert approved.status_code == 200, approved.text
    assert len(client.get(root+'/records?kind=metric', headers=owner).json()) == 1
