import { auth } from '../../js/core/auth.js';
    import { ui } from '../../js/components/ui.js';

    const user = auth.requireAuth(['estudiante', 'profesor']);
    if (!user) throw new Error('Not authenticated');

    ui.setupLayout(user);

    let notifications = [
      {
        id: 'n1',
        title: 'Solicitud aprobada',
        message: 'Tu solicitud para el equipo Portátil Dell XPS 15 ha sido aprobada. Puedes pasar a recogerlo por el almacén.',
        date: 'Hoy, 10:30',
        type: 'success',
        read: false
      },
      {
        id: 'n2',
        title: 'Recordatorio de devolución',
        message: 'Debes devolver Kits Arduino Uno mañana antes de las 14:00. Si necesitas más tiempo, solicita una prórroga.',
        date: 'Ayer, 09:15',
        type: 'warning',
        read: false
      },
      {
        id: 'n3',
        title: 'Mantenimiento programado',
        message: 'El sistema estará fuera de servicio este viernes de 22:00 a 24:00 por tareas de mantenimiento.',
        date: 'Hace 3 días',
        type: 'info',
        read: true
      },
      {
        id: 'n4',
        title: 'Retraso en devolución',
        message: 'Tienes material pendiente de devolución cuya fecha expiró ayer. Por favor, regulariza la situación.',
        date: 'Hace 1 semana',
        type: 'alert',
        read: true
      }
    ];

    const listContainer = document.getElementById('notifications-list');
    const emptyState = document.getElementById('empty-state');
    const btnMarkAll = document.getElementById('btn-mark-all');
    const tabs = document.querySelectorAll('.tab-btn');

    const tabAllCount = document.getElementById('tab-all-count');
    const tabSeenCount = document.getElementById('tab-seen-count');
    const tabUnseenCount = document.getElementById('tab-unseen-count');

    const kpiUnseen = document.getElementById('kpi-unseen');
    const kpiSeen = document.getElementById('kpi-seen');
    const kpiTotal = document.getElementById('kpi-total');
    const panelMeta = document.getElementById('panel-meta');

    const selectAllVisible = document.getElementById('select-all-visible');
    const selectedCount = document.getElementById('selected-count');
    const bulkActions = document.getElementById('bulk-actions');
    const btnMarkSelectedSeen = document.getElementById('btn-mark-selected-seen');
    const btnMarkSelectedUnseen = document.getElementById('btn-mark-selected-unseen');
    const btnDeleteSelected = document.getElementById('btn-delete-selected');

    const detailStatePill = document.getElementById('detail-state-pill');
    const detailEmpty = document.getElementById('detail-empty');
    const detailContent = document.getElementById('detail-content');
    const detailIcon = document.getElementById('detail-icon');
    const detailTitle = document.getElementById('detail-title');
    const detailMeta = document.getElementById('detail-meta');
    const detailMessage = document.getElementById('detail-message');
    const detailToggleRead = document.getElementById('detail-toggle-read');
    const detailDelete = document.getElementById('detail-delete');

    const notifBellBadge = document.getElementById('notif-bell-badge');

    let currentFilter = 'all';
    let selectedIds = new Set();
    let activeNotificationId = notifications.find(n => !n.read)?.id ?? notifications[0]?.id ?? null;

    function getTypeLabel(type) {
      switch (type) {
        case 'success':
          return 'Aprobación';
        case 'warning':
          return 'Recordatorio';
        case 'alert':
          return 'Alerta';
        case 'info':
        default:
          return 'Información';
      }
    }

    function getIcon(type) {
      switch (type) {
        case 'success':
          return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
        case 'warning':
          return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
        case 'alert':
          return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        case 'info':
        default:
          return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
      }
    }

    function getStatusIcon(isSeen) {
      if (isSeen) {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
      }
      return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><polyline points="22 7 12 13 2 7"></polyline></svg>';
    }

    function getFilteredNotifications() {
      return notifications.filter(notification => {
        if (currentFilter === 'seen') return notification.read;
        if (currentFilter === 'unseen') return !notification.read;
        return true;
      });
    }

    function getPreviewText(message) {
      const compactMessage = message.replace(/\s+/g, ' ').trim();
      if (compactMessage.length <= 115) return compactMessage;
      return `${compactMessage.slice(0, 115)}...`;
    }

    function updateBellBadge(unseenTotal) {
      notifBellBadge.classList.toggle('show', unseenTotal > 0);
    }

    function syncSelectionToolbar(filtered) {
      const selectedVisible = filtered.filter(n => selectedIds.has(n.id)).length;
      const allVisibleSelected = filtered.length > 0 && selectedVisible === filtered.length;

      selectAllVisible.checked = allVisibleSelected;
      selectAllVisible.indeterminate = selectedVisible > 0 && !allVisibleSelected;

      const selectedTotal = selectedIds.size;
      selectedCount.textContent = `${selectedTotal} seleccionado${selectedTotal === 1 ? '' : 's'}`;
      selectedCount.style.display = selectedTotal === 0 ? 'none' : 'inline-flex';
      bulkActions.classList.toggle('hidden', selectedTotal === 0);

      const disabled = selectedTotal === 0;
      btnMarkSelectedSeen.disabled = disabled;
      btnMarkSelectedUnseen.disabled = disabled;
      btnDeleteSelected.disabled = disabled;
    }

    function renderDetailPanel() {
      const notification = notifications.find(n => n.id === activeNotificationId);
      if (!notification) {
        detailEmpty.style.display = 'block';
        detailContent.style.display = 'none';
        detailStatePill.textContent = 'Sin seleccionar';
        detailStatePill.classList.remove('is-unseen');
        return;
      }

      const safeType = ['success', 'warning', 'alert', 'info'].includes(notification.type)
        ? notification.type
        : 'info';

      detailEmpty.style.display = 'none';
      detailContent.style.display = 'flex';

      detailIcon.className = `notif-icon icon-${safeType}`;
      detailIcon.innerHTML = getIcon(safeType);
      detailTitle.textContent = notification.title;
      detailMeta.textContent = `${getTypeLabel(safeType)} - ${notification.date}`;
      detailMessage.textContent = notification.message;
      detailToggleRead.textContent = notification.read ? 'Marcar como no vista' : 'Marcar como vista';

      detailStatePill.textContent = notification.read ? 'Vista' : 'No vista';
      detailStatePill.classList.toggle('is-unseen', !notification.read);
    }

    function renderNotifications() {
      const existingIds = new Set(notifications.map(n => n.id));
      selectedIds.forEach(id => {
        if (!existingIds.has(id)) selectedIds.delete(id);
      });
      if (activeNotificationId && !existingIds.has(activeNotificationId)) {
        activeNotificationId = notifications[0]?.id ?? null;
      }

      const filtered = getFilteredNotifications();
      const total = notifications.length;
      const seenTotal = notifications.filter(n => n.read).length;
      const unseenTotal = notifications.filter(n => !n.read).length;

      tabAllCount.textContent = total;
      tabSeenCount.textContent = seenTotal;
      tabUnseenCount.textContent = unseenTotal;

      kpiTotal.textContent = total;
      kpiSeen.textContent = seenTotal;
      kpiUnseen.textContent = unseenTotal;

      panelMeta.textContent = `${filtered.length} resultado${filtered.length === 1 ? '' : 's'}`;
      updateBellBadge(unseenTotal);

      syncSelectionToolbar(filtered);

      if (filtered.length === 0) {
        listContainer.style.display = 'none';
        emptyState.style.display = 'block';
        renderDetailPanel();
        return;
      }

      listContainer.style.display = 'block';
      emptyState.style.display = 'none';

      listContainer.innerHTML = filtered.map(notification => `
        <article class="notif-row ${notification.read ? 'seen' : 'unseen'} ${selectedIds.has(notification.id) ? 'selected' : ''} ${activeNotificationId === notification.id ? 'active' : ''}" data-id="${notification.id}">
          <input class="notif-select-check" type="checkbox" data-id="${notification.id}" ${selectedIds.has(notification.id) ? 'checked' : ''} aria-label="Seleccionar notificación">
          <div class="notif-icon icon-${notification.type}">${getIcon(notification.type)}</div>
          <div class="notif-main">
            <div class="notif-title-line">
              <h3 class="notif-title">${notification.title}</h3>
              <span class="notif-date">${notification.date}</span>
            </div>
            <p class="notif-preview">${getPreviewText(notification.message)}</p>
            <div class="notif-meta-row">
              <span class="notif-type-chip">${getTypeLabel(notification.type)}</span>
              <span class="notif-read-chip ${notification.read ? 'seen' : 'unseen'}">${notification.read ? 'Vista' : 'No vista'}</span>
            </div>
          </div>
          <div class="notif-row-actions">
            <button class="notif-row-btn notif-toggle-read-btn" type="button" data-id="${notification.id}" title="Cambiar estado" aria-label="Cambiar estado">${getStatusIcon(notification.read)}</button>
            <button class="notif-row-btn danger notif-delete-btn" type="button" data-id="${notification.id}" title="Eliminar" aria-label="Eliminar notificación">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
            </button>
          </div>
        </article>
      `).join('');

      document.querySelectorAll('.notif-select-check').forEach(check => {
        check.addEventListener('click', event => event.stopPropagation());
        check.addEventListener('change', () => {
          const id = check.dataset.id;
          if (check.checked) {
            selectedIds.add(id);
          } else {
            selectedIds.delete(id);
          }
          renderNotifications();
        });
      });

      document.querySelectorAll('.notif-toggle-read-btn').forEach(button => {
        button.addEventListener('click', event => {
          event.stopPropagation();
          toggleNotificationRead(button.dataset.id);
        });
      });

      document.querySelectorAll('.notif-delete-btn').forEach(button => {
        button.addEventListener('click', event => {
          event.stopPropagation();
          deleteNotification(button.dataset.id);
        });
      });

      document.querySelectorAll('.notif-row').forEach(row => {
        row.addEventListener('click', () => openNotification(row.dataset.id));
      });

      renderDetailPanel();
    }

    function openNotification(id) {
      const notification = notifications.find(n => n.id === id);
      if (!notification) return;

      activeNotificationId = id;
      if (!notification.read) {
        notification.read = true;
      }
      renderNotifications();
    }

    function toggleNotificationRead(id) {
      const notification = notifications.find(n => n.id === id);
      if (!notification) return;

      notification.read = !notification.read;
      renderNotifications();
    }

    function deleteNotification(id) {
      if (!id) return;

      selectedIds.delete(id);
      notifications = notifications.filter(n => n.id !== id);
      if (activeNotificationId === id) {
        activeNotificationId = notifications[0]?.id ?? null;
      }
      renderNotifications();
    }

    function markSelectedAs(readState) {
      if (selectedIds.size === 0) return;

      notifications.forEach(notification => {
        if (selectedIds.has(notification.id)) {
          notification.read = readState;
        }
      });

      selectedIds.clear();
      renderNotifications();
    }

    function deleteSelectedNotifications() {
      if (selectedIds.size === 0) return;

      notifications = notifications.filter(n => !selectedIds.has(n.id));
      if (activeNotificationId && !notifications.some(n => n.id === activeNotificationId)) {
        activeNotificationId = notifications[0]?.id ?? null;
      }

      selectedIds.clear();
      renderNotifications();
    }

    selectAllVisible.addEventListener('change', () => {
      const visibleNotifications = getFilteredNotifications();
      if (selectAllVisible.checked) {
        visibleNotifications.forEach(notification => selectedIds.add(notification.id));
      } else {
        visibleNotifications.forEach(notification => selectedIds.delete(notification.id));
      }
      renderNotifications();
    });

    btnMarkSelectedSeen.addEventListener('click', () => markSelectedAs(true));
    btnMarkSelectedUnseen.addEventListener('click', () => markSelectedAs(false));
    btnDeleteSelected.addEventListener('click', deleteSelectedNotifications);

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(item => item.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        selectedIds.clear();
        renderNotifications();
      });
    });

    btnMarkAll.addEventListener('click', () => {
      notifications.forEach(notification => {
        notification.read = true;
      });
      selectedIds.clear();
      renderNotifications();
    });

    detailToggleRead.addEventListener('click', () => {
      if (!activeNotificationId) return;
      toggleNotificationRead(activeNotificationId);
    });

    detailDelete.addEventListener('click', () => {
      if (!activeNotificationId) return;
      deleteNotification(activeNotificationId);
    });

    renderNotifications();
