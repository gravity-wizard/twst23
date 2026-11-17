let state = { contacts: [], derbies: [], triage: [] };
let activeContactId = null;
let serverStatus = { resendConfigured: false };

const $ = (sel) => document.querySelector(sel);

async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`Server returned non-JSON (${res.status} ${res.statusText}): ${text.slice(0, 160)}`);
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function stagePill(stage) {
  if (stage === 'Queued') return 'status-info';
  if (stage.startsWith('Sent') || stage === 'Featured' || stage === 'Replied') return 'status-ok';
  return 'status-muted';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMetrics() {
  const contacts = state.contacts;
  $('#m-total').textContent = contacts.length;
  $('#m-queued').textContent = contacts.filter((c) => c.stage === 'Queued').length;
  $('#m-sent').textContent = contacts.filter((c) => c.stage !== 'Queued').length;
  $('#m-derby').textContent = state.derbies.length;
  $('#m-triage').textContent = state.triage.filter((t) => t.status !== 'Resolved').length;
}

function renderContacts() {
  const q = $('#search-contacts').value.trim().toLowerCase();
  const stageFilter = $('#filter-stage').value;

  const filtered = state.contacts.filter((c) => {
    if (stageFilter !== 'all' && c.stage !== stageFilter) return false;
    if (!q) return true;
    return [c.outlet, c.primary_email, c.cc_email, c.angle, c.notes]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const tbody = $('#contacts-tbody');
  tbody.innerHTML = filtered
    .map(
      (c) => `
    <tr>
      <td><strong>${c.priority}</strong></td>
      <td>
        <span class="outlet-name">${escapeHtml(c.outlet)}</span>
        <span class="outlet-angle">${escapeHtml(c.angle)}</span>
      </td>
      <td class="email-cell">
        ${c.primary_email ? escapeHtml(c.primary_email) : '<span class="status-pill status-muted">Web Form</span>'}
        ${c.cc_email ? `<div class="cc-line">CC: ${escapeHtml(c.cc_email)}</div>` : ''}
        ${c.bcc_email ? `<div class="bcc-line" style="font-size:0.75rem;color:var(--text-muted);margin-top:2px;">BCC: ${escapeHtml(c.bcc_email)}</div>` : ''}
      </td>
      <td><span class="status-pill ${stagePill(c.stage)}">${escapeHtml(c.stage)}</span></td>
      <td><span class="status-pill status-muted">${escapeHtml(c.delivery_status)}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" type="button" data-open="${c.id}">Inspect / Edit</button>
      </td>
    </tr>
  `
    )
    .join('');

  tbody.querySelectorAll('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => openDrawer(btn.dataset.open));
  });
}

function renderDerbies() {
  const el = $('#derby-list');
  el.innerHTML = state.derbies
    .map(
      (d) => `
    <article class="info-card">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
        <span class="mono-tag">${escapeHtml(d.id)} &middot; ${escapeHtml(d.role)}</span>
        <span class="status-pill status-info">${escapeHtml(d.status)}</span>
      </div>
      <h3 style="margin-top:8px;">${escapeHtml(d.title)}</h3>
      <p><strong>Owner:</strong> ${escapeHtml(d.owner)} &middot; <strong>Target:</strong> ${escapeHtml(d.date || 'TBD')}</p>
      <p>${escapeHtml(d.notes)}</p>
    </article>
  `
    )
    .join('');
}

function renderTriage() {
  const el = $('#triage-list');
  el.innerHTML = state.triage
    .map(
      (t) => `
    <article class="info-card">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
        <span class="mono-tag">${escapeHtml(t.id)} &middot; ${escapeHtml(t.surface)}</span>
        <span class="status-pill ${t.status === 'Resolved' ? 'status-ok' : 'status-warn'}">${escapeHtml(t.severity)} &middot; ${escapeHtml(t.status)}</span>
      </div>
      <h3 style="margin-top:8px;">${escapeHtml(t.title)}</h3>
      <p>${escapeHtml(t.notes)}</p>
    </article>
  `
    )
    .join('');
}

function openDrawer(id) {
  const c = state.contacts.find((x) => x.id === id);
  if (!c) return;
  activeContactId = id;
  $('#drawer-id').textContent = `${c.id} · Priority #${c.priority}`;
  $('#drawer-title').textContent = c.outlet;
  $('#d-stage').value = c.stage;
  $('#d-cc').value = c.cc_email || '';
  $('#d-bcc').value = c.bcc_email || 'gary@gravitywizards.com';
  $('#d-subject').value = c.subject_line || '';
  $('#d-blurb').value = c.custom_blurb || '';
  $('#d-notes').value = c.notes || '';
  $('#drawer').classList.add('open');
  $('#drawer').setAttribute('aria-hidden', 'false');
}

function closeDrawer() {
  $('#drawer').classList.remove('open');
  $('#drawer').setAttribute('aria-hidden', 'true');
}

function showModal(title, html) {
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = html;
  $('#modal-backdrop').hidden = false;
}

async function runSendBatch(ids, dryRun) {
  try {
    const res = await api('api.php?action=send', {
      method: 'POST',
      body: JSON.stringify({ contactIds: ids, step: 1, dryRun }),
    });
    const html = res.results
      .map(
        (r) => `
      <div class="preview-block">
        <strong>${escapeHtml(r.outlet)}</strong> (${escapeHtml(r.status)})
        ${r.to ? `<div><code>To: ${escapeHtml(r.to)}</code> ${r.cc?.length ? `<code>CC: ${escapeHtml(r.cc.join(', '))}</code>` : ''} ${r.bcc?.length ? `<code>BCC: ${escapeHtml(r.bcc.join(', '))}</code>` : ''}</div>` : ''}
        ${r.subject ? `<div><strong>Subject:</strong> ${escapeHtml(r.subject)}</div>` : ''}
        ${r.preview ? `<pre>${escapeHtml(r.preview)}</pre>` : ''}
        ${r.error ? `<div class="status-pill status-warn">${escapeHtml(r.error)}</div>` : ''}
      </div>
    `
      )
      .join('');
    showModal(dryRun ? 'Dry-Run Email Preview' : 'Send Results', html || '<p>No eligible contacts.</p>');
    if (!dryRun) await refresh();
  } catch (err) {
    showModal('Error', `<p class="status-pill status-warn">${escapeHtml(err.message)}</p>`);
  }
}

async function refresh() {
  const [status, data] = await Promise.all([api('api.php?action=status'), api('api.php?action=state')]);
  serverStatus = status;
  state = data;
  const badge = $('#resend-badge');
  if (status.resendConfigured) {
    badge.textContent = 'Resend API Ready';
    badge.className = 'status-pill status-ok';
  } else {
    badge.textContent = 'Dry-Run Mode (Add RESEND_API_KEY in .env)';
    badge.className = 'status-pill status-warn';
  }
  renderMetrics();
  renderContacts();
  renderDerbies();
  renderTriage();
}

// Tabs
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.panel').forEach((p) => {
      p.classList.remove('active');
      p.hidden = true;
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    const panel = $(`#panel-${tab.dataset.tab}`);
    panel.classList.add('active');
    panel.hidden = false;
  });
});

