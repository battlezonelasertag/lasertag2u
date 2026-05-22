(function () {
  if (typeof L === 'undefined') return;

  var ACCENT      = '#cafd00';
  var ACCENT_DARK = '#a8d400';
  var BASE_LAT    = -32.7220;
  var BASE_LON    = 152.1466;

  var MAPS = [
    {
      id:       'area-map-hunter',
      center:   [-32.60, 151.60],
      zoom:     7,
      circle:   { lat: -32.70, lon: 151.55, radius: 85000 },
    },
    {
      id:       'area-map-coast',
      center:   [-33.38, 151.35],
      zoom:     9,
      circle:   { lat: -33.40, lon: 151.35, radius: 32000 },
    },
    {
      id:       'area-map-sydney',
      center:   [-33.80, 151.05],
      zoom:     8,
      circle:   { lat: -33.82, lon: 151.10, radius: 45000 },
    },
  ];

  var tileOpts = {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  };

  var mapOpts = {
    zoomControl:       false,
    attributionControl: true,
    dragging:          false,
    touchZoom:         false,
    doubleClickZoom:   false,
    scrollWheelZoom:   false,
    boxZoom:           false,
    keyboard:          false,
  };

  MAPS.forEach(function (cfg) {
    var el = document.getElementById(cfg.id);
    if (!el) return;

    var m = L.map(cfg.id, Object.assign({}, mapOpts, { center: cfg.center, zoom: cfg.zoom }));

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', tileOpts).addTo(m);

    L.circle([cfg.circle.lat, cfg.circle.lon], {
      radius:      cfg.circle.radius,
      color:       ACCENT_DARK,
      fillColor:   ACCENT,
      fillOpacity: 0.12,
      weight:      2,
      opacity:     0.6,
    }).addTo(m);

    L.circleMarker([BASE_LAT, BASE_LON], {
      radius:      6,
      fillColor:   ACCENT,
      color:       '#2c2f30',
      weight:      2,
      fillOpacity: 1,
    }).addTo(m).bindTooltip('Our base', { permanent: false, direction: 'right' });
  });
})();
