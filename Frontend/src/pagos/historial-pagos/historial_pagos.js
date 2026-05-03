import { auth } from '../../compartido/nucleo/auth.js';
  import { api } from '../../compartido/nucleo/api.js';
  import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar.js';

  const user = auth.requireAuth(['estudiante', 'profesor']);
  mountSidebar({ activePage: 'pagos', basePath: '../..' });
  if (user) init(user);

  async function init(user) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'success') {
      document.getElementById('successToast').hidden = false;
    }

    const fmtMoney = (n, sign = '') =>
      sign + n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    const fmtDate = (iso) =>
      new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

    const body = document.getElementById('paymentsBody');

    const renderEmpty = (msg = 'No hay pagos en este filtro', desc = 'Cambia los filtros o vuelve más tarde. Tus próximos pagos aparecerán aquí.') => {
      body.innerHTML = `
        <tr><td colspan="6">
          <div class="empty">
            <div class="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
            </div>
            <div class="empty-title">${msg}</div>
            <div class="empty-desc">${desc}</div>
          </div>
        </td></tr>`;
    };

    let pagos = [];
    try {
      const data = await api.getPagos(user.id);
      pagos = data.map(p => ({
        id: p.id,
        fecha: p.fecha,
        concepto: p.concepto,
        conceptoSub: p.conceptoSub,
        metodo: p.metodo,
        importe: p.importe,
        estado: p.estado === 'reembolsado' ? 'refunded'
              : p.estado === 'fallido'     ? 'failed'
              : p.estado === 'pagado'      ? 'paid'
              : p.estado,
        recibo: p.reciboUrl || '#',
      }));
    } catch (err) {
      console.error('Error al cargar pagos:', err);
      renderEmpty('No se pudieron cargar los pagos', err.message);
      return;
    }

    const totalsPaid = pagos.filter(p => p.estado === 'paid').reduce((acc, p) => acc + p.importe, 0);
    document.getElementById('totalPaid').textContent = fmtMoney(totalsPaid);
    document.getElementById('paymentCount').textContent = pagos.filter(p => p.estado === 'paid').length;
    const ultimo = pagos.filter(p => p.estado === 'paid')[0];
    document.getElementById('lastPayment').textContent = ultimo ? fmtDate(ultimo.fecha) : '—';

    // Poblamos el selector de años con los disponibles
    const yearSelect = document.getElementById('yearFilter');
    const years = Array.from(new Set(pagos.map(p => new Date(p.fecha).getFullYear()))).sort((a, b) => b - a);
    yearSelect.innerHTML = '<option value="all">Todos los años</option>' +
      years.map(y => `<option value="${y}">${y}</option>`).join('');

    const renderRow = (p) => {
      const badgeMap = { paid: 'Pagado', refunded: 'Reembolsado', failed: 'Fallido', pendiente: 'Pendiente' };
      const sign = p.estado === 'refunded' ? '−' : '';
      const reciboHref = p.recibo && p.recibo !== '#' ? p.recibo : '#';
      return `
        <tr>
          <td class="p-date">${fmtDate(p.fecha)}</td>
          <td>
            <div class="p-concept-main">${p.concepto}</div>
            ${p.conceptoSub ? `<div class="p-concept-sub">${p.conceptoSub}</div>` : ''}
          </td>
          <td>
            <span class="p-method">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
              ${p.metodo || '—'}
            </span>
          </td>
          <td class="p-amount">${fmtMoney(p.importe, sign)}</td>
          <td><span class="badge ${p.estado}">${badgeMap[p.estado] || p.estado}</span></td>
          <td>
            <a class="receipt-link" href="${reciboHref}" aria-label="Descargar recibo del pago ${p.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Recibo
            </a>
          </td>
        </tr>`;
    };

    let filterEstado = 'all';
    let filterYear = 'all';

    const render = () => {
      let items = pagos;
      if (filterEstado !== 'all') items = items.filter(p => p.estado === filterEstado);
      if (filterYear !== 'all') items = items.filter(p => String(new Date(p.fecha).getFullYear()) === filterYear);
      if (items.length === 0) { renderEmpty(); return; }
      body.innerHTML = items.map(renderRow).join('');
    };

    render();

    document.querySelectorAll('.chip[data-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.chip[data-filter]').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-selected', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-selected', 'true');
        filterEstado = chip.dataset.filter;
        render();
      });
    });

    yearSelect.addEventListener('change', (e) => {
      filterYear = e.target.value;
      render();
    });
  }