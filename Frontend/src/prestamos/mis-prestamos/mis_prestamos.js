import { auth } from '../../compartido/nucleo/auth.js';
  import { api } from '../../compartido/nucleo/api.js';
  import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar.js';
  const currentUser = auth.requireAuth(['estudiante', 'profesor']);
  mountSidebar({ activePage: 'prestamos', basePath: '../..' });

  // Los préstamos se cargan async desde el backend
  let prestamos = [];

  (async function init() {
    if (currentUser && api) {
      try {
        const data = await api.getPrestamos(currentUser.id);
        prestamos = data.map(p => ({
          id: p.id,
          solicitudId: p.solicitudId,
          material_id: parseInt(p.materialId),
          material: p.materialName,
          categoria: (p.categoria || 'informatica').toLowerCase(),
          icon: p.materialIcon || 'laptop',
          codigo: p.codigoInventario || p.materialCodigo || '—',
          fecha_entrega: p.fechaEntrega ? new Date(p.fechaEntrega) : null,
          fecha_devolucion_prevista: p.fechaDevolucionPrevista ? new Date(p.fechaDevolucionPrevista) : null,
          fecha_devolucion_real: p.fechaDevolucionReal ? new Date(p.fechaDevolucionReal) : null,
          estado: p.estado
        }));
      } catch (err) {
        console.error('Error cargando préstamos:', err);
      }
    }
    render();
  })();

  // ===== DATOS =====
  const today = new Date('2026-04-25');

  const day = 86400000;
  const addDays = (d, n) => new Date(d.getTime() + n * day);
  const fmtShort = (d) => d ? d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—';
  const fmtLong  = (d) => d ? d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const categoryLabels = {
    informatica: 'Informática', audio: 'Audio', video: 'Vídeo',
    herramientas: 'Herramientas', deporte: 'Deporte'
  };

  const icons = {
    laptop:    '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M10 17v4M14 17v4"/><line x1="6" y1="8" x2="18" y2="8"/>',
    tablet:    '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="10" y1="18" x2="14" y2="18"/>',
    monitor:   '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    drive:     '<rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/>',
    mic:       '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0M12 17v4M8 21h8"/>',
    headphones:'<path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 18a2 2 0 01-2 2h-1v-6h3zM3 18a2 2 0 002 2h1v-6H3z"/>',
    camera:    '<path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="4"/>',
    projector: '<rect x="2" y="7" width="16" height="10" rx="2"/><circle cx="9" cy="12" r="2"/><line x1="18" y1="11" x2="22" y2="11"/><line x1="18" y1="13" x2="22" y2="13"/>',
    drill:     '<path d="M4 10h8l4-3v10l-4-3H4z"/><line x1="16" y1="12" x2="22" y2="12"/>',
    racket:    '<circle cx="9" cy="9" r="6"/><line x1="13" y1="13" x2="20" y2="20"/><path d="M5 9h8M9 5v8" stroke-width="0.8"/>'
  };

  // ===== HELPERS =====
  function svg(body, opts = {}) {
    const w = opts.w || 14; const h = opts.h || 14; const sw = opts.stroke || 2.2;
    return `<svg width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }
  function daysUntil(d) {
    return Math.round((d - today) / day);
  }
  function deadlineBucket(p) {
    if (p.estado === 'finalizado') return 'finalizado';
    if (p.estado === 'cancelado')  return 'cancelado';
    if (p.estado === 'pendiente')  return 'pendiente';
    if (p.estado === 'retrasado')  return 'retrasado';
    const d = daysUntil(p.fecha_devolucion_prevista);
    if (d < 0) return 'retrasado';
    if (d <= 2) return 'proximos_a_vencer';
    return 'activo';
  }
  function deadlineText(p) {
    const b = deadlineBucket(p);
    if (b === 'cancelado')  return { label: 'Estado',          value: 'Cancelado' };
    if (b === 'finalizado') return { label: 'Devuelto',        value: fmtShort(p.fecha_devolucion_real || p.fecha_devolucion_prevista) };
    if (b === 'pendiente')  return { label: 'Recoger desde',   value: fmtShort(p.fecha_entrega) };
    const d = daysUntil(p.fecha_devolucion_prevista);
    if (b === 'retrasado')         return { label: 'Vencido',  value: `Hace ${Math.abs(d)} ${Math.abs(d) === 1 ? 'día' : 'días'}` };
    if (b === 'proximos_a_vencer') return { label: 'Vence',    value: d === 0 ? 'Hoy' : (d === 1 ? 'Mañana' : `En ${d} días`) };
    return { label: 'Quedan', value: `${d} días` };
  }
  function isActionable(p) {
    return p.estado === 'activo' || p.estado === 'retrasado';
  }
  function showToast(text, kind) {
    const el = document.getElementById('toast');
    el.textContent = text;
    el.className = 'toast' + (kind ? ' ' + kind : '');
    requestAnimationFrame(() => el.classList.add('is-visible'));
    setTimeout(() => el.classList.remove('is-visible'), 2400);
  }

  // ===== STATE =====
  let state = { q: '', filter: 'todos', sort: 'recent' };

  // ===== RENDER =====
  function counts() {
    const c = { todos: prestamos.length, activo: 0, proximos_a_vencer: 0, retrasado: 0,
                finalizado: 0, cancelado: 0, pendiente: 0 };
    prestamos.forEach(p => {
      const b = deadlineBucket(p);
      if (b === 'activo')             c.activo++;
      if (b === 'proximos_a_vencer')  { c.activo++; c.proximos_a_vencer++; }
      if (b === 'retrasado')          c.retrasado++;
      if (b === 'finalizado')         c.finalizado++;
      if (b === 'cancelado')          c.cancelado++;
      if (b === 'pendiente')          c.pendiente++;
    });
    return c;
  }

  function renderHero(c) {
    const activosTotal = c.activo;
    const titleEl = document.getElementById('heroTitle');
    const descEl  = document.getElementById('heroDesc');
    if (activosTotal === 0) {
      titleEl.textContent = 'No tienes préstamos activos';
      descEl.textContent  = 'Explora el catálogo para reservar el material que necesites. Aquí aparecerán tus préstamos en cuanto se aprueben.';
    } else {
      const sufijo = activosTotal === 1 ? 'préstamo activo' : 'préstamos activos';
      titleEl.textContent = `Tienes ${activosTotal} ${sufijo}`;
      const partes = [];
      if (c.proximos_a_vencer) partes.push(`${c.proximos_a_vencer} próximo${c.proximos_a_vencer === 1 ? '' : 's'} a vencer`);
      if (c.retrasado)         partes.push(`${c.retrasado} retrasado${c.retrasado === 1 ? '' : 's'}`);
      descEl.textContent = partes.length
        ? `Estado actual: ${partes.join(' · ')}. Devuelve a tiempo para evitar sanciones.`
        : 'Todos tus préstamos están en plazo. Recuerda devolverlos antes de la fecha prevista.';
    }
  }

  function renderSummary(c) {
    const rows = [
      { key: 'activo',            label: 'Activos en plazo',     count: c.activo - c.proximos_a_vencer },
      { key: 'proximos_a_vencer', label: 'Próximos a vencer',    count: c.proximos_a_vencer },
      { key: 'retrasado',         label: 'Retrasados',           count: c.retrasado },
      { key: 'pendiente',         label: 'Pendientes de recoger', count: c.pendiente },
      { key: 'finalizado',        label: 'Finalizados',          count: c.finalizado },
      { key: 'cancelado',         label: 'Cancelados',           count: c.cancelado },
    ];
    const total = c.todos || 1;
    document.getElementById('srSub').textContent = `${c.todos} préstamos en tu historial`;
    document.getElementById('srRows').innerHTML = rows.map(r => `
      <div class="sr-row">
        <span class="sr-dot ${r.key}">${svg(dotIcon(r.key), { w: 14, h: 14, stroke: 2.2 })}</span>
        <span class="sr-label">${r.label}</span>
        <span class="sr-count">${r.count}</span>
        <span class="sr-bar"><span style="width: ${Math.round((r.count / total) * 100)}%"></span></span>
      </div>
    `).join('');

    Object.keys(c).forEach(k => {
      const el = document.getElementById('c-' + k);
      if (el) el.textContent = c[k];
    });
  }

  function dotIcon(key) {
    if (key === 'finalizado')        return '<polyline points="20 6 9 17 4 12"/>';
    if (key === 'retrasado')         return '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="13"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>';
    if (key === 'cancelado')         return '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
    if (key === 'pendiente')         return '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>';
    if (key === 'proximos_a_vencer') return '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/>';
    return '<path d="M4 10a4 4 0 014-4h8a4 4 0 014 4v10H4V10z"/><line x1="4" y1="15" x2="20" y2="15"/>';
  }

  function renderList() {
    let list = prestamos.slice();

    if (state.filter !== 'todos') {
      list = list.filter(p => deadlineBucket(p) === state.filter);
    }
    if (state.q) {
      const q = state.q.toLowerCase().trim();
      list = list.filter(p =>
        p.material.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    }

    if (state.sort === 'recent') {
      list.sort((a, b) => b.fecha_entrega - a.fecha_entrega);
    } else if (state.sort === 'deadline') {
      list.sort((a, b) => a.fecha_devolucion_prevista - b.fecha_devolucion_prevista);
    } else if (state.sort === 'az') {
      list.sort((a, b) => a.material.localeCompare(b.material));
    }

    document.getElementById('resultCount').textContent = list.length;
    const host = document.getElementById('list');

    if (list.length === 0) {
      host.innerHTML = `
        <div class="empty">
          <div class="empty-icon">${svg('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>', { w: 30, h: 30, stroke: 1.6 })}</div>
          <div class="empty-title">Sin préstamos en este filtro</div>
          <div class="empty-desc">No hay préstamos que coincidan. Cambia de filtro o explora el catálogo para reservar material.</div>
          <a class="btn btn-primary" href="../../catalogo/listado-materiales/listado_materiales.html">Ir al catálogo</a>
        </div>`;
      return;
    }

    host.innerHTML = list.map((p, i) => {
      const bucket = deadlineBucket(p);
      const dl = deadlineText(p);
      const actionable = isActionable(p);
      return `
        <article class="pn cat-${p.categoria}" style="animation-delay:${i * 40}ms">
          <div class="pn-cover">${svg(icons[p.icon] || icons.laptop, { w: 28, h: 28, stroke: 1.6 })}</div>
          <div class="pn-info">
            <div class="pn-top">
              <span class="pn-cat">${categoryLabels[p.categoria] || ''}</span>
              <span class="pn-id">${p.id}</span>
            </div>
            <div class="pn-name">${p.material}</div>
            <div class="pn-meta">
              <span class="m">${svg('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>', { w: 13, h: 13, stroke: 2 })} Entregado <b>${fmtShort(p.fecha_entrega)}</b></span>
              <span class="m">${svg('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>', { w: 13, h: 13, stroke: 2 })} Devolver <b>${fmtShort(p.fecha_devolucion_prevista)}</b></span>
              <span class="m">${svg('<path d="M20 12H4M12 4l-8 8 8 8"/>', { w: 13, h: 13, stroke: 2 })} Código <b>${p.codigo}</b></span>
            </div>
          </div>
          <div class="pn-deadline ${bucket}">
            <span class="dl-label">${dl.label}</span>
            <span class="dl-value">${dl.value}</span>
          </div>
          <div class="pn-actions">
            ${actionable ? `<button class="btn btn-primary" data-action="devolver" data-id="${p.id}">Solicitar devolución</button>` : ''}
            ${actionable ? `<button class="btn btn-ghost" data-action="incidencia" data-id="${p.id}">Reportar incidencia</button>` : ''}
            <a class="btn-link" href="../../catalogo/detalle-material/detalle_material.html?id=${p.material_id}">Ver material →</a>
          </div>
        </article>`;
    }).join('');
  }

  // ===== EVENTOS =====
  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.q = e.target.value;
    renderList();
  });
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    state.sort = e.target.value;
    renderList();
  });
  document.getElementById('chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.filter = chip.dataset.filter;
    renderList();
  });

  // Acciones por delegación
  document.getElementById('list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const p = prestamos.find(x => x.id === btn.dataset.id);
    if (!p) return;

    if (btn.dataset.action === 'devolver') {
      showToast('Solicitud de devolución enviada. Acércate a conserjería con el material.', 'success');
    } else if (btn.dataset.action === 'incidencia') {
      openIncidencia(p);
    }
  });

  // ===== MODAL INCIDENCIA =====
  const modal       = document.getElementById('incidenciaModal');
  const incForm     = document.getElementById('incForm');
  const incClose    = document.getElementById('incClose');
  const incCancel   = document.getElementById('incCancel');
  const incMaterial = document.getElementById('incMaterial');

  function openIncidencia(p) {
    incMaterial.textContent = `${p.material} · ${p.codigo} · ${p.id}`;
    incForm.reset();
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.setAttribute('open', '');
    }
    setTimeout(() => document.getElementById('incTipo').focus(), 50);
  }
  function closeIncidencia() {
    if (typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
  }
  incClose.addEventListener('click', closeIncidencia);
  incCancel.addEventListener('click', closeIncidencia);
  incForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const tipo = document.getElementById('incTipo').value;
    const desc = document.getElementById('incDesc').value.trim();
    if (!desc) {
      document.getElementById('incDesc').focus();
      return;
    }
    closeIncidencia();
    showToast(`Incidencia (${tipo}) reportada. Te contactaremos pronto.`, 'success');
  });
  modal.addEventListener('cancel', (e) => { /* Escape — comportamiento nativo */ });
  modal.addEventListener('click', (e) => {
    // Cerrar al pulsar el backdrop
    if (e.target === modal) closeIncidencia();
  });

  // ===== INIT =====
  function render() {
    const c = counts();
    renderHero(c);
    renderSummary(c);
    renderList();
  }