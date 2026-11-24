(function () {
  "use strict";

  const B38 = "0123456789abcdefghijklmnopqrstuvwxyz|^";
  const T0UX = 1584540571;
  const TRIAD_BASE = 54872;
  const STORAGE_TOKEN_KEY = "tw23_ascender_passport";
  const STORAGE_OBJ_KEY = "tw23_ascender_passport_obj";

  const FALLBACK_DEFINED = {
    0: {
      title: "Threshold Guest",
      trial: "Arrive at Twisted23.com/ascenders/",
      perks: "Live Time0 clock · 575 KB blank/conforming 3-peaks · 385 KB / 2× non-conforming",
    },
    1: {
      title: "SI-in-WiseLy Seeker",
      trial: "Solve the two-part WiseLy riddle: What is 'is' backwards, and what about 'iiiis' backwards?",
      perks: "Signed Portable Acode9 Passport · Ascension Notes starter presets",
    },
    2: {
      title: "MUNSC Scribe",
      trial: "Verify a 9-char Acode9 identifier + a 4-to-7 char case/digit MUNSC cue (e.g. NormA, sbaMLc1, WiseLy)",
      perks: "80/day Wish-Window quota · Custom MUNSC rules & AXIF/1.0 provenance export",
    },
    3: {
      title: "Three-Peaks Navigator",
      trial: "Mint or verify a 15-char conforming 3-peaks code (such as p1b^f5n for pi1browser full5screen)",
      perks: "750 KB conforming image cap · 120/day quota · Pi Browser (p1b^f5n) Full-Screen HUD",
    },
    4: {
      title: "A3odex Keeper",
      trial: "Bind your Passport to a Twisted23 Parlour account (/ucp/) + enter 1 code per 4-tier length (4c, 5c, 6c, 7c)",
      perks: "Site-wide [A^4] Parlour & UCP badge · 1 reserved personal a8a triad",
    },
    5: {
      title: "Spatial & Live-Text Adept",
      trial: "Record a Twisted23 Spatial Gym feat (Botchee, FD, Backgammon, TopHat) or paste an OCR/AXIF excerpt",
      perks: "1 MB conforming image cap · 180/day quota · Personalized aURL shortlink minting",
    },
    6: {
      title: "Bridge Builder (2026 Cap)",
      trial: "Compose a civil phpBBog / Plenty Talk Story [quote=...] packet (30+ chars) or hold a verified AAid pass",
      perks: "2026 Pinnacle [A^6] badge · SLogBog & Life Data Savers Ambassador · 2 reserved a8a triads",
    },
    7: {
      title: "Seventh-Year Steward (2027 Cap)",
      trial: "Opens March 18, 2027 (Time0 Year 7): Co-steward a GPADA Free-Kit / Charity Derby, Pi pool, or Founder seal",
      perks: "2027 Pinnacle [A^7] Steward seal · Priority ecosystem aURLs · 2028 Horizon council seat",
    },
  };

  let state = {
    epochCeiling: computeLocalCeiling(),
    levels: [],
    passport: loadCachedPassportObj(),
    token: loadCachedToken(),
    parlourUser: null,
    selectedLevel: 1,
  };

  function encodeB38(val) {
    let n = Math.max(0, Math.trunc(val));
    if (n === 0) return "0";
    let out = "";
    while (n > 0) {
      out = B38[n % 38] + out;
      n = Math.floor(n / 38);
    }
    return out;
  }

  function decodePeak(s) {
    let tot = 0;
    for (const ch of s) {
      const idx = B38.indexOf(ch === "_" ? "|" : ch === "-" ? "^" : ch);
      if (idx < 0) return 0;
      tot = tot * 38 + idx;
    }
    return tot;
  }

  function mintSampleP1bF5nSlug() {
    const sec = Math.floor(Date.now() / 1000);
    const el = Math.max(0, sec - T0UX);
    const msdVal = Math.floor(el / TRIAD_BASE);
    const lsdVal = el % TRIAD_BASE;
    const msd = encodeB38(msdVal).padStart(3, "0").slice(-3).replace(/0|\|/g, "_").replace(/\^/g, "-");
    const v1 = decodePeak("p1b");
    const v2 = decodePeak("f5n");
    const needed = (((lsdVal - msdVal - v1 - v2) % TRIAD_BASE) + TRIAD_BASE) % TRIAD_BASE;
    const s3 = encodeB38(needed).padStart(3, "0").slice(-3).replace(/\|/g, "_").replace(/\^/g, "-");
    return `${msd}-p1b-f5n-${s3}`;
  }

  function computeLocalCeiling(tsSec = Math.floor(Date.now() / 1000)) {
    if (tsSec <= T0UX) return 0;
    const d = new Date(tsSec * 1000);
    const y = d.getUTCFullYear();
    const anniv = Math.floor(Date.UTC(y, 2, 18, 14, 9, 31) / 1000);
    const yrs = tsSec >= anniv ? y - 2020 : y - 2021;
    return Math.max(0, Math.min(37, yrs));
  }

  function buildFallbackCatalog(ceiling) {
    const arr = [];
    for (let lvl = 0; lvl <= 37; lvl++) {
      const glyph = B38[lvl];
      const unlockYear = 2020 + lvl;
      if (lvl <= 7) {
        arr.push({
          level: lvl,
          glyph,
          unlockYear,
          unlockedByEpoch: lvl <= ceiling,
          shrouded: false,
          ...FALLBACK_DEFINED[lvl],
        });
      } else {
        arr.push({
          level: lvl,
          glyph,
          unlockYear,
          unlockedByEpoch: lvl <= ceiling,
          shrouded: true,
          title: lvl === 36 ? "Ascension Line Horizon (|)" : lvl === 37 ? "Summit Peak (^)" : `Sealed Horizon '${glyph}'`,
          trial: `Sealed by Time0 until March 18, ${unlockYear} (14:09:31Z)`,
          perks: "Veiled beyond the 2027 LeveL 7 horizon",
        });
      }
    }
    return arr;
  }

  function loadCachedToken() {
    try {
      return window.localStorage.getItem(STORAGE_TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  function loadCachedPassportObj() {
    try {
      const raw = window.localStorage.getItem(STORAGE_OBJ_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function savePassportState(passport, token) {
    state.passport = passport;
    if (token) state.token = token;
    try {
      if (token) window.localStorage.setItem(STORAGE_TOKEN_KEY, token);
      if (passport) window.localStorage.setItem(STORAGE_OBJ_KEY, JSON.stringify(passport));
    } catch {}
  }

  function updateLiveClocks() {
    const nowSec = Math.floor(Date.now() / 1000);
    const elapsed = Math.max(0, nowSec - T0UX);
    document.getElementById("live-clock38").textContent = encodeB38(elapsed);
    document.getElementById("live-utc").textContent = new Date(nowSec * 1000).toISOString().replace(".000Z", "Z");

    const ceiling = computeLocalCeiling(nowSec);
    document.getElementById("epoch-ceiling-val").textContent = `LeveL ${ceiling} ('${B38[ceiling]}')`;

    const unlock2027 = Math.floor(Date.UTC(2027, 2, 18, 14, 9, 31) / 1000);
    const rem = Math.max(0, unlock2027 - nowSec);
    if (rem === 0) {
      document.getElementById("next-unlock-countdown").textContent = "OPEN NOW (2027)";
    } else {
      const d = Math.floor(rem / 86400);
      const h = Math.floor((rem % 86400) / 3600);
      const m = Math.floor((rem % 3600) / 60);
      const s = rem % 60;
      document.getElementById("next-unlock-countdown").textContent = `${d}d ${h}h ${m}m ${s}s`;
    }
  }

  function renderPassportCard() {
    const p = state.passport;
    const rank = p?.rank ?? 0;
    const glyph = B38[rank] || "0";
    document.getElementById("passport-orb").textContent = `A^${glyph}`;
    document.getElementById("passport-acode9").textContent = p?.acode9 || "Threshold Guest (Unminted)";
    document.getElementById("passport-owner").textContent = p?.username
      ? `Bound to Parlour Member: ${p.username} · LeveL ${rank}`
      : `Portable HMAC Passport · Current Rank: LeveL ${rank} ('${glyph}')`;

    const kb = rank >= 5 ? "1,024 KB" : rank >= 3 ? "750 KB" : "575 KB";
    const quota = rank >= 5 ? "180/day" : rank >= 3 ? "120/day" : rank >= 2 ? "80/day" : "60/day";
    const reserved = (p?.reservedTriads || []).length
      ? `Reserved a8a: ${p.reservedTriads.join(", ")}`
      : "p1b^f5n 3-Peaks Ready";
    document.getElementById("passport-perks").innerHTML =
      `<span class="perk-pill">${kb} Conforming Cap</span>` +
      `<span class="perk-pill">${quota} Quota</span>` +
      `<span class="perk-pill">${reserved}</span>`;
  }

  function renderGrid() {
    const grid = document.getElementById("glyph-grid");
    const rank = state.passport?.rank ?? 0;
    const levels = state.levels.length ? state.levels : buildFallbackCatalog(state.epochCeiling);
    grid.innerHTML = "";

    levels.forEach((item) => {
      const div = document.createElement("button");
      div.type = "button";
      const classes = ["glyph-tile"];
      if (item.level === state.selectedLevel) classes.push("selected");
      if (item.level > 0 && item.level <= rank) classes.push("achieved");
      if (item.level === 7) classes.push("ceiling-2027");
      if (item.shrouded) classes.push("shrouded");
      div.className = classes.join(" ");
      div.innerHTML =
        `<div class="glyph-char">${item.glyph}</div>` +
        `<div class="glyph-lvl">L${item.level} · '${String(item.unlockYear).slice(2)}</div>`;
      div.addEventListener("click", () => {
        state.selectedLevel = item.level;
        renderGrid();
        renderDetailAndTrial();
      });
      grid.appendChild(div);
    });
  }

  function showFeedback(ok, msg) {
    const el = document.getElementById("trial-feedback");
    el.style.display = "block";
    el.className = ok ? "status-msg ok" : "status-msg err";
    el.textContent = msg;
  }

  function renderDetailAndTrial() {
    const levels = state.levels.length ? state.levels : buildFallbackCatalog(state.epochCeiling);
    const item = levels[state.selectedLevel] || levels[1];
    const rank = state.passport?.rank ?? 0;

    document.getElementById("sel-badge").textContent =
      `LeveL ${item.level} · Base-38 Glyph '${item.glyph}' · Epoch ${item.unlockYear}`;
    document.getElementById("sel-title").textContent = item.title;
    document.getElementById("sel-trial").textContent = item.trial;
    document.getElementById("sel-perks").textContent = item.perks;

    const heading = document.getElementById("trial-form-heading");
    const body = document.getElementById("trial-form-body");
    document.getElementById("trial-feedback").style.display = "none";

    if (item.level === 0) {
      heading.textContent = "LeveL 0 — Welcome to Twisted23.com/ascenders/";
      body.innerHTML = `<p style="color:var(--muted);font-size:0.86rem;margin:0;">You are already at Ground Zero ('0'). Select <strong>LeveL 1 ('1')</strong> to solve the WiseLy riddle and mint your signed <code>Acode9</code> Passport!</p>`;
      return;
    }

    if (item.shrouded || item.level > state.epochCeiling) {
      heading.textContent = `Time0 Epoch Seal — Opens ${item.unlockYear}`;
      body.innerHTML =
        `<p style="color:var(--muted);font-size:0.86rem;margin:0 0 10px;">` +
        (item.level === 7
          ? `Max Ascension LeveL in 2027 is <strong>LeveL 7 ('7')</strong>, unlocking on the 7th Time0 Anniversary (<code>2027-03-18T14:09:31Z</code>, preceded by the March 8 → 18 Miracle Window). Prepare by reaching LeveL 6 ('6') now!`
          : `Rung <code>${item.glyph}</code> (LeveL ${item.level}) remains veiled beyond the 2027 LeveL 7 ceiling until ${item.unlockYear}.`) +
        `</p>`;
      return;
    }

    heading.textContent = rank >= item.level
      ? `✓ LeveL ${item.level} ('${item.glyph}') Unlocked — Re-Verify Anytime`
      : `Trial for LeveL ${item.level} ('${item.glyph}')`;

    if (item.level === 1) {
      body.innerHTML = `
        <div class="field"><label>Part A0ne: What is "is" backwards inside W-[is]-eLy?</label><input id="f-l1-p1" placeholder="si" /></div>
        <div class="field"><label>Part BTw0: What about "iiiis" backwards?</label><input id="f-l1-p2" placeholder="siiii" /></div>
        <button type="button" class="primary" id="btn-submit-trial">Verify LeveL 1 &amp; Mint Passport</button>
      `;
    } else if (item.level === 2) {
      const defAcode = state.passport?.acode9 || "Ab2p^a40z";
      body.innerHTML = `
        <div class="field"><label>9-Char Acode9 Identifier</label><input id="f-l2-acode" value="${defAcode}" /></div>
        <div class="field"><label>4-to-7 Char Case/Digit MUNSC Cue (e.g. NormA, WiseLy, sbaMLc1)</label><input id="f-l2-munsc" value="WiseLy" /></div>
        <button type="button" class="primary" id="btn-submit-trial">Verify LeveL 2 ('2')</button>
      `;
    } else if (item.level === 3) {
      const sample3p = mintSampleP1bF5nSlug();
      body.innerHTML = `
        <div class="field"><label>15-Char Conforming 3-Peaks Slug (e.g. minted with p1b^f5n in /ascenders/wish/)</label><input id="f-l3-slug" value="${sample3p}" /></div>
        <div class="btn-row">
          <button type="button" class="primary" id="btn-submit-trial">Verify LeveL 3 ('3')</button>
          <button type="button" id="btn-remint-3p">Mint Fresh p1b^f5n Slug</button>
        </div>
      `;
      document.getElementById("btn-remint-3p")?.addEventListener("click", () => {
        document.getElementById("f-l3-slug").value = mintSampleP1bF5nSlug();
      });
    } else if (item.level === 4) {
      body.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div class="field"><label>FUNs (4 chars)</label><input id="f-l4-4" value="aURL" maxlength="4" /></div>
          <div class="field"><label>FUNCs (5 chars)</label><input id="f-l4-5" value="GPADA" maxlength="5" /></div>
          <div class="field"><label>SxUNCs (6 chars)</label><input id="f-l4-6" value="WiseLy" maxlength="6" /></div>
          <div class="field"><label>SvnUNCs (7 chars)</label><input id="f-l4-7" value="tLkStry" maxlength="7" /></div>
        </div>
        <div class="field"><label>Optional Personal Reserved a8a Triad ([a-z][1-57-9][a-z])</label><input id="f-l4-triad" placeholder="g7w" maxlength="3" /></div>
        <div class="btn-row">
          <button type="button" class="primary" id="btn-submit-trial">Bind Parlour Account &amp; Unlock LeveL 4</button>
          <a class="nav-pill" href="/ucp/?mode=login&amp;redirect=%2Fascenders%2F">🔑 Parlour Login (/ucp/)</a>
        </div>
      `;
    } else if (item.level === 5) {
      body.innerHTML = `
        <div class="field"><label>AXIF / Live Text++ Note Excerpt (or leave blank if your Parlour stats already have a Spatial Gym score)</label>
        <textarea id="f-l5-axif" rows="2" placeholder="AXIF/1.0 NormA -> Norma dual-layer verified note..."></textarea></div>
        <button type="button" class="primary" id="btn-submit-trial">Verify LeveL 5 ('5')</button>
      `;
    } else if (item.level === 6) {
      body.innerHTML = `
        <div class="field"><label>Civil phpBBog / Plenty Talk Story [quote] Packet</label>
        <textarea id="f-l6-bb" rows="3">[quote="Ascender • Life Data Savers"]Integrating SI in WiseLy -> siiii! Plenty talk story with aloha and pono 4a11.[/quote]</textarea></div>
        <div class="field"><label>2nd Optional Reserved a8a Triad</label><input id="f-l6-triad" placeholder="s1i" maxlength="3" /></div>
        <button type="button" class="primary" id="btn-submit-trial">Verify LeveL 6 ('6' — 2026 Cap)</button>
      `;
    }

    document.getElementById("btn-submit-trial")?.addEventListener("click", () => submitTrial(item.level));
  }

  async function submitTrial(level) {
    const payload = { level };
    if (level === 1) {
      payload.part1 = document.getElementById("f-l1-p1")?.value || "";
      payload.part2 = document.getElementById("f-l1-p2")?.value || "";
    } else if (level === 2) {
      payload.acode9Sample = document.getElementById("f-l2-acode")?.value || "";
      payload.munscCue = document.getElementById("f-l2-munsc")?.value || "";
    } else if (level === 3) {
      payload.threePeaksSlug = document.getElementById("f-l3-slug")?.value || "";
    } else if (level === 4) {
      payload.funs4 = document.getElementById("f-l4-4")?.value || "";
      payload.funcs5 = document.getElementById("f-l4-5")?.value || "";
      payload.sxuncs6 = document.getElementById("f-l4-6")?.value || "";
      payload.svnuncs7 = document.getElementById("f-l4-7")?.value || "";
      payload.reservedTriad = document.getElementById("f-l4-triad")?.value || "";
    } else if (level === 5) {
      payload.axifNote = document.getElementById("f-l5-axif")?.value || "";
    } else if (level === 6) {
      payload.phpbbPacket = document.getElementById("f-l6-bb")?.value || "";
      payload.reservedTriad2 = document.getElementById("f-l6-triad")?.value || "";
    }

    try {
      const headers = { "Content-Type": "application/json" };
      if (state.token) headers["X-Ascender-Passport"] = state.token;
      const res = await fetch("api.php?action=verify_deed", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showFeedback(false, data.error || `Verification failed (${res.status}).`);
        return;
      }
      savePassportState(data.passport, data.token);
      if (level < state.epochCeiling) {
        state.selectedLevel = level + 1;
      }
      renderPassportCard();
      renderGrid();
      renderDetailAndTrial();
      showFeedback(true, `Unlocked LeveL ${data.unlockedLevel} ('${data.unlockedGlyph}')! Passport ${data.passport.acode9} updated.`);
    } catch {
      showFeedback(false, "Server API offline in static preview — deploy to Hostinger to sign HMAC Passports.");
    }
  }

  async function boot() {
    state.levels = buildFallbackCatalog(state.epochCeiling);
    updateLiveClocks();
    setInterval(updateLiveClocks, 1000);
    renderPassportCard();
    renderGrid();
    renderDetailAndTrial();

    try {
      const headers = state.token ? { "X-Ascender-Passport": state.token } : {};
      const res = await fetch("api.php?action=status", { cache: "no-store", headers });
      if (res.ok) {
        const data = await res.json();
        if (data?.ok) {
          state.epochCeiling = data.epochCeiling;
          state.levels = data.levels;
          state.parlourUser = data.parlourUser;
          if (data.passport) {
            savePassportState(data.passport, state.token);
            state.selectedLevel = Math.min(state.epochCeiling, (data.passport.rank || 0) + 1);
          }
          renderPassportCard();
          renderGrid();
          renderDetailAndTrial();
        }
      }
    } catch {
      // Static preview fallback already rendered
    }
  }

  document.getElementById("btn-mint-passport").addEventListener("click", async () => {
    try {
      const headers = { "Content-Type": "application/json" };
      if (state.token) headers["X-Ascender-Passport"] = state.token;
      const res = await fetch("api.php?action=mint_passport", { method: "POST", headers, body: "{}" });
      const data = await res.json();
      if (data?.ok) {
        savePassportState(data.passport, data.token);
        renderPassportCard();
        showFeedback(true, `Minted Portable Acode9 Passport: ${data.passport.acode9}`);
      }
    } catch {
      showFeedback(false, "Deploy /ascenders/api.php on Hostinger to mint HMAC-signed Passports.");
    }
  });

  document.getElementById("btn-copy-passport").addEventListener("click", async () => {
    if (!state.token) {
      showFeedback(false, "Mint a Passport first to copy your portable token.");
      return;
    }
    await navigator.clipboard?.writeText(state.token).catch(() => {});
    showFeedback(true, "Copied portable HMAC Ascender Passport token to clipboard!");
  });

  document.getElementById("btn-import-passport").addEventListener("click", async () => {
    const raw = window.prompt("Paste your portable Ascender Passport token:");
    if (!raw || !raw.trim()) return;
    const tok = raw.trim();
    const res = await fetch("api.php?action=status", {
      cache: "no-store",
      headers: { "X-Ascender-Passport": tok },
    }).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data?.passport) {
        savePassportState(data.passport, tok);
        renderPassportCard();
        renderGrid();
        renderDetailAndTrial();
        showFeedback(true, `Restored Passport ${data.passport.acode9} at LeveL ${data.passport.rank}!`);
        return;
      }
    }
    showFeedback(false, "Invalid or unsigned Passport token.");
  });

  document.getElementById("btn-p1b-f5n").addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  });

  boot();
})();
