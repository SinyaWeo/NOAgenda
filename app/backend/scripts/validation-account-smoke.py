#!/usr/bin/env python3
"""
Input validation, error handling, data export and account deletion smoke test.

Needs a DISPOSABLE database, an API with email verification OFF (no SMTP),
LOGIN_RATE_LIMIT=100, DELETION_REQUEST_LIMIT=100 and ACCOUNT_PURGE_INTERVAL_SECONDS=3, plus a way to run SQL:

  SQL_CMD='mysql -h127.0.0.1 -uroot -pSECRET noagenda_ci -N' \
  BASE_URL=http://127.0.0.1:3000 python3 scripts/validation-account-smoke.py

SQL_CMD must read SQL from stdin (used to backdate the deletion grace period).
Set UPLOADS_ON_THIS_HOST=1 if the API's uploads/ directory is visible to this script.
"""
import json, os, secrets, ssl, subprocess, sys, time, urllib.error, urllib.request
import uuid

B = os.environ.get('BASE_URL', 'http://127.0.0.1:3000')
SQL = os.environ.get('SQL_CMD')
LOCAL_FILES = os.environ.get('UPLOADS_ON_THIS_HOST') == '1'
CTX = ssl._create_unverified_context() if os.environ.get('AUTHZ_INSECURE') == '1' else None
results = []
run = secrets.token_hex(3)
PW = 'validation pass 12'


def call(method, path, body=None, token=None, raw=None, ctype='application/json'):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(B + path, data=data, method=method)
    if data is not None: req.add_header('Content-Type', ctype)
    if token: req.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req, context=CTX) as r:
            t = r.read().decode()
            try: return r.status, (json.loads(t) if t else None), r.headers
            except ValueError: return r.status, t, r.headers
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t), e.headers
        except ValueError: return e.code, t, e.headers


def check(name, got, want):
    ok = got in want if isinstance(want, (list, set)) else got == want
    results.append(ok); print(('PASS ' if ok else 'FAIL ') + f'{name}  (got {got!r}, want {want!r})')


def sql(q):
    return subprocess.run(SQL, shell=True, input=q, capture_output=True, text=True, check=True).stdout.strip()


def user(name):
    s, u, _ = call('POST', '/users', {'username': f'{name}{run}', 'email': f'{name}{run}@example.com', 'password': PW})
    assert s == 201, (s, u)
    s, l, _ = call('POST', '/auth/login', {'username': f'{name}{run}', 'password': PW})
    assert s == 200, (s, l)
    return u['id'], l['access_token'], f'{name}{run}'


