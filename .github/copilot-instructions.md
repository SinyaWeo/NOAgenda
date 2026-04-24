

# Copilot Instructions for NOAgenda Project

## Project Overview
NOAgenda is a full-stack, modular application. The backend uses NestJS, TypeORM, and MariaDB. The frontend is built with Svelte 5 and SvelteKit. The project is organized for clarity, scalability, and maintainability.

## Directory Structure
- **app/backend/**: NestJS backend source code, feature modules, and configuration
	- `src/modules/`: Feature modules (user, auth, project, task, team, team-member, label, comment, notification, attachment, webhook, plugin)
	- `src/i18n/`: Internationalization support
	- `uploads/`: File uploads
- **app/frontend/**: SvelteKit frontend source code, routes, and static assets
	- `src/routes/`: SvelteKit routes (dashboard, projects, tasks, teams, user/settings, login, register, password reset, etc.)
	- `src/lib/`: Shared utilities (API, auth, assets)
	- `src/lib/assets/`: Static assets (favicon, etc.)
- **docker/**: Docker and deployment configuration (MariaDB, Adminer)
- **static/**: Shared static files

## Coding Conventions
- Use TypeScript for both backend and frontend
- Follow NestJS and SvelteKit best practices
- Use clear, descriptive variable and function names
- Prefer async/await for asynchronous code
- Keep functions and components small and focused
- Write comments for complex logic
- Use explicit typing for all variables
- Reuse utilities and helpers; avoid code duplication

## Backend Guidance
- Place all backend logic in `app/backend/src/modules/`
- Each feature (user, task, project, etc.) should be a separate module with its own entity, service, and controller
- Use TypeORM for database access; update entities and migrations for DB changes
- Use DTOs and guards for validation and security
- Use environment variables for configuration (`.env` file)
- Internationalization is handled via `nestjs-i18n` in `src/i18n/`

## Frontend Guidance
- Place shared logic in `app/frontend/src/lib/` (e.g., `api.ts`, `auth.ts`)
- Place SvelteKit routes in `app/frontend/src/routes/` (dashboard, projects, tasks, teams, user/settings, login, register, etc.)
- Use SvelteKit stores for state management
- Use the centralized API utility for backend communication
- Use explicit types for all variables and props

## API & Integration
- For API changes, update both backend controllers and frontend API calls
- Use RESTful conventions for endpoints
- Ensure authentication and authorization for protected routes (JWT, guards)

## Deployment
- Use Docker Compose for local development (MariaDB, Adminer)
- Use SvelteKit adapters for frontend deployment as needed

## TODOs / Checklist
- [ ] Keep this file updated as the project evolves
- [ ] Add new conventions or patterns as needed
- [ ] Document any custom utilities or helpers

---
_Edit this file to help Copilot and contributors follow project standards._
