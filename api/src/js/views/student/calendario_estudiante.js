import { auth } from '../../js/core/auth.js';
import { ui } from '../../js/components/ui.js';
import { api } from '../../js/core/api.js';

const user = auth.requireAuth(['estudiante']);
if (!user) throw new Error('Not authenticated');

ui.setupLayout(user);

lucide.createIcons();

gsap.to(".calendar-workspace", { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" });

// --- LÓGICA ANIMACIÓN BOTÓN VOLVER ---
const backBtn = document.getElementById('backHomeBtn');
const arrowW = document.getElementById('arrowBackWrapper');

if (backBtn && arrowW) {
  backBtn.addEventListener('mouseenter', () => {
    gsap.to("#backHomeBtn span", { x: 4, duration: 0.3, ease: "power2.out" });
    gsap.to(arrowW, { width: 15, opacity: 1, marginRight: 3, duration: 0.3, ease: "power2.out" });
    gsap.to(".arrow-tail-back", { width: 10, duration: 0.3 });
  });

  backBtn.addEventListener('mouseleave', () => {
    gsap.to("#backHomeBtn span", { x: 0, duration: 0.3 });
    gsap.to(arrowW, { width: 0, opacity: 0, marginRight: 0, duration: 0.3 });
    gsap.to(".arrow-tail-back", { width: 0, duration: 0.3 });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("calendar-grid-body");
  
  let solicitudes = [];
  try {
    solicitudes = await api.getSolicitudes(user.id);
  } catch (err) {
    console.error('Error fetching calendar data', err);
  }

  // Get current date parts to determine which day is "today"
  const now = new Date();
  const currentDay = now.getDate();

  for(let i = 1; i <= 35; i++) {
    let isOtherMonth = i < 3 || i > 33;
    let dayNum = isOtherMonth ? (i < 3 ? 28 + i : i - 33) : i - 2;
    let dayClass = 'day-cell' + (isOtherMonth ? ' off-month' : '') + (dayNum === currentDay && !isOtherMonth ? ' today' : '');
    let cellHtml = `<div class="day-number">${dayNum}</div><div class="events-container">`;
    
    if (!isOtherMonth) {
      // Find events that end on this day (devolutions)
      const eventsForDay = solicitudes.filter(s => {
         if (!s.endDate) return false;
         const d = new Date(s.endDate);
         return d.getDate() === dayNum && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      eventsForDay.forEach(s => {
         let color = 'event-teal';
         if (s.status === 'pendiente') color = 'event-yellow';
         else if (s.status === 'rechazada') color = 'event-red';
         
         const text = s.status === 'aprobada' || s.status === 'en_prestamo' || s.status === 'entregado' ? 'Devolución' : (s.status === 'pendiente' ? 'Solicitud' : 'Completado');
         cellHtml += `<div class="event ${color}" title="Estado: ${s.status}">${text}: ${s.materialName || 'Material'}</div>`;
      });
    }

    cellHtml += `</div>`;
    grid.innerHTML += `<div class="${dayClass}">${cellHtml}</div>`;
  }
  
  gsap.from(".day-cell", { y: 15, opacity: 0, duration: 0.4, stagger: 0.01, ease: "power2.out", delay: 0.2 });
});