$('#search-contacts').addEventListener('input', renderContacts);
$('#filter-stage').addEventListener('change', renderContacts);
$('#drawer-close').addEventListener('click', closeDrawer);
$('#modal-close').addEventListener('click', () => ($('#modal-backdrop').hidden = true));

function showDrawerNotice(msg, type = 'ok') {
  const el = $('#drawer-notice');
  if (!el) return;
  el.textContent = msg;
  el.className = `status-pill ${type === 'ok' ? 'status-ok' : 'status-warn'}`;
  el.style.display = 'block';
  setTimeout(() => {
    if (el) el.style.display = 'none';
  }, 4000);
}

async function handleSaveContact() {
  if (!activeContactId) return;
  const saveBtn = $('#d-save') || $('#drawer-form button[type="submit"]');
  const origText = saveBtn ? saveBtn.textContent : 'Save Changes';
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
  }
  try {
    const updated = await api(`api.php?action=contact&id=${encodeURIComponent(activeContactId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        stage: $('#d-stage').value,
        cc_email: $('#d-cc').value,
        bcc_email: $('#d-bcc').value,
        subject_line: $('#d-subject').value,
        custom_blurb: $('#d-blurb').value,
        notes: $('#d-notes').value,
      }),
    });
    const idx = state.contacts.findIndex((x) => x.id === activeContactId);
    if (idx !== -1) {
      state.contacts[idx] = { ...state.contacts[idx], ...updated };
    }
    renderMetrics();
    renderContacts();
    if (saveBtn) {
      saveBtn.textContent = '✓ Saved!';
    }
    showDrawerNotice('✓ Changes saved to CRM!', 'ok');
    setTimeout(() => {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = origText;
      }
    }, 1500);
  } catch (err) {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = origText;
    }
    showDrawerNotice(`Save failed: ${err.message}`, 'warn');
  }
}

async function markContactSentStep1(contactId, deliveryStatus = 'Sent Step 1') {
  try {
    const updated = await api(`api.php?action=contact&id=${encodeURIComponent(contactId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        stage: 'Sent Step 1',
        delivery_status: deliveryStatus,
        sent_at: new Date().toISOString(),
      }),
    });
    const idx = state.contacts.findIndex((x) => x.id === contactId);
    if (idx !== -1) {
      state.contacts[idx] = { ...state.contacts[idx], ...updated };
    }
    if (activeContactId === contactId) {
      $('#d-stage').value = 'Sent Step 1';
    }
    renderMetrics();
    renderContacts();
    showDrawerNotice('✓ Stage updated to Sent Step 1!', 'ok');
    return true;
  } catch (err) {
    showModal('Error', `<p class="status-pill status-warn">Failed to update stage: ${escapeHtml(err.message)}</p>`);
    return false;
  }
}

