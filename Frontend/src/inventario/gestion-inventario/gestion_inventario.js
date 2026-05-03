import { auth } from '../../../compartido/nucleo/auth.js';
    import { api } from '../../../compartido/nucleo/api.js';
    import { mountSidebar } from '../../../compartido/componentes-ui/sidebar/sidebar-staff.js';

    // Verificar autenticación de administrador
    const user = auth.requireAuth(['admin']);
    if (!user) throw new Error('No autenticado');

    // Montar sidebar
    mountSidebar({ activePage: 'gestion-inventario', basePath: '../../..' });

    // Topbar scroll shadow
    const topbar = document.getElementById('topbar');
    const sentinel = document.getElementById('topbar-sentinel');
    new IntersectionObserver(([e]) => topbar.classList.toggle('scrolled', !e.isIntersecting)).observe(sentinel);

    // Funciones auxiliares
    function initials(name) {
      if (!name) return '?';
      return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
    }

    function fmtDate(d) {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
    }

    function estadoPill(estado) {
      const label = {
        disponible:'Disponible', 
        prestada:'Prestada', 
        averiada:'Averiada'
      }[estado] || estado;
      
      const className = {
        disponible:'pill-disponible', 
        prestada:'pill-prestada', 
        averiada:'pill-averiada'
      }[estado] || 'pill';
      
      return `<span class="pill ${className}">${label}</span>`;
    }

    // Cargar datos de inventario
    async function cargarInventario() {
      try {
        // Aquí se implementaría la lógica para obtener la lista de inventario
        // Por ahora mostramos un mensaje de ejemplo
        document.getElementById('tablaInventario').innerHTML = '<div class="empty-state">Funcionalidad de gestión de inventario en desarrollo</div>';
        document.getElementById('listaInventario').innerHTML = '<div class="empty-state">Funcionalidad de gestión de inventario en desarrollo</div>';
      } catch (e) {
        console.error(e);
        showToast('Error al cargar los datos', false);
      }
    }

    // Mostrar toast
    const toast = document.getElementById('toast');
    let toastTimer;
    function showToast(msg, ok = true) {
      clearTimeout(toastTimer);
      toast.textContent = msg;
      toast.className = `toast show ${ok ? 'ok' : 'err'}`;
      toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
    }

    // Cargar datos al iniciar
    cargarInventario().catch(e => {
      console.error(e);
      showToast('Error al cargar los datos', false);
    });