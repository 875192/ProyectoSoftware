'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../app/.env') });

const inquirer = require('inquirer');
const db       = require('./src/db');
const { c, clear, header, footer, section, error, press } = require('./src/ui');
const usuarios = require('./src/usuarios');
const servidor = require('./src/servidor');
const alertas  = require('./src/alertas');

// ── Startup ───────────────────────────────────────────────────────────────────

async function checkDb() {
  try { await db.query('SELECT 1'); return true; }
  catch { return false; }
}

async function splash() {
  clear();
  header();
  console.log('');
  console.log(c.dim('  Sistema de Gestión de Equipos Universitarios'));
  console.log('');

  process.stdout.write(c.dim('  Conectando a la base de datos… '));
  const dbOk = await checkDb();

  if (dbOk) {
    console.log(c.green('● Conexión establecida'));
  } else {
    console.log(c.red('✗ Sin conexión'));
    console.log(c.red('\n  Verifica que el contenedor Docker está activo:'));
    console.log(c.dim('    docker-compose up -d\n'));
  }

  console.log('');
  await new Promise(r => setTimeout(r, 600));
  return dbOk;
}

// ── Main loop ─────────────────────────────────────────────────────────────────

async function mainMenu() {
  while (true) {
    const [dbOk, srvOk] = await Promise.all([checkDb(), servidor.checkStatus()]);

    clear();
    header();
    console.log('');

    const { choice } = await inquirer.prompt([{
      type: 'list',
      name: 'choice',
      message: 'Módulo:',
      choices: [
        { name: '  ░  Gestión de Usuarios',    value: 'usuarios' },
        { name: '  ░  Control del Servidor',   value: 'servidor' },
        { name: '  ░  Alertas del Sistema',    value: 'alertas'  },
        new inquirer.Separator(),
        { name: '  ×  Salir',                  value: 'salir'    },
      ],
    }]);

    footer({ server: srvOk, db: dbOk });

    switch (choice) {
      case 'usuarios': await usuarios.menu(); break;
      case 'servidor': await servidor.menu(); break;
      case 'alertas':  await alertas.menu();  break;
      case 'salir':
        servidor.cleanup();
        clear();
        console.log('\n' + c.teal('  Hasta pronto.\n'));
        await db.end();
        process.exit(0);
    }
  }
}

// ── Entry ─────────────────────────────────────────────────────────────────────

(async () => {
  const dbOk = await splash();

  if (!dbOk) {
    const { proceed } = await inquirer.prompt([{
      type: 'confirm', name: 'proceed',
      message: 'La DB no responde. ¿Continuar de todas formas? (funciones de usuario no estarán disponibles)',
      default: false,
    }]);
    if (!proceed) process.exit(1);
  }

  process.on('SIGINT', () => {
    servidor.cleanup();
    console.log('\n' + c.dim('  Saliendo…'));
    process.exit(0);
  });

  await mainMenu();
})().catch(err => {
  console.error('\n' + c.red('Error fatal: ') + err.message);
  process.exit(1);
});
