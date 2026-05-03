import { auth } from '../../compartido/nucleo/auth.js';
import { api } from '../../compartido/nucleo/api.js';
import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar-staff.js';

const user = auth.requireAuth(['personal_gestion']);
if (!user) throw new Error('No autenticado');

mountSidebar({ activePage: 'dashboard', basePath: '../..' });

// Topbar scroll shadow
const topbar = document.getElementById('topbar');
const sentinel = document.getElementById('topbar-sentinel');
new IntersectionObserver(([e]) => topbar.classList.toggle('scrolled', !e.isIntersecting)).observe(sentinel);

// Stat card tilt
document.querySelectorAll('.stat-card[data-tilt]').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    card.style.setProperty('--tilt-x', `${(-y * 5).toFixed(1)}deg`);
    card.style.setProperty('--tilt-y', `${(x * 5).toFixed(1)}deg`);
    card.style.setProperty('--lift', '-3px');
    card.style.setProperty('--mx', `${((e.clientX-r.left)/r.width*100).toFixed(1)}%`);
    card.style.setProperty('--my', `${((e.clientY-r.top)/r.height*100).toFixed(1)}%`);
  });
  card.addEventListener('mouseleave', () => {
    card.style.setProperty('--tilt-x','0deg');
    card.style.setProperty('--tilt-y','0deg');
    card.style.setProperty('--lift','0px');
  });
});

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
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
}

function estadoPill(estado) {
  const label = {
    pendiente:'Pendiente', aprobada:'Aprobada', rechazada:'Rechazada',
    en_espera:'En espera', cancelada:'Cancelada', expirada:'Expirada',
    en_prestamo:'En préstamo', finalizada:'Finalizada',
  }[estado] || estado;
  return `<span class="pill pill-${estado}">${label}</span>`;
}

let solicitudes = [];
let prestamos   = [];

async function cargarDatos() {
  const [sols, pres] = await Promise.all([
    api.getSolicitudesStaff(),
    api.getPrestamosStaff(),
  ]);
  solicitudes = sols;
  prestamos   = pres;

  const hoy = new Date().toISOString().slice(0,10);
  const pendientes   = sols.filter(s => s.status === 'pendiente');
  const activos      = pres.filter(p => p.estado === 'activo' || p.estado === 'retrasado');
  const devHoy       = activos.filter(p => p.fechaDevolucionPrevista && p.fechaDevolucionPrevista.slice(0,10) === hoy);
  const enEspera     = sols.filter(s => s.status === 'en_espera');
  const aprobadas    = sols.filter(s => s.status === 'aprobada');

  document.getElementById('statPendientes').textContent  = pendientes.length;
  document.getElementById('statActivos').textContent     = activos.length;
  document.getElementById('statDevoluciones').textContent= devHoy.length;
  document.getElementById('statEspera').textContent      = enEspera.length;

  renderTablaSolicitudes(pendientes.slice(0,8));
  renderEntregas(aprobadas.slice(0,5));
}

