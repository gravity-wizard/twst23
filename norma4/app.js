(function () {
  const $ = (sel) => document.querySelector(sel);
  let trialData = null;
  let currentChIdx = 0;

  // Safe non-disclosing public Apple Notes demo data (zero manuscript or system secrets)
  const PUBLIC_NOTES = [
    { title: 'Normal Settings — Router Backup', preview: 'Check normal settings before travel mode kicks in...', cue: 'normal' },
    { title: 'Normally Open Valve Spec', preview: 'Valve stays normally open when power is disconnected...', cue: 'normally' },
    { title: 'Normalize Monthly Grocery Sheet', preview: 'Normalize column widths and round totals...', cue: 'normalize' },
    { title: 'Norma — Friday Luncheon at 12:30', preview: 'Corner booth by the window · NormA likes extra lemon...', cue: 'target', target: true },
    { title: 'Norman Rockwell Museum Gift Idea', preview: 'Pocket hardcover catalog & postcard set...', cue: 'norman' },
    { title: 'Normalcy Bias Reading Excerpt', preview: 'Why busy brains overlook obvious anomalies...', cue: 'normalcy' },
  ];

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function api(url, opts = {}) {
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      throw new Error(`Unexpected response (${res.status})`);
    }
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  }

  function sendTelemetry(event, meta = {}) {
    try {
      const body = JSON.stringify({ event, meta });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('api.php?action=telemetry', new Blob([body], { type: 'application/json' }));
      } else {
        fetch('api.php?action=telemetry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch (_) {}
  }

  window.addEventListener('error', (ev) => {
    sendTelemetry('client_error', { msg: ev.message || 'error', line: ev.lineno || 0 });
  });
  window.addEventListener('unhandledrejection', (ev) => {
    sendTelemetry('client_error', { msg: String(ev.reason || 'rejection') });
  });

  // Render pre-gate mini Apple Notes search comparison
  function renderPublicPreview(q) {
    const statsEl = $('#public-preview-stats');
    const listEl = $('#public-preview-results');
    if (!statsEl || !listEl) return;

    let hits = [];
    if (q === '"Norma "') {
      hits = PUBLIC_NOTES.filter((n) => `${n.title} ${n.preview}`.toLowerCase().includes('norma '));
      statsEl.textContent = `1 hit for "Norma " — trailing space inside quotes filters out 5 "Normal..." notes immediately.`;
    } else if (q === 'NormA') {
      hits = PUBLIC_NOTES.filter((n) => `${n.title} ${n.preview}`.includes('NormA'));
      statsEl.textContent = `1 hit for NormA — one deliberate mid-word cue locks straight onto your luncheon note.`;
    } else {
      hits = PUBLIC_NOTES.filter((n) => `${n.title} ${n.preview}`.toLowerCase().includes('norma'));
      statsEl.textContent = `${hits.length} hits for "Norma" — buried at #4 under Normal, Normally, Normalize.`;
    }

    listEl.innerHTML = hits.map((n) => `
      <div class="anote-card-row ${n.target ? 'target-hit' : 'flood-noise'}">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <strong>${escapeHtml(n.title)}</strong>
          <span style="font-size:0.72rem;color:var(--muted);">${n.target ? '🎯 Target Note' : 'Prefix Noise'}</span>
        </div>
        <div style="color:var(--muted);font-size:0.8rem;margin-top:2px;">${escapeHtml(n.preview)}</div>
      </div>
    `).join('');
  }

  document.querySelectorAll('.public-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.public-preset').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderPublicPreview(btn.dataset.pq);
      sendTelemetry('public_preview_preset', { query: btn.dataset.pq });
    });
  });
  renderPublicPreview('Norma');

  // Theme Toggle (Default Light Ivory Apple Notes -> Optional Dark Notes)
  const themeBtn = $('#btn-theme');
  function applyTheme(dark) {
    document.body.classList.toggle('theme-dark', dark);
    themeBtn.textContent = dark ? '☀️ Light Paper' : '🌙 Dark Notes';
  }
  try {
    applyTheme(localStorage.getItem('n4_theme') === 'dark');
  } catch (_) {
    applyTheme(false);
  }
  themeBtn.addEventListener('click', () => {
    const nextDark = !document.body.classList.contains('theme-dark');
    applyTheme(nextDark);
    try { localStorage.setItem('n4_theme', nextDark ? 'dark' : 'light'); } catch (_) {}
    sendTelemetry('theme_toggle', { dark: nextDark });
  });

  // Balanced Line-Length Equalizer Toggle (Botchee4x4)
  let balancedOn = true;
  $('#btn-equalize').addEventListener('click', () => {
    balancedOn = !balancedOn;
    document.body.classList.toggle('balanced-prose', balancedOn);
    $('#btn-equalize').textContent = balancedOn ? '⚖️ Balanced: ON' : '⚖️ Balanced: OFF';
    sendTelemetry('equalizer_toggle', { enabled: balancedOn });
  });

  // Safe Markdown Renderer for Decrypted Notes
  function renderMarkdown(md) {
    const lines = String(md || '').split('\n');
    const html = [];
    let inList = false;
    let inTable = false;

    function inlineFmt(text) {
      let out = escapeHtml(text);
      out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
      out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      return out;
    }

    function closeBlocks() {
      if (inList) { html.push('</ul>'); inList = false; }
      if (inTable) { html.push('</tbody></table>'); inTable = false; }
    }

    for (const rawLine of lines) {
      const trimmed = rawLine.trimEnd().trim();

      if (trimmed === '') {
        closeBlocks();
        continue;
      }
      if (trimmed === '---') {
        closeBlocks();
        html.push('<hr style="border:none;border-top:1px solid var(--border);margin:18px 0;" />');
        continue;
      }
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (inList) { html.push('</ul>'); inList = false; }
        const cells = trimmed.slice(1, -1).split('|').map((c) => c.trim());
        if (cells.every((c) => /^[:\-\s]+$/.test(c))) continue;
        if (!inTable) {
          inTable = true;
          html.push('<table><thead><tr>' + cells.map((c) => `<th>${inlineFmt(c)}</th>`).join('') + '</tr></thead><tbody>');
          continue;
        }
        html.push('<tr>' + cells.map((c) => `<td>${inlineFmt(c)}</td>`).join('') + '</tr>');
        continue;
      }
      if (inTable) { html.push('</tbody></table>'); inTable = false; }

      if (trimmed.startsWith('#### ')) {
        closeBlocks();
        html.push(`<h4>${inlineFmt(trimmed.slice(5))}</h4>`);
      } else if (trimmed.startsWith('### ')) {
        closeBlocks();
        html.push(`<h3>${inlineFmt(trimmed.slice(4))}</h3>`);
      } else if (trimmed.startsWith('> ')) {
        closeBlocks();
        html.push(`<blockquote>${inlineFmt(trimmed.slice(2))}</blockquote>`);
      } else if (/^[-*]\s+/.test(trimmed)) {
        if (!inList) { html.push('<ul>'); inList = true; }
        html.push(`<li>${inlineFmt(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
      } else {
        closeBlocks();
        html.push(`<p>${inlineFmt(trimmed)}</p>`);
      }
    }
    closeBlocks();
    return html.join('\n');
  }

  function runDemoSearch(rawQuery) {
    if (!trialData) return;
    const notes = trialData.demo_notes || [];
    const q = String(rawQuery || '').trim();
    const statsEl = $('#demo-search-stats');
    const resEl = $('#demo-search-results');

    let hits = [];
    if (q === '') {
      hits = notes;
    } else if (q.startsWith('"') && q.endsWith('"') && q.length >= 2) {
      const exactInner = q.slice(1, -1).toLowerCase();
      hits = notes.filter((n) => `${n.title} ${n.body}`.toLowerCase().includes(exactInner));
    } else {
      const lower = q.toLowerCase();
      hits = notes.filter((n) => `${n.title} ${n.body} ${(n.tags || []).join(' ')}`.toLowerCase().includes(lower));
    }

    const foundNorma = hits.some((h) => h.target);
    statsEl.textContent = q
      ? `${hits.length} note${hits.length === 1 ? '' : 's'} matched "${q}"` + (hits.length === 1 && foundNorma ? ' — Laser-locked on Norma!' : (hits.length > 1 ? ' — prefix flood in action!' : ''))
      : `Showing all ${notes.length} sample notes`;

    resEl.innerHTML = hits.length
      ? hits.map((n) => `
          <div class="demo-note ${n.target ? 'hit' : ''}">
            <strong>${escapeHtml(n.title)}</strong>
            <div style="color:var(--muted);margin-top:2px;">${escapeHtml(n.body)}</div>
          </div>
        `).join('')
      : '<div class="demo-note">No matches.</div>';
  }

  function renderChapterNav(filterTerm = '') {
    if (!trialData || !trialData.chapters) return;
    const nav = $('#chapter-nav');
    const q = filterTerm.trim().toLowerCase();
    const items = trialData.chapters.map((ch, idx) => ({ ch, idx })).filter(({ ch }) => {
      if (!q) return true;
      return ch.title.toLowerCase().includes(q) || (ch.markdown || '').toLowerCase().includes(q);
    });

    nav.innerHTML = items.length
      ? items.map(({ ch, idx }) => {
          const snippet = (ch.markdown || '').replace(/[#*`>|_]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 62);
          return `
            <button type="button" class="anotes-list-item chapter-link ${idx === currentChIdx ? 'active' : ''}" data-ch-idx="${idx}">
              <span class="note-title">${escapeHtml(ch.title)}</span>
              <span class="note-sub">${escapeHtml(snippet)}...</span>
            </button>
          `;
        }).join('')
      : '<div style="font-size:0.8rem;color:var(--muted);padding:8px;">No matching notes.</div>';

    nav.querySelectorAll('.chapter-link').forEach((b) => {
      b.addEventListener('click', () => renderChapter(Number(b.dataset.chIdx)));
    });
  }

  function renderChapter(idx) {
    if (!trialData || !trialData.chapters || !trialData.chapters.length) return;
    currentChIdx = Math.max(0, Math.min(idx, trialData.chapters.length - 1));
    const ch = trialData.chapters[currentChIdx];
    const wc = String(ch.markdown || '').trim().split(/\s+/).filter(Boolean).length;
    $('#active-chapter-tag').textContent = `Note ${currentChIdx + 1} of ${trialData.chapters.length}`;
    $('#active-chapter-words').textContent = `~${wc.toLocaleString()} words`;
    $('#active-chapter-title').textContent = ch.title;
    $('#active-chapter-body').innerHTML = renderMarkdown(ch.markdown);

    document.querySelectorAll('.chapter-link').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.chIdx) === currentChIdx);
    });
    $('#btn-prev-ch').disabled = currentChIdx === 0;
    $('#btn-next-ch').disabled = currentChIdx === trialData.chapters.length - 1;
    sendTelemetry('chapter_read', { chapter_id: ch.id, title: ch.title.slice(0, 60) });
  }

  function enterUnlockedView(payload) {
    trialData = payload.trial;
    $('#gate-view').hidden = true;
    $('#trial-view').hidden = false;
    $('#btn-lock').hidden = false;

    const badge = $('#session-badge');
    const isEd = payload.tier === 'editorial';
    badge.className = 'badge badge-ok';
    badge.textContent = isEd
      ? `🛡️ Editorial Vault (${payload.prefix_hint || 'e-tier'}) · NDA ✓`
      : `📖 Reader Trial (${payload.prefix_hint || 'r-tier'}) · NDA ✓`;

    const banner = $('#minted-aaid-banner');
    if (payload.minted_aaid) {
      banner.hidden = false;
      banner.innerHTML = `
        <strong>🎫 Your Reader <code>AAid</code> Password:</strong>
        <code style="font-size:1.05rem;">${escapeHtml(payload.minted_aaid)}</code>
        <span style="color:var(--muted);font-size:0.84rem;margin-left:8px;">Save this 9-character password to re-enter anytime.</span>
      `;
    } else {
      banner.hidden = true;
    }

    renderChapterNav();
    renderChapter(0);
    runDemoSearch('Norma');
  }

  // Gate Tabs
  const tabAaid = $('#tab-aaid');
  const tabPre = $('#tab-presurvey');
  function switchGateTab(which) {
    const isAaid = which === 'aaid';
    tabAaid.classList.toggle('active', isAaid);
    tabPre.classList.toggle('active', !isAaid);
    tabAaid.setAttribute('aria-selected', String(isAaid));
    tabPre.setAttribute('aria-selected', String(!isAaid));
    $('#panel-aaid').hidden = !isAaid;
    $('#panel-presurvey').hidden = isAaid;
  }
  tabAaid.addEventListener('click', () => switchGateTab('aaid'));
  tabPre.addEventListener('click', () => switchGateTab('presurvey'));

  const urlAaid = new URLSearchParams(window.location.search).get('aaid');
  if (urlAaid) {
    $('#input-aaid').value = urlAaid.trim();
  }

  $('#form-unlock').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fb = $('#unlock-feedback');
    fb.style.color = 'var(--muted)';
    fb.textContent = 'Verifying AAid, unwrapping key & checking NDA...';
    try {
      const data = await api('api.php?action=unlock', {
        method: 'POST',
        body: JSON.stringify({
          aaid: $('#input-aaid').value.trim(),
          reviewer_note: $('#input-note').value.trim(),
          nda_accepted: $('#check-nda-aaid').checked,
        }),
      });
      fb.textContent = '';
      enterUnlockedView(data);
    } catch (err) {
      fb.style.color = 'var(--danger-text)';
      fb.textContent = err.message;
    }
  });

  $('#form-presurvey').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fb = $('#survey-unlock-feedback');
    fb.style.color = 'var(--muted)';
    fb.textContent = 'Minting your Reader AAid & decrypting notes...';
    const freq = document.querySelector('input[name="ps_freq"]:checked')?.value || '';
    const trick = document.querySelector('input[name="ps_trick"]:checked')?.value || '';
    const role = document.querySelector('input[name="ps_role"]:checked')?.value || '';
    try {
      const data = await api('api.php?action=survey_unlock', {
        method: 'POST',
        body: JSON.stringify({
          nda_accepted: $('#check-nda-survey').checked,
          pre_survey: { frequency: freq, trick_tried: trick, role },
        }),
      });
      fb.textContent = '';
      enterUnlockedView(data);
    } catch (err) {
      fb.style.color = 'var(--danger-text)';
      fb.textContent = err.message;
    }
  });

  $('#btn-lock').addEventListener('click', async () => {
    await api('api.php?action=logout', { method: 'POST' }).catch(() => {});
    window.location.reload();
  });

  $('#btn-prev-ch').addEventListener('click', () => renderChapter(currentChIdx - 1));
  $('#btn-next-ch').addEventListener('click', () => renderChapter(currentChIdx + 1));
  $('#notes-filter').addEventListener('input', (e) => renderChapterNav(e.target.value));
  $('#btn-toggle-lab').addEventListener('click', () => {
    const drawer = $('#demo-lab-drawer');
    drawer.hidden = !drawer.hidden;
  });

  $('#demo-search-input').addEventListener('input', (e) => runDemoSearch(e.target.value));
  document.querySelectorAll('.demo-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q;
      $('#demo-search-input').value = q;
      runDemoSearch(q);
      sendTelemetry('demo_search', { query: q });
    });
  });

  // Agent & Editorial Acquisition Pulse Survey
  $('#form-postsurvey').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fb = $('#post-feedback');
    fb.style.color = 'var(--muted)';
    fb.textContent = 'Saving editorial pulse...';
    const hookScore = document.querySelector('input[name="post_hook"]:checked')?.value || '';
    const formatFit = document.querySelector('input[name="post_fit"]:checked')?.value || '';
    const nextStep = document.querySelector('input[name="post_next"]:checked')?.value || '';
    try {
      await api('api.php?action=post_survey', {
        method: 'POST',
        body: JSON.stringify({
          hook_score: hookScore,
          format_fit: formatFit,
          next_step: nextStep,
          note: $('#post-note').value.trim(),
        }),
      });
      fb.style.color = 'var(--ok-text)';
      fb.textContent = '✓ Acquisition & reader pulse saved. Thank you for reviewing Where\'s Norma?';
    } catch (err) {
      fb.style.color = 'var(--danger-text)';
      fb.textContent = err.message;
    }
  });

  $('#btn-bug-fab').addEventListener('click', () => { $('#bug-modal').hidden = false; });
  $('#bug-close').addEventListener('click', () => { $('#bug-modal').hidden = true; });
  $('#form-bug').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fb = $('#bug-feedback');
    fb.textContent = 'Sending...';
    try {
      await api('api.php?action=telemetry', {
        method: 'POST',
        body: JSON.stringify({
          event: 'bug_report',
          meta: { note: $('#bug-text').value.trim(), chapter: currentChIdx + 1 },
        }),
      });
      fb.style.color = 'var(--ok-text)';
      fb.textContent = '✓ Logged to /norma4/ telemetry.';
      $('#bug-text').value = '';
      setTimeout(() => { $('#bug-modal').hidden = true; fb.textContent = ''; }, 1200);
    } catch (err) {
      fb.style.color = 'var(--danger-text)';
      fb.textContent = err.message;
    }
  });

  api('api.php?action=session')
    .then((res) => {
      if (res.unlocked && res.trial) {
        enterUnlockedView(res);
      } else {
        sendTelemetry('page_view_gate');
      }
    })
    .catch(() => sendTelemetry('page_view_gate'));
})();
