import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const E = require('./ascension-engine.js');

// 1. Base-38 & Jesus Clock parity with Python ascension-notes
assert.equal(E.B38.length, 38);
assert.equal(E.T0UX, 1584540571);
assert.equal(E.encodeBase38(0), '0');
assert.equal(E.encodeBase38(38), '10');
assert.equal(E.decodeBase38('10'), 38);
assert.equal(E.jesusClock(1584540571), '0');
assert.equal(E.jesusClock(1584540571 - 500), '0');

// Exact timestamp vector from Python test_ascension.py: 2026-11-20T19:12:31Z -> 2p15ek
const ts2026 = Math.floor(Date.parse('2026-11-20T19:12:31Z') / 1000);
assert.equal(E.jesusClock(ts2026), '2p15ek');
assert.equal(E.clock2FromTimestamp(ts2026), '2p');

// 2. Acode9 validation & caret <-> dash conversion
assert.equal(E.validateAcode9('Ab2p^a40z').valid, true);
assert.equal(E.validateAcode9('Ac3x^chch').valid, true);
assert.equal(E.toDash('Ab2p^a40z'), 'Ab2p-a40z');
assert.equal(E.toCaret('Ab2p-a40z'), 'Ab2p^a40z');
assert.equal(E.validateAcode9('Zz2p^a40z').valid, false);

const minted = E.generateAcode9(ts2026, { mode: 'good1a' });
assert.equal(minted.length, 9);
assert.ok(minted.startsWith('Ab2p^'));
assert.equal(E.validateAcode9(minted).valid, true);

// 3. MUNSC normalization & AXIF span mapping
const sampleRaw = 'NormA met Norm4 and Norma4 near Acode9 Ab2p^a40z and Hydrogen4.';
const doc = E.compileAXIF(sampleRaw, { ownerAcode9: 'Ab2p^a40z', timestamp: ts2026 });

assert.equal(doc.normalizedText, 'Norma met Norma and Norma near Acode9 Ab2p^a40z and Hydrogen4.');
assert.equal(doc.entries.length, 3);
assert.deepEqual(
  doc.entries.map((x) => [x.token, x.normalized_form, x.munsc_rule]),
  [
    ['NormA', 'Norma', 'munsc_trailing_cap_norma'],
    ['Norm4', 'Norma', 'munsc_leet_4_to_a'],
    ['Norma4', 'Norma', 'munsc_trailing_disambiguator'],
  ]
);

// Protected tokens & Acode9 untouched
assert.ok(doc.normalizedText.includes('Hydrogen4'));
assert.ok(doc.normalizedText.includes('Ab2p^a40z'));

// 4. Xcode-style case-sensitive dual-layer search
const sNormA_CS = E.searchNote(doc, 'NormA', { caseSensitive: true, viewLayer: 'dual' });
assert.equal(sNormA_CS.matches.length, 1);
assert.equal(sNormA_CS.matches[0].matchedText, 'NormA');
assert.equal(sNormA_CS.matches[0].normalizedOffset, 0);

const sNorma_CS = E.searchNote(doc, 'Norma', { caseSensitive: true, viewLayer: 'normalized' });
assert.equal(sNorma_CS.matches.length, 3);

const sNorma_CI = E.searchNote(doc, 'norma', { caseSensitive: false, wholeWord: true, viewLayer: 'normalized' });
assert.equal(sNorma_CI.matches.length, 3);

const sRegex = E.searchNote(doc, 'Norm[A4]', { caseSensitive: true, regex: true, viewLayer: 'raw' });
assert.equal(sRegex.matches.length, 2); // NormA & Norm4

// 5. All 8 Popular & Niche Forum Exporters
assert.equal(E.FORUM_FORMATS.length, 8);
const markdownInput = '# Friday Search Note\n\nNormA met Norm4 in **Apple Notes** with `Norma `.\n\n> Keep search crisp.\n\n- Check phpBB\n- Check Reddit';
const fDoc = E.compileAXIF(markdownInput, { ownerAcode9: 'Ab2p^a40z', timestamp: ts2026 });

const outPhpbb = E.exportForForum(fDoc, { format: 'phpbb', title: 'Friday Note', layer: 'normalized' });
assert.ok(outPhpbb.includes('[b]Apple Notes[/b]'));
assert.ok(outPhpbb.includes('[quote]Keep search crisp.[/quote]'));
assert.ok(outPhpbb.includes('[list]'));
assert.ok(outPhpbb.includes('Ab2p^a40z'));

const outXenforo = E.exportForForum(fDoc, { format: 'xenforo', title: 'Friday Note', layer: 'normalized' });
assert.ok(outXenforo.includes('[HEADING=2]'));
assert.ok(outXenforo.includes('[ICODE]Norma [/ICODE]'));
assert.ok(outXenforo.includes('[SPOILER='));

const outReddit = E.exportForForum(fDoc, { format: 'reddit', title: 'Friday Note', layer: 'normalized' });
assert.ok(outReddit.includes('## Friday Note'));
assert.ok(outReddit.includes('^(Ascension Notes'));

const outCommon = E.exportForForum(fDoc, { format: 'commonmark', title: 'Friday Note', layer: 'normalized' });
assert.ok(outCommon.includes('**AXIF Provenance:**'));

const outRetro = E.exportForForum(fDoc, { format: 'retro_board', title: 'Friday Note', layer: 'raw' });
assert.ok(outRetro.includes('[b][u]'));
assert.ok(outRetro.includes('NormA met Norm4'));

const longDoc = E.compileAXIF(Array.from({ length: 18 }, (_, i) => `Paragraph ${i + 1}: NormA beat Prefix Flood in search tests cleanly.`).join('\n\n'), {
  ownerAcode9: 'Ab2p^a40z',
  timestamp: ts2026,
});
const outMicro = E.exportForForum(longDoc, { format: 'micro_thread', title: 'Thread Test', layer: 'normalized' });
assert.ok(outMicro.includes('(1/'));
assert.ok(outMicro.includes('#AscensionNotes'));

const outHtml = E.exportForForum(fDoc, { format: 'html', title: 'Friday Note', layer: 'normalized' });
assert.ok(outHtml.includes('<article class="ascension-note"'));
assert.ok(outHtml.includes('data-acode9="Ab2p^a40z"'));

const outJson = JSON.parse(E.exportForForum(fDoc, { format: 'axif_json', title: 'Friday Note', layer: 'normalized' }));
assert.equal(outJson.axif.acode9, 'Ab2p^a40z');
assert.equal(outJson.axif.jesus_clock, '2p15ek');
assert.equal(outJson.axif.munsc_count, 2);

console.log('ALL_ASCENSION_WEB_ENGINE_TESTS_PASSED (8/8 formats + dual-layer Aa search + Base38/Acode9)');
