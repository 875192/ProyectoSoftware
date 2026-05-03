'use strict';
const inquirer = require('inquirer');
const Table    = require('cli-table3');
const db       = require('./db');
const { c, clear, header, section, success, error, info, press } = require('./ui');

const DESTINO_CHOICES = [
  { name: 'Todos los usuarios activos',    value: 'todos'            },
  { name: 'Solo estudiantes',              value: 'estudiante'       },
  { name: 'Solo profesores',               value: 'profesor'         },
  { name: 'Solo personal de gestión',      value: 'personal_gestion' },
  { name: 'Solo mantenimiento',            value: 'mantenimiento'    },
  { name: 'Un usuario concreto (por ID)',  value: 'individual'       },
];

// ── DB helpers ────────────────────────────────────────────────────────────────

async function sendAlert({ titulo, texto, destino, usuario_id }) {
  let userIds = [];

  if (destino === 'individual') {
    userIds = [usuario_id];
  } else if (destino === 'todos') {
    const { rows } = await db.query(`SELECT id FROM usuarios WHERE activo = TRUE`);
    userIds = rows.map(r => r.id);
  } else {
    const { rows } = await db.query(`
      SELECT u.id FROM usuarios u
      JOIN usuario_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      WHERE r.nombre = $1 AND u.activo = TRUE
    `, [destino]);
    userIds = rows.map(r => r.id);
  }

  if (!userIds.length) return 0;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const uid of userIds) {
      await client.query(`
        INSERT INTO notificaciones (usuario_id, tipo, titulo, texto, canal, estado)
        VALUES ($1, 'general', $2, $3, 'in_app', 'pendiente')
      `, [uid, titulo, texto]);
    }
    await client.query('COMMIT');
    return userIds.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getRecentAlerts() {
  const { rows } = await db.query(`
    SELECT titulo, texto,
           MIN(created_at)                              AS enviada_at,
           COUNT(*)                                     AS destinatarios,
           COUNT(*) FILTER (WHERE leida = TRUE)         AS leidas
    FROM notificaciones
    WHERE tipo = 'general'
    GROUP BY titulo, texto
    ORDER BY enviada_at DESC
    LIMIT 20
  `);
  return rows;
}

async function getSystemStats() {
  const { rows: [s] } = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM usuarios WHERE activo = TRUE)        AS usuarios_activos,
      (SELECT COUNT(*) FROM prestamos  WHERE estado = 'activo')  AS prestamos_activos,
      (SELECT COUNT(*) FROM solicitudes WHERE estado = 'pendiente') AS solicitudes_pendientes,
      (SELECT COUNT(*) FROM notificaciones WHERE tipo = 'general' AND leida = FALSE) AS alertas_sin_leer
  `);
  return s;
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderAlerts(alerts) {
  if (!alerts.length) { info('Sin alertas generales enviadas todavía.'); return; }

  const table = new Table({
    head: [
      c.tealBright('Título'),
      c.tealBright('Enviada'),
      c.tealBright('Dest.'),
      c.tealBright('Leídas'),
    ],
    colWidths: [38, 22, 8, 8],
    style: { border: ['cyan'] },
  });

  for (const a of alerts) {
    table.push([
      (a.titulo || '').slice(0, 36),
      new Date(a.enviada_at).toLocaleString('es-ES'),
      String(a.destinatarios),
      `${a.leidas}/${a.destinatarios}`,
    ]);
  }

  console.log('\n' + table.toString() + '\n');
}

function renderStats(s) {
  const w = 54;
  const sep = c.teal('─'.repeat(w));
  console.log('\n' + sep);
  console.log(c.tealBright.bold('  ESTADÍSTICAS DEL SISTEMA'));
  console.log(sep);
  console.log(`  ${c.dim('Usuarios activos:')}        ${c.white(s.usuarios_activos)}`);
  console.log(`  ${c.dim('Préstamos activos:')}       ${c.white(s.prestamos_activos)}`);
  console.log(`  ${c.dim('Solicitudes pendientes:')} ${c.white(s.solicitudes_pendientes)}`);
  console.log(`  ${c.dim('Alertas sin leer:')}        ${s.alertas_sin_leer > 0 ? c.red(s.alertas_sin_leer) : c.green(s.alertas_sin_leer)}`);
  console.log(sep);
}

// ── Menu ──────────────────────────────────────────────────────────────────────

async function menu() {
  while (true) {
    clear();
    header();
    section('ALERTAS DEL SISTEMA');
    console.log('');

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Acción:',
      choices: [
        { name: '  Enviar nueva alerta',          value: 'send'  },
        { name: '  Ver alertas enviadas',          value: 'list'  },
        { name: '  Estadísticas del sistema',      value: 'stats' },
        new inquirer.Separator(),
        { name: '  ← Volver al menú principal',   value: 'back'  },
      ],
    }]);

    if (action === 'back') return;

    clear();
    header();

    try {
      switch (action) {

        case 'send': {
          section('ENVIAR NUEVA ALERTA');

          const { destino } = await inquirer.prompt([{
            type: 'list', name: 'destino', message: 'Destinatarios:', choices: DESTINO_CHOICES,
          }]);

          let usuario_id;
          if (destino === 'individual') {
            const { id } = await inquirer.prompt([{
              type: 'input', name: 'id', message: 'ID del usuario:',
              validate: v => /^\d+$/.test(v) || 'Introduce un número',
            }]);
            usuario_id = Number(id);
          }

          const { titulo, texto } = await inquirer.prompt([
            {
              type: 'input', name: 'titulo', message: 'Título de la alerta:',
              validate: v => v.trim().length >= 3 || 'Mínimo 3 caracteres',
            },
            {
              type: 'input', name: 'texto', message: 'Mensaje:',
              validate: v => v.trim().length >= 5 || 'Mínimo 5 caracteres',
            },
          ]);

          const { ok } = await inquirer.prompt([{
            type: 'confirm', name: 'ok',
            message: `¿Enviar alerta "${titulo}" a ${destino === 'individual' ? `usuario #${usuario_id}` : destino}?`,
          }]);

          if (ok) {
            const n = await sendAlert({ titulo: titulo.trim(), texto: texto.trim(), destino, usuario_id });
            success(`Alerta enviada a ${n} usuario(s).`);
          } else {
            info('Cancelado.');
          }
          break;
        }

        case 'list': {
          section('ALERTAS ENVIADAS');
          renderAlerts(await getRecentAlerts());
          break;
        }

        case 'stats': {
          section('ESTADÍSTICAS');
          renderStats(await getSystemStats());
          break;
        }
      }
    } catch (err) {
      error(`Error: ${err.message}`);
    }

    await press();
  }
}

module.exports = { menu };
