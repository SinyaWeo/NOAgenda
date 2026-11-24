#!/usr/bin/env python3
"""
Authorization smoke test for the NOAgenda API (142 checks, 126 without SQL_CMD).

Registers three throwaway users (alice, bob, carol) and verifies that one user
cannot read or change another user's projects/tasks/comments/attachments/
webhooks/etc., that mass-assignment and id-takeover attempts fail, that the
role-escalation payload is rejected, that read/write sharing behaves, and that
team roles hold: a manager runs only their own team, members and outsiders
cannot, only the app admin appoints managers, and a team always keeps a manager.

The app-admin part needs an admin. With SQL_CMD set (a command that reads SQL from
stdin, e.g. SQL_CMD='mysql -h127.0.0.1 -uroot -pSECRET noagenda_ci -N') a fourth user
is promoted through the database; without it those checks are skipped.

!! Run ONLY against a disposable database. It creates users and data, and its last
   part switches to single-user mode (deleting every other account) and back.
   Start the API with REGISTRATION_RATE_LIMIT=100: the default (10/hour/IP) is shared
   with the scripts that run after it.

Usage:  BASE_URL=http://127.0.0.1:3000 [SQL_CMD=...] python3 scripts/authz-smoke.py
        (self-signed HTTPS, e.g. a local Caddy: add AUTHZ_INSECURE=1)
"""
import json, sys, urllib.request, urllib.error
import os, ssl, subprocess, time
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

# --- 3b. future cycles of repeating tasks (calendar) follow the same visibility
s, rt = call('POST', '/tasks', {'title': 'weekly secret', 'projectId': pid, 'dueDate': '2026-01-05T09:00:00.000Z', 'repeatAfter': 7}, A); check('alice creates repeating task', s, 201)
OCC = '/tasks/occurrences?from=2026-01-01T00:00:00.000Z&to=2026-02-01T00:00:00.000Z'
s, mine = call('GET', OCC, None, A); check('alice sees future cycles', (s, len([o for o in mine if o['taskId'] == rt['id']])), (200, 3))
s, theirs = call('GET', OCC, None, Bt); check('bob sees no cycles of alice\'s project', (s, [o for o in theirs if o['taskId'] == rt['id']]), (200, []))
s, _ = call('GET', '/tasks/occurrences?from=2026-01-01T00:00:00.000Z&to=2027-01-01T00:00:00.000Z', None, A); check('occurrence range is capped', s, 400)

# --- 4. sharing works & respects permission levels
s, _ = call('POST', f'/projects/{pid}/users', {'userId': bid, 'permission': 'read'}, A); check('alice shares read with bob', s, [200, 201])
s, _ = call('GET', f'/tasks/{tid}', None, Bt); check('bob(read) can read task', s, 200)
s, _ = call('GET', f'/nodes/{pid}/tree', None, Bt); check('bob(read) can read tree', s, 200)
s, shared = call('GET', OCC, None, Bt); check('bob(read) sees the shared cycles', (s, len([o for o in shared if o['taskId'] == rt['id']])), (200, 3))
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

# --- 5b. ideas: private to the creator; a team share is read-only; a project parent grants nothing
s, idea = call('POST', '/ideas', {'text': 'private idea', 'projectId': pid}, A); check('alice creates an idea under her project', s, 201)
iid = idea['id']
s, _ = call('POST', '/ideas', {'text': 'x', 'projectId': pid}, C); check("carol cannot attach an idea to alice's project", s, [403, 404])
s, _ = call('POST', '/ideas', {'text': 'x', 'createdBy': aid}, Bt); check('idea createdBy spoof rejected', s, 400)
ids = lambda rows: [r['id'] for r in rows]
s, lst = call('GET', '/ideas', None, Bt); check('a project writer does not see the idea in /ideas', (s, iid in ids(lst)), (200, False))
s, ch = call('GET', f'/nodes/{pid}/children', None, Bt); check("the idea is not among the project's children", (s, iid in ids(ch)), (200, False))
s, tr = call('GET', f'/nodes/{pid}/tree', None, Bt); check("the idea is not in the project's tree", (s, iid in ids(tr.get('children') or [])), (200, False))
s, nl = call('GET', '/nodes', None, Bt); check('the idea is not in /nodes', (s, iid in ids(nl)), (200, False))
s, nl = call('GET', '/nodes?type=idea', None, A); check('/nodes?type=idea lists nothing, not even for the creator', (s, nl), (200, []))
s, pr = call('GET', f'/projects/{pid}', None, Bt); check("the idea is not in the project's children", (s, iid in ids(pr.get('children') or [])), (200, False))
for name, m, path, body in [
    ('bob GET /nodes/:idea', 'GET', f'/nodes/{iid}', None),
    ('bob PUT /nodes/:idea', 'PUT', f'/nodes/{iid}', {'title': 'x'}),
    ('bob DELETE /nodes/:idea', 'DELETE', f'/nodes/{iid}', None),
    ('bob GET /tasks/:idea', 'GET', f'/tasks/{iid}', None),
    ('bob PUT /ideas/:id', 'PUT', f'/ideas/{iid}', {'text': 'pwned'}),
    ('bob DELETE /ideas/:id', 'DELETE', f'/ideas/{iid}', None),
    ('bob share /ideas/:id/teams', 'PUT', f'/ideas/{iid}/teams', {'teamIds': [tm]}),
]:
    s, _ = call(m, path, body, Bt); check(name + ' denied', s, [403, 404])
