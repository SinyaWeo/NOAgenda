#!/usr/bin/env python3
"""
Trash smoke test: deleting a task or project only moves it to the trash; it can be listed and
restored by the people who could delete it (and nobody else), is hidden everywhere else, and can
be deleted for good.

Registers three throwaway users (alice, bob, carol): run ONLY against a disposable database, and
mind the registration rate limit (10/hour/IP).

Usage:  SQL_CMD='mysql ... -N' BASE_URL=http://127.0.0.1:3000 python3 scripts/trash-smoke.py
        (SQL_CMD is required: it checks that purged rows are really gone)
"""
import json, os, subprocess, sys, time, urllib.request, urllib.error
B = os.environ.get('BASE_URL', 'http://127.0.0.1:3000')
SQL = os.environ['SQL_CMD']
results = []
run = str(int(time.time()))[-6:]

def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(B + path, data=data, method=method)
    req.add_header('Content-Type', 'application/json')
    if token: req.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read().decode(); return r.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t)
        except Exception: return e.code, t

def sql(q):
    return subprocess.run(SQL, shell=True, input=q, capture_output=True, text=True, check=True).stdout.strip()

def check(name, got, expect):
    exact = isinstance(got, list)  # a list result is compared whole; a scalar may match any of several answers
    ok = got in expect if isinstance(expect, (list, tuple, set)) and not exact else got == expect
    results.append(ok); print(('PASS ' if ok else 'FAIL ') + name + f'  (got {got}, want {expect})')

def user(n):
    n = f'{n}{run}'
    s, u = call('POST', '/users', {'username': n, 'email': n + '@example.com', 'password': 'password123'})
    assert s == 201, (s, u)
    s, l = call('POST', '/auth/login', {'username': n, 'password': 'password123'})
    assert s == 200, (s, l)
    return u['id'], l['access_token']

aid, A = user('trashalice'); bid, Bt = user('trashbob'); cid, C = user('trashcarol')
ids = lambda token: [e['id'] for e in call('GET', '/trash', None, token)[1]]

s, proj = call('POST', '/projects', {'name': 'Trash project'}, A); pid = proj['id']
s, t1 = call('POST', '/tasks', {'title': 'Parent task', 'description': 'full text', 'projectId': pid}, A); t1 = t1['id']
s, t2 = call('POST', '/tasks', {'title': 'Subtask', 'parentTaskId': t1}, A); t2 = t2['id']
s, t3 = call('POST', '/tasks', {'title': 'Other task', 'projectId': pid}, A); t3 = t3['id']
s, _ = call('POST', f'/projects/{pid}/users', {'userId': bid, 'permission': 'write'}, A); check('alice shares with bob (write)', s, [200, 201])
s, _ = call('POST', f'/projects/{pid}/users', {'userId': cid, 'permission': 'read'}, A); check('alice shares with carol (read)', s, [200, 201])

# --- delete a task with a subtask
s, _ = call('DELETE', f'/nodes/{t1}', None, A); check('delete task', s, 200)
check('trashed task is gone', call('GET', f'/nodes/{t1}', None, A)[0], 404)
check('trashed subtask is gone', call('GET', f'/nodes/{t2}', None, A)[0], 404)
s, tree = call('GET', f'/nodes/{pid}/tree', None, A)
check('project tree no longer has it', 'Parent task' in json.dumps(tree), False)
check('rows still exist', sql(f'SELECT COUNT(*) FROM nodes WHERE id IN ({t1},{t2})'), '2')
check('alice sees the task in the trash (only the top of what was deleted)', ids(A), [t1])
check('bob (write) sees it too', ids(Bt), [t1])
check('carol (read) does not', ids(C), [])
check('carol cannot restore it', call('POST', f'/trash/{t1}/restore', None, C)[0], 403)
check('carol cannot purge it', call('DELETE', f'/trash/{t1}', None, C)[0], 403)
check('a live node cannot be restored', call('POST', f'/trash/{t3}/restore', None, A)[0], 404)

# --- restore (by bob)
s, node = call('POST', f'/trash/{t1}/restore', None, Bt); check('bob restores', s, [200, 201])
check('task is back', call('GET', f'/nodes/{t1}', None, A)[0], 200)
check('subtask is back', call('GET', f'/nodes/{t2}', None, A)[0], 200)
check('trash is empty again', ids(A), [])
s, revs = call('GET', f'/node-revisions?nodeId={t1}', None, A)
check('text history survived the trip', any(r['description'] == 'full text' for r in revs['items']), True)

# --- parent must come back first
call('DELETE', f'/nodes/{t3}', None, A)
call('DELETE', f'/nodes/{pid}', None, A)
check('project in trash', pid in ids(A), True)
check('its separately deleted task is listed too', t3 in ids(A), True)
check('bob (write) cannot restore a project', call('POST', f'/trash/{pid}/restore', None, Bt)[0], 403)
check('cannot restore a task before its project', call('POST', f'/trash/{t3}/restore', None, A)[0], 409)
check('restore project', call('POST', f'/trash/{pid}/restore', None, A)[0], [200, 201])
check('project tasks back with it', call('GET', f'/nodes/{t1}', None, A)[0], 200)
check('separately deleted task stays in the trash', ids(A), [t3])
check('now it can be restored', call('POST', f'/trash/{t3}/restore', None, A)[0], [200, 201])

# --- purge
call('DELETE', f'/nodes/{t1}', None, A)
check('purge', call('DELETE', f'/trash/{t1}', None, A)[0], 200)
check('rows are gone', sql(f'SELECT COUNT(*) FROM nodes WHERE id IN ({t1},{t2})'), '0')
check('revisions are gone', sql(f'SELECT COUNT(*) FROM node_revisions WHERE nodeId IN ({t1},{t2})'), '0')
check('purged node cannot be restored', call('POST', f'/trash/{t1}/restore', None, A)[0], 404)

# --- expiry: backdate, then the hourly job (or an API restart) removes it
call('DELETE', f'/nodes/{t3}', None, A)
sql(f'UPDATE nodes SET deletedAt = NOW() - INTERVAL 40 DAY WHERE id = {t3}')
print('INFO backdated; restart the API to run the purge, then check node', t3, 'is gone')

failed = results.count(False)
print(f'\n{len(results) - failed}/{len(results)} checks passed')
sys.exit(1 if failed else 0)
