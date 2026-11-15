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

- [ ] **Review and commit the code.** Everything from the security work is uncommitted or recently committed and has
      had one reviewer: the agent that wrote it. Read the diff, or have someone else read it.
- [ ] **CI is green** on GitHub (backend, frontend, authz, auth-lifecycle, browser, docker). The browser job has
      only ever run locally so far, so watch its first GitHub run.
- [ ] Decide **who can sign up**. Default is anyone. For a soft launch set `REGISTRATION_INVITE_CODE`
      (share the code with the people you invite) or `REGISTRATION_ENABLED=false`.

## 1. Server (you)

- [ ] A Linux server with Docker + the Compose plugin. 2 GB RAM is comfortable for a small group; plan disk for
      uploads + backups.
- [ ] **DNS**: an `A` (and `AAAA` if you have IPv6) record for your domain pointing at the server.
- [ ] **Firewall**: allow only SSH (22), 80, 443. (The compose file publishes only Caddy's 80/443; the database and
      app are on an internal network. Note Docker bypasses `ufw` for published ports, which is why that matters.)
- [ ] **SSH**: keys only, no root login, no password auth.
- [ ] **Time sync** (`timedatectl status` shows "synchronized: yes"): certificates and tokens depend on the clock.
- [ ] **Automatic security updates** (`unattended-upgrades` on Debian/Ubuntu).

## 2. Secrets and configuration (you)

```bash
git clone <repo> /opt/noagenda && cd /opt/noagenda
cp docker/.env.production.example docker/.env.production && chmod 600 docker/.env.production
openssl rand -base64 24    # MYSQL_ROOT_PASSWORD
openssl rand -base64 24    # MYSQL_PASSWORD
openssl rand -hex 48       # JWT_SECRET
```

- [ ] Fill in `DOMAIN`, the three secrets, SMTP (section 3), `OPERATOR_NAME`, `CONTACT_EMAIL`, `REQUIRE_TERMS_ACCEPTANCE=true`.
- [ ] **Save the file in a password manager.** Gotchas:
  - The two database passwords are only applied the *first* time the database volume is created. Editing them later
    does **not** change the database password.
  - Changing `JWT_SECRET` later signs every user out (harmless, but know it).
  - `OPERATOR_NAME`/`CONTACT_EMAIL` are baked into the frontend: re-run `up -d --build` after changing them.
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
- [ ] Re-run `docker compose ... up -d --build` so the operator details appear.

## 5. Deploy

```bash
docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.production up -d --build
```

- [ ] **Testing the certificate setup?** Let's Encrypt limits repeated requests for the same domain. While experimenting,
      temporarily add `acme_ca https://acme-staging-v02.api.letsencrypt.org/directory` inside the `{ }` global options
      block at the top of `docker/Caddyfile` (add the block if absent), then remove it for the real certificate.
- [ ] Register your own account, then make it the admin:
      `docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.production exec backend node dist/scripts/promote-admin.js <username>`
- [ ] **From your laptop:** `docker/preflight.sh remote https://your.domain` shows **0 failures**
      (a warning about `[bracketed]` placeholders means section 4 is not finished).

## 6. Backups (you)

An untested backup is a hope, not a backup.

- [ ] **Schedule it** (`crontab -e`): `15 3 * * * /opt/noagenda/docker/backup.sh /var/backups/noagenda`
- [ ] **Copy it off the server** (a backup on the same disk dies with the disk). For example `rclone sync /var/backups/noagenda remote:noagenda`
      after the backup, or a provider snapshot. Protect the copy: it contains everyone's data.
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
      if the certificate has under 14 days left (Caddy renews automatically, this catches it when it silently cannot).
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
| Update the app | `git pull`, take a backup, `docker compose -f docker/docker-compose.prod.yml --env-file docker/.env.production up -d --build` (migrations run on start) |
| Roll back a bad release | Restore the pre-update backup with `docker/restore.sh`, then `git checkout` the previous version and rebuild. Do not use `migration:revert` on live data |
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
