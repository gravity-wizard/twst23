let state = { contacts: [], derbies: [], triage: [], bom: [], bom_ideas: [], financials: [] };
let activeContactId = null;
let serverStatus = { resendConfigured: false };

const $ = (sel) => document.querySelector(sel);

async function api(url, opts = {}) {
  const method = (opts.method || 'GET').toUpperCase();
  const sep = url.includes('?') ? '&' : '?';
  const finalUrl = method === 'GET' ? `${url}${sep}_t=${Date.now()}` : url;
  const res = await fetch(finalUrl, {
    cache: 'no-store',
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
  if (!res.ok) {
    const err = new Error(data.error || data.message || `Request failed (${res.status})`);
    err.httpStatus = res.status;
    err.payload = data;
    throw err;
  }
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

function getContactCampaign(c) {
  const cat = (c.category || '').toLowerCase();
  if (cat.includes('literary agent')) return 'agents';
  if (c.id === 'GW-C061' || cat.includes('vendor')) return 'vendor';
  return 'press';
}

function renderContacts() {
  const q = ($('#search-contacts')?.value || '').trim().toLowerCase();
  const campFilter = ($('#filter-campaign')?.value || 'all').trim();
  const stageFilter = ($('#filter-stage')?.value || 'all').trim();

  const filtered = state.contacts.filter((c) => {
    if (campFilter !== 'all' && getContactCampaign(c) !== campFilter) {
      return false;
    }
    if (stageFilter !== 'all') {
      const cStage = (c.stage || '').trim().toLowerCase();
      const sFilter = stageFilter.toLowerCase();
      if (sFilter === 'sent step 1' && cStage.startsWith('sent')) {
        // match
      } else if (cStage !== sFilter) {
        return false;
      }
    }
    if (!q) return true;
    return [c.id, c.outlet, c.primary_email, c.from_email, c.cc_email, c.angle, c.notes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const tbody = $('#contacts-tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:28px 16px;color:var(--muted);font-size:0.9rem;">No contacts found matching filter "<strong>${escapeHtml(stageFilter)}</strong>"${q ? ` and search "<strong>${escapeHtml(q)}</strong>"` : ''}.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((c) => {
      const fromAddr = c.from_email || serverStatus.fromAddress || 'media@twisted23.com';
      const isCustomFrom = fromAddr.toLowerCase() !== 'media@twisted23.com';
      return `
    <tr>
      <td><strong>${c.priority}</strong><div class="mono-tag" style="font-size:0.72rem;">${escapeHtml(c.id)}</div></td>
      <td>
        <span class="outlet-name">${escapeHtml(c.outlet)}</span>
        <span class="outlet-angle">${escapeHtml(c.angle)}</span>
      </td>
      <td class="email-cell">
        <div style="margin-bottom:3px;"><span class="status-pill ${isCustomFrom ? 'status-warn' : 'status-muted'}" style="font-size:0.71rem;">From: ${escapeHtml(fromAddr)}</span></div>
        ${c.primary_email ? escapeHtml(c.primary_email) : '<span class="status-pill status-muted">Web Form</span>'}
        ${c.cc_email ? `<div class="cc-line">CC: ${escapeHtml(c.cc_email)}</div>` : ''}
      </td>
      <td><span class="status-pill ${stagePill(c.stage)}">${c.stage === 'Auto-Acknowledged' ? '🤖 ' : (c.stage === 'Received Reply' ? '💬 ' : '')}${escapeHtml(c.stage)}</span></td>
      <td><span class="status-pill ${deliveryPill(c.delivery_status)}">${escapeHtml(c.delivery_status)}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" type="button" data-open="${c.id}">Inspect / Edit</button>
      </td>
    </tr>
  `;
    })
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

function fmtUsd(val) {
  return '$' + Number(val || 0).toFixed(2);
}

function buildMailtoUrl(to, { from = '', cc = '', subject = '', body = '' } = {}) {
  const parts = [];
  if (from && from.trim()) parts.push('from=' + encodeURIComponent(from.trim()));
  if (cc && cc.trim()) parts.push('cc=' + encodeURIComponent(cc.trim()));
  if (subject) parts.push('subject=' + encodeURIComponent(subject));
  if (body) parts.push('body=' + encodeURIComponent(body));
  const query = parts.length ? '?' + parts.join('&') : '';
  return `mailto:${encodeURIComponent((to || '').trim())}${query}`;
}

function renderFinancials() {
  const tbody = $('#fin-tbody');
  if (!tbody) return;
  const items = Array.isArray(state.financials) ? state.financials : [];

  let totalMo = 0;
  let totalRiskYr = 0;
  const pendingItems = [];
  items.forEach((f) => {
    totalMo += Number(f.monthly_usd || 0);
    totalRiskYr += Number(f.annual_risk_usd || 0);
    if ((f.status || '').toLowerCase().includes('pending')) {
      pendingItems.push(f);
    }
  });

  const moEl = $('#fin-total-mo');
  if (moEl) moEl.textContent = `${fmtUsd(totalMo)}/mo`;
  const pendEl = $('#fin-pending-count');
  if (pendEl) pendEl.textContent = String(pendingItems.length);
  const pendSubEl = $('#fin-pending-sub');
  if (pendSubEl) {
    pendSubEl.textContent = pendingItems.length > 0
      ? pendingItems.map((p) => `${p.vendor} (${p.id})`).join(' · ')
      : '✓ All trials & cancellations confirmed!';
  }
  const riskEl = $('#fin-risk-yr');
  if (riskEl) riskEl.textContent = `${fmtUsd(totalRiskYr)}/yr`;

  const calloutEl = $('#fin-keeper-callout');
  if (calloutEl) {
    const keeperFin = items.find((f) => f.id === 'FIN-001' || (f.vendor || '').toLowerCase().includes('keeper'));
    const keeperContact = (state.contacts || []).find((c) => c.id === (keeperFin?.linked_contact_id || 'GW-C061'));
    if (keeperFin && (keeperFin.status || '').toLowerCase().includes('pending') && keeperContact) {
      const kFrom = keeperContact.from_email || keeperFin.account_email || 'gary@gravitywizards.com';
      const kCc = keeperContact.cc_email || 'media@twisted23.com, botchee@icloud.com';
      const kSig = keeperContact.custom_signature || "\n\nThank you,\nGary Francis Stout\nFounder, Gravity Wizards, Inc.\ngary@gravitywizards.com\n+1 (907) 795-9515\nAnchorage, Alaska";
      const kBody = (keeperContact.custom_blurb || '') + kSig;
      const kMailto = buildMailtoUrl(keeperContact.primary_email || 'sales@keepersecurity.com', {
        from: kFrom,
        cc: kCc,
        subject: keeperContact.subject_line || 'Cancel Keeper Security Business Trial — Gravity Wizards, Inc.',
        body: kBody,
      });
      const kSent = keeperContact.stage && keeperContact.stage !== 'Queued';
      calloutEl.innerHTML = kSent ? `
        <div style="background:#eff6ff;border:1px solid #60a5fa;border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:250px;">
            <div style="font-size:0.76rem;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.04em;">
              ✓ Cancellation Sent From ${escapeHtml(kFrom)} &middot; Awaiting Keeper Written Confirmation
            </div>
            <div style="font-size:0.9rem;margin-top:3px;">
              <strong>Keeper Security Business Trial (<code>${escapeHtml(kFrom)}</code>)</strong> &rarr;
              <code>${escapeHtml(keeperContact.primary_email)}</code>
            </div>
            <div style="font-size:0.78rem;color:#1e3a8a;margin-top:2px;">
              ${escapeHtml(keeperContact.delivery_status || 'Sent')} &middot; Once Keeper CSM confirms $0.00 auto-renewal, click <strong>✓ Mark Cancelled</strong> on <code>${escapeHtml(keeperFin.id)}</code>.
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <button type="button" class="btn btn-secondary btn-sm" data-open-fin-contact="${escapeHtml(keeperContact.id)}">🔍 View ${escapeHtml(keeperContact.id)}</button>
          </div>
        </div>
      ` : `
        <div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:250px;">
            <div style="font-size:0.76rem;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.04em;">
              ⚡ Send Explicitly From: ${escapeHtml(kFrom)} · Zero Hostinger Credits Needed
            </div>
            <div style="font-size:0.9rem;margin-top:3px;">
              <strong>Keeper Security Business Trial (<code>From: ${escapeHtml(kFrom)}</code>)</strong> &rarr;
              <code>${escapeHtml(keeperContact.primary_email)}</code>
            </div>
            <div style="font-size:0.78rem;color:#78350f;margin-top:2px;">
              Per Keeper Help Articles #263 &amp; #289, do <strong>not</strong> delete your Keeper vault first — confirm <code>From: ${escapeHtml(kFrom)}</code> is selected in Apple Mail (or open <code>${escapeHtml(keeperContact.id)}</code> below).
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <a href="${escapeHtml(kMailto)}" class="btn btn-primary btn-sm" style="text-decoration:none;">✉ Send From gary@ in Apple Mail ↗</a>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-keeper-cancel">📋 Copy Email</button>
            <button type="button" class="btn btn-secondary btn-sm" data-open-fin-contact="${escapeHtml(keeperContact.id)}">🚀 GwCrm Draft (${escapeHtml(keeperContact.id)})</button>
          </div>
        </div>
      `;
      const copyKBtn = $('#btn-copy-keeper-cancel');
      if (copyKBtn) {
        copyKBtn.addEventListener('click', async () => {
          const clip = `From: ${kFrom}\nTo: ${keeperContact.primary_email}\nCC: ${kCc}\nSubject: ${keeperContact.subject_line}\n\n${kBody}`;
          try {
            await navigator.clipboard.writeText(clip);
            copyKBtn.textContent = '✓ Copied!';
          } catch (_) {
            copyKBtn.textContent = 'Copy failed';
          }
          setTimeout(() => { copyKBtn.textContent = '📋 Copy Email'; }, 2000);
        });
      }
      calloutEl.querySelectorAll('[data-open-fin-contact]').forEach((btn) => {
        btn.addEventListener('click', () => openDrawer(btn.dataset.openFinContact));
      });
    } else {
      calloutEl.innerHTML = '';
    }
  }

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted);">No financial records logged yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = items
    .map((f) => {
      const statusLower = (f.status || '').toLowerCase();
      const pillCls = statusLower.includes('pending')
        ? 'status-warn'
        : (statusLower.includes('audit') ? 'status-info' : 'status-ok');
      const linked = f.linked_contact_id ? (state.contacts || []).find((c) => c.id === f.linked_contact_id) : null;
      let mailtoBtnHtml = '';
      if (f.contact_email) {
        const sig = linked?.custom_signature || "\n\nThank you,\nGary Francis Stout\nFounder, Gravity Wizards, Inc.\ngary@gravitywizards.com\n+1 (907) 795-9515";
        const mUrl = buildMailtoUrl(f.contact_email, {
          from: linked?.from_email || f.account_email || 'gary@gravitywizards.com',
          cc: linked?.cc_email || '',
          subject: linked?.subject_line || `Subscription Inquiry — ${f.vendor} (${f.account_email || ''})`,
          body: linked ? ((linked.custom_blurb || '') + sig) : '',
        });
        mailtoBtnHtml = `<a href="${escapeHtml(mUrl)}" class="btn btn-primary btn-sm" style="text-decoration:none;">✉ Apple Mail</a>`;
      }
      return `
        <tr>
          <td>
            <span class="mono-tag">${escapeHtml(f.id)}</span>
            <div style="font-size:0.75rem;color:var(--muted);margin-top:3px;">${escapeHtml(f.logged_date || '')}</div>
          </td>
          <td>
            <div style="font-size:0.73rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.03em;font-weight:600;">${escapeHtml(f.category || '')}</div>
            <span class="outlet-name">
              ${f.reference_url ? `<a href="${escapeHtml(f.reference_url)}" target="_blank" rel="noopener">${escapeHtml(f.vendor)} ↗</a>` : escapeHtml(f.vendor)}
            </span>
            <span class="outlet-angle">${escapeHtml(f.notes || '')}</span>
          </td>
          <td style="font-size:0.82rem;">
            <div><code>${escapeHtml(f.account_email || '')}</code></div>
            <div style="font-size:0.75rem;color:var(--muted);">${escapeHtml(f.entity || '')} &middot; ${escapeHtml(f.billing_cycle || '')}</div>
            ${f.contact_email ? `<div style="font-size:0.75rem;margin-top:2px;">Vendor: <code>${escapeHtml(f.contact_email)}</code></div>` : ''}
          </td>
          <td style="font-family:var(--font-mono);font-size:0.84rem;">
            <strong>${fmtUsd(f.monthly_usd)}/mo</strong>
            ${Number(f.annual_risk_usd || 0) > 0 ? `<div style="font-size:0.74rem;color:#b45309;">${fmtUsd(f.annual_risk_usd)}/yr exposure</div>` : `<div style="font-size:0.74rem;color:var(--ok-text);">$0.00 exposure</div>`}
          </td>
          <td><span class="status-pill ${pillCls}">${escapeHtml(f.status || 'Active')}</span></td>
          <td>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${mailtoBtnHtml}
              ${f.linked_contact_id ? `<button class="btn btn-secondary btn-sm" type="button" data-fin-contact="${escapeHtml(f.linked_contact_id)}">🚀 ${escapeHtml(f.linked_contact_id)}</button>` : ''}
              ${statusLower.includes('pending') ? `<button class="btn btn-secondary btn-sm" type="button" data-fin-confirm="${escapeHtml(f.id)}">✓ Mark Cancelled</button>` : ''}
              <button class="btn btn-secondary btn-sm" type="button" data-fin-edit="${escapeHtml(f.id)}">Edit</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  tbody.querySelectorAll('[data-fin-contact]').forEach((btn) => {
    btn.addEventListener('click', () => openDrawer(btn.dataset.finContact));
  });
  tbody.querySelectorAll('[data-fin-confirm]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const finId = btn.dataset.finConfirm;
      btn.disabled = true;
      btn.textContent = 'Saving...';
      await api(`api.php?action=financial_item&id=${encodeURIComponent(finId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Cancelled ($0 Confirmed)',
          annual_risk_usd: 0,
          billing_cycle: 'Trial Terminated ($0.00)',
        }),
      });
      await refresh();
    });
  });
  tbody.querySelectorAll('[data-fin-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openFinEditModal(btn.dataset.finEdit));
  });
}

