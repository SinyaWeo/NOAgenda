#!/usr/bin/env python3
"""
Authorization smoke test for the NOAgenda API (55 checks).

Registers three throwaway users (alice, bob, carol) and verifies that one user
cannot read or change another user's projects/tasks/comments/attachments/
webhooks/etc., that mass-assignment and id-takeover attempts fail, that the
role-escalation payload is rejected, and that read/write sharing behaves.

!! Run ONLY against a disposable database. It creates users and data, and the
   registration rate limit (10/hour/IP) means a second run needs a restart.

Usage:  BASE_URL=http://127.0.0.1:3000 python3 scripts/authz-smoke.py
        (self-signed HTTPS, e.g. a local Caddy: add AUTHZ_INSECURE=1)
"""
import json, sys, urllib.request, urllib.error
import os, ssl
B = os.environ.get('BASE_URL', 'http://127.0.0.1:3000')
CTX = ssl._create_unverified_context() if os.environ.get('AUTHZ_INSECURE') == '1' else None
results = []

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
    ok = got in expect if isinstance(expect, (list, tuple, set)) else got == expect
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
s, g = call('POST', '/user/settings/general', {'theme': 'dark', 'weekStart': 1}, Bt); check('valid settings accepted', s, [200, 201])

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
s, bt = call('POST', '/tasks', {'title': 'bob task', 'createdBy': aid, 'ownerId': aid}, Bt)
s, got = call('GET', f'/tasks/{bt["id"]}', None, Bt); check('createdBy spoof ignored', got['createdBy'], bid)
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

print(f'\n{sum(results)}/{len(results)} passed'); sys.exit(0 if all(results) else 1)
