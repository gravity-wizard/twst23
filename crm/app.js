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
  if (stage === 'Queued') return 'status-warn';
  if (stage === 'Auto-Acknowledged') return 'status-purple';
  if (stage === 'Received Reply' || stage === 'Replied' || stage === 'Featured') return 'status-ok';
  if (stage === 'Bounced' || stage === 'Dropped') return 'status-danger';
  if (stage && stage.startsWith('Sent')) return 'status-info';
  return 'status-muted';
}

function deliveryPill(status) {
  if (!status || status === 'Not Sent') return 'status-muted';
  if (status === 'Auto-Acknowledged') return 'status-purple';
  if (status === 'Human Replied' || status === 'Replied') return 'status-ok';
  if (status.includes('Bounce') || status.includes('Rejected') || status.includes('Dropped')) return 'status-danger';
  if (status.includes('Sent')) return 'status-info';
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
  $('#m-sent').textContent = contacts.filter((c) => c.stage && c.stage.startsWith('Sent')).length;
  const autoEl = $('#m-auto');
  if (autoEl) autoEl.textContent = contacts.filter((c) => c.stage === 'Auto-Acknowledged' || c.auto_acknowledged).length;
  const humanEl = $('#m-human');
  if (humanEl) humanEl.textContent = contacts.filter((c) => c.stage === 'Received Reply' || c.delivery_status === 'Human Replied').length;
  const triageEl = $('#m-triage');
  if (triageEl) triageEl.textContent = state.triage.filter((t) => t.status !== 'Resolved').length;
  const bounceEl = $('#m-bounced');
  if (bounceEl) bounceEl.textContent = contacts.filter((c) => c.stage === 'Bounced' || (c.delivery_status && c.delivery_status.includes('Bounce'))).length;
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
      <td><span class="status-pill ${stagePill(c.stage)}">${c.stage === 'Auto-Acknowledged' ? '🤖 ' : (c.stage === 'Received Reply' ? '💬 ' : '')}${escapeHtml(c.stage)}</span></td>
      <td><span class="status-pill ${deliveryPill(c.delivery_status)}">${escapeHtml(c.delivery_status)}</span></td>
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
  const emailInput = $('#d-email');
  if (emailInput) emailInput.value = c.primary_email || '';
  $('#d-cc').value = c.cc_email || '';
  $('#d-bcc').value = c.bcc_email || 'gary@gravitywizards.com, botchee@icloud.com';
  $('#d-subject').value = c.subject_line || '';
  $('#d-blurb').value = c.custom_blurb || '';
  $('#d-notes').value = c.notes || '';

  // Render Inbound Reply / Auto-Ack Card
  const replyCard = $('#drawer-reply-card');
  const lastReply = c.last_reply;
  if (replyCard) {
    if (lastReply && (lastReply.snippet || lastReply.body)) {
      const isAuto = lastReply.type === 'auto';
      replyCard.className = `reply-card ${isAuto ? 'auto' : 'human'}`;
      const pill = $('#drawer-reply-pill');
      if (pill) {
        pill.className = `status-pill ${isAuto ? 'status-purple' : 'status-ok'}`;
        pill.textContent = isAuto ? '🤖 Auto-Acknowledged' : '💬 Human Reply';
      }

      const dateStr = lastReply.received_at ? new Date(lastReply.received_at).toLocaleString() : '';
      const dateEl = $('#drawer-reply-date');
      if (dateEl) dateEl.textContent = dateStr;

      const fromDisp = lastReply.from_name ? `${escapeHtml(lastReply.from_name)} &lt;${escapeHtml(lastReply.from)}&gt;` : escapeHtml(lastReply.from || '');
      const metaEl = $('#drawer-reply-meta');
      if (metaEl) {
        metaEl.innerHTML = `<strong>From:</strong> ${fromDisp}<br/><strong>Subject:</strong> ${escapeHtml(lastReply.subject || '')}${lastReply.reason ? `<br/><span style="font-size:0.75rem;color:var(--muted);">(Detected via: ${escapeHtml(lastReply.reason)})</span>` : ''}`;
      }

      const bodyEl = $('#drawer-reply-body');
      if (bodyEl) bodyEl.textContent = lastReply.snippet || lastReply.body || '';

      const toggleBtn = $('#btn-toggle-reply-type');
      if (toggleBtn) {
        toggleBtn.textContent = isAuto ? 'Mark Human' : 'Mark Auto-Ack';
        toggleBtn.title = isAuto ? 'Reclassify as genuine human reply' : 'Reclassify as automated bot receipt';
      }

      replyCard.style.display = 'block';
    } else {
      replyCard.style.display = 'none';
    }
  }

  // Adjust Send Step 1 / Step 2 buttons
  const step1Btn = $('#d-send-one');
  const step2Btn = $('#d-send-step2');
  if (step1Btn && step2Btn) {
    if (c.stage === 'Queued' || c.stage === 'Bounced') {
      step1Btn.style.display = 'inline-block';
      step1Btn.textContent = c.stage === 'Bounced' ? 'Re-send Step 1 (Updated Email)' : 'Send Step 1';
      step2Btn.style.display = 'none';
    } else {
      step1Btn.style.display = 'none';
      step2Btn.style.display = 'inline-block';
      step2Btn.textContent = c.step_2_sent_at ? '✓ Step 2 Sent (Resend)' : 'Send Step 2 Follow-Up';
    }
  }

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

async function runSendBatch(ids, dryRun, step = 1) {
  try {
    const res = await api('api.php?action=send', {
      method: 'POST',
      body: JSON.stringify({ contactIds: ids, step, dryRun }),
    });
    const html = res.results
      .map(
        (r) => `
      <div class="preview-block">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong>${escapeHtml(r.outlet)}</strong>
          <span class="status-pill ${r.status === 'sent' ? 'status-ok' : (r.status === 'dry_run' ? 'status-info' : 'status-warn')}">
            ${r.status === 'sent' ? '✓ Dispatched (Hostinger Mail API)' : escapeHtml(r.status)}
          </span>
        </div>
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
    const payload = {
      stage: $('#d-stage').value,
      cc_email: $('#d-cc').value,
      bcc_email: $('#d-bcc').value,
      subject_line: $('#d-subject').value,
      custom_blurb: $('#d-blurb').value,
      notes: $('#d-notes').value,
    };
    const emailInput = $('#d-email');
    if (emailInput) payload.primary_email = emailInput.value.trim().toLowerCase();

    const updated = await api(`api.php?action=contact&id=${encodeURIComponent(activeContactId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
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
  const bcc = c.bcc_email || 'gary@gravitywizards.com, botchee@icloud.com';
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

  const hasHostingerMail = !!serverStatus.hostingerMailConfigured;
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

        <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:6px;display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button id="btn-dispatch-server" class="btn btn-primary btn-sm" type="button">
              ${hasHostingerMail ? '🚀 Dispatch via Hostinger Mail API (DKIM Verified)' : (hasResend ? '🚀 Dispatch via Resend Cloud API' : '🚀 Dispatch via Server Mail (with BCC Echo)')}
            </button>
            <button id="btn-echo-bcc-now" class="btn btn-secondary btn-sm" type="button">
              ✉ Send BCC Echo to iCloud Now
            </button>
          </div>
          ${hasHostingerMail ? `
            <div style="font-size:0.76rem;color:var(--accent);display:flex;align-items:center;gap:6px;">
              <span>✓ Hostinger Agentic Mail API active (authenticated from media@twisted23.com with DKIM)</span>
            </div>
          ` : ''}
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

  const serverDispatchBtn = $('#btn-dispatch-server');
  if (serverDispatchBtn) {
    serverDispatchBtn.addEventListener('click', async () => {
      $('#modal-backdrop').hidden = true;
      runSendBatch([contactId], false);
    });
  }

  const echoBccBtn = $('#btn-echo-bcc-now');
  if (echoBccBtn) {
    echoBccBtn.addEventListener('click', async () => {
      echoBccBtn.disabled = true;
      echoBccBtn.textContent = 'Dispatching Echo...';
      try {
        await api('api.php?action=echo_bcc', {
          method: 'POST',
          body: JSON.stringify({ id: contactId, targets: ['botchee@icloud.com', 'gary@gravitywizards.com'] }),
        });
        echoBccBtn.textContent = '✓ Echo Dispatched!';
        showDrawerNotice('✓ BCC copy sent to botchee@icloud.com & gary@gravitywizards.com', 'ok');
      } catch (err) {
        echoBccBtn.disabled = false;
        echoBccBtn.textContent = 'Echo failed: ' + err.message;
      }
    });
  }
}

function openSendStep2Dispatcher(contactId) {
  const c = state.contacts.find((x) => x.id === contactId);
  if (!c) return;

  const to = c.primary_email || '';
  const cc = c.cc_email || '';
  const bcc = c.bcc_email || 'gary@gravitywizards.com, botchee@icloud.com';
  const origSubject = c.subject_line || 'Twisted23 & Flipping Dice';
  const subject = origSubject.toLowerCase().startsWith('re:') ? origSubject : `Re: ${origSubject}`;
  const signature = "\n\nBest,\nGary Stout\nTwisted23 & Gravity Wizards (Anchorage, AK)\nhttps://twisted23.com\nmedia@twisted23.com";
  const followUpText = "Just a quick follow-up in case my note earlier this week got buried.\n\nIf you have 2 minutes to try it right in your browser, you can jump straight into Tophat Sudoku and the Flipping Dice 3D-in-2D Spatial Lab here:\nhttps://twisted23.com\nhttps://flippingdice.twisted23.com\n\nHappy to share a quick walkthrough or any technical notes if this fits what you're covering." + signature;

  const mailtoParams = new URLSearchParams();
  if (cc) mailtoParams.set('cc', cc);
  if (bcc) mailtoParams.set('bcc', bcc);
  mailtoParams.set('subject', subject);
  mailtoParams.set('body', followUpText);
  const mailtoUrl = `mailto:${encodeURIComponent(to)}?${mailtoParams.toString()}`;

  const hasHostingerMail = !!serverStatus.hostingerMailConfigured;

  const modalHtml = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div>
        <div style="font-size:0.78rem;color:#0284c7;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Dispatch Step 2 Follow-Up (Day 3-5 Cadence)</div>
        <h3 style="margin:4px 0 0;font-size:1.15rem;">${escapeHtml(c.outlet)}</h3>
      </div>

      <div style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:12px;font-size:0.83rem;display:flex;flex-direction:column;gap:5px;">
        <div><strong>To:</strong> <code>${escapeHtml(to || '(No email set)')}</code></div>
        ${cc ? `<div><strong>CC:</strong> <code>${escapeHtml(cc)}</code></div>` : ''}
        <div><strong>BCC:</strong> <code>${escapeHtml(bcc)}</code> <span style="color:var(--accent);font-size:0.75rem;font-weight:600;">(Spy Echo Active)</span></div>
        <div><strong>Subject:</strong> ${escapeHtml(subject)}</div>
        ${c.auto_acknowledged ? `<div style="color:#7e22ce;font-weight:600;font-size:0.75rem;margin-top:2px;">🤖 Note: Automated receipt previously confirmed. Sending polite editorial follow-up.</div>` : ''}
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <a id="btn-launch-mailto-step2" href="${escapeHtml(mailtoUrl)}" class="btn btn-primary" style="background:#0284c7;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;">
            ✉ Launch in Mail App (Pre-filled with BCC) &amp; Mark Sent Step 2 ↗
          </a>
          <span style="font-size:0.76rem;color:var(--muted);">Opens Apple Mail with Step 2 follow-up text, BCC, and links ready to send.</span>
        </div>

        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px;">
          <button id="btn-copy-step2" class="btn btn-secondary" type="button">
            📋 Copy Follow-Up to Clipboard
          </button>
          <button id="btn-mark-sent2-only" class="btn btn-secondary" type="button">
            ✓ Mark Stage as "Sent Step 2"
          </button>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:6px;display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button id="btn-dispatch-server-step2" class="btn btn-primary btn-sm" type="button" style="background:#0284c7;">
              ${hasHostingerMail ? '🚀 Dispatch Step 2 via Hostinger Mail API' : '🚀 Dispatch Step 2 via Server'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  showModal('Send Step 2 — Editorial Follow-Up Dispatcher', modalHtml);

  const launchBtn = $('#btn-launch-mailto-step2');
  if (launchBtn) {
    launchBtn.addEventListener('click', async () => {
      await api(`api.php?action=contact&id=${encodeURIComponent(contactId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: 'Sent Step 2', delivery_status: 'Sent Step 2 (Mail App)', step_2_sent_at: new Date().toISOString() }),
      });
      await refresh();
      setTimeout(() => { $('#modal-backdrop').hidden = true; }, 800);
    });
  }

  const copyBtn = $('#btn-copy-step2');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const copyText = `To: ${to}\nCC: ${cc}\nBCC: ${bcc}\nSubject: ${subject}\n\n${followUpText}`;
      try {
        await navigator.clipboard.writeText(copyText);
        copyBtn.textContent = '✓ Copied to Clipboard!';
      } catch (e) {
        copyBtn.textContent = 'Copy failed';
      }
      setTimeout(() => { copyBtn.textContent = '📋 Copy Follow-Up to Clipboard'; }, 2000);
    });
  }

  const markBtn = $('#btn-mark-sent2-only');
  if (markBtn) {
    markBtn.addEventListener('click', async () => {
      await api(`api.php?action=contact&id=${encodeURIComponent(contactId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ stage: 'Sent Step 2', delivery_status: 'Sent Step 2 (Manual)', step_2_sent_at: new Date().toISOString() }),
      });
      await refresh();
      $('#modal-backdrop').hidden = true;
    });
  }

  const serverDispatchBtn = $('#btn-dispatch-server-step2');
  if (serverDispatchBtn) {
    serverDispatchBtn.addEventListener('click', async () => {
      $('#modal-backdrop').hidden = true;
      runSendBatch([contactId], false, 2);
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

const echoDrawerBtnEl = $('#d-echo-bcc');
if (echoDrawerBtnEl) {
  echoDrawerBtnEl.addEventListener('click', async () => {
    if (!activeContactId) return;
    echoDrawerBtnEl.disabled = true;
    echoDrawerBtnEl.textContent = 'Echoing...';
    try {
      await api('api.php?action=echo_bcc', {
        method: 'POST',
        body: JSON.stringify({ id: activeContactId, targets: ['botchee@icloud.com', 'gary@gravitywizards.com'] }),
      });
      echoDrawerBtnEl.textContent = '✓ Echo Sent!';
      showDrawerNotice('✓ BCC copy dispatched to botchee@icloud.com & gary@gravitywizards.com', 'ok');
      setTimeout(() => {
        echoDrawerBtnEl.disabled = false;
        echoDrawerBtnEl.textContent = 'Echo BCC to iCloud';
      }, 2500);
    } catch (err) {
      echoDrawerBtnEl.disabled = false;
      echoDrawerBtnEl.textContent = 'Echo failed';
      showDrawerNotice(`Echo failed: ${err.message}`, 'warn');
    }
  });
}

$('#d-preview').addEventListener('click', () => {
  if (activeContactId) runSendBatch([activeContactId], true);
});

$('#d-send-one').addEventListener('click', () => {
  if (activeContactId) openSendStep1Dispatcher(activeContactId);
});

const sendStep2Btn = $('#d-send-step2');
if (sendStep2Btn) {
  sendStep2Btn.addEventListener('click', () => {
    if (activeContactId) openSendStep2Dispatcher(activeContactId);
  });
}

const toggleReplyBtn = $('#btn-toggle-reply-type');
if (toggleReplyBtn) {
  toggleReplyBtn.addEventListener('click', async () => {
    if (!activeContactId) return;
    const c = state.contacts.find((x) => x.id === activeContactId);
    if (!c || !c.last_reply) return;
    const targetType = c.last_reply.type === 'auto' ? 'human' : 'auto';
    try {
      toggleReplyBtn.disabled = true;
      toggleReplyBtn.textContent = 'Updating...';
      const res = await api('api.php?action=reclassify_reply', {
        method: 'POST',
        body: JSON.stringify({ id: activeContactId, type: targetType }),
      });
      if (res.contact) {
        const idx = state.contacts.findIndex((x) => x.id === activeContactId);
        if (idx !== -1) state.contacts[idx] = res.contact;
        openDrawer(activeContactId);
        renderMetrics();
        renderContacts();
        showDrawerNotice(`✓ Reclassified as ${targetType === 'human' ? 'Human Reply' : 'Auto-Acknowledged'}!`, 'ok');
      }
    } catch (err) {
      showDrawerNotice(`Failed to reclassify: ${err.message}`, 'warn');
    } finally {
      toggleReplyBtn.disabled = false;
    }
  });
}

const copyReplyBtn = $('#btn-copy-reply-body');
if (copyReplyBtn) {
  copyReplyBtn.addEventListener('click', async () => {
    const text = $('#drawer-reply-body').textContent;
    try {
      await navigator.clipboard.writeText(text);
      copyReplyBtn.textContent = '✓ Copied';
      setTimeout(() => { copyReplyBtn.textContent = 'Copy'; }, 1500);
    } catch (e) {}
  });
}

function openSendBatchDispatcher(contacts) {
  if (!contacts || contacts.length === 0) {
    showModal('Send Outreach', '<p class="status-pill status-info">No contacts currently queued for Step 1.</p>');
    return;
  }
  if (contacts.length === 1) {
    openSendStep1Dispatcher(contacts[0].id);
    return;
  }

  const hasHostingerMail = !!serverStatus.hostingerMailConfigured;
  const count = contacts.length;

  const contactsHtml = contacts
    .map(
      (c, idx) => `
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:12px;display:flex;flex-direction:column;gap:6px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong>#${idx + 1}. ${escapeHtml(c.outlet)}</strong>
        <span class="status-pill status-warn">Queued</span>
      </div>
      <div style="font-size:0.83rem;">
        <div><strong>To:</strong> <code>${escapeHtml(c.primary_email)}</code></div>
        ${c.cc_email ? `<div><strong>CC:</strong> <code>${escapeHtml(c.cc_email)}</code></div>` : ''}
        <div><strong>Subject:</strong> ${escapeHtml(c.subject_line || 'Twisted23 Outreach')}</div>
      </div>
      <div style="font-size:0.78rem;color:var(--muted);background:var(--surface);padding:6px 8px;border-radius:4px;border:1px solid var(--border);max-height:60px;overflow-y:auto;">
        ${escapeHtml(c.custom_blurb || '')}
      </div>
    </div>
  `
    )
    .join('');

  const modalHtml = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div>
        <div style="font-size:0.78rem;color:var(--accent);text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Batch Outreach Dispatcher</div>
        <h3 style="margin:4px 0 0;font-size:1.15rem;">Send Next ${count} Outlets in Queue</h3>
      </div>

      ${contactsHtml}

      <div style="display:flex;flex-direction:column;gap:10px;margin-top:6px;">
        <button id="btn-dispatch-batch-server" class="btn btn-primary" type="button" style="padding:12px 18px;font-size:0.95rem;font-weight:600;">
          ${hasHostingerMail ? `🚀 Dispatch Both (${count} Outlets) via Hostinger Mail API` : `🚀 Dispatch Both (${count} Outlets) via Server`}
        </button>
        <span style="font-size:0.76rem;color:var(--muted);text-align:center;">
          Authenticated from <code>media@twisted23.com</code> with DKIM signing &amp; guaranteed BCC echo to <code>botchee@icloud.com</code> &amp; <code>gary@gravitywizards.com</code>.
        </span>

        <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:4px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
          <button id="btn-mark-batch-sent" class="btn btn-secondary btn-sm" type="button">
            ✓ Mark Both as "Sent Step 1" (Manual)
          </button>
        </div>
      </div>
    </div>
  `;

  showModal(`Batch Send — Next ${count} Outlets`, modalHtml);

  const dispatchBatchBtn = $('#btn-dispatch-batch-server');
  if (dispatchBatchBtn) {
    dispatchBatchBtn.addEventListener('click', async () => {
      dispatchBatchBtn.disabled = true;
      dispatchBatchBtn.textContent = `⏳ Dispatching ${count} Outlets via Hostinger Mail API...`;
      await runSendBatch(contacts.map((c) => c.id), false, 1);
    });
  }

  const markBatchBtn = $('#btn-mark-batch-sent');
  if (markBatchBtn) {
    markBatchBtn.addEventListener('click', async () => {
      markBatchBtn.disabled = true;
      markBatchBtn.textContent = 'Marking sent...';
      for (const c of contacts) {
        await api(`api.php?action=contact&id=${encodeURIComponent(c.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ stage: 'Sent Step 1', delivery_status: 'Sent Step 1 (Batch Manual)', sent_at: new Date().toISOString() }),
        });
      }
      await refresh();
      $('#modal-backdrop').hidden = true;
    });
  }
}

$('#btn-dry-run-2').addEventListener('click', () => {
  const next2 = state.contacts.filter((c) => c.stage === 'Queued' && c.primary_email).slice(0, 2).map((c) => c.id);
  runSendBatch(next2, true);
});

$('#btn-send-2').addEventListener('click', () => {
  const next2 = state.contacts.filter((c) => c.stage === 'Queued' && c.primary_email).slice(0, 2);
  openSendBatchDispatcher(next2);
});

$('#btn-add-contact').addEventListener('click', () => {
  showModal(
    'Add Outreach Contact',
    `<form id="quick-contact-form" class="drawer-body" style="padding:0;">
      <label class="field"><span>Outlet / Name</span><input id="nc-outlet" class="input" required /></label>
      <label class="field"><span>Primary Email</span><input id="nc-email" class="input" type="email" required /></label>
      <label class="field"><span>CC Email (optional)</span><input id="nc-cc" class="input" /></label>
      <label class="field"><span>BCC Email (optional)</span><input id="nc-bcc" class="input" value="gary@gravitywizards.com, botchee@icloud.com" /></label>
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
