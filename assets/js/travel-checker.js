/* Travel cost estimator — Nominatim geocoding + Leaflet map, no API key required */

(function () {
  const BASE_LAT = -32.7220;
  const BASE_LON = 152.1466;
  const FREE_RADIUS_KM = 130;   // ~1.5 hrs each way from Port Stephens
  const RATE_PER_BLOCK = 99;    // $99 per 30 min each way beyond free radius
  const KM_PER_BLOCK   = 38;    // ~38km haversine per 30 min drive

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function travelCost(distanceKm) {
    if (distanceKm <= FREE_RADIUS_KM) return 0;
    const chargeableKm = distanceKm - FREE_RADIUS_KM;
    const blocks = Math.ceil(chargeableKm / KM_PER_BLOCK);
    return blocks * RATE_PER_BLOCK * 2; // both ways
  }

  async function geocode(query) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=au`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    if (!data.length) throw new Error('not_found');
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), name: data[0].display_name };
  }

  function setResult(el, state, html) {
    el.removeAttribute('hidden');
    el.className = `travel-checker__result travel-checker__result--${state}`;
    el.innerHTML = html;
  }

  /* ── Map (initialised only if Leaflet loaded) ────────────── */

  let map = null;
  let userMarker = null;

  function initMap() {
    const mapEl = document.getElementById('service-map');
    if (!mapEl || typeof L === 'undefined') return;

    map = L.map('service-map', {
      center: [BASE_LAT, BASE_LON],
      zoom: 7,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    L.circle([BASE_LAT, BASE_LON], {
      radius: FREE_RADIUS_KM * 1000,
      color: '#a8d400',
      fillColor: '#cafd00',
      fillOpacity: 0.10,
      weight: 2,
      opacity: 0.7,
    }).addTo(map);

    L.circleMarker([BASE_LAT, BASE_LON], {
      radius: 7,
      fillColor: '#cafd00',
      color: '#2c2f30',
      weight: 2,
      fillOpacity: 1,
    }).addTo(map).bindTooltip('Port Stephens — our base', { permanent: false, direction: 'right' });
  }

  function updateMap(lat, lon, label) {
    if (!map) return;
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.circleMarker([lat, lon], {
      radius: 7,
      fillColor: '#2c2f30',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 0.9,
    }).addTo(map).bindTooltip(label, { permanent: false, direction: 'top' });
    map.fitBounds([[BASE_LAT, BASE_LON], [lat, lon]], { padding: [30, 30] });
  }

  /* ── Form ────────────────────────────────────────────────── */

  const form = document.getElementById('travel-checker-form');
  const input = document.getElementById('travel-location');
  const result = document.getElementById('travel-result');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const query = input.value.trim();
      if (!query) return;

      setResult(result, 'loading', '<span class="travel-checker__spinner" aria-hidden="true"></span> Checking…');

      try {
        const { lat, lon, name } = await geocode(query);
        const distKm = Math.round(haversineKm(BASE_LAT, BASE_LON, lat, lon));
        const cost = travelCost(distKm);
        const shortName = name.split(',').slice(0, 2).join(',');

        updateMap(lat, lon, shortName);

        if (cost === 0) {
          setResult(result, 'free',
            `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" width="20" height="20" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            <div>
              <strong>Travel included</strong>
              <span>${shortName} is within our free 1.5 hr service area.</span>
            </div>`
          );
        } else {
          setResult(result, 'cost',
            `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="20" height="20" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
            <div>
              <strong>Estimated travel: ~$${cost}</strong>
              <span>${shortName} is ~${distKm} km away. Exact cost confirmed in your quote.</span>
            </div>`
          );
        }
      } catch (err) {
        if (err.message === 'not_found') {
          setResult(result, 'error',
            `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="20" height="20" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
            <div><strong>Location not found</strong><span>Try a suburb name or postcode, e.g. "Gosford NSW".</span></div>`
          );
        } else {
          setResult(result, 'error',
            `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="20" height="20" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>
            <div><strong>Something went wrong</strong><span>Please try again or <a href="tel:+611300661565">call us</a>.</span></div>`
          );
        }
      }
    });
  }

  initMap();
})();
