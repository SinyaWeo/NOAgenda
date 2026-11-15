#!/usr/bin/env python3
"""
Auth lifecycle smoke test: email verification, sessions, refresh-token rotation and
theft detection, logout, lockout, password reset, password change, API tokens.

Needs a DISPOSABLE database and a mail sink with a Mailpit-compatible API:
  - API started with SMTP_HOST/SMTP_PORT pointing at the sink and LOGIN_RATE_LIMIT=100
  - MAILPIT_URL=http://127.0.0.1:8025  BASE_URL=http://127.0.0.1:3000

  BASE_URL=... MAILPIT_URL=... python3 scripts/auth-lifecycle-smoke.py
Takes ~15 s (waits out the refresh-rotation grace window once).
"""
import json, os, re, secrets, ssl, sys, time, urllib.error, urllib.request

B = os.environ.get('BASE_URL', 'http://127.0.0.1:3000')
M = os.environ.get('MAILPIT_URL', 'http://127.0.0.1:8025')
CTX = ssl._create_unverified_context() if os.environ.get('AUTHZ_INSECURE') == '1' else None
COOKIE_PATH_PREFIX = os.environ.get('COOKIE_PATH_PREFIX', '')  # e.g. /api when behind the proxy
results = []


def call(method, path, body=None, token=None, cookie=None, base=B, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, method=method)
    req.add_header('Content-Type', 'application/json')
    if token: req.add_header('Authorization', 'Bearer ' + token)
    if cookie: req.add_header('Cookie', cookie)
    for k, v in (headers or {}).items(): req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, context=CTX) as r:
            t = r.read().decode()
            try: parsed = json.loads(t) if t else None
            except ValueError: parsed = t  # e.g. the mail sink answers DELETE with plain text
            return r.status, parsed, r.headers
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: body = json.loads(t)
        except Exception: body = t
        return e.code, body, e.headers


def check(name, got, want):
    ok = got in want if isinstance(want, (list, tuple, set)) else got == want
    results.append(ok); print(('PASS ' if ok else 'FAIL ') + f'{name}  (got {got!r}, want {want!r})')


def set_cookie(headers):
    for v in headers.get_all('Set-Cookie') or []:
        if v.startswith('noa_rt='): return v
    return None


def cookie_value(sc):
    return sc.split(';')[0] if sc else None


# ---- mail sink helpers
def mails_for(addr, subject_part, wait=8):
    end = time.time() + wait
    while time.time() < end:
        s, d, _ = call('GET', '/api/v1/messages?limit=200', base=M)
        for m in d.get('messages', []):
            if any(t['Address'].lower() == addr.lower() for t in m['To']) and subject_part in m['Subject']:
                s, full, _ = call('GET', f'/api/v1/message/{m["ID"]}', base=M)
                return full['Text']
        time.sleep(0.4)
    return None


def token_from(text):
    m = re.search(r'token=([0-9a-f]{64})', text or '')
    return m.group(1) if m else None


def latest_token(addr, subject_part):
    return token_from(mails_for(addr, subject_part))


call('DELETE', '/api/v1/messages', base=M)
run = secrets.token_hex(3)
PW = 'correct horse 42'


def register(name):
    s, u, _ = call('POST', '/users', {'username': f'{name}{run}', 'email': f'{name}{run}@example.com', 'password': PW})
    assert s == 201, (s, u)
    return f'{name}{run}', f'{name}{run}@example.com'


def login(user, pw=PW):
    return call('POST', '/auth/login', {'username': user, 'password': pw})


# ================= email verification =================
s, cfg, _ = call('GET', '/auth/config'); check('verification is required when SMTP is configured', cfg['emailVerificationRequired'], True)
alice, alice_mail = register('alice')
s, body, _ = login(alice); check('unverified login blocked', s, 403)
check('...with a machine-readable code', body['code'], 'EMAIL_NOT_VERIFIED')
s, _, _ = login(alice, 'wrong password'); check('wrong password on unverified account does not reveal state', s, 401)
tok = latest_token(alice_mail, 'Confirm'); check('verification mail delivered with a token', bool(tok), True)
s, _, _ = call('POST', '/auth/email/verify', {'token': 'f' * 64}); check('bogus verification token rejected', s, 400)
call('DELETE', '/api/v1/messages', base=M)
s, _, _ = call('POST', '/auth/email/resend', {'email': alice_mail}); check('resend is accepted', s, 204)
tok2 = latest_token(alice_mail, 'Confirm'); check('resend sends a fresh token', bool(tok2) and tok2 != tok, True)
s, _, _ = call('POST', '/auth/email/verify', {'token': tok}); check('the superseded token no longer works', s, 400)
s, _, _ = call('POST', '/auth/email/verify', {'token': tok2}); check('verification succeeds', s, 204)
s, _, _ = call('POST', '/auth/email/verify', {'token': tok2}); check('verification token is single use', s, 400)
call('DELETE', '/api/v1/messages', base=M)
s, _, _ = call('POST', '/auth/email/resend', {'email': 'nobody@example.com'}); check('resend for unknown address is silent', s, 204)

