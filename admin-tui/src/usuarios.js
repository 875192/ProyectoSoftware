'use strict';
const crypto   = require('crypto');
const chalk    = require('chalk');
const inquirer = require('inquirer');
const Table    = require('cli-table3');
const db       = require('./db');
const { c, clear, header, section, success, error, info, warn, press } = require('./ui');

const ROLES = ['estudiante', 'profesor', 'personal_gestion', 'mantenimiento'];

// ── DB helpers ────────────────────────────────────────────────────────────────

async function getAllUsers() {
  const { rows } = await db.query(`
    SELECT u.id, u.nombre_completo, u.email_institucional,
           u.activo, u.bloqueado_manual, u.created_at,
           r.nombre AS rol
    FROM usuarios u
    JOIN usuario_roles ur ON u.id = ur.usuario_id
    JOIN roles r ON ur.rol_id = r.id
    ORDER BY u.created_at DESC
  `);
  return rows;
}

async function getUsersByRole(rol) {
  const { rows } = await db.query(`
    SELECT u.id, u.nombre_completo, u.email_institucional,
           u.activo, u.bloqueado_manual, u.created_at, r.nombre AS rol
    FROM usuarios u
    JOIN usuario_roles ur ON u.id = ur.usuario_id
    JOIN roles r ON ur.rol_id = r.id
    WHERE r.nombre = $1
    ORDER BY u.created_at DESC
  `, [rol]);
  return rows;
}

async function getUserById(id) {
  const { rows } = await db.query(`
    SELECT u.id, u.nombre_completo, u.email_institucional, u.telefono,
           u.activo, u.bloqueado_manual, u.email_verificado,
           u.intentos_fallidos, u.ultimo_login_at, u.created_at,
           r.nombre AS rol
    FROM usuarios u
    JOIN usuario_roles ur ON u.id = ur.usuario_id
    JOIN roles r ON ur.rol_id = r.id
    WHERE u.id = $1
  `, [id]);
  return rows[0] || null;
}

async function createUser({ nombre_completo, email_institucional, password, rol }) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: [user] } = await client.query(`
      INSERT INTO usuarios (nombre_completo, email_institucional, password_hash, password_salt, email_verificado)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING id, nombre_completo, email_institucional
    `, [nombre_completo, email_institucional, hash, salt]);

    const { rows: [rolRow] } = await client.query(`SELECT id FROM roles WHERE nombre = $1`, [rol]);
    if (!rolRow) throw new Error(`Rol "${rol}" no encontrado en la base de datos`);

    await client.query(`INSERT INTO usuario_roles (usuario_id, rol_id) VALUES ($1, $2)`, [user.id, rolRow.id]);
    await client.query('COMMIT');
    return user;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteUser(id) {
  const { rows } = await db.query(
    `DELETE FROM usuarios WHERE id = $1 RETURNING id, nombre_completo`, [id]
  );
  return rows[0] || null;
}

async function setActive(id, activo) {
  await db.query(`UPDATE usuarios SET activo = $1 WHERE id = $2`, [activo, id]);
}

async function setBlocked(id, bloqueado) {
  await db.query(`UPDATE usuarios SET bloqueado_manual = $1 WHERE id = $2`, [bloqueado, id]);
}

