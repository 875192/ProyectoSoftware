# UniGear - Sistema de Préstamo de Equipamiento Universitario

## Descripción del Proyecto

**UniGear** es un sistema de préstamos de equipamiento universitario donde estudiantes y profesores pueden explorar un catálogo de materiales, solicitar préstamos y gestionar sus préstamos activos. El personal administrativo gestiona el inventario, aprueba o rechaza solicitudes, y registra devoluciones. Stripe procesa pagos y Nodemailer envía correos para recuperación de contraseñas.

## Tech Stack

- **Backend**: Express.js (Node.js)
- **Frontend**: Vanilla HTML/CSS/JS (sin framework)
- **Base de datos**: PostgreSQL 16
- **Pagos**: Stripe (test mode)
- **Email**: Nodemailer (SMTP/Gmail)

## Estructura del Proyecto

```
UniGear/
├── app/          Express REST API (puerto 3000)
├── Frontend/     Vanilla HTML/CSS/JS (puerto 5500)
├── database/     Esquema PostgreSQL, migraciones, seed script
└── docker-compose.yml
```

## Roles de Usuario

| Rol | Descripción |
|-----|-------------|
| `estudiante` | Puede solicitar préstamos y ver su historial |
| `profesor` | Igual que estudiante + posible prioridad |
| `personal_gestion` | Aprueba/rechaza solicitudes, gestiona inventario |
| `mantenimiento` | Gestão de incidencias y mantenimiento de equipos |

## Estados de Materiales

`disponible | reservado | prestado | averiado | mantenimiento | fuera_servicio`

## Estados de Solicitudes

`pendiente | aprobada | rechazada | cancelada | en_espera | expirada`

## Paleta de Colores

- **Primario**: Teal (`#0f766e`)
- **Acento**: Amarillo (`#FACC15`)
- **Neutros**: Grises del 50 al 900
- **Feedback**: Éxito (verde), Error (rojo), Advertencia (amarillo), Info (teal)

Ver CLAUDE.md completo para detalles completos.