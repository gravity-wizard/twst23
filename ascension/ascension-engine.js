(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AscensionEngine = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const B38 = '0123456789abcdefghijklmnopqrstuvwxyz|^';
  const B38_BASE = B38.length; // 38
  const T0UX = 1584540571; // 2020-03-18T14:09:31Z
  const ASCII_LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const ASCII_ALNUM = '0123456789abcdefghijklmnopqrstuvwxyz';
  const AXIF_VERSION = 'AXIF/1.0';

  const DEFAULT_PROTECTED_TOKENS = new Set([
    'Acode9', 'Acodes1a', 'Base38', 'First1a', 'good1a', 'second1a',
    'Hydrogen4', 'AXIF', 'MUNSC', 'MUNSCs', 'SwiftUI', 'macOS', 'iOS',
    'Xcode', 'Time0', 'T0UX', 'phpBB', 'SLogBog', 'Botchee4x4', 'Twisted23',
  ]);

  const DEFAULT_CANONICAL_FORMS = new Set(['Norma', 'Gary', 'Sarah', 'Pete']);

  const LEET_MAP = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
  };

  const DEFAULT_BLOCKED_SUBSTRINGS = [
    'anal', 'anus', 'arse', 'bitch', 'btch', 'cock', 'c0ck', 'cunt', 'damn',
    'dick', 'd1ck', 'dyke', 'fag', 'fck', 'fuk', 'fuck', 'hell', 'jizz',
    'kike', 'klan', 'nazi', 'nig', 'n1g', 'porn', 'p0rn', 'puss', 'rape',
    'shit', 'sh1t', 'slut', 'spic', 'twat', 'wank', 'whor', 'xxx',
  ];

  const DEFAULT_MUNSC_RULES = [
    {
      name: 'munsc_trailing_cap_norma',
      pattern: 'NormA',
      replacement: 'Norma',
      isRegex: false,
      description: "Normalize trailing uppercase MUNSC 'NormA' -> 'Norma'",
    },
    {
      name: 'munsc_leet_4_to_a',
      pattern: 'Norm4',
      replacement: 'Norma',
      isRegex: false,
      description: "Normalize leet-digit MUNSC 'Norm4' -> 'Norma'",
    },
    {
      name: 'munsc_trailing_disambiguator',
      pattern: 'Norma4',
      replacement: 'Norma',
      isRegex: false,
      description: "Normalize trailing disambiguator MUNSC 'Norma4' -> 'Norma'",
    },
  ];

  // --- Base-38 & Jesus Clock (Time0) ---
  function encodeBase38(value) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('Base-38 encoding requires a non-negative integer.');
    }
    if (value === 0) return B38[0];
    const chars = [];
    let n = value;
    while (n > 0) {
      chars.push(B38[n % B38_BASE]);
      n = Math.floor(n / B38_BASE);
    }
    return chars.reverse().join('');
  }

  function decodeBase38(encoded) {
    if (typeof encoded !== 'string' || !encoded.length) {
      throw new Error('Base-38 string must be non-empty.');
    }
    let total = 0;
    for (let i = 0; i < encoded.length; i += 1) {
      const idx = B38.indexOf(encoded[i]);
      if (idx === -1) {
        throw new Error(`Invalid Base-38 char '${encoded[i]}'`);
      }
      total = total * B38_BASE + idx;
    }
    return total;
  }

  function coerceUnixSeconds(timestamp) {
    if (timestamp === undefined || timestamp === null) {
      return Math.floor(Date.now() / 1000);
    }
    if (timestamp instanceof Date) {
      return Math.floor(timestamp.getTime() / 1000);
    }
    if (typeof timestamp === 'number') {
      return Math.floor(timestamp);
    }
    throw new Error('Unsupported timestamp type');
  }

  function jesusClock(timestamp, minWidth = 1) {
    const ts = coerceUnixSeconds(timestamp);
    const elapsed = Math.max(0, ts - T0UX);
    const encoded = encodeBase38(elapsed);
    return encoded.length < minWidth ? encoded.padStart(minWidth, B38[0]) : encoded;
  }

  function decodeJesusClock(clockStr) {
    return T0UX + decodeBase38(clockStr);
  }

  function clock2FromTimestamp(timestamp) {
    return jesusClock(timestamp, 2).slice(0, 2);
  }

  // --- Acode9 ---
  function leadLetterForClockChar(ch) {
    if (typeof ch !== 'string' || ch.length !== 1 || B38.indexOf(ch) === -1) {
      throw new Error(`Invalid clock character: ${ch}`);
    }
    if (ch >= '1' && ch <= '9') {
      return String.fromCharCode(97 + Number(ch) - 1);
    }
    if (ch === '0') return 'z';
    if (ch >= 'a' && ch <= 'z') return ch;
    if (ch === '|') return 'x';
    if (ch === '^') return 'y';
    return 'a';
  }

  function toDash(code) {
    if (typeof code !== 'string' || code.length !== 9 || (code[4] !== '^' && code[4] !== '-')) {
      throw new Error(`Invalid Acode9: ${code}`);
    }
    return `${code.slice(0, 4)}-${code.slice(5)}`;
  }

  function toCaret(code) {
    if (typeof code !== 'string' || code.length !== 9 || (code[4] !== '^' && code[4] !== '-')) {
      throw new Error(`Invalid Acode9: ${code}`);
    }
    return `${code.slice(0, 4)}^${code.slice(5)}`;
  }

  function isCleanId(candidate, blocked = DEFAULT_BLOCKED_SUBSTRINGS) {
    const rawLower = String(candidate || '').toLowerCase();
    const core = rawLower.replace(/[\^\-|]/g, '');
    let leet = '';
    for (let i = 0; i < core.length; i += 1) {
      leet += LEET_MAP[core[i]] || core[i];
    }
    for (const bad of blocked) {
      if (rawLower.includes(bad) || core.includes(bad) || leet.includes(bad)) {
        return false;
      }
    }
    if (core.length >= 4 && new Set(core.slice(-4)).size === 1) {
      return false;
    }
    return true;
  }

  function validateAcode9(code, { allowDash = true, filterProfanity = true } = {}) {
    const reasons = [];
    if (typeof code !== 'string' || code.length !== 9) {
      return { valid: false, reasons: ['Must be 9 characters'] };
    }
    if (code[0] !== 'A') reasons.push('Index 0 must be A');
    const clock2 = code.slice(2, 4);
    for (const c of clock2) {
      if (B38.indexOf(c) === -1) reasons.push(`Invalid clock2 char ${c}`);
    }
    if (!reasons.length) {
      const expectedLead = leadLetterForClockChar(clock2[0]);
      if (code[1] !== expectedLead) {
        reasons.push(`Lead letter '${code[1]}' should be '${expectedLead}' for clock '${clock2[0]}'`);
      }
    }
    const center = code[4];
    if (center !== '^' && !(allowDash && center === '-')) {
      reasons.push(`Invalid center separator '${center}'`);
    }
    const tail = code.slice(5);
    for (const c of tail) {
      if (B38.indexOf(c) === -1) reasons.push(`Invalid tail4 char '${c}'`);
    }
    if (filterProfanity && !isCleanId(code)) {
      reasons.push('Failed YouTube-style clean ID filter');
    }
    return { valid: reasons.length === 0, reasons };
  }

  function generateAcode9(timestamp = null, { mode = 'good1a', urlSafe = false } = {}) {
    const clock2 = clock2FromTimestamp(timestamp);
    const lead = leadLetterForClockChar(clock2[0]);
    const center = urlSafe ? '-' : '^';

    for (let i = 0; i < 120; i += 1) {
      let tail;
      if (mode === 'good1a' || mode === 'second1a') {
        const t0 = ASCII_LOWER[Math.floor(Math.random() * ASCII_LOWER.length)];
        const t1 = ASCII_ALNUM[Math.floor(Math.random() * ASCII_ALNUM.length)];
        const t2 = ASCII_ALNUM[Math.floor(Math.random() * ASCII_ALNUM.length)];
        const t3 = ASCII_LOWER[Math.floor(Math.random() * ASCII_LOWER.length)];
        tail = t0 + t1 + t2 + t3;
      } else {
        tail = Array.from({ length: 4 }, () => B38[Math.floor(Math.random() * B38.length)]).join('');
      }
      const cand = `A${lead}${clock2}${center}${tail}`;
      if (isCleanId(cand) && validateAcode9(cand, { allowDash: true, filterProfanity: true }).valid) {
        return cand;
      }
    }
    return `A${lead}${clock2}${center}aktx`;
  }

  // --- Synchronous FNV-1a / WebCrypto helper ---
  function quickFingerprintSync(str) {
    let h1 = 0x811c9dc5;
    let h2 = 0x811c9dc5;
    for (let i = 0; i < str.length; i += 1) {
      const c = str.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 0x01000193);
      h2 ^= (c + i);
      h2 = Math.imul(h2, 0x01000193);
    }
    return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  }

  async function sha256Hex(str) {
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle && typeof TextEncoder !== 'undefined') {
      const buf = new TextEncoder().encode(str);
      const digest = await globalThis.crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    try {
      // eslint-disable-next-line global-require
      const nodeCrypto = require('crypto');
      return nodeCrypto.createHash('sha256').update(str, 'utf8').digest('hex');
    } catch (_) {
      return `fnv64:${quickFingerprintSync(str)}`;
    }
  }

  // --- MUNSC & AXIF Engine ---
  const TOKEN_SCAN_RE = /A[a-z][0-9a-z|^]{2}[\^\-][0-9a-z|^]{4}|[A-Za-z0-9]+/g;
  const TRAILING_CAP_RE = /^[A-Z][a-z]{2,}[A-Z]$/;
  const INTERNAL_LEET_RE = /^[A-Za-z]+[013457][A-Za-z]+$/;
  const TRAILING_LEET_CONSONANT_RE = /^[A-Z][a-z]+[bcdfghjklmnpqrstvwxyz][013457]$/;
  const TRAILING_DIGIT_RE = /^[A-Za-z]{2,}[0-9]$/;

  function applyMunscRule(rule, token) {
    if (!rule || !rule.pattern) return null;
    if (rule.isRegex) {
      try {
        const re = new RegExp(rule.pattern, 'g');
        const next = token.replace(re, rule.replacement || '');
        return next !== token ? next : null;
      } catch (_) {
        return null;
      }
    }
    return token === rule.pattern && rule.replacement !== token ? rule.replacement : null;
  }

  function normalizeMunscToken(token, {
    rules = [],
    canonicalForms = DEFAULT_CANONICAL_FORMS,
    protectedTokens = DEFAULT_PROTECTED_TOKENS,
    autoDetect = true,
  } = {}) {
    if (!token) return null;
    const protSet = protectedTokens instanceof Set ? protectedTokens : new Set(protectedTokens);
    const canonSet = canonicalForms instanceof Set ? canonicalForms : new Set(canonicalForms);
    if (protSet.has(token)) return null;
    if (token.length === 9 && validateAcode9(token, { filterProfanity: false }).valid) {
      return null;
    }

    for (const rule of rules) {
      const replaced = applyMunscRule(rule, token);
      if (replaced !== null) {
        return { normalizedForm: replaced, ruleName: rule.name || 'custom_rule' };
      }
    }

    for (const rule of DEFAULT_MUNSC_RULES) {
      const replaced = applyMunscRule(rule, token);
      if (replaced !== null) {
        return { normalizedForm: replaced, ruleName: rule.name };
      }
    }

    if (!autoDetect) return null;

    if (TRAILING_CAP_RE.test(token)) {
      return {
        normalizedForm: token.slice(0, -1) + token.slice(-1).toLowerCase(),
        ruleName: 'munsc_trailing_cap',
      };
    }

    if (INTERNAL_LEET_RE.test(token)) {
      let normalized = '';
      for (let i = 0; i < token.length; i += 1) {
        normalized += LEET_MAP[token[i]] || token[i];
      }
      if (normalized !== token) {
        return { normalizedForm: normalized, ruleName: 'munsc_internal_leet' };
      }
    }

    if (TRAILING_LEET_CONSONANT_RE.test(token)) {
      const last = token[token.length - 1];
      return {
        normalizedForm: token.slice(0, -1) + (LEET_MAP[last] || last),
        ruleName: 'munsc_trailing_leet',
      };
    }

    if (TRAILING_DIGIT_RE.test(token) && canonSet.has(token.slice(0, -1))) {
      return {
        normalizedForm: token.slice(0, -1),
        ruleName: 'munsc_trailing_disambiguator',
      };
    }

    return null;
  }

  function compileAXIF(rawText, {
    ownerAcode9 = null,
    rules = [],
    canonicalForms = DEFAULT_CANONICAL_FORMS,
    protectedTokens = DEFAULT_PROTECTED_TOKENS,
    autoDetect = true,
    timestamp = null,
  } = {}) {
    const raw = String(rawText || '');
    const acode = ownerAcode9 || generateAcode9(timestamp, { mode: 'good1a' });
    const clock = jesusClock(timestamp);

    const normParts = [];
    const entries = [];
    const segments = [];
    let rawCursor = 0;
    let normCursor = 0;

    TOKEN_SCAN_RE.lastIndex = 0;
    let match;
    while ((match = TOKEN_SCAN_RE.exec(raw)) !== null) {
      const start = match.index;
      const token = match[0];
      const end = start + token.length;

      if (start > rawCursor) {
        const plain = raw.slice(rawCursor, start);
        normParts.push(plain);
        segments.push({
          rawStart: rawCursor,
          rawEnd: start,
          normStart: normCursor,
          normEnd: normCursor + plain.length,
          axifEntry: null,
        });
        normCursor += plain.length;
      }

      const res = normalizeMunscToken(token, {
        rules,
        canonicalForms,
        protectedTokens,
        autoDetect,
      });

      if (res) {
        const entry = {
          token,
          normalized_form: res.normalizedForm,
          offset: start,
          length: token.length,
          normalized_offset: normCursor,
          normalized_length: res.normalizedForm.length,
          acode9: acode,
          munsc_rule: res.ruleName,
        };
        entries.push(entry);
        normParts.push(res.normalizedForm);
        segments.push({
          rawStart: start,
          rawEnd: end,
          normStart: normCursor,
          normEnd: normCursor + res.normalizedForm.length,
          axifEntry: entry,
        });
        normCursor += res.normalizedForm.length;
      } else {
        normParts.push(token);
        segments.push({
          rawStart: start,
          rawEnd: end,
          normStart: normCursor,
          normEnd: normCursor + token.length,
          axifEntry: null,
        });
        normCursor += token.length;
      }

      rawCursor = end;
    }

    if (rawCursor < raw.length) {
      const tail = raw.slice(rawCursor);
      normParts.push(tail);
      segments.push({
        rawStart: rawCursor,
        rawEnd: raw.length,
        normStart: normCursor,
        normEnd: normCursor + tail.length,
        axifEntry: null,
      });
    }

    const normalizedText = normParts.join('');
    return {
      acode9: acode,
      jesusClock: clock,
      rawText: raw,
      normalizedText,
      segments,
      entries,
      rules: [...DEFAULT_MUNSC_RULES, ...rules],
      axif: {
        version: AXIF_VERSION,
        acode9: acode,
        jesus_clock: clock,
        raw_sha256: `fnv64:${quickFingerprintSync(raw)}`,
        normalized_sha256: `fnv64:${quickFingerprintSync(normalizedText)}`,
        munsc_count: entries.length,
        entries,
        rules: [...DEFAULT_MUNSC_RULES, ...rules],
      },
    };
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function lineColAt(text, offset) {
    const clamped = Math.max(0, Math.min(offset, text.length));
    const prefix = text.slice(0, clamped);
    const lines = prefix.split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
    };
  }

  function snippetAround(text, start, end, radius = 28) {
    const left = Math.max(0, start - radius);
    const right = Math.min(text.length, end + radius);
    return `${left > 0 ? '...' : ''}${text.slice(left, right)}${right < text.length ? '...' : ''}`;
  }

  function mapRawSpanToNorm(segments, rawStart, rawEnd) {
    const starts = [];
    const ends = [];
    let matchedEntry = null;
    for (const seg of segments) {
      if (seg.rawEnd <= rawStart || seg.rawStart >= rawEnd) continue;
      if (seg.axifEntry) {
        matchedEntry = seg.axifEntry;
        starts.push(seg.normStart);
        ends.push(seg.normEnd);
      } else {
        const dStart = Math.max(0, rawStart - seg.rawStart);
        const dEnd = Math.min(seg.rawEnd, rawEnd) - seg.rawStart;
        starts.push(seg.normStart + dStart);
        ends.push(seg.normStart + dEnd);
      }
    }
    if (!starts.length) return { start: rawStart, end: rawEnd, entry: null };
    return { start: Math.min(...starts), end: Math.max(...ends), entry: matchedEntry };
  }

  function mapNormSpanToRaw(segments, normStart, normEnd) {
    const starts = [];
    const ends = [];
    let matchedEntry = null;
    for (const seg of segments) {
      if (seg.normEnd <= normStart || seg.normStart >= normEnd) continue;
      if (seg.axifEntry) {
        matchedEntry = seg.axifEntry;
        starts.push(seg.rawStart);
        ends.push(seg.rawEnd);
      } else {
        const dStart = Math.max(0, normStart - seg.normStart);
        const dEnd = Math.min(seg.normEnd, normEnd) - seg.normStart;
        starts.push(seg.rawStart + dStart);
        ends.push(seg.rawStart + dEnd);
      }
    }
    if (!starts.length) return { start: normStart, end: normEnd, entry: null };
    return { start: Math.min(...starts), end: Math.max(...ends), entry: matchedEntry };
  }

  function searchNote(doc, query, {
    caseSensitive = true,
    wholeWord = false,
    regex = false,
    viewLayer = 'dual',
  } = {}) {
    if (!query || !doc) return { matches: [], error: null };

    let body = regex ? query : escapeRegExp(query);
    if (wholeWord) {
      body = `\\b(?:${body})\\b`;
    }
    let pattern;
    try {
      pattern = new RegExp(body, caseSensitive ? 'g' : 'gi');
    } catch (err) {
      return { matches: [], error: err.message };
    }

    const matches = [];
    const seenNormKeys = new Set();

    if (viewLayer === 'dual' || viewLayer === 'raw') {
      pattern.lastIndex = 0;
      let m;
      while ((m = pattern.exec(doc.rawText)) !== null) {
        if (m[0].length === 0) {
          pattern.lastIndex += 1;
          continue;
        }
        const rawStart = m.index;
        const rawEnd = rawStart + m[0].length;
        const mapped = mapRawSpanToNorm(doc.segments, rawStart, rawEnd);
        seenNormKeys.add(`${mapped.start}:${mapped.end}`);
        const lc = lineColAt(doc.normalizedText, mapped.start);
        matches.push({
          query,
          matchedText: m[0],
          layer: viewLayer === 'raw' ? 'raw' : 'dual:raw',
          rawOffset: rawStart,
          rawEnd,
          normalizedOffset: mapped.start,
          normalizedEnd: mapped.end,
          line: lc.line,
          column: lc.column,
          snippet: snippetAround(doc.normalizedText, mapped.start, mapped.end),
          rawSnippet: snippetAround(doc.rawText, rawStart, rawEnd),
          axifEntry: mapped.entry,
          acode9: doc.acode9,
        });
      }
    }

    if (viewLayer === 'dual' || viewLayer === 'normalized') {
      pattern.lastIndex = 0;
      let m;
      while ((m = pattern.exec(doc.normalizedText)) !== null) {
        if (m[0].length === 0) {
          pattern.lastIndex += 1;
          continue;
        }
        const normStart = m.index;
        const normEnd = normStart + m[0].length;
        const spanKey = `${normStart}:${normEnd}`;
        if (viewLayer === 'dual' && seenNormKeys.has(spanKey)) continue;
        const mapped = mapNormSpanToRaw(doc.segments, normStart, normEnd);
        const lc = lineColAt(doc.normalizedText, normStart);
        matches.push({
          query,
          matchedText: m[0],
          layer: viewLayer === 'normalized' ? 'normalized' : 'dual:normalized',
          rawOffset: mapped.start,
          rawEnd: mapped.end,
          normalizedOffset: normStart,
          normalizedEnd: normEnd,
          line: lc.line,
          column: lc.column,
          snippet: snippetAround(doc.normalizedText, normStart, normEnd),
          rawSnippet: snippetAround(doc.rawText, mapped.start, mapped.end),
          axifEntry: mapped.entry,
          acode9: doc.acode9,
        });
      }
    }

    matches.sort((a, b) => a.normalizedOffset - b.normalizedOffset);
    return { matches, error: null };
  }

  // --- Popular & Niche Forum Exporters ---
  function wrapLineBalanced(line, maxWidth = 68) {
    const trimmed = line.trim();
    if (trimmed.length <= maxWidth || /^(\s*[-*#>`|]|\d+\.)/.test(line)) {
      return line;
    }
    const words = trimmed.split(/\s+/);
    const totalLen = words.reduce((acc, w) => acc + w.length, 0) + Math.max(0, words.length - 1);
    const numLines = Math.ceil(totalLen / maxWidth);
    const targetWidth = Math.ceil(totalLen / numLines);
    const out = [];
    let cur = '';
    for (const w of words) {
      if (!cur) {
        cur = w;
      } else if (cur.length + 1 + w.length <= Math.max(targetWidth, Math.min(maxWidth, cur.length + 1 + w.length))) {
        if (cur.length + 1 + w.length <= maxWidth && (cur.length < targetWidth || cur.length + 1 + w.length - targetWidth < 8)) {
          cur += ` ${w}`;
        } else {
          out.push(cur);
          cur = w;
        }
      } else {
        out.push(cur);
        cur = w;
      }
    }
    if (cur) out.push(cur);
    return out.join('\n');
  }

  function applyLineBalance(text, enabled) {
    if (!enabled) return text;
    return String(text || '').split('\n').map((l) => wrapLineBalanced(l, 68)).join('\n');
  }

  function inlineToBBCode(text, { richCode = false } = {}) {
    return text
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '[url=$2]$1[/url]')
      .replace(/\*\*([^*]+)\*\*/g, '[b]$1[/b]')
      .replace(/\*([^*]+)\*/g, '[i]$1[/i]')
      .replace(/`([^`]+)`/g, richCode ? '[ICODE]$1[/ICODE]' : '[code]$1[/code]');
  }

  function mdToBBCode(text, { variant = 'phpbb' } = {}) {
    const lines = String(text || '').split('\n');
    const out = [];
    let inList = false;
    let inFence = false;

    const closeList = () => {
      if (inList) {
        out.push('[/list]');
        inList = false;
      }
    };

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (trimmed.startsWith('```')) {
        closeList();
        if (!inFence) {
          out.push('[code]');
          inFence = true;
        } else {
          out.push('[/code]');
          inFence = false;
        }
        continue;
      }
      if (inFence) {
        out.push(rawLine);
        continue;
      }
      if (/^#{1,3}\s+/.test(trimmed)) {
        closeList();
        const heading = trimmed.replace(/^#{1,3}\s+/, '');
        if (variant === 'xenforo') {
          out.push(`[HEADING=2]${inlineToBBCode(heading, { richCode: true })}[/HEADING]`);
        } else if (variant === 'retro') {
          out.push(`[b][u]${inlineToBBCode(heading)}[/u][/b]`);
        } else {
          out.push(`[size=130][b]${inlineToBBCode(heading)}[/b][/size]`);
        }
        continue;
      }
      if (/^>\s+/.test(trimmed)) {
        closeList();
        out.push(`[quote]${inlineToBBCode(trimmed.slice(2), { richCode: variant === 'xenforo' })}[/quote]`);
        continue;
      }
      if (/^[-*]\s+/.test(trimmed)) {
        if (!inList) {
          out.push('[list]');
          inList = true;
        }
        out.push(`[*]${inlineToBBCode(trimmed.replace(/^[-*]\s+/, ''), { richCode: variant === 'xenforo' })}`);
        continue;
      }
      if (trimmed === '---') {
        closeList();
        out.push(variant === 'retro' ? '----------------------------------------' : '[hr][/hr]');
        continue;
      }
      closeList();
      out.push(inlineToBBCode(rawLine, { richCode: variant === 'xenforo' }));
    }
    closeList();
    if (inFence) out.push('[/code]');
    return out.join('\n');
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function mdToCleanHtml(text, title, acode9, jesusClockStr, includeFooter) {
    const lines = String(text || '').split('\n');
    const parts = [];
    let inList = false;

    const inlineHtml = (line) => {
      let out = escapeHtml(line);
      out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
      out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      return out;
    };
    const closeList = () => {
      if (inList) { parts.push('</ul>'); inList = false; }
    };

    for (const rawLine of lines) {
      const t = rawLine.trim();
      if (!t) { closeList(); continue; }
      if (/^#\s+/.test(t)) { closeList(); parts.push(`  <h2>${inlineHtml(t.slice(2))}</h2>`); continue; }
      if (/^##\s+/.test(t)) { closeList(); parts.push(`  <h3>${inlineHtml(t.slice(3))}</h3>`); continue; }
      if (/^###\s+/.test(t)) { closeList(); parts.push(`  <h4>${inlineHtml(t.slice(4))}</h4>`); continue; }
      if (/^>\s+/.test(t)) { closeList(); parts.push(`  <blockquote>${inlineHtml(t.slice(2))}</blockquote>`); continue; }
      if (/^[-*]\s+/.test(t)) {
        if (!inList) { parts.push('  <ul>'); inList = true; }
        parts.push(`    <li>${inlineHtml(t.replace(/^[-*]\s+/, ''))}</li>`);
        continue;
      }
      closeList();
      parts.push(`  <p>${inlineHtml(t)}</p>`);
    }
    closeList();

    const footer = includeFooter
      ? `\n  <footer class="axif-provenance">\n    <small>Acode9: <code>${escapeHtml(acode9)}</code> &middot; Time0: <code>${escapeHtml(jesusClockStr)}</code> &middot; Ascension Notes Web</small>\n  </footer>`
      : '';

    return `<article class="ascension-note" data-title="${escapeHtml(title)}" data-acode9="${escapeHtml(acode9)}">\n${parts.join('\n')}${footer}\n</article>`;
  }

  function splitMicroThread(text, limit = 440, stamp = '') {
    const blocks = String(text || '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
    const chunks = [];
    let current = '';

    for (const block of blocks) {
      if (!current) {
        if (block.length <= limit) {
          current = block;
        } else {
          // Sentence split long paragraphs safely
          const words = block.split(/\s+/);
          let line = '';
          for (const w of words) {
            if (`${line} ${w}`.trim().length > limit - 20) {
              if (line) chunks.push(line.trim());
              line = w;
            } else {
              line = line ? `${line} ${w}` : w;
            }
          }
          current = line;
        }
      } else if (`${current}\n\n${block}`.length <= limit - 20) {
        current = `${current}\n\n${block}`;
      } else {
        chunks.push(current);
        current = block;
      }
    }
    if (current) chunks.push(current);
    if (!chunks.length) chunks.push('');

    const total = chunks.length;
    return chunks.map((body, idx) => {
      const header = total > 1 ? `(${idx + 1}/${total}) ` : '';
      const tail = (idx === total - 1 && stamp) ? `\n\n${stamp}` : '';
      return `${header}${body}${tail}`;
    }).join('\n\n---\n\n');
  }

  const FORUM_FORMATS = [
    { id: 'phpbb', name: 'phpBB / SLogBog BBCode', ext: 'bbcode', category: 'Classic & Niche Forums' },
    { id: 'xenforo', name: 'XenForo / vBulletin / MyBB BBCode', ext: 'bbcode', category: 'Enthusiast Forums' },
    { id: 'reddit', name: 'Reddit & Old-Reddit Markdown', ext: 'md', category: 'Popular Forums' },
    { id: 'commonmark', name: 'Discord / Discourse / GitHub / Lemmy', ext: 'md', category: 'Modern Communities' },
    { id: 'retro_board', name: 'SMF / Niche Legacy Board BBCode', ext: 'txt', category: 'Niche / Retro Boards' },
    { id: 'micro_thread', name: 'Mastodon / Bluesky / Substack Thread', ext: 'txt', category: 'Micro-Forums & Feeds' },
    { id: 'html', name: 'Clean HTML5 Article', ext: 'html', category: 'Web & Newsletters' },
    { id: 'axif_json', name: 'Verifiable AXIF/1.0 JSON', ext: 'axif.json', category: 'Machine Provenance' },
  ];

  function exportForForum(doc, {
    format = 'phpbb',
    title = 'Ascension Note',
    layer = 'normalized',
    includeFooter = true,
    balanceLines = true,
    sourceUrl = 'https://twisted23.com/ascension/',
  } = {}) {
    if (!doc) return '';
    const baseText = layer === 'raw' ? doc.rawText : doc.normalizedText;
    const text = applyLineBalance(baseText, balanceLines);
    const acode = doc.acode9;
    const jClock = doc.jesusClock;
    const munscCount = doc.entries.length;

    switch (format) {
      case 'phpbb': {
        const body = mdToBBCode(`[b]${title}[/b]\n\n${text}`, { variant: 'phpbb' });
        if (!includeFooter) return body;
        return `${body}\n\n[size=85][color=#57534e]Ascension Notes AXIF · Acode9: [url=${sourceUrl}]${acode}[/url] · Time0: ${jClock} · MUNSC cues indexed: ${munscCount}[/color][/size]`;
      }
      case 'xenforo': {
        const body = mdToBBCode(`# ${title}\n\n${text}`, { variant: 'xenforo' });
        if (!includeFooter) return body;
        const entrySummary = doc.entries.length
          ? doc.entries.map((e) => `${e.token} -> ${e.normalized_form} @${e.offset} (${e.munsc_rule})`).join('\n')
          : 'No MUNSC substitutions';
        return `${body}\n\n[SPOILER="AXIF/1.0 Provenance · ${acode} (Time0 ${jClock})"]\n[CODE]\n${entrySummary}\n[/CODE]\n[/SPOILER]`;
      }
      case 'reddit': {
        const header = title ? `## ${title}\n\n` : '';
        if (!includeFooter) return `${header}${text}`;
        return `${header}${text}\n\n---\n\n^(Ascension Notes · Acode9 \`${acode}\` · Time0 \`${jClock}\` · Formatted via [twisted23.com/ascension](${sourceUrl}))`;
      }
      case 'commonmark': {
        const header = title ? `## ${title}\n\n` : '';
        if (!includeFooter) return `${header}${text}`;
        return `${header}${text}\n\n> **AXIF Provenance:** \`${acode}\` · Time0 \`${jClock}\` · ${munscCount} case-sensitive MUNSC cue(s) indexed`;
      }
      case 'retro_board': {
        const body = mdToBBCode(`# ${title}\n\n${text}`, { variant: 'retro' });
        if (!includeFooter) return body;
        return `${body}\n\n----------------------------------------\nAcode9: ${acode} | Time0: ${jClock} | Layer: ${layer}`;
      }
      case 'micro_thread': {
        const stamp = includeFooter ? `#AscensionNotes · Acode9 ${acode} (${jClock})` : '';
        return splitMicroThread(`${title}\n\n${text}`, 440, stamp);
      }
      case 'html': {
        return mdToCleanHtml(text, title, acode, jClock, includeFooter);
      }
      case 'axif_json': {
        return JSON.stringify({
          title,
          layer_rendered: layer,
          normalized_text: doc.normalizedText,
          raw_text: doc.rawText,
          axif: doc.axif,
        }, null, 2);
      }
      default:
        return text;
    }
  }

  return {
    B38,
    T0UX,
    AXIF_VERSION,
    DEFAULT_PROTECTED_TOKENS,
    DEFAULT_CANONICAL_FORMS,
    DEFAULT_MUNSC_RULES,
    FORUM_FORMATS,
    encodeBase38,
    decodeBase38,
    jesusClock,
    decodeJesusClock,
    clock2FromTimestamp,
    leadLetterForClockChar,
    toDash,
    toCaret,
    isCleanId,
    validateAcode9,
    generateAcode9,
    sha256Hex,
    normalizeMunscToken,
    compileAXIF,
    searchNote,
    applyLineBalance,
    exportForForum,
  };
}));
