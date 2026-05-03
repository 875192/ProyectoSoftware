import { auth } from '../../compartido/nucleo/auth.js';
import { api } from '../../compartido/nucleo/api.js';
import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar-staff.js';

const user = auth.requireAuth(['personal_gestion']);
if (!user) throw new Error('No autenticado');

mountSidebar({ activePage: 'prestamos', basePath: '../..' });

const topbar = document.getElementById('topbar');
const sentinel = document.getElementById('topbar-sentinel');
new IntersectionObserver(([e]) => topbar.classList.toggle('scrolled', !e.isIntersecting)).observe(sentinel);

const toast = document.getElementById('toast');
let toastTimer;
function showToast(msg, ok=true) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = `toast show ${ok?'ok':'err'}`;
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
}

function isRetrasado(p) {
  if (!p.fechaDevolucionPrevista) return false;
  return new Date(p.fechaDevolucionPrevista) < new Date() && p.estado !== 'finalizado';
}

let solicitudesAprobadas = [];
let prestamosActivos     = [];
let inventario           = [];
let pendingModal         = null;

async function cargarTodo() {
  const [sols, pres, inv] = await Promise.all([
    api.getSolicitudesStaff('aprobada'),
    api.getPrestamosStaff(),
    api.getInventario(),
  ]);
  solicitudesAprobadas = sols;
  prestamosActivos     = pres.filter(p => p.estado === 'activo' || p.estado === 'retrasado');
  inventario           = inv;
  document.getElementById('badgeEntregas').textContent    = solicitudesAprobadas.length;
  document.getElementById('badgeDevoluciones').textContent= prestamosActivos.length;
  renderEntregas();
  renderDevoluciones();
}

