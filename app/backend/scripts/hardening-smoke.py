#!/usr/bin/env python3
"""
Smoke test for the hardening work: default-deny routes, API-token scopes, search-only user
lookup, upload checks and quota, webhook SSRF guard, per-address lockout, join-table uniqueness.

!! Needs a DISPOSABLE database and a backend started with:
     TRUST_PROXY=1  USER_STORAGE_QUOTA_MB=1  LOGIN_RATE_LIMIT=100   (and no SMTP, so no email verification)
   TRUST_PROXY=1 lets the script pretend to be different clients with X-Forwarded-For.
   Registration is limited to 10/hour/IP: restart the backend between runs.

Usage:  BASE_URL=http://127.0.0.1:3001 python3 scripts/hardening-smoke.py
"""
import json, os, secrets, sys, urllib.request, urllib.error, uuid

B = os.environ.get('BASE_URL', 'http://127.0.0.1:3001')
run = secrets.token_hex(3)
results = []

def call(method, path, body=None, token=None, ip=None, raw=None, ctype=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(B + path, data=data, method=method)
    req.add_header('Content-Type', ctype or 'application/json')
    if token: req.add_header('Authorization', 'Bearer ' + token)
    if ip: req.add_header('X-Forwarded-For', ip)
    try:
        with urllib.request.urlopen(req) as r:
            t = r.read().decode(); return r.status, (json.loads(t) if t.startswith(('{', '[')) else t)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t)
        except Exception: return e.code, t

def check(name, got, want):
    # a list means "any of these"; anything else (including tuples) must be equal
    ok = got in want if isinstance(want, list) else got == want
    results.append(ok); print(('PASS ' if ok else 'FAIL ') + name + f'  (got {got}, want {want})')

def multipart(fields, files):
    boundary = uuid.uuid4().hex
    out = b''
    for k, v in fields.items():
        out += f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    for k, (fname, ctype, content) in files.items():
        out += f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"; filename="{fname}"\r\nContent-Type: {ctype}\r\n\r\n'.encode() + content + b'\r\n'
    out += f'--{boundary}--\r\n'.encode()
    return out, f'multipart/form-data; boundary={boundary}'

PW = 'password123'
def user(n):
    name = f'{n}{run}'
    s, u = call('POST', '/users', {'username': name, 'email': name + '@example.com', 'password': PW})
    assert s == 201, (s, u)
    s, l = call('POST', '/auth/login', {'username': name, 'password': PW}); assert s == 200, (s, l)
    return name, u['id'], l['access_token']

PNG = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) + b'\x00' * 24
ann, aid, A = user('ann'); bob, bid, Bt = user('bob'); cat, cid, C = user('cat')

# ================= default-deny: every non-public route says 401 without a token
for m, p in [('GET', '/users/me'), ('GET', '/projects'), ('GET', '/tasks'), ('POST', '/tasks'), ('GET', '/tokens'),
             ('GET', '/admin/users'), ('GET', '/plugins'), ('GET', '/notifications'), ('GET', '/search?q=abc'),
             ('GET', '/users?q=abc'), ('DELETE', '/tasks/1'), ('GET', '/user/settings/general')]:
    s, _ = call(m, p, {} if m == 'POST' else None); check(f'{m} {p} needs sign-in', s, 401)
for m, p in [('GET', '/health'), ('GET', '/auth/config'), ('GET', '/quotes/random')]:
    s, _ = call(m, p); check(f'{m} {p} stays public', s, 200)

