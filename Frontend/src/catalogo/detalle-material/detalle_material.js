import { auth } from '../../compartido/nucleo/auth.js';
  import { api } from '../../compartido/nucleo/api.js';
  import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar.js';
  const currentUser = auth.requireAuth(['estudiante', 'profesor']);
  mountSidebar({ activePage: 'catalogo', basePath: '../..' });
  window.__api = api;
  window.__currentUser = currentUser;

  const _api = api;
  const _user = currentUser;
  const today = new Date();

  const icons = {
    laptop:    '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M10 17v4M14 17v4"/><line x1="6" y1="8" x2="18" y2="8"/>',
    tablet:    '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="10" y1="18" x2="14" y2="18"/>',
    monitor:   '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    keyboard:  '<rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="10"/><line x1="10" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="14" y2="10"/><line x1="18" y1="10" x2="18" y2="10"/><line x1="7" y1="14" x2="17" y2="14"/>',
    mouse:     '<rect x="7" y="2" width="10" height="20" rx="5"/><line x1="12" y1="6" x2="12" y2="10"/>',
    drive:     '<rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/>',
    cable:     '<path d="M4 12a4 4 0 014-4h8a4 4 0 014 4v4H4z"/><line x1="8" y1="16" x2="8" y2="20"/><line x1="16" y1="16" x2="16" y2="20"/>',
    mic:       '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0M12 17v4M8 21h8"/>',
    headphones:'<path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 18a2 2 0 01-2 2h-1v-6h3zM3 18a2 2 0 002 2h1v-6H3z"/>',
    mixer:     '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="8" y1="8" x2="8" y2="16"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="16" y1="8" x2="16" y2="16"/><circle cx="8" cy="11" r="1.3"/><circle cx="12" cy="14" r="1.3"/><circle cx="16" cy="10" r="1.3"/>',
    speaker:   '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="14" r="3"/><circle cx="12" cy="7" r="1" fill="currentColor"/>',
    camera:    '<path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="4"/>',
    projector: '<rect x="2" y="7" width="16" height="10" rx="2"/><circle cx="9" cy="12" r="2"/><line x1="18" y1="11" x2="22" y2="11"/><line x1="18" y1="13" x2="22" y2="13"/>',
    tripod:    '<line x1="12" y1="3" x2="12" y2="12"/><line x1="12" y1="12" x2="6" y2="21"/><line x1="12" y1="12" x2="18" y2="21"/><line x1="12" y1="12" x2="12" y2="21"/><circle cx="12" cy="4" r="2"/>',
    gimbal:    '<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>',
    gopro:     '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="10" cy="12" r="3"/><rect x="15" y="9" width="3" height="2" rx="0.5"/>',
    drill:     '<path d="M4 10h8l4-3v10l-4-3H4z"/><line x1="16" y1="12" x2="22" y2="12"/>',
    tools:     '<path d="M14 6l4-4 3 3-4 4M14 6l-8 8a2.8 2.8 0 104 4l8-8"/>',
    multimeter:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="10" r="2"/><line x1="7" y1="16" x2="17" y2="16"/>',
    ball:      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    racket:    '<circle cx="9" cy="9" r="6"/><line x1="13" y1="13" x2="20" y2="20"/><path d="M5 9h8M9 5v8" stroke-width="0.8"/>',
    weights:   '<rect x="2" y="9" width="3" height="6" rx="1"/><rect x="19" y="9" width="3" height="6" rx="1"/><rect x="5" y="10" width="14" height="4" rx="1"/>'
  };

  // ===== HELPERS =====
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'), 10);
  let item = null;
  let similar = [];

  function categoryLabel(name) { return name || 'Material'; }

  function svg(body, opts = {}) {
    const w = opts.w || 18;
    const h = opts.h || 18;
    const sw = opts.stroke || 1.8;
    const cls = opts.cls ? ` class="${opts.cls}"` : '';
    return `<svg${cls} width="${w}" height="${h}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }
  function statusLabel(estado) {
    return ({
      disponible:     'Disponible',
      reservado:      'Reservado',
      prestado:       'Prestado',
      averiado:       'Averiado',
      mantenimiento:  'En mantenimiento',
      fuera_servicio: 'Fuera de servicio'
    })[estado] || estado;
  }
  function isReservable(estado, stock) {
    return (estado === 'disponible' || estado === 'reservado') && stock > 0;
  }
  function fmtDateInput(d) {
    return d.toISOString().slice(0, 10);
  }
  function showToast(text, kind) {
    const el = document.getElementById('toast');
    el.textContent = text;
    el.className = 'toast' + (kind ? ' ' + kind : '');
    requestAnimationFrame(() => el.classList.add('is-visible'));
    setTimeout(() => el.classList.remove('is-visible'), 2400);
  }

  // ===== RENDER =====
  const content = document.getElementById('content');

  function renderNotFound(msg) {
    document.getElementById('bcName').textContent = 'No encontrado';
    document.getElementById('pageTitle').textContent = 'Material no encontrado';
    content.innerHTML = `
      <section class="not-found">
        <div class="nf-icon">
          ${svg('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>', { w: 30, h: 30, stroke: 1.6 })}
        </div>
        <div class="nf-title">${msg || 'No encontramos ese material'}</div>
        <div class="nf-desc">Puede que el enlace esté caducado o que el material ya no esté en el catálogo.</div>
        <a class="btn btn-primary" href="../listado-materiales/listado_materiales.html">Volver al catálogo</a>
      </section>`;
  }

  function renderItem() {
    document.getElementById('bcName').textContent = item.name;
    document.getElementById('pageTitle').textContent = item.name;

    const reservable = isReservable(item.estado, item.stock);
    const minDate = fmtDateInput(today);
    const maxDate = fmtDateInput(new Date(today.getTime() + (item.plazo + 30) * 86400000));

    content.innerHTML = `
      <section class="card hero">
        <div class="hero-visual">
          <div class="hero-object">${svg(icons[item.icon] || icons.tools, { w: 120, h: 120, stroke: 1.4 })}</div>
        </div>
        <div class="hero-content">
          <span class="hero-eyebrow">${categoryLabel(item.category)}</span>
          <h1 class="hero-title">${item.name}</h1>
          <p class="hero-desc">${item.desc || ''}</p>

          <dl class="meta-inline">
            <div><dt>Disponibles</dt><dd>${item.stock}<span class="unit">/${item.total}</span></dd></div>
            <div><dt>Plazo</dt><dd>${item.plazo}<span class="unit">días</span></dd></div>
            <div><dt>Código</dt><dd>${item.codigo}</dd></div>
            <div><dt>Popularidad</dt><dd>${item.popularidad}<span class="unit">/mes</span></dd></div>
          </dl>

          <span class="status-pill ${item.estado}">
            <span class="d"></span>${statusLabel(item.estado)}
          </span>

          <div class="hero-actions">
            <button class="btn btn-primary" id="ctaSolicitar" ${reservable ? '' : 'disabled'}>
              ${reservable ? 'Solicitar préstamo' : (item.stock === 0 ? 'Sin stock' : 'No disponible')}
              ${reservable ? svg('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>', { w: 14, h: 14, stroke: 2.4 }) : ''}
            </button>
            <a class="btn btn-ghost" href="../listado-materiales/listado_materiales.html">
              ${svg('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>', { w: 14, h: 14, stroke: 2.4 })}
              Volver al catálogo
            </a>
          </div>

          ${item.incidencias >= 2 ? `
            <div class="alert" role="status">
              ${svg('<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/>', { w: 18, h: 18, stroke: 2 })}
              <div>
                <b>Atención:</b> este material ha tenido ${item.incidencias} incidencias recientes. Inspecciónalo bien al recogerlo y reporta cualquier desperfecto.
              </div>
            </div>` : ''}
        </div>
      </section>

      <div class="grid-bottom">
        <div class="col-main">
          <section class="card">
            <h2 class="section-title">Descripción</h2>
            <p class="body-text">${item.desc || ''}</p>
            <ul class="bullet-list">
              ${(item.condiciones || []).map(c => `<li>${c}</li>`).join('')}
            </ul>
          </section>

          <section class="card">
            <h2 class="section-title">Cómo solicitarlo</h2>
            <div class="steps">
              <div class="step">
                <div class="step-num">1</div>
                <div class="step-title">Elige las fechas</div>
                <div class="step-text">Indica cuándo necesitas el material. Máximo ${item.plazo} días por préstamo.</div>
              </div>
              <div class="step">
                <div class="step-num">2</div>
                <div class="step-title">Confirma el motivo</div>
                <div class="step-text">Una breve nota ayuda al personal a priorizar tu solicitud.</div>
              </div>
              <div class="step">
                <div class="step-num">3</div>
                <div class="step-title">Recoge en conserjería</div>
                <div class="step-text">Cuando se apruebe, recibirás un aviso con el sitio y horario de recogida.</div>
              </div>
            </div>
          </section>

          <section class="card">
            <h2 class="section-title">Información de uso</h2>
            <div class="info-grid">
              <div class="info-cell">
                <div class="l">Plazo máximo</div>
                <div class="v">${item.plazo} días</div>
              </div>
              <div class="info-cell">
                <div class="l">Categoría</div>
                <div class="v">${categoryLabel(item.category)}</div>
              </div>
              <div class="info-cell">
                <div class="l">Código de inventario</div>
                <div class="v">${item.codigo}</div>
              </div>
              <div class="info-cell">
                <div class="l">Estado actual</div>
                <div class="v">${statusLabel(item.estado)}</div>
              </div>
            </div>
            <p class="body-text" style="margin-top:14px">
              Devuelve el material en el mismo estado en el que lo recibiste. Los retrasos generan
              sanciones automáticas y los daños deben reportarse al devolverlo. Cualquier duda,
              consulta el reglamento de préstamos de UniGear.
            </p>
          </section>
        </div>

        <aside class="col-side">
          <section class="card">
            <h2 class="form-title">Reserva tu préstamo</h2>
            <p class="form-sub">${reservable ? 'Indica las fechas y un motivo opcional. La solicitud quedará pendiente de revisión.' : ''}</p>

            ${reservable ? `
              <div class="field-error" id="formError" aria-live="polite"></div>
              <form id="reservaForm" novalidate>
                <div class="field-row">
                  <div class="field">
                    <label for="fDesde">Desde</label>
                    <input type="date" id="fDesde" name="desde" required min="${minDate}" max="${maxDate}" value="${minDate}">
                  </div>
                  <div class="field">
                    <label for="fHasta">Hasta</label>
                    <input type="date" id="fHasta" name="hasta" required min="${minDate}" max="${maxDate}">
                  </div>
                </div>
                <div class="field">
                  <label for="fPrioridad">Prioridad</label>
                  <select id="fPrioridad" name="prioridad">
                    <option value="normal">Normal</option>
                    <option value="alta">Alta — necesidad urgente</option>
                  </select>
                </div>
                <div class="field">
                  <label for="fMotivo">Motivo (opcional)</label>
                  <textarea id="fMotivo" name="motivo" maxlength="280" placeholder="Para qué lo necesitas, asignatura o profesor responsable…"></textarea>
                  <span class="field-help">Máx. 280 caracteres.</span>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center">
                  ${svg('<polyline points="20 6 9 17 4 12"/>', { w: 14, h: 14, stroke: 2.6 })}
                  Confirmar solicitud
                </button>
              </form>
            ` : `
              <div class="form-disabled-msg">
                ${item.stock === 0
                  ? 'No hay unidades disponibles en este momento.'
                  : 'Este material no está disponible para préstamo (estado: ' + statusLabel(item.estado) + ').'}
              </div>
            `}
          </section>

          ${similar.length ? `
          <section class="card">
            <h2 class="section-title">Material similar</h2>
            <div class="similar-list">
              ${similar.map(s => `
                <a class="similar-item" href="?id=${s.id}">
                  <span class="similar-icon">${svg(icons[s.icon] || icons.tools, { w: 18, h: 18, stroke: 1.6 })}</span>
                  <div class="similar-info">
                    <div class="similar-name">${s.name}</div>
                    <div class="similar-meta">${s.category} · ${s.stock} disponibles</div>
                  </div>
                </a>
              `).join('')}
            </div>
          </section>` : ''}
        </aside>
      </div>
    `;

    bindForm(reservable, minDate);
  }

  function bindForm(reservable, minDate) {
    if (!reservable) return;
    const form = document.getElementById('reservaForm');
    if (!form) return;
    const desde = document.getElementById('fDesde');
    const hasta = document.getElementById('fHasta');
    const errBox = document.getElementById('formError');

    const defaultHasta = new Date(today.getTime() + Math.min(item.plazo, 3) * 86400000);
    hasta.value = fmtDateInput(defaultHasta);

    function validate() {
      errBox.textContent = '';
      const d = new Date(desde.value);
      const h = new Date(hasta.value);
      const minD = new Date(minDate);
      if (Number.isNaN(d.getTime()) || Number.isNaN(h.getTime())) {
        errBox.textContent = 'Indica las dos fechas.';
        return false;
      }
      if (d < minD) { errBox.textContent = 'La fecha de inicio no puede ser anterior a hoy.'; return false; }
      if (h <= d)   { errBox.textContent = 'La fecha de devolución debe ser posterior a la de inicio.'; return false; }
      const dias = Math.round((h - d) / 86400000);
      if (dias > item.plazo) {
        errBox.textContent = `El plazo máximo para este material es de ${item.plazo} días (estás pidiendo ${dias}).`;
        return false;
      }
      return true;
    }

    desde.addEventListener('change', validate);
    hasta.addEventListener('change', validate);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validate()) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Redirigiendo al pago…';
      submitBtn.style.opacity = '0.7';

      try {
        const session = await _api.createCheckoutSession({
          usuarioId: _user.id,
          materialId: item.id,
          materialNombre: item.name,
          fechaInicio: desde.value,
          fechaFin: hasta.value,
          motivo: document.getElementById('fMotivo').value.trim(),
          prioridad: document.getElementById('fPrioridad').value,
        });
        window.location.href = session.url;
      } catch (err) {
        errBox.textContent = err.message || 'No se pudo iniciar el pago';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirmar solicitud';
        submitBtn.style.opacity = '1';
      }
    });

    const cta = document.getElementById('ctaSolicitar');
    if (cta) {
      cta.addEventListener('click', () => {
        desde.focus({ preventScroll: false });
        desde.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }

  async function loadDetail() {
    if (!Number.isFinite(id)) {
      renderNotFound('Identificador de material inválido');
      return;
    }
    try {
      item = await _api.getMaterial(id);
      // Cargamos similares por categoría
      try {
        const all = await _api.getMateriales();
        similar = all
          .filter(x => x.category === item.category && String(x.id) !== String(item.id))
          .slice(0, 3);
      } catch (_) {
        similar = [];
      }
      renderItem();
    } catch (err) {
      console.error('Error al cargar material:', err);
      renderNotFound();
    }
  }

  loadDetail();