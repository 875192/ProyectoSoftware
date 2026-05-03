import { auth } from '../../nucleo/auth.js';

const MENU_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: 'paneles/panel-staff/panel_staff.html',
    icon: '<path d="M3 12L12 3l9 9"/><path d="M5 10v10h14V10"/>',
  },
  {
    id: 'solicitudes',
    label: 'Solicitudes',
    href: 'solicitudes-prestamo/gestion-solicitudes/gestion_solicitudes.html',
    icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
  },
  {
    id: 'prestamos',
    label: 'Entregas y Devoluciones',
    href: 'prestamos/gestion-prestamos/gestion_prestamos.html',
    icon: '<path d="M4 10a4 4 0 014-4h8a4 4 0 014 4v10H4V10z"/><path d="M9 6V5a3 3 0 016 0v1"/><line x1="4" y1="15" x2="20" y2="15"/>',
  },
  {
    id: 'inventario',
    label: 'Inventario',
    href: 'inventario/listado-inventario/listado_inventario.html',
    icon: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  },
];

const ACCOUNT_ITEMS = [
  {
    id: 'perfil',
    label: 'Mi Perfil',
    href: 'usuarios/perfil/perfil_staff.html',
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
      <a class="brand" href="${basePath}/paneles/panel-staff/panel_staff.html">
        <span class="brand-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10H4V10z"/>
            <path d="M9 6V5a3 3 0 0 1 6 0v1"/>
            <line x1="4" y1="15" x2="20" y2="15"/>
          </svg>
        </span>
        <span class="brand-name">UNIGear Staff</span>
      </a>

      <nav class="menu" aria-label="Páginas">
        <div class="menu-label">Gestión</div>
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
