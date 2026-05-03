import { auth } from '../../compartido/nucleo/auth.js';
  import { api } from '../../compartido/nucleo/api.js';
  import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar.js';

  const user = auth.requireAuth(['estudiante', 'profesor']);
  mountSidebar({ activePage: 'pagos', basePath: '../..' });
  if (user) init(user);

  async function init(user) {
    const fmtMoney = (n) =>
      n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    const fmtDate = (iso) =>
      new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const sancionId = params.get('sancion_id') || params.get('id');
    const payContent = document.getElementById('payContent');

    // --- VUELTA DE STRIPE: registrar pago ---
    if (sessionId && sancionId) {
      payContent.innerHTML = `<div style="text-align:center;padding:32px 0;color:var(--text-muted);font-size:13px;">Confirmando pago…</div>`;
      try {
        const sessionData = await fetch(`http://localhost:3000/pagos/verify-session?session_id=${sessionId}`)
          .then(r => r.json());

        if (!sessionData.paid) throw new Error('El pago no se completó');

        const sancion = await api.getSancion(sancionId);
        if (!sancion.pagada) {
          await api.pagarSancion({
            sancionId,
            metodoDetalle: 'Stripe Checkout',
            stripePaymentIntentId: sessionData.payment_intent_id,
          });
        }

        window.location.href = '../historial-pagos/historial_pagos.html?status=success';
      } catch (err) {
        payContent.innerHTML = `<div style="color:var(--error-text);font-size:13px;padding:16px 0;">Error al confirmar el pago: ${err.message}</div>`;
      }
      return;
    }

    // --- FLUJO NORMAL: mostrar resumen + botón ---
    if (!sancionId) {
      document.getElementById('summaryTitle').textContent = 'Sin sanción seleccionada';
      payContent.innerHTML = '';
      return;
    }

    let sancion;
    try {
      sancion = await api.getSancion(sancionId);
    } catch {
      document.getElementById('summaryTitle').textContent = 'Sanción no encontrada';
      payContent.innerHTML = '';
      return;
    }

    if (sancion.pagada) {
      document.getElementById('summaryTitle').textContent = 'Esta sanción ya está pagada';
      payContent.innerHTML = `<div style="text-align:center;color:var(--success-text);padding:24px 0;font-size:13px;font-weight:600;">✓ Pagada</div>`;
      return;
    }

    const importe = sancion.importeCentimos / 100;
    document.getElementById('summaryTitle').textContent = sancion.motivo;
    document.getElementById('summaryId').textContent = sancion.id;
    document.getElementById('summaryMaterial').textContent = sancion.materialName || '—';
    document.getElementById('summaryPrestamo').textContent = sancion.prestamoId ? '#' + sancion.prestamoId : '—';
    document.getElementById('summaryDate').textContent = sancion.fechaInicio ? fmtDate(sancion.fechaInicio) : '—';
    document.getElementById('summaryAmount').textContent = fmtMoney(importe);

    payContent.innerHTML = `
      <button class="btn-pay" id="btnPay" type="button">
        <span class="spinner" aria-hidden="true"></span>
        <span class="text">Pagar ${fmtMoney(importe)} con Stripe</span>
      </button>
      <div class="secure-badge" style="margin-top:14px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        Conexión segura · cifrado SSL
      </div>`;

    document.getElementById('btnPay').addEventListener('click', async () => {
      const btn = document.getElementById('btnPay');
      btn.classList.add('loading');
      btn.disabled = true;
      btn.querySelector('.text').textContent = 'Redirigiendo…';

      try {
        const res = await fetch('http://localhost:3000/pagos/sancion-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sancion_id: parseInt(sancionId) }),
        });
        const data = await res.json();
        if (!data.url) throw new Error(data.message || 'No se obtuvo URL de pago');
        window.location.href = data.url;
      } catch (err) {
        btn.classList.remove('loading');
        btn.disabled = false;
        btn.querySelector('.text').textContent = `Pagar ${fmtMoney(importe)} con Stripe`;
        alert('Error al iniciar el pago: ' + err.message);
      }
    });
  }