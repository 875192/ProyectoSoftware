/* =============================================================
   Sidebar compartido — usuario (estudiante / profesor).
   Uso:
     import { mountSidebar } from '<rel>/compartido/componentes-ui/sidebar/sidebar.js';
     mountSidebar({ activePage: 'dashboard', basePath: '../..' });

   - basePath: prefijo para resolver rutas desde la página actual hasta
     Frontend/src/. Por ejemplo, una página en
     Frontend/src/paneles/panel-usuario/ usa '../..'.
   - activePage: id del item a marcar (ver MENU_ITEMS más abajo).
   ============================================================= */

import { auth } from '../../nucleo/auth.js';

const MENU_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: 'paneles/panel-usuario/panel_usuarios.html',
    icon: '<path d="M3 12L12 3l9 9"/><path d="M5 10v10h14V10"/>',
  },
  {
    id: 'catalogo',
    label: 'Catálogo',
    href: 'catalogo/listado-materiales/listado_materiales.html',
    icon: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  },
  {
    id: 'solicitudes',
    label: 'Mis Solicitudes',
    href: 'solicitudes-prestamo/mis-solicitudes/mis_solicitudes.html',
    icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
  },
  {
    id: 'prestamos',
    label: 'Mis Préstamos',
    href: 'prestamos/mis-prestamos/mis_prestamos.html',
    icon: '<path d="M4 10a4 4 0 014-4h8a4 4 0 014 4v10H4V10z"/><path d="M9 6V5a3 3 0 016 0v1"/><line x1="4" y1="15" x2="20" y2="15"/>',
  },
  {
    id: 'sanciones',
    label: 'Sanciones',
    href: 'sanciones/mis-sanciones/mis_sanciones.html',
    icon: '<rect x="3" y="3" width="18" height="18" rx="3"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>',
  },
  {
    id: 'pagos',
    label: 'Pagos',
    href: 'pagos/historial-pagos/historial_pagos.html',
    icon: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="15" r="1.5" fill="currentColor"/>',
  },
  {
    id: 'incidencias',
    label: 'Reportar incidencia',
    href: 'incidencias/reportar-incidencia/reportar_incidencia.html',
    icon: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>',
  },
  {
    id: 'notificaciones',
    label: 'Notificaciones',
    href: 'notificaciones/bandeja-notificaciones/notificaciones_usuario.html',
    icon: '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
  },
];

const ACCOUNT_ITEMS = [
  {
    id: 'perfil',
    label: 'Mi Perfil',
    href: 'usuarios/perfil/perfil_usuario.html',
    icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0114 0v1"/>',
  },
];

function svg(content) {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
}

function renderItem(item, basePath, activePage) {
  const isActive = item.id === activePage;
  const aria = isActive ? ' aria-current="page"' : '';
  return `
    <a class="menu-item" href="${basePath}/${item.href}"${aria}>
      <span class="icon-box">${svg(item.icon)}</span>
      ${item.label}
    </a>`;
}

function ensureStylesheet(basePath) {
  const href = `${basePath}/compartido/componentes-ui/sidebar/sidebar.css`;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function ensureTokens(basePath) {
  const href = `${basePath}/compartido/estilos-base/tokens.css`;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  // Tokens deben ir antes que cualquier otro estilo de página.
  document.head.insertBefore(link, document.head.firstChild);
}

export function mountSidebar({ activePage = '', basePath = '../..' } = {}) {
  ensureTokens(basePath);
  ensureStylesheet(basePath);

  const html = `
    <button class="app-sidebar-toggle" type="button" aria-label="Abrir menú" aria-controls="appSidebar" aria-expanded="false">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    </button>
    <div class="app-sidebar-backdrop" hidden></div>
    <aside class="app-sidebar" id="appSidebar" aria-label="Navegación principal">
      <a class="brand" href="${basePath}/paneles/panel-usuario/panel_usuarios.html">
        <span class="brand-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10H4V10z"/>
            <path d="M9 6V5a3 3 0 0 1 6 0v1"/>
            <line x1="4" y1="15" x2="20" y2="15"/>
          </svg>
        </span>
        <span class="brand-name">UNIGear</span>
      </a>

      <nav class="menu" aria-label="Páginas">
        <div class="menu-label">Páginas</div>
        ${MENU_ITEMS.map((item) => renderItem(item, basePath, activePage)).join('')}
        <div class="menu-label">Mi cuenta</div>
        ${ACCOUNT_ITEMS.map((item) => renderItem(item, basePath, activePage)).join('')}
      </nav>

      <button class="logout" type="button" data-action="logout">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Cerrar sesión
      </button>
    </aside>`;

  const mount = document.createElement('div');
  mount.innerHTML = html;
  document.body.prepend(mount);

  const sidebar = document.getElementById('appSidebar');
  const toggle = document.querySelector('.app-sidebar-toggle');
  const backdrop = document.querySelector('.app-sidebar-backdrop');

  const setOpen = (open) => {
    sidebar.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-open', open);
    backdrop.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
  backdrop.addEventListener('click', () => setOpen(false));

  sidebar.querySelector('[data-action="logout"]').addEventListener('click', () => {
    auth.logout();
  });
}
