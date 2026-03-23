import { auth } from '../../js/core/auth.js';
    import { ui } from '../../js/components/ui.js';

    const user = auth.requireAuth(['estudiante', 'profesor']);
    if(!user) throw new Error("Not authenticated");

    ui.setupLayout(user);

    // Populate data
    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-avatar-large').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('prof-email').value = user.email;

    // Optional: Simulating saving changes
    const form = document.getElementById('profile-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // En una app real, actualizaríamos la BBDD
      ui.showToast('Perfil actualizado correctamente', 'success');
    });

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