function openFinEditModal(finId) {
  const item = (state.financials || []).find((x) => x.id === finId);
  if (!item) return;
  showModal(
    `Edit ${item.id} — ${item.vendor}`,
    `<form id="edit-fin-form" class="drawer-body" style="padding:0;">
      <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:10px;">
        <label class="field"><span>Vendor / Service</span><input id="ef-vendor" class="input" value="${escapeHtml(item.vendor)}" required /></label>
        <label class="field"><span>Status</span><input id="ef-status" class="input" value="${escapeHtml(item.status || '')}" required /></label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <label class="field"><span>Account Email</span><input id="ef-acct" class="input" value="${escapeHtml(item.account_email || '')}" /></label>
        <label class="field"><span>Vendor Billing Email</span><input id="ef-cemail" class="input" value="${escapeHtml(item.contact_email || '')}" /></label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <label class="field"><span>Monthly ($)</span><input id="ef-mo" class="input" type="number" step="0.01" min="0" value="${Number(item.monthly_usd || 0)}" /></label>
        <label class="field"><span>Annual Exposure ($)</span><input id="ef-yr" class="input" type="number" step="0.01" min="0" value="${Number(item.annual_risk_usd || 0)}" /></label>
        <label class="field"><span>Billing Cycle</span><input id="ef-cycle" class="input" value="${escapeHtml(item.billing_cycle || '')}" /></label>
      </div>
      <label class="field"><span>Audit Notes</span><textarea id="ef-notes" class="textarea" rows="3">${escapeHtml(item.notes || '')}</textarea></label>
      <button class="btn btn-primary" type="submit">Save Financial Record</button>
    </form>`
  );
  $('#edit-fin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await api(`api.php?action=financial_item&id=${encodeURIComponent(finId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        vendor: $('#ef-vendor').value,
        status: $('#ef-status').value,
        account_email: $('#ef-acct').value,
        contact_email: $('#ef-cemail').value,
        monthly_usd: Number($('#ef-mo').value || 0),
        annual_risk_usd: Number($('#ef-yr').value || 0),
        billing_cycle: $('#ef-cycle').value,
        notes: $('#ef-notes').value,
      }),
    });
    $('#modal-backdrop').hidden = true;
    await refresh();
  });
}

