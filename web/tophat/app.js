/**
 * Top Hat Puzzle & Top Hat Sudoku — UI, SVG Diamond Renderer & Controller
 * Built for tophatpuzzle.twisted23.com & tophatsudoku.twisted23.com
 */

(function () {
  'use strict';

  const Engine = window.TopHatEngine;

  // Application State
  const state = {
    edition: window.DEFAULT_EDITION || 'classic', // 'classic' (TopHatPuzzle 2007) | 'modern' (TopHatSudoku)
    playMode: 'practice',                        // 'practice' (Unlimited) | 'official' (ELO Ranked)
    difficulty: 'easy',                          // 'easy' (11 clues) | 'medium' (8 clues)
    puzzle: null,
    board: new Array(24).fill(0),
    givenMask: new Array(24).fill(false),
    notes: Array.from({ length: 24 }, () => new Set()),
    notesMode: false,
    selectedCell: 0,
    activeDigit: null,
    lastPlacedCell: -1,
    completedRegions: new Set(),
    soundEnabled: true,
    activeRegionId: 'hat-tl',                    // Highlighted region in explorer / board
    showCheckedConflicts: false,
    checkPenalties: 0,
    solved: false,
    elapsedSeconds: 0,
    timerId: null
  };

  // Web Audio API Happy Sound Synthesizer (zero external assets, Safari-safe)
  let audioCtx = null;
  function getAudioCtx() {
    if (!state.soundEnabled) return null;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    return audioCtx;
  }

  function scheduleTone(ctx, freq, duration, type, gainVal, delay) {
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playTone(freq, duration = 0.09, type = 'sine', gainVal = 0.12, delay = 0) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        scheduleTone(ctx, freq, duration, type, gainVal, delay);
      }).catch(() => {});
    } else {
      scheduleTone(ctx, freq, duration, type, gainVal, delay);
    }
  }

  function playPlaceSound(digit) {
    const scale = [392, 440, 493.88, 523.25, 587.33, 659.25];
    playTone(scale[(digit - 1) % 6], 0.08, 'triangle', 0.07);
  }

  function playRegionChime() {
    playTone(587.33, 0.12, 'sine', 0.08, 0);
    playTone(880, 0.18, 'sine', 0.08, 0.08);
  }

  function playVictoryFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      playTone(f, idx === 3 ? 0.42 : 0.15, 'triangle', 0.11, idx * 0.09);
    });
  }

  function getCompletedRegionIds(board) {
    const done = new Set();
    Engine.REGIONS.forEach((r) => {
      const vals = r.cells.map(i => board[i]);
      if (vals.every(v => v >= 1 && v <= 6) && new Set(vals).size === 6) {
        done.add(r.id);
      }
    });
    return done;
  }

  // SVG Geometry Constants
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CENTER_X = 260;
  const CENTER_Y = 250;
  const HALF_DIAG = 38; // S: distance from square center to each of its 4 diamond vertices

  function cellCenter(cell) {
    return {
      cx: CENTER_X + (cell.u - cell.v) * HALF_DIAG,
      cy: CENTER_Y + (cell.u + cell.v - 5) * HALF_DIAG
    };
  }

  function createSvgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) {
        el.setAttribute(k, attrs[k]);
      }
    }
    return el;
  }

  /**
   * Compute outer boundary segments of any set of cell indices so we can draw
   * the exact bold outline for the Top-Left Hat or any selected region.
   */
  function getRegionBoundarySegments(cellIndices, scale = HALF_DIAG, ox = CENTER_X, oy = CENTER_Y) {
    const uvSet = new Set();
    const cells = cellIndices.map(i => Engine.CELLS[i]);
    cells.forEach(c => uvSet.add(`${c.u},${c.v}`));

    const segments = [];
    cells.forEach(c => {
      const cx = ox + (c.u - c.v) * scale;
      const cy = oy + (c.u + c.v - 5) * scale;
      const top = { x: cx, y: cy - scale };
      const right = { x: cx + scale, y: cy };
      const bottom = { x: cx, y: cy + scale };
      const left = { x: cx - scale, y: cy };

      // Top-Left edge borders (u - 1, v)
      if (!uvSet.has(`${c.u - 1},${c.v}`)) {
        segments.push([left, top]);
      }
      // Top-Right edge borders (u, v - 1)
      if (!uvSet.has(`${c.u},${c.v - 1}`)) {
        segments.push([top, right]);
      }
      // Bottom-Right edge borders (u + 1, v)
      if (!uvSet.has(`${c.u + 1},${c.v}`)) {
        segments.push([right, bottom]);
      }
      // Bottom-Left edge borders (u, v + 1)
      if (!uvSet.has(`${c.u},${c.v + 1}`)) {
        segments.push([bottom, left]);
      }
    });
    return segments;
  }

  /**
   * Draw one of the 4 corner mini-diagrams with color-matched clickable Hats & active Diagonal line
   */
  function toggleRegion(regionId) {
    state.activeRegionId = (state.activeRegionId === regionId) ? null : regionId;
    playTone(523.25, 0.05, 'sine', 0.04);
    renderAll();
  }

  function renderMiniDiagram(svg, cornerPos, slashDir) {
    const scale = 6.2;
    const gap = 1.1;
    const { ox, oy } = cornerPos;
    const g = createSvgEl('g', { class: 'mini-diagram' });

    Engine.CELLS.forEach(c => {
      const cx = ox + (c.u - c.v) * (scale + gap * 0.2);
      const cy = oy + (c.u + c.v - 5) * (scale + gap * 0.2);
      const s = scale * 0.88;
      const pts = `${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`;

      // Determine which Hat (if any) this mini-cell belongs to and make it clickable
      let targetRegion = null;
      let fill = '#7b7b7b';

      if (slashDir === 'backslash') {
        if (c.v <= 1) {
          fill = state.edition === 'modern' ? '#38bdf8' : '#b8b8b8';
          targetRegion = 'hat-tr';
        } else if (c.v >= 4) {
          fill = state.edition === 'modern' ? '#818cf8' : '#949494';
          targetRegion = 'hat-bl';
        } else {
          fill = state.edition === 'modern' ? '#334155' : '#636363';
          targetRegion = c.v === 2 ? 'diag-v2' : 'diag-v3';
        }
      } else {
        if (c.u <= 1) {
          fill = state.edition === 'modern' ? '#f59e0b' : '#949494';
          targetRegion = 'hat-tl';
        } else if (c.u >= 4) {
          fill = state.edition === 'modern' ? '#10b981' : '#b8b8b8';
          targetRegion = 'hat-br';
        } else {
          fill = state.edition === 'modern' ? '#334155' : '#636363';
          targetRegion = c.u === 2 ? 'diag-u2' : 'diag-u3';
        }
      }

      const cellPoly = createSvgEl('polygon', {
        points: pts,
        fill,
        stroke: state.edition === 'modern' ? '#0f172a' : '#ffffff',
        'stroke-width': '0.9',
        style: 'cursor: pointer;'
      });
      cellPoly.addEventListener('click', (e) => {
        e.stopPropagation();
        if (targetRegion) toggleRegion(targetRegion);
      });
      g.appendChild(cellPoly);
    });

    // Active clickable Diagonal line button across the mini-diagram
    const span = scale * 4.1;
    const lineCoords = slashDir === 'backslash'
      ? { x1: ox - span, y1: oy - span, x2: ox + span, y2: oy + span }
      : { x1: ox + span, y1: oy - span, x2: ox - span, y2: oy + span };

    const isDiagActive = slashDir === 'backslash'
      ? (state.activeRegionId === 'diag-v2' || state.activeRegionId === 'diag-v3')
      : (state.activeRegionId === 'diag-u2' || state.activeRegionId === 'diag-u3');

    // Visible diagonal line
    g.appendChild(createSvgEl('line', Object.assign({}, lineCoords, {
      stroke: isDiagActive ? '#38bdf8' : (state.edition === 'modern' ? '#e2e8f0' : '#111111'),
      'stroke-width': isDiagActive ? '2.8' : '1.8',
      'stroke-linecap': 'round',
      'pointer-events': 'none'
    })));

    // Invisible wide hit-target so clicking the diagonal line is effortless
    const diagHit = createSvgEl('line', Object.assign({}, lineCoords, {
      stroke: 'transparent',
      'stroke-width': '14',
      'stroke-linecap': 'round',
      style: 'cursor: pointer;'
    }));
    diagHit.addEventListener('click', (e) => {
      e.stopPropagation();
      if (slashDir === 'backslash') {
        const next = state.activeRegionId === 'diag-v2' ? 'diag-v3' : 'diag-v2';
        state.activeRegionId = next;
      } else {
        const next = state.activeRegionId === 'diag-u2' ? 'diag-u3' : 'diag-u2';
        state.activeRegionId = next;
      }
      playTone(659.25, 0.06, 'sine', 0.05);
      renderAll();
    });
    g.appendChild(diagHit);

    svg.appendChild(g);
  }

  /**
   * Render the 1 — 6 curved corner indicator aligned to the 3 Top peaks & 3 Right peaks
   */
  function renderTopRightCornerIndicator(svg) {
    const g = createSvgEl('g', { style: 'cursor: pointer;' });
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRegion('corner-tr');
    });

    const isCornerActive = state.activeRegionId === 'corner-tr';
    const strokeColor = isCornerActive
      ? '#f59e0b'
      : (state.edition === 'modern' ? '#38bdf8' : '#111111');
    const textColor = state.edition === 'modern' ? '#e2e8f0' : '#222222';

    // Horizontal bar centered directly above the 3 top peaks (x = 184..336, top tips at y = 98)
    g.appendChild(createSvgEl('line', {
      x1: 184,
      y1: 80,
      x2: 336,
      y2: 80,
      stroke: strokeColor,
      'stroke-width': '5',
      'stroke-linecap': 'round'
    }));

    // "1" label
    const t1 = createSvgEl('text', {
      x: 354,
      y: 86,
      fill: textColor,
      'font-size': '19',
      'font-weight': '700',
      'text-anchor': 'middle',
      'font-family': 'Arial, sans-serif'
    });
    t1.textContent = '1';
    g.appendChild(t1);

    // Curved dashed arc wrapping smoothly around the top-right corner
    g.appendChild(createSvgEl('path', {
      d: 'M 368 85 A 60 60 0 0 1 425 142',
      fill: 'none',
      stroke: strokeColor,
      'stroke-width': '4.5',
      'stroke-dasharray': '7,3'
    }));

    // "6" label
    const t6 = createSvgEl('text', {
      x: 430,
      y: 162,
      fill: textColor,
      'font-size': '19',
      'font-weight': '700',
      'text-anchor': 'middle',
      'font-family': 'Arial, sans-serif'
    });
    t6.textContent = '6';
    g.appendChild(t6);

    // Vertical bar centered directly beside the 3 right peaks (y = 174..326, right tips at x = 412)
    g.appendChild(createSvgEl('line', {
      x1: 430,
      y1: 174,
      x2: 430,
      y2: 326,
      stroke: strokeColor,
      'stroke-width': '5',
      'stroke-linecap': 'round'
    }));

    svg.appendChild(g);
  }

  /**
   * Render the entire SVG Diamond Board
   */
  function renderBoardSvg() {
    const svg = document.getElementById('board-svg');
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Click empty background to deselect the active diamond
    const bgRect = createSvgEl('rect', {
      x: 0,
      y: 0,
      width: 520,
      height: 465,
      fill: 'transparent'
    });
    bgRect.addEventListener('click', () => {
      if (state.selectedCell !== -1) {
        state.selectedCell = -1;
        renderBoardSvg();
      }
    });
    svg.appendChild(bgRect);

    // 1. Render the 4 corner mini-diagrams (each corner's colored Hat matches its corner!)
    renderMiniDiagram(svg, { ox: 58, oy: 66 }, 'slash');      // Top-Left Hat (orange) / Bottom-Right (green) + / Diag
    renderMiniDiagram(svg, { ox: 462, oy: 66 }, 'backslash'); // Top-Right Hat (cyan) / Bottom-Left (purple) + \ Diag
    renderMiniDiagram(svg, { ox: 58, oy: 410 }, 'backslash'); // Bottom-Left Hat (purple) / Top-Right (cyan) + \ Diag
    renderMiniDiagram(svg, { ox: 462, oy: 410 }, 'slash');    // Bottom-Right Hat (green) / Top-Left (orange) + / Diag

    // 2. Render the 1 — 6 Top-Right Corner indicator
    renderTopRightCornerIndicator(svg);

    // Validation info for conflict display
    const validation = Engine.validateBoard(state.board);
    const conflictSet = new Set(validation.conflictingCells);
    const showConflictsNow =
      state.showCheckedConflicts ||
      (state.edition === 'modern' && state.playMode === 'practice');

    const activeRegion = state.activeRegionId
      ? Engine.REGIONS.find(r => r.id === state.activeRegionId)
      : null;
    const activeRegionCells = new Set(activeRegion ? activeRegion.cells : []);

    // 3. Draw each of the 24 diamond squares
    Engine.CELLS.forEach((cell) => {
      const i = cell.index;
      const { cx, cy } = cellCenter(cell);
      const pts = `${cx},${cy - HALF_DIAG} ${cx + HALF_DIAG},${cy} ${cx},${cy + HALF_DIAG} ${cx - HALF_DIAG},${cy}`;

      const isSelected = state.selectedCell === i;
      const isGiven = state.givenMask[i];
      const isInActiveRegion = activeRegionCells.has(i);
      const isConflict = showConflictsNow && conflictSet.has(i);

      let fill = state.edition === 'modern' ? '#1e293b' : '#ffffff';
      if (state.edition === 'modern') {
        if (isInActiveRegion) fill = 'rgba(56, 189, 248, 0.16)';
        if (isSelected) fill = 'rgba(56, 189, 248, 0.34)';
        if (isConflict) fill = 'rgba(239, 68, 68, 0.35)';
      } else {
        // Classic 2007 Vintage mode
        if (isInActiveRegion && state.activeRegionId !== 'hat-tl') {
          fill = '#f0f7ff';
        }
        if (isSelected) fill = '#fff3bf';
        if (isConflict) fill = '#fee2e2';
      }

      const cellGroup = createSvgEl('g', { style: 'cursor: pointer;' });
      cellGroup.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.activeDigit !== null && !state.solved) {
          if (state.givenMask[i]) {
            setFeedback('That square is a fixed starting clue.', 'neutral');
            return;
          }
          state.selectedCell = i;
          handleDigitInput(state.activeDigit);
          state.selectedCell = -1;
          renderAll();
          return;
        }
        // Clicking the currently selected diamond deselects it!
        state.selectedCell = (state.selectedCell === i) ? -1 : i;
        renderBoardSvg();
      });

      cellGroup.appendChild(createSvgEl('polygon', {
        points: pts,
        fill,
        stroke: state.edition === 'modern' ? '#64748b' : '#222222',
        'stroke-width': '1.6'
      }));

      const val = state.board[i];
      if (val >= 1 && val <= 6) {
        let textColor = '#111827';
        if (state.edition === 'modern') {
          textColor = isGiven ? '#f8fafc' : '#38bdf8';
          if (isConflict) textColor = '#fca5a5';
        } else {
          textColor = isGiven ? '#111111' : '#0a3d91';
          if (isConflict) textColor = '#dc2626';
        }

        const txt = createSvgEl('text', {
          x: cx,
          y: cy + 7,
          fill: textColor,
          'font-size': '21',
          'font-weight': isGiven ? '700' : '600',
          'text-anchor': 'middle',
          'font-family': 'Arial, Helvetica, sans-serif',
          class: state.lastPlacedCell === i ? 'cell-pop-anim' : ''
        });
        txt.textContent = String(val);
        cellGroup.appendChild(txt);
      } else if (state.notes[i] && state.notes[i].size > 0) {
        // Render candidate pencil marks inside the diamond
        const notesArr = Array.from(state.notes[i]).sort();
        const noteText = createSvgEl('text', {
          x: cx,
          y: cy + 4,
          fill: state.edition === 'modern' ? '#94a3b8' : '#64748b',
          'font-size': '10.5',
          'font-weight': '700',
          'text-anchor': 'middle',
          'font-family': 'Arial, sans-serif'
        });
        noteText.textContent = notesArr.join('');
        cellGroup.appendChild(noteText);
      }

      svg.appendChild(cellGroup);
    });

    // 4. Draw outline ONLY for the active region (hat-tl is on by default, and deselects if clicked!)
    if (activeRegion) {
      const isDefaultHat = activeRegion.id === 'hat-tl';
      const activeSegments = getRegionBoundarySegments(activeRegion.cells);
      activeSegments.forEach(([p1, p2]) => {
        svg.appendChild(createSvgEl('line', {
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          stroke: isDefaultHat
            ? (state.edition === 'modern' ? '#f59e0b' : '#000000')
            : (state.edition === 'modern' ? '#38bdf8' : '#0077cc'),
          'stroke-width': isDefaultHat ? '4.5' : '4',
          'stroke-linecap': 'round',
          'pointer-events': 'none'
        }));
      });
    }

    // 5. Draw selected square inner ring
    if (state.selectedCell >= 0 && state.selectedCell < 24) {
      const selCell = Engine.CELLS[state.selectedCell];
      const { cx, cy } = cellCenter(selCell);
      const r = HALF_DIAG - 4;
      const pts = `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
      svg.appendChild(createSvgEl('polygon', {
        points: pts,
        fill: 'none',
        stroke: state.edition === 'modern' ? '#38bdf8' : '#d97706',
        'stroke-width': '2.2',
        'pointer-events': 'none'
      }));
    }

    // 6. Celebratory confetti burst when solved!
    if (state.solved) {
      const colors = ['#38bdf8', '#f59e0b', '#10b981', '#818cf8', '#f43f5e', '#facc15'];
      for (let k = 0; k < 28; k++) {
        const px = 30 + ((k * 37) % 460);
        const delay = ((k % 7) * 0.12).toFixed(2);
        const rect = createSvgEl('rect', {
          x: px,
          y: -12,
          width: 7,
          height: 11,
          rx: 2,
          fill: colors[k % colors.length],
          class: 'confetti-piece',
          style: `animation-delay: ${delay}s; pointer-events: none;`
        });
        svg.appendChild(rect);
      }
    }

    // 7. Clickable Vintage Footer Watermark inside SVG (opens informative popup)
    const brandText = createSvgEl('text', {
      x: CENTER_X,
      y: 446,
      fill: state.edition === 'modern' ? '#38bdf8' : '#0b2595',
      'font-size': '26',
      'font-weight': '700',
      'text-anchor': 'middle',
      'font-family': 'Georgia, "Times New Roman", serif',
      'letter-spacing': '0.5px',
      style: 'cursor: pointer;'
    });
    brandText.textContent = state.edition === 'modern' ? 'TopHatSudoku.com' : 'TopHatPuzzle.com';
    brandText.addEventListener('click', (e) => {
      e.stopPropagation();
      openInfoModal();
    });
    svg.appendChild(brandText);
  }

  function openInfoModal() {
    const backdrop = document.getElementById('info-modal-backdrop');
    if (backdrop) {
      backdrop.hidden = false;
      playTone(659.25, 0.07, 'sine', 0.06);
    }
  }

  function closeInfoModal() {
    const backdrop = document.getElementById('info-modal-backdrop');
    if (backdrop) backdrop.hidden = true;
  }

  /**
   * Format seconds as MM:SS
   */
  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function startTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = setInterval(() => {
      if (!state.solved) {
        state.elapsedSeconds += 1;
        const timerEl = document.getElementById('timer-display');
        if (timerEl) timerEl.textContent = formatTime(state.elapsedSeconds);
      }
    }, 1000);
  }

  /**
   * Start a new puzzle (Practice, Official ELO Competition, or the 2007 Reference Puzzle)
   */
  function startNewGame(options = {}) {
    let seed = undefined;
    if (state.playMode === 'official') {
      const today = new Date().toISOString().slice(0, 10);
      const profile = Engine.loadProfile();
      seed = `official-${today}-${state.difficulty}-match-${profile.matchesPlayed + 1}`;
    }

    const puz = Engine.generatePuzzle({
      difficulty: state.difficulty,
      seed,
      useVintage2007: !!options.useVintage2007
    });

    state.puzzle = puz;
    state.board = puz.clues.slice();
    state.givenMask = puz.clues.map(v => v > 0);
    state.notes = Array.from({ length: 24 }, () => new Set());
    state.completedRegions = getCompletedRegionIds(state.board);
    state.lastPlacedCell = -1;
    state.showCheckedConflicts = false;
    state.checkPenalties = 0;
    state.solved = false;
    state.elapsedSeconds = 0;

    // Select first empty square
    const firstEmpty = state.board.findIndex(v => v === 0);
    state.selectedCell = firstEmpty !== -1 ? firstEmpty : 0;

    setFeedback(
      state.playMode === 'official'
        ? `Official Ranked Match (${state.difficulty.toUpperCase()}): Solve the 24 squares & click "Check / Submit" to record your ELO!`
        : `${puz.title} loaded (${puz.clues.filter(x => x > 0).length} given clues). Click any square and press 1–6.`,
      'neutral'
    );

    startTimer();
    renderAll();
  }

  function setFeedback(msg, kind = 'neutral') {
    const el = document.getElementById('feedback-banner');
    if (!el) return;
    el.textContent = msg;
    el.className = 'feedback-box';
    if (kind === 'success') el.classList.add('success');
    if (kind === 'error') el.classList.add('error');
  }

  /**
   * Input a digit (1-6) or Clear (0) into the currently selected square,
   * OR arm the digit first when no square is selected!
   */
  function handleDigitInput(digit, fromKeypadButton = false) {
    if (state.solved) return;
    const idx = state.selectedCell;
    if (idx < 0 || idx >= 24) {
      if (fromKeypadButton) {
        state.activeDigit = (state.activeDigit === digit) ? null : digit;
        playTone(523.25, 0.05, 'sine', 0.05);
        if (state.activeDigit !== null) {
          const label = digit === 0 ? 'Clear' : digit;
          setFeedback(`Selected "${label}" — now click any empty square on the diamond to place it.`, 'neutral');
        } else {
          setFeedback('Number selection cleared.', 'neutral');
        }
        renderSidePanels();
      }
      return;
    }
    if (state.givenMask[idx]) {
      setFeedback('That square is a fixed starting clue.', 'neutral');
      return;
    }

    state.showCheckedConflicts = false;

    if (digit === 0) {
      state.board[idx] = 0;
      state.notes[idx].clear();
      renderAll();
      return;
    }

    if (state.notesMode && state.playMode === 'practice') {
      state.board[idx] = 0;
      if (state.notes[idx].has(digit)) state.notes[idx].delete(digit);
      else state.notes[idx].add(digit);
      renderAll();
      return;
    }

    state.board[idx] = digit;
    state.notes[idx].clear();
    state.lastPlacedCell = idx;

    // Auto-check when the final square is filled in Practice mode
    const validation = Engine.validateBoard(state.board);
    if (validation.isSolved) {
      completePuzzleSolve();
    } else {
      // Check if a new 6-cell region was just completed!
      const nowDone = getCompletedRegionIds(state.board);
      let newlyCompleted = false;
      nowDone.forEach((rid) => {
        if (!state.completedRegions.has(rid)) newlyCompleted = true;
      });
      state.completedRegions = nowDone;
      if (newlyCompleted) {
        playRegionChime();
      } else {
        playPlaceSound(digit);
      }
      renderAll();
    }
  }

  /**
   * Handle puzzle completion and ELO update (if in Official Competition mode)
   */
  function completePuzzleSolve() {
    state.solved = true;
    state.selectedCell = -1;
    playVictoryFanfare();
    const timeStr = formatTime(state.elapsedSeconds);

    if (state.playMode === 'official') {
      const res = Engine.recordOfficialMatch(
        state.difficulty,
        state.elapsedSeconds,
        state.checkPenalties
      );
      const sign = res.delta >= 0 ? `+${res.delta}` : `${res.delta}`;
      setFeedback(
        `Solved in ${timeStr}! Official ELO Rating updated: ${res.newElo} (${sign} ELO vs ${res.parSeconds}s par).`,
        'success'
      );
    } else {
      Engine.recordPracticeSolve(state.difficulty, state.elapsedSeconds);
      setFeedback(
        `Congratulations! Solved in ${timeStr} (Practice Mode — ELO unchanged). Switch to Official Competition to play for ELO!`,
        'success'
      );
    }

    // Pre-fill visitor submission solve time field
    const timeInput = document.getElementById('visitor-solve-time');
    if (timeInput) {
      timeInput.value = `${timeStr} (${state.difficulty.toUpperCase()})`;
    }

    renderAll();
  }

  /**
   * Check / Submit button handler
   */
  function handleCheckOrSubmit() {
    if (state.solved) return;
    const validation = Engine.validateBoard(state.board);

    if (validation.isSolved) {
      completePuzzleSolve();
      return;
    }

    state.showCheckedConflicts = true;
    if (validation.conflictingCells.length > 0) {
      if (state.playMode === 'official') state.checkPenalties += 1;
      const names = validation.violatedRegions.map(r => r.shortName).join(', ');
      setFeedback(
        `Duplicate digit detected in: ${names}. Highlighted in red.`,
        'error'
      );
    } else {
      const remaining = state.board.filter(v => v === 0).length;
      setFeedback(
        `No conflicts so far! ${remaining} empty square${remaining === 1 ? '' : 's'} remaining.`,
        'neutral'
      );
    }
    renderAll();
  }

  /**
   * Hint button handler (Practice mode only)
   */
  function handleHint() {
    if (state.playMode === 'official') {
      setFeedback('Hints & Notes are disabled during Official ELO Competitions!', 'error');
      return;
    }
    if (state.solved) return;

    const hint = Engine.findHint(state.board, state.puzzle && state.puzzle.solution);
    if (!hint) {
      setFeedback('No hint available.', 'neutral');
      return;
    }

    state.selectedCell = hint.cellIndex;
    if (hint.regionId) state.activeRegionId = hint.regionId;
    state.board[hint.cellIndex] = hint.digit;
    state.notes[hint.cellIndex].clear();

    setFeedback(`Hint: ${hint.reason}`, 'neutral');
    const validation = Engine.validateBoard(state.board);
    if (validation.isSolved) {
      completePuzzleSolve();
    } else {
      renderAll();
    }
  }

  /**
   * Render Region Explorer pills, ELO status, and Leaderboard table
   */
  function renderSidePanels() {
    // Theme class on body
    document.body.classList.toggle('theme-modern', state.edition === 'modern');

    // Edition buttons
    document.querySelectorAll('[data-edition]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-edition') === state.edition);
    });

    // Play Mode buttons
    document.querySelectorAll('[data-playmode]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-playmode') === state.playMode);
    });

    // Difficulty buttons
    document.querySelectorAll('[data-difficulty]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-difficulty') === state.difficulty);
    });

    // Keypad armed digit highlight
    document.querySelectorAll('[data-digit]').forEach(btn => {
      const d = parseInt(btn.getAttribute('data-digit'), 10);
      btn.classList.toggle('armed', state.activeDigit === d && state.selectedCell === -1);
    });

    // Notes button
    const notesBtn = document.getElementById('btn-notes');
    if (notesBtn) {
      notesBtn.classList.toggle('active-toggle', state.notesMode);
      notesBtn.disabled = state.playMode === 'official';
    }

    const hintBtn = document.getElementById('btn-hint');
    if (hintBtn) {
      hintBtn.disabled = state.playMode === 'official';
    }

    const soundBtn = document.getElementById('btn-sound');
    if (soundBtn) {
      soundBtn.classList.toggle('active-toggle', state.soundEnabled);
      soundBtn.textContent = state.soundEnabled ? '🔊 Sound' : '🔇 Muted';
    }

    // Timer & ELO display
    const timerEl = document.getElementById('timer-display');
    if (timerEl) timerEl.textContent = formatTime(state.elapsedSeconds);

    const profile = Engine.loadProfile();
    const eloChip = document.getElementById('elo-chip');
    if (eloChip) {
      eloChip.textContent = `ELO: ${profile.elo} (${profile.matchesPlayed} Official)`;
    }

    // 12 Region Pills
    const pillsContainer = document.getElementById('region-pills');
    if (pillsContainer) {
      pillsContainer.innerHTML = '';
      Engine.REGIONS.forEach(r => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'region-pill' + (state.activeRegionId === r.id ? ' active' : '');
        btn.textContent = r.shortName;
        btn.addEventListener('click', () => {
          toggleRegion(r.id);
        });
        pillsContainer.appendChild(btn);
      });
    }

    const activeRegion = Engine.REGIONS.find(r => r.id === state.activeRegionId);
    const regionDesc = document.getElementById('active-region-desc');
    if (regionDesc && activeRegion) {
      regionDesc.textContent = `${activeRegion.name}: ${activeRegion.description}`;
    }

    // Leaderboard Table
    const tbody = document.getElementById('leaderboard-body');
    if (tbody) {
      tbody.innerHTML = '';
      const rows = Engine.getLeaderboard();
      rows.forEach((row, idx) => {
        const tr = document.createElement('tr');
        if (row.isPlayer) tr.className = 'player-row';
        const easyStr = typeof row.bestEasy === 'number' ? `${row.bestEasy}s` : row.bestEasy;
        const medStr = typeof row.bestMedium === 'number' ? `${row.bestMedium}s` : row.bestMedium;
        tr.innerHTML = `
          <td>#${idx + 1}</td>
          <td><strong>${escapeHtml(row.handle)}</strong> <span class="rank-badge">${escapeHtml(row.badge)}</span></td>
          <td><strong>${row.elo}</strong></td>
          <td>${easyStr} / ${medStr}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderAll() {
    renderBoardSvg();
    renderSidePanels();
  }

  /**
   * Wire up event listeners on DOMContentLoaded
   */
  function init() {
    // Edition switcher
    document.querySelectorAll('[data-edition]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.edition = btn.getAttribute('data-edition');
        renderAll();
      });
    });

    // Play Mode switcher (Practice vs Official ELO)
    document.querySelectorAll('[data-playmode]').forEach(btn => {
      btn.addEventListener('click', () => {
        const newMode = btn.getAttribute('data-playmode');
        if (newMode !== state.playMode) {
          state.playMode = newMode;
          if (state.playMode === 'official') state.notesMode = false;
          startNewGame();
        }
      });
    });

    // Difficulty switcher (Easy vs Medium)
    document.querySelectorAll('[data-difficulty]').forEach(btn => {
      btn.addEventListener('click', () => {
        const newDiff = btn.getAttribute('data-difficulty');
        state.difficulty = newDiff;
        startNewGame();
      });
    });

    // Keypad digits 1-6 + Clear
    document.querySelectorAll('[data-digit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = parseInt(btn.getAttribute('data-digit'), 10);
        handleDigitInput(d, true);
      });
    });

    // Info Modal close handlers
    const closeInfoBtn = document.getElementById('btn-close-info-modal');
    if (closeInfoBtn) closeInfoBtn.addEventListener('click', closeInfoModal);
    const infoBackdrop = document.getElementById('info-modal-backdrop');
    if (infoBackdrop) {
      infoBackdrop.addEventListener('click', (e) => {
        if (e.target === infoBackdrop) closeInfoModal();
      });
    }

    // Action buttons
    const btnNew = document.getElementById('btn-new-puzzle');
    if (btnNew) btnNew.addEventListener('click', () => startNewGame());

    const btnVintage = document.getElementById('btn-vintage-2007');
    if (btnVintage) {
      btnVintage.addEventListener('click', () => {
        state.playMode = 'practice';
        state.difficulty = 'easy';
        startNewGame({ useVintage2007: true });
      });
    }

    const btnCheck = document.getElementById('btn-check');
    if (btnCheck) btnCheck.addEventListener('click', handleCheckOrSubmit);

    const btnHint = document.getElementById('btn-hint');
    if (btnHint) btnHint.addEventListener('click', handleHint);

    const btnNotes = document.getElementById('btn-notes');
    if (btnNotes) {
      btnNotes.addEventListener('click', () => {
        if (state.playMode === 'official') return;
        state.notesMode = !state.notesMode;
        renderAll();
      });
    }

    const btnSound = document.getElementById('btn-sound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        if (state.soundEnabled) playTone(587.33, 0.08, 'sine', 0.06);
        renderSidePanels();
      });
    }

    // Keyboard shortcuts (1-6, Backspace/0, Arrow keys, N, C)
    window.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        handleDigitInput(parseInt(e.key, 10));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        handleDigitInput(0);
      } else if (e.key === 'n' || e.key === 'N') {
        if (state.playMode === 'practice') {
          state.notesMode = !state.notesMode;
          renderAll();
        }
      } else if (e.key === 'c' || e.key === 'C' || e.key === 'Enter') {
        handleCheckOrSubmit();
      } else if (e.key === 'Escape') {
        state.selectedCell = -1;
        renderBoardSvg();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        state.selectedCell = (state.selectedCell + 1) % 24;
        renderBoardSvg();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        state.selectedCell = (state.selectedCell + 23) % 24;
        renderBoardSvg();
      }
    });

    // FreeGamesNews Visitor Submission Form
    const profile = Engine.loadProfile();
    const handleInput = document.getElementById('visitor-handle');
    if (handleInput) handleInput.value = profile.handle || 'FGN_Visitor';

    const form = document.getElementById('fgn-visitor-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const handle = document.getElementById('visitor-handle').value;
        const solveTime = document.getElementById('visitor-solve-time').value;
        const cameFromFGN = document.getElementById('visitor-from-fgn').checked;
        const comment = document.getElementById('visitor-comment').value;

        const { item, profile: updated } = Engine.addVisitorSubmission({
          handle,
          solveTime,
          cameFromFGN,
          favoriteMode: state.edition === 'classic' ? 'TopHatPuzzle (2007 Classic)' : 'TopHatSudoku (Modern)',
          comment
        });

        const shareTextarea = document.getElementById('fgn-share-snippet');
        if (shareTextarea) {
          shareTextarea.value =
            `Top Hat Puzzle (Gary Stout's Sept 2007 Twisted Sudoku) is back live at https://www.twisted23.com/tophat/ ! ` +
            `Player: ${item.handle} | ELO: ${updated.elo} | Best Solve: ${item.solveTime} — "${item.comment}"`;
        }

        const statusEl = document.getElementById('form-submit-status');
        if (statusEl) {
          statusEl.textContent = `Saved! Your handle (${item.handle}) and ELO (${updated.elo}) are updated on the leaderboard below.`;
        }
        renderAll();
      });
    }

    const copyBtn = document.getElementById('btn-copy-fgn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const shareTextarea = document.getElementById('fgn-share-snippet');
        if (shareTextarea && navigator.clipboard) {
          navigator.clipboard.writeText(shareTextarea.value);
          copyBtn.textContent = 'Copied for FreeGamesNews!';
          setTimeout(() => {
            copyBtn.textContent = 'Copy FreeGamesNews Form Text';
          }, 2000);
        }
      });
    }

    // Start initial game with the 2007 FreeGamesNews Tribute puzzle
    startNewGame({ useVintage2007: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
