import { auth } from '../../compartido/nucleo/auth.js';
import { api } from '../../compartido/nucleo/api.js';
import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar-staff.js';

const user = auth.requireAuth(['personal_gestion']);
if (!user) throw new Error('No autenticado');

mountSidebar({ activePage: 'solicitudes', basePath: '../..' });

// Topbar
const topbar = document.getElementById('topbar');
const sentinel = document.getElementById('topbar-sentinel');
new IntersectionObserver(([e]) => topbar.classList.toggle('scrolled', !e.isIntersecting)).observe(sentinel);

// Leer filtro inicial desde URL
const urlParams = new URLSearchParams(location.search);
let filtroActual = urlParams.get('estado') || '';
let busqueda = '';
let solicitudes = [];
let pendingModal = null;

const toast = document.getElementById('toast');
let toastTimer;
function showToast(msg, ok = true) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = `toast show ${ok ? 'ok' : 'err'}`;
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day:'2-digit', month:'short' });
}

function estadoPill(estado) {
  const labels = { pendiente:'Pendiente', aprobada:'Aprobada', rechazada:'Rechazada', en_espera:'En espera', cancelada:'Cancelada', expirada:'Expirada', en_prestamo:'En préstamo', finalizada:'Finalizada' };
  return `<span class="pill pill-${estado}">${labels[estado] || estado}</span>`;
}

function prioridadPill(p) {
  return `<span class="pill pill-${p}">${p === 'alta' ? 'Alta' : 'Normal'}</span>`;
}

function accionesPorEstado(s) {
  if (s.status === 'pendiente' || s.status === 'en_espera') {
    return `<button class="btn-action btn-aprobar" data-id="${s.id}" data-action="aprobar">Aprobar</button>
            <button class="btn-action btn-rechazar" data-id="${s.id}" data-action="rechazar">Rechazar</button>`;
  }
  if (s.status === 'aprobada') {
    return `<a class="btn-action btn-neutral" href="../../prestamos/gestion-prestamos/gestion_prestamos.html">Gestionar entrega</a>
            <button class="btn-action btn-rechazar" data-id="${s.id}" data-action="rechazar">Rechazar</button>`;
  }
  return `<span style="color:var(--text-muted);font-size:12px;">—</span>`;
}

