# Pre-launch checklist

Work through this top to bottom. Items marked **you** need something only you can provide (a server, a domain,
a mail account, a lawyer). Most steps end with a command that proves they worked.

Two scripts do the checking for you:

```bash
docker/preflight.sh config docker/.env.production        # is the configuration file sane? (run on the server)
docker/preflight.sh remote https://your.domain           # is the LIVE site correctly set up? (run from your LAPTOP)
```

`remote` must run from outside the server, otherwise its "database port is closed" checks prove nothing.

---

## 0. Before you touch a server

- [ ] **Review the code.** The security work has had one reviewer: the agent that wrote it. Read the diff, or have
      someone else read it.
- [ ] **CI is green** on GitHub (backend, frontend, authz, auth-lifecycle, browser, docker, migrations, hardening), and the
      **Release** workflow has published the images to GHCR (see "Prebuilt images" in [DEPLOYMENT.md](DEPLOYMENT.md)).
- [ ] Decide **who can sign up**. Default is anyone. For a soft launch set `REGISTRATION_INVITE_CODE`
      (share the code with the people you invite) or `REGISTRATION_ENABLED=false`.

## 1. Server (you)

- [ ] A Linux server with Docker + the Compose plugin. 4 GB RAM is comfortable for a small group, 2 GB works; 1 GB is
      too tight (it needs swap and `MARIADB_BUFFER_POOL=128M`). Plan disk for uploads + backups.
- [ ] `systemd-detect-virt` prints `kvm` (Docker misbehaves on OpenVZ/LXC), and `free -h` shows the RAM you paid for.
- [ ] **Outbound mail**: many VPS providers block port 25, so use a transactional SMTP provider on 587 (section 3).
- [ ] **Provisioning**: `sudo docker/provision.sh --dry-run`, then without `--dry-run` (see "Server setup checklist" in
      [DEPLOYMENT.md](DEPLOYMENT.md)). It installs Docker, adds swap, creates the `noagenda` user and enables automatic updates;
      `--firewall` and `--ssh-harden` are opt-in. Several items below are then already done: verify them.
- [ ] **DNS**: an `A` (and `AAAA` if you have IPv6) record for your domain pointing at the server.
- [ ] **Ports 80/443 already used** by Apache/nginx (e.g. other sites on the same VPS)? Do **not** replace it (PHP apps
      such as Leantime would break). Use the proxy mode: web server terminates HTTPS, the shared Caddy listens on `127.0.0.1:8080`.
      Follow "Behind an existing Apache" in [DEPLOYMENT.md](DEPLOYMENT.md) and tick the **Shared server** items below.
- [ ] **Firewall**: allow only SSH (22), 80, 443. (The compose file publishes only Caddy's 80/443 (in proxy mode only `127.0.0.1:8080`); the database and
      app are on an internal network. Note Docker bypasses `ufw` for published ports, which is why that matters.)
- [ ] **SSH**: keys only, no root login, no password auth.
- [ ] **Time sync** (`timedatectl status` shows "synchronized: yes"): certificates and tokens depend on the clock.
- [ ] **Automatic security updates** (`unattended-upgrades` on Debian/Ubuntu).

### Shared server (Apache/nginx already on 80/443)

- [ ] **Inventory first**: `apachectl -S` and `certbot certificates`: list every vhost and its certificate.
- [ ] **Every site is HTTPS-only**: each vhost has a valid certificate and its `:80` side 301-redirects to https;
      `certbot renew --dry-run` succeeds. Fix the existing sites too, not just the new one.
- [ ] Apache modules `proxy proxy_http headers ssl rewrite` enabled; a new vhost for your domain forwarding to
      `http://127.0.0.1:8080/` with `X-Forwarded-Proto https`. The other vhosts are untouched.
- [ ] `apachectl configtest` says `Syntax OK` **before** every `systemctl reload apache2`.
- [ ] Running a second instance (e.g. a public demo) on the same host? Give it its own compose project, env file, secrets
      and ports, and never set `DEMO_MODE=true` on the instance with real data (see DEPLOYMENT.md).
- [ ] RAM budget covers the existing apps plus MariaDB + two Node containers (per instance); the app's MariaDB lives in Docker and does
      not clash with a database already on the host (it publishes no port).

## 2. Secrets and configuration (you)

