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

The UI and API share one origin (the API is under `/api`), so there is no CORS to set up by hand: compose passes `CORS_ORIGIN` to the backend from `DOMAIN`.

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

docker/deploy.sh                    # pulls the prebuilt images from GHCR (see "Updating" below)
```
No CI images yet, or a big enough server? Build locally instead:
`docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.production up -d --build`.

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
   SITE_ADDRESS=http://example.net
   TRUST_PROXY=2
   ```
   Keep `DOMAIN=example.net`; the public origin stays `https://example.net`. Start the stack as usual and check
   `curl -H 'Host: example.net' http://127.0.0.1:8080/api/health`.
   **The backend must see the visitor's real address** (rate limits and login lockouts are per address). The Caddyfile
   trusts `X-Forwarded-For` from private network ranges only (`trusted_proxies static private_ranges`), so Apache's header
   passes through while a visitor on the public internet cannot forge one. Verify once after setup: attempt a login with a wrong
   password from outside, then `docker compose -f docker/docker-compose.prod.yml logs backend | grep "Failed login"` must
   show your own public IP, not `172.x.x.x`/`127.0.0.1`. (If it shows the proxy's address, every visitor shares one rate
   limit: re-check `TRUST_PROXY=2`.)
2. Apache: `a2enmod proxy proxy_http headers ssl rewrite`, then a vhost, e.g.
   `/etc/apache2/sites-available/example.net.conf`:
   ```apache
   <VirtualHost *:80>
       ServerName example.net
       RewriteEngine On
       RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
   </VirtualHost>
   <VirtualHost *:443>
       ServerName example.net
       # certbot --apache -d example.net adds the SSLCertificate lines
       ProxyPreserveHost On
       RequestHeader set X-Forwarded-Proto "https"
       LimitRequestBody 12582912
       ProxyPass / http://127.0.0.1:8080/
       ProxyPassReverse / http://127.0.0.1:8080/
   </VirtualHost>
   ```
   Add `Header always set Strict-Transport-Security "max-age=31536000"` to the 443 vhost only if Caddy's header is not
   reaching clients (it normally is: `docker/preflight.sh remote` checks it).
   Then `a2ensite example.net`, `certbot --apache -d example.net`, `apachectl configtest`, `systemctl reload apache2`.
   Other vhosts are unaffected. Make sure they all serve HTTPS with a valid certificate too (`certbot certificates`).

## Several instances on one host (e.g. production plus a public demo)

Run each instance as its own compose project with its own env file, so volumes, containers and secrets never mix.
Example with two instances (replace `example.net` with your domain):

| Instance | Project (`COMPOSE_PROJECT`) | Env file | `HTTP_PORT` | Host proxy |
| --- | --- | --- | --- | --- |
| `app.example.net` | `noagenda-app` | `app.env` | `8081` | vhost -> `127.0.0.1:8081` |
| `demo.example.net` | `noagenda-demo` | `demo.env` | `8082` | vhost -> `127.0.0.1:8082` |

Each env file uses proxy mode (`SITE_ADDRESS=http://<hostname>`, `BIND_ADDR=127.0.0.1`, `TRUST_PROXY=2`) and has its own
`DOMAIN`, `JWT_SECRET` and `MYSQL_*` values. Give every instance its own host-proxy vhost and certificate (see the Apache
example above) and deploy each one with
`COMPOSE_PROJECT=noagenda-app ENV_FILE=/opt/noagenda/app.env docker/deploy.sh`. The same `COMPOSE_PROJECT` and `ENV_FILE` variables work
for `docker/backup.sh`. Any other site on the host (for example static pages on the bare domain) is just another vhost.

### Public demo instance

For a demo that visitors can try without signing up, add to its env file:

- `DEMO_MODE=true`: the login page lists the example users (with password and role), and the password, email and
  account-deletion endpoints are disabled so visitors cannot lock each other out.
- `REGISTRATION_ENABLED=false` and an empty `SMTP_HOST`.

`docker/demo-reset.sh` re-creates the example data (`seed --reset`) and clears uploads. It refuses to run unless
`DEMO_MODE=true` is set in the env file. Run it once after the first deploy to create the users, then schedule it, e.g. nightly:
`0 0 * * * ENV_FILE=/opt/noagenda/demo.env /opt/noagenda/docker/demo-reset.sh`.
Never set `DEMO_MODE=true` on an instance with real data.

