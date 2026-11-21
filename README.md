# NOAgenda

A self-hosted task and project management app: projects, tasks, kanban boards, teams, reminders and more.

## Features

- **Projects and tasks** in a single hierarchy (projects, tasks and subtasks share one `node` model), with statuses,
  priorities, due dates, percent done, recurring tasks and task relations
- **Views**: project views with kanban buckets, an upcoming-tasks page and a mind map
- **Collaboration**: teams with managers and members, project sharing with permissions, comments, reactions, assignees, notifications
- **Organization**: labels, saved filters, favorites, search across tasks and projects
- **Reminders** and **webhooks** for integrations, plus **API tokens** (read-only or read & write)
- **Attachments** with per-user storage quotas, and a data export for every account
- **Security by default**: JWT access tokens with rotating refresh cookies, default-deny routes, rate limiting and
  account lockout, email verification, account deletion with a grace period
- **Internationalization**: English and Czech (backend emails and notifications use each user's saved language)
- **Production-ready containers**: Caddy with automatic HTTPS, hardened containers, backup and restore scripts

## Tech stack

| Part | Technology |
|---|---|
| Backend | NestJS, TypeORM, MariaDB, `nestjs-i18n`, Passport (JWT) |
| Frontend | Svelte 5, SvelteKit (adapter-node), TailwindCSS 4, Flowbite-Svelte |
| Infrastructure | Docker Compose, Caddy, GitHub Actions, GitHub Container Registry |

## Repository layout

```
app/backend/    NestJS API: feature modules in src/modules/<feature>/
app/frontend/   SvelteKit UI: routes in src/routes/, shared code in src/lib/
docker/         Dev database compose file, production stack, Caddyfile, backup/deploy scripts
e2e/            Real-browser (Playwright) test of the production stack
noagenda.sh     Helper script for local development
```

## Getting started (development)

**Requirements:** Node.js 22.17 or newer (CI uses Node 26), Docker with the Compose plugin.

```bash
# 1. Configure
cp docker/.env.example docker/.env                 # database passwords for the dev database
cp app/backend/.env.example app/backend/.env       # DB_* must match the passwords above
cp app/frontend/.env.example app/frontend/.env

# 2. Start the database, the backend and the frontend
./noagenda.sh start
```

The UI is then at <http://localhost:5173> and the API at <http://localhost:3000>. `./noagenda.sh stop` stops everything
and `./noagenda.sh test` runs the backend tests and the frontend type check.

To start the pieces by hand: `docker compose -f docker/docker-compose.yml up -d`, then `npm run start:dev` in
`app/backend` and `npm run dev` in `app/frontend`. Adminer (a database UI, bound to localhost only) runs with
`--profile tools`.

### Demo data

```bash
cd app/backend
npm run seed             # 10 example users (1 admin, 3 team managers, 6 members), 3 teams, shared projects
                         # and subtasks (password: password123)
npm run seed -- --reset  # wipe and re-seed
```

The seeder refuses to run when `NODE_ENV=production`, unless `ALLOW_DEMO_SEED=true` is set. That is how a public demo
instance resets itself; see "Several instances on one host" in [DEPLOYMENT.md](DEPLOYMENT.md).

### Database changes

Locally the schema syncs automatically. Production never auto-syncs: after changing an entity, generate a migration and
commit it.

```bash
cd app/backend
npm run migration:generate -- src/migrations/<DescriptiveName>
```

## Testing

```bash
cd app/backend  && npm test && npm run lint     # unit tests, lint
cd app/frontend && npm test && npm run check    # unit tests, type check
e2e/run.sh                                      # real browser against the production Docker stack
```

CI (`.github/workflows/ci.yml`) also runs authorization, hardening and auth-lifecycle smoke tests against a real API and
database, and checks that the entities and migrations have not drifted. See [DEPLOYMENT.md](DEPLOYMENT.md#testing) for
what each script covers.

## Deployment

The production stack is one shared Caddy (HTTPS, routes by hostname) in front of the frontend and backend of each instance, with MariaDB on an internal network. CI
builds the images and publishes them to GitHub Container Registry; the server only pulls them:

```bash
docker compose -f docker/docker-compose.edge.yml up -d       # the shared Caddy, once per host
cp docker/.env.production.example docker/.env.production   # then edit: domain, instance name, secrets
# add docker/sites/<instance>.caddy, see DEPLOYMENT.md
docker/deploy.sh
```

- [DEPLOYMENT.md](DEPLOYMENT.md): server setup, deploying, updating, rollback, backups, configuration reference
- [PRELAUNCH.md](PRELAUNCH.md): step-by-step checklist before opening the app to real users

A small VPS with 2-4 GB of RAM is enough for a small group.

## Contributing

Backend code lives under `app/backend/src/modules/<feature>/` (entity, service, controller, module, optional
`__tests__/`); shared backend code is in `src/common/`. The frontend mirrors the backend domains in `src/routes/`, with
shared code in `src/lib/`. When you change an API, update the backend controller and the matching frontend API call
together, and run lint, format check and tests before opening a pull request.

## License

NOAgenda is free software, licensed under the [GNU Affero General Public License v3.0 or later](LICENSE) (AGPL-3.0-or-later).
If you run a modified version as a network service, you must offer its source code to the users of that service.
