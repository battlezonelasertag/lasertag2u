/* ============================================================
   ANIMATIONS.JS — Scroll Reveals & Counter Animations
   ============================================================ */

(function () {
  'use strict';

  /* ── Respect prefers-reduced-motion ───────────────────────── */

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    // Make all reveal elements immediately visible
    document.querySelectorAll('.reveal, .reveal-group, .reveal-scale').forEach(el => {
      el.classList.add('is-visible');
    });
    return;
  }

  /* ── Scroll Reveal ────────────────────────────────────────── */

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  function initReveal() {
    document.querySelectorAll('.reveal, .reveal-group, .reveal-scale').forEach(el => {
      revealObserver.observe(el);
    });
  }

  /* ── Counter Animation ────────────────────────────────────── */

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const duration = 1500;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const value = Math.round(easeOutQuart(progress) * target);

      el.textContent = prefix + value.toLocaleString() + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counters = entry.target.querySelectorAll('[data-target]');
        counters.forEach(counter => animateCounter(counter));
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  function initCounters() {
    const statsBars = document.querySelectorAll('.stats-bar');
    statsBars.forEach(bar => counterObserver.observe(bar));
  }

  /* ── SVG Line Draw Animation ──────────────────────────────── */

  function initLineDraw() {
    const lines = document.querySelectorAll('.process__connect-line');

    const lineObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-drawn');
          lineObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    lines.forEach(line => lineObserver.observe(line));
  }

  /* ── Init ─────────────────────────────────────────────────── */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initReveal();
      initCounters();
      initLineDraw();
    });
  } else {
    initReveal();
    initCounters();
    initLineDraw();
  }

})();
