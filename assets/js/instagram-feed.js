(function () {
  'use strict';

  let overlay = null;

  /* ── Modal styles ─────────────────────────────────────────── */

  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
      .ig-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.88);
        z-index: 9999;
        display: flex; align-items: center; justify-content: center;
        padding: 24px;
        opacity: 0; visibility: hidden;
        transition: opacity .22s ease, visibility .22s ease;
      }
      .ig-overlay.is-open { opacity: 1; visibility: visible; }
      .ig-modal {
        background: #2c2f30;
        border-radius: 14px;
        width: 100%; max-width: 520px;
        max-height: 90vh; overflow-y: auto;
        position: relative;
        transform: scale(.95);
        transition: transform .22s ease;
      }
      .ig-overlay.is-open .ig-modal { transform: scale(1); }
      .ig-modal__img {
        width: 100%; aspect-ratio: 1/1;
        object-fit: cover;
        border-radius: 14px 14px 0 0;
        display: block;
      }
      .ig-modal__body { padding: 20px 24px 24px; }
      .ig-modal__caption {
        font-size: 14px; color: rgba(255,255,255,.72);
        line-height: 1.65; margin: 0 0 16px;
      }
      .ig-modal__link {
        font-size: 13px; font-weight: 700;
        letter-spacing: .04em; color: #cafd00;
        text-decoration: none;
      }
      .ig-modal__link:hover { text-decoration: underline; }
      .ig-modal__close {
        position: absolute; top: 10px; right: 10px;
        width: 34px; height: 34px;
        background: rgba(0,0,0,.55); border: none; border-radius: 50%;
        color: #fff; font-size: 20px; line-height: 1;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: background .15s;
      }
      .ig-modal__close:hover { background: rgba(0,0,0,.85); }
      .ig-modal__video-badge {
        position: absolute; top: 12px; left: 12px;
        background: rgba(0,0,0,.6); border-radius: 6px;
        padding: 4px 8px; font-size: 11px; font-weight: 700;
        color: #fff; letter-spacing: .06em; text-transform: uppercase;
        pointer-events: none;
      }
      .ig-modal__video {
        width: 100%; aspect-ratio: 1/1;
        object-fit: cover; border-radius: 14px 14px 0 0;
        display: block;
      }
      .ig-modal__media { position: relative; }
      .ig-modal__mute {
        position: absolute; bottom: 10px; right: 10px;
        width: 34px; height: 34px;
        background: rgba(0,0,0,.55); border: none; border-radius: 50%;
        color: #fff; cursor: pointer;
        display: none; align-items: center; justify-content: center;
        transition: background .15s;
      }
      .ig-modal__mute:hover { background: rgba(0,0,0,.85); }
      .ig-modal__mute.is-visible { display: flex; }
      .ig-modal__mute svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      [data-instagram-strip] .photo-strip__item { cursor: pointer; }
    `;
    document.head.appendChild(s);
  }

  /* ── Modal DOM ────────────────────────────────────────────── */

  function createOverlay() {
    const el = document.createElement('div');
    el.className = 'ig-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Instagram post');
    el.innerHTML = `
      <div class="ig-modal">
        <button class="ig-modal__close" aria-label="Close">&times;</button>
        <div class="ig-modal__media">
          <img class="ig-modal__img" src="" alt="" style="display:none;">
          <video class="ig-modal__video" autoplay muted playsinline loop style="display:none;"></video>
          <button class="ig-modal__mute" aria-label="Unmute"></button>
        </div>
        <div class="ig-modal__body">
          <p class="ig-modal__caption"></p>
          <a class="ig-modal__link" href="#" target="_blank" rel="noopener noreferrer">View on Instagram →</a>
        </div>
      </div>`;
    document.body.appendChild(el);

    el.addEventListener('click', e => { if (e.target === el) close(); });
    el.querySelector('.ig-modal__close').addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    const muteBtn = el.querySelector('.ig-modal__mute');
    muteBtn.addEventListener('click', () => {
      const video = el.querySelector('.ig-modal__video');
      video.muted = !video.muted;
      updateMuteBtn(muteBtn, video.muted);
    });

    return el;
  }

  const ICON_UNMUTED = `<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
  const ICON_MUTED   = `<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;

  function updateMuteBtn(btn, isMuted) {
    btn.innerHTML    = isMuted ? ICON_MUTED : ICON_UNMUTED;
    btn.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
  }

  function open(item) {
    if (!overlay) overlay = createOverlay();

    const isVideo = item.media_type === 'VIDEO';
    const img     = overlay.querySelector('.ig-modal__img');
    const video   = overlay.querySelector('.ig-modal__video');
    const altText = item.caption ? item.caption.substring(0, 80) : 'Laser Tag 2 U';

    const muteBtn = overlay.querySelector('.ig-modal__mute');

    if (isVideo && item.media_url) {
      img.style.display   = 'none';
      video.style.display = '';
      video.muted         = true;
      video.poster        = item.thumbnail_url || '';
      video.src           = item.media_url;
      video.load();
      video.play().catch(() => {});
      video.onerror = () => {
        video.style.display = 'none';
        muteBtn.classList.remove('is-visible');
        img.style.display   = '';
        img.src             = item.thumbnail_url || '';
        img.alt             = altText;
      };
      muteBtn.classList.add('is-visible');
      updateMuteBtn(muteBtn, true);
    } else {
      video.style.display = 'none';
      video.src           = '';
      muteBtn.classList.remove('is-visible');
      img.style.display   = '';
      img.src             = isVideo ? (item.thumbnail_url || '') : item.media_url;
      img.alt             = altText;
    }

    const cap = overlay.querySelector('.ig-modal__caption');
    cap.textContent   = item.caption || '';
    cap.style.display = item.caption ? '' : 'none';

    overlay.querySelector('.ig-modal__link').href = item.permalink;
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!overlay) return;
    const video   = overlay.querySelector('.ig-modal__video');
    const muteBtn = overlay.querySelector('.ig-modal__mute');
    if (video) { video.pause(); video.src = ''; }
    if (muteBtn) muteBtn.classList.remove('is-visible');
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  /* ── Strip item ───────────────────────────────────────────── */

  function buildItem(item) {
    const src = item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url;
    if (!src) return null;

    const alt = item.caption
      ? item.caption.replace(/"/g, '“').substring(0, 100)
      : 'Laser Tag 2 U event photo';

    const el = document.createElement('div');
    el.className = 'photo-strip__item';
    el.innerHTML = `<img src="${src}" alt="${alt}" loading="lazy">`
      + (item.media_type === 'VIDEO' ? '<span class="ig-modal__video-badge">Video</span>' : '');
    el.addEventListener('click', () => open(item));
    return el;
  }

  /* ── Feed loader ──────────────────────────────────────────── */

  async function loadFeed() {
    const strip = document.querySelector('[data-instagram-strip]');
    if (!strip) return;

    try {
      const res = await fetch('/api/instagram');
      if (!res.ok) throw new Error('unavailable');

      const { media } = await res.json();
      if (!media || !media.length) throw new Error('empty');

      strip.innerHTML = '';
      media.forEach(item => {
        const el = buildItem(item);
        if (el) strip.appendChild(el);
      });
    } catch {
      // Static fallback images remain untouched
    }
  }

  injectStyles();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFeed);
  } else {
    loadFeed();
  }
})();
