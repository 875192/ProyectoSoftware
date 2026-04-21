(() => {
  // Navbar scroll shadow
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // Hamburger / mobile menu
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    mobileMenu.setAttribute('aria-hidden', String(!open));
  });
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      mobileMenu.setAttribute('aria-hidden', 'true');
    });
  });

  // Hero entrance — staggered, fires on load
  const heroEls = document.querySelectorAll('#heroText .fade-up');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      heroEls.forEach(el => el.classList.add('visible'));
    });
  });

  // Hero rotating word
  const heroWord = document.getElementById('heroWord');
  if (heroWord) {
    const words = ['equipo', 'ordenador', 'cuaderno', 'material'];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let index = 0;

    window.setInterval(() => {
      index = (index + 1) % words.length;

      if (reducedMotion) {
        heroWord.textContent = words[index];
        return;
      }

      heroWord.classList.add('is-switching');
      window.setTimeout(() => {
        heroWord.textContent = words[index];
        heroWord.classList.remove('is-switching');
      }, 220);
    }, 2200);
  }

  // Scroll-triggered fade-ins (todos los fade-up fuera del hero)
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -36px 0px' });

  document.querySelectorAll('.fade-up').forEach(el => {
    if (!el.closest('#heroText')) observer.observe(el);
  });
})();
