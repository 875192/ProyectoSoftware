/**
 * app.js
 * Lógica compartida para los dashboards del sistema de préstamos
 */

(function() {
    'use strict';

    // ========================================
    // DATOS MOCK
    // ========================================
    
    // Usuario actual - se obtiene de localStorage (guardado en login)
    // Si no hay datos, usa valores por defecto
    function getCurrentUser() {
        try {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('No se pudo leer datos del usuario:', e);
        }
        // Usuario por defecto si no hay sesión
        return {
            name: 'Usuario Demo',
            role: 'Estudiante',
            email: 'demo@ejemplo.com',
            initials: 'UD'
        };
    }

    const currentUser = getCurrentUser();

    // Solicitudes de préstamo
    const solicitudes = [
        { id: 1, fecha: '2026-03-01', material: 'Laptop Dell XPS 15', solicitante: 'María López', estado: 'pendiente', fechaDevolucion: '2026-03-08' },
        { id: 2, fecha: '2026-03-02', material: 'Proyector Epson', solicitante: 'Carlos Ruiz', estado: 'aprobada', fechaDevolucion: '2026-03-05' },
        { id: 3, fecha: '2026-03-02', material: 'Cámara Canon EOS', solicitante: 'Ana Martín', estado: 'pendiente', fechaDevolucion: '2026-03-10' },
        { id: 4, fecha: '2026-03-03', material: 'Kit Arduino', solicitante: 'Pedro Sánchez', estado: 'rechazada', fechaDevolucion: '2026-03-06' },
        { id: 5, fecha: '2026-03-03', material: 'Micrófono Blue Yeti', solicitante: 'Laura Gómez', estado: 'pendiente', fechaDevolucion: '2026-03-07' }
    ];

    // Préstamos activos
    const prestamos = [
        { id: 1, material: 'Tablet iPad Pro', usuario: 'María López', fechaInicio: '2026-02-25', fechaFin: '2026-03-04', estado: 'activo' },
        { id: 2, material: 'Trípode Manfrotto', usuario: 'Carlos Ruiz', fechaInicio: '2026-02-28', fechaFin: '2026-03-07', estado: 'activo' },
        { id: 3, material: 'Kit de Iluminación', usuario: 'Ana Martín', fechaInicio: '2026-03-01', fechaFin: '2026-03-08', estado: 'activo' }
    ];

    // Incidencias de mantenimiento
    const incidencias = [
        { id: 'INC-001', material: 'Proyector sala B-201', prioridad: 'alta', estado: 'abierta', descripcion: 'No enciende correctamente' },
        { id: 'INC-002', material: 'Laptop #15', prioridad: 'media', estado: 'en_proceso', descripcion: 'Teclado defectuoso' },
        { id: 'INC-003', material: 'Cámara Sony A7', prioridad: 'baja', estado: 'abierta', descripcion: 'Revisar lente' },
        { id: 'INC-004', material: 'Micrófono #3', prioridad: 'alta', estado: 'abierta', descripcion: 'Ruido estático' }
    ];

    // Materiales del inventario
    const materiales = [
        { id: 1, nombre: 'Laptop Dell XPS 15', categoria: 'Informática', estado: 'disponible', cantidad: 5 },
        { id: 2, nombre: 'Proyector Epson', categoria: 'Audiovisual', estado: 'prestado', cantidad: 3 },
        { id: 3, nombre: 'Cámara Canon EOS', categoria: 'Fotografía', estado: 'disponible', cantidad: 2 },
        { id: 4, nombre: 'Kit Arduino', categoria: 'Electrónica', estado: 'disponible', cantidad: 10 },
        { id: 5, nombre: 'Tablet iPad Pro', categoria: 'Informática', estado: 'mantenimiento', cantidad: 4 }
    ];

    // Notificaciones del usuario
    const notificaciones = [
        { tipo: 'success', mensaje: 'Tu solicitud de "Laptop Dell" fue aprobada', tiempo: 'Hace 2 horas' },
        { tipo: 'warning', mensaje: 'Recuerda devolver "Cámara Canon" mañana', tiempo: 'Hace 5 horas' },
        { tipo: 'error', mensaje: 'Solicitud de "Proyector" rechazada: No disponible', tiempo: 'Ayer' }
    ];

    // ========================================
    // ELEMENTOS DEL DOM
    // ========================================
    const elements = {
        welcomeName: document.getElementById('welcomeName'),
        userName: document.getElementById('userName'),
        userRole: document.getElementById('userRole'),
        userInitials: document.getElementById('userInitials'),
        summaryCards: document.getElementById('summaryCards'),
        actionsGrid: document.getElementById('actionsGrid'),
        dataTableBody: document.getElementById('dataTableBody'),
        notificationsPanel: document.getElementById('notificationsPanel'),
        toastContainer: document.getElementById('toastContainer'),
        modalOverlay: document.getElementById('modalOverlay'),
        modalTitle: document.getElementById('modalTitle'),
        modalBody: document.getElementById('modalBody'),
        modalClose: document.getElementById('modalClose'),
        menuToggle: document.getElementById('menuToggle'),
        sidebar: document.getElementById('sidebar'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        btnLogout: document.getElementById('btnLogout')
    };

    // ========================================
    // UTILIDADES
    // ========================================

    function detectPage() {
        const path = window.location.pathname;
        if (path.includes('estudiante')) return 'estudiante';
        if (path.includes('profesor')) return 'profesor';
        if (path.includes('personal')) return 'personal';
        if (path.includes('mantenimiento')) return 'mantenimiento';
        return 'estudiante'; // default
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function getEstadoBadge(estado) {
        const badges = {
            'pendiente': '<span class="badge badge--pending">Pendiente</span>',
            'aprobada': '<span class="badge badge--approved">Aprobada</span>',
            'rechazada': '<span class="badge badge--rejected">Rechazada</span>',
            'activo': '<span class="badge badge--active">Activo</span>',
            'abierta': '<span class="badge badge--pending">Abierta</span>',
            'en_proceso': '<span class="badge badge--active">En proceso</span>',
            'resuelta': '<span class="badge badge--approved">Resuelta</span>',
            'disponible': '<span class="badge badge--approved">Disponible</span>',
            'prestado': '<span class="badge badge--active">Prestado</span>',
            'mantenimiento': '<span class="badge badge--pending">Mantenimiento</span>',
            'averiado': '<span class="badge badge--rejected">Averiado</span>'
        };
        return badges[estado] || estado;
    }

    function getPrioridadBadge(prioridad) {
        const badges = {
            'alta': '<span class="badge badge--high">Alta</span>',
            'media': '<span class="badge badge--medium">Media</span>',
            'baja': '<span class="badge badge--low">Baja</span>'
        };
        return badges[prioridad] || prioridad;
    }

    // ========================================
    // TOAST NOTIFICATIONS
    // ========================================

    function showToast(message, type = 'default') {
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'success' ? 'toast--success' : ''} ${type === 'error' ? 'toast--error' : ''}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                ${type === 'success' 
                    ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
                    : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
                }
            </svg>
            <span>${message}</span>
        `;
        
        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Muestra el toast de bienvenida (solo una vez por sesión)
     */
    function showWelcomeToast() {
        // Solo mostrar una vez por sesión
        if (sessionStorage.getItem('welcomeToastShown')) {
            return;
        }

        const user = getCurrentUser();
        if (!user || !user.name) {
            return;
        }

        // Marcar como mostrado
        sessionStorage.setItem('welcomeToastShown', 'true');

        // Crear contenedor
        const container = document.createElement('div');
        container.className = 'welcome-toast-container';
        container.setAttribute('role', 'status');
        container.setAttribute('aria-live', 'polite');

        // Crear toast
        const toast = document.createElement('div');
        toast.className = 'welcome-toast';
        toast.innerHTML = `
            <span class="welcome-toast__message">Bienvenido de nuevo, <strong>${user.name}</strong></span>
        `;

        container.appendChild(toast);
        document.body.appendChild(container);
        
        // Función para cerrar el toast
        function closeWelcomeToast() {
            toast.classList.add('welcome-toast--removing');
            toast.addEventListener('animationend', () => {
                container.remove();
            }, { once: true });
        }

        // Cerrar con tecla Escape
        function handleEscape(e) {
            if (e.key === 'Escape') {
                closeWelcomeToast();
                document.removeEventListener('keydown', handleEscape);
            }
        }
        document.addEventListener('keydown', handleEscape);

        // Auto-cerrar después de 3 segundos
        setTimeout(() => {
            if (document.body.contains(container)) {
                closeWelcomeToast();
                document.removeEventListener('keydown', handleEscape);
            }
        }, 3000);
    }

    // ========================================
    // MODAL
    // ========================================

    function showModal(title, content) {
        elements.modalTitle.textContent = title;
        elements.modalBody.innerHTML = content;
        elements.modalOverlay.classList.add('modal-overlay--visible');
        document.body.style.overflow = 'hidden';
        
        // Focus en el modal
        elements.modalClose.focus();
    }

    function closeModal() {
        elements.modalOverlay.classList.remove('modal-overlay--visible');
        document.body.style.overflow = '';
    }

    // ========================================
    // SIDEBAR (MÓVIL)
    // ========================================

    function toggleSidebar() {
        elements.sidebar.classList.toggle('sidebar--open');
        elements.sidebarOverlay.classList.toggle('sidebar-overlay--visible');
    }

    function closeSidebar() {
        elements.sidebar.classList.remove('sidebar--open');
        elements.sidebarOverlay.classList.remove('sidebar-overlay--visible');
    }

    // ========================================
    // RENDERIZADO: INFORMACIÓN DEL USUARIO
    // ========================================

    function renderUserInfo() {
        const page = detectPage();
        const roles = {
            'estudiante': 'Estudiante',
            'profesor': 'Profesorado',
            'personal': 'Personal',
            'mantenimiento': 'Mantenimiento'
        };

        const user = { ...currentUser, role: roles[page] };

        if (elements.welcomeName) {
            elements.welcomeName.textContent = user.name;
        }
        if (elements.userName) {
            elements.userName.textContent = user.name;
        }
        if (elements.userRole) {
            elements.userRole.textContent = user.role;
        }
        if (elements.userInitials) {
            elements.userInitials.textContent = user.initials;
        }
    }

    // ========================================
    // RENDERIZADO: TARJETAS RESUMEN
    // ========================================

    function renderSummaryCards(page) {
        if (!elements.summaryCards) return;

        let cards = [];

        if (page === 'estudiante' || page === 'profesor') {
            const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
            const aprobadas = solicitudes.filter(s => s.estado === 'aprobada').length;
            const activos = prestamos.length;

            cards = [
                { icon: 'clock', iconClass: 'pending', value: pendientes, label: 'Solicitudes pendientes' },
                { icon: 'check', iconClass: 'approved', value: aprobadas, label: 'Solicitudes aprobadas' },
                { icon: 'package', iconClass: 'active', value: activos, label: 'Préstamos activos' }
            ];
        } else if (page === 'personal') {
            const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
            const entregas = 2; // Mock
            const activos = prestamos.length;
            const devoluciones = 1; // Mock

            cards = [
                { icon: 'clock', iconClass: 'pending', value: pendientes, label: 'Solicitudes pendientes' },
                { icon: 'send', iconClass: 'alert', value: entregas, label: 'Entregas pendientes' },
                { icon: 'package', iconClass: 'active', value: activos, label: 'Préstamos activos' },
                { icon: 'rotate', iconClass: 'approved', value: devoluciones, label: 'Devoluciones hoy' }
            ];
        } else if (page === 'mantenimiento') {
            const abiertas = incidencias.filter(i => i.estado === 'abierta').length;
            const enProceso = incidencias.filter(i => i.estado === 'en_proceso').length;
            const averiados = 2; // Mock

            cards = [
                { icon: 'alert', iconClass: 'alert', value: abiertas, label: 'Incidencias abiertas' },
                { icon: 'tool', iconClass: 'pending', value: enProceso, label: 'En mantenimiento' },
                { icon: 'x-circle', iconClass: 'alert', value: averiados, label: 'Material averiado' }
            ];
        }

        const icons = {
            'clock': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
            'check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            'package': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
            'send': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
            'rotate': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
            'alert': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
            'tool': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
            'x-circle': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
        };

        elements.summaryCards.innerHTML = cards.map(card => `
            <div class="summary-card">
                <div class="summary-card-header">
                    <div class="summary-card-icon summary-card-icon--${card.iconClass}">
                        ${icons[card.icon]}
                    </div>
                    <span class="summary-card-value">${card.value}</span>
                </div>
                <span class="summary-card-label">${card.label}</span>
            </div>
        `).join('');
    }

    // ========================================
    // RENDERIZADO: ACCIONES RÁPIDAS
    // ========================================

    function renderActions(page) {
        if (!elements.actionsGrid) return;

        let actions = [];

        const icons = {
            'search': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
            'plus': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
            'list': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
            'check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
            'send': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
            'rotate': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
            'alert': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
            'tool': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
            'edit': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
        };

        if (page === 'estudiante' || page === 'profesor') {
            actions = [
                { icon: 'search', label: 'Consultar inventario', action: 'inventario' },
                { icon: 'plus', label: 'Solicitar préstamo', action: 'solicitar' },
                { icon: 'list', label: 'Mis solicitudes', action: 'mis-solicitudes' }
            ];
        } else if (page === 'personal') {
            actions = [
                { icon: 'list', label: 'Ver solicitudes pendientes', action: 'solicitudes-pendientes' },
                { icon: 'check', label: 'Aprobar/Rechazar', action: 'aprobar-rechazar' },
                { icon: 'send', label: 'Registrar entrega', action: 'registrar-entrega' },
                { icon: 'rotate', label: 'Registrar devolución', action: 'registrar-devolucion' }
            ];
        } else if (page === 'mantenimiento') {
            actions = [
                { icon: 'alert', label: 'Ver incidencias abiertas', action: 'incidencias' },
                { icon: 'edit', label: 'Actualizar estado', action: 'actualizar-estado' },
                { icon: 'tool', label: 'Registrar mantenimiento', action: 'registrar-mantenimiento' }
            ];
        }

        elements.actionsGrid.innerHTML = actions.map(action => `
            <button class="action-btn" data-action="${action.action}" aria-label="${action.label}">
                ${icons[action.icon]}
                <span>${action.label}</span>
            </button>
        `).join('');

        // Bind events
        elements.actionsGrid.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', handleAction);
        });
    }

    // ========================================
    // RENDERIZADO: TABLA DE DATOS
    // ========================================

    function renderDataTable(page) {
        if (!elements.dataTableBody) return;

        if (page === 'estudiante' || page === 'profesor') {
            // Últimas solicitudes
            elements.dataTableBody.innerHTML = solicitudes.slice(0, 5).map(s => `
                <tr>
                    <td>${formatDate(s.fecha)}</td>
                    <td>${s.material}</td>
                    <td>${getEstadoBadge(s.estado)}</td>
                </tr>
            `).join('');
        } else if (page === 'personal') {
            // Solicitudes pendientes con acciones
            const pendientes = solicitudes.filter(s => s.estado === 'pendiente');
            elements.dataTableBody.innerHTML = pendientes.map(s => `
                <tr>
                    <td>${s.solicitante}</td>
                    <td>${s.material}</td>
                    <td>${formatDate(s.fecha)} - ${formatDate(s.fechaDevolucion)}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn--success btn--sm" data-action="aprobar" data-id="${s.id}" aria-label="Aprobar solicitud">
                                Aprobar
                            </button>
                            <button class="btn btn--danger btn--sm" data-action="rechazar" data-id="${s.id}" aria-label="Rechazar solicitud">
                                Rechazar
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            // Bind events
            elements.dataTableBody.querySelectorAll('[data-action="aprobar"]').forEach(btn => {
                btn.addEventListener('click', () => handleAprobar(btn.dataset.id));
            });
            elements.dataTableBody.querySelectorAll('[data-action="rechazar"]').forEach(btn => {
                btn.addEventListener('click', () => handleRechazar(btn.dataset.id));
            });
        } else if (page === 'mantenimiento') {
            // Incidencias
            elements.dataTableBody.innerHTML = incidencias.map(i => `
                <tr>
                    <td><strong>${i.id}</strong></td>
                    <td>${i.material}</td>
                    <td>${getPrioridadBadge(i.prioridad)}</td>
                    <td>${getEstadoBadge(i.estado)}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn--outline btn--sm" data-action="ver-incidencia" data-id="${i.id}" aria-label="Ver incidencia">
                                Ver
                            </button>
                            ${i.estado === 'abierta' ? `
                                <button class="btn btn--primary btn--sm" data-action="proceso-incidencia" data-id="${i.id}" aria-label="Marcar en proceso">
                                    En proceso
                                </button>
                            ` : ''}
                            ${i.estado === 'en_proceso' ? `
                                <button class="btn btn--success btn--sm" data-action="resolver-incidencia" data-id="${i.id}" aria-label="Resolver incidencia">
                                    Resolver
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');

            // Bind events
            elements.dataTableBody.querySelectorAll('[data-action="ver-incidencia"]').forEach(btn => {
                btn.addEventListener('click', () => handleVerIncidencia(btn.dataset.id));
            });
            elements.dataTableBody.querySelectorAll('[data-action="proceso-incidencia"]').forEach(btn => {
                btn.addEventListener('click', () => handleProcesoIncidencia(btn.dataset.id));
            });
            elements.dataTableBody.querySelectorAll('[data-action="resolver-incidencia"]').forEach(btn => {
                btn.addEventListener('click', () => handleResolverIncidencia(btn.dataset.id));
            });
        }
    }

    // ========================================
    // RENDERIZADO: NOTIFICACIONES
    // ========================================

    function renderNotifications() {
        if (!elements.notificationsPanel) return;

        const icons = {
            'success': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            'warning': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
            'error': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
        };

        elements.notificationsPanel.innerHTML = notificaciones.map(n => `
            <div class="notification-item">
                <div class="notification-icon notification-icon--${n.tipo}">
                    ${icons[n.tipo]}
                </div>
                <div class="notification-content">
                    <p class="notification-text">${n.mensaje}</p>
                    <span class="notification-time">${n.tiempo}</span>
                </div>
            </div>
        `).join('');
    }

    // ========================================
    // HANDLERS DE ACCIONES
    // ========================================

    function handleAction(e) {
        const action = e.currentTarget.dataset.action;
        
        switch(action) {
            case 'inventario':
                showModal('Consultar inventario', renderInventarioModal());
                break;
            case 'solicitar':
                showModal('Solicitar préstamo', renderSolicitarModal());
                break;
            case 'mis-solicitudes':
                showModal('Mis solicitudes', renderMisSolicitudesModal());
                break;
            case 'solicitudes-pendientes':
                showToast('Mostrando solicitudes pendientes', 'success');
                break;
            case 'aprobar-rechazar':
                showToast('Selecciona una solicitud de la tabla', 'default');
                break;
            case 'registrar-entrega':
                showModal('Registrar entrega', renderEntregaModal());
                break;
            case 'registrar-devolucion':
                showModal('Registrar devolución', renderDevolucionModal());
                break;
            case 'incidencias':
                showToast('Mostrando incidencias abiertas', 'success');
                break;
            case 'actualizar-estado':
                showModal('Actualizar estado de material', renderEstadoMaterialModal());
                break;
            case 'registrar-mantenimiento':
                showModal('Registrar tarea de mantenimiento', renderMantenimientoModal());
                break;
            default:
                showToast(`Acción "${action}" seleccionada (simulado)`, 'default');
        }
    }

    function handleAprobar(id) {
        showToast(`Solicitud #${id} aprobada (simulado)`, 'success');
    }

    function handleRechazar(id) {
        showModal('Rechazar solicitud', `
            <form id="formRechazo">
                <div class="form-group">
                    <label class="form-label" for="motivoRechazo">Motivo del rechazo</label>
                    <textarea class="form-textarea" id="motivoRechazo" required placeholder="Indica el motivo..."></textarea>
                </div>
            </form>
        `);

        // Agregar botón de confirmar en el footer
        setTimeout(() => {
            const footer = document.querySelector('.modal-footer');
            footer.innerHTML = `
                <button class="btn btn--outline" id="btnCancelarRechazo">Cancelar</button>
                <button class="btn btn--danger" id="btnConfirmarRechazo">Confirmar rechazo</button>
            `;
            document.getElementById('btnCancelarRechazo').addEventListener('click', closeModal);
            document.getElementById('btnConfirmarRechazo').addEventListener('click', () => {
                showToast(`Solicitud #${id} rechazada (simulado)`, 'error');
                closeModal();
            });
        }, 100);
    }

    function handleVerIncidencia(id) {
        const incidencia = incidencias.find(i => i.id === id);
        if (incidencia) {
            showModal(`Incidencia ${incidencia.id}`, `
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    <div>
                        <strong>Material:</strong> ${incidencia.material}
                    </div>
                    <div>
                        <strong>Prioridad:</strong> ${getPrioridadBadge(incidencia.prioridad)}
                    </div>
                    <div>
                        <strong>Estado:</strong> ${getEstadoBadge(incidencia.estado)}
                    </div>
                    <div>
                        <strong>Descripción:</strong> ${incidencia.descripcion}
                    </div>
                </div>
            `);
        }
    }

    function handleProcesoIncidencia(id) {
        showToast(`Incidencia ${id} marcada en proceso (simulado)`, 'success');
    }

    function handleResolverIncidencia(id) {
        showModal('Resolver incidencia', `
            <form id="formResolver">
                <div class="form-group">
                    <label class="form-label" for="notaResolucion">Nota de resolución</label>
                    <textarea class="form-textarea" id="notaResolucion" required placeholder="Describe la solución aplicada..."></textarea>
                </div>
            </form>
        `);

        setTimeout(() => {
            const footer = document.querySelector('.modal-footer');
            footer.innerHTML = `
                <button class="btn btn--outline" id="btnCancelarResolver">Cancelar</button>
                <button class="btn btn--success" id="btnConfirmarResolver">Resolver</button>
            `;
            document.getElementById('btnCancelarResolver').addEventListener('click', closeModal);
            document.getElementById('btnConfirmarResolver').addEventListener('click', () => {
                showToast(`Incidencia ${id} resuelta (simulado)`, 'success');
                closeModal();
            });
        }, 100);
    }

    // ========================================
    // CONTENIDO DE MODALES
    // ========================================

    function renderInventarioModal() {
        return `
            <div class="table-container" style="max-height: 300px; overflow-y: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Material</th>
                            <th>Categoría</th>
                            <th>Estado</th>
                            <th>Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materiales.map(m => `
                            <tr>
                                <td>${m.nombre}</td>
                                <td>${m.categoria}</td>
                                <td>${getEstadoBadge(m.estado)}</td>
                                <td>${m.cantidad}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderSolicitarModal() {
        return `
            <form id="formSolicitar">
                <div class="form-group">
                    <label class="form-label" for="materialSolicitar">Material</label>
                    <select class="form-select" id="materialSolicitar" required>
                        <option value="">Selecciona un material</option>
                        ${materiales.filter(m => m.estado === 'disponible').map(m => `
                            <option value="${m.id}">${m.nombre}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="fechaInicio">Fecha de inicio</label>
                    <input class="form-input" type="date" id="fechaInicio" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="fechaFin">Fecha de devolución</label>
                    <input class="form-input" type="date" id="fechaFin" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="motivo">Motivo (opcional)</label>
                    <textarea class="form-textarea" id="motivo" placeholder="Describe el uso que darás al material..."></textarea>
                </div>
                <button type="submit" class="btn btn--primary" style="width: 100%; margin-top: 1rem;">Enviar solicitud</button>
            </form>
        `;
    }

    function renderMisSolicitudesModal() {
        return `
            <div class="table-container" style="max-height: 300px; overflow-y: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Material</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${solicitudes.map(s => `
                            <tr>
                                <td>${formatDate(s.fecha)}</td>
                                <td>${s.material}</td>
                                <td>${getEstadoBadge(s.estado)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderEntregaModal() {
        return `
            <form id="formEntrega">
                <div class="form-group">
                    <label class="form-label" for="solicitudEntrega">Solicitud a entregar</label>
                    <select class="form-select" id="solicitudEntrega" required>
                        <option value="">Selecciona una solicitud</option>
                        ${solicitudes.filter(s => s.estado === 'aprobada').map(s => `
                            <option value="${s.id}">${s.material} - ${s.solicitante}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="notaEntrega">Notas (opcional)</label>
                    <textarea class="form-textarea" id="notaEntrega" placeholder="Observaciones sobre el estado del material..."></textarea>
                </div>
                <button type="submit" class="btn btn--primary" style="width: 100%; margin-top: 1rem;">Confirmar entrega</button>
            </form>
        `;
    }

    function renderDevolucionModal() {
        return `
            <form id="formDevolucion">
                <div class="form-group">
                    <label class="form-label" for="prestamoDevolucion">Préstamo a devolver</label>
                    <select class="form-select" id="prestamoDevolucion" required>
                        <option value="">Selecciona un préstamo</option>
                        ${prestamos.map(p => `
                            <option value="${p.id}">${p.material} - ${p.usuario}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="estadoMaterial">Estado del material</label>
                    <select class="form-select" id="estadoMaterial" required>
                        <option value="bueno">Buen estado</option>
                        <option value="deteriorado">Deteriorado</option>
                        <option value="averiado">Averiado</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="notaDevolucion">Notas (opcional)</label>
                    <textarea class="form-textarea" id="notaDevolucion" placeholder="Observaciones..."></textarea>
                </div>
                <button type="submit" class="btn btn--primary" style="width: 100%; margin-top: 1rem;">Confirmar devolución</button>
            </form>
        `;
    }

    function renderEstadoMaterialModal() {
        return `
            <form id="formEstado">
                <div class="form-group">
                    <label class="form-label" for="materialEstado">Material</label>
                    <select class="form-select" id="materialEstado" required>
                        <option value="">Selecciona un material</option>
                        ${materiales.map(m => `
                            <option value="${m.id}">${m.nombre}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="nuevoEstado">Nuevo estado</label>
                    <select class="form-select" id="nuevoEstado" required>
                        <option value="disponible">Disponible</option>
                        <option value="prestado">Prestado</option>
                        <option value="averiado">Averiado</option>
                        <option value="mantenimiento">En mantenimiento</option>
                        <option value="fuera_servicio">Fuera de servicio</option>
                    </select>
                </div>
                <button type="submit" class="btn btn--primary" style="width: 100%; margin-top: 1rem;">Actualizar estado</button>
            </form>
        `;
    }

    function renderMantenimientoModal() {
        return `
            <form id="formMantenimiento">
                <div class="form-group">
                    <label class="form-label" for="materialMant">Material</label>
                    <select class="form-select" id="materialMant" required>
                        <option value="">Selecciona un material</option>
                        ${materiales.map(m => `
                            <option value="${m.id}">${m.nombre}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="tipoTarea">Tipo de tarea</label>
                    <select class="form-select" id="tipoTarea" required>
                        <option value="revision">Revisión</option>
                        <option value="reparacion">Reparación</option>
                        <option value="limpieza">Limpieza</option>
                        <option value="calibracion">Calibración</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="descripcionTarea">Descripción</label>
                    <textarea class="form-textarea" id="descripcionTarea" required placeholder="Describe la tarea realizada..."></textarea>
                </div>
                <button type="submit" class="btn btn--primary" style="width: 100%; margin-top: 1rem;">Registrar tarea</button>
            </form>
        `;
    }

    // ========================================
    // BIND EVENTOS GLOBALES
    // ========================================

    function bindGlobalEvents() {
        // Toggle sidebar (móvil)
        if (elements.menuToggle) {
            elements.menuToggle.addEventListener('click', toggleSidebar);
        }

        if (elements.sidebarOverlay) {
            elements.sidebarOverlay.addEventListener('click', closeSidebar);
        }

        // Cerrar modal
        if (elements.modalClose) {
            elements.modalClose.addEventListener('click', closeModal);
        }

        if (elements.modalOverlay) {
            elements.modalOverlay.addEventListener('click', (e) => {
                if (e.target === elements.modalOverlay) {
                    closeModal();
                }
            });
        }

        // Cerrar modal con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
                closeSidebar();
            }
        });

        // Logout
        if (elements.btnLogout) {
            elements.btnLogout.addEventListener('click', () => {
                showToast('Cerrando sesión...', 'default');
                // Limpiar datos de sesión
                localStorage.removeItem('currentUser');
                sessionStorage.clear();
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1000);
            });
        }

        // Formularios en modales
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'formSolicitar') {
                e.preventDefault();
                showToast('Solicitud enviada (simulado)', 'success');
                closeModal();
            }
            if (e.target.id === 'formEntrega') {
                e.preventDefault();
                showToast('Entrega registrada (simulado)', 'success');
                closeModal();
            }
            if (e.target.id === 'formDevolucion') {
                e.preventDefault();
                showToast('Devolución registrada (simulado)', 'success');
                closeModal();
            }
            if (e.target.id === 'formEstado') {
                e.preventDefault();
                showToast('Estado actualizado (simulado)', 'success');
                closeModal();
            }
            if (e.target.id === 'formMantenimiento') {
                e.preventDefault();
                showToast('Tarea registrada (simulado)', 'success');
                closeModal();
            }
        });
    }

    // ========================================
    // INICIALIZACIÓN
    // ========================================

    function init() {
        const page = detectPage();
        
        renderUserInfo();
        renderSummaryCards(page);
        renderActions(page);
        renderDataTable(page);
        renderNotifications();
        bindGlobalEvents();
        
        // Mostrar toast de bienvenida (solo una vez por sesión)
        showWelcomeToast();
    }

    // Ejecutar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();