function renderBom() {
  const tbody = $('#bom-tbody');
  if (!tbody) return;
  const items = Array.isArray(state.bom) ? state.bom : [];
  const ideas = Array.isArray(state.bom_ideas) ? state.bom_ideas : [];

  const launcherQty = Math.max(0, Number($('#bom-qty-launchers')?.value || 0));
  const kitQty = Math.max(0, Number($('#bom-qty-kits')?.value || 0));
  const asmFilter = ($('#filter-bom-assembly')?.value || 'all').trim();

  let unitLauncherCost = 0;
  let unitKitCost = 0;
  items.forEach((b) => {
    unitLauncherCost += Number(b.qty_per_launcher || 0) * Number(b.unit_cost_usd || 0);
    unitKitCost += Number(b.qty_per_fobb_kit || 0) * Number(b.unit_cost_usd || 0);
  });

  const batchTotal = launcherQty * unitLauncherCost + kitQty * unitKitCost;
  const comboRetail = 19.99;
  const kitMargin = comboRetail - unitKitCost;
  const kitMarginPct = comboRetail > 0 ? Math.round((kitMargin / comboRetail) * 100) : 0;

  const ulEl = $('#bom-unit-launcher');
  if (ulEl) ulEl.textContent = fmtUsd(unitLauncherCost);
  const ukEl = $('#bom-unit-kit');
  if (ukEl) ukEl.textContent = fmtUsd(unitKitCost);
  const kmEl = $('#bom-kit-margin');
  if (kmEl) kmEl.textContent = `+${fmtUsd(kitMargin)} margin (${kitMarginPct}%) vs $19.99`;
  const btEl = $('#bom-batch-total');
  if (btEl) btEl.textContent = fmtUsd(batchTotal);
  const brEl = $('#bom-batch-retail');
  if (brEl) brEl.textContent = `${launcherQty} Launcher${launcherQty === 1 ? '' : 's'} + ${kitQty} Kits (${fmtUsd(kitQty * comboRetail)} retail value)`;

  const visible = items.filter((b) => asmFilter === 'all' || b.assembly === asmFilter);
  if (visible.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:22px;color:var(--muted);">No BOM items match this assembly filter.</td></tr>`;
  } else {
    tbody.innerHTML = visible
      .map((b) => {
        const ql = Number(b.qty_per_launcher || 0);
        const qk = Number(b.qty_per_fobb_kit || 0);
        const unit = Number(b.unit_cost_usd || 0);
        const ext = (ql * launcherQty + qk * kitQty) * unit;
        const statusCls = (b.status || '').includes('Stock') || (b.status || '').includes('Verified')
          ? 'status-ok'
          : ((b.status || '').includes('Critical') ? 'status-warn' : 'status-info');
        return `
        <tr>
          <td>
            <span class="mono-tag">${escapeHtml(b.id)}</span>
            <div style="font-size:0.77rem;font-family:var(--font-mono);margin-top:3px;">
              ${b.supplier_url ? `<a href="${escapeHtml(b.supplier_url)}" target="_blank" rel="noopener">${escapeHtml(b.part_no)} ↗</a>` : escapeHtml(b.part_no)}
            </div>
          </td>
          <td>
            <div style="font-size:0.73rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.03em;font-weight:600;">${escapeHtml(b.assembly)}</div>
            <span class="outlet-name">${escapeHtml(b.name)}</span>
            <span class="outlet-angle">${escapeHtml(b.spec_notes || '')}</span>
          </td>
          <td style="font-family:var(--font-mono);font-size:0.82rem;">
            ${ql > 0 ? `<div>🚀 ${ql}/Launcher</div>` : ''}
            ${qk > 0 ? `<div>📦 ${qk}/Kit</div>` : ''}
          </td>
          <td style="font-family:var(--font-mono);">
            <strong>${fmtUsd(unit)}</strong>
            ${b.retail_sku_usd ? `<div style="font-size:0.73rem;color:var(--muted);">SKU: ${fmtUsd(b.retail_sku_usd)}</div>` : ''}
          </td>
          <td style="font-family:var(--font-mono);"><strong>${fmtUsd(ext)}</strong></td>
          <td>
            <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-start;">
              <span class="status-pill ${statusCls}">${escapeHtml(b.status || 'Spec')}</span>
              <button class="btn btn-secondary btn-sm" type="button" data-edit-bom="${escapeHtml(b.id)}">Edit</button>
            </div>
          </td>
        </tr>`;
      })
      .join('');

    tbody.querySelectorAll('[data-edit-bom]').forEach((btn) => {
      btn.addEventListener('click', () => openBomEditModal(btn.dataset.editBom));
    });
  }

  const ideasEl = $('#bom-ideas-list');
  if (ideasEl) {
    ideasEl.innerHTML = ideas
      .map(
        (idea) => `
      <article class="info-card">
        <span class="mono-tag">${escapeHtml(idea.tag || 'Upgrade')}</span>
        <h3 style="margin-top:6px;">${escapeHtml(idea.title)}</h3>
        <p>${escapeHtml(idea.body)}</p>
      </article>`
      )
      .join('');
  }
}

function openBomEditModal(bomId) {
  const item = (state.bom || []).find((x) => x.id === bomId);
  if (!item) return;
  showModal(
    `Edit ${item.id} — ${item.part_no}`,
    `<form id="edit-bom-form" class="drawer-body" style="padding:0;">
      <label class="field"><span>Component Name</span><input id="eb-name" class="input" value="${escapeHtml(item.name)}" required /></label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <label class="field"><span>Part # / SKU</span><input id="eb-part" class="input" value="${escapeHtml(item.part_no)}" required /></label>
        <label class="field"><span>Est. Unit Cost ($)</span><input id="eb-cost" class="input" type="number" step="0.01" min="0" value="${Number(item.unit_cost_usd || 0)}" required /></label>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <label class="field"><span>Qty / Launcher</span><input id="eb-ql" class="input" type="number" step="1" min="0" value="${Number(item.qty_per_launcher || 0)}" /></label>
        <label class="field"><span>Qty / Combo Kit</span><input id="eb-qk" class="input" type="number" step="1" min="0" value="${Number(item.qty_per_fobb_kit || 0)}" /></label>
        <label class="field"><span>Status</span><input id="eb-status" class="input" value="${escapeHtml(item.status || '')}" /></label>
      </div>
      <label class="field"><span>Supplier URL (e.g. eBay / McMaster / Store)</span><input id="eb-url" class="input" value="${escapeHtml(item.supplier_url || '')}" /></label>
      <label class="field"><span>Engineering &amp; Safety Notes</span><textarea id="eb-notes" class="textarea" rows="3">${escapeHtml(item.spec_notes || '')}</textarea></label>
      <button class="btn btn-primary" type="submit">Save BOM Part</button>
    </form>`
  );
  $('#edit-bom-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await api(`api.php?action=bom_item&id=${encodeURIComponent(bomId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: $('#eb-name').value,
        part_no: $('#eb-part').value,
        unit_cost_usd: Number($('#eb-cost').value || 0),
        qty_per_launcher: Number($('#eb-ql').value || 0),
        qty_per_fobb_kit: Number($('#eb-qk').value || 0),
        status: $('#eb-status').value,
        supplier_url: $('#eb-url').value,
        spec_notes: $('#eb-notes').value,
      }),
    });
    $('#modal-backdrop').hidden = true;
    await refresh();
  });
}

