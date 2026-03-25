import { auth } from '../../js/core/auth.js';
import { ui } from '../../js/components/ui.js';
import { api } from '../../js/core/api.js';

const user = auth.requireAuth(['estudiante', 'profesor']);
if(!user) throw new Error("Not authenticated");

ui.setupLayout(user);

// Populate data
document.getElementById('profile-name').textContent = user.name;
document.getElementById('profile-avatar-large').textContent = user.name.charAt(0).toUpperCase();

const emailInput = document.getElementById('prof-email');
if (emailInput) {
  emailInput.value = user.email;
  emailInput.disabled = true; // Email could be non-editable
}

// Optional: Simulating saving changes
const form = document.getElementById('profile-form');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      // Extract other possible fields if you have them, currently profile just has names/etc.
      ui.showToast('Perfil actualizado correctamente', 'success');
      if (btn) btn.disabled = false;
    } catch (err) {
      ui.showToast('Error actualizando perfil', 'error');
    }
  });
}

// Notification badge logic
async function updateNotificationBadge() {
  try {
    const notifs = await api.getNotificaciones(user.id);
    const unseenCount = notifs.filter(n => !n.read).length;
    const notifBellBadge = document.getElementById('notif-bell-badge');
    if (unseenCount > 0 && notifBellBadge) {
      notifBellBadge.classList.add('show');
    }
  } catch (err) {
    console.error('Error fetching notifs:', err);
  }
}
updateNotificationBadge();
