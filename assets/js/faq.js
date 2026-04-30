/* ============================================================
   FAQ.JS — Accordion Component
   ============================================================ */

(function () {
  'use strict';

  function initAccordion() {
    const items = document.querySelectorAll('.accordion-item');

    items.forEach(item => {
      const trigger = item.querySelector('.accordion-trigger');
      const panel = item.querySelector('.accordion-panel');

      if (!trigger || !panel) return;

      // Set initial ARIA attributes
      trigger.setAttribute('aria-expanded', 'false');
      const panelId = 'panel-' + Math.random().toString(36).slice(2, 9);
      panel.id = panelId;
      trigger.setAttribute('aria-controls', panelId);

      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');

        // Close all other open items (optional: remove for multi-open)
        items.forEach(otherItem => {
          if (otherItem !== item && otherItem.classList.contains('is-open')) {
            closeItem(otherItem);
          }
        });

        if (isOpen) {
          closeItem(item);
        } else {
          openItem(item);
        }
      });
    });
  }

  function openItem(item) {
    const panel = item.querySelector('.accordion-panel');
    const trigger = item.querySelector('.accordion-trigger');

    item.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');

    // Set max-height to measured scrollHeight for smooth animation
    panel.style.maxHeight = panel.scrollHeight + 'px';
  }

  function closeItem(item) {
    const panel = item.querySelector('.accordion-panel');
    const trigger = item.querySelector('.accordion-trigger');

    item.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    panel.style.maxHeight = '0';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAccordion);
  } else {
    initAccordion();
  }

})();
