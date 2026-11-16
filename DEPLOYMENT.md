# Deploying NOAgenda

> **Going live?** Follow [PRELAUNCH.md](PRELAUNCH.md): a step-by-step checklist with scripts that verify your configuration (`docker/preflight.sh`) and your backups (`docker/verify-backup.sh`).

Production stack (`docker/docker-compose.prod.yml`):

```
Internet ──443──> Caddy (automatic HTTPS) ──/api/*──> backend (NestJS) ──> MariaDB
                                          └─ /*   ──> frontend (SvelteKit, adapter-node)
```

Only Caddy publishes ports (80/443). MariaDB, the API and the UI live on an internal Docker network.

**Server already running Apache/nginx on 80/443?** Keep it as the HTTPS front door and put Caddy behind it on loopback
(see [Behind an existing Apache](#behind-an-existing-apache-ports-80443-already-in-use)):

```
Internet ──443──> Apache (certbot HTTPS) ──> Caddy 127.0.0.1:8080 (plain HTTP, loopback only) ──> backend / frontend
```

The UI and API share one origin (the API is under `/api`), so there is no CORS to configure.

## Requirements
- A Linux server with Docker + the Compose plugin
- A DNS name pointing at it, with ports **80 and 443** reachable (Let's Encrypt certificate)
- If 80/443 are already taken by another web server, use the Apache/nginx proxy mode below instead of freeing the ports.
  Either way, every public site on the machine should be HTTPS-only.

## First deployment
```bash
git clone <repo> /opt/noagenda && cd /opt/noagenda
cp docker/.env.production.example docker/.env.production
$EDITOR docker/.env.production      # DOMAIN + the three secrets (see comments in the file)
chmod 600 docker/.env.production

docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.production up -d --build
```
The database schema is created automatically on first start (TypeORM migrations run at boot in production).
Check: `https://<DOMAIN>/api/health` returns `{"status":"ok"}`.

### Configure email (recommended, needed for password reset)
Password reset and email verification send real email over SMTP. Set these in `docker/.env.production`
(see the commented block in the example file) and restart the backend:
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM=NOAgenda <no-reply@your-domain>
```
- **With `SMTP_HOST` set**, users must confirm their email address before they can sign in
  (turn off with `REQUIRE_EMAIL_VERIFICATION=false`).
- **Without it**, nothing is delivered (messages are only written to the backend log) and verification is
  **not** enforced. Password reset will not work for users, so set SMTP before opening registration.
- **Enabling SMTP on an existing install:** accounts created earlier are unverified. They cannot sign in until
  they confirm, but the login page has a "resend confirmation link" form. To exempt existing users run
  `UPDATE users SET isEmailConfirmed = 1;` once.
- Your mail provider will usually require SPF/DKIM for your sending domain, or mail lands in spam.

### Create the first administrator
There is no default admin. Register an account in the UI, then promote it:
```bash
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.production \
  exec backend node dist/scripts/promote-admin.js <username>
```
(`--demote <username>` reverses it.) The user must log in again to get a token carrying the new role.

### Behind an existing Apache (ports 80/443 already in use)
If the server already runs Apache (or nginx) on 80/443, keep it as the public HTTPS front door and let it proxy
to Caddy on loopback. Traffic: browser -(https)-> Apache -> Caddy `127.0.0.1:8080` -> backend/frontend.

1. In `docker/.env.production` add (see the example file):
   ```
   BIND_ADDR=127.0.0.1
   HTTP_PORT=8080
   HTTPS_PORT=8443
   SITE_ADDRESS=http://noagenda.app
   TRUST_PROXY=2
   ```
   Keep `DOMAIN=noagenda.app`; the public origin stays `https://noagenda.app`. Start the stack as usual and check
   `curl -H 'Host: noagenda.app' http://127.0.0.1:8080/api/health`.
2. Apache: `a2enmod proxy proxy_http headers ssl rewrite`, then a vhost, e.g.
   `/etc/apache2/sites-available/noagenda.app.conf`:
   ```apache
   <VirtualHost *:80>
       ServerName noagenda.app
       RewriteEngine On
       RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
   </VirtualHost>
   <VirtualHost *:443>
       ServerName noagenda.app
       # certbot --apache -d noagenda.app adds the SSLCertificate lines
       ProxyPreserveHost On
       RequestHeader set X-Forwarded-Proto "https"
       LimitRequestBody 12582912
       ProxyPass / http://127.0.0.1:8080/
       ProxyPassReverse / http://127.0.0.1:8080/
   </VirtualHost>
   ```
   Add `Header always set Strict-Transport-Security "max-age=31536000"` to the 443 vhost only if Caddy's header is not
   reaching clients (it normally is: `docker/preflight.sh remote` checks it).
   Then `a2ensite noagenda.app`, `certbot --apache -d noagenda.app`, `apachectl configtest`, `systemctl reload apache2`.
   Other vhosts are unaffected. Make sure they all serve HTTPS with a valid certificate too (`certbot certificates`).

## Updating
```bash
git pull
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.production up -d --build
```
Pending migrations run on startup. **Take a backup first** (below).

### Changing the data model (developers)
Production never auto-syncs the schema. After changing an entity:
```bash
cd app/backend
npm run migration:generate -- src/migrations/<DescriptiveName>   # needs a DB at DB_* from .env
```
Review and commit the generated file. Local development still auto-syncs (`NODE_ENV` != production).

## Backups and restore
```bash
docker/backup.sh /var/backups/noagenda          # DB dump + uploads, keeps 14 days (KEEP_DAYS)
```
Schedule it, e.g. `15 3 * * * /opt/noagenda/docker/backup.sh /var/backups/noagenda`, and copy the
directory off the server. Restore (**replaces current data**):
```bash
docker/restore.sh /var/backups/noagenda/db-<ts>.sql.gz /var/backups/noagenda/uploads-<ts>.tar.gz
```
Test a restore on a scratch machine before you need it.

## Legal pages (Terms of Service and Privacy Policy)
The app ships `/terms` and `/privacy` pages and a required "I agree" box on registration (the acceptance time
is stored on the user). The texts are **templates written for what this app actually does**: they are not legal
advice, so have them reviewed before you accept real users.
- Set `OPERATOR_NAME` and `CONTACT_EMAIL` in `docker/.env.production` (baked in at build time: re-run
  `up -d --build`). Until both are set the pages show a yellow "template, not yet configured" banner.
- Complete the `[bracketed]` placeholders in `app/frontend/src/routes/{terms,privacy}/+page.svelte` (hosting and email
  providers, retention periods, minimum age, governing law).
- `REQUIRE_TERMS_ACCEPTANCE=true` makes the API refuse registrations that do not send `acceptTerms: true`
  (the UI always sends it). No cookie banner is shown because only strictly necessary storage is used; the
  privacy page says so. Revisit that if you add analytics.

## Accounts: deleting and exporting data
- **Export**: Settings → Data export downloads everything the app stores about the user as JSON (no secrets;
  attachments are listed, not bundled).
- **Delete**: Settings → Delete account (password required). The account is scheduled and **purged after a
  7-day grace period** (`ACCOUNT_DELETION_GRACE_DAYS`); the user can cancel until then. The purge removes the user,
  every project they own (with its tasks, comments, attachments, views, webhooks), their personal tasks, labels,
  teams they own, filters, tokens, sessions, notifications, and their comments/uploads elsewhere. Tasks they
  created inside other people's projects are kept but anonymised; projects shared *with* them are untouched.
  Collaborators lose any project its owner deletes. A background sweep runs hourly
  (`ACCOUNT_PURGE_INTERVAL_SECONDS`). Backups still contain the data until they age out (see backup retention).

## Sign-in, sessions and security behaviour
- **Access token**: a 15-minute JWT, kept in the browser and refreshed silently.
- **Refresh token**: a random value in an `httpOnly; Secure; SameSite=Strict` cookie scoped to `/api/auth`,
  stored server-side only as a hash, **rotated on every use**. Replaying an old one revokes that session (theft detection).
- Every request checks that its session still exists, and the user's role comes from the database. So **logout,
  password change/reset, "revoke session" (Settings > Sessions) and admin demotion take effect immediately**.
- **Lockout**: 5 consecutive wrong passwords lock the account for 15 minutes (`MAX_FAILED_LOGINS`, `LOCKOUT_MINUTES`).
  A password reset clears it. Login errors are identical for unknown user / wrong password / locked account.
- Passwords: bcrypt cost 12 (older hashes are upgraded at next login). Reset and verification links are single-use,
  stored hashed, valid 1 h / 24 h.
- **API tokens** (Settings > API tokens): shown once, stored hashed, usable as `Authorization: Bearer noa_...`.
  They cannot change passwords/emails, manage sessions or create tokens.
- Logging out of all devices: change the password, or revoke sessions individually.

## Configuration reference
| Variable | Where | Notes |
|---|---|---|
| `DOMAIN` | `.env.production` | Public hostname, used by Caddy and CORS |
| `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` | `.env.production` | Required, strong random values |
| `JWT_SECRET` | `.env.production` | Required, **>= 32 chars** (backend refuses to start otherwise) |
| `PUBLIC_ORIGIN` | optional | Only for a non-default origin, e.g. a non-standard port |
| `DB_SYNCHRONIZE` / `DB_MIGRATIONS_RUN` | backend | Defaults: sync off + migrations on in production |
| `TRUST_PROXY` | `.env.production` | Reverse-proxy hops in front of the backend so rate limits see real client IPs. Default 1 (Caddy); use 2 for Apache -> Caddy |
| `BIND_ADDR`, `HTTP_PORT`, `HTTPS_PORT` | optional | Where Caddy publishes. Defaults `0.0.0.0` / 80 / 443; proxy mode: `127.0.0.1` / 8080 / 8443 |
| `SITE_ADDRESS` | optional | Caddy site address. Default `DOMAIN` (Caddy does HTTPS itself); proxy mode: `http://<DOMAIN>` (plain HTTP, no certificate) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | `.env.production` | Outgoing mail (see above) |
| `REQUIRE_EMAIL_VERIFICATION` | `.env.production` | Default: on if `SMTP_HOST` is set |
| `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS` | backend | Defaults `15m` / `30` |
| `MAX_FAILED_LOGINS`, `LOCKOUT_MINUTES` | backend | Defaults `5` / `15` |
| `REGISTRATION_INVITE_CODE` / `REGISTRATION_ENABLED=false` | `.env.production` | Soft launch: require an invite code to sign up, or close sign-ups entirely (existing users unaffected) |
| `OPERATOR_NAME`, `CONTACT_EMAIL`, `REQUIRE_TERMS_ACCEPTANCE` | `.env.production` | Legal pages and consent (see above) |
| `BACKUP_PING_URL` | environment of `backup.sh` | Dead-man's-switch URL pinged after each backup (`/fail` on failure) |

In production the backend also refuses to start without `CORS_ORIGIN` (compose sets it from `DOMAIN`).

## Local development
Unchanged: `docker/docker-compose.yml` runs MariaDB + Adminer (bound to 127.0.0.1 only), then
`npm run start:dev` in `app/backend` and `npm run dev` in `app/frontend` (see `noagenda.sh`).
Copy `app/backend/.env.example` and `app/frontend/.env.example` first.

## Testing
- `npm test` (backend unit tests), `npm run check` (frontend types).
- `app/backend/scripts/authz-smoke.py` — end-to-end authorization regression test (users cannot reach each
  other's data). Needs a server with **email verification off** (no SMTP).
- `app/backend/scripts/auth-lifecycle-smoke.py` — email verification, sessions, refresh rotation and theft
  detection, lockout, password reset/change, API tokens. Needs a mail sink with a Mailpit-compatible API
  (`axllent/mailpit`) and `LOGIN_RATE_LIMIT=100` on the API (see the file header).
- `app/backend/scripts/validation-account-smoke.py` — input validation, error handling, data export, and the full
  account purge (including that other users' data is untouched). Needs `LOGIN_RATE_LIMIT=100`,
  `ACCOUNT_PURGE_INTERVAL_SECONDS=3` and a way to run SQL (see the file header).
- `e2e/run.sh` — real-browser test (Chromium) of the production Docker stack; see `e2e/README.md`. It builds and tears down its own
  isolated stack, so it never touches a real deployment. CI runs it on every push.
- All of these create users/data: run them against a **disposable** database only. CI runs the three scripts on every push.

## Known gaps before opening registration to the public
- **The UI is English only.** (The language setting was removed because it did nothing.) Translating it is a
  separate project.
- Terms and Privacy texts are templates and need review (see above).
- A project's owner deleting their account deletes the project for everyone in it (ownership transfer is not built).
- Webhook secrets are stored in plaintext (they must be readable to sign deliveries). No webhook sender exists yet; when it
  does, add SSRF protection and consider encrypting the secrets.
- `GET /users` lists every user to any signed-in user (needed for member pickers; reveals usernames).
- Dependencies: no critical/high advisories (CI fails if one appears). Three *moderate* ones sit inside TypeORM's own `glob`/`minimatch`; they are not reachable (the patterns are constants), and the only fix is a major TypeORM upgrade.
- No independent security review or penetration test has been done.
- The access token lives in `localStorage` (15-minute lifetime; the refresh credential is an httpOnly cookie). A strict CSP
  is in place and was exercised in a real browser during testing, but a new XSS bug would still expose the short-lived token.
- The browser test (`e2e/run.sh`, Chromium via Playwright, runs in CI) covers the main flows in Chromium only.
