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
