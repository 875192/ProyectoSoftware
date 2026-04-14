import { auth } from '../../js/core/auth.js';
    import { db } from '../../js/core/db.js';
    import { ui } from '../../js/components/ui.js';

    // 1. Auth Check - Allow student & profesor
    const user = auth.requireAuth(['estudiante', 'profesor']);
    if(!user) throw new Error("Not authenticated");

    // 2. Setup Layout
    ui.setupLayout(user);
    const hasSeenWelcome = sessionStorage.getItem('welcomeShown');
    if (!hasSeenWelcome) {
      setTimeout(() => ui.showToast(`Autenticación exitosa. Hola, ${user.name}`, 'success'), 500);
      sessionStorage.setItem('welcomeShown', 'true');
    }

    // Set Welcome Name
    document.getElementById('welcome-name').textContent = user.name.split(' ')[0];

    // Quick Search Logic
    const searchInput = document.getElementById('quick-search-input');
    
    function performSearch() {
      const query = searchInput.value.trim();
      if (query) window.location.href = `catalog_profesor.html?q=${encodeURIComponent(query)}`;
      else window.location.href = 'catalog_profesor.html';
    }
    
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
      });
    }

    // 3. Load Data
    const userRequests = db.filter('requests', r => r.userId === user.id);
    
    // Sort descending by date
    userRequests.sort((a,b) => new Date(b.startDate) - new Date(a.startDate));

    const activeReqs = userRequests.filter(r => r.status === 'en_prestamo');
    const pendingReqs = userRequests.filter(r => r.status === 'pendiente');
    const approvedReqs = userRequests.filter(r => r.status === 'aprobada');

    document.getElementById('active-count').textContent = activeReqs.length;
    document.getElementById('pending-count').textContent = pendingReqs.length;
    document.getElementById('approved-count').textContent = approvedReqs.length;

    // Build Table
    const tbody = document.getElementById('recent-requests-body');
    const inventory = db.get('inventory');
    
    if (userRequests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--slate-500); padding: 3rem;">No existen registros de movimientos en el sistema.</td></tr>`;
    } else {
      userRequests.slice(0, 5).forEach(req => {
        const item = inventory.find(i => i.id === req.itemId);
        let badgeClass = 'chip-blue';
        let statusText = req.status;
        if(req.status === 'pendiente') { badgeClass = 'chip-yellow'; statusText = 'Pendiente Validación' }
        else if(req.status === 'aprobada') { badgeClass = 'chip-green'; statusText = 'Autorizada' }
        else if(req.status === 'rechazada') { badgeClass = 'chip-red'; statusText = 'Declinada' }
        else if(req.status === 'en_prestamo') { badgeClass = 'chip-blue'; statusText = 'En Posesión' }
        else if(req.status === 'finalizada') { badgeClass = 'chip-green'; statusText = 'Devuelto' }

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.style.transition = 'background-color 0.2s';
        tr.onmouseover = () => tr.style.backgroundColor = 'var(--slate-50)';
        tr.onmouseout = () => tr.style.backgroundColor = 'transparent';
        tr.title = 'Haz clic para ver más detalles';
        tr.onclick = () => openLoanDetails(req, item, badgeClass, statusText);
        tr.innerHTML = `
          <td style="font-weight: 500;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--slate-400)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              ${item ? item.name : 'Elemento Removido'}
            </div>
          </td>
          <td style="color: var(--slate-600);">${req.startDate} al ${req.endDate}</td>
          <td style="color: var(--slate-500);">${req.purpose || 'No especificado'}</td>
          <td><span class="chip ${badgeClass}">${statusText}</span></td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Modal Logic
    const modal = document.getElementById('loan-details-modal');
    const btnClose = document.getElementById('close-modal-btn');
    const btnPrimaryAction = document.getElementById('modal-primary-action');

    function openLoanDetails(req, item, badgeClass, statusText) {
      document.getElementById('modal-item-name').innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        ${item ? item.name : 'Elemento Desconocido'}
      `;
      document.getElementById('modal-status-badge').innerHTML = `<span class="chip ${badgeClass}">${statusText}</span>`;
      document.getElementById('modal-dates').textContent = `${req.startDate} - ${req.endDate}`;
      document.getElementById('modal-purpose').textContent = req.purpose || 'No especificado';

      const actionBox = document.getElementById('modal-action-box');
      
      // Dynamic Action Box depending on status
      if (req.status === 'aprobada') {
        actionBox.innerHTML = `
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="background: white; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--slate-200); flex-shrink: 0;">
              <!-- Simulated QR -->
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
            </div>
            <div>
              <div style="font-weight: 600; color: var(--slate-800); margin-bottom: 0.25rem;">Código de Recogida</div>
              <p style="font-size: 0.85rem; color: var(--slate-500); margin: 0;">Muestra este código al bedel (Aula de Mantenimiento - Lab 3) para retirar el material.</p>
            </div>
          </div>
        `;
        btnPrimaryAction.textContent = 'Descargar PDF';
      } else if (req.status === 'en_prestamo') {
        actionBox.innerHTML = `
          <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:2px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <div>
              <div style="font-weight: 600; color: var(--slate-800); margin-bottom: 0.25rem;">Devolución Pendiente</div>
              <p style="font-size: 0.85rem; color: var(--slate-500); margin: 0;">Debes devolver el material en la misma aula de recogida antes del <strong>${req.endDate}</strong> para recuperar tu fianza.</p>
            </div>
          </div>
        `;
        btnPrimaryAction.textContent = 'Ver Instrucciones';
      } else {
        actionBox.innerHTML = `
          <p style="font-size: 0.85rem; color: var(--slate-500); margin: 0; text-align: center;">No hay acciones disponibles para este estado.</p>
        `;
        btnPrimaryAction.textContent = 'Cerrar';
      }

      modal.style.display = 'flex';
    }

    // Handlers
    btnClose.onclick = () => modal.style.display = 'none';
    btnPrimaryAction.onclick = () => modal.style.display = 'none';
    modal.onclick = (e) => {
      if (e.target === modal) modal.style.display = 'none';
    }

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
