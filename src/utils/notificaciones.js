document.addEventListener("DOMContentLoaded", function () {
    const list = document.getElementById("notifications-list");
    const emptyMessage = document.getElementById("no-notifications");
    const btnMarkAll = document.getElementById("mark-all-read");
    const sidebarBadge = document.getElementById("sidebar-badge");
    const tabBadge = document.getElementById("tab-badge");
    const btnLogout = document.getElementById("btnLogout");
    const tabBtns = document.querySelectorAll(".tab-btn");

    let currentFilter = "all";

    // 1. Datos iniciales de prueba (con IDs)
    if (!localStorage.getItem("notifications")) {
        const demoNotifications = [
            { id: 1, message: "Tu solicitud del proyector EPSON ha sido aprobada. Puedes pasar a recogerlo.", date: "04/03/2026 - 09:30", read: false },
            { id: 2, message: "¡Aviso! Tienes un osciloscopio próximo a vencer mañana.", date: "03/03/2026 - 18:15", read: false },
            { id: 3, message: "El material 'Kit Arduino V3' que solicitaste ya vuelve a estar disponible.", date: "01/03/2026 - 12:00", read: false },
            { id: 4, message: "Tu préstamo de la cámara Canon ha finalizado correctamente.", date: "28/02/2026 - 10:45", read: true },
            { id: 5, message: "Se ha denegado la solicitud del portátil Dell. Motivo: Falta de stock actual.", date: "25/02/2026 - 16:20", read: true }
        ];
        localStorage.setItem("notifications", JSON.stringify(demoNotifications));
    }

    let notifications = JSON.parse(localStorage.getItem("notifications")) || [];

    // --- REPARACIÓN DE DATOS ANTIGUOS ---
    // Si tenías notificaciones guardadas de antes sin ID, esto se lo añade.
    let needsUpdate = false;
    notifications = notifications.map((n, index) => {
        if (n.id === undefined) {
            needsUpdate = true;
            return { ...n, id: Date.now() + index }; 
        }
        return n;
    });
    if (needsUpdate) {
        localStorage.setItem("notifications", JSON.stringify(notifications));
    }
    // -------------------------------------

    const iconEnvelopeClosed = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`;
    const iconEnvelopeOpen = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18V6c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H2z"></path><polyline points="22,6 12,13 2,6"></polyline><line x1="2" y1="18" x2="9" y2="11"></line><line x1="22" y1="18" x2="15" y2="11"></line></svg>`;
    const iconTrash = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
    const iconClock = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

    function updateBadges() {
        const unreadCount = notifications.filter(n => !n.read).length;
        
        if (sidebarBadge) {
            if (unreadCount > 0) {
                sidebarBadge.textContent = unreadCount;
                sidebarBadge.style.display = "inline-flex";
            } else {
                sidebarBadge.style.display = "none";
            }
        }
        
        if (tabBadge) {
            tabBadge.textContent = unreadCount;
            tabBadge.style.display = unreadCount > 0 ? "inline-block" : "none";
        }
    }

    function renderNotifications() {
        if (!list) return;
        list.innerHTML = "";
        
        let filteredNotifs = notifications;
        if (currentFilter === "unread") {
            filteredNotifs = notifications.filter(n => !n.read);
        }

        if (filteredNotifs.length === 0) {
            emptyMessage.classList.remove("hidden");
            btnMarkAll.classList.add("hidden");
            updateBadges();
            return;
        }

        emptyMessage.classList.add("hidden");
        
        const hasUnread = notifications.some(n => !n.read);
        if (hasUnread && currentFilter === "all") {
            btnMarkAll.classList.remove("hidden");
        } else {
            btnMarkAll.classList.add("hidden");
        }

        filteredNotifs.forEach((notif) => {
            const li = document.createElement("li");
            li.className = "notification-item";
            if (!notif.read) li.classList.add("unread");

            const toggleIcon = notif.read ? iconEnvelopeOpen : iconEnvelopeClosed;
            const toggleTitle = notif.read ? "Marcar como no leída" : "Marcar como leída";

            li.innerHTML = `
                <div class="notification-content">
                    <div class="notification-message">${notif.message}</div>
                    <div class="notification-date">${iconClock} ${notif.date}</div>
                </div>
                <div class="notification-actions">
                    <button class="btn-icon action-read" data-id="${notif.id}" title="${toggleTitle}">
                        ${toggleIcon}
                    </button>
                    <button class="btn-icon action-delete" data-id="${notif.id}" title="Eliminar notificación">
                        ${iconTrash}
                    </button>
                </div>
            `;

            list.appendChild(li);
        });

        updateBadges();
    }

    // Eventos de click en la lista (Delegación mejorada)
    if (list) {
        list.addEventListener("click", function (e) {
            const btn = e.target.closest('.btn-icon');
            if (!btn) return;

            const id = parseInt(btn.getAttribute("data-id"));
            const index = notifications.findIndex(n => n.id === id);
            
            if (index === -1) return;

            if (btn.classList.contains("action-read")) {
                notifications[index].read = !notifications[index].read;
            } else if (btn.classList.contains("action-delete")) {
                notifications.splice(index, 1);
            }

            localStorage.setItem("notifications", JSON.stringify(notifications));
            renderNotifications();
        });
    }

    // Cambiar entre pestañas
    tabBtns.forEach(btn => {
        btn.addEventListener("click", function() {
            tabBtns.forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            currentFilter = this.getAttribute("data-filter");
            renderNotifications();
        });
    });

    // Botón Marcar todas
    if (btnMarkAll) {
        btnMarkAll.addEventListener("click", function() {
            notifications = notifications.map(n => ({ ...n, read: true }));
            localStorage.setItem("notifications", JSON.stringify(notifications));
            renderNotifications();
        });
    }

    // Botón Cerrar Sesión
    if (btnLogout) {
        btnLogout.addEventListener("click", function(e) {
            e.preventDefault();
            window.location.href = "login.html"; 
        });
    }

    renderNotifications();
});