## Server setup checklist (small VPS)
`docker/provision.sh` does most of this on a Debian or Ubuntu server (run `sudo docker/provision.sh --dry-run` first to see
what it would do): KVM and RAM check, packages, old kernels, time sync, swap, Docker with log rotation, the `noagenda` user and
`/opt/noagenda`, automatic updates. The two risky steps are opt-in: `--firewall` (ufw) and `--ssh-harden` (key-only logins; keep your
session open and test a second login). It never touches Apache/nginx. The list below is what it covers, plus what you still do by hand.
Done once, before the first deployment:
- **Virtualisation must be KVM**: `systemd-detect-virt` prints `kvm` (Docker misbehaves on OpenVZ/LXC).
- **Memory**: 4 GB is comfortable. On 1-2 GB add a 2 GB swap file, never build on the server, and lower the limits in
  `docker/.env.production`: `MARIADB_BUFFER_POOL=128M`, `BACKEND_MEM_LIMIT=384m`, `FRONTEND_MEM_LIMIT=256m`, `CADDY_MEM_LIMIT=128m`.
  Then watch `docker stats --no-stream` and `free -h` for a few days. A 1 GB server that already runs other sites (e.g. Apache + PHP apps)
  may not have room for this stack at all: check `free -h` for the *available* memory first.
- **Access**: SSH keys only (`PasswordAuthentication no`), a non-root user in the `docker` group, `ufw allow 22,80,443/tcp` then `ufw enable`,
  and `unattended-upgrades`.
- **Mail**: many VPS providers block outbound port 25. Use a transactional provider (Brevo, Mailgun, Postmark...) on 587 for `SMTP_*`.
- **Disk**: container logs are capped by the compose file; `/boot` on Debian fills with old kernels, so run `apt autoremove --purge` now and then.
- Adminer (dev only) is not part of the production stack; keep it that way.

## Updating
### Prebuilt images (recommended)
CI (`.github/workflows/release.yml`) builds the backend and frontend images after every green run on `main` and pushes them to
GHCR tagged with the commit SHA and `latest`. The server only pulls them:
```bash
git pull
docker/deploy.sh                  # latest; or a tag: docker/deploy.sh 1a2b3c4d5e6f
```
`deploy.sh` takes a backup (if the stack is running), pulls the images, restarts, waits for `/health`, and if the new version is
not healthy it starts the previous tag again. The tag is kept as `IMAGE_TAG` in `docker/.env.production`. Rolling back = run it with an
older tag; migrations only go forward, so after a schema change restore the pre-deploy backup as well.

One-time setup: make the GHCR packages public, or `docker login ghcr.io` on the server with a token that has `read:packages`.
If the Release workflow fails with `denied` on push, the package already exists without this repository linked: open it in GitHub
(Packages > Package settings > *Manage Actions access*) and add the repository with the **Write** role, or delete the stale package.
The workflow labels new images with the repository (`org.opencontainers.image.source`), which links a fresh package automatically.
`OPERATOR_NAME`/`CONTACT_EMAIL` are baked into the frontend image, so for CI set them as repository *variables* (same names).
To deploy automatically from CI, set the variable `DEPLOY_ENABLED=true` and the secrets `DEPLOY_HOST`, `DEPLOY_USER`,
`DEPLOY_SSH_KEY` and `DEPLOY_KNOWN_HOSTS` (`ssh-keyscan <host>`); the `deploy` job then runs `git pull` and `docker/deploy.sh <sha>` over SSH.

### Building on the server
```bash
git pull
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.production up -d --build
```
Fine on a machine with 4+ GB and spare CPU. Pending migrations run on startup either way. **Take a backup first** (below).

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
directory off the server. To do that automatically, install [rclone](https://rclone.org), configure a remote (S3, Backblaze B2,
a Hetzner Storage Box...) and run the script with `BACKUP_RCLONE_REMOTE=<remote>:<bucket>/noagenda`: each backup is then
copied there (a failure counts as a failed backup and pings `BACKUP_PING_URL/fail`). Set the retention on the remote side
(e.g. a bucket lifecycle rule); `KEEP_DAYS` only prunes local files. Restore (**replaces current data**):
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
- **Lockout** (two layers, so it cannot be used to lock the real owner out): 5 wrong passwords for one account **from one
  address** lock that address out of that account for 15 minutes (`MAX_FAILED_LOGINS`, `LOCKOUT_MINUTES`); an attacker only
  locks themselves. 20 wrong passwords from **all addresses together** (`ACCOUNT_LOCK_THRESHOLD`) lock the account for
  everyone except addresses the owner is currently signed in from. A password reset clears both. Login errors are identical for
  unknown user / wrong password / locked. The per-address counter is in memory (reset when the API restarts).
