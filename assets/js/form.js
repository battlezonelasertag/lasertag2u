/* ============================================================
   FORM.JS — Enquiry Form Validation, Submission & Modal
   ============================================================ */

(function () {
  'use strict';

  /* ── Cloudflare Turnstile ─────────────────────────────────── */

  // Replace with your real site key from dash.cloudflare.com → Turnstile
  const TURNSTILE_SITE_KEY = '0x4AAAAAADoZHdTKWeq-ZjH9';
  let _turnstileScriptLoaded = false;

  function loadTurnstileOnce() {
    if (_turnstileScriptLoaded) return;
    _turnstileScriptLoaded = true;
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    document.head.appendChild(s);
  }

  /* ── Validation Rules ─────────────────────────────────────── */

  const VALIDATORS = {
    name: {
      required: true,
      minLength: 2,
      message: 'Please enter your name (at least 2 characters).'
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address.'
    },
    phone: {
      required: true,
      pattern: /^[\d\s\+\-\(\)]{8,}$/,
      message: 'Please enter a valid Australian phone number.'
    },
    event_type: {
      required: true,
      message: 'Please select an event type.'
    },
    guest_count: {
      required: true,
      message: 'Please select an approximate guest count.'
    },
    location: {
      required: true,
      minLength: 2,
      message: 'Please enter your event location.'
    },
    event_date: {
      required: false,
      notPast: true,
      message: 'Please choose a date that isn’t in the past.'
    }
  };

  /* ── Today as YYYY-MM-DD (local time) ─────────────────────── */

  function todayISO() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  /* ── Validate a single field ──────────────────────────────── */

  function validateField(name, value) {
    const rule = VALIDATORS[name];
    if (!rule) return null; // no validation rule = valid

    if (rule.required && (!value || value.trim() === '')) {
      return rule.message;
    }

    if (value && rule.minLength && value.trim().length < rule.minLength) {
      return rule.message;
    }

    if (value && rule.pattern && !rule.pattern.test(value.trim())) {
      return rule.message;
    }

    if (value && rule.notPast && value < todayISO()) {
      return rule.message;
    }

    return null; // valid
  }

  /* ── Show / Clear field error ─────────────────────────────── */

  function showError(field, message) {
    const fieldEl = field.closest('.field');
    if (!fieldEl) return;
    fieldEl.classList.add('field--error');
    const errorEl = fieldEl.querySelector('.field__error-msg');
    if (errorEl) errorEl.textContent = message;
  }

  function clearError(field) {
    const fieldEl = field.closest('.field');
    if (!fieldEl) return;
    fieldEl.classList.remove('field--error');
  }

  /* ── Live validation on blur ──────────────────────────────── */

  function attachLiveValidation(form) {
    form.querySelectorAll('[name]').forEach(input => {
      input.addEventListener('blur', () => {
        const error = validateField(input.name, input.value);
        if (error) {
          showError(input, error);
        } else {
          clearError(input);
        }
      });

      input.addEventListener('input', () => {
        if (input.closest('.field')?.classList.contains('field--error')) {
          const error = validateField(input.name, input.value);
          if (!error) clearError(input);
        }
      });
    });
  }

  /* ── Validate entire form ─────────────────────────────────── */

  function validateForm(form) {
    let isValid = true;
    const fields = ['name', 'email', 'phone', 'event_type', 'guest_count', 'location', 'event_date'];

    fields.forEach(fieldName => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      if (!input) return;

      const error = validateField(fieldName, input.value);
      if (error) {
        showError(input, error);
        isValid = false;
      } else {
        clearError(input);
      }
    });

    return isValid;
  }

  /* ── Submit form ──────────────────────────────────────────── */

  async function submitForm(form) {
    const submitBtn = form.querySelector('[type="submit"]');
    const successEl = form.closest('.enquiry-form-wrap')?.querySelector('.form-success')
      || form.parentElement?.querySelector('.form-success');

    // Loading state
    if (submitBtn) {
      submitBtn.classList.add('btn--loading');
      submitBtn.disabled = true;
    }

    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => { payload[key] = value; });
    payload._source_page = window.location.pathname;

    try {
      const response = await fetch('/api/enquiry', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        // Success
        form.style.display = 'none';
        if (successEl) {
          successEl.classList.add('is-visible');
        }

        // Track GA4 conversion
        if (typeof gtag !== 'undefined') {
          gtag('event', 'form_submit', {
            'event_category': 'conversion',
            'event_label': payload.event_type || 'enquiry'
          });
        }
      } else {
        throw new Error('Server error: ' + response.status);
      }
    } catch (err) {
      console.error('Form submission error:', err);
      if (submitBtn) {
        submitBtn.classList.remove('btn--loading');
        submitBtn.disabled = false;
      }
      // Reset Turnstile so user gets a fresh token for retry
      const widget = form.querySelector('.cf-turnstile');
      if (window.turnstile && widget) {
        window.turnstile.reset(widget);
      }
      showSubmitError(form);
    }
  }

  function showSubmitError(form, msg) {
    let errorBanner = form.querySelector('.form-submit-error');
    if (!errorBanner) {
      errorBanner = document.createElement('p');
      errorBanner.className = 'form-submit-error';
      errorBanner.style.cssText = 'color: #ef4444; font-size: var(--text-sm); margin-top: var(--space-4);';
      form.appendChild(errorBanner);
    }
    errorBanner.textContent = msg || 'Something went wrong. Please try calling us directly on 1300 661 565.';
  }

  /* ── Wait for the Turnstile token ─────────────────────────── */

  function waitForTurnstileToken(form, timeoutMs = 5000) {
    const token = () => form.querySelector('[name="cf-turnstile-response"]')?.value;
    if (token()) return Promise.resolve(true);

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.classList.add('btn--loading');

    return new Promise(resolve => {
      const startedAt = Date.now();
      const poll = setInterval(() => {
        if (token() || Date.now() - startedAt > timeoutMs) {
          clearInterval(poll);
          if (submitBtn) submitBtn.classList.remove('btn--loading');
          resolve(Boolean(token()));
        }
      }, 150);
    });
  }

  /* ── Inject anti-spam fields ─────────────────────────────── */

  function injectAntiSpamFields(form) {
    // Honeypot: visually hidden field bots fill but humans skip
    const hp = document.createElement('div');
    hp.setAttribute('aria-hidden', 'true');
    hp.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
    hp.innerHTML = '<label>Leave this blank <input type="text" name="_hp" tabindex="-1" autocomplete="off" value=""></label>';
    form.appendChild(hp);

    // Timestamp: server checks form wasn't submitted in under 5 seconds
    const ts = document.createElement('input');
    ts.type = 'hidden';
    ts.name = '_t';
    ts.value = Date.now();
    form.appendChild(ts);

    // Turnstile widget — injected before the submit button
    const widget = document.createElement('div');
    widget.className = 'cf-turnstile';
    widget.setAttribute('data-sitekey', TURNSTILE_SITE_KEY);
    widget.setAttribute('data-theme', 'light');

    // The modal is capped at 90vh, and a permanently visible widget pushes the
    // submit button out of view. Interaction-only still runs the same challenge
    // — it just stays hidden unless the visitor actually has to solve something.
    if (form.closest('.modal')) {
      widget.setAttribute('data-appearance', 'interaction-only');
    } else {
      widget.style.marginBottom = 'var(--space-4)';
    }

    const submitBtn = form.querySelector('[type="submit"]');
    form.insertBefore(widget, submitBtn);
  }

  /* ── Init all enquiry forms ───────────────────────────────── */

  function initForms() {
    document.querySelectorAll('.enquiry-form').forEach(form => {
      injectAntiSpamFields(form);
      attachLiveValidation(form);

      // Event date can't be in the past — block earlier dates in the picker too
      form.querySelectorAll('input[name="event_date"]').forEach(input => {
        input.min = todayISO();
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm(form)) {
          const firstError = form.querySelector('.field--error');
          if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }

        // Require a Turnstile token before submitting. The modal widget is
        // hidden, so there's no visual cue to wait on — give it a moment to
        // arrive rather than erroring on a fast submit.
        const hasToken = await waitForTurnstileToken(form);
        if (!hasToken) {
          showSubmitError(form, 'Security check not complete — please wait a moment and try again.');
          return;
        }

        await submitForm(form);
      });
    });

    // Load Turnstile script after all widget divs are in the DOM
    loadTurnstileOnce();
  }

  /* ── Modal ────────────────────────────────────────────────── */

  function initModal() {
    const overlay = document.querySelector('.modal-overlay');
    if (!overlay) return;

    const modal = overlay.querySelector('.modal');
    const closeBtn = overlay.querySelector('.modal__close');

    function openModal() {
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      // Focus first input
      setTimeout(() => {
        const firstInput = modal?.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
      }, 300);
    }

    function closeModal() {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    // Open triggers
    document.querySelectorAll('[data-open-modal]').forEach(trigger => {
      trigger.addEventListener('click', openModal);
    });

    // Close on button
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // Close on overlay click (outside modal)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
        closeModal();
      }
    });
  }

  /* ── Testimonial Filter Tabs ──────────────────────────────── */

  function initTestimonialFilter() {
    const tabs = document.querySelectorAll('.filter-tab');
    const cards = document.querySelectorAll('.testimonial-card');

    if (!tabs.length || !cards.length) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const filter = tab.dataset.filter;

        // Update active tab
        tabs.forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');

        // Filter cards
        cards.forEach(card => {
          if (filter === 'all' || card.dataset.type === filter) {
            delete card.dataset.hidden;
          } else {
            card.dataset.hidden = '';
          }
        });
      });
    });
  }

  /* ── Capacity Calculator ──────────────────────────────────── */

  function initCalculator() {
    const rangeInput = document.querySelector('.calculator__range');
    const countDisplay = document.querySelector('.calculator__count-display');
    const resultPackage = document.querySelector('.calculator__result-package');
    const resultPrice = document.querySelector('.calculator__result-price');
    const resultNote = document.querySelector('.calculator__result-note');

    if (!rangeInput) return;

    const PACKAGES = [
      { min: 0,   max: 25,  name: 'Party Pack',        price: 'From $550',   note: 'Perfect for small groups. Includes 10 taggers, 60 min play, 1 Mission Director.' },
      { min: 26,  max: 50,  name: 'Group Session',     price: 'From $699',   note: 'Great for school groups & clubs. 12 taggers, 90 min play, 8 inflatable bunkers.' },
      { min: 51,  max: 150, name: 'Event Pack',        price: 'From $799',   note: 'Ideal for larger events. 14 taggers, 120 min play, 12 inflatable bunkers.' },
      { min: 151, max: 999, name: 'Custom Event Quote', price: 'Contact us',  note: "Large-scale events with 150+ players — let's talk about your requirements." }
    ];

    function updateCalculator(count) {
      if (countDisplay) countDisplay.textContent = count + '+';

      const pkg = PACKAGES.find(p => count >= p.min && count <= p.max) || PACKAGES[PACKAGES.length - 1];

      if (resultPackage) resultPackage.textContent = pkg.name;
      if (resultPrice) resultPrice.textContent = pkg.price;
      if (resultNote) resultNote.textContent = pkg.note;
    }

    rangeInput.addEventListener('input', () => {
      updateCalculator(parseInt(rangeInput.value, 10));
    });

    // Init
    updateCalculator(parseInt(rangeInput.value, 10));
  }

  /* ── Init ─────────────────────────────────────────────────── */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initForms();
      initModal();
      initTestimonialFilter();
      initCalculator();
    });
  } else {
    initForms();
    initModal();
    initTestimonialFilter();
    initCalculator();
  }

})();
