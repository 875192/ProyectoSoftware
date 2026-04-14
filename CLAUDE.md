# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UniGear** is a university equipment lending system. Students and professors browse a catalog and submit loan requests; staff manage inventory, approve/reject requests, and record returns. Stripe handles payments; Nodemailer handles password-reset emails.

## Commands

### Start database
```bash
docker-compose up -d          # PostgreSQL 16 on localhost:5433
```

### Initialize / reseed database
```bash
cd database && npm install && node seed.js
```

### Run backend (development)
```bash
cd app && npm install && npm run dev   # nodemon, hot-reload, port 3000
```

### Run backend (production)
```bash
cd app && npm start
```

### Serve frontend
Open `api/src/pages/public/landing.html` via VS Code Live Server (port 5500) or any static file server. No build step required.

### No tests or linter are configured.

## Architecture

```
UniGear/
├── app/          Express REST API (port 3000)
├── api/          Vanilla HTML/CSS/JS frontend (port 5500 via Live Server)
├── database/     PostgreSQL schema, migrations, seed script
└── docker-compose.yml
```

### Backend — `app/`

Layers: **Routes → Controllers → DAO → DB pool**

- `app/src/index.js` — Express app entry point, registers all routes, serves static files
- `app/src/db/pool.js` — `pg` connection pool; reads `DATABASE_URL` from `app/.env`
- `app/src/dao/` — Raw SQL queries (DAO pattern); no ORM
- `app/src/controllers/` — One controller per resource; calls DAO, sends JSON responses
- `app/src/routes/` — Express router definitions; one file per resource
- `app/src/config/mailer.js` — Nodemailer setup for password-reset emails (SMTP/Gmail)

**API base URL**: `http://localhost:3000`

Key resource paths: `/auth`, `/materiales`, `/categorias`, `/solicitudes`, `/usuarios`, `/notificaciones`, `/pagos`

### Frontend — `api/src/`

No framework. Each page is a self-contained HTML file with matching JS and CSS.

- `js/core/api.js` — Fetch wrapper used by all views to call the backend
- `js/core/auth.js` — Auth state (JWT / user info) in `localStorage`
- `js/core/db.js` — Client-side data helpers
- `js/core/mockData.js` — Static mock data used for prototyping (not production)
- `js/views/<role>/` — Page-specific logic; one file per page
- `css/globals.css`, `layout.css`, `components.css` — Shared styles
- `css/staff-theme.css` — Staff-specific theme variables

**Roles and their page roots:**
| Role | Pages |
|------|-------|
| Student | `pages/student/` |
| Staff / Admin | `pages/staff/` |
| Public (unauth) | `pages/public/` |
| Maintenance | `pages/maintenance/` |

The `pages/profesor/` directory is **deprecated and being removed** — do not add new features there.

### Database — `database/`

PostgreSQL 16. Schema defined in `schema.sql`. Apply migrations manually with `psql` before seeding.

Key tables: `usuarios`, `roles`, `usuario_roles`, `materiales`, `categorias`, `solicitudes`, `prestamos`, `incidencias`, `sanciones`, `notificaciones`, `pagos`

Material states: `disponible | reservado | prestado | averiado | mantenimiento | fuera_servicio`  
Request states: `pendiente | aprobada | rechazada | cancelada | en_espera | expirada`

### Environment variables

Two `.env` files are required (not committed):

| File | Contains |
|------|---------|
| `app/.env` | `DATABASE_URL`, `PORT`, `SMTP_*`, `STRIPE_SECRET_KEY`, `FRONTEND_URL` |
| Root `.env` | Docker Postgres credentials (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`) |

Default DB connection: `postgresql://unigear_app:unigear_password@localhost:5433/unigear`  
Default frontend URL (for password-reset links): `http://127.0.0.1:5500`

## Frontend Standards

- Vanilla HTML/CSS/JS — no framework, no build step
- GSAP for animations (already used in student views)
- Mobile-first responsive design
- CSS custom properties for theming (see `css/globals.css`)
- Staff theme uses `css/staff-theme.css` variables — apply them consistently
- Each page is self-contained: one HTML + one JS in `js/views/<role>/`

## Code Style

- 2-space indentation
- Spanish variable names and UI text (project language is Spanish)
- PascalCase for class names, camelCase for JS variables and functions

### Security notes

- Passwords hashed with `crypto.scryptSync()` + random 16-byte salt; compared with `crypto.timingSafeEqual()`
- Account locked for 10 minutes after 5 failed login attempts
- Password-reset tokens expire after 1 hour (`password_reset_tokens` table, added by `migration_reset_password.sql`)
- Stripe integration is in **test mode** (`sk_test_*` keys)
