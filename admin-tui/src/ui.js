'use strict';
const chalk = require('chalk');
const readline = require('readline');

// ── Palette (matches project tokens) ─────────────────────────────────────────
const c = {
  teal:      chalk.hex('#0f766e'),
  tealBright:chalk.hex('#0d9488'),
  yellow:    chalk.hex('#FACC15'),
  green:     chalk.green,
  red:       chalk.red,
  gray:      chalk.gray,
  dim:       chalk.dim,
  bold:      chalk.bold,
  white:     chalk.white,
};

// ── Box-drawing ───────────────────────────────────────────────────────────────
const B = {
  h:'─', v:'│',
  tl:'┌', tr:'┐', bl:'└', br:'┘',
  ml:'├', mr:'┤',
};

function termWidth() {
  return Math.min(process.stdout.columns || 80, 110);
}

function hLine(w, left, fill, right) {
  return (left||B.tl) + (fill||B.h).repeat(w - 2) + (right||B.tr);
}

// Strip ANSI codes to get visual length
function visLen(str) {
  return str.replace(/\x1B\[[0-9;]*m/g, '').length;
}

function padCenter(str, w) {
  const len = visLen(str);
  const pad = Math.max(0, Math.floor((w - len) / 2));
  const rpad = Math.max(0, w - len - pad);
  return ' '.repeat(pad) + str + ' '.repeat(rpad);
}

// ── Layout blocks ─────────────────────────────────────────────────────────────
function clear() {
  process.stdout.write('\x1Bc');
}

const LOGO = [
  '  ██╗   ██╗███╗   ██╗██╗ ██████╗ ███████╗ █████╗ ██████╗ ',
  '  ██║   ██║████╗  ██║██║██╔════╝ ██╔════╝██╔══██╗██╔══██╗',
  '  ██║   ██║██╔██╗ ██║██║██║  ███╗█████╗  ███████║██████╔╝',
  '  ██║   ██║██║╚██╗██║██║██║   ██║██╔══╝  ██╔══██║██╔══██╗',
  '  ╚██████╔╝██║ ╚████║██║╚██████╔╝███████╗██║  ██║██║  ██║',
  '   ╚═════╝ ╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝',
];

function header() {
  const w      = termWidth();
  const tag    = ' ADMIN TUI ';
  const fillW  = Math.max(2, w - tag.length - 1);

  console.log('');
  LOGO.forEach(l => console.log(c.teal(l)));
  console.log(c.teal(B.h.repeat(fillW)) + c.tealBright.bold(tag));
}

function footer(status = {}) {
  const w   = termWidth();
  const now = new Date().toLocaleString('es-ES');
  const srv = status.server ? c.green('● ACTIVO')    : c.red('○ INACTIVO');
  const db  = status.db     ? c.green('● CONECTADA') : c.red('○ ERROR');

  console.log('');
  console.log(c.teal(hLine(w, B.ml, B.h, B.mr)));
  console.log(`  Servidor: ${srv}    DB: ${db}    ${c.dim(now)}`);
  console.log(c.teal(hLine(w, B.bl, B.h, B.br)));
}

function section(title) {
  const w   = termWidth();
  const str = ` ${title} `;
  const pad = Math.max(1, Math.floor((w - str.length) / 2));
  const rpad = Math.max(1, w - str.length - pad);
  console.log('\n' +
    c.teal(B.ml + B.h.repeat(pad - 1)) +
    c.tealBright.bold(str) +
    c.teal(B.h.repeat(rpad - 1) + B.mr));
}

// ── Status messages ───────────────────────────────────────────────────────────
function success(msg) {
  console.log('\n' + chalk.bgGreen.black(' ✓ ') + ' ' + chalk.green(msg));
}

function error(msg) {
  console.log('\n' + chalk.bgRed.white(' ✗ ') + ' ' + chalk.red(msg));
}

function info(msg) {
  console.log('\n' + c.teal('ℹ') + ' ' + c.teal(msg));
}

function warn(msg) {
  console.log('\n' + chalk.hex('#FACC15')('⚠') + ' ' + chalk.hex('#FACC15')(msg));
}

// ── Pause ─────────────────────────────────────────────────────────────────────
function press(msg) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(c.dim(`\n  ${msg || 'Presiona ENTER para continuar...'}`), () => {
      rl.close();
      resolve();
    });
  });
}

module.exports = { c, B, termWidth, hLine, visLen, padCenter, clear, header, footer, section, success, error, info, warn, press };
