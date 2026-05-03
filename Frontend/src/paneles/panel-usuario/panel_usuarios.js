import { auth } from '../../compartido/nucleo/auth.js';
  import { api } from '../../compartido/nucleo/api.js';
  import { mountSidebar } from '../../compartido/componentes-ui/sidebar/sidebar.js';
  const user = auth.requireAuth(['estudiante', 'profesor']);
  mountSidebar({ activePage: 'dashboard', basePath: '../..' });

  const ROLES_LABEL = {
    estudiante: 'Estudiante',
    profesor: 'Profesor',
    personal_gestion: 'Gestión',
    mantenimiento: 'Mantenimiento',
    admin: 'Administrador',
  };

  function initials(name) {
    return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || '?';
  }

  function fmtCentimos(c) {
    const eur = (c || 0) / 100;
    return eur.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  function fmtDueDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { label: '—', cls: '' };
    const now = new Date();
    const diff = Math.round((d - now) / 86400000);
    if (diff < 0) return { label: `Hace ${Math.abs(diff)}d`, cls: 'late' };
    if (diff === 0) return { label: 'Hoy', cls: 'late' };
    if (diff === 1) return { label: 'Mañana', cls: 'warn' };
    if (diff <= 3) return { label: `En ${diff} días`, cls: 'warn' };
    return { label: `En ${diff} días`, cls: '' };
  }

  function setHeaderUser() {
    document.getElementById('userName').textContent = user.name || '—';
    document.getElementById('userAvatar').textContent = initials(user.name);
    document.getElementById('userRole').textContent = ROLES_LABEL[user.role] || user.role || '—';
  }

  function initCharts(chartData) {
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const BAR_MONTHS = 8, LINE_MONTHS = 12;

    const rawLabels    = chartData ? chartData.labels       : Array(LINE_MONTHS).fill('—');
    const rawPrestamos = chartData ? chartData.prestamos    : Array(LINE_MONTHS).fill(0);
    const rawDevolucs  = chartData ? chartData.devoluciones : Array(LINE_MONTHS).fill(0);

    const barLabels = rawLabels.slice(-BAR_MONTHS);
    const barData   = rawPrestamos.slice(-BAR_MONTHS);
    const barMax    = Math.max(6,  Math.ceil(Math.max(...barData,  1) / 2) * 2);
    const lineMax   = Math.max(16, Math.ceil(Math.max(...rawPrestamos, ...rawDevolucs, 1) / 8) * 8);

    const barCtx = document.getElementById('prestamosChart').getContext('2d');
    new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: barLabels,
        datasets: [{ data: barData, backgroundColor: '#ffffff', hoverBackgroundColor: '#ccfbf1',
          borderRadius: 8, barPercentage: 0.4, categoryPercentage: 0.85 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: reduceMotion ? false : {
          duration: 700, easing: 'easeOutQuart',
          delay: (ctx) => ctx.type === 'data' && ctx.mode === 'default' ? ctx.dataIndex * 50 : 0,
        },
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
          x: { grid: { display: false, drawBorder: false },
               ticks: { color: 'rgba(255,255,255,0.55)', font: { size: 10, family: "'DM Sans'" } } },
          y: { beginAtZero: true, max: barMax, grid: { display: false, drawBorder: false },
               ticks: { color: 'rgba(255,255,255,0.55)', font: { size: 10, family: "'DM Sans'" }, stepSize: 2 },
               border: { display: false } }
        }
      }
    });

    const lineCtx = document.getElementById('catalogoChart').getContext('2d');
    const gradTeal = lineCtx.createLinearGradient(0, 0, 0, 270);
    gradTeal.addColorStop(0, 'rgba(15, 118, 110, 0.28)');
    gradTeal.addColorStop(1, 'rgba(15, 118, 110, 0.02)');
    const gradSlate = lineCtx.createLinearGradient(0, 0, 0, 270);
    gradSlate.addColorStop(0, 'rgba(71, 85, 105, 0.20)');
    gradSlate.addColorStop(1, 'rgba(71, 85, 105, 0.02)');
    const crosshairPlugin = {
      id: 'crosshair',
      afterDraw(chart) {
        const t = chart.tooltip;
        if (!t || !t.getActiveElements || t.getActiveElements().length === 0) return;
        const x = t.getActiveElements()[0].element.x;
        const { ctx, chartArea: { top, bottom } } = chart;
        ctx.save(); ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom);
        ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(15, 118, 110, 0.45)'; ctx.stroke(); ctx.restore();
      }
    };
    new Chart(lineCtx, {
      type: 'line', plugins: [crosshairPlugin],
      data: {
        labels: rawLabels,
        datasets: [
          { label: 'Préstamos realizados', data: rawPrestamos, borderColor: '#0f766e',
            backgroundColor: gradTeal, borderWidth: 3, fill: true, tension: 0.45,
            pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: '#0f766e',
            pointHoverBorderColor: '#ffffff', pointHoverBorderWidth: 2 },
          { label: 'Devoluciones', data: rawDevolucs, borderColor: '#475569',
            backgroundColor: gradSlate, borderWidth: 3, fill: true, tension: 0.45,
            pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: '#475569',
            pointHoverBorderColor: '#ffffff', pointHoverBorderWidth: 2 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        animation: reduceMotion ? false : { duration: 850, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#fff', titleColor: '#111827', bodyColor: '#4B5563',
            borderColor: '#E5E7EB', borderWidth: 1, padding: 10,
            titleFont: { family: "'Bricolage Grotesque'", weight: '700' },
            bodyFont: { family: "'DM Sans'" } }
        },
        scales: {
          x: { grid: { display: false, drawBorder: false },
               ticks: { color: '#9CA3AF', font: { size: 11, family: "'DM Sans'" } } },
          y: { beginAtZero: true, max: lineMax,
               grid: { color: '#F3F4F6', drawBorder: false, borderDash: [4, 4] },
               ticks: { color: '#9CA3AF', font: { size: 11, family: "'DM Sans'" }, stepSize: 8 },
               border: { display: false } }
        }
      }
    });
  }

  async function loadDashboard() {
    setHeaderUser();
    try {
      const [stats, deadlines, chartData] = await Promise.all([
        api.getDashboard(user.id),
        api.getProximosVencimientos(user.id, 5).catch(() => []),
        api.getEstadisticasMensuales(user.id).catch(() => null),
      ]);

      // Stat cards
      document.getElementById('statPrestamos').textContent = stats.prestamos.activos;
      document.getElementById('statSolicitudes').textContent = stats.solicitudes.pendientes + stats.solicitudes.en_espera;
      document.getElementById('statMateriales').textContent = stats.materiales_disponibles;
      document.getElementById('statDeuda').textContent = fmtCentimos(stats.deuda_centimos);

      // CTA
      document.getElementById('ctaMateriales').textContent = stats.materiales_disponibles;

      // Mini stats del usuario
      document.getElementById('usPrestamos').textContent = stats.prestamos.activos;
      document.getElementById('usSolicitudes').textContent = stats.solicitudes.pendientes;
      document.getElementById('usFinalizados').textContent = stats.prestamos.finalizados;
      document.getElementById('usDeuda').textContent = fmtCentimos(stats.deuda_centimos);

      // Próximos vencimientos
      const list = document.getElementById('deadlinesList');
      if (!deadlines.length) {
        list.innerHTML = `<div class="dl-sub" style="padding:14px 4px;">No tienes préstamos activos.</div>`;
      } else {
        list.innerHTML = deadlines.map(p => {
          const due = fmtDueDate(p.fechaDevolucionPrevista);
          return `
            <div class="deadline">
              <div class="dl-thumb">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>
              </div>
              <div class="dl-meta">
                <div class="dl-name">${p.materialName}</div>
                <div class="dl-sub">Préstamo #${p.id} · ${p.categoria || ''}</div>
              </div>
              <div class="dl-due ${due.cls}">${due.label}</div>
            </div>`;
        }).join('');
      }

      initCharts(chartData);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
    }
  }

  loadDashboard();

