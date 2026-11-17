from test_outcomes import setup_review
from test_studio import account, client


def test_ordered_review_requires_current_revision_and_assigned_reviewer():
    owner, root, decision, _, _ = setup_review()
    first, first_user, email = account()
    last, last_user, other_email = account()
    for address in [email, other_email]:
        assert client.post(root + '/members', headers=owner, json={'email': address, 'role': 'editor'}).is_success
    approvals = root + '/approvals'
    evidence = client.get(root + '/freshness', headers=owner).json()['baselines'][0]['data']['evidence'][0]['id']
    payload = {'decision_id': decision['id'], 'reviewers': [first_user['id'], last_user['id']], 'evidence_ids': [evidence]}
    workflow = client.post(approvals, headers=owner, json=payload).json()
    path = approvals + '/' + workflow['id'] + '/transitions'
    def step(actor, version, action, comment=''):
        return client.post(path, headers=actor, json={'version': version, 'action': action, 'comment': comment})
    submitted = step(owner, workflow['version'], 'submit').json()
    assert step(last, submitted['version'], 'approve').status_code == 403
    reviewed = step(first, submitted['version'], 'approve').json()
    edit = client.put(root + '/records/' + decision['id'], headers=owner, json={'kind': 'decision', 'title':'Revised proposal','version':decision['version']})
    assert edit.is_success, edit.text
    assert step(last, reviewed['version'], 'approve').status_code == 409
    stale = client.get(approvals, headers=owner).json()['workflows'][0]
    assert stale['data']['status'] == 'changes_requested'
    new = step(owner, stale['version'], 'submit').json()
    reviewed = step(first, new['version'], 'approve').json()
    final = step(last, reviewed['version'], 'approve').json()
    assert final['data']['status'] == 'approved'
    timeline = client.get(approvals, headers=owner).json()['workflows'][0]['data']['events']
    assert [event['decision_version'] for event in timeline if event['action']=='approve'] == [1,2,2]


def test_self_approval_policy_changes_rejection_and_audit_protection():
    owner, root, decision, _, _ = setup_review()
    outsider, _, _ = account()
    approvals = root + '/approvals'
    policy = approvals + '/policy'
    assert client.get(approvals, headers=outsider).status_code == 404
    evidence = client.get(root + '/freshness', headers=owner).json()['baselines'][0]['data']['evidence'][0]['id']
    payload = {'decision_id':decision['id'],'reviewers':[decision['author_id']],'evidence_ids':[evidence]}
    assert client.post(approvals, headers=owner,json=payload).status_code == 422
    assert client.put(policy, headers=owner,json={'allow_self_approval':True}).is_success
    row = client.post(approvals, headers=owner,json=payload).json()
    path = approvals + '/' + row['id'] + '/transitions'
    def action(row, name, comment=''):
        return client.post(path,headers=owner,json={'version':row['version'],'action':name,'comment':comment})
    row = action(row,'submit').json()
    assert action(row,'request_changes').status_code == 422
    row = action(row,'request_changes','Attach revised figures').json()
    assert row['data']['status']=='changes_requested'
    row = action(row,'submit').json()
    assert client.put(policy,headers=owner,json={'allow_self_approval':False}).is_success
    assert action(row,'approve').status_code == 403
    row = action(row,'withdraw').json()
    assert row['data']['status']=='withdrawn'
    assert action(row,'submit').status_code == 409
    assert client.delete(root+'/records/'+row['id'],headers=owner).status_code == 409