# ================= login, cookie, access token =================
s, body, hdr = login(alice); check('verified user can log in', s, 200)
access, sc = body['access_token'], set_cookie(hdr)
check('access token is short-lived', 0 < body['expires_in'] <= 900, True)
check('refresh cookie is HttpOnly', 'HttpOnly' in (sc or ''), True)
check('refresh cookie is SameSite=Strict', 'SameSite=Strict' in (sc or ''), True)
check('refresh cookie is path-scoped', 'Path=' + COOKIE_PATH_PREFIX + '/auth' in (sc or ''), True)
check('refresh token is not in the response body', 'refresh' in json.dumps(body).lower(), False)
s, me, _ = call('GET', '/users/me', token=access); check('access token works', s, 200)
check('email is verified', me['isEmailConfirmed'], True)
s, _, _ = call('GET', '/users/me', token=access[:-3] + 'abc'); check('tampered access token rejected', s, 401)
s, _, _ = call('GET', '/users/me'); check('no token rejected', s, 401)

# ================= refresh rotation + theft detection =================
c1 = cookie_value(sc)
s, r, hdr2 = call('POST', '/auth/refresh', cookie=c1); check('refresh with cookie works', s, 200)
c2 = cookie_value(set_cookie(hdr2)); check('refresh token rotates', bool(c2) and c2 != c1, True)
access2 = r['access_token']
s, _, _ = call('POST', '/auth/refresh'); check('refresh without cookie rejected', s, 401)
s, _, _ = call('POST', '/auth/refresh', cookie='noa_rt=garbage'); check('refresh with garbage rejected', s, 401)
s, _, _ = call('POST', '/auth/refresh', cookie=c2, headers={'Origin': 'https://evil.example'}); check('refresh from a foreign Origin refused', s, 403)
s, rr, h = call('POST', '/auth/refresh', cookie=c1)
check('immediate replay (parallel tab) is tolerated and does not re-issue', (s, set_cookie(h)) == (200, None), True)
print('   ...waiting out the rotation grace window (11s)'); time.sleep(11)
s, _, _ = call('POST', '/auth/refresh', cookie=c1); check('LATE replay of an old refresh token is rejected (theft)', s, 401)
s, _, _ = call('POST', '/auth/refresh', cookie=c2); check('...and the session is revoked for the legitimate holder too', s, 401)
s, _, _ = call('GET', '/users/me', token=access2); check('...so its access token stops working immediately', s, 401)

# ================= logout =================
s, body, hdr = login(alice); access, c = body['access_token'], cookie_value(set_cookie(hdr))
s, _, h = call('POST', '/auth/logout', cookie=c); check('logout returns 204', s, 204)
check('logout clears the cookie', 'noa_rt=;' in (set_cookie(h) or ''), True)
s, _, _ = call('GET', '/users/me', token=access); check('access token is dead right after logout', s, 401)
s, _, _ = call('POST', '/auth/refresh', cookie=c); check('refresh token is dead after logout', s, 401)

# ================= sessions list =================
s, b1, h1 = login(alice); A = b1['access_token']
s, b2, h2 = login(alice); Bt = b2['access_token']
s, sess, _ = call('GET', '/user/sessions', token=A); check('session list works', s, 200)
check('session list never exposes token hashes', 'tokenHash' in json.dumps(sess) or 'prevTokenHash' in json.dumps(sess), False)
check('exactly one session is marked current', sum(1 for x in sess if x['current']), 1)
other = [x for x in sess if not x['current']][0]
s, _, _ = call('DELETE', f'/user/sessions/{other["id"]}', token=A); check('a session can be revoked from another one', s, 204)
s, _, _ = call('GET', '/users/me', token=Bt); check('the revoked session is signed out at once', s, 401)

# ================= password change signs out other sessions =================
s, b3, _ = login(alice); C = b3['access_token']
s, _, _ = call('POST', '/user/settings/password', {'oldPassword': 'wrong', 'newPassword': 'brand new pass 9'}, token=A); check('password change needs the current password', s, 401)
NEW = 'brand new pass 9'
s, _, _ = call('POST', '/user/settings/password', {'oldPassword': PW, 'newPassword': NEW}, token=A); check('password change works', s, [200, 201])
s, _, _ = call('GET', '/users/me', token=A); check('the session that changed it stays signed in', s, 200)
s, _, _ = call('GET', '/users/me', token=C); check('all other sessions are signed out', s, 401)
s, _, _ = login(alice, PW); check('old password no longer works', s, 401)
s, _, _ = login(alice, NEW); check('new password works', s, 200)