function openDrawer(id) {
  const c = state.contacts.find((x) => x.id === id);
  if (!c) return;
  activeContactId = id;
  $('#drawer-id').textContent = `${c.id} · Priority #${c.priority}`;
  $('#drawer-title').textContent = c.outlet;
  $('#d-stage').value = c.stage;
  const fromInput = $('#d-from');
  if (fromInput) fromInput.value = c.from_email || serverStatus.fromAddress || 'media@twisted23.com';
  const emailInput = $('#d-email');
  if (emailInput) emailInput.value = c.primary_email || '';
  $('#d-cc').value = c.cc_email || '';
  $('#d-subject').value = c.subject_line || '';
  $('#d-blurb').value = c.custom_blurb || '';
  $('#d-notes').value = c.notes || '';

  // Render Inbound Reply / Auto-Ack Card
  const replyCard = $('#drawer-reply-card');
  const lastReply = c.last_reply;
  if (replyCard) {
    if (lastReply && (lastReply.snippet || lastReply.body)) {
      const isBounce = lastReply.type === 'bounce';
      const isAuto = lastReply.type === 'auto' || isBounce;
      replyCard.className = `reply-card ${isAuto ? 'auto' : 'human'}`;
      const pill = $('#drawer-reply-pill');
      if (pill) {
        pill.className = `status-pill ${isBounce ? 'status-danger' : (isAuto ? 'status-purple' : 'status-ok')}`;
        pill.textContent = isBounce ? `⚠️ ${lastReply.classification || 'Bounce DSN'}` : (isAuto ? '🤖 Auto-Acknowledged' : '💬 Human Reply');
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

  // Adjust Send Step 1 / Step 2 / Re-Queue buttons
  const step1Btn = $('#d-send-one');
  const step2Btn = $('#d-send-step2');
  const requeueBtn = $('#d-requeue');
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
  if (requeueBtn) {
    requeueBtn.style.display = c.stage === 'Queued' ? 'none' : 'inline-block';
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
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
          <strong>${escapeHtml(r.outlet)}</strong>
          <div style="display:flex;align-items:center;gap:6px;">
            ${r.credits_used ? `<span class="status-pill status-muted">${r.credits_used} email credit${r.credits_used === 1 ? '' : 's'}</span>` : ''}
            <span class="status-pill ${r.status === 'sent' ? 'status-ok' : (r.status === 'dry_run' ? 'status-info' : (r.status === 'rate_limited' ? 'status-danger' : 'status-warn'))}">
              ${r.status === 'sent' ? '✓ Dispatched (Hostinger Mail API)' : (r.status === 'rate_limited' ? '⚠️ Daily Rate Limit Hit (Kept Queued)' : escapeHtml(r.status))}
            </span>
          </div>
        </div>
        ${r.to ? `<div>${r.from ? `<code>From: ${escapeHtml(r.from)}</code> ` : ''}<code>To: ${escapeHtml(r.to)}</code> ${r.cc?.length ? `<code>CC: ${escapeHtml(r.cc.join(', '))}</code>` : ''} <span style="font-size:0.75rem;color:var(--ok-text);font-weight:600;">⚡ Zero BCC (Saved in Sent folder)</span></div>` : ''}
        ${r.subject ? `<div><strong>Subject:</strong> ${escapeHtml(r.subject)}</div>` : ''}
        ${r.preview ? `<pre>${escapeHtml(r.preview)}</pre>` : ''}
        ${r.error ? `<div class="status-pill status-danger" style="margin-top:6px;">${escapeHtml(r.error)}</div>` : ''}
        ${r.reason ? `<div class="status-pill status-warn" style="margin-top:6px;">${escapeHtml(r.reason)}</div>` : ''}
      </div>
    `
      )
      .join('');
    showModal(dryRun ? 'Dry-Run Email Preview' : 'Send Results', html || '<p>No eligible contacts.</p>');
    await refresh();
  } catch (err) {
    showModal('Error', `<p class="status-pill status-warn">${escapeHtml(err.message)}</p>`);
  }
}

function renderStaffTopbar(user) {
  const slot = $('#gwcrm-staff-slot');
  if (!slot) return;
  if (!user) {
    slot.innerHTML = `<a href="/ucp/?mode=login&amp;redirect=/crm/" class="staff-link-pill">🔑 Staff Login</a>`;
    return;
  }
  slot.innerHTML = `
    <a href="/ucp/" class="staff-link-pill" title="Open User ControL PaneL">
      <span>${escapeHtml(user.badge || '👑')}</span>
      <span>${escapeHtml(user.username)}</span>
      <code style="background:rgba(0,0,0,0.28);color:#38bdf8;padding:1px 5px;border-radius:4px;">${escapeHtml(user.base38_id || '')}</code>
    </a>
    <button type="button" id="btn-gwcrm-logout" class="staff-logout-btn">Sign Out</button>
  `;
  const logoutBtn = $('#btn-gwcrm-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/auth/auth.php?action=logout', { method: 'POST' });
      } catch (_) {}
      renderStaffTopbar(null);
      await refresh();
    });
  }
}

function setAuthGateVisible(visible, message = '') {
  const gate = $('#gwcrm-auth-gate');
  const shell = $('#gwcrm-app-shell');
  const toolbar = $('#gwcrm-toolbar-actions');
  if (gate) gate.hidden = !visible;
  if (shell) shell.hidden = visible;
  if (toolbar) toolbar.style.display = visible ? 'none' : 'flex';
  if (visible && message) {
    const msgEl = $('#gwcrm-auth-msg');
    if (msgEl) msgEl.textContent = message;
  }
}

async function refresh() {
  try {
    const [status, data] = await Promise.all([api('api.php?action=status'), api('api.php?action=state')]);
    setAuthGateVisible(false);
    serverStatus = status;
    state = data;
    renderStaffTopbar(status.authUser || null);
    const badge = $('#resend-badge');
    if (status.hostingerMailConfigured) {
      const recentTag = status.pitchesLast24h > 0 ? ` · ${status.pitchesLast24h} sent/24h` : '';
      badge.textContent = `Hostinger Mail API · Zero BCC${recentTag}`;
      badge.className = 'status-pill status-ok';
    } else if (status.resendConfigured) {
      badge.textContent = 'Resend API Ready';
      badge.className = 'status-pill status-ok';
    } else {
      badge.textContent = 'Dry-Run / PHP Mail Mode';
      badge.className = 'status-pill status-warn';
    }
    const dsBtn = $('#btn-daily-summary');
    if (dsBtn && status.dailySummary) {
      const ds = status.dailySummary;
      dsBtn.textContent = ds.sentToday ? '📅 4:11 PM Summary ✓' : '📅 4:11 PM Summary';
      dsBtn.title = ds.sentToday
        ? `Sent today (${ds.lastSentAk || ds.todayDateAk}) to ${ds.recipient}`
        : `Scheduled daily at 4:11 PM AK (${ds.timezone}) → ${ds.recipient} (1 credit/day)`;
    }
    renderMetrics();
    renderContacts();
    renderFinancials();
    renderBom();
    renderDerbies();
    renderTriage();
  } catch (err) {
    if (err.httpStatus === 401 || err.httpStatus === 403) {
      renderStaffTopbar(null);
      setAuthGateVisible(
        true,
        err.httpStatus === 403
          ? 'Your current Twisted23 account does not have Founder / GwCrm Administrator privileges. Sign in as Gary or A7si below.'
          : 'Sign in with your Twisted23 Founder or GwCrm Administrator credentials to unlock outreach dispatch.'
      );
      return;
    }
    console.error('GwCrm refresh failed:', err);
  }
}

// Tabs
function activateTab(tabName, pushQuery = false) {
  const targetTab = $(`.tab[data-tab="${tabName}"]`);
  const targetPanel = $(`#panel-${tabName}`);
  if (!targetTab || !targetPanel) return;
  document.querySelectorAll('.tab').forEach((t) => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.panel').forEach((p) => {
    p.classList.remove('active');
    p.hidden = true;
  });
  targetTab.classList.add('active');
  targetTab.setAttribute('aria-selected', 'true');
  targetPanel.classList.add('active');
  targetPanel.hidden = false;
  if (pushQuery && window.history?.replaceState) {
    const url = new URL(window.location.href);
    if (tabName === 'outreach') url.searchParams.delete('tab');
    else url.searchParams.set('tab', tabName);
    window.history.replaceState({}, '', url.toString());
  }
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab, true));
});