# ================= API-token scopes
s, rt = call('POST', '/tokens', {'name': 'ro'}, A); check('token without scope defaults to read', (s, rt.get('scope')), (201, 'read'))
s, wt = call('POST', '/tokens', {'name': 'rw', 'scope': 'write'}, A); check('write token created', (s, wt.get('scope')), (201, 'write'))
s, _ = call('POST', '/tokens', {'name': 'bad', 'scope': 'admin'}, A); check('unknown scope rejected', s, 400)
R, W = rt['rawToken'], wt['rawToken']
s, proj = call('POST', '/projects', {'name': 'Scoped'}, A); pid = proj['id']
s, _ = call('GET', '/projects', None, R); check('read token can GET', s, 200)
s, _ = call('POST', '/tasks', {'title': 'x', 'parentId': pid}, R); check('read token cannot POST', s, 403)
s, _ = call('DELETE', f'/projects/{pid}', None, R); check('read token cannot DELETE', s, 403)
s, t = call('POST', '/tasks', {'title': 'via write token', 'parentId': pid}, W); check('write token can POST', s, 201)
s, _ = call('PUT', f'/tasks/{t["id"]}', {'title': 'renamed'}, W); check('write token can PUT', s, 200)
s, tl = call('GET', '/tokens', None, A); check('token list shows scopes', tuple(sorted(x['scope'] for x in tl)), ('read', 'write'))
s, _ = call('GET', '/tokens', None, W); check('write token still cannot manage tokens', s, 403)

# ================= search-only user lookup
s, _ = call('GET', '/users', None, A); check('no full user list (no q)', s, 400)
s, _ = call('GET', '/users?q=ab', None, A); check('q shorter than 3 characters rejected', s, 400)
s, found = call('GET', f'/users?q={bob[:6]}', None, A)
check('search finds bob by username', (s, [u['username'] for u in found]), (200, [bob]))
check('search returns only public fields', set(found[0].keys()) <= {'id', 'username', 'name', 'avatarUrl'}, True)
check('search never returns an email or hash', 'email' in found[0] or 'password' in found[0], False)
s, me_in = call('GET', f'/users?q={ann[:6]}', None, A); check('the caller is left out of results', ann in [u['username'] for u in me_in], False)
s, many = call('GET', '/users?q=' + run, None, A); check('at most 10 results', len(many) <= 10, True)
s, _ = call('GET', f'/users/{bid}', None, A); check('GET /users/:id no longer exposes other users', s, [404, 405])

# ================= registration says nothing about WHICH of username/email exists
s, e1 = call('POST', '/users', {'username': bob, 'email': 'fresh' + run + '@example.com', 'password': PW})
s2, e2 = call('POST', '/users', {'username': 'fresh' + run, 'email': bob + '@example.com', 'password': PW})
check('taken username and taken email give the same answer', (s, s2, e1.get('message') == e2.get('message')), (409, 409, True))

# ================= registration remembers the visitor's language and time zone
nm = 'loc' + run
s, _ = call('POST', '/users', {'username': nm, 'email': nm + '@example.com', 'password': PW, 'language': 'cs', 'timezone': 'Europe/Prague'}); check('registration with language + time zone accepted', s, 201)
s, l = call('POST', '/auth/login', {'username': nm, 'password': PW}); s, me = call('GET', '/users/me', None, l['access_token'])
check('the account starts in that language and zone', (me['language'], me['timezone']), ('cs', 'Europe/Prague'))
s, _ = call('POST', '/users', {'username': nm + 'x', 'email': nm + 'x@example.com', 'password': PW, 'language': 'xx'}); check('unknown language rejected', s, 400)
s, _ = call('POST', '/users', {'username': nm + 'y', 'email': nm + 'y@example.com', 'password': PW, 'timezone': 'Mars/Olympus'}); check('invalid time zone rejected', s, 400)
s, _ = call('POST', '/user/settings/general', {'timezone': 'Mars/Olympus'}, A); check('settings reject an invalid time zone', s, 400)
s, _ = call('POST', '/user/settings/general', {'language': 'cs', 'theme': 'system', 'timezone': 'Europe/Prague'}, A); check('settings accept language, system theme and a valid zone', s, [200, 201])

# ================= avatar: the bytes must match the claim
body, ct = multipart({}, {'avatar': ('a.png', 'image/png', b'<html><script>alert(1)</script></html>')})
s, _ = call('PUT', '/user/settings/avatar/upload', token=A, raw=body, ctype=ct); check('HTML labelled image/png is rejected', s, 400)
body, ct = multipart({}, {'avatar': ('a.png', 'image/png', PNG)})
s, av = call('PUT', '/user/settings/avatar/upload', token=A, raw=body, ctype=ct); check('a real PNG is accepted', s, 200)

