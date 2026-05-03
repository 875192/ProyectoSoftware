import { auth } from '../../compartido/nucleo/auth.js';
  import { api } from '../../compartido/nucleo/api.js';

  const currentUser = auth.requireAuth(['estudiante', 'profesor']);

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  const status    = params.get('status');

  const iconWrap  = document.getElementById('iconWrap');
  const title     = document.getElementById('title');
  const subtitle  = document.getElementById('subtitle');
  const detailBox = document.getElementById('detailBox');
  const actions   = document.getElementById('actions');

  function fmt(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function showSuccess(meta, solicitudId) {
    iconWrap.className = 'icon-wrap success';
    iconWrap.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    title.textContent = '¡Solicitud registrada!';
    subtitle.textContent = `Tu fianza de 10 € ha sido cobrada y tu solicitud ha quedado pendiente de aprobación por el personal de gestión.`;

    document.getElementById('dMaterial').textContent = meta.material_nombre || '—';
    document.getElementById('dDesde').textContent = fmt(meta.fecha_inicio);
    document.getElementById('dHasta').textContent = fmt(meta.fecha_fin);
    detailBox.classList.add('visible');

    actions.style.display = 'flex';
    actions.innerHTML = `
      <a class="btn btn-primary" href="../mis-solicitudes/mis_solicitudes.html">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Ver mis solicitudes
      </a>
      <a class="btn btn-secondary" href="../../catalogo/listado-materiales/listado_materiales.html">
        Volver al catálogo
      </a>`;
  }

  function showError(msg) {
    iconWrap.className = 'icon-wrap error';
    iconWrap.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    title.textContent = 'Error al procesar la solicitud';
    subtitle.textContent = msg || 'Algo salió mal. Contacta con el personal de gestión si el cargo apareció en tu tarjeta.';
    actions.style.display = 'flex';
    actions.innerHTML = `
      <a class="btn btn-secondary" href="../../catalogo/listado-materiales/listado_materiales.html">
        Volver al catálogo
      </a>`;
  }

  function showCancelled() {
    iconWrap.className = 'icon-wrap cancelled';
    iconWrap.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`;
    title.textContent = 'Pago cancelado';
    subtitle.textContent = 'Has cancelado el proceso de pago. Tu solicitud no ha sido registrada y no se ha realizado ningún cargo.';
    actions.style.display = 'flex';
    actions.innerHTML = `
      <a class="btn btn-primary" href="../../catalogo/listado-materiales/listado_materiales.html">
        Volver al catálogo
      </a>`;
  }

  async function processSession() {
    if (status === 'cancelled') {
      showCancelled();
      return;
    }

    if (!sessionId) {
      showError('No se encontró información de la sesión de pago.');
      return;
    }

    try {
      // 1. Verificar que el pago está confirmado en Stripe
      const verification = await api.verifyCheckoutSession(sessionId);

      if (!verification.paid) {
        showError('El pago no se ha completado. Por favor, inténtalo de nuevo.');
        return;
      }

      const meta = verification.metadata;

      // 2. Crear la solicitud en la BD con el payment_intent_id
      const solicitud = await api.createSolicitud({
        userId: currentUser.id,
        materialId: meta.material_id || null,
        materialName: meta.material_nombre,
        startDate: meta.fecha_inicio,
        endDate: meta.fecha_fin,
        purpose: meta.motivo,
        prioridad: meta.prioridad || 'normal',
        stripePaymentIntentId: verification.payment_intent_id,
      });

      showSuccess(meta, solicitud.id);

    } catch (err) {
      console.error('Error en proceso de pago:', err);
      showError(err.message || 'No se pudo procesar la solicitud tras el pago.');
    }
  }

  processSession();