# ================= API tokens =================
s, t, _ = call('POST', '/tokens', {'name': 'ci'}, token=A); check('API token created', s, 201)
raw = t['rawToken']; check('raw token has the noa_ prefix', raw.startswith('noa_'), True)
s, lst, _ = call('GET', '/tokens', token=A); check('token list does not leak the stored hash', 'token' in lst[0], False)
check('token list shows a prefix to tell tokens apart', lst[0].get('tokenPrefix'), raw[:8])
s, _, _ = call('GET', '/users/me', token=raw); check('API token authenticates', s, 200)
s, _, _ = call('GET', '/users/me', token='noa_' + 'a' * 64); check('unknown API token rejected', s, 401)
s, _, _ = call('POST', '/user/settings/password', {'oldPassword': NEW, 'newPassword': 'another pass 77'}, token=raw); check('API token cannot change the password', s, 403)
s, _, _ = call('POST', '/user/settings/email', {'email': 'x@example.com', 'password': NEW}, token=raw); check('API token cannot change the email', s, 403)
s, _, _ = call('POST', '/tokens', {'name': 'child'}, token=raw); check('API token cannot mint more tokens', s, 403)
s, _, _ = call('GET', '/user/sessions', token=raw); check('API token cannot list sessions', s, 403)
s, _, _ = call('DELETE', f'/tokens/{t["id"]}', token=A); check('API token can be revoked', s, 204)
s, _, _ = call('GET', '/users/me', token=raw); check('a revoked API token stops working', s, 401)

# ================= email change needs re-verification =================
call('DELETE', '/api/v1/messages', base=M)
new_mail = f'alice-new{run}@example.com'
s, _, _ = call('POST', '/user/settings/email', {'email': new_mail, 'password': 'wrong'}, token=A); check('email change needs the password', s, 401)
bob, bob_mail = register('bob')
tokb = latest_token(bob_mail, 'Confirm'); call('POST', '/auth/email/verify', {'token': tokb})
s, _, _ = call('POST', '/user/settings/email', {'email': bob_mail, 'password': NEW}, token=A); check('cannot take an address that is already in use', s, 409)
s, _, _ = call('POST', '/user/settings/email', {'email': new_mail, 'password': NEW}, token=A); check('email change accepted', s, [200, 201])
s, me, _ = call('GET', '/users/me', token=A); check('new address starts unverified', me['isEmailConfirmed'], False)
tok = latest_token(new_mail, 'Confirm'); check('verification mail goes to the NEW address', bool(tok), True)
s, _, _ = login(alice, NEW); check('unverified new address blocks the next login', s, 403)
s, _, _ = call('POST', '/auth/email/verify', {'token': tok}); check('new address verified', s, 204)
s, _, _ = login(alice, NEW); check('login works again after verifying', s, 200)

# ================= lockout =================
dave, dave_mail = register('dave')
tok = latest_token(dave_mail, 'Confirm'); call('POST', '/auth/email/verify', {'token': tok})
s, _, _ = login(dave); check('dave can log in', s, 200)
codes = [login(dave, 'bad password')[0] for _ in range(5)]
check('5 wrong passwords all fail with 401', codes == [401] * 5, True)
s, locked_body, _ = login(dave, PW); check('correct password is refused while locked', s, 401)
s, unknown_body, _ = login('nobody' + run, PW)
check('locked, wrong-password and unknown-user errors are identical', locked_body['message'], unknown_body['message'])

# ================= password reset =================
call('DELETE', '/api/v1/messages', base=M)
s, _, _ = call('POST', '/auth/password/token', {'email': 'ghost@example.com'}); check('reset for unknown address answers 204', s, 204)
time.sleep(1.0)
s, d, _ = call('GET', '/api/v1/messages', base=M); check('...and sends nothing', d['messages_count'], 0)
s, b4, _ = login(bob); BOB = b4['access_token']; check('bob can log in', s, 200)
call('DELETE', '/api/v1/messages', base=M)
s, _, _ = call('POST', '/auth/password/token', {'email': dave_mail}); check('reset request answers 204', s, 204)
rt = latest_token(dave_mail, 'Reset'); check('reset mail delivered with a token', bool(rt), True)
s, _, _ = call('POST', '/auth/password/reset', {'token': rt, 'password': 'short'}); check('weak new password rejected', s, 400)
DAVE_NEW = 'dave got a new pass 5'
s, _, _ = call('POST', '/auth/password/reset', {'token': rt, 'password': DAVE_NEW}); check('reset with the emailed token works', s, 204)
s, _, _ = call('POST', '/auth/password/reset', {'token': rt, 'password': 'something else 55'}); check('reset token is single use', s, 400)
s, _, _ = login(dave, DAVE_NEW); check('reset also clears the lockout', s, 200)
s, _, _ = login(dave, PW); check('old password is gone', s, 401)
s, old_login, _ = login(bob); BOB2 = old_login['access_token']
call('DELETE', '/api/v1/messages', base=M)
call('POST', '/auth/password/token', {'email': bob_mail}); rt = latest_token(bob_mail, 'Reset')
call('POST', '/auth/password/reset', {'token': rt, 'password': 'bob new password 8'})
s, _, _ = call('GET', '/users/me', token=BOB); check('a password reset signs out every session', s, 401)
s, _, _ = call('GET', '/users/me', token=BOB2); check('...including the most recent one', s, 401)

print(f'\n{sum(results)}/{len(results)} passed'); sys.exit(0 if all(results) else 1)
