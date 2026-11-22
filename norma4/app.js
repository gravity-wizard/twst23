(function () {
  const $ = (sel) => document.querySelector(sel);
  let trialData = null;
  let currentChIdx = 0;

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

  // Automatic JS & promise error telemetry
  window.addEventListener('error', (ev) => {
    sendTelemetry('client_error', { msg: ev.message || 'error', line: ev.lineno || 0 });
  });
  window.addEventListener('unhandledrejection', (ev) => {
    sendTelemetry('client_error', { msg: String(ev.reason || 'rejection') });
  });

  // Minimal safe markdown renderer for unlocked manuscript chapters
  function renderMarkdown(md) {
    const lines = String(md || '').split('\n');
    const html = [];
    let inList = false;
    let inTable = false;
    let tableHeaderDone = false;

    function inlineFmt(text) {
      let out = escapeHtml(text);
      out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
      out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      return out;
    }

    function closeBlocks() {
      if (inList) { html.push('</ul>'); inList = false; }
      if (inTable) { html.push('</tbody></table>'); inTable = false; tableHeaderDone = false; }
    }

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const trimmed = line.trim();

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
        if (cells.every((c) => /^[:\-\s]+$/.test(c))) {
          tableHeaderDone = true;
          continue;
        }
        if (!inTable) {
          inTable = true;
          html.push('<table><thead><tr>' + cells.map((c) => `<th>${inlineFmt(c)}</th>`).join('') + '</tr></thead><tbody>');
          continue;
        }
        html.push('<tr>' + cells.map((c) => `<td>${inlineFmt(c)}</td>`).join('') + '</tr>');
        continue;
      }
      if (inTable) { html.push('</tbody></table>'); inTable = false; tableHeaderDone = false; }

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

  function renderChapter(idx) {
    if (!trialData || !trialData.chapters || !trialData.chapters.length) return;
    currentChIdx = Math.max(0, Math.min(idx, trialData.chapters.length - 1));
    const ch = trialData.chapters[currentChIdx];
    $('#active-chapter-tag').textContent = `Section ${currentChIdx + 1} of ${trialData.chapters.length}`;
    $('#active-chapter-title').textContent = ch.title;
    $('#active-chapter-body').innerHTML = renderMarkdown(ch.markdown);

    document.querySelectorAll('.chapter-link').forEach((btn, i) => {
      btn.classList.toggle('active', i === currentChIdx);
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
      ? `🛡️ Editorial Trial (${payload.prefix_hint || 'e-tier'}) · NDA ✓`
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

    const nav = $('#chapter-nav');
    nav.innerHTML = (trialData.chapters || []).map((ch, i) => `
      <button type="button" class="chapter-link ${i === 0 ? 'active' : ''}" data-ch-idx="${i}">
        ${escapeHtml(ch.title)}
      </button>
    `).join('');
    nav.querySelectorAll('.chapter-link').forEach((b) => {
      b.addEventListener('click', () => renderChapter(Number(b.dataset.chIdx)));
    });

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
    $('#panel-aaid').hidden = !isAaid;
    $('#panel-presurvey').hidden = isAaid;
  }
  tabAaid.addEventListener('click', () => switchGateTab('aaid'));
  tabPre.addEventListener('click', () => switchGateTab('presurvey'));

  // Auto-fill AAid if passed via ?aaid= link (still requires user to check NDA!)
  const urlAaid = new URLSearchParams(window.location.search).get('aaid');
  if (urlAaid) {
    $('#input-aaid').value = urlAaid.trim();
  }

  // Form 1: AAid Password + NDA Unlock
  $('#form-unlock').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fb = $('#unlock-feedback');
    fb.style.color = 'var(--muted)';
    fb.textContent = 'Verifying AAid & NDA...';
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

  // Form 2: Pre-Trial Survey -> Mints Reader AAid + Unlocks
  $('#form-presurvey').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fb = $('#survey-unlock-feedback');
    fb.style.color = 'var(--muted)';
    fb.textContent = 'Minting your Reader AAid & logging NDA...';
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

  // Balanced Line-Length Equalizer Toggle (Botchee4x4)
  let balancedOn = true;
  $('#btn-equalize').addEventListener('click', () => {
    balancedOn = !balancedOn;
    document.body.classList.toggle('balanced-prose', balancedOn);
    $('#btn-equalize').textContent = balancedOn ? '⚖️ Balanced Lines: ON' : '⚖️ Balanced Lines: OFF';
    sendTelemetry('equalizer_toggle', { enabled: balancedOn });
  });

  // Lock Session
  $('#btn-lock').addEventListener('click', async () => {
    await api('api.php?action=logout', { method: 'POST' }).catch(() => {});
    window.location.reload();
  });

  // Chapter Prev / Next
  $('#btn-prev-ch').addEventListener('click', () => renderChapter(currentChIdx - 1));
  $('#btn-next-ch').addEventListener('click', () => renderChapter(currentChIdx + 1));

  // Demo Search Listeners
  $('#demo-search-input').addEventListener('input', (e) => {
    runDemoSearch(e.target.value);
  });
  document.querySelectorAll('.demo-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.q;
      $('#demo-search-input').value = q;
      runDemoSearch(q);
      sendTelemetry('demo_search', { query: q });
    });
  });

  // Post-Read Pulse Survey
  $('#form-postsurvey').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fb = $('#post-feedback');
    fb.style.color = 'var(--muted)';
    fb.textContent = 'Saving feedback...';
    const wouldUse = document.querySelector('input[name="post_use"]:checked')?.value || '';
    const fav = document.querySelector('input[name="post_fav"]:checked')?.value || '';
    const fit = document.querySelector('input[name="post_fit"]:checked')?.value || '';
    try {
      await api('api.php?action=post_survey', {
        method: 'POST',
        body: JSON.stringify({
          would_use: wouldUse,
          favorite_hook: fav,
          format_fit: fit,
          note: $('#post-note').value.trim(),
        }),
      });
      fb.style.color = 'var(--ok-text)';
      fb.textContent = '✓ Feedback saved! Thank you for reviewing this pre-publication trial.';
    } catch (err) {
      fb.style.color = 'var(--danger-text)';
      fb.textContent = err.message;
    }
  });

  // Bug / Improvement Telemetry Modal
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

  // Check existing unlocked session on load
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
