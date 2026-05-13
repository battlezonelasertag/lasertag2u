/* ============================================================
   SCRAMBLE.JS — Hero Headline Text Scramble Effect
   ============================================================ */

(function () {
  'use strict';

  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?#@';
  const SCRAMBLE_DURATION = 800; // ms to resolve
  const HOLD_DURATION = 3000;    // ms to hold resolved state

  const PHRASES = [
    'School Fetes.',
    'Council Events.',
    'Sports Days.',
    'Community Festivals.',
    'Birthday Parties.',
    'Corporate Groups.',
    'Vacation Care.'
  ];

  function scrambleText(el, targetText, duration, onComplete) {
    const chars = CHARS.split('');
    const startTime = performance.now();
    const totalChars = targetText.length;
    let animFrame;

    function getChar() {
      return chars[Math.floor(Math.random() * chars.length)];
    }

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // How many characters are "locked in" (resolved left to right)
      const resolvedCount = Math.floor(progress * totalChars);

      let output = '';
      for (let i = 0; i < totalChars; i++) {
        if (i < resolvedCount) {
          output += targetText[i];
        } else if (targetText[i] === ' ' || targetText[i] === '.') {
          output += targetText[i];
        } else {
          output += getChar();
        }
      }

      el.textContent = output;

      if (progress < 1) {
        animFrame = requestAnimationFrame(update);
      } else {
        el.textContent = targetText;
        if (onComplete) onComplete();
      }
    }

    animFrame = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animFrame);
  }

  function initScramble() {
    const el = document.querySelector('.hero__headline-scramble');

    if (!el) return;

    // Skip animation if user prefers reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = PHRASES[0];
      return;
    }

    let currentIndex = 0;
    let cancelCurrent = null;
    let holdTimeout = null;

    function showNext() {
      const phrase = PHRASES[currentIndex];

      if (cancelCurrent) cancelCurrent();

      cancelCurrent = scrambleText(el, phrase, SCRAMBLE_DURATION, () => {
        holdTimeout = setTimeout(() => {
          currentIndex = (currentIndex + 1) % PHRASES.length;
          showNext();
        }, HOLD_DURATION);
      });
    }

    // Start after a brief delay (lets hero entrance animate first)
    setTimeout(showNext, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScramble);
  } else {
    initScramble();
  }

})();
