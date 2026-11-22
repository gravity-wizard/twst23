(function () {
  'use strict';

  const E = window.AscensionEngine;
  if (!E) return;

  const $ = (sel) => document.querySelector(sel);

  const SAMPLES = {
    norma: {
      title: 'Friday Luncheon & Prefix Rescue',
      text: [
        '# Quick Luncheon Notes',
        '',
        'NormA picked the corner booth for Friday at 12:30.',
        'Later, Norm4 texted the updated parking garage code, while Norma4 saved the receipt under normal settings.',
        '',
        '> Even if a generic notes search buries "Norma" under four hundred Normal hits, case-sensitive search for `NormA` isolates only this first cue!',
        '',
        '- Verify Sar4h joined the lunch thread',
        '- Confirm Pet3 updated Acode9 Ab2p^a40z',
      ].join('\n'),
    },
    forum: {
      title: 'SLogBog & Swift 6 Build Log',
      text: [
        '# Ascension Notes Dual-Layer Sync Log',
        '',
        'Compiled Hydrogen4 engine parity across macOS Xcode and Python CLI.',
        'Search test verified: NormA maps cleanly to Norma in AXIF while protected tokens (Base38, SwiftUI, Time0) remain untouched.',
        '',
        '```',
        'Acode9: Ac3x^chch | Layer: dual | CaseSensitive: Aa ON',
        '```',
        '',
        '- Export cleanly to phpBB, XenForo, Reddit, and Retro Boards',
        '- Preserve exact line/column offsets across dual views',
      ].join('\n'),
    },
    editorial: {
      title: 'Editorial Companion Pitch Memo',
      text: [
        '# Why Everyday Note Search Fails Busy Humans',
        '',
        'Ask twenty readers to find "Norma" in ten thousand notes and half of them scroll past Normalized Budget and Normally Open Valves.',
        'NormA solves the collision silently during authoring while presenting spotless, publishable copy in Clean View.',
        '',
        '- Target Format: Illustrated Pocket Guide + Cross-Forum Web Companion',
        '- Platform Proof: Live Web Studio + Native Swift 6 + Python Package',
      ].join('\n'),
    },
    blank: {
      title: 'Untitled Ascension Note',
      text: 'Type here using subtle cues like NormA, Norm4, Sar4h, or Pet3—or add your own custom rule below.',
    },
  };

  let state = {
    acode9: E.generateAcode9(null, { mode: 'good1a' }),
    customRules: [],
    caseSensitive: true,
    wholeWord: false,
    regex: false,
    viewLayer: 'dual',
    activeFormat: 'phpbb',
    balancePreview: true,
    currentDoc: null,
  };

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function highlightBySpans(text, spans, munscSpans = []) {
    const events = [];
    for (const s of spans) {
      if (s.end > s.start) events.push({ start: s.start, end: s.end, kind: 'hit' });
    }
    for (const m of munscSpans) {
      if (m.end > m.start) events.push({ start: m.start, end: m.end, kind: 'munsc' });
    }
    if (!events.length) return escapeHtml(text);

    // Prioritize search hits without overlapping breaks by slicing character flags
    const flags = new Array(text.length).fill(0); // 1=munsc, 2=hit
    for (const ev of events) {
      const val = ev.kind === 'hit' ? 2 : 1;
      for (let i = Math.max(0, ev.start); i < Math.min(text.length, ev.end); i += 1) {
        if (val > flags[i]) flags[i] = val;
      }
    }

    let html = '';
    let idx = 0;
    while (idx < text.length) {
      const f = flags[idx];
      let end = idx + 1;
      while (end < text.length && flags[end] === f) end += 1;
      const slice = escapeHtml(text.slice(idx, end));
      if (f === 2) {
        html += `<mark class="search-hit">${slice}</mark>`;
      } else if (f === 1) {
        html += `<mark class="munsc-cue">${slice}</mark>`;
      } else {
        html += slice;
      }
      idx = end;
    }
    return html;
  }

  function renderCustomRules() {
    const wrap = $('#custom-rules-list');
    if (!state.customRules.length) {
      wrap.innerHTML = '<span style="color:var(--ink-soft);">Built-in cues active: NormA, Norm4, Norma4 + auto-detect (Sar4h, Pet3, TestA).</span>';
      return;
    }
    wrap.innerHTML = state.customRules.map((r, i) => `
      <span class="match-chip">
        <code>${escapeHtml(r.pattern)}</code> &rarr; <code>${escapeHtml(r.replacement)}</code>${r.isRegex ? ' (regex)' : ''}
        <button type="button" data-del-rule="${i}" style="border:none;background:none;color:var(--accent);cursor:pointer;font-weight:700;margin-left:4px;" aria-label="Remove rule">&times;</button>
      </span>
    `).join('');

    wrap.querySelectorAll('[data-del-rule]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.customRules.splice(Number(btn.dataset.delRule), 1);
        recomputeAll();
      });
    });
  }

  function renderFormatTabs() {
    const wrap = $('#format-tabs');
    wrap.innerHTML = E.FORUM_FORMATS.map((f) => `
      <button type="button" class="format-tab ${f.id === state.activeFormat ? 'active' : ''}" data-fmt="${f.id}" role="tab" aria-selected="${f.id === state.activeFormat}">
        ${escapeHtml(f.name)}
      </button>
    `).join('');
    wrap.querySelectorAll('.format-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.activeFormat = btn.dataset.fmt;
        renderFormatTabs();
        renderExportPreview();
      });
    });
  }

  function renderExportPreview() {
    if (!state.currentDoc) return;
    const title = $('#note-title-input').value.trim() || 'Ascension Note';
    const layer = $('#export-layer').value;
    const includeFooter = $('#chk-export-footer').checked;
    const balanceLines = $('#chk-export-balance').checked;

    const output = E.exportForForum(state.currentDoc, {
      format: state.activeFormat,
      title,
      layer,
      includeFooter,
      balanceLines,
      sourceUrl: 'https://twisted23.com/ascension/',
    });
    $('#export-preview').textContent = output;
    $('#export-char-count').textContent = `${output.length.toLocaleString()} chars · ${output.split('\n').length} lines`;
  }

  async function refreshAsyncHashes(doc) {
    try {
      const [rawHash, normHash] = await Promise.all([
        E.sha256Hex(doc.rawText),
        E.sha256Hex(doc.normalizedText),
      ]);
      if (state.currentDoc === doc) {
        doc.axif.raw_sha256 = rawHash;
        doc.axif.normalized_sha256 = normHash;
        $('#raw-sha-badge').textContent = `sha256:${rawHash.slice(0, 10)}…`;
        $('#norm-sha-badge').textContent = `sha256:${normHash.slice(0, 10)}…`;
        if (state.activeFormat === 'axif_json') {
          renderExportPreview();
        }
      }
    } catch (_) {}
  }

  function recomputeAll() {
    const rawText = $('#raw-editor').value;
    const autoDetect = $('#chk-auto-detect').checked;

    const doc = E.compileAXIF(rawText, {
      ownerAcode9: state.acode9,
      rules: state.customRules,
      autoDetect,
    });
    state.currentDoc = doc;

    const query = $('#search-query').value;
    const searchRes = E.searchNote(doc, query, {
      caseSensitive: state.caseSensitive,
      wholeWord: state.wholeWord,
      regex: state.regex,
      viewLayer: state.viewLayer,
    });

    const rawHitSpans = searchRes.matches.map((m) => ({ start: m.rawOffset, end: m.rawEnd }));
    const normHitSpans = searchRes.matches.map((m) => ({ start: m.normalizedOffset, end: m.normalizedEnd }));
    const rawMunscSpans = doc.entries.map((e) => ({ start: e.offset, end: e.offset + e.length }));
    const normMunscSpans = doc.entries.map((e) => ({ start: e.normalized_offset, end: e.normalized_offset + e.normalized_length }));

    $('#raw-highlight-view').innerHTML = highlightBySpans(doc.rawText, rawHitSpans, rawMunscSpans);

    const normDisplayText = state.balancePreview ? E.applyLineBalance(doc.normalizedText, true) : doc.normalizedText;
    // Highlight spans map cleanly on exact normalizedText when line-balance wraps spaces -> use un-wrapped spans when equal length
    const canMapNormSpans = normDisplayText.length === doc.normalizedText.length;
    $('#normalized-highlight-view').innerHTML = canMapNormSpans
      ? highlightBySpans(normDisplayText, normHitSpans, normMunscSpans)
      : highlightBySpans(doc.normalizedText, normHitSpans, normMunscSpans);

    // Search summary & match chips
    const summaryEl = $('#search-summary');
    if (searchRes.error) {
      summaryEl.textContent = `Regex error: ${searchRes.error}`;
      summaryEl.style.color = '#b91c1c';
    } else if (!query) {
      summaryEl.textContent = 'Type a query above to test case-sensitive dual-layer retrieval';
      summaryEl.style.color = 'var(--ink-muted)';
    } else {
      summaryEl.textContent = `${searchRes.matches.length} match${searchRes.matches.length === 1 ? '' : 'es'} (${state.caseSensitive ? 'Aa' : 'any-case'}, layer=${state.viewLayer})`;
      summaryEl.style.color = 'var(--ok)';
    }

    const chipsEl = $('#match-chips');
    if (!searchRes.matches.length) {
      chipsEl.innerHTML = '<span style="font-size:0.8rem;color:var(--ink-soft);">No active search matches.</span>';
    } else {
      chipsEl.innerHTML = searchRes.matches.map((m) => `
        <span class="match-chip">
          L${m.line}:C${m.column} · <strong>${escapeHtml(m.matchedText)}</strong> [${escapeHtml(m.layer)}]
          ${m.axifEntry ? ` &middot; raw=<code>${escapeHtml(m.axifEntry.token)}</code> (${escapeHtml(m.axifEntry.munsc_rule)})` : ''}
        </span>
      `).join('');
    }

    // AXIF metadata table
    $('#axif-count-label').textContent = String(doc.entries.length);
    if (!doc.entries.length) {
      $('#axif-table-wrap').textContent = 'No MUNSC cues detected in current draft.';
    } else {
      $('#axif-table-wrap').textContent = doc.entries.map((e, i) =>
        `#${i + 1} (${e.token} -> ${e.normalized_form}, raw@${e.offset}, ${e.acode9}, ${e.munsc_rule})`
      ).join('\n');
    }

    renderCustomRules();
    renderExportPreview();
    refreshAsyncHashes(doc);
  }

  function loadSample(key) {
    const s = SAMPLES[key] || SAMPLES.norma;
    $('#note-title-input').value = s.title;
    $('#raw-editor').value = s.text;
    document.querySelectorAll('.sample-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.sample === key);
    });
    recomputeAll();
  }

  // Event Wiring
  document.querySelectorAll('.sample-btn').forEach((btn) => {
    btn.addEventListener('click', () => loadSample(btn.dataset.sample));
  });

  $('#raw-editor').addEventListener('input', recomputeAll);
  $('#note-title-input').addEventListener('input', renderExportPreview);
  $('#chk-auto-detect').addEventListener('change', recomputeAll);
  $('#search-query').addEventListener('input', recomputeAll);
  $('#search-layer').addEventListener('change', (e) => {
    state.viewLayer = e.target.value;
    recomputeAll();
  });

  $('#flag-case').addEventListener('click', (e) => {
    state.caseSensitive = !state.caseSensitive;
    e.currentTarget.classList.toggle('active', state.caseSensitive);
    e.currentTarget.setAttribute('aria-pressed', String(state.caseSensitive));
    recomputeAll();
  });

  $('#flag-word').addEventListener('click', (e) => {
    state.wholeWord = !state.wholeWord;
    e.currentTarget.classList.toggle('active', state.wholeWord);
    e.currentTarget.setAttribute('aria-pressed', String(state.wholeWord));
    recomputeAll();
  });

  $('#flag-regex').addEventListener('click', (e) => {
    state.regex = !state.regex;
    e.currentTarget.classList.toggle('active', state.regex);
    e.currentTarget.setAttribute('aria-pressed', String(state.regex));
    recomputeAll();
  });

  document.querySelectorAll('.search-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      $('#search-query').value = btn.dataset.q;
      state.caseSensitive = btn.dataset.cs === '1';
      state.wholeWord = btn.dataset.ww === '1';
      state.regex = btn.dataset.rx === '1';
      $('#flag-case').classList.toggle('active', state.caseSensitive);
      $('#flag-word').classList.toggle('active', state.wholeWord);
      $('#flag-regex').classList.toggle('active', state.regex);
      recomputeAll();
    });
  });

  $('#btn-balance-preview').addEventListener('click', (e) => {
    state.balancePreview = !state.balancePreview;
    e.currentTarget.classList.toggle('active', state.balancePreview);
    e.currentTarget.textContent = state.balancePreview ? 'Line Balance: ON' : 'Line Balance: OFF';
    recomputeAll();
  });

  $('#btn-toggle-dash').addEventListener('click', () => {
    state.acode9 = state.acode9[4] === '^' ? E.toDash(state.acode9) : E.toCaret(state.acode9);
    $('#active-acode9').textContent = state.acode9;
    recomputeAll();
  });

  $('#btn-mint-acode9').addEventListener('click', () => {
    const urlSafe = state.acode9[4] === '-';
    state.acode9 = E.generateAcode9(null, { mode: 'good1a', urlSafe });
    $('#active-acode9').textContent = state.acode9;
    recomputeAll();
  });

  $('#btn-add-rule').addEventListener('click', () => {
    const pat = $('#rule-pattern').value.trim();
    const rep = $('#rule-replacement').value.trim();
    const isRegex = $('#rule-regex').checked;
    if (!pat || !rep) return;
    state.customRules.push({
      name: `custom_${pat.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'rule'}`,
      pattern: pat,
      replacement: rep,
      isRegex,
      description: `Custom cue ${pat} -> ${rep}`,
    });
    $('#rule-pattern').value = '';
    $('#rule-replacement').value = '';
    $('#rule-regex').checked = false;
    recomputeAll();
  });

  $('#export-layer').addEventListener('change', renderExportPreview);
  $('#chk-export-footer').addEventListener('change', renderExportPreview);
  $('#chk-export-balance').addEventListener('change', renderExportPreview);

  $('#btn-copy-export').addEventListener('click', async () => {
    const txt = $('#export-preview').textContent || '';
    try {
      await navigator.clipboard.writeText(txt);
      $('#copy-feedback').textContent = 'Copied!';
      setTimeout(() => { $('#copy-feedback').textContent = ''; }, 1800);
    } catch (_) {
      $('#copy-feedback').textContent = 'Select & copy manually';
    }
  });

  $('#btn-download-export').addEventListener('click', () => {
    const fmt = E.FORUM_FORMATS.find((f) => f.id === state.activeFormat) || E.FORUM_FORMATS[0];
    const txt = $('#export-preview').textContent || '';
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${E.toDash(state.acode9)}.${fmt.ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // Theme Toggle
  const themeBtn = $('#btn-theme-toggle');
  function setTheme(dark) {
    document.body.classList.toggle('theme-dark', dark);
    themeBtn.textContent = dark ? 'Daylight Paper' : 'Midnight Studio';
  }
  try {
    setTheme(localStorage.getItem('ascension_web_theme') === 'dark');
  } catch (_) {
    setTheme(false);
  }
  themeBtn.addEventListener('click', () => {
    const dark = !document.body.classList.contains('theme-dark');
    setTheme(dark);
    try { localStorage.setItem('ascension_web_theme', dark ? 'dark' : 'light'); } catch (_) {}
  });

  // Built-In Browser Self-Test Runner
  $('#btn-run-selftest').addEventListener('click', () => {
    const outEl = $('#selftest-output');
    const badgeEl = $('#selftest-status-badge');
    const checks = [];

    const check = (name, cond) => {
      if (!cond) throw new Error(`Failed check: ${name}`);
      checks.push(`✓ ${name}`);
    };

    try {
      const ts = Math.floor(Date.parse('2026-11-20T19:12:31Z') / 1000);
      check('Base38 Jesus Clock 2026-11-20 == 2p15ek', E.jesusClock(ts) === '2p15ek');
      check('Acode9 validation + toDash/toCaret', E.validateAcode9('Ab2p^a40z').valid && E.toDash('Ab2p^a40z') === 'Ab2p-a40z');
      const d = E.compileAXIF('NormA met Norm4 and Hydrogen4', { ownerAcode9: 'Ab2p^a40z', timestamp: ts });
      check('MUNSC normalization + protected Hydrogen4', d.normalizedText === 'Norma met Norma and Hydrogen4');
      const sAa = E.searchNote(d, 'NormA', { caseSensitive: true, viewLayer: 'dual' });
      check('Xcode Aa search isolates exact NormA', sAa.matches.length === 1 && sAa.matches[0].matchedText === 'NormA');
      const sRx = E.searchNote(d, 'Norm[A4]', { caseSensitive: true, regex: true, viewLayer: 'raw' });
      check('Regex Norm[A4] hits both raw cues', sRx.matches.length === 2);
      E.FORUM_FORMATS.forEach((f) => {
        const exp = E.exportForForum(d, { format: f.id, title: 'QA', layer: 'normalized' });
        check(`Forum exporter [${f.id}] non-empty`, typeof exp === 'string' && exp.length > 20);
      });

      outEl.hidden = false;
      outEl.textContent = `BROWSER SELF-TEST PASSED (${checks.length}/${checks.length}): ` + checks.join('  |  ');
      badgeEl.textContent = `${checks.length}/${checks.length} Verified`;
      badgeEl.style.color = 'var(--ok)';
    } catch (err) {
      outEl.hidden = false;
      outEl.style.color = '#b91c1c';
      outEl.textContent = err.message;
      badgeEl.textContent = 'Failed';
    }
  });

  // Live Base-38 Clock Ticker
  function updateClock() {
    $('#live-jesus-clock').textContent = E.jesusClock();
  }
  updateClock();
  setInterval(updateClock, 1000);

  // Boot
  $('#active-acode9').textContent = state.acode9;
  renderFormatTabs();
  loadSample('norma');
})();
