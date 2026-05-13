/* ============================================================
   CALCULATOR.JS — Interactive Price Builder
   ============================================================ */

(function () {
  'use strict';

  /* ── Pricing constants ────────────────────────────────────── */

  const BASE_PRICE          = 550;
  const BASE_MINUTES        = 60;
  const BASE_TAGGERS        = 10;
  const PRICE_PER_30MIN     = 49;
  const PRICE_PER_TAGGER    = 30;
  const PRICE_PER_BUNKER    = 39;
  const PRICE_PER_DIR_HR    = 49;

  const MAX_EXTRA_BLOCKS    = 10;  // 60 min base + up to 10×30 = 6 hrs total
  const MAX_EXTRA_TAGGERS   = 30;
  const MAX_BUNKERS         = 20;
  const MAX_DIRECTORS       = 3;

  /* ── State ────────────────────────────────────────────────── */

  const state = {
    timeBlocks:   0,   // extra 30-min blocks beyond the included 60 min
    extraTaggers: 0,   // extra beyond the included 10
    bunkers:      0,
    directors:    0
  };

  /* ── Helpers ──────────────────────────────────────────────── */

  function totalMinutes() {
    return BASE_MINUTES + state.timeBlocks * 30;
  }

  function totalHours() {
    return totalMinutes() / 60;
  }

  function formatTime(minutes) {
    if (minutes < 60) return minutes + ' min';
    const hrs = minutes / 60;
    if (hrs === 1) return '1 hr';
    return (hrs % 1 === 0 ? hrs : hrs.toFixed(1)) + ' hrs';
  }

  function formatMoney(n) {
    return '$' + Math.round(n).toLocaleString('en-AU');
  }

  function calculate() {
    const hrs            = totalHours();
    const extraTimeCost  = state.timeBlocks   * PRICE_PER_30MIN;
    const extraTagCost   = state.extraTaggers * PRICE_PER_TAGGER;
    const bunkerCost     = state.bunkers      * PRICE_PER_BUNKER;
    const directorCost   = Math.round(state.directors * PRICE_PER_DIR_HR * hrs);
    const total          = BASE_PRICE + extraTimeCost + extraTagCost + bunkerCost + directorCost;

    return { extraTimeCost, extraTagCost, bunkerCost, directorCost, total };
  }

  /* ── Render ───────────────────────────────────────────────── */

  function render() {
    const { extraTimeCost, extraTagCost, bunkerCost, directorCost, total } = calculate();
    const totalTaggers = BASE_TAGGERS + state.extraTaggers;
    const hrs          = totalHours();
    const hrsLabel     = hrs === 1 ? '1 hr' : (hrs % 1 === 0 ? hrs : hrs.toFixed(1)) + ' hrs';

    /* — Stepper displays — */
    const timeEl      = document.getElementById('time-display');
    const taggersEl   = document.getElementById('taggers-display');
    const bunkersEl   = document.getElementById('bunkers-display');
    const directorsEl = document.getElementById('directors-display');

    if (timeEl)      timeEl.textContent      = formatTime(totalMinutes());
    if (taggersEl)   taggersEl.textContent   = totalTaggers;
    if (bunkersEl)   bunkersEl.textContent   = state.bunkers;
    if (directorsEl) directorsEl.textContent = state.directors;

    /* — Price breakdown — */
    const breakdown = document.getElementById('price-breakdown');
    if (breakdown) {
      let html = `<div class="price-breakdown__line">
        <span>Base package (60 min · 10 taggers · 1 MD)</span>
        <span>${formatMoney(BASE_PRICE)}</span>
      </div>`;

      if (extraTimeCost > 0) {
        html += `<div class="price-breakdown__line">
          <span>Extra play time (${state.timeBlocks} × 30 min @ $${PRICE_PER_30MIN})</span>
          <span>+${formatMoney(extraTimeCost)}</span>
        </div>`;
      }

      if (extraTagCost > 0) {
        html += `<div class="price-breakdown__line">
          <span>Extra taggers (${state.extraTaggers} × $${PRICE_PER_TAGGER})</span>
          <span>+${formatMoney(extraTagCost)}</span>
        </div>`;
      }

      if (bunkerCost > 0) {
        html += `<div class="price-breakdown__line">
          <span>T-Wall bunkers (${state.bunkers} × $${PRICE_PER_BUNKER})</span>
          <span>+${formatMoney(bunkerCost)}</span>
        </div>`;
      }

      if (directorCost > 0) {
        const dirLabel = state.directors === 1 ? 'Extra Mission Director' : `${state.directors} extra Mission Directors`;
        html += `<div class="price-breakdown__line">
          <span>${dirLabel} (${hrsLabel} × $${PRICE_PER_DIR_HR}${state.directors > 1 ? ' × ' + state.directors : ''})</span>
          <span>+${formatMoney(directorCost)}</span>
        </div>`;
      }

      breakdown.innerHTML = html;
    }

    /* — Total — */
    const totalEl = document.getElementById('calc-total');
    if (totalEl) totalEl.textContent = formatMoney(total);

    /* — Button states — */
    updateButtonStates();
  }

  function updateButtonStates() {
    document.querySelectorAll('[data-stepper]').forEach(btn => {
      const key = btn.dataset.stepper;
      const dir = parseInt(btn.dataset.dir, 10);
      let min = 0, max = 0, val = 0;

      switch (key) {
        case 'time':      max = MAX_EXTRA_BLOCKS;  val = state.timeBlocks;   break;
        case 'taggers':   max = MAX_EXTRA_TAGGERS; val = state.extraTaggers; break;
        case 'bunkers':   max = MAX_BUNKERS;        val = state.bunkers;      break;
        case 'directors': max = MAX_DIRECTORS;      val = state.directors;    break;
      }

      const needsMoreTime = key === 'directors' && dir === 1 && totalHours() < 4;
      btn.disabled = (dir === -1 && val <= min) || (dir === 1 && val >= max) || needsMoreTime;
    });
  }

  /* ── Event handling ───────────────────────────────────────── */

  function handleClick(e) {
    const btn = e.target.closest('[data-stepper]');
    if (!btn || btn.disabled) return;

    const key = btn.dataset.stepper;
    const dir = parseInt(btn.dataset.dir, 10);

    switch (key) {
      case 'time':
        state.timeBlocks = Math.max(0, Math.min(MAX_EXTRA_BLOCKS, state.timeBlocks + dir));
        if (totalHours() < 4) state.directors = 0;
        break;
      case 'taggers':
        state.extraTaggers = Math.max(0, Math.min(MAX_EXTRA_TAGGERS, state.extraTaggers + dir)); break;
      case 'bunkers':
        state.bunkers      = Math.max(0, Math.min(MAX_BUNKERS,       state.bunkers      + dir)); break;
      case 'directors':
        state.directors    = Math.max(0, Math.min(MAX_DIRECTORS,     state.directors    + dir)); break;
    }

    render();
  }

  /* ── Init ─────────────────────────────────────────────────── */

  function init() {
    const builder = document.querySelector('.price-builder');
    if (!builder) return;
    builder.addEventListener('click', handleClick);
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
