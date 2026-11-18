# NOAgenda Refactor Backend (NestJS + TypeORM + MariaDB)

## Getting Started

1. Copy your MariaDB connection details into the .env file (see below).
2. Run `npm run start:dev` to start the backend server.

## Environment Variables
Create a `.env` file in the backend directory with the following content:

```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=noagenda
JWT_SECRET=your_jwt_secret
```

## Project Structure
- `src/`
  - `modules/` — Feature modules (users, auth, etc.)
  - `common/` — Shared utilities, DTOs, guards, etc.
  - `config/` — Configuration files

## Scripts
- `npm run start:dev` — Start backend in development mode
- `npm run build` — Build the backend
- `npm run seed` — Fill a development database with example data (10 users, 3 teams, projects, tasks). Run migrations first. All users share the password `password123`; `alice` is an admin. Use `npm run seed -- --reset` to delete and re-create the example data. Refuses to run with `NODE_ENV=production`.

---

# NOAgenda Refactor Frontend (SvelteKit)

## Getting Started

1. Run `npm run dev` in the frontend-new directory to start the frontend dev server.

## Project Structure
- `src/routes/` — SvelteKit routes
- `src/lib/` — Shared components and utilities
- `src/components/` — UI components

---

# Notes
- This is a work-in-progress refactor. API compatibility with the original app will be maintained.
- Update this README as you migrate features and modules.
