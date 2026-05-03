import { auth } from '../../compartido/nucleo/auth.js';
import { api } from '../../compartido/nucleo/api.js';
import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar.js';

const currentUser = auth.requireAuth(['estudiante', 'profesor']);
mountSidebar({ activePage: 'perfil', basePath: '../..' });

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
}

function rolLabel(rol) {
  const map = {
    estudiante: 'Estudiante',
    profesor: 'Profesor',
    personal_gestion: 'Personal de gestión',
    mantenimiento: 'Mantenimiento',
    admin: 'Administrador',
  };
  return map[rol] || rol;
}

function estadoLabel(estado) {
  const map = {
    activo: 'Activo',
    devuelto: 'Devuelto',
    vencido: 'Vencido',
    perdido: 'Perdido',
  };
  return map[estado] || estado;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function notifCategoryLabel(category) {
  const map = {
    solicitud: 'Solicitud',
    devolucion: 'Devolución',
    sancion: 'Sanción',
    sistema: 'Sistema',
  };
  return map[category] || 'Sistema';
}

const AVATAR_COLORS = ['av-1', 'av-2', 'av-3', 'av-4', 'av-5'];
const PROJECT_VARIANTS = ['v1', 'v2', 'v3', 'v4', 'v5'];

// Generic material SVG icons based on category name or index
const MATERIAL_ICONS = [
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M10 17v4M14 17v4"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="4"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0M12 17v4M8 21h8"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z"/></svg>`,
];

// ── Render functions ──────────────────────────────────────────────────────────

function renderProfile(profile) {
  const nombre = profile.nombre_completo || currentUser.name || '—';
  const email = profile.email_institucional || currentUser.email || '—';
  const rol = profile.rol_nombre || currentUser.role || '—';

  document.getElementById('profileAvatar').childNodes[0].textContent = initials(nombre) + '\n        ';
  document.getElementById('profileName').textContent = nombre;
  document.getElementById('profileEmail').textContent = `${email} · ${rolLabel(rol)}`;

  document.getElementById('infoBio').textContent = profile.bio || 'Sin descripción de perfil.';
  document.getElementById('infoNombre').textContent = nombre;
  document.getElementById('infoTelefono').textContent = profile.telefono || 'No registrado';
  document.getElementById('infoEmail').textContent = email;
  document.getElementById('infoRol').textContent = rolLabel(rol);
  document.getElementById('infoFecha').textContent = formatDate(profile.created_at);
}

function renderNotificaciones(notifs) {
  const list = document.getElementById('notifList');
  if (!notifs.length) {
    list.innerHTML = '<div class="notif-empty">Sin notificaciones recientes.</div>';
    return;
  }
  list.innerHTML = notifs.slice(0, 5).map((n, i) => {
    const avClass = AVATAR_COLORS[i % AVATAR_COLORS.length];
    const label = notifCategoryLabel(n.category);
    const abbr = label.slice(0, 2).toUpperCase();
    const unread = !n.read ? ' notif-unread' : '';
    return `
      <div class="notif-item${unread}" data-id="${n.id}">
        <div class="notif-avatar ${avClass}">${abbr}</div>
        <div class="notif-meta">
          <div class="notif-who">${label}</div>
          <div class="notif-msg">${n.title || n.message}</div>
        </div>
        <button class="notif-action" data-notif-id="${n.id}">VER</button>
      </div>`;
  }).join('');

  list.querySelectorAll('[data-notif-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const nid = btn.dataset.notifId;
      await api.markNotificacionRead(nid, currentUser.id).catch(() => {});
      btn.closest('.notif-item').classList.remove('notif-unread');
      window.location.href = '../../notificaciones/bandeja-notificaciones/notificaciones_usuario.html';
    });
  });
}

function renderPrestamos(prestamos) {
  const grid = document.getElementById('prestamosGrid');
  const newBtn = grid.querySelector('.project-new');

  if (!prestamos.length) {
    const empty = document.createElement('div');
    empty.className = 'project-empty';
    empty.textContent = 'Aún no tienes préstamos.';
    grid.insertBefore(empty, newBtn);
    return;
  }

  const cards = prestamos.slice(0, 3).map((p, i) => {
    const variant = PROJECT_VARIANTS[i % PROJECT_VARIANTS.length];
    const icon = MATERIAL_ICONS[i % MATERIAL_ICONS.length];
    const estado = estadoLabel(p.estado);
    const fechaDev = p.fechaDevolucionReal
      ? `Devuelto el ${formatDate(p.fechaDevolucionReal)}`
      : `Vence el ${formatDate(p.fechaDevolucionPrevista)}`;

    return `
      <div class="project ${variant}">
        <div class="project-img">${icon}</div>
        <div class="project-tag">Préstamo #${p.id}</div>
        <div class="project-title">${p.materialName}</div>
        <div class="project-desc">${p.categoria ? p.categoria + ' · ' : ''}${fechaDev}</div>
        <div class="project-footer">
          <button class="project-btn">VER DETALLE</button>
          <span class="project-estado estado-${p.estado}">${estado}</span>
        </div>
      </div>`;
  });

  grid.insertAdjacentHTML('afterbegin', cards.join(''));
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
  });
});

// ── Init ──────────────────────────────────────────────────────────────────────

(async function init() {
  try {
    const [profile, notifs, prestamos] = await Promise.all([
      api.getProfile(currentUser.id),
      api.getNotificaciones(currentUser.id),
      api.getPrestamos(currentUser.id),
    ]);

    renderProfile(profile);
    renderNotificaciones(notifs);
    renderPrestamos(prestamos);
  } catch (err) {
    console.error('Error cargando perfil:', err);
  }
})();