s, _ = call('PUT', f'/ideas/{iid}/teams', {'teamIds': [other['id']]}, A); check("alice cannot share with a team she is not in", s, 403)
s, sh = call('PUT', f'/ideas/{iid}/teams', {'teamIds': [tm]}, A); check('alice shares the idea with her team', (s, sh['sharedTeamIds']), (200, [tm]))
s, lst = call('GET', '/ideas', None, Bt); mine = [i for i in lst if i['id'] == iid]
check('a team member sees the shared idea, read-only view', (s, len(mine), mine and mine[0]['isMine'], mine and mine[0]['sharedTeamIds']), (200, 1, False, []))
s, lst = call('GET', '/ideas', None, C); check('a non-member does not see it', (s, iid in ids(lst)), (200, False))
s, _ = call('PUT', f'/ideas/{iid}', {'text': 'pwned'}, Bt); check('a team member cannot edit the shared idea', s, 403)
s, _ = call('DELETE', f'/ideas/{iid}', None, Bt); check('a team member cannot delete the shared idea', s, 403)
s, _ = call('PUT', f'/ideas/{iid}/teams', {'teamIds': []}, Bt); check('a team member cannot change the sharing', s, 403)
s, _ = call('GET', f'/nodes/{iid}', None, Bt); check('sharing does not open the generic node endpoint', s, [403, 404])
s, _ = call('PUT', f'/ideas/{iid}/teams', {'teamIds': []}, A); check('alice stops sharing', s, 200)
s, lst = call('GET', '/ideas', None, Bt); check('the team member loses sight of it', (s, iid in ids(lst)), (200, False))
s, _ = call('DELETE', f'/ideas/{iid}', None, A); check('alice deletes her idea', s, [200, 204])

# --- 6. activity log: visible only to those who can read the item; deletions stay visible; admin sees all
time.sleep(1)  # entries are written asynchronously after the action
eid, E = user('erin')  # has no access to alice's project (bob was shared on it earlier)
def acts(token, qs):
    s, r = call('GET', '/activity?' + qs, None, token)
    return s, ([e['action'] for e in r['items']] if s == 200 else r)
s, got = acts(A, f'nodeId={tid}'); check('alice sees her task history', (s, 'task.created' in got), (200, True))
s, got = acts(A, f'projectId={pid}'); check('alice sees her project feed', (s, 'project.created' in got and 'task.created' in got), (200, True))
s, _ = acts(E, f'nodeId={tid}'); check('a stranger cannot read the history of her task', s, [403, 404])
s, _ = acts(E, f'projectId={pid}'); check('a stranger cannot read the feed of her project', s, [403, 404])
s, r = call('GET', '/activity?scope=mine', None, E)
check("a stranger's own feed holds none of alice's items", (s, [e for e in r['items'] if e['nodeId'] in (tid, pid)]), (200, []))
s, _ = call('GET', '/activity', None, E); check('activity needs exactly one selector', s, 400)
s, _ = call('GET', f'/activity?nodeId={tid}&scope=mine', None, A); check('activity rejects two selectors', s, 400)
s, _ = call('GET', '/admin/activity', None, E); check('a normal user cannot use the admin audit log', s, 403)
s, gone = call('POST', '/tasks', {'title': 'short lived', 'projectId': pid}, A)
s, _ = call('DELETE', f'/tasks/{gone["id"]}', None, A); check('alice deletes a task', s, [200, 204])
time.sleep(1)
s, got = acts(A, f'projectId={pid}'); check('a deleted task stays in the project feed', (s, 'task.deleted' in got), (200, True))
s, _ = acts(A, f'nodeId={gone["id"]}'); check('the deleted task itself is gone (404)', s, [403, 404])
s, _ = acts(E, f'projectId={pid}'); check('the deletion is still hidden from a stranger', s, [403, 404])

