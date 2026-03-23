import { auth } from '../../js/core/auth.js';
    import { db } from '../../js/core/db.js';
    import { ui } from '../../js/components/ui.js';

    // 1. Auth Check - Allow student & profesor
    const user = auth.requireAuth(['estudiante', 'profesor']);
    if(!user) throw new Error("Not authenticated");

    // 2. Setup Layout
    ui.setupLayout(user);

    // 3. Init logic
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const availabilityFilter = document.getElementById('availability-filter');
    const catalogGrid = document.getElementById('catalog-grid');
    const emptyState = document.getElementById('empty-state');

    const fallbackInventory = [
      { id: '1', name: 'Portátil Dell XPS 15', category: 'Portátil', desc: 'Intel Core i7, 16GB RAM, 512GB SSD. Para programación y análisis de datos.', stock: 5, total: 5 },
      { id: '2', name: 'Cámara Canon EOS R5', category: 'Cámara', desc: 'Cámara mirrorless Full Frame 45MP. Ideal para documentación de proyectos.', stock: 2, total: 3 },
      { id: '3', name: 'Kit Arduino Uno Rev3', category: 'Electrónica', desc: 'Placa base + sensores, cables de conexión y protoboard para prototipos.', stock: 15, total: 20 },
      { id: '4', name: 'Microscopio Binocular', category: 'Laboratorio', desc: 'Aumentos 40x-1000x. Iluminación LED ajustable para prácticas de biología.', stock: 0, total: 4 },
      { id: '5', name: 'Proyector Epson WXGA', category: 'Proyector', desc: '3300 lúmenes. Conexiones HDMI y VGA. Ideal para presentaciones académicas.', stock: 8, total: 8 },
      { id: '6', name: 'MacBook Pro M2 16"', category: 'Portátil', desc: 'Chip M2 Apple, 16GB RAM, 512GB SSD. Para diseño y multimedia.', stock: 1, total: 2 },
      { id: '7', name: 'Micrófono Rode NT1', category: 'Audiovisual', desc: 'Micrófono condensador de estudio con brazo articulado incluido.', stock: 4, total: 5 },
      { id: '8', name: 'Multímetro Digital Fluke', category: 'Laboratorio', desc: 'Medidor profesional para circuitos eléctricos. Precisión ±0.5%.', stock: 6, total: 10 }
    ];

    function normalizeText(value) {
      return (value || '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    }

    function resolveCategoryBucket(value) {
      const normalized = normalizeText(value);
      if (!normalized) return normalized;

      if (normalized.includes('portatil') || normalized.includes('laptop') || normalized.includes('comput')) {
        return 'computacion';
      }

      if (normalized.includes('camara') || normalized.includes('fotografia') || normalized.includes('foto')) {
        return 'fotografia';
      }

      if (
        normalized.includes('proyector') ||
        normalized.includes('audiovisual') ||
        normalized.includes('microfono') ||
        normalized.includes('audio') ||
        normalized.includes('video')
      ) {
        return 'audiovisual';
      }

      if (normalized.includes('laboratorio') || normalized.startsWith('lab')) {
        return 'laboratorio';
      }

      if (normalized.includes('electro') || normalized.includes('circuit')) {
        return 'electronica';
      }

      return normalized;
    }

    function getInventoryItems() {
      const items = db.get('inventory') || [];
      return items.length === 0 ? fallbackInventory : items;
    }

    function matchesCategoryFilter(itemCategory, categoryValue) {
      if (categoryValue === 'all') return true;
      const itemBucket = resolveCategoryBucket(itemCategory);
      const selectedBucket = resolveCategoryBucket(categoryValue);
      return itemBucket === selectedBucket;
    }

    function resolveAvailabilityBucket(stock) {
      if (stock <= 0) return 'out-of-stock';
      if (stock <= 2) return 'low-stock';
      return 'available';
    }

    function matchesAvailabilityFilter(stock, availabilityValue) {
      if (availabilityValue === 'all') return true;
      return resolveAvailabilityBucket(stock) === availabilityValue;
    }

    function getStockBadgeMarkup(stock) {
      const availabilityBucket = resolveAvailabilityBucket(stock);

      if (availabilityBucket === 'out-of-stock') {
        return `<span class="chip chip-red">Agotado</span>`;
      }

      if (availabilityBucket === 'low-stock') {
        if (stock === 1) {
          return `<span class="chip chip-yellow">¡Última unidad!</span>`;
        }

        return `<span class="chip chip-yellow">Pocas unidades (${stock})</span>`;
      }

      return `<span class="chip chip-green">Disponible (${stock})</span>`;
    }

    function getFilterOptionCount(selectId, optionValue) {
      const items = getInventoryItems();
      const normalizedSearch = normalizeText(searchInput.value);

      return items.filter((item) => {
        const normalizedName = normalizeText(item.name);
        const normalizedDesc = normalizeText(item.desc);

        if (normalizedSearch && !normalizedName.includes(normalizedSearch) && !normalizedDesc.includes(normalizedSearch)) {
          return false;
        }

        const categoryToApply = selectId === 'category-filter' ? optionValue : categoryFilter.value;
        if (!matchesCategoryFilter(item.category, categoryToApply)) {
          return false;
        }

        const availabilityToApply = selectId === 'availability-filter' ? optionValue : availabilityFilter.value;
        if (!matchesAvailabilityFilter(item.stock, availabilityToApply)) {
          return false;
        }

        return true;
      }).length;
    }

    // Parse URL params for initial filters (coming from dashboard)
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q');
    const initialCategory = urlParams.get('category');

    if (initialQuery) searchInput.value = initialQuery;
    if (initialCategory) {
      // Ensure category exists in dropdown, else default to 'all'
      const normalizedInitialCategory = resolveCategoryBucket(initialCategory);
      const options = Array.from(categoryFilter.options).map(o => o.value);
      if (options.includes(normalizedInitialCategory)) {
        categoryFilter.value = normalizedInitialCategory;
      }
    }

    const premiumSelectRoots = Array.from(document.querySelectorAll('.premium-select'));

    function closeAllPremiumSelects(exceptRoot = null) {
      premiumSelectRoots.forEach((root) => {
        if (root !== exceptRoot && typeof root.__closePremiumSelect === 'function') {
          root.__closePremiumSelect();
        }
      });
    }

    function setupPremiumSelect(root) {
      const nativeSelectId = root.dataset.nativeSelect;
      const nativeSelect = document.getElementById(nativeSelectId);
      if (!nativeSelect) return;

      const trigger = root.querySelector('.premium-select-trigger');
      const valueNode = root.querySelector('.premium-select-value');
      const searchNode = root.querySelector('.premium-select-search');
      const optionsNode = root.querySelector('.premium-select-options');

      const listboxId = `${nativeSelect.id}-listbox`;
      optionsNode.id = listboxId;
      trigger.setAttribute('aria-controls', listboxId);

      function renderOptions(query = '') {
        const normalized = normalizeText(query);
        const availableOptions = Array.from(nativeSelect.options).filter((option) => {
          return normalizeText(option.textContent).includes(normalized);
        });

        optionsNode.innerHTML = '';

        if (availableOptions.length === 0) {
          const emptyNode = document.createElement('div');
          emptyNode.className = 'premium-select-empty';
          emptyNode.textContent = 'Sin coincidencias';
          optionsNode.appendChild(emptyNode);
          return;
        }

        availableOptions.forEach((option) => {
          const optionButton = document.createElement('button');
          optionButton.type = 'button';
          optionButton.className = 'premium-select-option';
          optionButton.setAttribute('role', 'option');

          const isActive = option.value === nativeSelect.value;
          if (isActive) {
            optionButton.classList.add('active');
          }
          optionButton.setAttribute('aria-selected', isActive ? 'true' : 'false');

          const optionCount = getFilterOptionCount(nativeSelect.id, option.value);

          optionButton.innerHTML = `
            <span class="premium-select-option-main">
              <span class="premium-select-option-text">${option.textContent}</span>
              <span class="premium-select-count">${optionCount}</span>
            </span>
            <svg class="premium-select-check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          `;

          optionButton.addEventListener('click', () => {
            const changed = nativeSelect.value !== option.value;
            nativeSelect.value = option.value;
            if (changed) {
              nativeSelect.dispatchEvent(new Event('change'));
            }
            syncTrigger();
            closePanel();
            trigger.focus();
          });

          optionsNode.appendChild(optionButton);
        });
      }

      function syncTrigger() {
        const selected = nativeSelect.options[nativeSelect.selectedIndex];
        valueNode.textContent = selected ? selected.textContent : 'Seleccionar';
        renderOptions(searchNode.value);
      }

      function closePanel() {
        root.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        searchNode.value = '';
        renderOptions('');
      }

      function openPanel() {
        closeAllPremiumSelects(root);
        root.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        renderOptions(searchNode.value);
        searchNode.focus();
      }

      trigger.addEventListener('click', () => {
        if (root.classList.contains('open')) {
          closePanel();
        } else {
          openPanel();
        }
      });

      trigger.addEventListener('keydown', (event) => {
        if (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowDown') {
          event.preventDefault();
          openPanel();
        }
      });

      searchNode.addEventListener('input', () => {
        renderOptions(searchNode.value);
      });

      searchNode.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closePanel();
          trigger.focus();
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          const firstOption = optionsNode.querySelector('.premium-select-option');
          if (firstOption) firstOption.focus();
        }
      });

      optionsNode.addEventListener('keydown', (event) => {
        const currentOption = event.target.closest('.premium-select-option');
        if (!currentOption) return;

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          const nextOption = currentOption.nextElementSibling;
          if (nextOption && nextOption.classList.contains('premium-select-option')) {
            nextOption.focus();
          }
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault();
          const prevOption = currentOption.previousElementSibling;
          if (prevOption && prevOption.classList.contains('premium-select-option')) {
            prevOption.focus();
          } else {
            searchNode.focus();
          }
        }

        if (event.key === 'Escape') {
          event.preventDefault();
          closePanel();
          trigger.focus();
        }
      });

      nativeSelect.addEventListener('change', syncTrigger);

      root.__closePremiumSelect = closePanel;
      root.__syncPremiumSelect = syncTrigger;
      syncTrigger();
    }

    premiumSelectRoots.forEach(setupPremiumSelect);

    function refreshPremiumSelectState() {
      premiumSelectRoots.forEach((root) => {
        if (typeof root.__syncPremiumSelect === 'function') {
          root.__syncPremiumSelect();
        }
      });
    }

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.premium-select')) {
        closeAllPremiumSelects();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeAllPremiumSelects();
      }
    });

    // Helper: Map category to an icon
    function getCategoryIcon(category, size = 20) {
      const icons = {
        'computacion': '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>',
        'fotografia': '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>',
        'portatil': '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>',
        'camara': '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>',
        'proyector': '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><circle cx="12" cy="12" r="3"></circle><line x1="20" y1="12" x2="22" y2="12"></line>',
        'laboratorio': '<path d="M10 2v7.31"></path><path d="M14 9.3V1.99"></path><path d="M8.5 2h7"></path><path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path><path d="M5.52 16h12.96"></path>',
        'audiovisual': '<polygon points="5 3 19 12 5 21 5 3"></polygon>',
        'electronica': '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line>'
      };
      
      const normalizedCategory = normalizeText(category);
      const match = Object.keys(icons).find(k => normalizedCategory.includes(k));
      const iconPath = match ? icons[match] : '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>';
      
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>`;
    }

    // 4. Render Logic
    function renderCatalog() {
      // 1. Get raw inventory
      const items = getInventoryItems();

      // 2. Filter
      const q = normalizeText(searchInput.value);
      const c = categoryFilter.value;
      const a = availabilityFilter.value;

      const filtered = items.filter(item => {
        const normalizedName = normalizeText(item.name);
        const normalizedDesc = normalizeText(item.desc);

        // Search
        if (q && !normalizedName.includes(q) && !normalizedDesc.includes(q)) return false;

        // Category
        if (!matchesCategoryFilter(item.category, c)) {
          return false;
        }

        // Availability
        if (!matchesAvailabilityFilter(item.stock, a)) return false;
        
        return true;
      });

      // 3. Render
      catalogGrid.innerHTML = '';
      
      if (filtered.length === 0) {
        catalogGrid.style.display = 'none';
        emptyState.style.display = 'block';
        refreshPremiumSelectState();
        return;
      }
      
      catalogGrid.style.display = 'grid';
      emptyState.style.display = 'none';

      filtered.forEach(item => {
        const outOfStock = item.stock <= 0;
        const stockBadge = getStockBadgeMarkup(item.stock);

        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
          <div class="item-image">
            ${getCategoryIcon(item.category)}
          </div>
          <div class="item-body">
            <div class="item-category">${item.category}</div>
            <h3 class="item-title">${item.name}</h3>
            <p class="item-desc">${item.desc || 'Sin descripción disponible.'}</p>
            <div class="item-stock-badge">${stockBadge}</div>
            <div class="item-footer">
              <button class="btn btn-secondary" style="border: 1px solid var(--slate-300); flex: 1;" onclick="openProductModal(event, '${item.id}', '${item.name}', '${item.category}', '${item.desc}', ${item.stock}, ${item.total})">Ver Detalles</button>
              <a href="requests_estudiante.html?new=true&item=${item.id}" class="btn btn-primary" style="text-decoration: none; text-align: center; flex: 0.8; ${outOfStock ? 'opacity: 0.5; pointer-events: none;' : ''}">
                ${outOfStock ? 'No disponible' : 'Solicitar'}
              </a>
            </div>
          </div>
        `;
        
        // Add click handler to card
        card.addEventListener('click', (e) => {
          if (!e.target.closest('a') && !e.target.closest('button')) {
            openProductModal(e, item.id, item.name, item.category, item.desc, item.stock, item.total);
          }
        });
        
        catalogGrid.appendChild(card);
      });

      refreshPremiumSelectState();
    }

    // 5. Setup Listeners
    searchInput.addEventListener('input', renderCatalog);
    categoryFilter.addEventListener('change', renderCatalog);
    availabilityFilter.addEventListener('change', renderCatalog);

    // Initial render
    renderCatalog();

    // Notification badge logic
    const mockNotifications = [
      { id: 1, read: false },
      { id: 2, read: false },
      { id: 3, read: true }
    ];
    const notifBellBadge = document.getElementById('notif-bell-badge');
    const unseenCount = mockNotifications.filter(n => !n.read).length;
    if (unseenCount > 0) {
      notifBellBadge.classList.add('show');
    }

    // Modal Logic
    const modalBackdrop = document.getElementById('productModalBackdrop');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCloseBtn2 = document.getElementById('modalCloseBtn2');

    window.openProductModal = function(e, itemId, name, category, desc, stock, total) {
      document.getElementById('modalProductName').textContent = name;
      document.getElementById('modalCategory').textContent = category;
      document.getElementById('modalDescription').textContent = desc || 'Sin descripción disponible.';
      document.getElementById('modalStockTotal').textContent = total;
      document.getElementById('modalStockAvailable').textContent = stock;
      document.getElementById('modalProductImage').innerHTML = getCategoryIcon(category, 120);
      
      const availBox = document.getElementById('modalAvailabilityBox');
      const outStockBox = document.getElementById('modalOutOfStockBox');
      const availabilityBucket = resolveAvailabilityBucket(stock);
      
      if (availabilityBucket === 'available') {
        availBox.style.display = 'block';
        availBox.style.background = 'var(--green-50)';
        availBox.style.borderColor = 'var(--green-200)';
        availBox.innerHTML = '<div style="color: var(--green-700); font-weight: 600;">✓ Disponible para solicitar</div>';
        outStockBox.style.display = 'none';
      } else if (availabilityBucket === 'low-stock') {
        availBox.style.display = 'block';
        availBox.style.background = '#fffbeb';
        availBox.style.borderColor = '#fcd34d';
        availBox.innerHTML = `<div style="color: #b45309; font-weight: 600;">! Stock limitado: ${stock === 1 ? 'queda 1 unidad disponible' : `quedan ${stock} unidades disponibles`}</div>`;
        outStockBox.style.display = 'none';
      } else {
        availBox.style.display = 'none';
        outStockBox.style.display = 'block';
      }
      
      const requestBtn = document.getElementById('modalRequestBtn');
      if (stock > 0) {
        requestBtn.href = `requests_estudiante.html?new=true&item=${itemId}`;
        requestBtn.style.opacity = '1';
        requestBtn.style.pointerEvents = 'auto';
      } else {
        requestBtn.href = '#';
        requestBtn.style.opacity = '0.5';
        requestBtn.style.pointerEvents = 'none';
      }
      
      modalBackdrop.classList.add('active');
    };

    function closeModal() {
      modalBackdrop.classList.remove('active');
    }

    modalCloseBtn.addEventListener('click', closeModal);
    modalCloseBtn2.addEventListener('click', closeModal);
    
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
