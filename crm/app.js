let state = { contacts: [], derbies: [], triage: [] };
let activeContactId = null;

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

$('#drawer-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!activeContactId) return;
  await api(`api.php?action=contact&id=${encodeURIComponent(activeContactId)}`, {
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
  await refresh();
  closeDrawer();
});

$('#d-preview').addEventListener('click', () => {
  if (activeContactId) runSendBatch([activeContactId], true);
});

$('#d-send-one').addEventListener('click', () => {
  if (activeContactId) runSendBatch([activeContactId], false);
});

$('#btn-dry-run-2').addEventListener('click', () => {
  const next2 = state.contacts.filter((c) => c.stage === 'Queued' && c.primary_email).slice(0, 2).map((c) => c.id);
  runSendBatch(next2, true);
});

$('#btn-send-2').addEventListener('click', () => {
  const next2 = state.contacts.filter((c) => c.stage === 'Queued' && c.primary_email).slice(0, 2).map((c) => c.id);
  runSendBatch(next2, false);
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
