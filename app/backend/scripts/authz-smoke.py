#!/usr/bin/env python3
"""
Authorization smoke test for the NOAgenda API (95 checks, 80 without SQL_CMD).

Registers three throwaway users (alice, bob, carol) and verifies that one user
cannot read or change another user's projects/tasks/comments/attachments/
webhooks/etc., that mass-assignment and id-takeover attempts fail, that the
role-escalation payload is rejected, that read/write sharing behaves, and that
team roles hold: a manager runs only their own team, members and outsiders
cannot, only the app admin appoints managers, and a team always keeps a manager.

The app-admin part needs an admin. With SQL_CMD set (a command that reads SQL from
stdin, e.g. SQL_CMD='mysql -h127.0.0.1 -uroot -pSECRET noagenda_ci -N') a fourth user
is promoted through the database; without it those checks are skipped.

!! Run ONLY against a disposable database. It creates users and data, and the
   registration rate limit (10/hour/IP) means a second run needs a restart.

Usage:  BASE_URL=http://127.0.0.1:3000 [SQL_CMD=...] python3 scripts/authz-smoke.py
        (self-signed HTTPS, e.g. a local Caddy: add AUTHZ_INSECURE=1)
"""
import json, sys, urllib.request, urllib.error
import os, ssl, subprocess
B = os.environ.get('BASE_URL', 'http://127.0.0.1:3000')
CTX = ssl._create_unverified_context() if os.environ.get('AUTHZ_INSECURE') == '1' else None
results = []
SQL = os.environ.get('SQL_CMD')

def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(B + path, data=data, method=method)
    req.add_header('Content-Type', 'application/json')
    if token: req.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req, context=CTX) as r:
            t = r.read().decode(); return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t)
        except Exception: return e.code, t

def check(name, got, expect):
    exact = isinstance(got, (list, tuple))  # compare lists/tuples whole; a scalar may match any of several answers
    ok = got in expect if isinstance(expect, (list, tuple, set)) and not exact else got == expect
    results.append(ok); print(('PASS ' if ok else 'FAIL ') + name + f'  (got {got}, want {expect})')

def user(n):
    s, u = call('POST', '/users', {'username': n, 'email': n + '@example.com', 'password': 'password123'})
    assert s == 201, (s, u)
    s, l = call('POST', '/auth/login', {'username': n, 'password': 'password123'})
    assert s == 200, (s, l)
    return u['id'], l['access_token']

aid, A = user('alice'); bid, Bt = user('bob'); cid, C = user('carol')

# --- 1. role escalation
s, _ = call('POST', '/user/settings/general', {'role': 'admin'}, Bt); check('role escalation rejected', s, 400)
s, me = call('GET', '/users/me', None, Bt); check('bob is still a normal user', me['role'], 'user')
s, _ = call('GET', '/admin/users', None, Bt); check('bob cannot use admin API', s, 403)
s, g = call('POST', '/user/settings/general', {'theme': 'dark'}, Bt); check('valid settings accepted', s, [200, 201])

# --- 2. alice's data
s, proj = call('POST', '/projects', {'name': 'Alice secret'}, A); check('alice creates project', s, 201)
pid = proj['id']
s, t1 = call('POST', '/tasks', {'title': 'secret task', 'projectId': pid, 'description': 'top secret'}, A); check('alice creates task', s, 201)
tid = t1['id']

