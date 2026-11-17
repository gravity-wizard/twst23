/**
 * Twisted23 Shared Mini World Visitors Animated Globe Widget
 * Links to https://www.twisted23.com/visitors/ (/visitors/)
 * Shown small by default on all parlour subpages, with one-click Hide/Show persistence.
 */
(function () {
  'use strict';

  var path = (window.location && window.location.pathname) || '';
  if (/^\/visitors(\/index\.html|\/)?$/i.test(path)) {
    return;
  }

  var STORAGE_KEY = 'twst23_visitors_widget_hidden';
  var VISITORS_URL = '/visitors/';

  function isHiddenPref() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function setHiddenPref(hidden) {
    try {
      if (hidden) {
        window.localStorage.setItem(STORAGE_KEY, '1');
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (_) {}
  }

  function injectStyles() {
    if (document.getElementById('twv-widget-styles')) return;
    var style = document.createElement('style');
    style.id = 'twv-widget-styles';
    style.textContent = [
      '#twst23-visitors-dock {',
      '  position: fixed;',
      '  right: 14px;',
      '  bottom: 14px;',
      '  z-index: 9998;',
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;',
      '}',
      '#twst23-visitors-card {',
      '  width: 158px;',
      '  background: rgba(9, 19, 34, 0.94);',
      '  border: 1px solid rgba(56, 189, 248, 0.45);',
      '  border-radius: 14px;',
      '  padding: 8px 9px 9px;',
      '  box-shadow: 0 12px 30px rgba(2, 6, 23, 0.72), 0 0 18px rgba(56, 189, 248, 0.14);',
      '  backdrop-filter: blur(8px);',
      '  display: flex;',
      '  flex-direction: column;',
      '  align-items: center;',
      '  gap: 5px;',
      '}',
      '#twst23-visitors-card[hidden], #twst23-visitors-pill[hidden] {',
      '  display: none !important;',
      '}',
      '.twv-header {',
      '  width: 100%;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: space-between;',
      '  gap: 6px;',
      '}',
      '.twv-title-link {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 5px;',
      '  color: #38bdf8;',
      '  text-decoration: none;',
      '  font-size: 11px;',
      '  font-weight: 800;',
      '  letter-spacing: 0.03em;',
      '  white-space: nowrap;',
      '}',
      '.twv-title-link:hover { color: #7dd3fc; text-decoration: underline; }',
      '.twv-dot {',
      '  width: 7px;',
      '  height: 7px;',
      '  border-radius: 50%;',
      '  background: #10b981;',
      '  box-shadow: 0 0 6px #10b981;',
      '  flex-shrink: 0;',
      '}',
      '.twv-hide-btn {',
      '  background: rgba(30, 41, 59, 0.9);',
      '  color: #94a3b8;',
      '  border: 1px solid #334155;',
      '  border-radius: 999px;',
      '  font-size: 10px;',
      '  font-weight: 700;',
      '  padding: 2px 7px;',
      '  cursor: pointer;',
      '  line-height: 1.3;',
      '}',
      '.twv-hide-btn:hover { color: #fff; border-color: #64748b; background: #334155; }',
      '.twv-canvas-link {',
      '  display: block;',
      '  line-height: 0;',
      '  border-radius: 50%;',
      '}',
      '#twv-globe-canvas {',
      '  width: 104px;',
      '  height: 104px;',
      '  border-radius: 50%;',
      '  cursor: pointer;',
      '  display: block;',
      '}',
      '.twv-ticker-link {',
      '  display: block;',
      '  width: 100%;',
      '  text-align: center;',
      '  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;',
      '  font-size: 10px;',
      '  line-height: 1.25;',
      '  color: #cbd5e1;',
      '  text-decoration: none;',
      '  white-space: nowrap;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '  padding-top: 2px;',
      '}',
      '.twv-ticker-link:hover { color: #f59e0b; }',
      '#twst23-visitors-pill {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 6px;',
      '  background: rgba(9, 19, 34, 0.92);',
      '  border: 1px solid rgba(56, 189, 248, 0.45);',
      '  border-radius: 999px;',
      '  padding: 5px 8px 5px 10px;',
      '  box-shadow: 0 8px 22px rgba(2, 6, 23, 0.65);',
      '  backdrop-filter: blur(8px);',
      '}',
      '.twv-pill-link {',
      '  color: #38bdf8;',
      '  text-decoration: none;',
      '  font-size: 11.5px;',
      '  font-weight: 800;',
      '  white-space: nowrap;',
      '}',
      '.twv-pill-link:hover { color: #fff; }',
      '.twv-show-btn {',
      '  background: #1e293b;',
      '  color: #f59e0b;',
      '  border: 1px solid #334155;',
      '  border-radius: 999px;',
      '  font-size: 10.5px;',
      '  font-weight: 800;',
      '  padding: 2px 8px;',
      '  cursor: pointer;',
      '}',
      '.twv-show-btn:hover { background: #334155; color: #fbbf24; }',
      '@media (max-width: 520px) {',
      '  #twst23-visitors-dock { right: 10px; bottom: 10px; }',
      '  #twst23-visitors-card { width: 136px; padding: 7px; }',
      '  #twv-globe-canvas { width: 88px; height: 88px; }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function mountWidget() {
    if (!document.body || document.getElementById('twst23-visitors-dock')) return;
    injectStyles();

    var dock = document.createElement('aside');
    dock.id = 'twst23-visitors-dock';
    dock.setAttribute('aria-label', 'World Visitors Animated Globe');

    dock.innerHTML = [
      '<div id="twst23-visitors-card">',
      '  <div class="twv-header">',
      '    <a href="' + VISITORS_URL + '" class="twv-title-link" title="Open full World Visitors Animated Globe">',
      '      <span class="twv-dot"></span>',
      '      <span>Visitors &#8599;</span>',
      '    </a>',
      '    <button type="button" id="twv-hide-btn" class="twv-hide-btn" aria-label="Hide World Visitors Globe" title="Hide small globe">Hide</button>',
      '  </div>',
      '  <a href="' + VISITORS_URL + '" class="twv-canvas-link" title="Open full World Visitors Animated Globe">',
      '    <canvas id="twv-globe-canvas" width="208" height="208"></canvas>',
      '  </a>',
      '  <a href="' + VISITORS_URL + '" id="twv-ticker" class="twv-ticker-link" title="Open World Visitors Telemetry">&#127757; Live Globe</a>',
      '</div>',
      '<div id="twst23-visitors-pill" hidden>',
      '  <a href="' + VISITORS_URL + '" class="twv-pill-link" title="Open full World Visitors Globe">&#127757; Visitors &#8599;</a>',
      '  <button type="button" id="twv-show-btn" class="twv-show-btn" aria-label="Show small World Visitors Globe">Show</button>',
      '</div>'
    ].join('');

    document.body.appendChild(dock);

    var card = document.getElementById('twst23-visitors-card');
    var pill = document.getElementById('twst23-visitors-pill');
    var hideBtn = document.getElementById('twv-hide-btn');
    var showBtn = document.getElementById('twv-show-btn');
    var cv = document.getElementById('twv-globe-canvas');
    var tickerEl = document.getElementById('twv-ticker');
    var gCtx = cv && cv.getContext ? cv.getContext('2d') : null;

    var hidden = isHiddenPref();
    var rafId = null;

    // Continents dot-matrix coordinates
    var land = [];
    var boxes = [
      { minLat: 15, maxLat: 68, minLon: -140, maxLon: -55 },
      { minLat: -55, maxLat: 12, minLon: -80, maxLon: -35 },
      { minLat: 36, maxLat: 68, minLon: -10, maxLon: 42 },
      { minLat: -34, maxLat: 36, minLon: -17, maxLon: 51 },
      { minLat: 8, maxLat: 72, minLon: 42, maxLon: 145 },
      { minLat: -42, maxLat: -11, minLon: 112, maxLon: 154 }
    ];
    for (var lat = -70; lat <= 75; lat += 6) {
      var phi = (lat * Math.PI) / 180;
      var step = Math.max(6, 6.5 / Math.cos(phi));
      for (var lon = -180; lon < 180; lon += step) {
        for (var b = 0; b < boxes.length; b++) {
          var box = boxes[b];
          if (lat >= box.minLat && lat <= box.maxLat && lon >= box.minLon && lon <= box.maxLon) {
            land.push({ lat: lat, lon: lon });
            break;
          }
        }
      }
    }

    var cities = [
      { name: 'Tokyo', flag: '\uD83C\uDDEF\uD83C\uDDF5', lat: 35.68, lon: 139.65, table: 'Backgammon' },
      { name: 'London', flag: '\uD83C\uDDEC\uD83C\uDDE7', lat: 51.51, lon: -0.13, table: '24-Slider' },
      { name: 'New York', flag: '\uD83C\uDDFA\uD83C\uDDF8', lat: 40.71, lon: -74.01, table: 'Hangman' },
      { name: 'Anchorage', flag: '\uD83C\uDDFA\uD83C\uDDF8', lat: 61.22, lon: -149.90, table: 'TopHat' },
      { name: 'Paris', flag: '\uD83C\uDDEB\uD83C\uDDF7', lat: 48.86, lon: 2.35, table: 'TopHat' },
      { name: 'Singapore', flag: '\uD83C\uDDF8\uD83C\uDDEC', lat: 1.35, lon: 103.82, table: 'eXtreme' },
      { name: 'Sydney', flag: '\uD83C\uDDE6\uD83C\uDDFA', lat: -33.87, lon: 151.21, table: 'Backgammon' },
      { name: 'Sao Paulo', flag: '\uD83C\uDDE7\uD83C\uDDF7', lat: -23.55, lon: -46.63, table: '24-Slider' }
    ];

    var yaw = 0.85;
    var pitch = 0.26;
    var r = 88;
    var pings = [{ city: cities[0], rad: 0, max: 18 }];

    function updateTicker(c) {
      if (tickerEl) {
        tickerEl.textContent = c.flag + ' ' + c.name + ' \u2192 ' + c.table;
      }
    }
    updateTicker(cities[0]);

    setInterval(function () {
      if (hidden) return;
      var c = cities[Math.floor(Math.random() * cities.length)];
      pings.push({ city: c, rad: 0, max: 18 });
      updateTicker(c);
    }, 2800);

    function proj(lt, ln) {
      var ph = (lt * Math.PI) / 180;
      var th = ((ln + 180) * Math.PI) / 180 + yaw;
      var x = -r * Math.cos(ph) * Math.cos(th);
      var y = -r * Math.sin(ph);
      var z = r * Math.cos(ph) * Math.sin(th);
      var yP = y * Math.cos(pitch) - z * Math.sin(pitch);
      var zP = y * Math.sin(pitch) + z * Math.cos(pitch);
      return { x: cv.width / 2 + x, y: cv.height / 2 + yP, z: zP, visible: zP > -4 };
    }

    function draw() {
      if (hidden || !gCtx) {
        rafId = null;
        return;
      }
      gCtx.clearRect(0, 0, cv.width, cv.height);
      var cx = cv.width / 2;
      var cy = cv.height / 2;

      var sp = gCtx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
      sp.addColorStop(0, '#10223f');
      sp.addColorStop(0.7, '#091322');
      sp.addColorStop(1, '#050a14');

      gCtx.save();
      gCtx.beginPath();
      gCtx.arc(cx, cy, r, 0, Math.PI * 2);
      gCtx.fillStyle = sp;
      gCtx.fill();
      gCtx.lineWidth = 2;
      gCtx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      gCtx.stroke();
      gCtx.clip();

      for (var i = 0; i < land.length; i++) {
        var pt = proj(land[i].lat, land[i].lon);
        if (pt.visible && pt.z > 0) {
          var alpha = Math.max(0.22, (pt.z / r) * 0.9);
          gCtx.beginPath();
          gCtx.arc(pt.x, pt.y, 1.4, 0, Math.PI * 2);
          gCtx.fillStyle = 'rgba(56, 189, 248, ' + alpha + ')';
          gCtx.fill();
        }
      }

      for (var j = 0; j < cities.length; j++) {
        var cp = proj(cities[j].lat, cities[j].lon);
        if (cp.visible && cp.z > 0) {
          gCtx.beginPath();
          gCtx.arc(cp.x, cp.y, 2.8, 0, Math.PI * 2);
          gCtx.fillStyle = '#f59e0b';
          gCtx.fill();
        }
      }

      for (var k = pings.length - 1; k >= 0; k--) {
        var ping = pings[k];
        ping.rad += 0.45;
        var pAlpha = 1 - ping.rad / ping.max;
        var pp = proj(ping.city.lat, ping.city.lon);
        if (pp.visible && pp.z > 0 && pAlpha > 0) {
          gCtx.beginPath();
          gCtx.arc(pp.x, pp.y, ping.rad, 0, Math.PI * 2);
          gCtx.strokeStyle = 'rgba(245, 158, 11, ' + pAlpha + ')';
          gCtx.lineWidth = 2;
          gCtx.stroke();
        }
        if (ping.rad >= ping.max) pings.splice(k, 1);
      }

      gCtx.restore();
      yaw += 0.008;
      rafId = window.requestAnimationFrame(draw);
    }

    function applyVisibility() {
      card.hidden = hidden;
      pill.hidden = !hidden;
      if (!hidden && !rafId && gCtx) {
        rafId = window.requestAnimationFrame(draw);
      }
    }

    if (hideBtn) {
      hideBtn.addEventListener('click', function () {
        hidden = true;
        setHiddenPref(true);
        applyVisibility();
      });
    }

    if (showBtn) {
      showBtn.addEventListener('click', function () {
        hidden = false;
        setHiddenPref(false);
        applyVisibility();
      });
    }

    applyVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWidget);
  } else {
    mountWidget();
  }
})();
