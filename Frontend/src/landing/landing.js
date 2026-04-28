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
   * BOOT
   * =======================================================*/
  const boot = () => {
    initBackground();
    initNavbar();
    initMobileMenu();
    initReveal();
    initCounters();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
