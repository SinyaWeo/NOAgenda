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

## Configuration reference
| Variable | Where | Notes |
|---|---|---|
| `DOMAIN` | `.env.production` | Public hostname, used by Caddy and CORS |
| `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` | `.env.production` | Required, strong random values |
| `JWT_SECRET` | `.env.production` | Required, **>= 32 chars** (backend refuses to start otherwise) |
| `PUBLIC_ORIGIN` | optional | Only for a non-default origin, e.g. a non-standard port |
| `DB_SYNCHRONIZE` / `DB_MIGRATIONS_RUN` | backend | Defaults: sync off + migrations on in production |
| `TRUST_PROXY` | backend | Reverse-proxy hops (compose sets 1) so rate limits see real client IPs |

In production the backend also refuses to start without `CORS_ORIGIN` (compose sets it from `DOMAIN`).

## Local development
Unchanged: `docker/docker-compose.yml` runs MariaDB + Adminer (bound to 127.0.0.1 only), then
`npm run start:dev` in `app/backend` and `npm run dev` in `app/frontend` (see `noagenda.sh`).
Copy `app/backend/.env.example` and `app/frontend/.env.example` first.

## Testing
- `npm test` (backend unit tests), `npm run check` (frontend types).
- `app/backend/scripts/authz-smoke.py` — end-to-end authorization regression test; run it against a
  **disposable** database only (see the file header). CI runs it on every push.

## Known gaps before opening registration to the public
- **Password reset cannot send email yet** (no mail transport); the token is created but not delivered.
- No email verification; sessions are 1-day JWTs in `localStorage` with no server-side revocation.
- No Terms/Privacy pages; most request bodies other than auth/user settings are not DTO-validated yet.
- One known high-severity dependency advisory (`multer` DoS) that needs a major NestJS upgrade.
