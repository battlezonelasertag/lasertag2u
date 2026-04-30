/* ============================================================
   MAIN.JS — Navigation, Shared Utilities, Mobile Menu
   ============================================================ */

(function () {
  'use strict';

  /* ── Nav Scroll Behavior ──────────────────────────────────── */

  const nav = document.querySelector('.nav');
  let lastScrollY = 0;

  function updateNav() {
    const scrollY = window.scrollY;

    if (scrollY > 80) {
      nav.classList.add('nav--scrolled');
      nav.classList.remove('nav--transparent');
    } else {
      nav.classList.remove('nav--scrolled');
      // Only transparent on pages with a full hero
      if (nav.dataset.transparent !== undefined) {
        nav.classList.add('nav--transparent');
      }
    }

    lastScrollY = scrollY;
  }

  if (nav) {
    // Check if the page has a hero (transparent nav start)
    if (document.querySelector('.hero, .page-hero')) {
      nav.dataset.transparent = '';
      nav.classList.add('nav--transparent');
    }

    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
  }

  /* ── Active Nav Link ──────────────────────────────────────── */

  function setActiveNavLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav__link, .nav__mobile-link');

    navLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const linkFile = href.split('/').pop();

      if (
        linkFile === currentPath ||
        (currentPath === '' && linkFile === 'index.html') ||
        (currentPath === 'index.html' && linkFile === '')
      ) {
        link.classList.add('is-active');
      }
    });
  }

  setActiveNavLink();

  /* ── Mobile Menu ──────────────────────────────────────────── */

  const hamburger = document.querySelector('.nav__hamburger');
  const mobileOverlay = document.querySelector('.nav__mobile-overlay');

  function openMenu() {
    hamburger.classList.add('is-open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileOverlay.classList.add('is-open');
    mobileOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // Small delay to allow display:flex before opacity transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        mobileOverlay.classList.add('is-open');
      });
    });
  }

  function closeMenu() {
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileOverlay.classList.remove('is-open');
    document.body.style.overflow = '';

    mobileOverlay.addEventListener('transitionend', function handler() {
      if (!mobileOverlay.classList.contains('is-open')) {
        mobileOverlay.style.display = '';
      }
      mobileOverlay.removeEventListener('transitionend', handler);
    });
  }

  if (hamburger && mobileOverlay) {
    hamburger.addEventListener('click', () => {
      if (hamburger.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close on mobile link click
    mobileOverlay.querySelectorAll('.nav__mobile-link').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && hamburger.classList.contains('is-open')) {
        closeMenu();
      }
    });
  }

  /* ── Phone Click Tracking ─────────────────────────────────── */

  document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', () => {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'phone_click', {
          'event_category': 'engagement',
          'event_label': window.location.pathname
        });
      }
    });
  });

  /* ── CTA Click Tracking ───────────────────────────────────── */

  document.querySelectorAll('[data-track-cta]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'cta_click', {
          'event_category': 'engagement',
          'event_label': btn.dataset.trackCta || window.location.pathname
        });
      }
    });
  });

  /* ── Mobile CTA Bar ───────────────────────────────────────── */

  const mobileCTABar = document.querySelector('.mobile-cta-bar');
  const enquirySection = document.querySelector('.enquiry-section');

  if (mobileCTABar && enquirySection) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          mobileCTABar.classList.add('is-hidden');
        } else {
          mobileCTABar.classList.remove('is-hidden');
        }
      });
    }, { threshold: 0.1 });

    observer.observe(enquirySection);
  }

  /* ── Smooth anchor scrolling (with nav offset) ────────────── */

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);

      if (target) {
        e.preventDefault();
        const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height'));
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

})();