(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  /* ===== 1. Spotlight + tilt 3D en stat-cards ===== */
  if (finePointer && !reduce) {
    document.querySelectorAll('.stat-card, .info-cta, [data-spotlight]').forEach(el => {
      let raf = 0;
      const apply = (e) => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          const x = e.clientX - r.left;
          const y = e.clientY - r.top;
          const px = (x / r.width) * 100;
          const py = (y / r.height) * 100;
          el.style.setProperty('--mx', px + '%');
          el.style.setProperty('--my', py + '%');

          if (el.classList.contains('stat-card')) {
            const dx = (x / r.width) - 0.5;
            const dy = (y / r.height) - 0.5;
            el.style.setProperty('--tilt-y', (dx *  6).toFixed(2) + 'deg');
            el.style.setProperty('--tilt-x', (dy * -4).toFixed(2) + 'deg');
            el.style.setProperty('--lift', '-2px');
          }
        });
      };
      const reset = () => {
        cancelAnimationFrame(raf);
        if (el.classList.contains('stat-card')) {
          el.style.setProperty('--tilt-x', '0deg');
          el.style.setProperty('--tilt-y', '0deg');
          el.style.setProperty('--lift', '0px');
        }
      };
      el.addEventListener('mousemove', apply);
      el.addEventListener('mouseleave', reset);
    });
  }

  /* ===== 2. Magnetic CTAs ===== */
  if (finePointer && !reduce) {
    document.querySelectorAll('.tb-action, .deadlines-link, .info-cta-link').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.setProperty('--pull-x', (dx * 0.18).toFixed(1) + 'px');
        el.style.setProperty('--pull-y', (dy * 0.18).toFixed(1) + 'px');
      });
      el.addEventListener('mouseleave', () => {
        el.style.setProperty('--pull-x', '0px');
        el.style.setProperty('--pull-y', '0px');
      });
    });
  }

  /* ===== 3. Animated counters (one-shot, IntersectionObserver) ===== */
  const counters = document.querySelectorAll('[data-count]');
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    if (reduce) {
      el.textContent = (Number.isInteger(target) ? target : target.toFixed(0)) + suffix;
      return;
    }
    const duration = 750;
    const start = performance.now();
    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const v = target * easeOutQuart(t);
      el.textContent = Math.round(v) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          animateCount(en.target);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(c => io.observe(c));
  } else {
    counters.forEach(animateCount);
  }

  /* ===== 4. User-stat bars (animan al entrar en viewport) ===== */
  const bars = document.querySelectorAll('[data-bar]');
  if ('IntersectionObserver' in window && !reduce) {
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.style.width = en.target.dataset.bar + '%';
          io2.unobserve(en.target);
        }
      });
    }, { threshold: 0.4 });
    bars.forEach(b => io2.observe(b));
  } else {
    bars.forEach(b => { b.style.width = b.dataset.bar + '%'; });
  }

  /* ===== 5. Topbar shadow on scroll ===== */
  const sentinel = document.getElementById('topbar-sentinel');
  const topbar = document.getElementById('topbar');
  if (sentinel && topbar && 'IntersectionObserver' in window) {
    const io3 = new IntersectionObserver(([en]) => {
      topbar.classList.toggle('scrolled', !en.isIntersecting);
    });
    io3.observe(sentinel);
  }

  /* ===== 6. Search shortcut "/" ===== */
  const search = document.getElementById('dash-search');
  if (search) {
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        search.focus();
      }
    });
  }
})();