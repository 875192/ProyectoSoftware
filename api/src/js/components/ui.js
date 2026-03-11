import { auth } from '../core/auth.js';

export const ui = {
  showToast: (message, type = 'info') => {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    
    toast.innerHTML = `
      <span>${message}</span>
      <button class="btn" style="padding: 0; background: none; border: none; color: inherit; font-weight: bold; margin-left: auto;" onclick="this.parentElement.remove()">✕</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 4000);
  },
  
  setupLayout: (user) => {
    const toggleBtn = document.querySelector('.mobile-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
      const mobileQuery = window.matchMedia('(max-width: 768px)');
      const desktopStorageKey = 'unigear-sidebar-collapsed';

      const updateToggleState = () => {
        const isExpanded = mobileQuery.matches
          ? sidebar.classList.contains('open')
          : !sidebar.classList.contains('is-collapsed');

        toggleBtn.setAttribute('aria-expanded', String(isExpanded));
        toggleBtn.setAttribute('aria-label', isExpanded ? 'Ocultar panel lateral' : 'Mostrar panel lateral');
        toggleBtn.title = isExpanded ? 'Ocultar panel lateral' : 'Mostrar panel lateral';
      };

      const syncSidebarState = () => {
        if (mobileQuery.matches) {
          sidebar.classList.remove('is-collapsed');
          sidebar.classList.remove('open');
        } else {
          const isCollapsed = window.localStorage.getItem(desktopStorageKey) === 'true';
          sidebar.classList.remove('open');
          sidebar.classList.toggle('is-collapsed', isCollapsed);
        }

        updateToggleState();
      };

      const closeMobileSidebar = () => {
        if (!mobileQuery.matches || !sidebar.classList.contains('open')) return;
        sidebar.classList.remove('open');
        updateToggleState();
      };

      syncSidebarState();

      toggleBtn.addEventListener('click', (event) => {
        event.preventDefault();

        if (mobileQuery.matches) {
          sidebar.classList.toggle('open');
        } else {
          const shouldCollapse = !sidebar.classList.contains('is-collapsed');
          sidebar.classList.toggle('is-collapsed', shouldCollapse);
          window.localStorage.setItem(desktopStorageKey, String(shouldCollapse));
        }

        updateToggleState();
      });

      document.addEventListener('click', (event) => {
        if (!mobileQuery.matches) return;
        if (!sidebar.classList.contains('open')) return;
        if (event.target.closest('.sidebar') || event.target.closest('.mobile-toggle')) return;
        closeMobileSidebar();
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeMobileSidebar();
        }
      });

      if (typeof mobileQuery.addEventListener === 'function') {
        mobileQuery.addEventListener('change', syncSidebarState);
      } else if (typeof mobileQuery.addListener === 'function') {
        mobileQuery.addListener(syncSidebarState);
      }
    }

    // Set user info in UI
    const usernameEls = document.querySelectorAll('.user-name-display');
    usernameEls.forEach(el => el.textContent = user.name);
    
    const avatarEls = document.querySelectorAll('.avatar-display');
    avatarEls.forEach(el => el.textContent = user.name.charAt(0).toUpperCase());

    // Setup logout hooks
    const logoutBtns = document.querySelectorAll('[data-action="logout"]');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        auth.logout();
      });
    });
  },

  openModal: (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
      const firstInput = modal.querySelector('input, button');
      if(firstInput) firstInput.focus();
    }
  },

  closeModal: (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('open');
    }
  }
};

// Global escape key for modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.open').forEach(modal => {
      modal.classList.remove('open');
    });
  }
});