```bash
git clone <repo> /opt/noagenda && cd /opt/noagenda
cp docker/.env.production.example docker/.env.production && chmod 600 docker/.env.production
openssl rand -base64 24    # MYSQL_ROOT_PASSWORD
openssl rand -base64 24    # MYSQL_PASSWORD
openssl rand -hex 48       # JWT_SECRET
```

- [ ] On a shared server set `BIND_ADDR=127.0.0.1`, `HTTP_PORT=8080`, `HTTPS_PORT=8443` in `docker/.env.edge`, use
      `http://<your domain>` in `docker/sites/<instance>.caddy`, and set `TRUST_PROXY=2` in the instance env file (see the example files). `PUBLIC_ORIGIN` stays `https://<domain>`.
- [ ] Fill in `DOMAIN`, the three secrets, SMTP (section 3), `OPERATOR_NAME`, `CONTACT_EMAIL`, `REQUIRE_TERMS_ACCEPTANCE=true`.
- [ ] **Save the file in a password manager.** Gotchas:
  - The two database passwords are only applied the *first* time the database volume is created. Editing them later
    does **not** change the database password.
  - Changing `JWT_SECRET` later signs every user out (harmless, but know it).
  - `OPERATOR_NAME`/`CONTACT_EMAIL` are baked into the frontend image. With CI images, set them as GitHub repository
    *variables* (same names), re-run the Release workflow, then `docker/deploy.sh`. When building on the server,
    re-run `up -d --build` instead.
- [ ] `docker/preflight.sh config docker/.env.production` shows **0 failures**.

## 3. Email (you)

Password reset and email verification depend on it. Without `SMTP_HOST` neither works for real users.

- [ ] Pick a provider (Postmark, Mailgun, SES, Brevo, your own server...) and create SMTP credentials.
- [ ] **Authenticate your sending domain**: SPF, DKIM and a DMARC record (your provider shows the exact DNS records).
      Without them mail lands in spam or is rejected.
- [ ] Put `SMTP_HOST/PORT/USER/PASS` and `MAIL_FROM` in `docker/.env.production`.
- [ ] **After deploying, do a real round trip** with an address you control (preferably Gmail/Outlook too):
      register, receive the confirmation email, click it, sign in, then "Forgot password" and reset.
      Check it did not go to spam. `docker compose ... logs backend | grep -i mail` shows delivery errors.

## 4. Legal (you, with a lawyer)

- [ ] Read `/terms` and `/privacy` as a visitor would. They are templates written for what this app really does;
      they are **not legal advice**.
- [ ] Replace every `[bracketed]` placeholder in `app/frontend/src/routes/{terms,privacy}/+page.svelte`:
      hosting provider and location, email provider, retention periods, minimum age, governing law.
- [ ] Make the stated retention match reality: backups are kept `KEEP_DAYS` (default 14); security logs are kept as long
      as Docker's log rotation keeps them.
- [ ] If you have EU/UK users: sign a data-processing agreement with your hosting and email providers, and keep a short
      record of what you process (the privacy page lists it).
- [ ] Rebuild and redeploy so the operator details appear (set the `OPERATOR_NAME`/`CONTACT_EMAIL` repository variables,
      re-run the Release workflow, then `docker/deploy.sh`).

## 5. Deploy

Recommended: pull the images CI built, so the server never compiles anything. One-time: make the GHCR packages public or
`docker login ghcr.io` on the server (token with `read:packages`); if the Release workflow gets `denied`, give the repository
Write access under the package's *Manage Actions access*.

```bash
docker/deploy.sh                 # latest; or a tag: docker/deploy.sh <12-char commit sha>
```

(Without CI images, build on the server instead: `docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.production up -d --build`.)

- [ ] **Shared server:** before touching Apache, check `curl -H 'Host: your.domain' http://127.0.0.1:8080/api/health`
      returns `{"status":"ok"}`; then add the vhost, `certbot --apache -d your.domain`, `apachectl configtest`, reload.
      Confirm the other sites still load.
- [ ] **Testing the certificate setup?** (Caddy mode only; with Apache, certbot has its own `--test-cert`.) Let's Encrypt limits repeated requests for the same domain. While experimenting,
      temporarily add `acme_ca https://acme-staging-v02.api.letsencrypt.org/directory` inside the `{ }` global options
      block at the top of `docker/Caddyfile` (add the block if absent), then remove it for the real certificate.
- [ ] Register your own account, then make it the admin:
      `docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.production exec backend node dist/scripts/promote-admin.js <username>`