const initialTabParam = new URLSearchParams(window.location.search).get('tab');
if (initialTabParam) {
  activateTab(initialTabParam, false);
}

$('#search-contacts').addEventListener('input', renderContacts);
const campSelect = $('#filter-campaign');
if (campSelect) campSelect.addEventListener('change', renderContacts);
$('#filter-stage').addEventListener('change', renderContacts);
$('#drawer-close').addEventListener('click', closeDrawer);
$('#modal-close').addEventListener('click', () => ($('#modal-backdrop').hidden = true));

// Metric cards click-to-filter
document.querySelectorAll('.metric[data-stage]').forEach((el) => {
  el.addEventListener('click', () => {
    const stage = el.dataset.stage;
    const outreachTab = $('#tab-outreach');
    if (outreachTab) outreachTab.click();
    const filterSelect = $('#filter-stage');
    if (filterSelect) {
      filterSelect.value = stage;
      renderContacts();
    }
  });
});

document.querySelectorAll('.metric[data-tab]').forEach((el) => {
  el.addEventListener('click', () => {
    const tabBtn = $(`#tab-${el.dataset.tab}`);
    if (tabBtn) tabBtn.click();
  });
});

// Manual refresh button in topbar
const refreshBtn = $('#btn-refresh');
if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '↻ Syncing...';
    try {
      await refresh();
      refreshBtn.textContent = '✓ Synced';
      setTimeout(() => {
        refreshBtn.textContent = '↻ Refresh';
        refreshBtn.disabled = false;
      }, 1000);
    } catch (e) {
      refreshBtn.textContent = 'Sync Failed';
      setTimeout(() => {
        refreshBtn.textContent = '↻ Refresh';
        refreshBtn.disabled = false;
      }, 1800);
    }
  });
}

