/* ============================================================
   FORM.JS — Enquiry Form Validation, Submission & Modal
   ============================================================ */

(function () {
  'use strict';

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
    }
  };

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
    const requiredFields = ['name', 'email', 'phone', 'event_type', 'guest_count', 'location'];

    requiredFields.forEach(fieldName => {
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
      // Re-enable button and show generic error
      if (submitBtn) {
        submitBtn.classList.remove('btn--loading');
        submitBtn.disabled = false;
      }
      showSubmitError(form);
    }
  }

  function showSubmitError(form) {
    let errorBanner = form.querySelector('.form-submit-error');
    if (!errorBanner) {
      errorBanner = document.createElement('p');
      errorBanner.className = 'form-submit-error';
      errorBanner.style.cssText = 'color: #ef4444; font-size: var(--text-sm); margin-top: var(--space-4);';
      form.appendChild(errorBanner);
    }
    errorBanner.textContent = 'Something went wrong. Please try calling us directly on 1300 661 565.';
  }

  /* ── Init all enquiry forms ───────────────────────────────── */

  function initForms() {
    document.querySelectorAll('.enquiry-form').forEach(form => {
      attachLiveValidation(form);

      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm(form)) {
          // Scroll to first error
          const firstError = form.querySelector('.field--error');
          if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }

        await submitForm(form);
      });
    });
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
