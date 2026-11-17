/**
 * Top Hat Puzzle & Top Hat Sudoku — Core 24-Cell Diamond Engine & ELO System
 * Recreating Gary Stout's September 2007 TopHatPuzzle.com (featured on FreeGamesNews)
 */

(function (global) {
  'use strict';

  // 1. Build the 24 valid (u, v) cells ordered by visual horizontal rows (k = u + v from 2 to 8)
  // Row lengths: 3, 4, 3, 4, 3, 4, 3 = 24 squares
  const CELLS = [];
  const UV_TO_INDEX = {};

  let idx = 0;
  for (let k = 2; k <= 8; k++) {
    let colInRow = 0;
    for (let u = 0; u < 6; u++) {
      const v = k - u;
      if (v >= 0 && v < 6 && Math.abs(u - v) <= 3) {
        const key = `${u},${v}`;
        UV_TO_INDEX[key] = idx;
        // Visual center coordinate in diamond units:
        // x goes right as (u - v) increases; y goes down as (u + v) increases
        CELLS.push({
          index: idx,
          u,
          v,
          row: k - 2,          // 0..6 (7 horizontal rows)
          colInRow: colInRow,  // 0..2 on even rows, 0..3 on odd rows
          x: u - v,            // -3..+3
          y: u + v - 5         // -3..+3
        });
        colInRow++;
        idx++;
      }
    }
  }

  function uvIdx(u, v) {
    return UV_TO_INDEX[`${u},${v}`];
  }

  // Outer 3-peak edges used by the 4 Corner patterns
  const TOP_EDGE = [uvIdx(0, 2), uvIdx(1, 1), uvIdx(2, 0)];
  const RIGHT_EDGE = [uvIdx(3, 0), uvIdx(4, 1), uvIdx(5, 2)];
  const BOTTOM_EDGE = [uvIdx(3, 5), uvIdx(4, 4), uvIdx(5, 3)];
  const LEFT_EDGE = [uvIdx(0, 3), uvIdx(1, 4), uvIdx(2, 5)];

  // 2. The 12 Constraint Regions (4 Hats, 4 Diagonals, 4 Corners) — 6 cells each
  const REGIONS = [
    // Four Hat Patterns
    {
      id: 'hat-tl',
      type: 'hat',
      name: 'Top-Left Hat',
      shortName: 'NW Hat',
      description: 'Top-left 6-square hat pattern (2-square crown + 4-square brim, outlined in bold on the 2007 board)',
      cells: CELLS.filter(c => c.u === 0 || c.u === 1).map(c => c.index)
    },
    {
      id: 'hat-tr',
      type: 'hat',
      name: 'Top-Right Hat',
      shortName: 'NE Hat',
      description: 'Top-right 6-square hat pattern (2-square crown + 4-square brim)',
      cells: CELLS.filter(c => c.v === 0 || c.v === 1).map(c => c.index)
    },
    {
      id: 'hat-br',
      type: 'hat',
      name: 'Bottom-Right Hat',
      shortName: 'SE Hat',
      description: 'Bottom-right 6-square hat pattern (2-square crown + 4-square brim)',
      cells: CELLS.filter(c => c.u === 4 || c.u === 5).map(c => c.index)
    },
    {
      id: 'hat-bl',
      type: 'hat',
      name: 'Bottom-Left Hat',
      shortName: 'SW Hat',
      description: 'Bottom-left 6-square hat pattern (2-square crown + 4-square brim)',
      cells: CELLS.filter(c => c.v === 4 || c.v === 5).map(c => c.index)
    },

    // Four Diagonal Patterns
    {
      id: 'diag-u2',
      type: 'diagonal',
      name: 'Upper-Left / Diagonal',
      shortName: 'Diag / 1',
      description: '6-square diagonal running from top-right to bottom-left (upper-left lane)',
      cells: [0, 1, 2, 3, 4, 5].map(v => uvIdx(2, v))
    },
    {
      id: 'diag-u3',
      type: 'diagonal',
      name: 'Lower-Right / Diagonal',
      shortName: 'Diag / 2',
      description: '6-square diagonal running from top-right to bottom-left (lower-right lane)',
      cells: [0, 1, 2, 3, 4, 5].map(v => uvIdx(3, v))
    },
    {
      id: 'diag-v2',
      type: 'diagonal',
      name: 'Upper-Right \\ Diagonal',
      shortName: 'Diag \\ 1',
      description: '6-square diagonal running from top-left to bottom-right (upper-right lane)',
      cells: [0, 1, 2, 3, 4, 5].map(u => uvIdx(u, 2))
    },
    {
      id: 'diag-v3',
      type: 'diagonal',
      name: 'Lower-Left \\ Diagonal',
      shortName: 'Diag \\ 2',
      description: '6-square diagonal running from top-left to bottom-right (lower-left lane)',
      cells: [0, 1, 2, 3, 4, 5].map(u => uvIdx(u, 3))
    },

    // Four Corner Patterns
    {
      id: 'corner-tr',
      type: 'corner',
      name: 'Top + Right Corner (1–6 Arc)',
      shortName: 'T+R Corner',
      description: '3 Top outer peaks + 3 Right outer peaks (marked by the 1–6 curved bar in the 2007 diagram)',
      cells: TOP_EDGE.concat(RIGHT_EDGE)
    },
    {
      id: 'corner-rb',
      type: 'corner',
      name: 'Right + Bottom Corner',
      shortName: 'R+B Corner',
      description: '3 Right outer peaks + 3 Bottom outer peaks',
      cells: RIGHT_EDGE.concat(BOTTOM_EDGE)
    },
    {
      id: 'corner-bl',
      type: 'corner',
      name: 'Bottom + Left Corner',
      shortName: 'B+L Corner',
      description: '3 Bottom outer peaks + 3 Left outer peaks',
      cells: BOTTOM_EDGE.concat(LEFT_EDGE)
    },
    {
      id: 'corner-lt',
      type: 'corner',
      name: 'Left + Top Corner',
      shortName: 'L+T Corner',
      description: '3 Left outer peaks + 3 Top outer peaks',
      cells: LEFT_EDGE.concat(TOP_EDGE)
    }
  ];

  // Precompute peers and regions for each of the 24 cells
  const CELL_REGIONS = Array.from({ length: 24 }, () => []);
  const CELL_PEERS = Array.from({ length: 24 }, () => new Set());

  REGIONS.forEach((region) => {
    region.cells.forEach((cIdx) => {
      CELL_REGIONS[cIdx].push(region);
      region.cells.forEach((otherIdx) => {
        if (otherIdx !== cIdx) {
          CELL_PEERS[cIdx].add(otherIdx);
        }
      });
    });
  });

  const PEERS = CELL_PEERS.map(s => Array.from(s));

  // Original September 2007 FreeGamesNews Screenshot Solution
  const VINTAGE_2007_SOLUTION = [
    6, 1, 3,
    2, 5, 6, 2,
    3, 1, 4,
    4, 4, 3, 5,
    2, 5, 2,
    5, 6, 1, 4,
    1, 3, 6
  ];

  // Classic 2007 Tribute Starter Clues (11 clues -> Easy, unique solution = VINTAGE_2007_SOLUTION)
  const VINTAGE_2007_CLUES = [
    6, 0, 3,
    0, 5, 0, 2,
    3, 0, 0,
    0, 4, 0, 5,
    0, 0, 2,
    5, 0, 1, 0,
    0, 3, 6
  ];

  // Deterministic PRNG (Mulberry32) for Official Daily / Seeded ELO Competitions
  function createRNG(seedString) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedString.length; i++) {
      h = Math.imul(h ^ seedString.charCodeAt(i), 16777619);
    }
    let a = h >>> 0;
    return function () {
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffleArray(arr, rng) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  // Candidate bitmask helpers (bits 1..6)
  function getCandidates(board, cellIdx) {
    let usedMask = 0;
    const peers = PEERS[cellIdx];
    for (let i = 0; i < peers.length; i++) {
      const val = board[peers[i]];
      if (val > 0) usedMask |= (1 << val);
    }
    const cands = [];
    for (let d = 1; d <= 6; d++) {
      if ((usedMask & (1 << d)) === 0) cands.push(d);
    }
    return cands;
  }

  // Count solutions up to `limit` (default 2 for uniqueness verification)
  function countSolutions(boardInput, limit = 2) {
    const board = boardInput.slice();

    function search(remainingLimit) {
      let bestCell = -1;
      let bestCands = null;

      for (let i = 0; i < 24; i++) {
        if (board[i] === 0) {
          const cands = getCandidates(board, i);
          if (cands.length === 0) return 0;
          if (bestCands === null || cands.length < bestCands.length) {
            bestCell = i;
            bestCands = cands;
            if (cands.length === 1) break;
          }
        }
      }

      if (bestCell === -1) return 1; // Solved!

      let found = 0;
      for (let i = 0; i < bestCands.length; i++) {
        board[bestCell] = bestCands[i];
        found += search(remainingLimit - found);
        board[bestCell] = 0;
        if (found >= remainingLimit) return found;
      }
      return found;
    }

    return search(limit);
  }

  // Generate a complete valid 24-cell solution using seeded or random RNG
  function generateSolvedBoard(rng) {
    const board = new Array(24).fill(0);

    function solve() {
      let bestCell = -1;
      let bestCands = null;
      for (let i = 0; i < 24; i++) {
        if (board[i] === 0) {
          const cands = getCandidates(board, i);
          if (cands.length === 0) return false;
          if (bestCands === null || cands.length < bestCands.length) {
            bestCell = i;
            bestCands = cands;
            if (cands.length === 1) break;
          }
        }
      }
      if (bestCell === -1) return true;

      const ordered = shuffleArray(bestCands, rng);
      for (let i = 0; i < ordered.length; i++) {
        board[bestCell] = ordered[i];
        if (solve()) return true;
        board[bestCell] = 0;
      }
      return false;
    }

    solve();
    return board;
  }

  /**
   * Generate a guaranteed unique-solution puzzle for 'easy' (11 clues) or 'medium' (8 clues)
   */
  function generatePuzzle(options = {}) {
    const difficulty = options.difficulty === 'medium' ? 'medium' : 'easy';
    const targetClues = difficulty === 'easy' ? 11 : 8;
    const seed = options.seed || `random-${Date.now()}-${Math.random()}`;

    if (options.useVintage2007) {
      return {
        difficulty: 'easy',
        seed: 'vintage-2007-freegamesnews',
        clues: VINTAGE_2007_CLUES.slice(),
        solution: VINTAGE_2007_SOLUTION.slice(),
        title: 'Sept 2007 FreeGamesNews Featured Puzzle'
      };
    }

    const rng = createRNG(seed);
    const solution = generateSolvedBoard(rng);
    const clues = solution.slice();

    // Dig holes symmetrically or in shuffled order while preserving a unique solution
    const order = shuffleArray(Array.from({ length: 24 }, (_, i) => i), rng);
    let currentClues = 24;

    for (let i = 0; i < order.length; i++) {
      if (currentClues <= targetClues) break;
      const idxToClear = order[i];
      const backup = clues[idxToClear];
      clues[idxToClear] = 0;
      if (countSolutions(clues, 2) === 1) {
        currentClues--;
      } else {
        clues[idxToClear] = backup;
      }
    }

    return {
      difficulty,
      seed,
      clues,
      solution,
      title: options.title || `${difficulty === 'easy' ? 'Easy' : 'Medium'} Top Hat Puzzle`
    };
  }

  /**
   * Validate a player's board: returns conflicts and completion status
   */
  function validateBoard(board) {
    const conflictingCells = new Set();
    const violatedRegions = [];

    REGIONS.forEach((region) => {
      const seen = {};
      let regionHasConflict = false;
      region.cells.forEach((cIdx) => {
        const val = board[cIdx];
        if (val >= 1 && val <= 6) {
          if (seen[val] !== undefined) {
            conflictingCells.add(cIdx);
            conflictingCells.add(seen[val]);
            regionHasConflict = true;
          } else {
            seen[val] = cIdx;
          }
        }
      });
      if (regionHasConflict) {
        violatedRegions.push(region);
      }
    });

    const isFull = board.every(v => v >= 1 && v <= 6);
    const isSolved = isFull && conflictingCells.size === 0;

    return {
      isFull,
      isSolved,
      conflictingCells: Array.from(conflictingCells),
      violatedRegions
    };
  }

  /**
   * Find a logical next step / hint for Practice mode
   */
  function findHint(board, solution) {
    // 1. Look for a Naked Single (cell with only 1 valid candidate)
    for (let i = 0; i < 24; i++) {
      if (board[i] === 0) {
        const cands = getCandidates(board, i);
        if (cands.length === 1) {
          return {
            cellIndex: i,
            digit: cands[0],
            reason: `Square #${i + 1} has only one possible digit (${cands[0]}) left across its Hat, Diagonal, and Corner groups.`
          };
        }
      }
    }

    // 2. Look for a Hidden Single inside any of the 12 regions
    for (let r = 0; r < REGIONS.length; r++) {
      const region = REGIONS[r];
      for (let d = 1; d <= 6; d++) {
        const alreadyPlaced = region.cells.some(cIdx => board[cIdx] === d);
        if (!alreadyPlaced) {
          const possibleSpots = region.cells.filter(
            cIdx => board[cIdx] === 0 && getCandidates(board, cIdx).includes(d)
          );
          if (possibleSpots.length === 1) {
            return {
              cellIndex: possibleSpots[0],
              digit: d,
              regionId: region.id,
              reason: `In ${region.name}, digit ${d} can only fit in this square.`
            };
          }
        }
      }
    }

    // 3. Fallback to solution value on the most constrained empty square
    let bestIdx = -1;
    let bestLen = 99;
    for (let i = 0; i < 24; i++) {
      if (board[i] === 0) {
        const len = getCandidates(board, i).length;
        if (len < bestLen) {
          bestLen = len;
          bestIdx = i;
        }
      }
    }
    if (bestIdx !== -1 && solution) {
      return {
        cellIndex: bestIdx,
        digit: solution[bestIdx],
        reason: `Try placing ${solution[bestIdx]} in this square to advance.`
      };
    }
    return null;
  }

  /**
   * ELO Rating & Official Competition Manager
   * Only Official Competitions impact ELO rankings; Practice mode is unranked.
   */
  const STORAGE_KEY = 'tophatpuzzle_elo_profile_v1';

  const DEFAULT_LEADERBOARD = [
    { handle: 'GaryStout_2007', elo: 1480, badge: 'Creator', bestEasy: 48, bestMedium: 82, note: 'Welcome to Twisted Sudoku!' },
    { handle: 'FreeGamesNews_Vet', elo: 1365, badge: 'Sept 2007', bestEasy: 64, bestMedium: 105, note: 'Still solving under 2 minutes!' },
    { handle: 'Agry_Twisted23', elo: 1310, badge: 'Host', bestEasy: 72, bestMedium: 118, note: 'Subdomain live on twisted23.com' },
    { handle: 'TopHat_Solver', elo: 1245, badge: 'Competitor', bestEasy: 85, bestMedium: 134, note: 'Watch the 4 corner patterns!' },
    { handle: 'DiamondLogic', elo: 1190, badge: 'Competitor', bestEasy: 98, bestMedium: 152, note: 'Easy & Medium daily run' }
  ];

  function loadProfile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Object.assign({
          handle: 'FGN_Visitor',
          elo: 1200,
          matchesPlayed: 0,
          practiceSolved: 0,
          bestEasySeconds: null,
          bestMediumSeconds: null,
          history: [],
          submissions: []
        }, parsed);
      }
    } catch (e) {
      // ignore storage errors
    }
    return {
      handle: 'FGN_Visitor',
      elo: 1200,
      matchesPlayed: 0,
      practiceSolved: 0,
      bestEasySeconds: null,
      bestMediumSeconds: null,
      history: [],
      submissions: []
    };
  }

  function saveProfile(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      // ignore storage errors
    }
  }

  /**
   * Calculate ELO change for an Official Competition solve.
   * Par time reflects the ~2-minute original solve window:
   * - Easy Par: 90s (opponent benchmark ELO ~ 1200)
   * - Medium Par: 135s (opponent benchmark ELO ~ 1280)
   */
  function recordOfficialMatch(difficulty, elapsedSeconds, checkPenalties = 0) {
    const profile = loadProfile();
    const parSeconds = difficulty === 'easy' ? 90 : 135;
    const benchmarkElo = difficulty === 'easy' ? 1200 : 1280;
    const effectiveSeconds = elapsedSeconds + checkPenalties * 15;

    // Performance score S in [0.15, 0.95] based on speed vs par
    const timeRatio = (parSeconds - effectiveSeconds) / parSeconds;
    const actualScore = Math.max(0.15, Math.min(0.95, 0.55 + timeRatio * 0.35));

    const expectedScore = 1 / (1 + Math.pow(10, (benchmarkElo - profile.elo) / 400));
    const K = 32;
    const delta = Math.round(K * (actualScore - expectedScore));

    profile.elo = Math.max(800, profile.elo + delta);
    profile.matchesPlayed += 1;

    if (difficulty === 'easy') {
      if (!profile.bestEasySeconds || elapsedSeconds < profile.bestEasySeconds) {
        profile.bestEasySeconds = elapsedSeconds;
      }
    } else {
      if (!profile.bestMediumSeconds || elapsedSeconds < profile.bestMediumSeconds) {
        profile.bestMediumSeconds = elapsedSeconds;
      }
    }

    const entry = {
      date: new Date().toISOString().slice(0, 10),
      difficulty,
      seconds: elapsedSeconds,
      delta,
      newElo: profile.elo
    };
    profile.history.unshift(entry);
    profile.history = profile.history.slice(0, 15);
    saveProfile(profile);

    return {
      delta,
      newElo: profile.elo,
      parSeconds,
      profile
    };
  }

  function recordPracticeSolve(difficulty, elapsedSeconds) {
    const profile = loadProfile();
    profile.practiceSolved = (profile.practiceSolved || 0) + 1;
    if (difficulty === 'easy') {
      if (!profile.bestEasySeconds || elapsedSeconds < profile.bestEasySeconds) {
        profile.bestEasySeconds = elapsedSeconds;
      }
    } else {
      if (!profile.bestMediumSeconds || elapsedSeconds < profile.bestMediumSeconds) {
        profile.bestMediumSeconds = elapsedSeconds;
      }
    }
    saveProfile(profile);
    return profile;
  }

  function addVisitorSubmission(submission) {
    const profile = loadProfile();
    if (submission.handle && submission.handle.trim()) {
      profile.handle = submission.handle.trim();
    }
    const item = {
      handle: profile.handle,
      elo: profile.elo,
      cameFromFGN: !!submission.cameFromFGN,
      favoriteMode: submission.favoriteMode || 'TopHatPuzzle (2007 Vintage)',
      solveTime: submission.solveTime || 'Under 2 mins',
      comment: (submission.comment || '').trim() || 'Excited to see Top Hat Puzzle back online!',
      timestamp: new Date().toLocaleDateString()
    };
    profile.submissions = profile.submissions || [];
    profile.submissions.unshift(item);
    saveProfile(profile);
    return { item, profile };
  }

  function getLeaderboard() {
    const profile = loadProfile();
    const list = DEFAULT_LEADERBOARD.map(x => Object.assign({}, x));
    list.push({
      handle: profile.handle || 'FGN_Visitor',
      elo: profile.elo,
      badge: 'You',
      bestEasy: profile.bestEasySeconds || '—',
      bestMedium: profile.bestMediumSeconds || '—',
      note: (profile.submissions && profile.submissions[0] && profile.submissions[0].comment) || 'Active Player',
      isPlayer: true
    });
    list.sort((a, b) => b.elo - a.elo);
    return list;
  }

  global.TopHatEngine = {
    CELLS,
    REGIONS,
    CELL_REGIONS,
    PEERS,
    VINTAGE_2007_SOLUTION,
    VINTAGE_2007_CLUES,
    generatePuzzle,
    validateBoard,
    findHint,
    getCandidates,
    loadProfile,
    saveProfile,
    recordOfficialMatch,
    recordPracticeSolve,
    addVisitorSubmission,
    getLeaderboard
  };
})(window);
