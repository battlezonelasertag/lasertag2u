(function () {
  'use strict';

  function buildItem(item) {
    const src = item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url;
    if (!src) return null;

    const alt = item.caption
      ? item.caption.replace(/"/g, '“').substring(0, 100)
      : 'Laser Tag 2 U event photo';

    const el = document.createElement('div');
    el.className = 'photo-strip__item';
    el.innerHTML = `<a href="${item.permalink}" target="_blank" rel="noopener noreferrer" aria-label="View on Instagram"><img src="${src}" alt="${alt}" loading="lazy"></a>`;
    return el;
  }

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFeed);
  } else {
    loadFeed();
  }
})();
