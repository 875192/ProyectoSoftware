import { auth } from '../../compartido/nucleo/auth.js';
  import { api } from '../../compartido/nucleo/api.js';
  import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar.js';
  auth.requireAuth(['estudiante', 'profesor']);
  mountSidebar({ activePage: 'catalogo', basePath: '../..' });

  const grid = document.getElementById('grid');
  const searchInput = document.getElementById('searchInput');
  const chipsBar = document.getElementById('chips');
  const sortSelect = document.getElementById('sortSelect');
  const resultCount = document.getElementById('resultCount');
  const countTodas = document.getElementById('count-todas');

  const categoryLabels = {
    'Informática': 'informatica',
    'Audio': 'audio',
    'Vídeo': 'video',
    'Herramientas': 'herramientas',
    'Deporte': 'deporte'
  };

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

  let materials = [];
  let categorias = [];
  let state = { q: '', cat: 'todas', sort: 'popular' };

  function iconSvg(name) {
    const body = icons[name] || icons.tools;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  }

  function statusText(s) {
    if (s > 2) return 'Disponible';
    if (s > 0) return 'Quedan pocos';
    return 'Agotado';
  }

  function statusClass(s) {
    if (s > 2) return 'ok';
    if (s > 0) return 'warn';
    return 'no';
  }

  function getCatClass(cat) {
    const slug = normalize(cat);
    const known = ['informatica','audio','video','herramientas','deporte'];
    return known.includes(slug) ? slug : 'informatica';
  }

  function normalize(str) {
    return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  async function loadData() {
    try {
      const [mats, cats, top] = await Promise.all([
        api.getMateriales(),
        api.getCategorias(),
        api.getTopMaterial().catch(() => null),
      ]);
      materials = mats;
      categorias = cats;
      renderHero(top);
      renderChips();
      render();
    } catch (err) {
      console.error('Error cargando datos:', err);
      grid.innerHTML = `<div class="empty"><div class="empty-title">Error al cargar el catálogo</div><div>${err.message}</div></div>`;
    }
  }

  function renderHero(top) {
    const heroSection = document.getElementById('heroSection');
    if (!top) { heroSection.hidden = true; return; }
    heroSection.hidden = false;
    document.getElementById('heroIcon').innerHTML = iconSvg(top.icon);
    document.getElementById('heroTitle').textContent = top.name;
    document.getElementById('heroDesc').textContent = top.desc || 'Material destacado del catálogo esta semana.';
    document.getElementById('heroSummary').innerHTML =
      `<b>${top.stock}</b> unidades disponibles · <b>${top.popularidad}</b> préstamos al mes · plazo medio de <b>${top.plazo}</b> días · categoría <b>${top.category}</b>.`;
    const detailUrl = `../../catalogo/detalle-material/detalle_material.html?id=${top.id}`;
    document.getElementById('heroSolicitar').href = detailUrl;
    document.getElementById('heroDetalles').href = detailUrl;
  }

  function renderChips() {
    countTodas.textContent = materials.length;
    // Reconstruimos chips de categorías
    const existing = chipsBar.querySelectorAll('.chip:not([data-cat="todas"])');
    existing.forEach(c => c.remove());
    categorias.forEach(c => {
      const slug = normalize(c.nombre);
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.dataset.cat = slug;
      btn.innerHTML = `${c.nombre} <span class="count">${c.count}</span>`;
      chipsBar.appendChild(btn);
    });
  }

  function render() {
    let list = materials.slice();

    if (state.cat !== 'todas') {
      list = list.filter(x => normalize(x.category) === normalize(state.cat));
    }
    if (state.q) {
      const q = state.q.toLowerCase().trim();
      list = list.filter(x =>
        x.name.toLowerCase().includes(q) ||
        x.category.toLowerCase().includes(q)
      );
    }

    if (state.sort === 'popular') list.sort((a, b) => b.popularidad - a.popularidad);
    if (state.sort === 'az')      list.sort((a, b) => a.name.localeCompare(b.name));
    if (state.sort === 'stock')   list.sort((a, b) => b.stock - a.stock);

    resultCount.textContent = list.length;

    if (list.length === 0) {
      grid.innerHTML = `
        <div class="empty">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <div class="empty-title">Sin resultados</div>
          <div>Prueba con otra palabra clave o cambia de categoría.</div>
        </div>`;
      return;
    }

    grid.innerHTML = list.map((x, i) => `
      <article class="item cat-${getCatClass(x.category)}" data-id="${x.id}" style="animation-delay:${i * 40}ms" tabindex="0" role="link" aria-label="Ver detalle de ${x.name}">
        <div class="item-cover">
          ${iconSvg(x.icon)}
          <span class="item-status ${statusClass(x.stock)}">${statusText(x.stock)}</span>
        </div>
        <div class="item-body">
          <div class="item-cat">${x.category}</div>
          <div class="item-name">${x.name}</div>
          <div class="item-meta">
            <div class="item-stock"><b>${x.stock}</b> disponibles</div>
            <button class="item-btn" data-action="solicitar" data-id="${x.id}" ${x.stock === 0 ? 'disabled' : ''}>
              ${x.stock === 0 ? 'Sin stock' : 'Solicitar'}
              ${x.stock === 0 ? '' : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'}
            </button>
          </div>
        </div>
      </article>
    `).join('');
  }

function goToDetail(id) {
  window.location.href = `../../catalogo/detalle-material/detalle_material.html?id=${id}`;
}
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.item-btn');
    if (btn && !btn.disabled) {
      goToDetail(btn.dataset.id);
      return;
    }
    const card = e.target.closest('.item');
    if (card && !btn) goToDetail(card.dataset.id);
  });
  grid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.item');
    if (card && e.target === card) {
      e.preventDefault();
      goToDetail(card.dataset.id);
    }
  });

  searchInput.addEventListener('input', (e) => {
    state.q = e.target.value;
    render();
  });

  chipsBar.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    [...chipsBar.querySelectorAll('.chip')].forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.cat = chip.dataset.cat || 'todas';
    render();
  });

  sortSelect.addEventListener('change', (e) => {
    state.sort = e.target.value;
    render();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  loadData();