// Background sync on window focus and tab visibility change
window.addEventListener('focus', () => { refresh().catch(() => {}); });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refresh().catch(() => {});
});

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
      subject_line: $('#d-subject').value,
      custom_blurb: $('#d-blurb').value,
      notes: $('#d-notes').value,
    };
    const fromInput = $('#d-from');
    if (fromInput) {
      payload.from_email = fromInput.value.trim().toLowerCase();
      payload.reply_to = payload.from_email;
    }
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

  const fromEmail = c.from_email || serverStatus.fromAddress || 'media@twisted23.com';
  const to = c.primary_email || '';
  const cc = c.cc_email || '';
  const ccCount = cc ? cc.split(',').map((s) => s.trim()).filter(Boolean).length : 0;
  const baseCredits = 1 + ccCount;
  const subject = c.subject_line || 'Twisted23 & Flipping Dice';
  const blurb = c.custom_blurb || '';
  const signature = c.custom_signature || "\n\nBest,\nGary Stout\nTwisted23 & Gravity Wizards (Anchorage, AK)\nhttps://twisted23.com\nmedia@twisted23.com";
  const fullBody = blurb + signature;

  const mailtoUrl = buildMailtoUrl(to, { from: fromEmail, cc, subject, body: fullBody });

  const hasHostingerMail = !!serverStatus.hostingerMailConfigured;
  const hasResend = !!serverStatus.resendConfigured;

  const modalHtml = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div>
        <div style="font-size:0.78rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Dispatch Step 1 Outreach</div>
        <h3 style="margin:4px 0 0;font-size:1.15rem;">${escapeHtml(c.outlet)}</h3>
      </div>

      <div style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:12px;font-size:0.83rem;display:flex;flex-direction:column;gap:5px;">
        <div><strong>From:</strong> <code>${escapeHtml(fromEmail)}</code></div>
        <div><strong>To:</strong> <code>${escapeHtml(to || '(No email set)')}</code></div>
        ${cc ? `<div><strong>CC:</strong> <code>${escapeHtml(cc)}</code></div>` : ''}
        <div><strong>Quota Cost:</strong> <span style="color:var(--ok-text);font-weight:600;">⚡ ${baseCredits} daily credit${baseCredits === 1 ? '' : 's'} (Zero BCC)</span></div>
        <div><strong>Subject:</strong> ${escapeHtml(subject)}</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="border-top:1px solid var(--border);padding-top:10px;display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button id="btn-dispatch-server" class="btn btn-primary" type="button">
              ${hasHostingerMail ? `🚀 Dispatch via Hostinger Mail API (From: ${escapeHtml(fromEmail)})` : (hasResend ? '🚀 Dispatch via Resend Cloud API' : '🚀 Dispatch via Server Mail')}
            </button>
          </div>
          ${hasHostingerMail ? `
            <div style="font-size:0.76rem;color:var(--ok-text);display:flex;align-items:center;gap:6px;">
              <span>✓ Sent copy is archived in <code>${escapeHtml(fromEmail)}</code> Sent folder &amp; GwCrm ledger with zero BCCs.</span>
            </div>
          ` : ''}
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--border);padding-top:10px;">
          <a id="btn-launch-mailto" href="${escapeHtml(mailtoUrl)}" class="btn btn-secondary" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 14px;">
            ✉ Or Open in Native Mail App (From: ${escapeHtml(fromEmail)}) &amp; Mark Sent ↗
          </a>
        </div>

        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <button id="btn-copy-outreach" class="btn btn-secondary btn-sm" type="button">
            📋 Copy Email to Clipboard
          </button>
          <button id="btn-mark-sent-only" class="btn btn-secondary btn-sm" type="button">
            ✓ Mark Stage as "Sent Step 1"
          </button>
        </div>
      </div>
    </div>
  `;

  showModal('Send Step 1 — Outreach Dispatcher', modalHtml);

  const launchBtn = $('#btn-launch-mailto');
  if (launchBtn) {
    launchBtn.addEventListener('click', async () => {
      await markContactSentStep1(contactId, `Sent (${fromEmail} Mail App)`);
      setTimeout(() => { $('#modal-backdrop').hidden = true; }, 800);
    });
  }

  const copyBtn = $('#btn-copy-outreach');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const copyText = `From: ${fromEmail}\nTo: ${to}\n${cc ? `CC: ${cc}\n` : ''}Subject: ${subject}\n\n${fullBody}`;
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
      runSendBatch([contactId], false, 1);
    });
  }
}

function openSendStep2Dispatcher(contactId) {
  const c = state.contacts.find((x) => x.id === contactId);
  if (!c) return;

  const to = c.primary_email || '';
  const cc = c.cc_email || '';
  const origSubject = c.subject_line || 'Twisted23 & Flipping Dice';
  const subject = origSubject.toLowerCase().startsWith('re:') ? origSubject : `Re: ${origSubject}`;
  const signature = "\n\nBest,\nGary Stout\nTwisted23 & Gravity Wizards (Anchorage, AK)\nhttps://twisted23.com\nmedia@twisted23.com";
  const followUpText = "Just a quick follow-up in case my note earlier this week got buried.\n\nIf you have 2 minutes to try it right in your browser, you can jump straight into Tophat Sudoku and the Flipping Dice 3D-in-2D Spatial Lab here:\nhttps://twisted23.com\nhttps://flippingdice.twisted23.com\n\nHappy to share a quick walkthrough or any technical notes if this fits what you're covering." + signature;

  const mailtoUrl = buildMailtoUrl(to, { cc, subject, body: followUpText });

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
        <div><strong>Subject:</strong> ${escapeHtml(subject)}</div>
        ${c.auto_acknowledged ? `<div style="color:#7e22ce;font-weight:600;font-size:0.75rem;margin-top:2px;">🤖 Note: Automated receipt previously confirmed. Sending polite editorial follow-up.</div>` : ''}
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="border-top:1px solid var(--border);padding-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <button id="btn-dispatch-server-step2" class="btn btn-primary" type="button" style="background:#0284c7;">
            ${hasHostingerMail ? '🚀 Dispatch Step 2 via Hostinger Mail API (Zero BCC)' : '🚀 Dispatch Step 2 via Server'}
          </button>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--border);padding-top:10px;">
          <a id="btn-launch-mailto-step2" href="${escapeHtml(mailtoUrl)}" class="btn btn-secondary" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 14px;">
            ✉ Or Open in Native Mail App &amp; Mark Sent Step 2 ↗
          </a>
        </div>

        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <button id="btn-copy-step2" class="btn btn-secondary btn-sm" type="button">
            📋 Copy Follow-Up to Clipboard
          </button>
          <button id="btn-mark-sent2-only" class="btn btn-secondary btn-sm" type="button">
            ✓ Mark Stage as "Sent Step 2"
          </button>
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
      const copyText = `To: ${to}\n${cc ? `CC: ${cc}\n` : ''}Subject: ${subject}\n\n${followUpText}`;
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

const requeueBtnEl = $('#d-requeue');
if (requeueBtnEl) {
  requeueBtnEl.addEventListener('click', async () => {
    if (!activeContactId) return;
    requeueBtnEl.disabled = true;
    requeueBtnEl.textContent = 'Re-Queuing...';
    try {
      const updated = await api(`api.php?action=contact&id=${encodeURIComponent(activeContactId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          stage: 'Queued',
          delivery_status: 'Re-Queued (Retry Ready)',
        }),
      });
      const idx = state.contacts.findIndex((x) => x.id === activeContactId);
      if (idx !== -1) state.contacts[idx] = { ...state.contacts[idx], ...updated };
      openDrawer(activeContactId);
      renderMetrics();
      renderContacts();
      showDrawerNotice('✓ Contact re-queued for clean retry (duplicate lock cleared)!', 'ok');
    } catch (err) {
      showDrawerNotice(`Re-queue failed: ${err.message}`, 'warn');
    } finally {
      requeueBtnEl.disabled = false;
      requeueBtnEl.textContent = '↺ Re-Queue for Retry';
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
  const totalBaseCredits = contacts.reduce((sum, c) => {
    const ccLen = c.cc_email ? c.cc_email.split(',').map((s) => s.trim()).filter(Boolean).length : 0;
    return sum + 1 + ccLen;
  }, 0);

  const contactsHtml = contacts
    .map(
      (c, idx) => `
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:12px;display:flex;flex-direction:column;gap:6px;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <strong>#${idx + 1}. ${escapeHtml(c.outlet)}</strong>
        <span class="status-pill status-warn">${escapeHtml(c.delivery_status && c.delivery_status.includes('Rate-Limit') ? 'Re-Queued' : 'Queued')}</span>
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
        <div style="font-size:0.78rem;color:var(--accent);text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Batch Outreach Dispatcher · Zero BCC</div>
        <h3 style="margin:4px 0 0;font-size:1.15rem;">Send Next ${count} Outlets in Queue (${totalBaseCredits} Daily Credits Total)</h3>
      </div>

      ${contactsHtml}

      <div style="display:flex;flex-direction:column;gap:10px;margin-top:4px;">
        <button id="btn-dispatch-batch-server" class="btn btn-primary" type="button" style="padding:12px 18px;font-size:0.95rem;font-weight:600;">
          ${hasHostingerMail ? `🚀 Dispatch Both (${count} Outlets · ${totalBaseCredits} Credits) via Hostinger Mail API` : `🚀 Dispatch Both (${count} Outlets) via Server`}
        </button>
        <span style="font-size:0.76rem;color:var(--ok-text);text-align:center;">
          ✓ Zero BCCs generated — authenticated from <code>media@twisted23.com</code> with copies saved automatically in its Sent folder.
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

const dailySummaryBtnEl = $('#btn-daily-summary');
if (dailySummaryBtnEl) {
  dailySummaryBtnEl.addEventListener('click', async () => {
    try {
      const preview = await api('api.php?action=daily_summary_preview');
      const sched = preview.schedule || {};
      const sentToday = !!sched.sentToday;
      const html = `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:12px;font-size:0.83rem;display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
              <strong>📅 Daily 4:11 PM Alaska Time Digest</strong>
              <span class="status-pill ${sentToday ? 'status-ok' : 'status-info'}">
                ${sentToday ? `✓ Sent Today (${escapeHtml(sched.lastSentAk || sched.todayDateAk)})` : `⏰ Next Auto-Send: ${escapeHtml(sched.nextScheduledLabel || '4:11 PM AK')}`}
              </span>
            </div>
            <div><strong>Recipient:</strong> <code>${escapeHtml(preview.to || 'botchee@icloud.com')}</code> <span style="color:var(--ok-text);font-weight:600;">(Strictly 1 email credit/day · Zero BCC)</span></div>
            <div><strong>Current AK Clock:</strong> <code>${escapeHtml(sched.nowAk || '')}</code> (${escapeHtml(sched.timezone || 'America/Anchorage')})</div>
            <div><strong>Subject:</strong> ${escapeHtml(preview.subject || '')}</div>
          </div>
          <div class="preview-block" style="margin:0;">
            <pre style="max-height:340px;overflow:auto;">${escapeHtml(preview.text || '')}</pre>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding-top:4px;">
            <span style="font-size:0.76rem;color:var(--muted);">Locked to max 1 summary email per Anchorage calendar day.</span>
            <button id="btn-send-daily-summary-now" class="btn ${sentToday ? 'btn-secondary' : 'btn-primary'} btn-sm" type="button" ${sentToday ? 'disabled' : ''}>
              ${sentToday ? '✓ Already Dispatched Today' : '✉ Send Today\'s Summary Early (1 credit)'}
            </button>
          </div>
        </div>
      `;
      showModal('Daily 4:11 PM GwCrm Summary (Dry-Run Preview)', html);
      const sendNowBtn = $('#btn-send-daily-summary-now');
      if (sendNowBtn && !sentToday) {
        sendNowBtn.addEventListener('click', async () => {
          sendNowBtn.disabled = true;
          sendNowBtn.textContent = 'Dispatching 1-credit summary...';
          try {
            const res = await api('api.php?action=daily_summary_send_now', { method: 'POST', body: '{}' });
            sendNowBtn.textContent = res.status === 'already_sent_today' ? '✓ Already Sent Today' : '✓ Summary Sent to iCloud!';
            await refresh();
          } catch (err) {
            sendNowBtn.disabled = false;
            sendNowBtn.textContent = 'Failed: ' + err.message;
          }
        });
      }
    } catch (err) {
      showModal('Daily Summary Error', `<p class="status-pill status-warn">${escapeHtml(err.message)}</p>`);
    }
  });
}

$('#btn-dry-run-2').addEventListener('click', async () => {
  await refresh();
  const next2 = state.contacts.filter((c) => c.stage === 'Queued' && c.primary_email).slice(0, 2).map((c) => c.id);
  if (next2.length === 0) {
    showModal('Dry-Run Email Preview', '<p class="status-pill status-info">No queued contacts eligible for Step 1.</p>');
    return;
  }
  runSendBatch(next2, true);
});

$('#btn-send-2').addEventListener('click', async () => {
  await refresh();
  const next2 = state.contacts.filter((c) => c.stage === 'Queued' && c.primary_email).slice(0, 2);
  if (next2.length === 0) {
    showModal('Send Outreach', '<p class="status-pill status-info">No contacts currently queued for Step 1.</p>');
    return;
  }
  openSendBatchDispatcher(next2);
});

$('#btn-add-contact').addEventListener('click', () => {
  showModal(
    'Add Outreach Contact',
    `<form id="quick-contact-form" class="drawer-body" style="padding:0;">
      <label class="field"><span>Outlet / Name</span><input id="nc-outlet" class="input" required /></label>
      <label class="field"><span>Primary Email</span><input id="nc-email" class="input" type="email" required /></label>
      <label class="field"><span>CC Email (optional)</span><input id="nc-cc" class="input" /></label>
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

// BOM & Launcher Lab Controls
['#bom-qty-launchers', '#bom-qty-kits', '#filter-bom-assembly'].forEach((sel) => {
  const el = $(sel);
  if (el) {
    el.addEventListener('input', renderBom);
    el.addEventListener('change', renderBom);
  }
});

document.querySelectorAll('[data-bom-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const [l, k] = (btn.dataset.bomPreset || '1,1').split(',').map(Number);
    const lIn = $('#bom-qty-launchers');
    const kIn = $('#bom-qty-kits');
    if (lIn) lIn.value = l;
    if (kIn) kIn.value = k;
    renderBom();
  });
});

