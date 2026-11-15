# Deploying NOAgenda

Production stack (`docker/docker-compose.prod.yml`):

```
Internet ──443──> Caddy (automatic HTTPS) ──/api/*──> backend (NestJS) ──> MariaDB
                                          └─ /*   ──> frontend (SvelteKit, adapter-node)
```

Only Caddy publishes ports (80/443). MariaDB, the API and the UI live on an internal Docker network.
The UI and API share one origin (the API is under `/api`), so there is no CORS to configure.

## Requirements
- A Linux server with Docker + the Compose plugin
- A DNS name pointing at it, with ports **80 and 443** reachable (Let's Encrypt certificate)

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
| `TRUST_PROXY` | backend | Reverse-proxy hops (compose sets 1) so rate limits see real client IPs |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | `.env.production` | Outgoing mail (see above) |
| `REQUIRE_EMAIL_VERIFICATION` | `.env.production` | Default: on if `SMTP_HOST` is set |
| `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS` | backend | Defaults `15m` / `30` |
| `MAX_FAILED_LOGINS`, `LOCKOUT_MINUTES` | backend | Defaults `5` / `15` |

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
- Both create users/data: run them against a **disposable** database only. CI runs both on every push.

## Known gaps before opening registration to the public
- No Terms / Privacy pages or consent notice yet.
- Most request bodies outside auth and user settings are not DTO-validated (a malformed body can return 500 instead of 400).
- "Delete my account" only flags the account (nothing deletes it after the grace period); "export my data" is a stub.
- Webhook secrets are stored in plaintext (they must be readable to sign deliveries). No webhook sender exists yet; when it
  does, add SSRF protection and consider encrypting the secrets.
- `GET /users` lists every user to any signed-in user (needed for member pickers; reveals usernames).
- One known high-severity dependency advisory (`multer` DoS) that needs a major NestJS upgrade.
- The access token lives in `localStorage` (15-minute lifetime; the refresh credential is an httpOnly cookie).
  A strict CSP is in place to limit XSS, but it has not been verified in a real browser.