async function changeRole(id, newRol) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: [rolRow] } = await client.query(`SELECT id FROM roles WHERE nombre = $1`, [newRol]);
    if (!rolRow) throw new Error(`Rol "${newRol}" no encontrado`);
    await client.query(`UPDATE usuario_roles SET rol_id = $1 WHERE usuario_id = $2`, [rolRow.id, id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function resetPassword(id, newPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(newPassword, salt, 64).toString('hex');
  await db.query(
    `UPDATE usuarios SET password_hash = $1, password_salt = $2, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $3`,
    [hash, salt, id]
  );
}

// ── Render helpers ────────────────────────────────────────────────────────────

function renderTable(users) {
  if (!users.length) { info('Sin resultados.'); return; }

  const table = new Table({
    head: [
      c.tealBright('ID'), c.tealBright('Nombre'), c.tealBright('Email'),
      c.tealBright('Rol'), c.tealBright('Estado')
    ],
    colWidths: [6, 26, 36, 18, 14],
    style: { border: ['cyan'], compact: false },
  });

  for (const u of users) {
    const estado = u.bloqueado_manual
      ? c.red('BLOQUEADO')
      : u.activo ? c.green('activo') : chalk.hex('#FACC15')('inactivo');

    table.push([
      String(u.id),
      (u.nombre_completo || '').slice(0, 24),
      (u.email_institucional || '').slice(0, 34),
      u.rol || '',
      estado,
    ]);
  }

  console.log('\n' + table.toString());
  console.log(c.dim(`  Total: ${users.length} usuario(s)\n`));
}

function renderDetail(u) {
  const sep = c.teal('─'.repeat(64));
  console.log('\n' + sep);
  console.log(`  ${c.tealBright.bold(u.nombre_completo)}`);
  console.log(sep);
  console.log(`  ${c.dim('ID:')}              ${u.id}`);
  console.log(`  ${c.dim('Email:')}           ${u.email_institucional}`);
  console.log(`  ${c.dim('Teléfono:')}        ${u.telefono || '—'}`);
  console.log(`  ${c.dim('Rol:')}             ${c.teal(u.rol)}`);
  console.log(`  ${c.dim('Cuenta activa:')}   ${u.activo ? c.green('Sí') : c.red('No')}`);
  console.log(`  ${c.dim('Bloqueado:')}       ${u.bloqueado_manual ? c.red('Sí (manual)') : c.green('No')}`);
  console.log(`  ${c.dim('Email verif.:')}    ${u.email_verificado ? c.green('Sí') : c.yellow('No')}`);
  console.log(`  ${c.dim('Intentos fail.:')} ${u.intentos_fallidos}`);
  console.log(`  ${c.dim('Último login:')}    ${u.ultimo_login_at ? new Date(u.ultimo_login_at).toLocaleString('es-ES') : '—'}`);
  console.log(`  ${c.dim('Alta:')}            ${new Date(u.created_at).toLocaleString('es-ES')}`);
  console.log(sep);
}

// ── Menu ──────────────────────────────────────────────────────────────────────

async function menu() {
  while (true) {
    clear();
    header();
    section('GESTIÓN DE USUARIOS');
    console.log('');

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Acción:',
      choices: [
        { name: '  Listar todos los usuarios',       value: 'list'          },
        { name: '  Filtrar por rol',                  value: 'list_rol'      },
        { name: '  Ver detalle de usuario',           value: 'detail'        },
        new inquirer.Separator('  ───── Operaciones ─────'),
        { name: '  Crear nuevo usuario',              value: 'create'        },
        { name: '  Eliminar usuario',                 value: 'delete'        },
        { name: '  Activar / Desactivar cuenta',      value: 'toggle_active' },
        { name: '  Bloquear / Desbloquear cuenta',    value: 'toggle_block'  },
        { name: '  Cambiar rol',                      value: 'change_rol'    },
        { name: '  Restablecer contraseña',           value: 'reset_pass'    },
        new inquirer.Separator(),
        { name: '  ← Volver al menú principal',       value: 'back'          },
      ],
    }]);

    if (action === 'back') return;
    await handleAction(action);
  }
}

