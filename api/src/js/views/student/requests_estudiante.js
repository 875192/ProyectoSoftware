import { api } from '../../js/core/api.js';
    import { auth } from '../../js/core/auth.js';
    import { db } from '../../js/core/db.js';
    import { ui } from '../../js/components/ui.js';

    // --- Stripe initialization ---
    let stripe;
    let stripeElements;
    let cardElement;
    let currentClientSecret = null;
    let cardMounted = false;
    let stripeInitPromise = null;

    async function initStripe() {
      if (stripeInitPromise) return stripeInitPromise;

      stripeInitPromise = (async () => {
        try {
          const config = await api.getStripeConfig();
          if (!config?.publishableKey) {
            throw new Error('No se recibió la clave pública de Stripe.');
          }

          stripe = Stripe(config.publishableKey);
          stripeElements = stripe.elements();
          cardElement = stripeElements.create('card', {
            style: {
              base: {
                fontSize: '15px',
                color: '#1e293b',
                fontFamily: '"Inter", system-ui, sans-serif',
                '::placeholder': { color: '#94a3b8' },
              },
              invalid: { color: '#dc2626' },
            },
            hidePostalCode: true,
          });
          cardElement.on('change', (event) => {
            const errorEl = document.getElementById('card-errors');
            errorEl.textContent = event.error ? event.error.message : '';
          });

          return true;
        } catch (err) {
          console.error('Error inicializando Stripe:', err);
          ui.showToast('Error conectando con el servidor de pagos. Comprueba tu conexión.', 'error');
          return false;
        }
      })();

      return stripeInitPromise;
    }

    async function mountCardElement() {
      if (!cardElement) {
        await initStripe();
      }

      if (cardElement) {
        if (cardMounted) {
          cardElement.unmount();
        }
        cardElement.mount('#card-element');
        cardMounted = true;
      } else {
        document.getElementById('card-errors').textContent = 'El método de pago no se pudo cargar. Reintenta más tarde.';
      }
    }

    initStripe();

    // 1. Auth Guard
    const user = auth.requireAuth(['estudiante', 'profesor']);
    if (!user) throw new Error("Not authenticated");

    // 2. Setup Base UI
    ui.setupLayout(user);

    // 3. Elements Mapping
    const requestsListContainer = document.getElementById('requests-list');
    const emptyState = document.getElementById('empty-table-state');
    const emptyStateMessage = document.getElementById('empty-state-message');
    const resultsCount = document.getElementById('results-count');
    const boardTitle = document.getElementById('requests-board-title');
    const statusTabsContainer = document.getElementById('status-tabs');
    const statusTabs = document.querySelectorAll('.status-tab');
    const viewToggleButtons = document.querySelectorAll('.view-toggle-btn');
    const detailStatusChip = document.getElementById('detail-status-chip');
    const detailEmpty = document.getElementById('detail-empty');
    const detailContent = document.getElementById('detail-content');
    const detailItem = document.getElementById('detail-item');
    const detailPeriod = document.getElementById('detail-period');
    const detailPurpose = document.getElementById('detail-purpose');
    const detailLocation = document.getElementById('detail-location');
    const detailTeacher = document.getElementById('detail-teacher');
    const detailDeposit = document.getElementById('detail-deposit');
    const detailCategory = document.getElementById('detail-category');
    const detailActions = document.getElementById('detail-actions');
    const detailTimeline = document.getElementById('detail-timeline');
    const modal = document.getElementById('request-modal');
    const btnNewReq = document.getElementById('btn-new-request');
    const btnCloseModal = document.getElementById('close-modal');
    const btnCancelReq = document.getElementById('btn-cancel-req');
    const reqForm = document.getElementById('new-req-form');
    const selItem = document.getElementById('req-item');
    const reqStartInput = document.getElementById('req-start');
    const reqEndInput = document.getElementById('req-end');
    const reqPurposeInput = document.getElementById('req-purpose');
    const requestModalTitle = document.getElementById('request-modal-title');
    const requestModalSubtitle = document.getElementById('request-modal-subtitle');
    const requestStepItems = document.querySelectorAll('.request-step-item');
    const paymentSummaryItem = document.getElementById('pay-summary-item');
    const paymentSummaryRange = document.getElementById('pay-summary-range');
    const paymentSummaryPurpose = document.getElementById('pay-summary-purpose');

    // Payment Wizard Elements
    const step1 = document.getElementById('req-step-1');
    const step2 = document.getElementById('req-step-2');
    const btnToPay = document.getElementById('btn-to-pay');
    const btnBackStep = document.getElementById('btn-back-step');

    let currentFilter = 'all';
    let currentView = 'lista';
    let selectedRequestId = null;
    let requestsList = [];
    let inventoryMap = new Map();

    const boardColumns = [
      { key: 'pendiente', label: 'Pendientes' },
      { key: 'aprobada', label: 'Aprobadas' },
      { key: 'en_prestamo', label: 'En préstamo' },
      { key: 'finalizada', label: 'Finalizadas' },
      { key: 'rechazada', label: 'Rechazadas' }
    ];

    const requestStepContent = {
      1: {
        title: 'Completa los datos de la solicitud',
        subtitle: 'Selecciona el equipamiento, define fechas y continúa al pago de fianza en dos pasos.'
      },
      2: {
        title: 'Confirma el pago de la fianza',
        subtitle: 'Revisa el resumen de tu solicitud y valida el método de pago para enviarla.'
      }
    };

    function updatePaymentSummary() {
      const selectedOption = selItem.options[selItem.selectedIndex];
      const selectedMaterial = selectedOption && selItem.value
        ? selectedOption.textContent
        : 'Material pendiente de seleccionar';

      const hasDates = reqStartInput.value && reqEndInput.value;
      const rangeText = hasDates
        ? `${reqStartInput.value} a ${reqEndInput.value}`
        : 'Define las fechas en el paso anterior';

      const purposeText = reqPurposeInput.value.trim() || 'Añade una finalidad de uso para completar el resumen';

      paymentSummaryItem.textContent = selectedMaterial;
      paymentSummaryRange.textContent = rangeText;
      paymentSummaryPurpose.textContent = purposeText;
    }

    function setRequestStep(stepNumber) {
      const isPaymentStep = stepNumber === 2;

      step1.style.display = isPaymentStep ? 'none' : 'block';
      step2.style.display = isPaymentStep ? 'block' : 'none';

      requestStepItems.forEach((stepItem) => {
        const itemStep = Number(stepItem.dataset.requestStep);
        stepItem.classList.toggle('is-active', itemStep === stepNumber);
        stepItem.classList.toggle('is-complete', itemStep < stepNumber);
      });

      const config = requestStepContent[stepNumber];
      if (config) {
        requestModalTitle.textContent = config.title;
        requestModalSubtitle.textContent = config.subtitle;
      }

      if (isPaymentStep) {
        updatePaymentSummary();
        // Mount Stripe card element after modal step 2 is fully visible in DOM
        setTimeout(() => {
          mountCardElement();
        }, 50);
      }
    }

    function refreshPaymentMethodStyles(selectedValue = null) {
      // Stripe Elements handles styling — no radio buttons to manage
    }

    function setFieldInvalid(field, customMessage = null) {
      if (!field) return;
      field.setAttribute('aria-invalid', 'true');

      const errorNode = field.nextElementSibling;
      if (errorNode && errorNode.classList.contains('form-error')) {
        if (!errorNode.dataset.defaultText) {
          errorNode.dataset.defaultText = errorNode.textContent;
        }
        errorNode.textContent = customMessage || errorNode.dataset.defaultText;
      }
    }

    function clearFieldInvalid(field) {
      if (!field) return;
      field.removeAttribute('aria-invalid');

      const errorNode = field.nextElementSibling;
      if (errorNode && errorNode.classList.contains('form-error') && errorNode.dataset.defaultText) {
        errorNode.textContent = errorNode.dataset.defaultText;
      }
    }

    function validateRequestStep1() {
      let isValid = true;

      if (!selItem.value) {
        setFieldInvalid(selItem);
        isValid = false;
      } else {
        clearFieldInvalid(selItem);
      }

      if (!reqStartInput.value) {
        setFieldInvalid(reqStartInput);
        isValid = false;
      } else {
        clearFieldInvalid(reqStartInput);
      }

      if (!reqEndInput.value) {
        setFieldInvalid(reqEndInput);
        isValid = false;
      } else {
        clearFieldInvalid(reqEndInput);
      }

      if (!reqPurposeInput.value.trim()) {
        setFieldInvalid(reqPurposeInput);
        isValid = false;
      } else {
        clearFieldInvalid(reqPurposeInput);
      }

      if (reqStartInput.value && reqEndInput.value && reqEndInput.value < reqStartInput.value) {
        setFieldInvalid(reqEndInput, 'La fecha fin debe ser igual o posterior a la fecha de inicio.');
        isValid = false;
      }

      return isValid;
    }

    // 4. Data Layer & Render (Mock simulated)
    function loadData() {
      // Create some initial mock data for the simulation to work properly, or fall back to db
      let allReqs = db.filter('requests', r => r.userId === user.id);
      let inv = db.get('inventory') || [];

      const sampleInventoryForTesting = [
        { id: 'demo_tripode', name: 'Trípode Manfrotto Compact', stock: 4 },
        { id: 'demo_microfono', name: 'Micrófono Rode NT-USB', stock: 3 }
      ];
      
      // Seed logic (just in case db is empty out-of-the-box for the prototype)
      if(inv.length === 0) {
        inv = [
          { id: '1', name: 'Portátil Dell XPS 15', stock: 5 },
          { id: '2', name: 'Cámara Canon EOS R5', stock: 2 },
          { id: '3', name: 'Kit Arduino Uno Rev3', stock: 15 }
        ];
      }

      // Ensure test options are available in the request dropdown.
      let inventoryUpdated = false;
      const existingInventoryIds = new Set(inv.map(item => String(item.id)));
      sampleInventoryForTesting.forEach((sampleItem) => {
        if (!existingInventoryIds.has(String(sampleItem.id))) {
          inv.push(sampleItem);
          inventoryUpdated = true;
        }
      });

      if (inventoryUpdated) {
        db.set('inventory', inv);
      }
      
      if(allReqs.length === 0) {
        allReqs = [
          { id: 'req_1', userId: user.id, itemId: '1', startDate: '2026-03-01', endDate: '2026-03-05', status: 'finalizada', purpose: 'Práctica TFG' },
          { id: 'req_2', userId: user.id, itemId: '2', startDate: '2026-03-10', endDate: '2026-03-12', status: 'aprobada', purpose: 'Grabación de vídeo corto' }
        ];
        db.set('requests', allReqs);
      }

      inventoryMap.clear();
      inv.forEach(i => inventoryMap.set(i.id, i));
      requestsList = allReqs.sort((a,b) => new Date(b.startDate) - new Date(a.startDate));
      if (!selectedRequestId || !requestsList.some(req => req.id === selectedRequestId)) {
        selectedRequestId = requestsList[0]?.id ?? null;
      }
      
      populateInventorySelect(inv);
      renderTable();
    }

    function populateInventorySelect(inv) {
      // Clear existing (except first placeholder)
      while(selItem.options.length > 1) selItem.remove(1);
      
      inv.forEach(item => {
        if(item.stock > 0) {
          const opt = document.createElement('option');
          opt.value = item.id;
          opt.textContent = `${item.name} (${item.stock} disponibles)`;
          selItem.appendChild(opt);
        }
      });
    }

    function getFilterCounts() {
      return {
        all: requestsList.length,
        pendiente: requestsList.filter(r => r.status === 'pendiente').length,
        aprobada: requestsList.filter(r => r.status === 'aprobada').length,
        en_prestamo: requestsList.filter(r => r.status === 'en_prestamo').length,
        finalizada: requestsList.filter(r => r.status === 'finalizada').length,
        rechazada: requestsList.filter(r => r.status === 'rechazada').length
      };
    }

    function syncFilterTabsVisibility(counts) {
      const isCurrentFilterVisible = currentFilter === 'all' || (counts[currentFilter] ?? 0) > 0;
      if (!isCurrentFilterVisible) {
        currentFilter = 'all';
      }

      statusTabs.forEach(tab => {
        const filterKey = tab.dataset.filter;
        const shouldShow = filterKey === 'all' || (counts[filterKey] ?? 0) > 0;

        tab.style.display = shouldShow ? 'inline-flex' : 'none';
        tab.classList.toggle('active', filterKey === currentFilter);
      });
    }

    function updateStats() {
      const counts = getFilterCounts();

      document.getElementById('tab-all-count').textContent = counts.all;
      document.getElementById('tab-pending-count').textContent = counts.pendiente;
      document.getElementById('tab-approved-count').textContent = counts.aprobada;
      document.getElementById('tab-active-count').textContent = counts.en_prestamo;
      document.getElementById('tab-completed-count').textContent = counts.finalizada;
      document.getElementById('tab-rejected-count').textContent = counts.rechazada;

      syncFilterTabsVisibility(counts);
    }

    function syncViewModeUI() {
      const isListView = currentView === 'lista';

      boardTitle.textContent = isListView ? 'Bandeja de solicitudes' : 'Tablero de solicitudes';
      statusTabsContainer.style.display = isListView ? 'flex' : 'none';

      viewToggleButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.view === currentView);
      });
    }

    function createRequestCard(req) {
      const item = inventoryMap.get(req.itemId);
      const badgeHTML = getStatusBadge(req.status);
      const context = getAcademicContext(item?.name || '');

      const card = document.createElement('article');
      card.className = `request-card ${selectedRequestId === req.id ? 'active' : ''}`;
      card.title = 'Haz clic para ver más detalles';
      card.innerHTML = `
        <div class="request-top">
          <div class="request-title-wrap">
            <h3 class="request-title">${item ? item.name : 'Elemento desconocido'}</h3>
            ${badgeHTML}
          </div>
          <span class="request-range">${req.startDate} a ${req.endDate}</span>
        </div>
        <div class="request-meta-line">
          <span>${context.category}</span>
          <span>•</span>
          <span>${context.location}</span>
        </div>
        <p class="request-purpose">${req.purpose}</p>
        <div class="request-foot">
          <span class="request-open-hint">Selecciona la tarjeta para ver el detalle</span>
          ${req.status === 'pendiente'
            ? '<button class="request-cancel-btn" type="button">Cancelar solicitud</button>'
            : '<span class="request-no-actions">Sin acciones disponibles</span>'}
        </div>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.request-cancel-btn')) return;
        selectRequest(req.id);
      });

      const cancelBtn = card.querySelector('.request-cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          window.cancelReq(req.id);
        });
      }

      return card;
    }

    function renderBoardView() {
      requestsListContainer.classList.add('board-view');
      requestsListContainer.style.display = 'flex';
      emptyState.style.display = 'none';
      resultsCount.textContent = `${requestsList.length} solicitud${requestsList.length === 1 ? '' : 'es'}`;

      boardColumns.forEach(column => {
        const requestsByStatus = requestsList.filter(req => req.status === column.key);
        if (requestsByStatus.length === 0) return;

        const columnNode = document.createElement('section');
        columnNode.className = 'kanban-column';
        columnNode.innerHTML = `
          <header class="kanban-column-head">
            <h3 class="kanban-column-title">${column.label}</h3>
            <span class="kanban-column-count">${requestsByStatus.length}</span>
          </header>
          <div class="kanban-column-body"></div>
        `;

        const columnBody = columnNode.querySelector('.kanban-column-body');
        requestsByStatus.forEach(req => {
          columnBody.appendChild(createRequestCard(req));
        });

        requestsListContainer.appendChild(columnNode);
      });
    }

    function renderListView() {
      requestsListContainer.classList.remove('board-view');

      const filter = currentFilter;
      const filtered = filter === 'all' ? requestsList : requestsList.filter(r => r.status === filter);
      resultsCount.textContent = `${filtered.length} resultado${filtered.length === 1 ? '' : 's'}`;

      if (filtered.length > 0 && !filtered.some(req => req.id === selectedRequestId)) {
        selectedRequestId = filtered[0].id;
      }

      if (filtered.length === 0 && !requestsList.some(req => req.id === selectedRequestId)) {
        selectedRequestId = requestsList[0]?.id ?? null;
      }

      if (filtered.length === 0) {
        selectedRequestId = null;
        requestsListContainer.style.display = 'none';
        emptyStateMessage.textContent = 'No tienes solicitudes que coincidan con estos filtros.';
        emptyState.style.display = 'block';
        renderDetailPanel();
        return;
      }

      requestsListContainer.style.display = 'grid';
      emptyState.style.display = 'none';
      filtered.forEach(req => {
        requestsListContainer.appendChild(createRequestCard(req));
      });
    }

    function getStatusBadge(status) {
      if (status === 'pendiente') return '<span class="chip chip-yellow">Pendiente</span>';
      if (status === 'aprobada') return '<span class="chip chip-green">Aprobada</span>';
      if (status === 'rechazada') return '<span class="chip chip-red">Rechazada</span>';
      if (status === 'en_prestamo') return '<span class="chip chip-blue">En Préstamo</span>';
      if (status === 'finalizada') return '<span class="chip chip-green">Finalizada</span>';
      return '<span class="chip">Sin estado</span>';
    }

    function getStatusLabel(status) {
      if (status === 'pendiente') return 'Pendiente de revisión';
      if (status === 'aprobada') return 'Aprobada';
      if (status === 'en_prestamo') return 'En préstamo';
      if (status === 'finalizada') return 'Finalizada';
      if (status === 'rechazada') return 'Rechazada';
      return 'Sin estado';
    }

    function getAcademicContext(itemName = '') {
      const name = itemName.toLowerCase();
      if (name.includes('cámara') || name.includes('camara')) {
        return {
          category: 'Producción audiovisual',
          location: 'Lab Multimedia B-2',
          teacher: 'Prof. Laura Méndez'
        };
      }
      if (name.includes('arduino') || name.includes('kit')) {
        return {
          category: 'Electrónica y prototipado',
          location: 'Laboratorio Maker A-1',
          teacher: 'Prof. Daniel Ruiz'
        };
      }
      return {
        category: 'Informática y docencia',
        location: 'Aula de Mantenimiento - Lab 3',
        teacher: 'Prof. Marta Gómez'
      };
    }

    function getTimelineForStatus(status) {
      const steps = [
        { key: 'sent', label: 'Solicitud enviada' },
        { key: 'review', label: 'Revisión académica' },
        { key: 'approved', label: 'Recogida habilitada' },
        { key: 'loan', label: 'Material en préstamo' },
        { key: 'closed', label: 'Cierre del préstamo' }
      ];

      let currentStep = 0;
      if (status === 'pendiente') currentStep = 1;
      else if (status === 'aprobada') currentStep = 2;
      else if (status === 'en_prestamo') currentStep = 3;
      else if (status === 'finalizada') currentStep = 4;
      else if (status === 'rechazada') currentStep = 1;

      return { steps, currentStep, isRejected: status === 'rechazada' };
    }

    function getDetailActions(status) {
      if (status === 'pendiente') {
        return `
          <button class="detail-action-btn" data-action="edit">Editar solicitud</button>
          <button class="detail-action-btn danger" data-action="cancel">Cancelar</button>
        `;
      }
      if (status === 'aprobada') {
        return `
          <button class="detail-action-btn" data-action="pickup">Ver código de recogida</button>
          <button class="detail-action-btn" data-action="proof">Descargar comprobante</button>
        `;
      }
      if (status === 'en_prestamo') {
        return `
          <button class="detail-action-btn" data-action="extend">Solicitar prórroga</button>
          <button class="detail-action-btn" data-action="return">Registrar devolución</button>
        `;
      }
      if (status === 'finalizada') {
        return `
          <button class="detail-action-btn" data-action="proof">Descargar comprobante</button>
        `;
      }
      return `
        <button class="detail-action-btn" data-action="new">Nueva solicitud</button>
      `;
    }

    function renderDetailPanel() {
      const request = requestsList.find(req => req.id === selectedRequestId);
      if (!request) {
        detailStatusChip.textContent = 'Sin selección';
        detailEmpty.style.display = 'block';
        detailContent.style.display = 'none';
        return;
      }

      const item = inventoryMap.get(request.itemId);
      const context = getAcademicContext(item?.name || '');
      const timelineData = getTimelineForStatus(request.status);

      detailStatusChip.textContent = getStatusLabel(request.status);
      detailEmpty.style.display = 'none';
      detailContent.style.display = 'grid';

      detailItem.textContent = item ? item.name : 'Elemento desconocido';
      detailPeriod.textContent = `${request.startDate} - ${request.endDate}`;
      detailPurpose.textContent = request.purpose || 'Sin finalidad registrada';
      detailLocation.textContent = context.location;
      detailTeacher.textContent = context.teacher;
      detailDeposit.textContent = '10,00 € (reembolsable)';
      detailCategory.textContent = context.category;
      detailActions.innerHTML = getDetailActions(request.status);

      detailTimeline.innerHTML = timelineData.steps.map((step, index) => {
        let className = 'pending';
        if (timelineData.isRejected && index === timelineData.currentStep) {
          className = 'rejected';
        } else if (index < timelineData.currentStep) {
          className = 'done';
        } else if (index === timelineData.currentStep) {
          className = 'current';
        }
        return `<li class="${className}"><span>${step.label}</span><small>${className === 'done' ? 'Completado' : className === 'current' ? 'En curso' : className === 'rejected' ? 'Detenido' : 'Pendiente'}</small></li>`;
      }).join('');
    }

    function selectRequest(requestId) {
      selectedRequestId = requestId;
      renderTable();
    }

    function renderTable() {
      updateStats();
      syncViewModeUI();
      if (!selectedRequestId || !requestsList.some(req => req.id === selectedRequestId)) {
        selectedRequestId = requestsList[0]?.id ?? null;
      }

      requestsListContainer.innerHTML = '';
      if (requestsList.length === 0) {
        selectedRequestId = null;
        requestsListContainer.classList.remove('board-view');
        requestsListContainer.style.display = 'none';
        emptyStateMessage.textContent = 'Todavía no tienes solicitudes registradas.';
        emptyState.style.display = 'block';
        renderDetailPanel();
      } else {
        if (currentView === 'tablero') {
          renderBoardView();
        } else {
          renderListView();
        }
        renderDetailPanel();
      }
    }

    // Modal Control Functions
    function openModal(itemIdDefault = null) {
      reqForm.reset();
      // Remove invalid states
      reqForm.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));

      // Set default inputs
      const today = new Date().toISOString().split('T')[0];
      reqStartInput.min = today;
      reqEndInput.min = today;

      if(itemIdDefault) {
        selItem.value = itemIdDefault;
      }

      refreshPaymentMethodStyles('tarjeta');
      updatePaymentSummary();
      setRequestStep(1);
      modal.classList.add('open');
    }

    function closeModal() {
      modal.classList.remove('open');
      // Unmount Stripe card element so it can be re-mounted cleanly
      if (cardElement && cardMounted) {
        cardElement.unmount();
        cardMounted = false;
      }
      currentClientSecret = null;
      setTimeout(() => {
        setRequestStep(1);
      }, 200);
    }

    // 5. Setup Listeners
    btnNewReq.addEventListener('click', () => openModal());
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelReq.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('open')) {
        closeModal();
      }
    });
    statusTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        currentFilter = tab.dataset.filter;
        renderTable();
      });
    });
    viewToggleButtons.forEach(button => {
      button.addEventListener('click', () => {
        const nextView = button.dataset.view;
        if (!nextView || nextView === currentView) return;
        currentView = nextView;
        renderTable();
      });
    });

    // Wizard: Step 1 -> Step 2
    btnToPay.addEventListener('click', () => {
      const isValid = validateRequestStep1();
      if (!isValid) {
        ui.showToast('Completa los campos obligatorios para continuar.', 'error');
        return;
      }

      updatePaymentSummary();
      setRequestStep(2);
    });

    // Wizard: Step 2 -> Step 1
    btnBackStep.addEventListener('click', () => {
      setRequestStep(1);
    });

    // Payment method selection styling (no longer needed with Stripe Elements)

    [selItem, reqStartInput, reqEndInput, reqPurposeInput].forEach((field) => {
      field.addEventListener('change', updatePaymentSummary);
      field.addEventListener('input', updatePaymentSummary);
    });

    [selItem, reqStartInput, reqEndInput, reqPurposeInput].forEach((field) => {
      const errorNode = field.nextElementSibling;
      if (errorNode && errorNode.classList.contains('form-error') && !errorNode.dataset.defaultText) {
        errorNode.dataset.defaultText = errorNode.textContent;
      }

      field.addEventListener('change', () => {
        clearFieldInvalid(field);
        if (field === reqStartInput && reqStartInput.value) {
          reqEndInput.min = reqStartInput.value;
        }
      });

      field.addEventListener('input', () => {
        if (field === reqPurposeInput) {
          if (reqPurposeInput.value.trim()) {
            clearFieldInvalid(reqPurposeInput);
          }
        } else {
          clearFieldInvalid(field);
        }
      });
    });

    // Form submission — REAL Stripe payment
    const btnSubmitReq = document.getElementById('btn-submit-req');
    btnSubmitReq.addEventListener('click', async () => {
      if (!validateRequestStep1()) {
        setRequestStep(1);
        ui.showToast('Faltan campos obligatorios por completar.', 'error');
        return;
      }

      // Disable button to avoid double-click
      btnSubmitReq.disabled = true;
      btnSubmitReq.textContent = 'Procesando...';

      try {
        if (!stripe || !cardElement) {
          const ready = await initStripe();
          if (!ready || !stripe || !cardElement) {
            throw new Error('No se pudo inicializar el método de pago.');
          }
          await mountCardElement();
        }

        // 1. Create PaymentIntent on the backend (1000 cents = 10,00 €)
        if (!currentClientSecret) {
          const intentResult = await api.createPaymentIntent(1000);
          currentClientSecret = intentResult.clientSecret;
        }

        // 2. Confirm card payment with Stripe
        const { error, paymentIntent } = await stripe.confirmCardPayment(currentClientSecret, {
          payment_method: { card: cardElement },
        });

        if (error) {
          document.getElementById('card-errors').textContent = error.message;
          ui.showToast(error.message, 'error');
          btnSubmitReq.disabled = false;
          btnSubmitReq.textContent = 'Procesar Pago y Enviar';
          return;
        }

        if (paymentIntent.status === 'succeeded') {
          // 3. Create the solicitud with the PaymentIntent ID
          const selectedOption = selItem.options[selItem.selectedIndex];
          const materialName = selectedOption ? selectedOption.textContent.replace(/\s*\(.*\)$/, '') : '';

          await api.createSolicitud({
            userId: user.id,
            materialName: materialName,
            startDate: reqStartInput.value,
            endDate: reqEndInput.value,
            purpose: reqPurposeInput.value.trim(),
            stripePaymentIntentId: paymentIntent.id,
          });

          ui.showToast('Pago de 10,00 € procesado con éxito', 'success');
          setTimeout(() => ui.showToast('Solicitud creada correctamente', 'success'), 1000);

          currentClientSecret = null;
          closeModal();

          // Reload solicitudes from the API
          const updatedSolicitudes = await api.getSolicitudes(user.id);
          requestsList = updatedSolicitudes;
          renderTable();
        }
      } catch (err) {
        console.error('Error en el pago:', err);
        ui.showToast('Error al procesar el pago. Inténtalo de nuevo.', 'error');
      } finally {
        btnSubmitReq.disabled = false;
        btnSubmitReq.textContent = 'Procesar Pago y Enviar';
      }
    });

    // Check URL parameters for direct opening
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.get('new') === 'true') {
      setTimeout(() => openModal(urlParams.get('item')), 150);
      // Clean url to avoid re-opening on refresh
      window.history.replaceState({}, document.title, "requests_estudiante.html");
    }

    // Global hook for inline row buttons
    window.cancelReq = function(reqId) {
      if(confirm('¿Estás seguro de cancelar esta solicitud?')) {
        const target = requestsList.find(r => r.id === reqId);
        if(target) {
          target.status = 'rechazada'; // or completely map a new status 'cancelada'
          db.set('requests', requestsList);
          ui.showToast('Solicitud cancelada', 'success');
          renderTable();
        }
      }
    };

    detailActions.addEventListener('click', (event) => {
      const action = event.target.dataset.action;
      if (!action) return;

      const targetReq = requestsList.find(req => req.id === selectedRequestId);
      if (!targetReq) return;

      if (action === 'cancel') {
        window.cancelReq(targetReq.id);
        return;
      }

      if (action === 'edit') {
        openModal(targetReq.itemId);
        reqStartInput.value = targetReq.startDate;
        reqEndInput.value = targetReq.endDate;
        reqPurposeInput.value = targetReq.purpose || '';
        updatePaymentSummary();
        ui.showToast('Puedes editar y reenviar la solicitud.', 'success');
        return;
      }

      if (action === 'pickup') {
        ui.showToast('Código de recogida generado para mostrar en conserjería.', 'success');
        return;
      }

      if (action === 'proof') {
        ui.showToast('Comprobante listo para descarga.', 'success');
        return;
      }

      if (action === 'extend') {
        ui.showToast('Solicitud de prórroga enviada al docente responsable.', 'success');
        return;
      }

      if (action === 'return') {
        targetReq.status = 'finalizada';
        db.set('requests', requestsList);
        renderTable();
        ui.showToast('Devolución registrada correctamente.', 'success');
        return;
      }

      if (action === 'new') {
        openModal();
      }
    });

    // Auto-init
    loadData();

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

    refreshPaymentMethodStyles('tarjeta');
    updatePaymentSummary();
    setRequestStep(1);