for name, m, path, body in [
    ('bob GET /nodes/:project', 'GET', f'/nodes/{pid}', None),
    ('bob GET /nodes/:project/tree', 'GET', f'/nodes/{pid}/tree', None),
    ('bob GET /nodes/:project/children', 'GET', f'/nodes/{pid}/children', None),
    ('bob GET /nodes/:task', 'GET', f'/nodes/{tid}', None),
    ('bob GET /tasks/:id', 'GET', f'/tasks/{tid}', None),
    ('bob GET /projects/:id', 'GET', f'/projects/{pid}', None),
    ('bob duplicate node', 'PUT', f'/nodes/{tid}/duplicate', None),
    ('bob duplicate task', 'PUT', f'/tasks/{tid}/duplicate', None),
    ('bob duplicate project', 'PUT', f'/projects/{pid}/duplicate', None),
    ('bob PUT task', 'PUT', f'/tasks/{tid}', {'title': 'pwned'}),
    ('bob DELETE task', 'DELETE', f'/tasks/{tid}', None),
    ('bob bulk update', 'POST', '/tasks/bulk', {'ids': [tid], 'data': {'status': 'done'}}),
    ('bob create task in alice project', 'POST', '/tasks', {'title': 'x', 'projectId': pid}),
    ('bob create node in alice project', 'POST', '/nodes', {'type': 'task', 'title': 'x', 'parentId': pid}),
    ('bob comments list', 'GET', f'/comments?taskId={tid}', None),
    ('bob comment create', 'POST', '/comments', {'content': 'hi', 'taskId': tid}),
    ('bob attachments list', 'GET', f'/attachments?taskId={tid}', None),
    ('bob webhooks list (project)', 'GET', f'/webhooks?projectId={pid}', None),
    ('bob webhook create (project)', 'POST', '/webhooks', {'url': 'https://x.example', 'event': 'e', 'projectId': pid}),
    ('bob assignees', 'GET', f'/tasks/{tid}/assignees', None),
    ('bob reminders', 'GET', f'/tasks/{tid}/reminders', None),
    ('bob project users add self', 'POST', f'/projects/{pid}/users', {'userId': bid, 'permission': 'admin'}),
    ('bob favorite alice project', 'POST', '/favorites', {'entityType': 'project', 'entityId': pid}),
    ('bob subscribe', 'PUT', f'/subscriptions/project/{pid}', None),
    ('bob react', 'POST', '/reactions', {'entityType': 'task', 'entityId': tid, 'reaction': '+1'}),
    ('bob list reactions', 'GET', f'/reactions?entityType=task&entityId={tid}', None),
]:
    s, _ = call(m, path, body, Bt); check(name + ' denied', s, [403, 404])

s, found = call('GET', '/search?q=secret', None, Bt)
check('search does not leak to bob', len(found['tasks']) + len(found['projects']), 0)
s, found = call('GET', '/search?q=secret', None, A)
check('search still works for alice', len(found['tasks']) + len(found['projects']) >= 2, True)

# --- 3. mass-assignment / id takeover
s, p2 = call('POST', '/projects', {'name': 'bob proj', 'id': pid}, Bt)
s2, still = call('GET', f'/projects/{pid}', None, A)
check('POST /projects with foreign id does not overwrite', still['name'], 'Alice secret')
s, _ = call('POST', '/nodes', {'type': 'project', 'name': 'x', 'id': tid}, Bt)
s, tcheck = call('GET', f'/tasks/{tid}', None, A); check('POST /nodes with foreign id does not overwrite', tcheck['title'], 'secret task')
s, _ = call('POST', '/tasks', {'title': 'bob task', 'createdBy': aid, 'ownerId': aid}, Bt); check('createdBy/ownerId spoof rejected', s, 400)
s, bt = call('POST', '/tasks', {'title': 'bob task'}, Bt)
s, got = call('GET', f'/tasks/{bt["id"]}', None, Bt); check('creator is always the caller', got['createdBy'], bid)
s, ft = call('POST', '/filters', {'name': 'bob filter'}, Bt); fid = ft['id']
s, af = call('POST', '/filters', {'name': 'alice filter'}, A)
s, _ = call('POST', '/filters', {'name': 'overwrite', 'id': af['id']}, Bt)
s, chk = call('GET', f'/filters/{af["id"]}', None, A); check('filter id takeover blocked', chk['name'], 'alice filter')
s, _ = call('PUT', f'/filters/{fid}', {'userId': aid, 'name': 'moved'}, Bt)
s, chk = call('GET', f'/filters/{fid}', None, Bt); check('filter userId reassignment blocked', s, 200)

