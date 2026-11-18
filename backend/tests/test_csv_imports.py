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
    assert client.post(endpoint+'/sync',headers=owner).status_code == 502
    assert client.get(endpoint,headers=owner).json()['checkpoint'] == first['checkpoint']
    second = client.post(endpoint+'/sync',headers=owner).json()
    assert second['checkpoint']['after'] is None
    assert second['checkpoint']['since_ms'] == first['checkpoint']['until_ms']
    assert calls[1] == calls[2]

def test_hubspot_oauth_connect_refresh_and_disconnect(monkeypatch):
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

    def exchange(fields):
        if fields['grant_type'] == 'refresh_token':
            assert fields['refresh_token'] == 'private-refresh'
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
    assert client.post(root+'/sync',headers=owner).status_code == 200
    assert client.delete(root+'/oauth',headers=owner).status_code == 200
    assert not client.get(root,headers=owner).json()['available']
