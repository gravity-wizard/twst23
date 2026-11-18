/**
 * Twisted23 Shared Mini World Visitors Animated Globe Widget
 * - Links to https://www.twisted23.com/visitors/ (/visitors/)
 * - Shown small by default on all parlour subpages, with one-click Hide/Show persistence
 * - Uses Earth's true 23.44° axial tilt and real server telemetry (/visitors/telemetry.php)
 */
(function () {
  'use strict';

  var host = (window.location && window.location.hostname) || '';
  var path = (window.location && window.location.pathname) || '';
  var isTwistedHost = !host || /(^|\.)twisted23\.com$/i.test(host) || host === 'localhost' || host === '127.0.0.1';
  var BASE_ORIGIN = isTwistedHost ? '' : 'https://www.twisted23.com';
  var TELEMETRY_URL = BASE_ORIGIN + '/visitors/telemetry.php';
  var VISITORS_URL = BASE_ORIGIN + '/visitors/';
  var STORAGE_KEY = 'twst23_visitors_widget_hidden';
  function hexToRgbTuple(hex) {
    var h = String(hex || '#f59e0b').replace('#', '');
    if (h.length !== 6) return '245, 158, 11';
    return parseInt(h.slice(0, 2), 16) + ', ' + parseInt(h.slice(2, 4), 16) + ', ' + parseInt(h.slice(4, 6), 16);
  }
  function getEarthAxialTiltDeg(nowMs) {
    var jd = (nowMs || Date.now()) / 86400000 + 2440587.5;
    var T = (jd - 2451545.0) / 36525.0;
    var eps0 = 84381.406 - 46.836769 * T - 0.0001831 * T * T + 0.00200340 * T * T * T - 5.76e-7 * Math.pow(T, 4) - 4.34e-8 * Math.pow(T, 5);
    var omega = (125.04452 - 1934.136261 * T) * Math.PI / 180;
    var lSun = (280.4665 + 36000.7698 * T) * Math.PI / 180;
    var dEps = 9.205 * Math.cos(omega) + 0.573 * Math.cos(2 * lSun);
    return (eps0 + dEps) / 3600;
  }

  if (isTwistedHost && !window.__TW23_UNIVERSE_BAR_LOADED__ && !document.querySelector('script[src*="/tw23-universe-bar.js"]')) {
    var ubScript = document.createElement('script');
    ubScript.src = '/tw23-universe-bar.js';
    ubScript.defer = true;
    (document.head || document.documentElement).appendChild(ubScript);
  }

  if (isTwistedHost && /^\/visitors(\/index\.html|\/)?$/i.test(path)) {
    return;
  }

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
      '  width: 162px;',
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
      '  width: 108px;',
      '  height: 108px;',
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
      '  #twst23-visitors-card { width: 138px; padding: 7px; }',
      '  #twv-globe-canvas { width: 90px; height: 90px; }',
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
      '    <a href="' + VISITORS_URL + '" class="twv-title-link" title="Open World Visitors Live Globe (23.4° Tilt)">',
      '      <span class="twv-dot"></span>',
      '      <span id="twv-live-label">Visitors &#8599;</span>',
      '    </a>',
      '    <button type="button" id="twv-hide-btn" class="twv-hide-btn" aria-label="Hide World Visitors Globe" title="Hide small globe">Hide</button>',
      '  </div>',
      '  <a href="' + VISITORS_URL + '" class="twv-canvas-link" title="Open full World Visitors Live Globe">',
      '    <canvas id="twv-globe-canvas" width="216" height="216"></canvas>',
      '  </a>',
      '  <a href="' + VISITORS_URL + '" id="twv-ticker" class="twv-ticker-link" title="Open World Visitors Telemetry">&#127757; 23.4° Live Data</a>',
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
    var liveLabel = document.getElementById('twv-live-label');
    var gCtx = cv && cv.getContext ? cv.getContext('2d') : null;

    var hidden = isHiddenPref();
    var rafId = null;
    var liveLocations = [];
    var recentArrivals = [];
    var arrivalIdx = 0;
    var lastSeenTs = 0;

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

    var yaw = 0.85;
    var pitch = 0.14;
    var r = 82;
    var pings = [];
    var currentTiltDeg = getEarthAxialTiltDeg();
    var currentTiltRad = (currentTiltDeg * Math.PI) / 180;

    function applyEarthTransform(x0, y0, z0) {
      var x1 = x0 * Math.cos(currentTiltRad) - y0 * Math.sin(currentTiltRad);
      var y1 = x0 * Math.sin(currentTiltRad) + y0 * Math.cos(currentTiltRad);
      var z1 = z0;
      var y2 = y1 * Math.cos(pitch) - z1 * Math.sin(pitch);
      var z2 = y1 * Math.sin(pitch) + z1 * Math.cos(pitch);
      return { x: cv.width / 2 + x1, y: cv.height / 2 + y2, z: z2, visible: z2 > -4 };
    }

    function proj(lt, ln) {
      var ph = (lt * Math.PI) / 180;
      var th = ((ln + 180) * Math.PI) / 180 + yaw;
      var x0 = -r * Math.cos(ph) * Math.cos(th);
      var y0 = -r * Math.sin(ph);
      var z0 = r * Math.cos(ph) * Math.sin(th);
      return applyEarthTransform(x0, y0, z0);
    }

    function refreshTickerText() {
      if (!tickerEl) return;
      if (recentArrivals.length === 0) {
        tickerEl.textContent = '\uD83C\uDF0D ' + getEarthAxialTiltDeg().toFixed(4) + '\u00B0 Real';
        return;
      }
      var item = recentArrivals[arrivalIdx % recentArrivals.length];
      tickerEl.textContent = (item.siteBadge || '\uD83C\uDFA9') + ' ' + (item.flag || '\uD83C\uDF10') + ' ' + item.city + ' \u2192 ' + item.table;
    }

    function fetchRealTelemetry(recordHit) {
      try {
        window.fetch(TELEMETRY_URL, {
          method: recordHit ? 'POST' : 'GET',
          headers: recordHit ? { 'Content-Type': 'application/json' } : {},
          body: recordHit ? JSON.stringify({
            host: host || 'twisted23.com',
            path: path || '/',
            referrer: document.referrer || ''
          }) : undefined,
          cache: 'no-store'
        })
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (data) {
            if (!data || !data.ok) return;
            liveLocations = Array.isArray(data.activeLocations) ? data.activeLocations : [];
            recentArrivals = Array.isArray(data.recentArrivals) ? data.recentArrivals : [];
            if (liveLabel) {
              liveLabel.textContent = (data.combinedUniverseActive || data.activeSessions || 0) + ' Live \u2197';
            }
            if (recentArrivals.length > 0 && recentArrivals[0].ts > lastSeenTs) {
              lastSeenTs = recentArrivals[0].ts;
              var newest = recentArrivals[0];
              if (typeof newest.lat === 'number' && typeof newest.lon === 'number') {
                pings.push({ lat: newest.lat, lon: newest.lon, rad: 0, max: 18, color: newest.siteColor || '#f59e0b' });
              }
            }
            arrivalIdx = 0;
            refreshTickerText();
          })
          .catch(function () {});
      } catch (_) {}
    }

    // Always record the real visit once on load
    fetchRealTelemetry(true);

    // Rotate displayed real arrival & refresh every 15s while visible
    setInterval(function () {
      if (hidden || recentArrivals.length === 0) return;
      arrivalIdx = (arrivalIdx + 1) % recentArrivals.length;
      refreshTickerText();
    }, 3200);

    setInterval(function () {
      if (!hidden) fetchRealTelemetry(false);
    }, 15000);

    function draw() {
      if (hidden || !gCtx) {
        rafId = null;
        return;
      }
      currentTiltDeg = getEarthAxialTiltDeg();
      currentTiltRad = (currentTiltDeg * Math.PI) / 180;
      gCtx.clearRect(0, 0, cv.width, cv.height);
      var cx = cv.width / 2;
      var cy = cv.height / 2;

      // Earth's real-time tilted axis line
      var nPole = applyEarthTransform(0, -r * 1.16, 0);
      var sPole = applyEarthTransform(0, r * 1.16, 0);
      gCtx.save();
      gCtx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
      gCtx.lineWidth = 1.5;
      gCtx.beginPath();
      gCtx.moveTo(nPole.x, nPole.y);
      gCtx.lineTo(sPole.x, sPole.y);
      gCtx.stroke();
      gCtx.restore();

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
      gCtx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      gCtx.stroke();
      gCtx.clip();

      for (var i = 0; i < land.length; i++) {
        var pt = proj(land[i].lat, land[i].lon);
        if (pt.visible && pt.z > 0) {
          var alpha = Math.max(0.18, (pt.z / r) * 0.65);
          gCtx.beginPath();
          gCtx.arc(pt.x, pt.y, 1.4, 0, Math.PI * 2);
          gCtx.fillStyle = 'rgba(148, 163, 184, ' + alpha + ')';
          gCtx.fill();
        }
      }

      for (var j = 0; j < liveLocations.length; j++) {
        var loc = liveLocations[j];
        if (typeof loc.lat !== 'number' || typeof loc.lon !== 'number') continue;
        var cp = proj(loc.lat, loc.lon);
        if (cp.visible && cp.z > 0) {
          var pinColor = loc.siteColor || '#f59e0b';
          gCtx.beginPath();
          gCtx.arc(cp.x, cp.y, loc.isActive ? 3.5 : 2.7, 0, Math.PI * 2);
          gCtx.fillStyle = pinColor;
          gCtx.fill();
          if (loc.isActive) {
            gCtx.beginPath();
            gCtx.arc(cp.x, cp.y, 4.8, 0, Math.PI * 2);
            gCtx.strokeStyle = 'rgba(' + hexToRgbTuple(pinColor) + ', 0.55)';
            gCtx.lineWidth = 1.1;
            gCtx.stroke();
          }
        }
      }

      for (var k = pings.length - 1; k >= 0; k--) {
        var ping = pings[k];
        ping.rad += 0.45;
        var pAlpha = 1 - ping.rad / ping.max;
        var pp = proj(ping.lat, ping.lon);
        if (pp.visible && pp.z > 0 && pAlpha > 0) {
          gCtx.beginPath();
          gCtx.arc(pp.x, pp.y, ping.rad, 0, Math.PI * 2);
          gCtx.strokeStyle = 'rgba(' + hexToRgbTuple(ping.color) + ', ' + pAlpha + ')';
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
        fetchRealTelemetry(false);
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