# ================= attachments: sniffing and quota (backend started with USER_STORAGE_QUOTA_MB=1)
s, task = call('POST', '/tasks', {'title': 'files', 'parentId': pid}, A); tid = task['id']
body, ct = multipart({'taskId': tid}, {'file': ('x.png', 'image/png', b'not really a png at all')})
s, _ = call('POST', '/attachments/upload', token=A, raw=body, ctype=ct); check('fake PNG attachment rejected', s, 400)
body, ct = multipart({'taskId': tid}, {'file': ('doc.pdf', 'application/pdf', b'%PDF-1.4\n' + b'0' * 800_000)})
s, _ = call('POST', '/attachments/upload', token=A, raw=body, ctype=ct); check('800 KB PDF fits the 1 MB quota', s, 201)
body, ct = multipart({'taskId': tid}, {'file': ('doc2.pdf', 'application/pdf', b'%PDF-1.4\n' + b'0' * 600_000)})
s, r = call('POST', '/attachments/upload', token=A, raw=body, ctype=ct); check('a second 600 KB file exceeds the quota', s, 413)
body, ct = multipart({'taskId': tid}, {'file': ('t.txt', 'text/plain', b'hello')})
s, _ = call('POST', '/attachments/upload', token=Bt, raw=body, ctype=ct); check('another user cannot attach to my task', s, 403)

# ================= webhooks: no internal targets
for url in ['http://127.0.0.1:3000/x', 'http://localhost/x', 'http://169.254.169.254/latest/meta-data/', 'http://10.0.0.5/x', 'http://[::1]/x', 'https://u:p@8.8.8.8/x', 'ftp://8.8.8.8/x']:
    s, _ = call('POST', '/webhooks', {'url': url, 'event': '*'}, A); check(f'webhook to {url} rejected', s, 400)
s, _ = call('POST', '/webhooks', {'url': 'https://8.8.8.8/hook', 'event': '*'}, A); check('webhook to a public address accepted', s, 201)
s, wh = call('POST', '/webhooks', {'url': 'https://8.8.4.4/hook', 'event': '*'}, A)
s, _ = call('PUT', f'/webhooks/{wh["id"]}', {'url': 'http://192.168.0.10/x'}, A); check('updating a webhook to an internal address is rejected too', s, 400)

# ================= lockout cannot be used against the real owner
def login(user_, pw, ip): return call('POST', '/auth/login', {'username': user_, 'password': pw}, ip=ip)[0]
for _ in range(5): login(cat, 'wrong-guess', '203.0.113.66')
check('attacker address locked: even the right password is refused', login(cat, PW, '203.0.113.66'), 401)
check('...but the owner signs in from their own address', login(cat, PW, '198.51.100.7'), 200)
check('...and the attacker cannot lock anything else', login(ann, PW, '203.0.113.66'), 200)

# ================= join tables: no duplicates; teams can be deleted with members
s, team = call('POST', '/teams', {'name': 'T' + run}, A); tm = team['id']
s, _ = call('POST', '/team-members', {'userId': bid, 'teamId': tm}, A); check('member added', s, 201)
s, _ = call('POST', '/team-members', {'userId': bid, 'teamId': tm}, A); check('adding the same member twice is a 409', s, 409)
s, _ = call('POST', f'/projects/{pid}/users', {'userId': bid, 'permission': 'read'}, A); check('project member added', s, 201)
s, _ = call('POST', f'/projects/{pid}/users', {'userId': bid, 'permission': 'write'}, A); check('adding the same project member twice is a 409', s, 409)
s, _ = call('DELETE', f'/teams/{tm}', None, A); check('a team with members can be deleted', s, [200, 204])

print(f'\n{sum(results)}/{len(results)} passed'); sys.exit(0 if all(results) else 1)
