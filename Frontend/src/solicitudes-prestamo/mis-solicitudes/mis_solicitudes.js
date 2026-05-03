import { auth } from '../../compartido/nucleo/auth.js';
import { api } from '../../compartido/nucleo/api.js';
import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar.js';

const currentUser = auth.requireAuth(['estudiante', 'profesor']);
mountSidebar({ activePage: 'solicitudes', basePath: '../..' });

window.__api = api;
window.__currentUser = currentUser;

// ===== DATOS (vía API) =====
  const today = new Date();
  const fmt = (d) => {
    const f = new Date(d);
    if (isNaN(f.getTime())) return '—';
    return f.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const fmtShort = (d) => {
    const f = new Date(d);
    if (isNaN(f.getTime())) return '—';
    return f.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };
  const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

  function categoryToSlug(name) {
    return (name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  }

  function noteFromStatus(s) {
    switch (s.status) {
      case 'pendiente': return { text: 'Solicitud recibida. Se te avisará por correo cuando sea revisada.', type: 'info' };
      case 'aprobada':  return { text: 'Aprobada. Recógela en el mostrador de material en la fecha indicada.', type: 'ok' };
      case 'en_espera': return { text: s.posicionEspera ? `Estás en posición <b>#${s.posicionEspera}</b> de la lista de espera.` : 'En lista de espera.', type: 'warn' };
      case 'rechazada': return { text: s.motivoRechazo || 'Solicitud rechazada por el personal de gestión.', type: 'error' };
      case 'cancelada': return { text: 'Solicitud cancelada.', type: 'muted' };
      case 'expirada':  return { text: 'La solicitud caducó porque no se recogió el material en el plazo indicado.', type: 'muted' };
      case 'en_prestamo': return { text: 'Esta solicitud derivó en un préstamo activo.', type: 'ok' };
      case 'finalizada':  return { text: 'Préstamo finalizado correctamente.', type: 'muted' };
      default: return null;
    }
  }

  let requests = [];

  const categoryLabels = {
    informatica: 'Informática',
    audio: 'Audio',
    video: 'Vídeo',
    herramientas: 'Herramientas',
    deporte: 'Deporte'
  };

  const stateLabels = {
    pendiente: 'Pendiente',
    aprobada:  'Aprobada',
    rechazada: 'Rechazada',
    en_espera: 'En espera',
    cancelada: 'Cancelada',
    expirada:  'Expirada'
  };

  const icons = {
    laptop:    '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M10 17v4M14 17v4"/><line x1="6" y1="8" x2="18" y2="8"/>',
    tablet:    '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="10" y1="18" x2="14" y2="18"/>',
    monitor:   '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    mic:       '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0M12 17v4M8 21h8"/>',
    headphones:'<path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 18a2 2 0 01-2 2h-1v-6h3zM3 18a2 2 0 002 2h1v-6H3z"/>',
    camera:    '<path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="4"/>',
    projector: '<rect x="2" y="7" width="16" height="10" rx="2"/><circle cx="9" cy="12" r="2"/><line x1="18" y1="11" x2="22" y2="11"/><line x1="18" y1="13" x2="22" y2="13"/>',
    gimbal:    '<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>',
    drill:     '<path d="M4 10h8l4-3v10l-4-3H4z"/><line x1="16" y1="12" x2="22" y2="12"/>'
  };

  const iconSvg = (name) => {
    const body = icons[name] || icons.laptop;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  };

  // Config de cada estado: color de barra en resumen + pasos de la timeline
  const stateMeta = {
    pendiente: { color: 'var(--amber)',  steps: ['done','active','pending','pending'] },
    aprobada:  { color: 'var(--green)',  steps: ['done','done','done','pending'] },
    en_espera: { color: 'var(--blue)',   steps: ['done','queue','pending','pending'] },
    rechazada: { color: 'var(--red)',    steps: ['done','error','pending','pending'] },
    cancelada: { color: 'var(--slate)',  steps: ['done','cancel','pending','pending'] },
    expirada:  { color: 'var(--gray-400)', steps: ['done','done','expired','pending'] }
  };

  const stepLabels = ['Solicitada','Revisión','Aprobada','Recogida'];

  // ===== RENDER RESUMEN =====
  function renderSummary() {
    const order = ['pendiente','aprobada','en_espera','rechazada','cancelada','expirada'];
    const total = requests.length || 1;
    const wrap = document.getElementById('summaryStats');
    wrap.innerHTML = order.map(s => {
      const count = requests.filter(r => r.estado === s).length;
      const pct = Math.round((count / total) * 100);
      const icon = {
        pendiente:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
        aprobada:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        en_espera:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12M6 22h12M6 2v4a6 6 0 0012 0V2M6 22v-4a6 6 0 0112 0v4"/></svg>',
        rechazada:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        cancelada:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>',
        expirada:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M7 7v13h10V7M10 11v6M14 11v6M9 7V4h6v3"/></svg>'
      }[s];
      return `
        <div class="sr-row">
          <div class="sr-dot ${s}">${icon}</div>
          <div class="sr-label">${stateLabels[s]}</div>
          <div class="sr-bar"><span style="width:${pct}%; background:${stateMeta[s].color}"></span></div>
          <div class="sr-count">${count}</div>
        </div>
      `;
    }).join('');
  }

  // ===== RENDER COUNTS =====
  function renderCounts() {
    document.getElementById('c-todas').textContent = requests.length;
    ['pendiente','aprobada','en_espera','rechazada','cancelada','expirada'].forEach(s => {
      document.getElementById(`c-${s}`).textContent = requests.filter(r => r.estado === s).length;
    });
  }

  // ===== TIMELINE =====
  function renderTimeline(estado) {
    const steps = stateMeta[estado].steps;
    return `
      <div class="timeline">
        ${steps.map((state, i) => {
          let cls = '';
          let content = (i + 1);
          if (state === 'done')    { cls = 'done';   content = '✓'; }
          if (state === 'active')  { cls = 'active'; content = (i + 1); }
          if (state === 'error')   { cls = 'error';  content = '✕'; }
          if (state === 'cancel')  { cls = 'cancel'; content = '✕'; }
          if (state === 'queue')   { cls = 'queue';  content = '…'; }
          if (state === 'expired') { cls = 'error';  content = '!'; }
          return `
            <div class="tl-step ${cls}">
              <div class="tl-dot">${content}</div>
              <div class="tl-label">${stepLabels[i]}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ===== ACCIONES por estado =====
  function renderActions(r) {
    if (r.estado === 'pendiente') {
      return `
        <button class="btn btn-ghost" data-action="detalle" data-id="${r.id}">Ver detalles</button>
        <button class="btn btn-danger-ghost" data-action="cancelar" data-id="${r.id}">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Cancelar
        </button>`;
    }
    if (r.estado === 'aprobada') {
      return `
        <button class="btn btn-ghost" data-action="detalle" data-id="${r.id}">Ver detalles</button>
        <button class="btn btn-primary" data-action="confirmar" data-id="${r.id}">
          Confirmar recogida
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>`;
    }
    if (r.estado === 'en_espera') {
      return `
        <button class="btn btn-ghost" data-action="detalle" data-id="${r.id}">Ver detalles</button>
        <button class="btn btn-danger-ghost" data-action="cancelar" data-id="${r.id}">Salir de la lista</button>`;
    }
    if (r.estado === 'rechazada') {
      return `
        <button class="btn btn-ghost" data-action="detalle" data-id="${r.id}">Ver motivo</button>
        <button class="btn btn-primary" data-action="repetir" data-id="${r.id}">
          Volver a solicitar
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0114.65-7"/><polyline points="17 3 18 8 13 9"/><path d="M21 12a9 9 0 01-14.65 7"/><polyline points="7 21 6 16 11 15"/></svg>
        </button>`;
    }
    return `
      <button class="btn btn-ghost" data-action="detalle" data-id="${r.id}">Ver detalles</button>
      <button class="btn btn-ghost" data-action="repetir" data-id="${r.id}">Volver a solicitar</button>`;
  }

  // ===== NOTE ICON =====
  const noteIcon = {
    info:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>',
    ok:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    warn:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>',
    error: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    muted: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>'
  };

  // ===== RENDER LIST =====
  let state = { q: '', state: 'todas', sort: 'recent' };

  function render() {
    let list = requests.slice();

    if (state.state !== 'todas') list = list.filter(r => r.estado === state.state);
    if (state.q) {
      const q = state.q.toLowerCase().trim();
      list = list.filter(r =>
        r.material.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        categoryLabels[r.categoria].toLowerCase().includes(q)
      );
    }

    if (state.sort === 'recent') list.sort((a, b) => new Date(b.solicitada) - new Date(a.solicitada));
    if (state.sort === 'oldest') list.sort((a, b) => new Date(a.solicitada) - new Date(b.solicitada));
    if (state.sort === 'az')     list.sort((a, b) => a.material.localeCompare(b.material));

    document.getElementById('resultCount').textContent = list.length;

    const wrap = document.getElementById('list');
    if (list.length === 0) {
      wrap.innerHTML = `
        <div class="empty">
          <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          <div class="empty-title">Sin solicitudes por aquí</div>
          <div class="empty-desc">No se han encontrado solicitudes con los filtros actuales. Prueba a cambiar el estado o busca otro material.</div>
          <a class="btn btn-primary" href="../../catalogo/listado-materiales/listado_materiales.html" style="display:inline-flex">
            Ir al catálogo
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>`;
      return;
    }

    wrap.innerHTML = list.map((r, i) => {
      const dur = daysBetween(r.desde, r.hasta);
      return `
        <article class="req s-${r.estado} cat-${r.categoria}" style="animation-delay:${i * 55}ms">
          <div class="req-cover">${iconSvg(r.icon)}</div>

          <div class="req-info">
            <div class="req-top">
              <span class="req-cat">${categoryLabels[r.categoria]}</span>
              <span class="req-id">${r.id}</span>
            </div>
            <div class="req-name">${r.material}</div>
            <div class="req-meta">
              <span class="m">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>
                Solicitada <b>${fmt(r.solicitada)}</b>
              </span>
              <span class="m">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                <b>${fmtShort(r.desde)} → ${fmtShort(r.hasta)}</b> · ${dur}d
              </span>
            </div>
          </div>

          ${renderTimeline(r.estado)}

          <div class="req-side">
            <span class="status-pill ${r.estado}"><span class="d"></span> ${stateLabels[r.estado]}</span>
            <div class="actions">${renderActions(r)}</div>
          </div>

          ${r.notas ? `
            <div class="req-note ${r.noteType || 'muted'}">
              ${noteIcon[r.noteType || 'muted']}
              <span>${r.notas}</span>
            </div>` : ''}
        </article>
      `;
    }).join('');
  }

  // ===== EVENTOS =====
  document.getElementById('searchInput').addEventListener('input', (e) => {
    state.q = e.target.value;
    render();
  });

  document.getElementById('sortSelect').addEventListener('change', (e) => {
    state.sort = e.target.value;
    render();
  });

  document.getElementById('chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('#chips .chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.state = chip.dataset.state;
    render();
  });

  // Click en acciones
  document.getElementById('list').addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;

    if (action === 'cancelar') {
      if (!confirm(`¿Seguro que quieres cancelar la solicitud ${id}?`)) return;
      try {
        const api = window.__api;
        const user = window.__currentUser;
        await api.cancelSolicitud(id, user.id);
        showToast('Solicitud cancelada.');
        await loadSolicitudes();
      } catch (err) {
        showToast(err.message || 'No se pudo cancelar', false);
      }
    } else if (action === 'repetir') {
      window.location.href = '../../catalogo/listado-materiales/listado_materiales.html';
    } else {
      // detalle / confirmar — placeholder hasta tener vistas de gestión
      showToast(`Acción "${action}" próximamente disponible.`);
    }
  });

  function mapApiSolicitud(s) {
    const note = noteFromStatus(s);
    return {
      id: s.id,
      material: s.materialName,
      categoria: categoryToSlug(s.categoria) || 'informatica',
      icon: s.materialIcon || 'box',
      estado: s.status,
      solicitada: s.fechaSolicitud,
      desde: s.startDate,
      hasta: s.endDate,
      notas: note ? note.text : null,
      noteType: note ? note.type : null,
    };
  }

  async function loadSolicitudes() {
    try {
      const api = window.__api;
      const user = window.__currentUser;
      const data = await api.getSolicitudes(user.id);
      requests = data.map(mapApiSolicitud);
      // Filtramos los estados que conocemos en la UI; el resto se renderiza igual.
      renderCounts();
      renderSummary();
      render();
    } catch (err) {
      console.error('Error cargando solicitudes:', err);
      document.getElementById('list').innerHTML = `
        <div class="empty">
          <div class="empty-title">No se pudieron cargar las solicitudes</div>
          <div class="empty-desc">${err.message}</div>
        </div>`;
    }
  }

  loadSolicitudes();

  // ===== TOAST =====
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toastText');
  let toastTimer;
  function showToast(msg, ok = true) {
    toastText.textContent = msg;
    toast.querySelector('.t-icon').style.background = ok ? 'var(--teal)' : '#b91c1c';
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.transform = 'translateY(120%)';
      toast.style.opacity = '0';
    }, 4000);
  }

  // ===== STRIPE RETURN HANDLING =====
  (async function handleStripeReturn() {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const status = params.get('status');

    // Limpiar URL para que no se repita al recargar
    if (sessionId || status) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }

    if (status === 'cancelled') {
      showToast('Pago cancelado. La solicitud no se ha creado.', false);
      return;
    }

    if (!sessionId) return;

    try {
      const api = window.__api;
      const currentUser = window.__currentUser;

      // 1. Verificar con el backend que el pago se completó
      const result = await api.verifyCheckoutSession(sessionId);

      if (!result.paid) {
        showToast('El pago no se completó correctamente.', false);
        return;
      }

      // 2. Crear la solicitud con los datos de los metadatos de Stripe
      const meta = result.metadata;
      await api.createSolicitud({
        userId: meta.usuario_id || currentUser?.id,
        materialName: meta.material_nombre,
        startDate: meta.fecha_inicio,
        endDate: meta.fecha_fin,
        purpose: meta.motivo,
        stripePaymentIntentId: result.payment_intent_id,
      });

      // 3. Limpiar drafts de localStorage
      localStorage.removeItem('unigear:draft:crear-solicitud');
      localStorage.removeItem('unigear:checkout:pending');

      showToast('¡Pago completado y solicitud creada con éxito!');

    } catch (err) {
      console.error('Error al procesar vuelta de Stripe:', err);
      showToast('Error al crear la solicitud: ' + err.message, false);
    }
  })();