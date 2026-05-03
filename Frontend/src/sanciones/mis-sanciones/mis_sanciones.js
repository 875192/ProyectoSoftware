import { auth } from '../../compartido/nucleo/auth.js';
  import { api } from '../../compartido/nucleo/api.js';
  import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar.js';

  const user = auth.requireAuth(['estudiante', 'profesor']);
  mountSidebar({ activePage: 'sanciones', basePath: '../..' });
  if (!user) { /* redirige */ } else { init(user); }

  async function init(user) {
    const fmtMoney = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

    const list = document.getElementById('sanctionList');

    let sanciones = [];
    try {
      sanciones = await api.getSanciones(user.id);
    } catch (err) {
      console.error('Error al cargar sanciones:', err);
      list.innerHTML = `<div class="empty"><div class="empty-title">No se pudieron cargar las sanciones</div><div class="empty-desc">${err.message}</div></div>`;
      return;
    }

    // Normalizar al formato que la vista espera
    const items = sanciones.map(s => ({
      id: s.id,
      motivo: s.motivo,
      prestamoId: s.prestamoId,
      material: s.materialName || 'Material',
      fecha: s.fechaInicio,
      importe: s.importeCentimos / 100,
      estado: s.pagada ? 'paid' : 'pending',
    }));

    const totals = items.reduce((acc, s) => {
      if (s.estado === 'pending') { acc.debt += s.importe; acc.pending += 1; }
      else acc.paid += 1;
      return acc;
    }, { debt: 0, pending: 0, paid: 0 });

    document.getElementById('totalDebt').textContent = fmtMoney(totals.debt);
    document.getElementById('totalDebt').classList.toggle('debt', totals.debt > 0);
    document.getElementById('totalDebt').classList.toggle('zero', totals.debt === 0);
    if (totals.debt > 0) {
      const icon = document.getElementById('debtIcon');
      icon.classList.remove('ok');
      icon.classList.add('warn');
      icon.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    }
    document.getElementById('pendingCount').textContent = totals.pending;
    document.getElementById('paidCount').textContent = totals.paid;
    document.getElementById('countAll').textContent = items.length;
    document.getElementById('countPending').textContent = totals.pending;
    document.getElementById('countPaid').textContent = totals.paid;

    const renderEmpty = (filter) => {
      const titles = { all: 'Sin sanciones', pending: 'No tienes sanciones pendientes', paid: 'Aún no has pagado ninguna sanción' };
      const descs = {
        all: 'Cuando recibas una sanción aparecerá aquí. Devuelve siempre el material a tiempo y en buen estado para evitarlas.',
        pending: 'Estás al día con tus pagos. Sigue así.',
        paid: 'Cuando pagues una sanción aparecerá en esta lista.',
      };
      list.innerHTML = `
        <div class="empty">
          <div class="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <div class="empty-title">${titles[filter]}</div>
          <div class="empty-desc">${descs[filter]}</div>
        </div>`;
    };

    const renderSanction = (s) => {
      const paid = s.estado === 'paid';
      const subParts = [];
      if (s.material) subParts.push(s.material);
      if (s.prestamoId) subParts.push(`Préstamo #${s.prestamoId}`);
      if (s.fecha) subParts.push(fmtDate(s.fecha));
      const sub = subParts.join('<span class="dot"> · </span>');

      return `
        <div class="sanction" data-estado="${s.estado}">
          <div class="s-icon ${paid ? 'paid' : ''}">
            ${paid
              ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>'
              : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'}
          </div>
          <div class="s-meta">
            <div class="s-reason">${s.motivo}</div>
            <div class="s-sub">${sub}</div>
          </div>
          <div class="s-amount ${paid ? 'paid' : ''}">${fmtMoney(s.importe)}</div>
          ${paid
            ? '<span class="badge paid">Pagada</span>'
            : `<a class="btn-pay" href="../../pagos/checkout/checkout.html?id=${s.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                Pagar ahora
              </a>`}
        </div>`;
    };

    const render = (filter) => {
      const list2 = filter === 'all' ? items : items.filter(s => s.estado === filter);
      if (list2.length === 0) { renderEmpty(filter); return; }
      list.innerHTML = list2.map(renderSanction).join('');
    };

    render('all');

    document.querySelectorAll('.chip[data-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.chip[data-filter]').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-selected', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-selected', 'true');
        render(chip.dataset.filter);
      });
    });
  }