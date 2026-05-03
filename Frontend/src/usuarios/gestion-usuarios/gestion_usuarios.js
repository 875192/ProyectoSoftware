import { auth } from '../../../compartido/nucleo/auth.js';
    import { api } from '../../../compartido/nucleo/api.js';
    import { mountSidebar } from '../../../compartido/componentes-ui/sidebar/sidebar-staff.js';

    // Verificar autenticación de administrador
    const user = auth.requireAuth(['admin']);
    if (!user) throw new Error('No autenticado');

    // Montar sidebar
    mountSidebar({ activePage: 'gestion-usuarios', basePath: '../../..' });

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
        estudiante:'Estudiante', 
        profesor:'Profesor', 
        personal_gestion:'Personal', 
        mantenimiento:'Mantenimiento',
        admin:'Administrador'
      }[estado] || estado;
      
      const className = {
        estudiante:'pill-estudiante', 
        profesor:'pill-profesor', 
        personal_gestion:'pill-personal', 
        mantenimiento:'pill-mantenimiento',
        admin:'pill-admin'
      }[estado] || 'pill';
      
      return `<span class="pill ${className}">${label}</span>`;
    }

    // Cargar datos de usuarios
    async function cargarUsuarios() {
      try {
        // Aquí se implementaría la lógica para obtener la lista de usuarios
        // Por ahora mostramos un mensaje de ejemplo
        document.getElementById('tablaUsuarios').innerHTML = '<div class="empty-state">Funcionalidad de gestión de usuarios en desarrollo</div>';
        document.getElementById('listaUsuarios').innerHTML = '<div class="empty-state">Funcionalidad de gestión de usuarios en desarrollo</div>';
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
    cargarUsuarios().catch(e => {
      console.error(e);
      showToast('Error al cargar los datos', false);
    });