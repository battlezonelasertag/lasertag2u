/* ============================================================
   GSAP-EFFECTS.JS — Parallax, Gear Tilt, Magnetic Buttons,
                     Word Reveals
   ============================================================ */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Hero Parallax ────────────────────────────────────────── */

  function initParallax() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Full-height hero (index.html)
    const heroBg = document.querySelector('.hero__bg-img');
    if (heroBg) {
      gsap.set(heroBg, { scale: 1.18, transformOrigin: 'center center' });
      gsap.to(heroBg, {
        yPercent: 14,
        ease: 'none',
        scrollTrigger: {
          trigger: '.hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }

    // Page-level hero (all other pages)
    const pageHeroBg = document.querySelector('.page-hero__bg img');
    if (pageHeroBg) {
      gsap.set(pageHeroBg, { scale: 1.15, transformOrigin: 'center center' });
      gsap.to(pageHeroBg, {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: {
          trigger: '.page-hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }
  }

  /* ── Section Headline Word Reveals ───────────────────────── */

  function initWordReveals() {
    if (typeof gsap === 'undefined') return;

    document.querySelectorAll('.section-header__title').forEach(el => {
      const parent = el.closest('.reveal');
      if (!parent) return;

      // Only split plain-text headings; skip those with child elements like <em>
      const hasInlineElements = Array.from(el.children).some(c => c.tagName !== 'BR');
      if (hasInlineElements) return;

      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words
        .map(w => `<span class="word-wrap"><span class="word">${w}</span></span>`)
        .join(' ');

      // Pre-hide words so the parent's opacity fade doesn't flash them
      gsap.set(el.querySelectorAll('.word'), { yPercent: 105, opacity: 0 });

      // Fire animation when animations.js adds is-visible to the parent
      const mo = new MutationObserver(() => {
        if (parent.classList.contains('is-visible')) {
          gsap.to(el.querySelectorAll('.word'), {
            yPercent: 0,
            opacity: 1,
            duration: 0.65,
            stagger: 0.06,
            ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
            delay: 0.05,
            clearProps: 'yPercent,opacity',
          });
          mo.disconnect();
        }
      });
      mo.observe(parent, { attributes: true, attributeFilter: ['class'] });
    });
  }

  /* ── Init ─────────────────────────────────────────────────── */

  function init() {
    if (prefersReducedMotion) return;
    initParallax();
    initWordReveals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