if SQL:
    did, D = user('dave')
    subprocess.run(SQL, shell=True, input="UPDATE users SET role='admin' WHERE username='dave';", text=True, check=True, capture_output=True)
    bm = team_role(A, tm, 'bob')['id']; am = team_role(A, tm, 'alice')['id']
    # Admin changes need a step-up (password re-entered in this session); reading does not.
    s, _ = call('GET', '/admin/users', None, D); check('an admin reads without a step-up', s, 200)
    s, r = call('PATCH', f'/admin/teams/{tm}/members/{bm}/role', {'role': 'manager'}, D)
    check('an admin change without a step-up is refused', (s, r.get('code')), (403, 'STEP_UP_REQUIRED'))
    s, _ = call('POST', '/user/step-up', {'password': 'wrong-password'}, D); check('step-up refuses a wrong password', s, 400)
    s, _ = call('POST', '/user/step-up', {'password': 'password123'}, D); check('an admin steps up', s, 200)
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
    s, r = call('GET', f'/admin/activity?projectId={pid}&action=task.deleted', None, D)
    check('app admin sees the deletion across projects', (s, [e['nodeId'] for e in r['items']] == [gone['id']]), (200, True))
    s, r = call('GET', '/admin/activity?limit=5', None, D)
    check('app admin pages the whole audit log', (s, len(r['items']), r['next'] is not None), (200, 5, True))
    s, _ = call('GET', '/admin/activity?actorId=abc', None, D); check('admin filters are validated', s, 400)

    # The admin can hand one project to someone else (or take it over), with a reason for the audit trail.
    s, ep = call('POST', '/projects', {'name': 'Erin project'}, E)
    s, _ = call('POST', f'/admin/projects/{ep["id"]}/transfer', {'toUserId': did, 'reason': 'Erin is away'}, E)
    check('a normal user cannot transfer projects', s, 403)
    s, _ = call('POST', f'/admin/projects/{ep["id"]}/transfer', {'toUserId': did}, D); check('a transfer needs a reason', s, 400)
    s, _ = call('POST', f'/admin/projects/{ep["id"]}/transfer', {'toUserId': eid, 'reason': 'noop'}, D)
    check('no transfer to the current owner', s, 400)
    s, _ = call('POST', f'/admin/projects/{tid}/transfer', {'toUserId': did, 'reason': 'a task'}, D); check('only projects can be transferred', s, 404)
    s, r = call('POST', f'/admin/projects/{ep["id"]}/transfer', {'toUserId': did, 'reason': 'Erin is away'}, D)
    check('the admin takes a project over', (s, r.get('ownerId')), (200, did))
    s, r = call('GET', f'/nodes/{ep["id"]}', None, E); check('the previous owner stays its Manager', (s, r.get('access')), (200, 'admin'))
    s, r = call('GET', f'/nodes/{ep["id"]}', None, D); check('the new owner manages it', (s, r.get('access')), (200, 'admin'))
    time.sleep(1)
    s, r = call('GET', f'/admin/activity?projectId={ep["id"]}&action=project.owner_changed', None, D)
    check('the takeover and its reason are in the audit trail',
          (s, [e['changes'] for e in r['items']]), (200, [{'owner': {'from': 'erin', 'to': 'dave'}, 'reason': 'Erin is away'}]))
    s, r = call('GET', '/notifications', None, E)
    check('the previous owner is told', (s, any(n.get('type') == 'project_transferred_away' for n in r)), (200, True))

    # Deleting a user can hand their projects to someone else instead of deleting them.
    fid, F = user('frank')
    s, fp = call('POST', '/projects', {'name': 'Frank shared'}, F)
    s, ft = call('POST', '/tasks', {'title': 'frank task', 'projectId': fp['id']}, F)
    call('POST', f'/projects/{fp["id"]}/users', {'userId': eid, 'permission': 'write'}, F)
    s, owned = call('GET', f'/admin/users/{fid}/projects', None, D)
    check('admin lists what a user owns', (s, [(p['id'], p['shares']) for p in owned]), (200, [(fp['id'], 1)]))
    s, _ = call('GET', f'/admin/users/{fid}/projects', None, E); check('a normal user cannot list owned projects', s, 403)
    s, _ = call('DELETE', f'/admin/users/{fid}?transferProjectsTo={fid}', None, D); check('no transfer to the deleted user', s, 400)
    s, _ = call('DELETE', f'/admin/users/{fid}?transferProjectsTo=999999', None, D); check('no transfer to an unknown user', s, 400)
    s, _ = call('GET', f'/projects/{fp["id"]}', None, F); check('a refused delete changes nothing', s, 200)
    s, _ = call('DELETE', f'/admin/users/{fid}?transferProjectsTo={did}', None, D); check('admin deletes frank, keeping his projects', s, 204)
    s, r = call('GET', f'/nodes/{fp["id"]}', None, D)
    check('the admin now owns the project and manages it', (s, r.get('ownerId'), r.get('access')), (200, did, 'admin'))
    s, _ = call('GET', f'/tasks/{ft["id"]}', None, D); check('its tasks survive', s, 200)
    s, _ = call('PUT', f'/tasks/{ft["id"]}', {'title': 'still shared'}, E); check('its sharing survives', s, 200)
    time.sleep(1)
    s, r = call('GET', f'/admin/activity?projectId={fp["id"]}&action=project.owner_changed', None, D)
    check('the transfer is in the audit trail', (s, [e['changes']['owner'] for e in r['items']]), (200, [{'from': 'frank', 'to': 'dave'}]))

    # Single-user mode. Destructive (every other account is deleted), so it runs last.
    s, r = call('GET', '/admin/single-user', None, D); check('single-user mode starts off', (s, r.get('enabled')), (200, False))
    s, r = call('GET', f'/admin/single-user/preview?userId={did}', None, D)
    check('the preview counts the accounts to delete', (s, r.get('users', 0) >= 3), (200, True))
    s, _ = call('GET', f'/admin/single-user/preview?userId={eid}', None, D); check('only an admin can be the sole user', s, 400)
    s, _ = call('GET', '/admin/single-user', None, E); check('a normal user cannot see the switch', s, 403)
    ok = {'userId': did, 'backupConfirmed': True, 'privateDataConfirmed': True, 'confirmUsername': 'dave'}
    s, _ = call('POST', '/admin/single-user/enable', {**ok, 'backupConfirmed': False}, D); check('enable needs the backup box', s, 400)
    s, _ = call('POST', '/admin/single-user/enable', {**ok, 'confirmUsername': 'Dave'}, D); check('enable needs the exact username', s, 400)
    s, _ = call('PATCH', '/admin/settings', {'singleUserMode': 'true'}, D); check('the generic settings API cannot flip the mode', s, 400)
    s, _ = call('POST', '/comments', {'content': 'from alice', 'taskId': tid}, A); check('alice comments before the switch', s, 201)
    s, r = call('POST', '/admin/single-user/enable', ok, D); check('dave switches to single-user mode', (s, r.get('enabled'), r.get('userId')), (200, True, did))
    s, _ = call('POST', '/admin/single-user/enable', ok, D); check('a second enable is refused', s, 409)
    s, cfg = call('GET', '/auth/config'); check('config reports the mode and closed registration', (cfg.get('singleUserMode'), cfg.get('registrationEnabled')), (True, False))
    s, _ = call('POST', '/users', {'username': 'latecomer', 'email': 'late@example.com', 'password': 'password123'}); check('registration is closed', s, 403)
    s, _ = call('POST', '/auth/login', {'username': 'erin', 'password': 'password123'}); check('the other accounts are gone', s, 401)
    s, r = call('GET', '/teams', None, D); check('teams are off', (s, r.get('message')), (403, 'Not available in single-user mode'))
    s, _ = call('GET', '/users?q=dav', None, D); check('the user picker is off', s, 403)
    s, _ = call('GET', f'/projects/{pid}/users', None, D); check('project sharing is off', s, 403)
    s, r = call('GET', f'/nodes/{pid}', None, D); check("alice's project now belongs to dave", (s, r.get('ownerId'), r.get('access')), (200, did, 'admin'))
    s, r = call('GET', f'/tasks/{tid}', None, D); check('its tasks too', s, 200)
    s, r = call('GET', f'/comments?taskId={tid}', None, D)
    check("alice's comment stays, now under dave", (s, len(r) > 0 and all(c['author']['id'] == did for c in r)), (200, True))
    s, r = call('POST', '/tasks', {'title': 'solo task', 'projectId': pid}, D); check('dave keeps working', s, 201)
    s, r = call('POST', '/admin/single-user/disable', {}, D); check('dave switches back to multi-user mode', (s, r.get('enabled')), (200, False))
    s, cfg = call('GET', '/auth/config'); check('the config follows', cfg.get('singleUserMode'), False)
    s, _ = call('GET', '/teams', None, D); check('teams are back', s, 200)
    s, r = call('GET', f'/nodes/{pid}', None, D); check('nothing moves back', r.get('ownerId'), did)
else:
    print('SKIP app-admin team checks (set SQL_CMD to run them)')

print(f'\n{sum(results)}/{len(results)} passed'); sys.exit(0 if all(results) else 1)