# --- 4. sharing works & respects permission levels
s, _ = call('POST', f'/projects/{pid}/users', {'userId': bid, 'permission': 'read'}, A); check('alice shares read with bob', s, [200, 201])
s, _ = call('GET', f'/tasks/{tid}', None, Bt); check('bob(read) can read task', s, 200)
s, _ = call('GET', f'/nodes/{pid}/tree', None, Bt); check('bob(read) can read tree', s, 200)
s, _ = call('PUT', f'/tasks/{tid}', {'title': 'x'}, Bt); check('bob(read) cannot edit', s, 403)
s, _ = call('POST', '/comments', {'content': 'hi', 'taskId': tid}, Bt); check('bob(read) cannot comment', s, 403)
s, _ = call('GET', f'/webhooks?projectId={pid}', None, Bt); check('bob(read) cannot list webhooks', s, 403)
s, _ = call('POST', f'/projects/{pid}/users', {'userId': cid, 'permission': 'read'}, Bt); check('bob(read) cannot add members', s, 403)
s, _ = call('PUT', f'/projects/{pid}/users/{bid}', {'permission': 'write'}, A); check('alice upgrades bob to write', s, [200, 204])
s, r = call('PUT', f'/tasks/{tid}', {'title': 'edited by bob'}, Bt); check('bob(write) can edit', s, 200)
s, _ = call('POST', '/comments', {'content': 'hi', 'taskId': tid}, Bt); check('bob(write) can comment', s, 201)
s, _ = call('PUT', f'/projects/{pid}', {'name': 'hijack'}, Bt); check('bob(write) cannot edit project', s, 403)
s, _ = call('DELETE', f'/projects/{pid}', None, Bt); check('bob(write) cannot delete project', s, 403)
s, _ = call('PUT', f'/tasks/{tid}', {'projectId': 999999}, Bt); check('cannot move task to missing project', s, [403, 404])
s, _ = call('GET', f'/tasks/{tid}', None, C); check('carol still locked out', s, 403)
s, _ = call('POST', '/favorites', {'entityType': 'project', 'entityId': pid}, Bt); check('bob(read+) can favorite shared project', s, 201)
s, _ = call('POST', '/reactions', {'entityType': 'weird', 'entityId': tid, 'reaction': 'x'}, A); check('reaction bad entityType rejected', s, 400)

# --- 5. team roles: manager (own team only) / member / outsider / app admin
def team_role(tok, team_id, username):
    s, ms = call('GET', f'/team-members?teamId={team_id}', None, tok)
    return next((m for m in ms if m['user']['username'] == username), None) if s == 200 else None

s, team = call('POST', '/teams', {'name': 'Smoke team'}, A); check('alice creates a team (a one-person team is fine)', s, 201)
tm = team['id']
s, ms = call('GET', f'/team-members?teamId={tm}', None, A)
check('the creator is the first manager', [(m['user']['username'], m['role']) for m in ms], [('alice', 'manager')])
s, _ = call('GET', f'/teams/{tm}', None, C); check('outsider cannot view the team', s, 403)
s, _ = call('GET', f'/team-members?teamId={tm}', None, C); check('outsider cannot list its members', s, 403)
s, lst = call('GET', '/teams', None, C); check('team is not in the outsider list', tm in [t['id'] for t in lst], False)
s, _ = call('POST', '/team-members', {'teamId': tm, 'userId': cid}, C); check('outsider cannot add themselves', s, 403)
s, _ = call('POST', '/team-members', {'teamId': tm, 'userId': bid, 'role': 'manager'}, A)
check('a manager cannot add someone as manager (role field rejected)', s, 400)
s, _ = call('POST', '/team-members', {'teamId': tm, 'userId': bid}, A); check('manager adds a member', s, 201)
check('new members are plain members', (team_role(A, tm, 'bob') or {}).get('role'), 'member')
s, _ = call('POST', '/team-members', {'teamId': tm, 'userId': bid}, A); check('adding twice is a conflict', s, 409)
s, _ = call('GET', f'/teams/{tm}', None, Bt); check('member can view the team', s, 200)
s, _ = call('PUT', f'/teams/{tm}', {'name': 'x'}, Bt); check('member cannot edit the team', s, 403)
s, _ = call('POST', '/team-members', {'teamId': tm, 'userId': cid}, Bt); check('member cannot add members', s, 403)
s, _ = call('DELETE', f'/team-members/{team_role(A, tm, "alice")["id"]}', None, Bt); check('member cannot remove members', s, 403)
s, _ = call('DELETE', f'/teams/{tm}', None, Bt); check('member cannot delete the team', s, 403)
s, au = call('GET', '/teams/assignable-users', None, Bt); check('member can assign to nobody via the team', au, [])
s, au = call('GET', '/teams/assignable-users', None, A); check('manager can assign to every team member', [u['username'] for u in au], ['bob'])
s, other = call('POST', '/teams', {'name': 'Carol team'}, C); check('carol creates her own team', s, 201)
s, _ = call('PUT', f'/teams/{tm}', {'name': 'x'}, C); check("another team's manager cannot edit this team", s, 403)
s, _ = call('POST', '/team-members', {'teamId': tm, 'userId': cid}, C); check("another team's manager cannot add to this team", s, 403)
s, _ = call('PUT', f'/teams/{tm}', {'description': 'edited by its manager'}, A); check('manager edits their own team', s, 200)
s, _ = call('DELETE', f'/team-members/{team_role(A, tm, "alice")["id"]}', None, A); check('a manager cannot remove a manager (not even themselves)', s, 403)
s, _ = call('PATCH', f'/admin/teams/{tm}/members/{team_role(A, tm, "bob")["id"]}/role', {'role': 'manager'}, A)
check('a manager cannot appoint managers', s, 403)
s, _ = call('GET', '/admin/teams', None, A); check('a manager cannot use the admin team list', s, 403)

