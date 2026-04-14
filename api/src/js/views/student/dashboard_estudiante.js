import { auth } from '../../core/auth.js';
import { ui } from '../../components/ui.js';
import { api } from '../../core/api.js';

const user = auth.requireAuth(['estudiante']);
if (!user) throw new Error('Not authenticated');

ui.setupLayout(user);

async function initDashboard() {
  try {
    const solicitudes = await api.getSolicitudes(user.id);
    const activas = solicitudes.filter(s => s.status === 'aprobada' || s.status === 'entregado');
    const pendientes = solicitudes.filter(s => s.status === 'pendiente');

    const activeEl = document.getElementById('stat-active-loans');
    const requestsEl = document.getElementById('stat-requests');
    if (activeEl) activeEl.textContent = activas.length;
    if (requestsEl) requestsEl.textContent = pendientes.length;

    const listContainer = document.getElementById('recent-activity-list');
    if (listContainer) {
      listContainer.innerHTML = '';

      if (solicitudes.length === 0) {
        listContainer.innerHTML = '<p style="color:var(--text-muted);font-size:14px;padding:10px;">No hay actividad reciente.</p>';
      } else {
        solicitudes.slice(0, 3).forEach(s => {
          let icon = 'clock';
          let color = '#f59e0b'; // pending
          if (['aprobada', 'entregado'].includes(s.status)) {
            icon = 'check-circle';
            color = 'var(--button-teal)';
          } else if (s.status === 'rechazada') {
            icon = 'x-circle';
            color = 'var(--danger)';
          }

          listContainer.innerHTML += `
            <div class="item-row">
              <div style="display:flex; align-items:center; gap:15px;">
                <div class="item-icon" style="color: ${color}; background: ${color}15;"><i data-lucide="${icon}"></i></div>
                <div>
                  <p style="font-weight:600">${s.materialName || 'Material'}</p>
                  <p style="font-size:12px;color:var(--text-muted)">Estado: ${s.status.toUpperCase()}</p>
                </div>
              </div>
            </div>`;
        });
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }
    }
    
    updateNotificationBadge();
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
  }
}

async function updateNotificationBadge() {
  try {
      const notifs = await api.getNotificaciones(user.id);
      const unreadCount = notifs.filter(n => !n.leida).length;
      
      const badge = document.querySelector('.notification-badge');
      if (badge) {
          if (unreadCount > 0) {
              badge.textContent = unreadCount;
              badge.classList.add('show');
          } else {
              badge.classList.remove('show');
          }
      }
  } catch (error) {
      console.error('Error procesando notificaciones', error);
