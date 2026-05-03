'use strict';
const { spawn }  = require('child_process');
const net        = require('net');
const path       = require('path');
const inquirer   = require('inquirer');
const { c, clear, header, section, success, error, info, warn, press } = require('./ui');

let proc = null;
const logs = [];
const MAX_LOGS = 150;

// ── Internal ──────────────────────────────────────────────────────────────────

function addLog(line) {
  const ts = new Date().toLocaleTimeString('es-ES');
  logs.push(`[${ts}] ${line.trim()}`);
  if (logs.length > MAX_LOGS) logs.shift();
}

function appPath() {
  return path.join(__dirname, '../../app');
}

// ── Public API ────────────────────────────────────────────────────────────────

async function checkStatus() {
  return new Promise(resolve => {
    const sock = new net.Socket();
    sock.setTimeout(800);
    sock.on('connect', () => { sock.destroy(); resolve(true);  });
    sock.on('error',   () => resolve(false));
    sock.on('timeout', () => { sock.destroy(); resolve(false); });
    sock.connect(3000, '127.0.0.1');
  });
}

function isManagedByTui() { return proc !== null; }

function start() {
  if (proc) { warn('El servidor ya está siendo gestionado por esta sesión.'); return false; }

  proc = spawn('node', ['src/index.js'], {
    cwd: appPath(),
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stdout.on('data', d => {
    const lines = d.toString().split('\n').filter(Boolean);
    lines.forEach(l => addLog(l));
  });
  proc.stderr.on('data', d => {
    const lines = d.toString().split('\n').filter(Boolean);
    lines.forEach(l => addLog('[ERR] ' + l));
  });
  proc.on('exit', code => {
    addLog(`[EXIT] Proceso terminado — código ${code ?? 'señal'}`);
    proc = null;
  });

  addLog('[START] Servidor lanzado...');
  return true;
}

function stop() {
  if (!proc) { warn('No hay proceso gestionado por esta sesión.'); return false; }
  proc.kill('SIGTERM');
  addLog('[STOP] SIGTERM enviado.');
  return true;
}

function cleanup() {
  if (proc) proc.kill('SIGTERM');
}

// ── Menu ──────────────────────────────────────────────────────────────────────

async function menu() {
  while (true) {
    const running = await checkStatus();
    const managed = isManagedByTui();

    clear();
    header();
    section('CONTROL DEL SERVIDOR');
    console.log('');

    // Status panel
    console.log(`  Estado          ${running ? c.green('● ACTIVO') : c.red('○ INACTIVO')}  ${c.dim('(puerto 3000)')}`);
    console.log(`  Gestionado TUI  ${managed ? c.teal('Sí') : c.dim('No — iniciado externamente')}`);
    if (logs.length) {
      console.log(`  Entradas log    ${c.dim(String(logs.length))}`);
    }
    console.log('');

    const choices = [];
    if (!running) {
      choices.push({ name: '  ▶  Iniciar servidor',    value: 'start'   });
    } else {
      choices.push({ name: '  ■  Detener servidor',    value: 'stop'    });
      choices.push({ name: '  ↺  Reiniciar servidor',  value: 'restart' });
    }
    choices.push({ name: '  ≡  Ver logs recientes',  value: 'logs'    });
    choices.push(new inquirer.Separator());
    choices.push({ name: '  ←  Volver',              value: 'back'    });

    const { action } = await inquirer.prompt([{
      type: 'list', name: 'action', message: 'Acción:', choices,
    }]);

    if (action === 'back') return;

    clear();
    header();

    switch (action) {

      case 'start': {
        section('INICIAR SERVIDOR');
        if (start()) {
          success('Servidor arrancando en http://localhost:3000 …');
          info('Espera unos segundos antes de usarlo.');
        }
        break;
      }

      case 'stop': {
        section('DETENER SERVIDOR');
        const { ok } = await inquirer.prompt([{
          type: 'confirm', name: 'ok',
          message: '¿Detener el servidor Express? Los préstamos en curso no se verán afectados.',
          default: false,
        }]);
        if (ok) {
          stop() ? success('Señal de parada enviada.') : null;
        } else {
          info('Cancelado.');
        }
        break;
      }

      case 'restart': {
        section('REINICIAR SERVIDOR');
        const { ok } = await inquirer.prompt([{
          type: 'confirm', name: 'ok', message: '¿Reiniciar el servidor?',
        }]);
        if (ok) {
          if (managed) {
            stop();
            info('Esperando parada completa…');
            await new Promise(r => setTimeout(r, 2500));
          }
          start();
          success('Servidor reiniciando…');
        } else {
          info('Cancelado.');
        }
        break;
      }

      case 'logs': {
        section('LOGS DEL SERVIDOR');
        if (!logs.length) {
          info('Sin logs. El servidor debe haber sido arrancado desde esta sesión.');
        } else {
          console.log('');
          const slice = logs.slice(-40);
          slice.forEach(l => {
            const color = l.includes('[ERR]') ? c.red(l) :
                          l.includes('[EXIT]') || l.includes('[STOP]') ? c.yellow(l) :
                          l.includes('[START]') ? c.teal(l) :
                          c.dim(l);
            console.log('  ' + color);
          });
          if (logs.length > 40) {
            info(`Mostrando últimas 40 de ${logs.length} entradas.`);
          }
        }
        break;
      }
    }

    await press();
  }
}

module.exports = { menu, checkStatus, isManagedByTui, cleanup };