function renderTabla(lista) {
  const cont = document.getElementById('tablaContainer');
  if (lista.length === 0) {
    cont.innerHTML = `<div class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      No hay solicitudes para este filtro
    </div>`;
    return;
  }
  cont.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Solicitante</th>
          <th>Material</th>
          <th>Fechas</th>
          <th>Estado</th>
          <th>Prioridad</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${lista.map((s, i) => `
          <tr style="animation-delay:${i * 30}ms">
            <td><span class="id-badge">#${s.id}</span></td>
            <td>
              <div class="user-cell">
                <div class="avatar">${initials(s.usuarioNombre)}</div>
                <div>
                  <div class="u-name">${s.usuarioNombre || '—'}</div>
                  <div class="u-email">${s.usuarioEmail || ''}</div>
                </div>
              </div>
            </td>
            <td>${s.materialName}<br><span style="font-size:11px;color:var(--text-muted)">${s.categoria}</span></td>
            <td><span class="fecha-rango">${fmtDate(s.startDate)} → ${fmtDate(s.endDate)}</span></td>
            <td>${estadoPill(s.status)}</td>
            <td>${prioridadPill(s.prioridad)}</td>
            <td><div class="actions-cell">${accionesPorEstado(s)}</div></td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  cont.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => abrirModal(btn.dataset.id, btn.dataset.action));
  });
}

function filtrar() {
  let lista = solicitudes;
  if (filtroActual) lista = lista.filter(s => s.status === filtroActual);
  if (busqueda) {
    const q = busqueda.toLowerCase();
    lista = lista.filter(s =>
      (s.usuarioNombre || '').toLowerCase().includes(q) ||
      (s.materialName  || '').toLowerCase().includes(q) ||
      String(s.id).includes(q)
    );
  }
  renderTabla(lista);
}

function renderSummary() {
  const total     = solicitudes.length;
  const pendientes= solicitudes.filter(s=>s.status==='pendiente').length;
  const aprobadas = solicitudes.filter(s=>s.status==='aprobada').length;
  document.getElementById('summary').innerHTML = `
    <div class="sum-chip"><div class="sum-chip-label">Total</div><div class="sum-chip-value">${total}</div></div>
    <div class="sum-chip"><div class="sum-chip-label">Pendientes</div><div class="sum-chip-value">${pendientes}</div></div>
    <div class="sum-chip"><div class="sum-chip-label">Aprobadas</div><div class="sum-chip-value">${aprobadas}</div></div>`;
}

// Filtros
document.getElementById('filtros').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filtroActual = btn.dataset.estado;
  filtrar();
});

// Buscar
document.getElementById('search').addEventListener('input', e => {
  busqueda = e.target.value.trim();
  filtrar();
});

// Set filtro activo desde URL
if (filtroActual) {
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.estado === filtroActual);
  });
}

// Modal
const overlay  = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalBody  = document.getElementById('modalBody');
const modalFooter= document.getElementById('modalFooter');
document.getElementById('modalClose').addEventListener('click', cerrarModal);
overlay.addEventListener('click', e => { if (e.target === overlay) cerrarModal(); });

function cerrarModal() {
  overlay.hidden = true;
  pendingModal = null;
}

function abrirModal(id, accion) {
  const sol = solicitudes.find(s => s.id === id);
  if (!sol) return;
  pendingModal = { id, accion };

  if (accion === 'aprobar') {
    modalTitle.textContent = `Aprobar solicitud #${id}`;
    modalBody.innerHTML = `<p>¿Confirmas la aprobación de la solicitud de <strong>${sol.usuarioNombre || sol.userId}</strong> para <strong>${sol.materialName}</strong>?</p>
      <p style="font-size:12px;color:var(--text-muted)">La unidad de inventario se asignará al registrar la entrega física.</p>`;
    modalFooter.innerHTML = `
      <button class="btn-ghost" id="btnCancelarModal">Cancelar</button>
      <button class="btn-primary" id="btnConfirmarModal">Aprobar</button>`;
  } else {
    modalTitle.textContent = `Rechazar solicitud #${id}`;
    modalBody.innerHTML = `<p>Indica el motivo del rechazo de la solicitud de <strong>${sol.usuarioNombre || sol.userId}</strong>.</p>
      <label for="motivoRechazo">Motivo del rechazo</label>
      <textarea id="motivoRechazo" placeholder="Describe el motivo..."></textarea>`;
    modalFooter.innerHTML = `
      <button class="btn-ghost" id="btnCancelarModal">Cancelar</button>
      <button class="btn-danger" id="btnConfirmarModal">Rechazar</button>`;
  }

  overlay.hidden = false;
  overlay.querySelector('textarea, select, button')?.focus();

  document.getElementById('btnCancelarModal').addEventListener('click', cerrarModal);
  document.getElementById('btnConfirmarModal').addEventListener('click', confirmarModal);
}

async function confirmarModal() {
  if (!pendingModal) return;
  const { id, accion } = pendingModal;

  if (accion === 'aprobar') {
    try {
      await api.aprobarSolicitud(id, user.id);
      cerrarModal();
      showToast('Solicitud aprobada correctamente');
      await cargarSolicitudes();
    } catch (e) {
      showToast(e.message || 'Error al aprobar', false);
    }
  } else {
    const motivo = document.getElementById('motivoRechazo')?.value.trim();
    if (!motivo) { showToast('El motivo es obligatorio', false); return; }
    try {
      await api.rechazarSolicitud(id, user.id, motivo);
      cerrarModal();
      showToast('Solicitud rechazada');
      await cargarSolicitudes();
    } catch (e) {
      showToast(e.message || 'Error al rechazar', false);
    }
  }
}

async function cargarSolicitudes() {
  solicitudes = await api.getSolicitudesStaff();
  renderSummary();
  filtrar();
}

cargarSolicitudes().catch(e => {
  console.error(e);
  document.getElementById('tablaContainer').innerHTML = '<div class="empty-state">Error al cargar solicitudes</div>';
});