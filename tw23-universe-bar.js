/**
 * Twisted23 UniversaL Universe — Shared phpBB-Style Session Pill & Callsign Sync
 * Connects every Parlour subpage (/backgammon/, /botchee/, /flippingdice/, /tophat/, /slider/, /z404/, etc.)
 * to /auth/auth.php, /ucp/, /acp/, and /crm/ (GwCrm).
 */
(function () {
  'use strict';

  if (window.__TW23_UNIVERSE_BAR_LOADED__) return;
  window.__TW23_UNIVERSE_BAR_LOADED__ = true;

  var pathname = (window.location && window.location.pathname) || '/';
  // Dedicated panels already render their own full phpBB topbar
  if (/^\/(ucp|acp|crm)(\/|$)/i.test(pathname)) return;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function applyCallsignHooks(user) {
    if (!user || !user.username) return;
    window.TW23_USER = user;
    try {
      window.localStorage.setItem('tw23_callsign', user.username);
      window.localStorage.setItem('tw23_base38_id', user.base38_id || '');
    } catch (_) {}

    // Pre-fill Backgammon 2-Player room inputs if present and untouched
    ['hostPlayerNameInput', 'joinPlayerNameInput'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && (!el.value || /^(player\s*[12]|host|guest)$/i.test(el.value.trim()))) {
        el.value = user.username;
      }
    });
  }

  function injectStyles() {
    if (document.getElementById('tw23-ub-styles')) return;
    var st = document.createElement('style');
    st.id = 'tw23-ub-styles';
    st.textContent = [
      '#tw23-universe-dock {',
      '  position: fixed;',
      '  top: 10px;',
      '  right: 12px;',
      '  z-index: 9997;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 5px;',
      '  background: rgba(9, 15, 28, 0.92);',
      '  border: 1px solid rgba(56, 189, 248, 0.42);',
      '  border-radius: 999px;',
      '  padding: 4px 10px;',
      '  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif;',
      '  font-size: 11.5px;',
      '  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);',
      '  backdrop-filter: blur(8px);',
      '}',
      '#tw23-universe-dock.is-admin {',
      '  border-color: rgba(229, 169, 50, 0.65);',
      '}',
      '#tw23-universe-dock a {',
      '  color: #e2e8f0;',
      '  text-decoration: none;',
      '  font-weight: 700;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 4px;',
      '  white-space: nowrap;',
      '}',
      '#tw23-universe-dock a:hover { color: #38bdf8; }',
      '#tw23-universe-dock .ub-sep { color: #475569; font-size: 10px; }',
      '#tw23-universe-dock .ub-id {',
      '  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;',
      '  font-size: 10px;',
      '  color: #38bdf8;',
      '  background: rgba(56, 189, 248, 0.14);',
      '  padding: 1px 5px;',
      '  border-radius: 4px;',
      '}',
      '#tw23-universe-dock .ub-staff { color: #e5a932; }',
      '@media (max-width: 620px) {',
      '  #tw23-universe-dock { top: auto; bottom: 12px; left: 12px; right: auto; }',
      '}',
    ].join('\n');
    document.head.appendChild(st);
  }

  function renderDock(user) {
    // Homepage already has #headerAuth in its main topbar
    if (document.getElementById('headerAuth')) return;
    injectStyles();

    var existing = document.getElementById('tw23-universe-dock');
    if (!existing) {
      existing = document.createElement('nav');
      existing.id = 'tw23-universe-dock';
      existing.setAttribute('aria-label', 'Twisted23 UniversaL Account Bar');
      document.body.appendChild(existing);
    }

    var redir = encodeURIComponent(pathname + (window.location.search || ''));
    if (!user) {
      existing.className = '';
      existing.innerHTML =
        '<a href="/ucp/?mode=login&amp;redirect=' + redir + '" title="Sign in to Twisted23 UniversaL Universe">🔑 Login</a>' +
        '<span class="ub-sep">•</span>' +
        '<a href="/ucp/?mode=memberlist" title="Browse MemberList">👥 Roster</a>';
      return;
    }

    existing.className = user.is_admin ? 'is-admin' : '';
    var html =
      '<a href="/ucp/" title="Open User ControL PaneL">' +
      '<span>' + esc(user.badge || '🧝') + '</span>' +
      '<span style="color:' + esc(user.group_color || '#f8fafc') + ';">' + esc(user.username) + '</span>' +
      (user.base38_id ? '<span class="ub-id">' + esc(user.base38_id) + '</span>' : '') +
      '</a>' +
      '<span class="ub-sep">•</span>' +
      '<a href="/ucp/" title="User ControL PaneL">UCP</a>';

    if (user.is_admin) {
      html +=
        '<span class="ub-sep">•</span>' +
        '<a href="/crm/" class="ub-staff" title="GwCrm Coordination Hub">GwCrm</a>' +
        '<span class="ub-sep">•</span>' +
        '<a href="/acp/" class="ub-staff" title="Administration ControL PaneL">ACP</a>';
    } else {
      html +=
        '<span class="ub-sep">•</span>' +
        '<a href="/ucp/?mode=memberlist" title="UniversaL MemberList">Roster</a>';
    }
    existing.innerHTML = html;
  }

  function boot() {
    var pageParam = encodeURIComponent(pathname);
    fetch('/auth/auth.php?action=check_session&page=' + pageParam + '&_t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.status === 'authenticated' && data.user) {
          applyCallsignHooks(data.user);
          renderDock(data.user);
        } else {
          renderDock(null);
        }
      })
      .catch(function () {
        renderDock(null);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