if SQL:
    did, D = user('dave')
    subprocess.run(SQL, shell=True, input="UPDATE users SET role='admin' WHERE username='dave';", text=True, check=True, capture_output=True)
    bm = team_role(A, tm, 'bob')['id']; am = team_role(A, tm, 'alice')['id']
    s, all_teams = call('GET', '/admin/teams', None, D)
    check('app admin lists every team with members', (s, {tm, other['id']} <= {t['id'] for t in all_teams}), (200, True))
    s, _ = call('GET', f'/teams/{tm}', None, D); check('app admin can view any team', s, 200)
    s, _ = call('PATCH', f'/admin/teams/{tm}/members/{bm}/role', {'role': 'owner'}, D); check('unknown team role rejected', s, 400)
    s, _ = call('PATCH', f'/admin/teams/{tm}/members/{bm}/role', {'role': 'manager'}, D); check('app admin appoints a manager', s, 200)
    s, _ = call('PUT', f'/teams/{tm}', {'description': 'edited by bob'}, Bt); check('the new manager can edit the team', s, 200)
    s, _ = call('DELETE', f'/team-members/{am}', None, Bt); check('a manager still cannot remove another manager', s, 403)
    s, _ = call('PATCH', f'/admin/teams/{tm}/members/{am}/role', {'role': 'member'}, D); check('app admin demotes a manager', s, 200)
    s, _ = call('PUT', f'/teams/{tm}', {'name': 'x'}, A); check('a demoted manager loses the rights', s, 403)
    s, r = call('PATCH', f'/admin/teams/{tm}/members/{bm}/role', {'role': 'member'}, D); check('the last manager cannot be demoted', s, 400)
    s, _ = call('DELETE', f'/team-members/{bm}', None, D); check('the last manager cannot be removed, even by the admin', s, 400)
    s, r = call('DELETE', f'/admin/users/{bid}', None, D)
    check('the last manager of a team cannot be deleted', (s, 'only manager of: Smoke team' in str(r)), (409, True))
    s, r = call('DELETE', f'/admin/users/{cid}', None, D)
    check('the last manager of a one-person team cannot be deleted either', (s, 'only manager of: Carol team' in str(r)), (409, True))
    s, _ = call('PATCH', f'/admin/teams/{tm}/members/{am}/role', {'role': 'manager'}, D); check('app admin appoints a second manager', s, 200)
    s, _ = call('DELETE', f'/admin/users/{bid}', None, D); check('a manager can be deleted once another manager remains', s, 204)
    s, _ = call('GET', f'/teams/{tm}', None, A); check('the team survives its manager', s, 200)
else:
    print('SKIP app-admin team checks (set SQL_CMD to run them)')

print(f'\n{sum(results)}/{len(results)} passed'); sys.exit(0 if all(results) else 1)
