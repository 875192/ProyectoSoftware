import { auth } from '../../compartido/nucleo/auth.js';
import { api } from '../../compartido/nucleo/api.js';
import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar-staff.js';

const user = auth.requireAuth(['personal_gestion']);
if (!user) throw new Error('No autenticado');

mountSidebar({ activePage: 'inventario', basePath: '../..' });

const topbar = document.getElementById('topbar');
const sentinel = document.getElementById('topbar-sentinel');
new IntersectionObserver(([e]) => topbar.classList.toggle('scrolled', !e.isIntersecting)).observe(sentinel);

let inventario = [];
let busqueda   = '';
let filtCat    = '';

function estadoBadge(e) {
  const label = { disponible:'Disponible', prestada:'Prestada', averiada:'Averiada', mantenimiento:'Mantenimiento', fuera_servicio:'Fuera de servicio', dada_de_baja:'Baja' }[e] || e;
  return `<span class="estado-badge estado-${e}">${label}</span>`;
}

function availClass(disp, total) {
  if (disp === 0) return 'empty';
  if (disp < total / 2) return 'warn';
  return 'good';
}

function renderInventario(lista) {
  const cont = document.getElementById('inventarioList');
  if (lista.length === 0) {
    cont.innerHTML = `<div class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      No hay materiales para este filtro
    </div>`;
    return;
  }

  cont.innerHTML = lista.map((m, i) => {
    const disp  = m.disponibles || 0;
    const total = m.total_unidades || 0;
    const cls   = availClass(disp, total);
    const unidades = m.unidades || [];
    const rawIcon = m.icono || '📦';
    const icon = [...rawIcon].length > 2 ? '📦' : rawIcon;

    return `
    <details style="animation-delay:${i*20}ms">
      <summary>
        <div class="mat-icon">${icon}</div>
        <div class="mat-info">
          <div class="mat-name">${m.nombre}</div>
          <div class="mat-sub">${m.categoria_nombre} · ${m.codigo_modelo}</div>
        </div>
        <div class="mat-badges">
          <span class="avail-badge ${cls}">${disp} / ${total} disponibles</span>
          <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </summary>
      <div class="unidades-wrap">
        ${unidades.length === 0
          ? '<p style="font-size:13px;color:var(--text-muted);padding:12px 0">Sin unidades registradas</p>'
          : `<table>
              <thead>
                <tr>
                  <th>Cód. inventario</th>
                  <th>Nº serie</th>
                  <th>Estado</th>
                  <th>Ubicación</th>
                </tr>
              </thead>
              <tbody>
                ${unidades.map(u => `
                  <tr>
                    <td><span class="inv-code">${u.codigo_inventario}</span></td>
                    <td>${u.numero_serie || '—'}</td>
                    <td>${estadoBadge(u.estado)}</td>
                    <td>${u.ubicacion || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`
        }
      </div>
    </details>`;
  }).join('');
}

function filtrar() {
  let lista = inventario;
  if (busqueda) {
    const q = busqueda.toLowerCase();
    lista = lista.filter(m =>
      m.nombre.toLowerCase().includes(q) ||
      (m.codigo_modelo||'').toLowerCase().includes(q) ||
      (m.categoria_nombre||'').toLowerCase().includes(q)
    );
  }
  if (filtCat) lista = lista.filter(m => m.categoria_nombre === filtCat);
  renderInventario(lista);
}

function actualizarStats(lista) {
  document.getElementById('statModelos').textContent    = lista.filter(m=>m.activo).length;
  document.getElementById('statDisponibles').textContent= lista.reduce((a,m)=>a+(m.disponibles||0),0);
  document.getElementById('statNoOp').textContent       = lista.reduce((a,m)=>a+(m.no_operativas||0),0);
}

function poblarCategoriasSelect(lista) {
  const cats = [...new Set(lista.map(m=>m.categoria_nombre).filter(Boolean))].sort();
  const sel = document.getElementById('filtroCategoria');
  cats.forEach(c => { const o = document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); });
}

document.getElementById('search').addEventListener('input', e => { busqueda = e.target.value.trim(); filtrar(); });
document.getElementById('filtroCategoria').addEventListener('change', e => { filtCat = e.target.value; filtrar(); });

api.getInventario().then(data => {
  inventario = data;
  actualizarStats(data);
  poblarCategoriasSelect(data);
  filtrar();
}).catch(e => {
  console.error(e);
  document.getElementById('inventarioList').innerHTML = '<div class="empty-state">Error al cargar el inventario</div>';
});