async function handleAction(action) {
  clear();
  header();

  try {
    switch (action) {

      case 'list': {
        section('TODOS LOS USUARIOS');
        const users = await getAllUsers();
        renderTable(users);
        break;
      }

      case 'list_rol': {
        const { rol } = await inquirer.prompt([{
          type: 'list', name: 'rol', message: 'Rol:', choices: ROLES,
        }]);
        section(`USUARIOS — ${rol.toUpperCase()}`);
        renderTable(await getUsersByRole(rol));
        break;
      }

      case 'detail': {
        const { id } = await inquirer.prompt([{
          type: 'input', name: 'id', message: 'ID del usuario:',
          validate: v => /^\d+$/.test(v) || 'Introduce un número',
        }]);
        const u = await getUserById(Number(id));
        if (!u) { error(`Usuario #${id} no encontrado.`); break; }
        section('DETALLE DE USUARIO');
        renderDetail(u);
        break;
      }

      case 'create': {
        section('CREAR NUEVO USUARIO');
        const data = await inquirer.prompt([
          {
            type: 'input', name: 'nombre_completo', message: 'Nombre completo:',
            validate: v => v.trim().length >= 2 || 'Mínimo 2 caracteres',
          },
          {
            type: 'input', name: 'email_institucional', message: 'Email institucional:',
            validate: v => /\S+@\S+\.\S+/.test(v.trim()) || 'Formato inválido',
          },
          {
            type: 'password', name: 'password', message: 'Contraseña temporal:', mask: '*',
            validate: v => v.length >= 6 || 'Mínimo 6 caracteres',
          },
          {
            type: 'list', name: 'rol', message: 'Rol:', choices: ROLES,
          },
        ]);

        const { ok } = await inquirer.prompt([{
          type: 'confirm', name: 'ok',
          message: `¿Crear usuario "${data.nombre_completo}" con rol ${data.rol}?`,
        }]);
        if (!ok) { info('Cancelado.'); break; }

        const user = await createUser(data);
        success(`Usuario creado — ID #${user.id}: ${user.nombre_completo}`);
        break;
      }

      case 'delete': {
        section('ELIMINAR USUARIO');
        const users = await getAllUsers();
        renderTable(users);

        const { id } = await inquirer.prompt([{
          type: 'input', name: 'id', message: 'ID a eliminar (0 para cancelar):',
          validate: v => /^\d+$/.test(v) || 'Introduce un número',
        }]);
        if (id === '0') { info('Cancelado.'); break; }

        const u = await getUserById(Number(id));
        if (!u) { error(`Usuario #${id} no encontrado.`); break; }

        warn(`Esto eliminará permanentemente a "${u.nombre_completo}" y TODOS sus datos asociados.`);
        const { ok } = await inquirer.prompt([{
          type: 'confirm', name: 'ok',
          message: `¿Confirmar eliminación de #${id} (${u.email_institucional})?`,
          default: false,
        }]);
        if (!ok) { info('Cancelado.'); break; }

        await deleteUser(Number(id));
        success(`Usuario #${id} eliminado.`);
        break;
      }

      case 'toggle_active': {
        const { id } = await inquirer.prompt([{
          type: 'input', name: 'id', message: 'ID del usuario:',
          validate: v => /^\d+$/.test(v) || 'Introduce un número',
        }]);
        const u = await getUserById(Number(id));
        if (!u) { error(`Usuario #${id} no encontrado.`); break; }

        const newState = !u.activo;
        const { ok } = await inquirer.prompt([{
          type: 'confirm', name: 'ok',
          message: `¿${newState ? 'Activar' : 'Desactivar'} la cuenta de "${u.nombre_completo}"?`,
        }]);
        if (ok) {
          await setActive(Number(id), newState);
          success(`Cuenta ${newState ? 'activada' : 'desactivada'}.`);
        } else {
          info('Cancelado.');
        }
        break;
      }

      case 'toggle_block': {
        const { id } = await inquirer.prompt([{
          type: 'input', name: 'id', message: 'ID del usuario:',
          validate: v => /^\d+$/.test(v) || 'Introduce un número',
        }]);
        const u = await getUserById(Number(id));
        if (!u) { error(`Usuario #${id} no encontrado.`); break; }

        const newState = !u.bloqueado_manual;
        const { ok } = await inquirer.prompt([{
          type: 'confirm', name: 'ok',
          message: `¿${newState ? 'BLOQUEAR' : 'Desbloquear'} la cuenta de "${u.nombre_completo}"?`,
        }]);
        if (ok) {
          await setBlocked(Number(id), newState);
          success(`Cuenta ${newState ? 'bloqueada' : 'desbloqueada'}.`);
        } else {
          info('Cancelado.');
        }
        break;
      }

      case 'change_rol': {
        const { id } = await inquirer.prompt([{
          type: 'input', name: 'id', message: 'ID del usuario:',
          validate: v => /^\d+$/.test(v) || 'Introduce un número',
        }]);
        const u = await getUserById(Number(id));
        if (!u) { error(`Usuario #${id} no encontrado.`); break; }

        console.log(`\n  Rol actual: ${c.teal(u.rol)}\n`);
        const { newRol } = await inquirer.prompt([{
          type: 'list', name: 'newRol', message: 'Nuevo rol:',
          choices: ROLES.filter(r => r !== u.rol),
        }]);
        const { ok } = await inquirer.prompt([{
          type: 'confirm', name: 'ok',
          message: `¿Cambiar "${u.nombre_completo}": ${u.rol} → ${newRol}?`,
        }]);
        if (ok) {
          await changeRole(Number(id), newRol);
          success(`Rol actualizado a "${newRol}".`);
        } else {
          info('Cancelado.');
        }
        break;
      }

      case 'reset_pass': {
        const { id } = await inquirer.prompt([{
          type: 'input', name: 'id', message: 'ID del usuario:',
          validate: v => /^\d+$/.test(v) || 'Introduce un número',
        }]);
        const u = await getUserById(Number(id));
        if (!u) { error(`Usuario #${id} no encontrado.`); break; }

        const { newPass } = await inquirer.prompt([{
          type: 'password', name: 'newPass',
          message: `Nueva contraseña para "${u.nombre_completo}":`, mask: '*',
          validate: v => v.length >= 6 || 'Mínimo 6 caracteres',
        }]);
        const { ok } = await inquirer.prompt([{
          type: 'confirm', name: 'ok', message: '¿Confirmar restablecimiento de contraseña?',
        }]);
        if (ok) {
          await resetPassword(Number(id), newPass);
          success(`Contraseña restablecida. Intentos fallidos reiniciados.`);
        } else {
          info('Cancelado.');
        }
        break;
      }
    }
  } catch (err) {
    error(`Error: ${err.message}`);
  }

  await press();
}

module.exports = { menu };
