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
Open `Frontend/src/landing/landing.html` via VS Code Live Server (port 5500) or any static file server. No build step required.

### No tests or linter are configured.

## Architecture

```
UniGear/
├── app/          Express REST API (port 3000)
├── Frontend/     Vanilla HTML/CSS/JS frontend (port 5500 via Live Server)
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

### Frontend — `Frontend/src/`

No framework. Each page is a self-contained HTML + JS + CSS triplet co-located in its feature folder.

#### Shared core — `Frontend/src/compartido/`

- `compartido/nucleo/api.js` — Fetch wrapper; all views use this to call the backend
- `compartido/nucleo/auth.js` — Auth state (JWT / user info) in `localStorage`; `auth.requireAuth(roles)` enforces role-based access and redirects
- `compartido/nucleo/db.js` — LocalStorage wrapper (get/set/find/filter/insert/update)
- `compartido/nucleo/mockData.js` — Static mock data for prototyping (not production)
- `compartido/ui.js` — Toast notifications, sidebar toggle, modal helpers

#### Feature modules — `Frontend/src/`

Each subdirectory maps to a feature domain. Pages that already exist are marked ✓; everything else is a placeholder (`gitkeep`).

| Module | Path | Implemented pages |
|--------|------|-------------------|
| Landing pública | `landing/` | ✓ `landing.html` |
| Autenticación | `autenticacion/login_registro/` | ✓ `login.html` (login + registro) |
| | `autenticacion/recuperar-password/` | ✓ `recuperar-password.html` |
| | `autenticacion/restablecer-password/` | ✓ `restablecer-password.html` |
| Panel usuario | `paneles/panel-usuario/` | ✓ `panel_usuarios.html` (dashboard del usuario) |
| Catálogo | `catalogo/listado-materiales/` | ✓ `listado_materiales.html` |
| | `catalogo/detalle-material/` | ✓ `detalle_material.html` |
| Solicitudes | `solicitudes-prestamo/mis-solicitudes/` | ✓ `mis_solicitudes.html` |
| | `solicitudes-prestamo/crear-solicitud/` | ✓ `crear_solicitud.html` |
| Préstamos | `prestamos/mis-prestamos/` | ✓ `mis_prestamos.html` |
| Notificaciones | `notificaciones/bandeja-notificaciones/` | ✓ `notificaciones_usuario.html` |
| Perfil | `usuarios/perfil/` | ✓ `perfil_usuario.html` |
| Paneles staff | `paneles/panel-staff/`, `panel-admin/` | placeholder |
| Inventario | `inventario/` | placeholder |
| Devoluciones | `devoluciones/` | placeholder |
| Incidencias | `incidencias/` | placeholder |
| Sanciones | `sanciones/` | placeholder |
| Pagos | `pagos/` | placeholder |
| Mantenimiento | `mantenimiento/` | placeholder |

#### Role-based routing

`auth.requireAuth(roles)` reads the current user from `localStorage` and redirects unauthenticated or unauthorized users:

| Role | Default redirect |
|------|-----------------|
| `estudiante` / `profesor` | `paneles/panel-usuario/panel_usuarios.html` |
| `personal_gestion` | `paneles/panel-staff/panel-staff.html` |
| `mantenimiento` | `mantenimiento/mantenimiento.html` |

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

## Color Palette

All new pages and components **must** use only the following colors. Never introduce new colors outside this palette.

### Primarios — Teal

| Token CSS | Hex | Uso |
|-----------|-----|-----|
| `--teal` | `#0f766e` | Color principal: botones primarios, enlaces activos, iconos de acción |
| `--teal-dark` | `#115e59` | Hover de botones primarios, gradientes oscuros |
| `--teal-deep` | `#0a4642` | Fondos de banners CTA, encabezados con fondo oscuro |
| `--teal-100` | `#ccfbf1` | Chips, badges, fondos de estado activo |
| `--teal-50` | `#f0fdfa` | Hover sutil en cards, fondo de inputs en foco |

La variante `#0d9488` (teal-600 de Tailwind) se acepta como equivalente de `--teal` en contextos inline.

### Acento — Amarillo

| Token CSS | Hex | Uso |
|-----------|-----|-----|
| `--yellow` | `#FACC15` | Badges de precio, destacados de segunda importancia |
| `--yellow-dark` | `#EAB308` | Hover/borde de elementos amarillos |
| `--yellow-50` | `#FEFCE8` | Fondo suave de secciones de precio o aviso |

El amarillo es **solo acento**; no lo uses en botones de acción ni en texto largo.

### Neutros — Grises

| Token CSS | Hex | Uso |
|-----------|-----|-----|
| `--white` | `#ffffff` | Fondo de tarjetas, modales, inputs |
| `--off-white` | `#F8FAFC` | Fondo de página |
| `--gray-50` | `#F9FAFB` | Fondo alternativo de secciones |
| `--gray-100` | `#F3F4F6` | Bordes muy suaves, divisores |
| `--gray-200` | `#E5E7EB` | Bordes de inputs, separadores |
| `--gray-300` | `#D1D5DB` | Placeholders, iconos inactivos |
| `--gray-400` | `#9CA3AF` | Texto secundario apagado |
| `--gray-500` | `#6B7280` | Texto de apoyo, etiquetas |
| `--gray-600` | `#4B5563` | Texto de cuerpo normal |
| `--gray-700` | `#374151` | Texto importante |
| `--gray-800` | `#1F2937` | Títulos de sección |
| `--gray-900` | `#111827` | Títulos principales, texto de máximo contraste |

### Estado / Feedback

| Rol | Fondo | Borde | Texto |
|-----|-------|-------|-------|
| Éxito (success) | `#ecfdf5` | `#10b981` | `#047857` |
| Error | `#fef2f2` | `#f87171` | `#b91c1c` |
| Advertencia | `--yellow-50` | `--yellow-dark` | `--gray-800` |
| Info | `--teal-50` | `--teal` | `--teal-dark` |

### Reglas obligatorias

- **Botones primarios**: fondo `--teal`, hover `--teal-dark`, texto blanco.
- **Botones secundarios / ghost**: borde `--teal`, texto `--teal`, fondo transparente; hover fondo `--teal-50`.
- **Botones destructivos**: fondo `#b91c1c`, hover `#991b1b`, texto blanco.
- **No uses colores fuera de esta paleta** (azules, morados, naranjas, rosas…) salvo que el rol de "estado" lo justifique y estén en la tabla de feedback.
- Las sombras siempre son `rgba(0,0,0, 0.04–0.10)` o `rgba(15,118,110, 0.28–0.38)` para elementos teal.

## Frontend Standards

- Vanilla HTML/CSS/JS — no framework, no build step
- Chart.js for dashboard analytics; no GSAP dependency in current pages
- Mobile-first responsive design (breakpoints: 768 px, 1100 px)
- CSS custom properties for theming
- Each page is self-contained: one HTML + one JS + one CSS co-located in the feature folder
- New pages go in the matching feature module under `Frontend/src/`; never create a `pages/<role>/` structure

## Code Style

- 2-space indentation
- Spanish variable names and UI text (project language is Spanish)
- PascalCase for class names, camelCase for JS variables and functions

## Security notes

- Passwords hashed with `crypto.scryptSync()` + random 16-byte salt; compared with `crypto.timingSafeEqual()`
- Account locked for 10 minutes after 5 failed login attempts
- Password-reset tokens expire after 1 hour (`password_reset_tokens` table, added by `migration_reset_password.sql`)
- Stripe integration is in **test mode** (`sk_test_*` keys)
