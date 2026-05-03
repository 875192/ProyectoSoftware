import { auth } from '../../compartido/nucleo/auth.js';
import { api } from '../../compartido/nucleo/api.js';
import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar-staff.js';

const currentUser = auth.requireAuth(['personal_gestion']);
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

function estadoSolicitudLabel(estado) {
  const map = {
    pendiente: 'Pendiente',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    cancelada: 'Cancelada',
    en_espera: 'En espera',
    expirada: 'Expirada',
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

const SOLICITUD_ICONS = [
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0M12 17v4M8 21h8"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a4 4 0 014-4h8a4 4 0 014 4v10H4V10z"/><path d="M9 6V5a3 3 0 016 0v1"/><line x1="4" y1="15" x2="20" y2="15"/></svg>`,
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="4"/></svg>`,
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

function renderSolicitudes(solicitudes) {
  const grid = document.getElementById('solicitudesGrid');
  const newBtn = grid.querySelector('.project-new');

  if (!solicitudes.length) {
    const empty = document.createElement('div');
    empty.className = 'project-empty';
    empty.textContent = 'No hay solicitudes recientes.';
    grid.insertBefore(empty, newBtn);
    return;
  }

  const cards = solicitudes.slice(0, 3).map((s, i) => {
    const variant = PROJECT_VARIANTS[i % PROJECT_VARIANTS.length];
    const icon = SOLICITUD_ICONS[i % SOLICITUD_ICONS.length];
    const estadoLabel = estadoSolicitudLabel(s.status);
    const fechaInfo = s.fechaSolicitud
      ? `Solicitado el ${formatDate(s.fechaSolicitud)}`
      : `Inicio: ${formatDate(s.startDate)}`;

    return `
      <div class="project ${variant}">
        <div class="project-img">${icon}</div>
        <div class="project-tag">Solicitud #${s.id}</div>
        <div class="project-title">${s.materialName}</div>
        <div class="project-desc">${s.usuarioNombre ? s.usuarioNombre + ' · ' : ''}${fechaInfo}</div>
        <div class="project-footer">
          <a class="project-btn" href="../../solicitudes-prestamo/gestion-solicitudes/gestion_solicitudes.html">VER</a>
          <span class="project-estado estado-${s.status}">${estadoLabel}</span>
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
    const [profile, notifs, solicitudes] = await Promise.all([
      api.getProfile(currentUser.id),
      api.getNotificaciones(currentUser.id),
      api.getSolicitudesStaff().catch(() => []),
    ]);

    renderProfile(profile);
    renderNotificaciones(notifs);
    renderSolicitudes(solicitudes);
  } catch (err) {
    console.error('Error cargando perfil:', err);
  }
})();