- Passwords: native bcrypt, cost 12 (older hashes, including ones made by the previous JavaScript implementation, keep working and
  are upgraded at next login). bcrypt only reads the first 72 bytes, so longer passwords are rejected instead of silently cut. Reset
  and verification links are single-use, stored hashed, valid 1 h / 24 h.
- **Every route requires a sign-in unless it is explicitly marked public** (default-deny). The public ones are exactly: health/info,
  `auth/*` (login, refresh, logout, reset and verification flows, config), `POST /users` (registration) and `GET /quotes/random`.
  A unit test fails if any other route becomes public.
- **API tokens** (Settings > API tokens): shown once, stored hashed, usable as `Authorization: Bearer noa_...`. Each has a
  **scope**: *read only* (GET requests only; the default) or *read & write*. Neither can use admin endpoints, change
  passwords/emails, manage sessions or create tokens. Tokens created before scopes existed became read & write.
- **User lookup**: there is no "list all users" endpoint. Adding members uses a search (at least 3 characters, 10 results,
  username and display name only, 30 requests per minute). Registration says "username or email already in use" without
  saying which.
- **Uploads**: images (avatars, and image/PDF attachments) must really be what they claim (checked by file signature, not the
  browser's Content-Type); each user has a storage allowance (`USER_STORAGE_QUOTA_MB`, default 200 MB). Attachment uploads
  take the task id in the query string (`POST /attachments/upload?taskId=7`): access and size are checked before multer writes
  anything to disk, so a refused upload never touches `uploads/`.
- **Webhooks**: a target URL must be http(s), contain no credentials and must not resolve to an internal address (loopback,
  private ranges, link-local/cloud metadata). The sender (`webhook-dispatcher.service.ts`) checks again at delivery time and
  connects through a lookup that refuses internal addresses using the same DNS answer it connects to, so DNS rebinding cannot
  slip past (`publicLookup` in `common/url-guard.ts`). Redirects are never followed; 5 s timeout, three attempts.
  `WEBHOOK_ALLOW_PRIVATE=true` lifts the restriction on purpose.
- **Assigning and sharing**: adding a task assignee or project member requires an existing, unlocked account (404 otherwise);
  a task assignee must also already have access to the task, so nobody can be notified about things they cannot see.
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
| `MAX_FAILED_LOGINS`, `LOCKOUT_MINUTES` | backend | Failures per address+account before that address is locked, and the lock length. Defaults `5` / `15` |
| `ACCOUNT_LOCK_THRESHOLD` | backend | Failures across all addresses before the account itself is locked (default `20`) |
| `ACCOUNT_DELETION_GRACE_DAYS` | backend | Days between a deletion request and the account being purged (default `7`) |
| `COMPOSE_PROJECT` | environment of `deploy.sh`, `backup.sh` | Compose project name when several instances share a host (see above) |
| `DEMO_MODE` | demo instance only | `true` lists the example users on the login page and disables password, email and account-deletion changes. Never on an instance with real data |
| `ALLOW_DEMO_SEED` | environment of `demo-reset.sh` | `true` lets `seed.js` run with `NODE_ENV=production` (set by `docker/demo-reset.sh`) |
| `USER_STORAGE_QUOTA_MB` | backend | Attachment storage per user (default `200`) |
| `WEBHOOK_ALLOW_PRIVATE` | backend | `true` allows webhook URLs that point at internal addresses (default off) |
| `BACKEND_MEM_LIMIT`, `FRONTEND_MEM_LIMIT`, `CADDY_MEM_LIMIT` | `.env.production` | Container memory caps (defaults `768m` / `512m` / `256m`) |
| `IMAGE_REPO`, `IMAGE_TAG` | `.env.production` | Image name prefix (default `ghcr.io/sinyaweo/noagenda`) and tag (default `latest`; `docker/deploy.sh` manages the tag) |
| `MARIADB_BUFFER_POOL` | `.env.production` | InnoDB buffer pool size (default `256M`; `128M` on a 1 GB server) |
| `BACKUP_RCLONE_REMOTE` | environment of `backup.sh` | rclone destination for an off-server copy of each backup |
| `REGISTRATION_INVITE_CODE` / `REGISTRATION_ENABLED=false` | `.env.production` | Soft launch: require an invite code to sign up, or close sign-ups entirely (existing users unaffected) |
| `OPERATOR_NAME`, `CONTACT_EMAIL`, `REQUIRE_TERMS_ACCEPTANCE` | `.env.production` | Legal pages and consent (see above) |
| `BACKUP_PING_URL` | environment of `backup.sh` | Dead-man's-switch URL pinged after each backup (`/fail` on failure) |

In production the backend also refuses to start without `CORS_ORIGIN` (compose sets it from `DOMAIN`).

## Local development
`docker/docker-compose.yml` runs MariaDB, plus Adminer when started with `--profile tools` (`noagenda.sh start` does; both are bound
to 127.0.0.1 only), then
`npm run start:dev` in `app/backend` and `npm run dev` in `app/frontend` (see `noagenda.sh`).
Copy `app/backend/.env.example` and `app/frontend/.env.example` first.

## Testing
- Backend: `npm test` (unit tests), `npm run lint`, `npm run format:check`. Frontend: `npm test` (Vitest: i18n catalogs, dates,
  filters), `npm run check` (types), `npm run lint`, `npm run format:check`.
- `app/backend/scripts/authz-smoke.py` — end-to-end authorization regression test (users cannot reach each
  other's data). Needs a server with **email verification off** (no SMTP).
- `app/backend/scripts/auth-lifecycle-smoke.py` — email verification, sessions, refresh rotation and theft
  detection, lockout, password reset/change, API tokens. Needs a mail sink with a Mailpit-compatible API
  (`axllent/mailpit`) and `LOGIN_RATE_LIMIT=100` on the API (see the file header).
- `app/backend/scripts/hardening-smoke.py` — default-deny routes, API-token scopes, search-only user lookup, upload checks and quota,
  webhook SSRF guard, per-address lockout, join-table uniqueness. Needs the API started with `TRUST_PROXY=1`,
  `USER_STORAGE_QUOTA_MB=1` and `LOGIN_RATE_LIMIT=100` (see the file header).
- `app/backend/scripts/validation-account-smoke.py` — input validation, error handling, data export, and the full
  account purge (including that other users' data is untouched). Needs `LOGIN_RATE_LIMIT=100`,
  `ACCOUNT_PURGE_INTERVAL_SECONDS=3` and a way to run SQL (see the file header).
- `e2e/run.sh` — real-browser test (Chromium) of the production Docker stack; see `e2e/README.md`. It builds and tears down its own
  isolated stack, so it never touches a real deployment. CI runs it on every push.
- All of these create users/data: run them against a **disposable** database only. CI runs the three scripts on every push.

## Known gaps before opening registration to the public
- The UI is available in **English and Czech** (see `app/frontend/src/lib/i18n/README.md`). Terms and Privacy texts are templates
  in English that the operator must replace with their own reviewed text. Server validation messages are translated when they
  are one of the common ones; anything else is shown in English.
- A project's owner deleting their account deletes the project for everyone in it, and teams they own are deleted too (ownership transfer is not built). Deletion is scheduled with a grace period (`ACCOUNT_DELETION_GRACE_DAYS`, default 7), so there is time to cancel.
- Webhook secrets are stored in plaintext (they must be readable to sign deliveries); consider encrypting them at rest.
- The per-address login counter and the general request rate limit (300 requests/minute per client) live in the API process's memory: a restart clears them and several API replicas of one instance would not share them. This is fine for the single-container stack here; it matters only if you scale the backend out.
- Without `SMTP_HOST` no mail is sent and email verification is off, so addresses are unverified and password reset by email does not work. Configure SMTP (PRELAUNCH.md section 3) before opening registration.
- Dependencies: `npm audit --omit=dev` reports nothing for the backend and the frontend, and CI fails on a high/critical advisory in production dependencies. Moderate advisories remain in development/test tooling only (`glob`/`minimatch` pulled in by Jest); they are not part of the production images.
- No independent security review or penetration test has been done.
- The access token lives in `localStorage` (15-minute lifetime; the refresh credential is an httpOnly cookie). A strict CSP
  is in place and was exercised in a real browser during testing, but a new XSS bug would still expose the short-lived token.
- The browser test (`e2e/run.sh`, Chromium via Playwright, runs in CI) covers the main flows in Chromium only, in English.