const exportBomBtn = $('#btn-export-bom-csv');
if (exportBomBtn) {
  exportBomBtn.addEventListener('click', () => {
    const items = Array.isArray(state.bom) ? state.bom : [];
    const launcherQty = Math.max(0, Number($('#bom-qty-launchers')?.value || 0));
    const kitQty = Math.max(0, Number($('#bom-qty-kits')?.value || 0));
    const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'BOM_ID', 'Assembly', 'Part_No_or_SKU', 'Component_Name',
      'Qty_Per_Launcher', 'Qty_Per_FOBB_Kit', 'Est_Unit_Cost_USD',
      `Batch_Ext_USD_${launcherQty}L_${kitQty}K`, 'Retail_SKU_USD', 'Status', 'Supplier_URL', 'Spec_Notes'
    ];
    const lines = [header.join(',')];
    items.forEach((b) => {
      const ql = Number(b.qty_per_launcher || 0);
      const qk = Number(b.qty_per_fobb_kit || 0);
      const unit = Number(b.unit_cost_usd || 0);
      const ext = (ql * launcherQty + qk * kitQty) * unit;
      lines.push([
        csvEscape(b.id),
        csvEscape(b.assembly),
        csvEscape(b.part_no),
        csvEscape(b.name),
        ql,
        qk,
        unit.toFixed(2),
        ext.toFixed(2),
        b.retail_sku_usd != null ? Number(b.retail_sku_usd).toFixed(2) : '',
        csvEscape(b.status || ''),
        csvEscape(b.supplier_url || ''),
        csvEscape(b.spec_notes || ''),
      ].join(','));
    });
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GwCrm-FOBB-Launcher-BOM-${launcherQty}L-${kitQty}Kits.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

const addBomBtn = $('#btn-add-bom');
if (addBomBtn) {
  addBomBtn.addEventListener('click', () => {
    showModal(
      'Add Launcher / FOBB BOM Part',
      `<form id="quick-bom-form" class="drawer-body" style="padding:0;">
        <label class="field"><span>Sub-Assembly</span>
          <select id="nb-asm" class="select">
            <option value="Launcher Wireless RF Trigger">A. Launcher Wireless RF Trigger (RP11)</option>
            <option value="Launcher Counterweight & Guide-Board">B. Launcher Counterweight &amp; Guide-Board</option>
            <option value="FOBB Airframe (Flying Object Built to Bounce)">C. FOBB Airframe (Flying Object Built to Bounce)</option>
            <option value="Wizard's Basic Combo Kit (#761032c/b/p/g)">D. Wizard&rsquo;s Basic Combo Kit ($19.99)</option>
          </select>
        </label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <label class="field"><span>Part # / SKU</span><input id="nb-part" class="input" placeholder="e.g. eBay #350965353954" required /></label>
          <label class="field"><span>Est. Unit Cost ($)</span><input id="nb-cost" class="input" type="number" step="0.01" min="0" value="5.00" required /></label>
        </div>
        <label class="field"><span>Component Name</span><input id="nb-name" class="input" required /></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <label class="field"><span>Qty / Launcher</span><input id="nb-ql" class="input" type="number" step="1" min="0" value="1" /></label>
          <label class="field"><span>Qty / Combo Kit</span><input id="nb-qk" class="input" type="number" step="1" min="0" value="0" /></label>
        </div>
        <label class="field"><span>Supplier URL (optional)</span><input id="nb-url" class="input" placeholder="https://..." /></label>
        <label class="field"><span>Engineering &amp; Safety Notes</span><textarea id="nb-notes" class="textarea" rows="3"></textarea></label>
        <button class="btn btn-primary" type="submit">Add to BOM</button>
      </form>`
    );
    $('#quick-bom-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await api('api.php?action=bom', {
        method: 'POST',
        body: JSON.stringify({
          assembly: $('#nb-asm').value,
          part_no: $('#nb-part').value,
          unit_cost_usd: Number($('#nb-cost').value || 0),
          name: $('#nb-name').value,
          qty_per_launcher: Number($('#nb-ql').value || 0),
          qty_per_fobb_kit: Number($('#nb-qk').value || 0),
          supplier_url: $('#nb-url').value,
          spec_notes: $('#nb-notes').value,
        }),
      });
      $('#modal-backdrop').hidden = true;
      await refresh();
    });
  });
}

// Financials & Subscriptions Controls
const exportFinBtn = $('#btn-export-fin-csv');
if (exportFinBtn) {
  exportFinBtn.addEventListener('click', () => {
    const items = Array.isArray(state.financials) ? state.financials : [];
    const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'Record_ID', 'Vendor_or_Service', 'Category', 'Account_Email', 'Entity',
      'Billing_Cycle', 'Monthly_USD', 'Annual_Exposure_USD', 'Status',
      'Contact_Email', 'Linked_GwCrm_ID', 'Reference_URL', 'Logged_Date', 'Notes'
    ];
    const lines = [header.join(',')];
    items.forEach((f) => {
      lines.push([
        csvEscape(f.id),
        csvEscape(f.vendor),
        csvEscape(f.category),
        csvEscape(f.account_email),
        csvEscape(f.entity),
        csvEscape(f.billing_cycle),
        Number(f.monthly_usd || 0).toFixed(2),
        Number(f.annual_risk_usd || 0).toFixed(2),
        csvEscape(f.status),
        csvEscape(f.contact_email || ''),
        csvEscape(f.linked_contact_id || ''),
        csvEscape(f.reference_url || ''),
        csvEscape(f.logged_date || ''),
        csvEscape(f.notes || ''),
      ].join(','));
    });
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GwCrm-Financial-Records.csv';
    a.click();
    URL.revokeObjectURL(url);
  });
}