- [ ] **From your laptop:** `docker/preflight.sh remote https://your.domain` shows **0 failures**
      (a warning about `[bracketed]` placeholders means section 4 is not finished).

## 6. Backups (you)

An untested backup is a hope, not a backup.

- [ ] **Schedule it** (`crontab -e`): `15 3 * * * /opt/noagenda/docker/backup.sh /var/backups/noagenda`
- [ ] **Copy it off the server** (a backup on the same disk dies with the disk). Install rclone, configure a remote, and add
      `BACKUP_RCLONE_REMOTE=<remote>:<bucket>/noagenda` to the cron line: `backup.sh` then copies each backup there itself
      (a failed copy counts as a failed backup). Set retention on the remote (bucket lifecycle rule). A provider snapshot also
      works. Protect the copy: it contains everyone's data.
- [ ] **Get alerted when backups stop**: create a check at healthchecks.io (or Uptime Kuma) and set
      `BACKUP_PING_URL=https://hc-ping.com/<uuid>` in the cron line. The script pings on success and `/fail` on failure.
- [ ] **Prove a backup restores**, without touching production:
      `docker/verify-backup.sh /var/backups/noagenda/db-<latest>.sql.gz` must end with `OK: the backup restores cleanly.`
      Schedule it weekly too: `30 4 * * 0 /opt/noagenda/docker/verify-backup.sh`.
- [ ] Once, rehearse a **full restore** on a spare machine with `docker/restore.sh` (DB + uploads) and sign in.

## 7. Monitoring (you)

- [ ] **Uptime monitor** on `https://your.domain/api/health` (UptimeRobot, Better Stack, Uptime Kuma...). It returns 200 only
      when the database answers.
- [ ] **Disk space alert** (your host's tooling, or a cron'd `df`). Container logs are capped (3 x 10 MB per service);
      uploads and backups are what grow.
- [ ] **Certificate expiry**: run `docker/preflight.sh remote https://your.domain` weekly from somewhere else; it fails
      if the certificate has under 14 days left (Caddy or certbot renews automatically, this catches it when it silently cannot). On a shared server check
      all your hostnames, not only the new one.
- [ ] Look at the logs now and then: `docker compose ... logs backend | grep "Failed login"` shows brute-force attempts.
- [ ] Optional, not built in: an error tracker such as Sentry.

## 8. Launch

- [ ] Start **invite-only** (`REGISTRATION_INVITE_CODE`) with a handful of real people for a week.
- [ ] Watch: sign-ups, "email not arriving" reports, errors in the logs, backup pings arriving.
- [ ] Open registration only after that week is boring (remove the invite code, redeploy,
      `docker/preflight.sh remote` again).

---

## Everyday operations

| Task | How |
|---|---|
| Update the app | `git pull`, then `docker/deploy.sh` (takes a backup, pulls the CI images, restarts, checks `/health`; migrations run on start; with several instances, `docker/deploy-all.sh` does each one in turn). Building on the server instead: back up, then `docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.production up -d --build` |
| Roll back a bad release | `docker/deploy.sh <previous-tag>` (it also rolls back by itself if the new version is not healthy). If the release changed the schema, restore the pre-deploy backup with `docker/restore.sh` too. Do not use `migration:revert` on live data |
| See logs | `docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.production logs -f backend` |
| Someone is locked out | The lock lasts 15 minutes, or they can reset their password (that clears it) |
| Make/unmake an admin | `... exec backend node dist/scripts/promote-admin.js <username>` (`--demote <username>`) |
| A user asks for their data / deletion | They can do both themselves in Settings (export, delete account with a 7-day grace period) |
| Stop sign-ups quickly | Set `REGISTRATION_ENABLED=false`, redeploy the backend: `up -d backend` |
| Rotate the JWT secret | Change `JWT_SECRET`, `up -d backend`. Everyone is signed out once |
| Change a database password | Changing the env file is not enough: `ALTER USER` inside MariaDB, then update the env file |

## What is verified for you, and what is not

Verified by automated tests (CI and local): authorization between users, sessions and token handling, input validation,
account export/deletion, the registration controls, security headers and CSP in a real browser, HTTPS routing, backup and
restore.

**Not verified, and only you can check:** your real SMTP provider and spam placement, the real Let's Encrypt certificate,
your DNS and firewall, behaviour under real load, the legal texts, and that your offsite backup copy really exists.
There has been no independent security review or penetration test; for a service holding other people's data, consider
getting one before opening registration to the public.