function renderEntregas() {
  const cont = document.getElementById('tablaEntregas');
  const lista = solicitudesAprobadas;
  if (lista.length === 0) {
    cont.innerHTML = '<div class="empty-state">No hay solicitudes aprobadas pendientes de entrega</div>';
    return;
  }
  cont.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Sol.</th>
          <th>Solicitante</th>
          <th>Material</th>
          <th>Periodo</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${lista.map((s,i) => `
          <tr style="animation-delay:${i*25}ms">
            <td><span style="font-size:11px;font-weight:700;color:var(--text-muted);background:var(--gray-100);padding:2px 7px;border-radius:6px">#${s.id}</span></td>
            <td>
              <div class="user-cell">
                <div class="avatar">${initials(s.usuarioNombre)}</div>
                <div>
                  <div class="u-name">${s.usuarioNombre||'—'}</div>
                  <div class="u-sub">${s.usuarioEmail||''}</div>
                </div>
              </div>
            </td>
            <td>${s.materialName}<br><span class="u-sub">${s.categoria}</span></td>
            <td><span class="u-sub">${fmtDate(s.startDate)} → ${fmtDate(s.endDate)}</span></td>
            <td><span class="pill pill-aprobada">Aprobada</span></td>
            <td>
              <button class="btn-action btn-entregar" data-id="${s.id}" data-material-id="${s.materialId}" data-usuario="${s.userId}" data-fin="${s.endDate}" data-nombre="${s.materialName}">
                Registrar entrega
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  cont.querySelectorAll('[data-id]').forEach(btn => {
    btn.addEventListener('click', () => abrirModalEntrega(btn.dataset));
  });
}

function renderDevoluciones() {
  const cont = document.getElementById('tablaDevoluciones');
  const lista = prestamosActivos;
  if (lista.length === 0) {
    cont.innerHTML = '<div class="empty-state">No hay préstamos activos pendientes de devolución</div>';
    return;
  }
  cont.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Préstamo</th>
          <th>Usuario</th>
          <th>Material / Unidad</th>
          <th>Entregado</th>
          <th>Devolución prevista</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${lista.map((p,i) => {
          const retrasado = isRetrasado(p);
          return `
          <tr class="${retrasado?'retrasado':''}" style="animation-delay:${i*25}ms">
            <td><span style="font-size:11px;font-weight:700;color:var(--text-muted);background:var(--gray-100);padding:2px 7px;border-radius:6px">#${p.id}</span></td>
            <td>
              <div class="user-cell">
                <div class="avatar">${initials(p.usuarioNombre)}</div>
                <div>
                  <div class="u-name">${p.usuarioNombre||'—'}</div>
                  <div class="u-sub">${p.usuarioEmail||''}</div>
                </div>
              </div>
            </td>
            <td>
              ${p.materialName}<br>
              <span class="inv-code">${p.codigoInventario||'—'}</span>
            </td>
            <td>${fmtDate(p.fechaEntrega)}</td>
            <td><span class="fecha-prevista${retrasado?' late':''}">${fmtDate(p.fechaDevolucionPrevista)}</span></td>
            <td><span class="pill pill-${retrasado?'retrasado':p.estado}">${retrasado?'Retrasado':(p.estado==='activo'?'Activo':'—')}</span></td>
            <td>
              <button class="btn-action btn-devolver" data-id="${p.id}" data-nombre="${p.materialName}" data-usuario="${p.usuarioNombre||''}">
                Registrar devolución
              </button>
            </td>
          </tr>`}).join('')}
      </tbody>
    </table>`;

  cont.querySelectorAll('[data-id]').forEach(btn => {
    btn.addEventListener('click', () => abrirModalDevolucion(btn.dataset));
  });
}

// --------- MODAL ENTREGA ---------
function abrirModalEntrega({ id, materialId, usuario, fin, nombre }) {
  pendingModal = { tipo: 'entrega', solicitudId: id, usuarioId: usuario, materialId, fechaFin: fin };

  const unidades = (inventario.find(m => String(m.id) === String(materialId))?.unidades || [])
    .filter(u => u.estado === 'disponible');

  document.getElementById('modalTitle').textContent = `Registrar entrega — Sol. #${id}`;
  document.getElementById('modalBody').innerHTML = `
    <div class="modal-info">
      <div class="modal-info-row"><span class="modal-info-key">Material</span><span class="modal-info-val">${nombre}</span></div>
    </div>
    <div class="form-group">
      <label for="selectUnidad">Unidad a entregar</label>
      <select id="selectUnidad">
        ${unidades.length === 0
          ? '<option value="">— Sin unidades disponibles —</option>'
          : unidades.map(u => `<option value="${u.id}">${u.codigo_inventario}${u.ubicacion?' · '+u.ubicacion:''}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label for="fechaDevPrev">Fecha de devolución prevista</label>
      <input type="date" id="fechaDevPrev" value="${fin||''}" />
    </div>`;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn-ghost" id="btnCancelarModal">Cancelar</button>
    <button class="btn-primary" id="btnConfirmarModal" ${unidades.length===0?'disabled':''}>Registrar entrega</button>`;

  abrirOverlay();
}

// --------- MODAL DEVOLUCION ---------
function abrirModalDevolucion({ id, nombre, usuario }) {
  pendingModal = { tipo: 'devolucion', prestamoId: id };

  document.getElementById('modalTitle').textContent = `Registrar devolución — Préstamo #${id}`;
  document.getElementById('modalBody').innerHTML = `
    <div class="modal-info">
      <div class="modal-info-row"><span class="modal-info-key">Material</span><span class="modal-info-val">${nombre}</span></div>
      <div class="modal-info-row"><span class="modal-info-key">Usuario</span><span class="modal-info-val">${usuario||'—'}</span></div>
    </div>
    <p style="font-size:13.5px;color:var(--text-light);line-height:1.6">¿Confirmas que el material ha sido devuelto en buen estado?</p>`;
  document.getElementById('modalFooter').innerHTML = `
    <button class="btn-ghost" id="btnCancelarModal">Cancelar</button>
    <button class="btn-primary" id="btnConfirmarModal">Confirmar devolución</button>`;

  abrirOverlay();
}

function abrirOverlay() {
  const overlay = document.getElementById('modalOverlay');
  overlay.hidden = false;
  overlay.querySelector('select, input, button')?.focus();
  document.getElementById('btnCancelarModal').addEventListener('click', cerrarModal);
  document.getElementById('btnConfirmarModal').addEventListener('click', confirmarModal);
}

function cerrarModal() {
  document.getElementById('modalOverlay').hidden = true;
  pendingModal = null;
}

document.getElementById('modalClose').addEventListener('click', cerrarModal);
document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target.id==='modalOverlay') cerrarModal(); });

async function confirmarModal() {
  if (!pendingModal) return;

  if (pendingModal.tipo === 'entrega') {
    const unidadId = document.getElementById('selectUnidad')?.value;
    const fechaPrev= document.getElementById('fechaDevPrev')?.value;
    if (!unidadId || !fechaPrev) { showToast('Completa todos los campos', false); return; }
    try {
      await api.registrarEntrega({
        solicitudId: pendingModal.solicitudId,
        usuarioId:   pendingModal.usuarioId,
        unidadMaterialId: unidadId,
        fechaDevolucionPrevista: fechaPrev,
        staffUserId: user.id,
      });
      cerrarModal();
      showToast('Entrega registrada. Préstamo activo.');
      await cargarTodo();
    } catch (e) {
      showToast(e.message || 'Error al registrar la entrega', false);
    }
  } else {
    try {
      await api.registrarDevolucion(pendingModal.prestamoId, user.id);
      cerrarModal();
      showToast('Devolución registrada correctamente');
      await cargarTodo();
    } catch (e) {
      showToast(e.message || 'Error al registrar la devolución', false);
    }
  }
}

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById('panelEntregas').hidden    = tab !== 'entregas';
    document.getElementById('panelDevoluciones').hidden= tab !== 'devoluciones';
  });
});

cargarTodo().catch(e => {
  console.error(e);
  showToast('Error al cargar los datos', false);
});