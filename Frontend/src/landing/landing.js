(() => {
  'use strict';

  /* =========================================================
   * 1. INTERACTIVE BACKGROUND — confetti dots react to cursor
   * Palette: teal / yellow / gray (CLAUDE.md compliant)
   * =======================================================*/
  const initBackground = () => {
    const canvas = document.getElementById('bgCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const PALETTE = [
      { c: '#0f766e', a: 0.85 }, // teal
      { c: '#0f766e', a: 0.55 }, // teal soft
      { c: '#115e59', a: 0.75 }, // teal-dark
      { c: '#0a4642', a: 0.65 }, // teal-deep
      { c: '#FACC15', a: 0.85 }, // yellow
      { c: '#EAB308', a: 0.75 }, // yellow-dark
      { c: '#FACC15', a: 0.55 }, // yellow soft
      { c: '#9CA3AF', a: 0.45 }, // gray accent (rare)
    ];
    const PALETTE_WEIGHTS = [22, 14, 14, 8, 14, 10, 10, 8];

    let particles = [];
    let w = 0, h = 0, dpr = 1;
    const mouse = { x: -9999, y: -9999, active: false };
    const MOUSE_RADIUS = 150;
    const MOUSE_FORCE  = 50;
    let rafId = null;

    const pickColor = () => {
      const total = PALETTE_WEIGHTS.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      for (let i = 0; i < PALETTE.length; i++) {
        r -= PALETTE_WEIGHTS[i];
        if (r <= 0) return PALETTE[i];
      }
      return PALETTE[0];
    };

    const targetCount = () => {
      const area = w * h;
      const base = Math.round(area / 11000);
      return Math.max(60, Math.min(220, base));
    };

    const makeParticle = () => {
      const color = pickColor();
      const len = 3 + Math.random() * 8;
      const thick = 1.5 + Math.random() * 1.5;
      const x = Math.random() * w;
      const y = Math.random() * h;
      return {
        baseX: x, baseY: y,
        x, y,
        vx: 0, vy: 0,
        len, thick,
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.004,
        driftX: (Math.random() - 0.5) * 0.12,
        driftY: (Math.random() - 0.5) * 0.12,
        color: color.c,
        alpha: color.a * (0.6 + Math.random() * 0.4),
      };
    };

    const seed = () => {
      particles = [];
      const n = targetCount();
      for (let i = 0; i < n; i++) particles.push(makeParticle());
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width  = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width  = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const drawDash = (p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      const r = p.thick / 2;
      ctx.moveTo(-p.len / 2 + r, -r);
      ctx.lineTo( p.len / 2 - r, -r);
      ctx.arc( p.len / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(-p.len / 2 + r, r);
      ctx.arc(-p.len / 2 + r, 0, r,  Math.PI / 2, -Math.PI / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const update = (p) => {
      p.baseX += p.driftX;
      p.baseY += p.driftY;
      if (p.baseX < -20) p.baseX = w + 20;
      if (p.baseX > w + 20) p.baseX = -20;
      if (p.baseY < -20) p.baseY = h + 20;
      if (p.baseY > h + 20) p.baseY = -20;

      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < MOUSE_RADIUS && dist > 0.001) {
          const force = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE;
          const ux = dx / dist;
          const uy = dy / dist;
          p.vx += ux * force * 0.06;
          p.vy += uy * force * 0.06;
          const targetRot = Math.atan2(uy, ux);
          const delta = ((targetRot - p.rot + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
          p.rot += delta * 0.05;
        }
      }

      const sx = (p.baseX - p.x) * 0.04;
      const sy = (p.baseY - p.y) * 0.04;
      p.vx = (p.vx + sx) * 0.86;
      p.vy = (p.vy + sy) * 0.86;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.rotSpeed;
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(drawDash);
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i++) {
        update(particles[i]);
        drawDash(particles[i]);
      }
      rafId = requestAnimationFrame(tick);
    };

    const start = () => { if (!rafId) rafId = requestAnimationFrame(tick); };
    const stop  = () => { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } };

    const onPointer = (x, y) => {
      mouse.active = true;
      mouse.x = x;
      mouse.y = y;
    };
    window.addEventListener('mousemove', (e) => onPointer(e.clientX, e.clientY), { passive: true });
    window.addEventListener('mouseleave', () => { mouse.active = false; });
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length) onPointer(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    window.addEventListener('touchend', () => { mouse.active = false; });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (!reduce.matches) start();
    });

    let resizeT;
    window.addEventListener('resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(resize, 120);
    });

    resize();
    if (reduce.matches) {
      drawStatic();
    } else {
      start();
    }
    reduce.addEventListener('change', (e) => {
      if (e.matches) { stop(); drawStatic(); } else { start(); }
    });
  };

  /* =========================================================
   * 2. NAVBAR scroll state
   * =======================================================*/
  const initNavbar = () => {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  };

  /* =========================================================
   * 3. MOBILE MENU
   * =======================================================*/
  const initMobileMenu = () => {
    const hamburger = document.getElementById('hamburger');
    const menu = document.getElementById('mobileMenu');
    if (!hamburger || !menu) return;

    const toggle = (open) => {
      const willOpen = open ?? !hamburger.classList.contains('open');
      hamburger.classList.toggle('open', willOpen);
      menu.classList.toggle('open', willOpen);
      hamburger.setAttribute('aria-expanded', String(willOpen));
      menu.setAttribute('aria-hidden', String(!willOpen));
    };

    hamburger.addEventListener('click', () => toggle());
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggle(false)));
  };

  /* =========================================================
   * 4. SCROLL REVEAL
   * =======================================================*/
  const initReveal = () => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  };

  /* =========================================================
   * 5. STAT COUNTER
   * =======================================================*/
  const initCounters = () => {
    const cards = document.querySelectorAll('.stat-card .stat-value');
    if (!cards.length || !('IntersectionObserver' in window)) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animate = (el) => {
      const raw = el.textContent.trim();
      const match = raw.match(/^(\+?)(\d+)(.*)$/);
      if (!match) return;
      const prefix = match[1];
      const target = parseInt(match[2], 10);
      const suffix = match[3];
      if (reduce) return;
      const duration = 1100;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = prefix + Math.round(target * eased) + suffix;
        if (t < 1) requestAnimationFrame(step);
      };
      el.textContent = prefix + '0' + suffix;
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    cards.forEach(c => io.observe(c));
  };

  /* =========================================================
   * 6. TOP ALQUILADOS — fetch de los materiales más prestados
   * =======================================================*/
  const API_BASE = 'http://localhost:3000';

  const ICONS = {
    laptop:    '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M10 17v4M14 17v4"/><line x1="6" y1="8" x2="18" y2="8"/>',
    tablet:    '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="10" y1="18" x2="14" y2="18"/>',
    monitor:   '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    keyboard:  '<rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="10"/><line x1="10" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="14" y2="10"/><line x1="18" y1="10" x2="18" y2="10"/><line x1="7" y1="14" x2="17" y2="14"/>',
    mouse:     '<rect x="7" y="2" width="10" height="20" rx="5"/><line x1="12" y1="6" x2="12" y2="10"/>',
    drive:     '<rect x="2" y="7" width="20" height="10" rx="2"/><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/>',
    cable:     '<path d="M4 12a4 4 0 014-4h8a4 4 0 014 4v4H4z"/><line x1="8" y1="16" x2="8" y2="20"/><line x1="16" y1="16" x2="16" y2="20"/>',
    mic:       '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0M12 17v4M8 21h8"/>',
    headphones:'<path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 18a2 2 0 01-2 2h-1v-6h3zM3 18a2 2 0 002 2h1v-6H3z"/>',
    speaker:   '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="14" r="3"/><circle cx="12" cy="7" r="1" fill="currentColor"/>',
    camera:    '<path d="M3 8h3l2-3h8l2 3h3v11H3z"/><circle cx="12" cy="13" r="4"/>',
    projector: '<rect x="2" y="7" width="16" height="10" rx="2"/><circle cx="9" cy="12" r="2"/><line x1="18" y1="11" x2="22" y2="11"/><line x1="18" y1="13" x2="22" y2="13"/>',
    tripod:    '<line x1="12" y1="3" x2="12" y2="12"/><line x1="12" y1="12" x2="6" y2="21"/><line x1="12" y1="12" x2="18" y2="21"/><line x1="12" y1="12" x2="12" y2="21"/><circle cx="12" cy="4" r="2"/>',
    drill:     '<path d="M4 10h8l4-3v10l-4-3H4z"/><line x1="16" y1="12" x2="22" y2="12"/>',
    tools:     '<path d="M14 6l4-4 3 3-4 4M14 6l-8 8a2.8 2.8 0 104 4l8-8"/>',
    multimeter:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="10" r="2"/><line x1="7" y1="16" x2="17" y2="16"/>',
    ball:      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    racket:    '<circle cx="9" cy="9" r="6"/><line x1="13" y1="13" x2="20" y2="20"/>',
    weights:   '<rect x="2" y="9" width="3" height="6" rx="1"/><rect x="19" y="9" width="3" height="6" rx="1"/><rect x="5" y="10" width="14" height="4" rx="1"/>',
    box:       '<path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v10"/>',
  };

  const iconSvg = (name) => {
    const body = ICONS[name] || ICONS.box;
    return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  };

  const escapeHtml = (str) => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const formatPrecio = (m) => {
    if (!m.requiere_pago || m.precio_caucion_centimos == null) {
      return { price: 'Gratis', period: '/ préstamo' };
    }
    const euros = (m.precio_caucion_centimos / 100);
    const formatted = Number.isInteger(euros) ? `${euros}€` : `${euros.toFixed(2)}€`;
    return { price: formatted, period: '/ día' };
  };

  const renderCard = (m, idx) => {
    const tagClass = idx === 0 ? 'tag-yellow' : (idx % 2 === 0 ? 'tag-yellow' : 'tag-teal');
    const tagText  = idx === 0 ? 'Más popular' : (m.categoria_nombre || 'Disponible');
    const { price, period } = formatPrecio(m);

    return `
      <article class="card reveal in-view">
        <div class="card-icon">${iconSvg(m.icono)}</div>
        <span class="card-tag ${tagClass}">${escapeHtml(tagText)}</span>
        <h3>${escapeHtml(m.nombre)}</h3>
        <p>${escapeHtml(m.descripcion)}</p>
        <div class="card-price">
          <span class="price">${escapeHtml(price)}</span>
          <span class="period">${escapeHtml(period)}</span>
        </div>
        <a href="../autenticacion/login_registro/login.html" class="btn btn-primary card-cta">Reservar</a>
      </article>
    `;
  };

  const initTopAlquilados = async () => {
    const grid = document.getElementById('catalogGrid');
    if (!grid) return;
    try {
      const res = await fetch(`${API_BASE}/materiales/top-alquilados?limit=4`);
      if (!res.ok) throw new Error('Respuesta no OK');
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error('Sin datos');
      grid.innerHTML = data.map(renderCard).join('');
      grid.removeAttribute('data-loading');
    } catch (err) {
      console.warn('No se pudo cargar el top de alquilados, mostrando vacío.', err);
      grid.innerHTML = `
        <p class="catalog-empty">No hay materiales disponibles ahora mismo.</p>
      `;
      grid.removeAttribute('data-loading');
    }
  };

  /* =========================================================
   * BOOT
   * =======================================================*/
  const boot = () => {
    initBackground();
    initNavbar();
    initMobileMenu();
    initReveal();
    initCounters();
    initTopAlquilados();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
