import { auth } from '../../compartido/nucleo/auth.js';
  import { api } from '../../compartido/nucleo/api.js';
  import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar.js';
  const currentUser = auth.requireAuth(['estudiante', 'profesor']);
  mountSidebar({ activePage: 'notificaciones', basePath: '../..' });

  window.__api = api;
  window.__currentUser = currentUser;

// Las notificaciones se cargan async desde el backend
  let notifications = [];
  let anchor = new Date();

  (async function init() {
    const currentUser = window.__currentUser;
    const api = window.__api;

    if (currentUser && api) {
      try {
        const data = await api.getNotificaciones(currentUser.id);
        anchor = new Date();
        notifications = data.map(n => ({
          id: n.id,
          tipo: n.category || 'sistema',
          titulo: n.title,
          texto: n.message,
          fecha: n.createdAt ? new Date(n.createdAt) : new Date(),
          leida: !!n.read
        }));
      } catch (err) {
        console.error('Error cargando notificaciones:', err);
        notifications = [];
      }
    }
    render();
  })();

  // ===== DATOS =====
  const typeIcons = {
    solicitud:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
    prestamo:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a4 4 0 014-4h8a4 4 0 014 4v10H4V10z"/><path d="M9 6V5a3 3 0 016 0v1"/><line x1="4" y1="15" x2="20" y2="15"/></svg>',
    devolucion: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9"/><polyline points="3 4 3 12 11 12"/></svg>',
    sancion:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.86l-8.22 14.2A2 2 0 003.8 21h16.4a2 2 0 001.72-2.94l-8.22-14.2a2 2 0 00-3.4 0z"/></svg>',
    sistema:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
  };

  let activeFilter = 'todas';

  function formatRelative(fecha) {
    const diffMs = anchor - fecha;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins} min`;
    const hs = Math.floor(mins / 60);
    if (hs < 24) return `hace ${hs} h`;
    const ds = Math.floor(hs / 24);
    if (ds === 1) return 'ayer';
    if (ds < 7) return `hace ${ds} d`;
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }

  function updateCounts() {
    const unread = notifications.filter(n => !n.leida).length;
    document.getElementById('unreadCount').textContent = unread;
    document.getElementById('c-todas').textContent = notifications.length;
    document.getElementById('c-no_leidas').textContent = unread;
    const side = document.getElementById('sideUnread');
    if (side) {
      if (unread > 0) { side.textContent = unread; side.style.display = ''; }
      else { side.style.display = 'none'; }
    }
  }

  function renderList() {
    const items = notifications
      .filter(n => activeFilter === 'todas' || !n.leida)
      .sort((a, b) => b.fecha - a.fecha);

    const host = document.getElementById('list');

    if (items.length === 0) {
      host.innerHTML = `
        <div class="empty">
          <div class="empty-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>
            </svg>
          </div>
          <div class="empty-title">Todo al día</div>
          <div class="empty-desc">No tienes notificaciones ${activeFilter === 'no_leidas' ? 'sin leer' : ''}.</div>
        </div>`;
      return;
    }

    host.innerHTML = items.map(n => `
      <article class="notif t-${n.tipo} ${n.leida ? '' : 'unread'}" data-id="${n.id}">
        <div class="notif-icon">${typeIcons[n.tipo]}</div>
        <div class="notif-body">
          <div class="notif-title">${n.titulo}</div>
          <div class="notif-text">${n.texto}</div>
        </div>
        <div class="notif-side">
          <span class="notif-time">${formatRelative(n.fecha)}</span>
          <button class="icon-btn" data-action="delete" data-id="${n.id}" title="Eliminar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>
      </article>
    `).join('');

    host.querySelectorAll('.notif').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const id = el.dataset.id;
        const n = notifications.find(x => x.id === id);
        if (n && !n.leida) { n.leida = true; render(); }
      });
    });
    host.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const i = notifications.findIndex(x => x.id === id);
        if (i !== -1) notifications.splice(i, 1);
        render();
      });
    });
  }

  function render() {
    updateCounts();
    renderList();
  }

  document.querySelectorAll('#tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#tabs .tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.dataset.filter;
      renderList();
    });
  });

  document.getElementById('markAllReadBtn').addEventListener('click', () => {
    notifications.forEach(n => n.leida = true);
    render();
  });

  render();