def multipart(path, token, fields, filename, content, ctype='text/plain'):
    bd = uuid.uuid4().hex
    parts = []
    for k, v in fields.items():
        parts.append(f'--{bd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    parts.append(f'--{bd}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: {ctype}\r\n\r\n'.encode() + content + b'\r\n')
    parts.append(f'--{bd}--\r\n'.encode())
    return call('POST', path, token=token, raw=b''.join(parts), ctype=f'multipart/form-data; boundary={bd}')


aid, A, aname = user('amy')      # main actor
bid, Bt, bname = user('ben')     # second user
s, proj, _ = call('POST', '/projects', {'name': 'Validation project', 'description': 'd'}, A); pid = proj['id']

# ======================= validation =======================
s, _, _ = call('POST', '/tasks', {'description': 'no title'}, A); check('task without title rejected', s, 400)
s, _, _ = call('POST', '/tasks', {'title': ''}, A); check('empty title rejected', s, 400)
s, _, _ = call('POST', '/tasks', {'title': 'x' * 300}, A); check('over-long title rejected', s, 400)
s, _, _ = call('POST', '/tasks', {'title': 't', 'priority': 99}, A); check('priority out of range rejected', s, 400)
s, _, _ = call('POST', '/tasks', {'title': 't', 'status': 'bogus'}, A); check('unknown status rejected', s, 400)
s, _, _ = call('POST', '/tasks', {'title': 't', 'dueDate': 'next tuesday'}, A); check('malformed date rejected', s, 400)
s, _, _ = call('POST', '/tasks', {'title': 't', 'percentDone': 150}, A); check('percentDone > 100 rejected', s, 400)
s, _, _ = call('POST', '/tasks', {'title': 't', 'isAdmin': True}, A); check('unknown field rejected', s, 400)
s, _, _ = call('POST', '/tasks', {'title': 't', 'id': 1}, A); check('client-supplied id rejected', s, 400)
s, _, _ = call('POST', '/tasks', {'title': 't', 'description': 3}, A); check('wrong type rejected', s, 400)
s, _, _ = call('POST', '/tasks', raw=b'{not json', token=A); check('malformed JSON is a 400, not a 500', s, 400)

long_text = 'long description ' * 300  # ~5000 chars: used to overflow a varchar(255)
s, t1, _ = call('POST', '/tasks', {'title': 'Legacy shape', 'description': long_text, 'project': {'id': pid}}, A)
check('task with {project:{id}} and a long description is created', s, 201)
check('...and lands inside that project', t1.get('parentId'), pid)
s, got, _ = call('GET', f'/tasks/{t1["id"]}', token=A); check('long description round-trips intact', got['description'], long_text)
s, t2, _ = call('POST', '/tasks', {'title': 'Subtask', 'parentTaskId': t1['id']}, A); check('parentTaskId shape accepted', s, 201)
check('...and nests under the parent task', t2['parentId'], t1['id'])
s, t3, _ = call('POST', '/tasks', {'title': 'Both given', 'parentTaskId': t1['id'], 'project': {'id': pid}}, A)
check('when both are given the parent task wins', (s, t3['parentId']), (201, t1['id']))
s, _, _ = call('POST', '/tasks', {'title': 'Empty ref', 'project': {}}, A); check('an empty project reference is rejected', s, 400)
s, _, _ = call('POST', '/comments', {'content': 'c' * 3000, 'taskId': t1['id']}, A); check('3000-character comment accepted', s, 201)
s, _, _ = call('PUT', f'/tasks/{t1["id"]}', {'status': 'in_progress', 'priority': 3, 'percentDone': 40, 'dueDate': '2030-01-02T10:00:00.000Z', 'startDate': None}, A); check('typical task update accepted', s, 200)
s, _, _ = call('PUT', f'/tasks/{t1["id"]}', {'title': ''}, A); check('update to empty title rejected', s, 400)
s, _, _ = call('POST', '/projects', {'name': ''}, A); check('empty project name rejected', s, 400)
s, _, _ = call('POST', '/nodes', {'type': 'folder', 'name': 'x'}, A); check('unknown node type rejected', s, 400)
s, _, _ = call('PUT', f'/nodes/{t1["id"]}', {'type': 'project'}, A); check('node type cannot be changed', s, 400)

# paging / query validation
for q in ['/tasks?limit=100000', '/tasks?limit=abc', '/tasks?limit=0', '/tasks?page=-1', '/tasks?status=bogus', '/tasks?sort=password',
          '/nodes?type=bogus', '/nodes?parentId=abc', '/nodes?limit=501', '/tasks?projectId=abc']:
    s, _, _ = call('GET', q, token=A); check(f'bad query {q} rejected', s, 400)
for q in ['/tasks?limit=50&page=1&order=desc&sort=priority', f'/tasks?projectId={pid}', '/nodes?type=project&limit=10', '/nodes?parentId=null', f'/tasks?parentTaskId={t1["id"]}']:
    s, _, _ = call('GET', q, token=A); check(f'good query {q} accepted', s, 200)

# moving to the top level used to be a silent no-op
s, moved, _ = call('PATCH', f'/nodes/{t2["id"]}/move', {'parentId': None}, A); check('move to top level works', (s, moved['parentId']) == (200, None), True)

# labels, teams, webhooks, links
s, _, _ = call('POST', '/labels', {'title': 'bug', 'color': 'red'}, A); check('non-hex label colour rejected', s, 400)
s, _, _ = call('POST', '/labels', {'title': 'bug', 'color': '#ff0000'}, A); check('label created', s, 201)
s, _, _ = call('POST', '/labels', {'title': 'bug', 'color': '#00ff00'}, A); check('duplicate label for the same user is 409, not 500', s, 409)
s, _, _ = call('POST', '/labels', {'title': 'bug', 'color': '#0000ff'}, Bt); check('another user may use the same label name', s, 201)
s, core, _ = call('POST', '/teams', {'name': 'Core'}, A); check('team created', s, 201)
s, _, _ = call('POST', '/teams', {'name': 'Core'}, Bt); check('another user may reuse a team name', s, 201)
s, wh, _ = call('POST', '/webhooks', {'url': 'https://hooks.example.com/x', 'projectId': pid}, A)
check('webhook without an event is accepted and defaults to all events', (s, wh.get('event')), (201, '*'))
s, _, _ = call('POST', '/webhooks', {'url': 'javascript:alert(1)', 'projectId': pid}, A); check('non-http webhook url rejected', s, 400)
s, _, _ = call('POST', '/webhooks', {'url': 'ftp://x.example/', 'projectId': pid}, A); check('ftp webhook url rejected', s, 400)
s, _, _ = call('POST', f'/tasks/{t1["id"]}/reminders', {'reminderDate': 'soon'}, A); check('bad reminder date rejected', s, 400)
s, rt, _ = call('POST', '/tasks', {'title': 'Relative reminders', 'project': {'id': pid}}, A)
s, sub, _ = call('POST', '/tasks', {'title': 'Nested subtask', 'parentTaskId': rt['id']}, A)
s, listed, _ = call('GET', '/tasks?search=Nested%20subtask', None, A)
check('a listed subtask carries its project', (s, [t.get('projectId') for t in listed if t['id'] == sub['id']]), (200, [pid]))
s, mine, _ = call('POST', '/tasks', {'title': 'Personal listed task'}, A)
s, listed, _ = call('GET', '/tasks?search=Personal%20listed', None, A)
check('a listed personal task has no project', (s, [t.get('projectId', 'missing') for t in listed if t['id'] == mine['id']]), (200, [None]))
s, _, _ = call('POST', f'/tasks/{rt["id"]}/reminders', {'daysBefore': 1, 'atTime': '09:00'}, A); check('relative reminder needs a due date', s, 400)
call('PUT', f'/tasks/{rt["id"]}', {'dueDate': '2031-05-10T12:00:00.000Z'}, A)
s, _, _ = call('POST', f'/tasks/{rt["id"]}/reminders', {'daysBefore': 1, 'atTime': '9:00'}, A); check('relative reminder with a bad time rejected', s, 400)
s, rel, _ = call('POST', f'/tasks/{rt["id"]}/reminders', {'daysBefore': 1, 'atTime': '09:00'}, A)
check('relative reminder lands the day before the due date', (s, rel.get('daysBefore'), rel.get('reminderDate', '')[:16]), (201, 1, '2031-05-09T09:00'))
call('PUT', f'/tasks/{rt["id"]}', {'dueDate': '2031-05-20T12:00:00.000Z'}, A)
s, rems, _ = call('GET', f'/tasks/{rt["id"]}/reminders', None, A)
check('a relative reminder follows the due date', tuple(r['reminderDate'][:16] for r in rems if r['id'] == rel.get('id')), ('2031-05-19T09:00',))
s, _, _ = call('POST', f'/tasks/{t1["id"]}/relations', {'relatedTaskId': t2['id'], 'kind': 'friends'}, A); check('unknown relation kind rejected', s, 400)
s, bks, _ = call('GET', f'/projects/{pid}/buckets', None, A)
check('a new project has one bucket per status', (s, [b['status'] for b in bks]), (200, ['open', 'in_progress', 'done']))
s, _, _ = call('POST', f'/projects/{pid}/buckets', {'position': 1, 'status': 'open'}, A); check('bucket without title rejected', s, 400)
s, _, _ = call('POST', f'/projects/{pid}/buckets', {'title': 'Later'}, A); check('bucket without status rejected', s, 400)
s, _, _ = call('POST', f'/projects/{pid}/buckets', {'title': 'Later', 'status': 'someday'}, A); check('unknown bucket status rejected', s, 400)
done_bucket = next(b for b in bks if b['status'] == 'done')
s, _, _ = call('DELETE', f'/projects/{pid}/buckets/{done_bucket["id"]}', None, A); check('last bucket of a status cannot be deleted', s, 400)
s, _, _ = call('PUT', f'/projects/{pid}/buckets/{done_bucket["id"]}', {'status': 'open'}, A); check('last bucket of a status cannot change status', s, 400)
s, moved, _ = call('PUT', f'/tasks/{t1["id"]}', {'bucketId': done_bucket['id']}, A)
check('placing a task in a bucket sets its status', (s, moved.get('bucketId'), moved.get('status')), (200, done_bucket['id'], 'done'))
s, reopened, _ = call('PUT', f'/tasks/{t1["id"]}', {'status': 'open'}, A)
check('a status change releases a bucket of another status', (s, reopened.get('bucketId'), reopened.get('status')), (200, None, 'open'))
s, _, _ = call('PUT', f'/tasks/{t1["id"]}', {'bucketId': done_bucket['id'], 'status': 'open'}, A); check('bucket and contradicting status rejected', s, 400)
s, p2, _ = call('POST', '/projects', {'name': 'Validation other project'}, A)
s, bks2, _ = call('GET', f'/projects/{p2["id"]}/buckets', None, A)
s, _, _ = call('PUT', f'/tasks/{t1["id"]}', {'bucketId': bks2[0]['id']}, A); check("another project's bucket rejected", s, 400)
call('DELETE', f'/projects/{p2["id"]}', None, A)
s, _, _ = call('POST', f'/projects/{pid}/users', {'userId': bid, 'permission': 'superuser'}, A); check('unknown permission rejected', s, 400)
s, body, _ = call('POST', f'/tasks/{t1["id"]}/assignees', {'userId': 99999999}, A)
check('assigning a non-existent user is a 4xx with a message, not a 500', (s in (400, 404), isinstance(body, dict) and 'message' in body), (True, True))
s, body, _ = call('GET', '/definitely/not/a/route', token=A); check('unknown route is a clean 404', s, 404)
s, _, _ = call('POST', '/filters', {'name': 'f', 'filters': 'not-an-object'}, A); check('filters must be an object', s, 400)
s, _, _ = call('POST', '/tokens', {'name': 'tok', 'expiresAt': 'tomorrow'}, A); check('api token expiry must be a date', s, 400)
s, _, _ = call('POST', '/tokens', {'name': 'tok', 'expiresAt': '2031-01-01'}, A); check('api token date-only expiry accepted', s, 201)
s, body, _ = call('POST', '/tasks', raw=b'{"title":"x","x":"' + b'a' * 2_000_000 + b'"}', token=A); check('oversized body rejected (413)', s, 413)

# ======================= data export =======================
s, att, _ = multipart(f"/attachments/upload?taskId={t1['id']}", A, {'taskId': t1['id']}, 'notes.txt', b'my notes')
check('attachment uploaded', s, 201)
s, exp, hdr = call('GET', '/user/export', token=A); check('export works', s, 200)
check('export is a downloadable file', 'attachment' in (hdr.get('Content-Disposition') or ''), True)
data = json.loads(exp) if isinstance(exp, str) else exp
check('export contains the profile', data['profile']['username'], aname)
check('export contains owned projects and tasks', {n['title'] or n['name'] for n in data['ownedProjectsAndTasks']} >= {'Validation project', 'Legacy shape', 'Subtask'}, True)
check('export contains comments', any(len(c['content']) == 3000 for c in data['comments']), True)
check('export contains labels and attachments metadata', (len(data['labels']) >= 1, data['attachments'][0]['filename']), (True, 'notes.txt'))
blob = json.dumps(data)
check('export never contains password hashes or token hashes', any(k in blob for k in ('"password"', 'tokenHash', 'prevTokenHash', '$2a$', '"secret"')), False)
check("export does not include the other user's username", bname in blob, False)
s, tk, _ = call('POST', '/tokens', {'name': 'exp'}, A)
s, _, _ = call('GET', '/user/export', token=tk['rawToken']); check('an API token cannot export account data', s, 403)
s, _, _ = call('GET', '/user/export'); check('export needs authentication', s, 401)

# ======================= deletion request flow =======================
s, _, _ = call('POST', '/user/deletion/request', {}, A); check('deletion request without a password rejected', s, 400)
s, _, _ = call('POST', '/user/deletion/request', {'password': 'wrong password'}, A); check('deletion request with a wrong password is a 400 (not a 401, which would sign the user out)', s, 400)
s, _, _ = call('POST', '/user/deletion/request', {'password': PW}, tk['rawToken']); check('an API token cannot request deletion', s, 403)
s, r, _ = call('POST', '/user/deletion/request', {'password': PW}, A)
check('the only manager of a team (even a one-person team) cannot request deletion', (s, 'only manager of: Core' in str(r)), (409, True))
s, _, _ = call('DELETE', f"/teams/{core['id']}", token=A); check('...until the team is deleted', s, 200)
s, r, _ = call('POST', '/user/deletion/request', {'password': PW}, A); check('deletion scheduled', s, 201)
days = (time.mktime(time.strptime(r['scheduledAt'][:19], '%Y-%m-%dT%H:%M:%S')) - time.time()) / 86400
check('...for about 7 days from now', 6 < days < 8, True)
s, me, _ = call('GET', '/users/me', token=A); check('account is flagged and still usable during the grace period', (s, me['isDeletionRequested']), (200, True))
s, _, _ = call('POST', '/user/deletion/cancel', {}, A); check('deletion can be cancelled', s, [200, 201])
s, me, _ = call('GET', '/users/me', token=A); check('...which clears the flag', me['isDeletionRequested'], False)
s, _, _ = call('DELETE', f'/users/{aid}', token=A); check('the old instant-delete endpoint is gone', s, 404)

# ======================= purge of a user with data everywhere =======================
if not SQL:
    print('SKIP purge test (set SQL_CMD to run it)')
else:
    vid, V, vname = user('vic')
    oid, O, oname = user('own')
    # vic's own stuff
    s, vp, _ = call('POST', '/projects', {'name': 'Vic project'}, V)
    s, vt, _ = call('POST', '/tasks', {'title': 'Vic task', 'project': {'id': vp['id']}}, V)
    s, vs, _ = call('POST', '/tasks', {'title': 'Vic subtask', 'parentTaskId': vt['id'], 'project': {'id': vp['id']}}, V)
    call('POST', '/tasks', {'title': 'Vic personal task'}, V)
    s, ci, _ = call('POST', '/comments', {'content': 'vic comment on own task', 'taskId': vt['id']}, V)
    s, vatt, _ = multipart(f"/attachments/upload?taskId={vt['id']}", V, {'taskId': vt['id']}, 'vic.txt', b'vic file')
    call('POST', '/webhooks', {'url': 'https://vic.example/hook', 'projectId': vp['id']}, V)
    call('POST', f'/projects/{vp["id"]}/buckets', {'title': 'Review', 'status': 'in_progress'}, V)
    call('POST', '/labels', {'title': 'vic-label'}, V)
    s, vteam, _ = call('POST', '/teams', {'name': 'Vic team'}, V)
    call('POST', '/team-members', {'teamId': vteam['id'], 'userId': oid}, V)
    call('POST', '/filters', {'name': 'vic filter'}, V)
    call('POST', '/tokens', {'name': 'vic token'}, V)
    # vic's footprint inside OWN's project
    s, op, _ = call('POST', '/projects', {'name': 'Own shared project'}, O)
    call('POST', f'/projects/{op["id"]}/users', {'userId': vid, 'permission': 'write'}, O)
    s, ot, _ = call('POST', '/tasks', {'title': 'Own task', 'project': {'id': op['id']}}, O)
    s, vit, _ = call('POST', '/tasks', {'title': 'Vic task in own project', 'project': {'id': op['id']}}, V); check('vic can work in a project shared with them', s, 201)
    call('POST', '/comments', {'content': 'vic comment on own task in shared project', 'taskId': ot['id']}, V)
    s, vatt2, _ = multipart(f"/attachments/upload?taskId={ot['id']}", V, {'taskId': ot['id']}, 'vic2.txt', b'vic file 2')
    call('POST', '/user/settings/general', {'name': 'Vic'}, V)
    # owner's data that must survive
    s, ocm, _ = call('POST', '/comments', {'content': 'own comment', 'taskId': ot['id']}, O)
    call('POST', '/labels', {'title': 'own-label'}, O)
    s, oteam, _ = call('POST', '/teams', {'name': 'Own team'}, O)

    paths = [vatt.get('path'), vatt2.get('path')]
    if LOCAL_FILES: check('uploads exist on disk before deletion', all(os.path.exists(p) for p in paths), True)

    s, r, _ = call('POST', '/user/deletion/request', {'password': PW}, V)
    check('vic is the only manager of a team that has another member: deletion refused', (s, 'only manager of: Vic team' in str(r)), (409, True))
    # an admin would appoint a second manager; do it through the database
    sql(f"UPDATE team_members SET role = 'manager' WHERE teamId = {vteam['id']} AND userId = {oid};")
    s, _, _ = call('POST', '/user/deletion/request', {'password': PW}, V); check('vic requests deletion once the team has another manager', s, 201)
    print('   ...backdating the grace period and waiting for the purge sweep')
    sql(f"UPDATE users SET deletionScheduledAt = DATE_SUB(NOW(), INTERVAL 2 DAY) WHERE id = {vid};")
    gone = False
    for _ in range(40):
        time.sleep(1)
        if sql(f'SELECT COUNT(*) FROM users WHERE id = {vid};') == '0': gone = True; break
    check('the account is purged after the grace period', gone, True)

    def count(table, where): return int(sql(f'SELECT COUNT(*) FROM {table} WHERE {where};'))
    check('vic can no longer sign in', call('POST', '/auth/login', {'username': vname, 'password': PW})[0], 401)
    check("vic's old access token is dead", call('GET', '/users/me', token=V)[0], 401)
    check("vic's project, tasks and personal tasks are gone", count('nodes', f"name = 'Vic project' OR title LIKE 'Vic task' OR title = 'Vic subtask' OR title = 'Vic personal task'"), 0)
    check("vic's comments and uploads are gone", (count('comments', f'authorId = {vid}'), count('attachments', f'uploaderId = {vid}')), (0, 0))
    check("vic's webhooks and buckets are gone", (count('webhook', f'userId = {vid} OR projectId = {vp["id"]}'), count('kanban_buckets', f'projectId = {vp["id"]}')), (0, 0))
    check("vic's labels, filters, tokens, sessions are gone", sum(count(t, f'{c} = {vid}') for t, c in [('labels', 'createdBy'), ('saved_filters', 'userId'), ('api_tokens', 'userId'), ('user_sessions', 'userId')]), 0)
    check("vic's team survives with its other manager; vic's memberships are gone", (count('teams', f"id = {vteam['id']}"), count('team_members', f'userId = {vid}'), count('team_members', f"teamId = {vteam['id']} AND userId = {oid} AND role = 'manager'")), (1, 0, 1))
    check('vic no longer appears in other projects', count('project_users', f'userId = {vid}'), 0)
    if LOCAL_FILES: check("vic's files were removed from disk", any(os.path.exists(p) for p in paths), False)

    s, still, _ = call('GET', f'/tasks/{vit["id"]}', token=O)
    check("the owner's shared project keeps vic's task, anonymised", (s, still.get('createdBy')), (200, None))
    check("the owner's own tasks, comments, labels, teams survive", (call('GET', f'/tasks/{ot["id"]}', token=O)[0], count('comments', f'id = {ocm["id"]}'), count('labels', f"createdBy = {oid} AND title = 'own-label'"), count('teams', f"id = {oteam['id']}")), (200, 1, 1, 1))
    check('the owner can still list their project and sign in', (call('GET', f'/projects/{op["id"]}', token=O)[0], call('POST', '/auth/login', {'username': oname, 'password': PW})[0]), (200, 200))
    check("amy and ben (other users) are untouched", (call('GET', '/users/me', token=A)[0], call('GET', '/users/me', token=Bt)[0]), (200, 200))

print(f'\n{sum(results)}/{len(results)} passed'); sys.exit(0 if all(results) else 1)