const addFinBtn = $('#btn-add-fin');
if (addFinBtn) {
  addFinBtn.addEventListener('click', () => {
    showModal(
      'Add Financial / Subscription Record',
      `<form id="quick-fin-form" class="drawer-body" style="padding:0;">
        <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:10px;">
          <label class="field"><span>Vendor / Service</span><input id="nf-vendor" class="input" placeholder="e.g. Keeper Security" required /></label>
          <label class="field"><span>Category</span><input id="nf-cat" class="input" value="SaaS / Subscription" /></label>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <label class="field"><span>Account Admin Email</span><input id="nf-acct" class="input" value="gary@gravitywizards.com" required /></label>
          <label class="field"><span>Vendor Billing / Cancel Email</span><input id="nf-cemail" class="input" placeholder="e.g. sales@keepersecurity.com" /></label>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
          <label class="field"><span>Monthly ($)</span><input id="nf-mo" class="input" type="number" step="0.01" min="0" value="0.00" /></label>
          <label class="field"><span>Annual Exposure ($)</span><input id="nf-yr" class="input" type="number" step="0.01" min="0" value="0.00" /></label>
          <label class="field"><span>Status</span>
            <select id="nf-status" class="select">
              <option value="Pending Cancellation">Pending Cancellation</option>
              <option value="Cancelled ($0 Confirmed)">Cancelled ($0 Confirmed)</option>
              <option value="Active ($0/mo Fixed)">Active ($0/mo Fixed)</option>
              <option value="Active (Prepaid)">Active (Prepaid)</option>
              <option value="Audit Auto-Renew">Audit Auto-Renew</option>
            </select>
          </label>
        </div>
        <label class="field"><span>Billing Terms</span><input id="nf-cycle" class="input" placeholder="e.g. Trial — Cancel Requested" /></label>
        <label class="field"><span>Reference / Help URL</span><input id="nf-url" class="input" placeholder="https://..." /></label>
        <label class="field"><span>Audit Notes</span><textarea id="nf-notes" class="textarea" rows="3"></textarea></label>
        <button class="btn btn-primary" type="submit">Save Financial Record</button>
      </form>`
    );
    $('#quick-fin-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await api('api.php?action=financials', {
        method: 'POST',
        body: JSON.stringify({
          vendor: $('#nf-vendor').value,
          category: $('#nf-cat').value,
          account_email: $('#nf-acct').value,
          contact_email: $('#nf-cemail').value,
          monthly_usd: Number($('#nf-mo').value || 0),
          annual_risk_usd: Number($('#nf-yr').value || 0),
          status: $('#nf-status').value,
          billing_cycle: $('#nf-cycle').value,
          reference_url: $('#nf-url').value,
          notes: $('#nf-notes').value,
        }),
      });
      $('#modal-backdrop').hidden = true;
      await refresh();
    });
  });
}

// GwCrm Staff Login Gate (Passcode + 6-Digit Email Code)
(function initGwCrmAuthGate() {
  const tabPw = $('#gate-tab-pw');
  const tabOtp = $('#gate-tab-otp');
  const formPw = $('#gwcrm-pw-form');
  const panelOtp = $('#gwcrm-otp-panel');
  const sendOtpBtn = $('#btn-send-otp');
  const formOtpVerify = $('#gwcrm-otp-verify-form');

  function switchGateTab(which) {
    if (!tabPw || !tabOtp || !formPw || !panelOtp) return;
    if (which === 'otp') {
      tabPw.classList.remove('active');
      tabOtp.classList.add('active');
      formPw.hidden = true;
      panelOtp.hidden = false;
    } else {
      tabOtp.classList.remove('active');
      tabPw.classList.add('active');
      panelOtp.hidden = true;
      formPw.hidden = false;
    }
  }

  if (tabPw) tabPw.addEventListener('click', () => switchGateTab('pw'));
  if (tabOtp) tabOtp.addEventListener('click', () => switchGateTab('otp'));

  if (formPw) {
    formPw.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fb = $('#gate-pw-feedback');
      fb.style.color = 'var(--muted)';
      fb.textContent = 'Authenticating with Twisted23 Gatekeeper...';
      try {
        const res = await fetch('/auth/auth.php?action=login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: $('#gate-username').value.trim(),
            password: $('#gate-password').value,
            remember: $('#gate-remember').checked,
          }),
        });
        const data = await res.json();
        if (data.status === 'otp_required') {
          $('#gate-otp-identity').value = data.username || $('#gate-username').value.trim();
          switchGateTab('otp');
          const otpFb = $('#gate-otp-feedback');
          otpFb.style.color = 'var(--accent)';
          otpFb.textContent = data.message;
          return;
        }
        if (data.status === 'success') {
          fb.style.color = 'var(--ok-text)';
          fb.textContent = `✓ Welcome back, ${data.user.username}! Loading GwCrm...`;
          await refresh();
        } else {
          fb.style.color = '#b91c1c';
          fb.textContent = data.message || 'Invalid credentials.';
        }
      } catch (err) {
        fb.style.color = '#b91c1c';
        fb.textContent = 'Connection error: ' + err.message;
      }
    });
  }

  if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', async () => {
      const identity = ($('#gate-otp-identity').value || '').trim();
      const fb = $('#gate-otp-feedback');
      if (!identity) {
        fb.style.color = '#b91c1c';
        fb.textContent = 'Enter your Call-Sign (Gary or A7si) or email first.';
        return;
      }
      sendOtpBtn.disabled = true;
      fb.style.color = 'var(--muted)';
      fb.textContent = 'Dispatching 6-digit login code via Hostinger Mail API...';
      try {
        const res = await fetch('/auth/auth.php?action=request_code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          fb.style.color = 'var(--ok-text)';
          fb.textContent = `✓ ${data.message}`;
          $('#gate-otp-code').focus();
        } else {
          fb.style.color = '#b91c1c';
          fb.textContent = data.message || 'Could not send code.';
        }
      } catch (err) {
        fb.style.color = '#b91c1c';
        fb.textContent = 'Mail dispatch error: ' + err.message;
      } finally {
        sendOtpBtn.disabled = false;
      }
    });
  }

  if (formOtpVerify) {
    formOtpVerify.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fb = $('#gate-otp-feedback');
      fb.style.color = 'var(--muted)';
      fb.textContent = 'Verifying 6-digit code...';
      try {
        const res = await fetch('/auth/auth.php?action=verify_code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity: $('#gate-otp-identity').value.trim(),
            code: $('#gate-otp-code').value.trim(),
            new_password: $('#gate-otp-newpw').value,
            remember: true,
          }),
        });
        const data = await res.json();
        if (data.status === 'success') {
          fb.style.color = 'var(--ok-text)';
          fb.textContent = `✓ Authenticated as ${data.user.username}! Loading GwCrm...`;
          await refresh();
        } else {
          fb.style.color = '#b91c1c';
          fb.textContent = data.message || 'Verification failed.';
        }
      } catch (err) {
        fb.style.color = '#b91c1c';
        fb.textContent = 'Verification error: ' + err.message;
      }
    });
  }
})();

refresh();