function renderTablaSolicitudes(lista) {
  const cont = document.getElementById('tablaSolicitudes');
  if (lista.length === 0) {
    cont.innerHTML = '<div class="empty-state">No hay solicitudes pendientes</div>';
    return;
  }
  cont.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Solicitante</th>
          <th>Material</th>
          <th>Fecha sol.</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${lista.map(s => `
          <tr>
            <td>
              <div class="user-cell">
                <div class="avatar">${initials(s.usuarioNombre)}</div>
                <div>
                  <div class="user-name">${s.usuarioNombre || '—'}</div>
                  <div class="user-email">${s.usuarioEmail || ''}</div>
                </div>
              </div>
            </td>
            <td>${s.materialName}</td>
            <td>${fmtDate(s.fechaSolicitud)}</td>
            <td>${estadoPill(s.status)}</td>
            <td>
              <div class="actions-cell">
                <button class="btn-icon approve" title="Aprobar" data-id="${s.id}" data-action="aprobar">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
                <button class="btn-icon reject" title="Rechazar" data-id="${s.id}" data-action="rechazar">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  cont.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => accionSolicitud(btn.dataset.id, btn.dataset.action));
  });
}

function renderEntregas(aprobadas) {
  const cont = document.getElementById('listaEntregas');
  if (aprobadas.length === 0) {
    cont.innerHTML = '<div class="empty-state">No hay entregas pendientes</div>';
    return;
  }
  cont.innerHTML = aprobadas.map(s => `
    <div class="entrega-row">
      <div class="entrega-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a4 4 0 014-4h8a4 4 0 014 4v10H4V10z"/><path d="M9 6V5a3 3 0 016 0v1"/><line x1="4" y1="15" x2="20" y2="15"/></svg>
      </div>
      <div class="entrega-meta">
        <div class="entrega-name">${s.materialName}</div>
        <div class="entrega-sub">${s.usuarioNombre || '—'} · desde ${fmtDate(s.startDate)}</div>
      </div>
      <a href="../../prestamos/gestion-prestamos/gestion_prestamos.html" class="btn-sm">Entregar</a>
    </div>
  `).join('');
}

async function accionSolicitud(id, accion) {
  if (accion === 'aprobar') {
    if (!confirm('¿Aprobar esta solicitud?')) return;
    try {
      await api.aprobarSolicitud(id, user.id);
      showToast('Solicitud aprobada correctamente');
      await cargarDatos();
    } catch (e) {
      showToast(e.message || 'Error al aprobar', false);
    }
  } else {
    const motivo = prompt('Motivo del rechazo (obligatorio):');
    if (!motivo || !motivo.trim()) return;
    try {
      await api.rechazarSolicitud(id, user.id, motivo.trim());
      showToast('Solicitud rechazada');
      await cargarDatos();
    } catch (e) {
      showToast(e.message || 'Error al rechazar', false);
    }
  }
}

cargarDatos().catch(e => {
  console.error(e);
  showToast('Error al cargar los datos', false);
});

// --- Modal nueva sanción ---
const modalOverlay = document.getElementById('modalOverlay');
const formSancion  = document.getElementById('formSancion');
const sUsuario     = document.getElementById('sUsuario');
const sFechaInicio = document.getElementById('sFechaInicio');

sFechaInicio.value = new Date().toISOString().slice(0, 10);

async function abrirModal() {
  modalOverlay.classList.add('open');
  if (sUsuario.options.length <= 1) {
    try {
      const usuarios = await api.getUsuarios();
      const filtrables = ['estudiante', 'profesor'];
      sUsuario.innerHTML = '<option value="">Selecciona un usuario…</option>' +
        usuarios
          .filter(u => filtrables.includes(u.rol))
          .map(u => `<option value="${u.id}">${u.nombre_completo} — ${u.email_institucional}</option>`)
          .join('');
    } catch {
      sUsuario.innerHTML = '<option value="">Error al cargar usuarios</option>';
    }
  }
}

function cerrarModal() {
  modalOverlay.classList.remove('open');
  formSancion.reset();
  sFechaInicio.value = new Date().toISOString().slice(0, 10);
}

document.getElementById('btnNuevaSancion').addEventListener('click', abrirModal);
document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) cerrarModal(); });

formSancion.addEventListener('submit', async e => {
  e.preventDefault();
  const usuarioId = sUsuario.value;
  const motivo    = document.getElementById('sMotivo').value.trim();
  const importeEuros = parseFloat(document.getElementById('sImporte').value);
  const fechaInicio  = sFechaInicio.value;

  if (!usuarioId || !motivo || !importeEuros || !fechaInicio) {
    showToast('Completa todos los campos obligatorios', false);
    return;
  }

  const btn = document.getElementById('btnGuardar');
  btn.disabled = true;
  btn.textContent = 'Guardando…';

  try {
    await api.createSancion({
      usuarioId,
      tipo:           document.getElementById('sTipo').value,
      motivo,
      importeCentimos: Math.round(importeEuros * 100),
      fechaInicio,
      fechaFin:       document.getElementById('sFechaFin').value || null,
      prestamoId:     document.getElementById('sPrestamo').value || null,
      creadaPor:      user.id,
    });
    cerrarModal();
    showToast('Sanción creada correctamente');
  } catch (err) {
    showToast(err.message || 'Error al crear la sanción', false);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Crear sanción';
  }
});