function openSendStep1Dispatcher(contactId) {
  const c = state.contacts.find((x) => x.id === contactId);
  if (!c) return;

  const to = c.primary_email || '';
  const cc = c.cc_email || '';
  const bcc = c.bcc_email || 'gary@gravitywizards.com';
  const subject = c.subject_line || 'Twisted23 & Flipping Dice';
  const blurb = c.custom_blurb || '';
  const signature = "\n\nBest,\nGary Stout\nTwisted23 & Gravity Wizards (Anchorage, AK)\nhttps://twisted23.com\nmedia@twisted23.com";
  const fullBody = blurb + signature;

  const mailtoParams = new URLSearchParams();
  if (cc) mailtoParams.set('cc', cc);
  if (bcc) mailtoParams.set('bcc', bcc);
  mailtoParams.set('subject', subject);
  mailtoParams.set('body', fullBody);
  const mailtoUrl = `mailto:${encodeURIComponent(to)}?${mailtoParams.toString()}`;

  const hasResend = !!serverStatus.resendConfigured;

  const modalHtml = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div>
        <div style="font-size:0.78rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Dispatch Step 1 Outreach</div>
        <h3 style="margin:4px 0 0;font-size:1.15rem;">${escapeHtml(c.outlet)}</h3>
      </div>

      <div style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:12px;font-size:0.83rem;display:flex;flex-direction:column;gap:5px;">
        <div><strong>To:</strong> <code>${escapeHtml(to || '(No email set)')}</code></div>
        ${cc ? `<div><strong>CC:</strong> <code>${escapeHtml(cc)}</code></div>` : ''}
        <div><strong>BCC:</strong> <code>${escapeHtml(bcc)}</code> <span style="color:var(--accent);font-size:0.75rem;font-weight:600;">(Spy Echo Active)</span></div>
        <div><strong>Subject:</strong> ${escapeHtml(subject)}</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <a id="btn-launch-mailto" href="${escapeHtml(mailtoUrl)}" class="btn btn-primary" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;">
            ✉ Launch in Mail App (Pre-filled with BCC) &amp; Mark Sent Step 1 ↗
          </a>
          <span style="font-size:0.76rem;color:var(--muted);">Opens your native Mac/iOS Mail client with To, CC, BCC, Subject &amp; Pitch ready to send.</span>
        </div>

        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px;">
          <button id="btn-copy-outreach" class="btn btn-secondary" type="button">
            📋 Copy Email to Clipboard
          </button>
          <button id="btn-mark-sent-only" class="btn btn-secondary" type="button">
            ✓ Mark Stage as "Sent Step 1"
          </button>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:6px;">
          ${hasResend ? `
            <button id="btn-dispatch-resend" class="btn btn-primary btn-sm" type="button">
              🚀 Dispatch via Resend Cloud API
            </button>
          ` : `
            <div style="font-size:0.78rem;color:var(--muted);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="status-pill status-warn" style="font-size:0.72rem;">Resend API Key Not Configured</span>
              <span>Use <strong>Launch in Mail App</strong> above to send directly with BCC.</span>
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  showModal('Send Step 1 — Outreach Dispatcher', modalHtml);

  const launchBtn = $('#btn-launch-mailto');
  if (launchBtn) {
    launchBtn.addEventListener('click', async () => {
      await markContactSentStep1(contactId, 'Sent (Mail App / iCloud)');
      setTimeout(() => { $('#modal-backdrop').hidden = true; }, 800);
    });
  }

  const copyBtn = $('#btn-copy-outreach');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const copyText = `To: ${to}\nCC: ${cc}\nBCC: ${bcc}\nSubject: ${subject}\n\n${fullBody}`;
      try {
        await navigator.clipboard.writeText(copyText);
        copyBtn.textContent = '✓ Copied to Clipboard!';
      } catch (e) {
        copyBtn.textContent = 'Copy failed';
      }
      setTimeout(() => { copyBtn.textContent = '📋 Copy Email to Clipboard'; }, 2000);
    });
  }

  const markBtn = $('#btn-mark-sent-only');
  if (markBtn) {
    markBtn.addEventListener('click', async () => {
      await markContactSentStep1(contactId, 'Sent Step 1 (Manual)');
      $('#modal-backdrop').hidden = true;
    });
  }

  const resendBtn = $('#btn-dispatch-resend');
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      $('#modal-backdrop').hidden = true;
      runSendBatch([contactId], false);
    });
  }
}

$('#drawer-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await handleSaveContact();
});

const saveBtnEl = $('#d-save');
if (saveBtnEl) {
  saveBtnEl.addEventListener('click', async (e) => {
    e.preventDefault();
    await handleSaveContact();
  });
}

$('#d-preview').addEventListener('click', () => {
  if (activeContactId) runSendBatch([activeContactId], true);
});

$('#d-send-one').addEventListener('click', () => {
  if (activeContactId) openSendStep1Dispatcher(activeContactId);
});

$('#btn-dry-run-2').addEventListener('click', () => {
  const next2 = state.contacts.filter((c) => c.stage === 'Queued' && c.primary_email).slice(0, 2).map((c) => c.id);
  runSendBatch(next2, true);
});

$('#btn-send-2').addEventListener('click', () => {
  const nextQueued = state.contacts.find((c) => c.stage === 'Queued' && c.primary_email);
  if (nextQueued) {
    openSendStep1Dispatcher(nextQueued.id);
  } else {
    showModal('Send Step 1', '<p class="status-pill status-info">No contacts currently queued for Step 1.</p>');
  }
});

$('#btn-add-contact').addEventListener('click', () => {
  showModal(
    'Add Outreach Contact',
    `<form id="quick-contact-form" class="drawer-body" style="padding:0;">
      <label class="field"><span>Outlet / Name</span><input id="nc-outlet" class="input" required /></label>
      <label class="field"><span>Primary Email</span><input id="nc-email" class="input" type="email" required /></label>
      <label class="field"><span>CC Email (optional)</span><input id="nc-cc" class="input" /></label>
      <label class="field"><span>BCC Email (optional)</span><input id="nc-bcc" class="input" value="gary@gravitywizards.com" /></label>
      <label class="field"><span>Subject Line</span><input id="nc-subject" class="input" /></label>
      <label class="field"><span>Custom Blurb</span><textarea id="nc-blurb" class="textarea" rows="4"></textarea></label>
      <button class="btn btn-primary" type="submit">Save Contact</button>
    </form>`
  );
  $('#quick-contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await api('api.php?action=contacts', {
      method: 'POST',
      body: JSON.stringify({
        outlet: $('#nc-outlet').value,
        primary_email: $('#nc-email').value,
        cc_email: $('#nc-cc').value,
        bcc_email: $('#nc-bcc').value,
        subject_line: $('#nc-subject').value,
        custom_blurb: $('#nc-blurb').value,
      }),
    });
    $('#modal-backdrop').hidden = true;
    await refresh();
  });
});

$('#btn-add-derby').addEventListener('click', () => {
  showModal(
    'Add Derby / Kit Ops Item',
    `<form id="quick-derby-form" class="drawer-body" style="padding:0;">
      <label class="field"><span>Title</span><input id="nd-title" class="input" required /></label>
      <label class="field"><span>Role</span><input id="nd-role" class="input" value="Derby Ops" /></label>
      <label class="field"><span>Owner</span><input id="nd-owner" class="input" value="Gary" /></label>
      <label class="field"><span>Notes</span><textarea id="nd-notes" class="textarea" rows="3"></textarea></label>
      <button class="btn btn-primary" type="submit">Add Derby Task</button>
    </form>`
  );
  $('#quick-derby-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await api('api.php?action=derbies', {
      method: 'POST',
      body: JSON.stringify({
        title: $('#nd-title').value,
        role: $('#nd-role').value,
        owner: $('#nd-owner').value,
        notes: $('#nd-notes').value,
      }),
    });
    $('#modal-backdrop').hidden = true;
    await refresh();
  });
});

$('#btn-add-triage').addEventListener('click', () => {
  showModal(
    'Log Puzzle / Site Issue',
    `<form id="quick-triage-form" class="drawer-body" style="padding:0;">
      <label class="field"><span>Surface (e.g. Tophat Sudoku)</span><input id="nt-surface" class="input" required /></label>
      <label class="field"><span>Issue Title</span><input id="nt-title" class="input" required /></label>
      <label class="field"><span>Severity</span><select id="nt-sev" class="select"><option>Low</option><option selected>Medium</option><option>High</option></select></label>
      <label class="field"><span>Notes</span><textarea id="nt-notes" class="textarea" rows="3"></textarea></label>
      <button class="btn btn-primary" type="submit">Log Issue</button>
    </form>`
  );
  $('#quick-triage-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await api('api.php?action=triage', {
      method: 'POST',
      body: JSON.stringify({
        surface: $('#nt-surface').value,
        title: $('#nt-title').value,
        severity: $('#nt-sev').value,
        notes: $('#nt-notes').value,
      }),
    });
    $('#modal-backdrop').hidden = true;
    await refresh();
  });
});

refresh();
