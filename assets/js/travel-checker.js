/* Travel cost estimator — uses Nominatim (OpenStreetMap) geocoding, no API key required */

(function () {
  const BASE_LAT = -32.7220;
  const BASE_LON = 152.1466;
  const FREE_RADIUS_KM = 100;
  const RATE_PER_KM = 1.30;

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
    const chargeableKm = Math.max(0, distanceKm * 2 - FREE_RADIUS_KM * 2);
    return Math.round(chargeableKm * RATE_PER_KM);
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

  const form = document.getElementById('travel-checker-form');
  const input = document.getElementById('travel-location');
  const result = document.getElementById('travel-result');

  if (!form) return;

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

      if (cost === 0) {
        setResult(result, 'free',
          `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" width="20" height="20" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
          <div>
            <strong>Travel included</strong>
            <span>${shortName} is ~${distKm} km from Port Stephens — within our free service area.</span>
          </div>`
        );
      } else {
        setResult(result, 'cost',
          `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" width="20" height="20" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
          <div>
            <strong>Estimated travel: ~$${cost}</strong>
            <span>${shortName} is ~${distKm} km away. Travel cost confirmed in your quote.</span>
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
})();
