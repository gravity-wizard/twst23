export type BotcheeMode = "points" | "fic-fac-foe" | "flips";
export type BotLevel = 0 | 1 | 2;
export type BotcheePlayer = "human" | "bot";
export type BotcheeStatus =
  | "ready"
  | "playing"
  | "won"
  | "lost"
  | "draw"
  | "solved"
  | "botched";

export interface Die {
  readonly id: number;
  readonly face: number;
}

export interface BotcheeState {
  readonly mode: BotcheeMode;
  readonly botLevel: BotLevel;
  readonly board: readonly number[];
  readonly owners: readonly (BotcheePlayer | null)[];
  readonly scores: Readonly<Record<BotcheePlayer, number>>;
  readonly tray: readonly Die[];
  readonly selectedDieId: number | null;
  readonly turn: BotcheePlayer;
  readonly status: BotcheeStatus;
  readonly endReason: "board-full" | "no-legal-moves" | "three-in-a-row" | "solved" | "botched" | null;
  readonly moves: number;
  readonly flips: number;
  readonly startedAtMs: number | null;
  readonly elapsedMs: number;
}

export interface PointMove {
  readonly kind: "points";
  readonly index: number;
  readonly value: number;
}

export interface PatternMove {
  readonly kind: "pattern";
  readonly index: number;
  readonly value: number;
}

export type BotMove = PointMove | PatternMove;

export const BOTCHEE_BOARD_SIZE = 16;
export const BOTCHEE_VALUES = [1, 2, 3, 4] as const;
export const BOTCHEE_ROWS: readonly (readonly number[])[] = Array.from({ length: 4 }, (_, row) =>
  Array.from({ length: 4 }, (_, column) => row * 4 + column),
);
export const BOTCHEE_COLUMNS: readonly (readonly number[])[] = Array.from({ length: 4 }, (_, column) =>
  Array.from({ length: 4 }, (_, row) => row * 4 + column),
);
export const BOTCHEE_BOXES: readonly (readonly number[])[] = Array.from({ length: 4 }, (_, box) => {
  const top = Math.floor(box / 2) * 2;
  const left = (box % 2) * 2;
  return [
    top * 4 + left,
    top * 4 + left + 1,
    (top + 1) * 4 + left,
    (top + 1) * 4 + left + 1,
  ];
});
export const BOTCHEE_LINES: readonly (readonly number[])[] = [
  ...BOTCHEE_ROWS,
  ...BOTCHEE_COLUMNS,
  [0, 5, 10, 15],
  [3, 6, 9, 12],
];
export const THREE_IN_A_ROW_LINES: readonly (readonly number[])[] = BOTCHEE_LINES.flatMap((line) =>
  Array.from({ length: line.length - 2 }, (_, index) => line.slice(index, index + 3)),
);
export const FOUR_IN_A_ROW_LINES: readonly (readonly number[])[] = BOTCHEE_LINES.filter((line) =>
  line.length === 4,
);

export const EMPTY_BOARD: readonly number[] = Array(BOTCHEE_BOARD_SIZE).fill(0);

function randomFace(random: () => number): number {
  return Math.min(3, Math.max(0, Math.floor(random() * 4))) + 1;
}

export function createBotcheeGame(
  mode: BotcheeMode,
  botLevel: BotLevel = 1,
): BotcheeState {
  return {
    mode,
    botLevel,
    board: [...EMPTY_BOARD],
    owners: Array(BOTCHEE_BOARD_SIZE).fill(null),
    scores: { human: 0, bot: 0 },
    tray: [],
    selectedDieId: null,
    turn: "human",
    status: "ready",
    endReason: null,
    moves: 0,
    flips: 0,
    startedAtMs: null,
    elapsedMs: 0,
  };
}

export function startBotcheeGame(
  state: BotcheeState,
  nowMs: number,
  random: () => number = Math.random,
): BotcheeState {
  return {
    ...createBotcheeGame(state.mode, state.botLevel),
    tray: state.mode === "flips"
      ? Array.from({ length: BOTCHEE_BOARD_SIZE }, (_, id) => ({ id, face: randomFace(random) }))
      : [],
    status: "playing",
    startedAtMs: nowMs,
  };
}

export function getBotcheeElapsedMs(state: BotcheeState, nowMs: number): number {
  if (state.status !== "playing" || state.startedAtMs === null) return state.elapsedMs;
  return state.elapsedMs + Math.max(0, nowMs - state.startedAtMs);
}

export function isLegalNumber(board: readonly number[], index: number, value: number): boolean {
  if (
    board.length !== BOTCHEE_BOARD_SIZE ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= BOTCHEE_BOARD_SIZE ||
    board[index] !== 0 ||
    !BOTCHEE_VALUES.includes(value as (typeof BOTCHEE_VALUES)[number])
  ) return false;

  const row = BOTCHEE_ROWS[Math.floor(index / 4)];
  const column = BOTCHEE_COLUMNS[index % 4];
  const box = BOTCHEE_BOXES[Math.floor(Math.floor(index / 8) * 2 + (index % 4 >= 2 ? 1 : 0))];
  return !row.some((cell) => board[cell] === value)
    && !column.some((cell) => board[cell] === value)
    && !box.some((cell) => board[cell] === value);
}

export function getLegalPointMoves(board: readonly number[]): readonly PointMove[] {
  const moves: PointMove[] = [];
  for (let index = 0; index < board.length; index += 1) {
    for (const value of BOTCHEE_VALUES) {
      if (isLegalNumber(board, index, value)) moves.push({ kind: "points", index, value });
    }
  }
  return moves;
}

export function getLegalPatternMoves(
  board: readonly number[],
  owners: readonly (BotcheePlayer | null)[],
): readonly PatternMove[] {
  const counts = BOTCHEE_VALUES.map((value) => board.filter((placed) => placed === value).length);
  return board.flatMap((cell, index) => {
    if (cell !== 0) return [];
    return BOTCHEE_VALUES.flatMap((value) =>
      counts[value - 1] < 4 && isLegalNumber(board, index, value) && owners[index] === null
        ? [{ kind: "pattern" as const, index, value }]
        : [],
    );
  });
}

export function getPointMoveScore(board: readonly number[], move: PointMove): number {
  if (!isLegalNumber(board, move.index, move.value)) return 0;
  const next = [...board];
  next[move.index] = move.value;
  const boxIndex = Math.floor(Math.floor(move.index / 8) * 2 + (move.index % 4 >= 2 ? 1 : 0));
  const regions = [
    BOTCHEE_ROWS[Math.floor(move.index / 4)],
    BOTCHEE_COLUMNS[move.index % 4],
    BOTCHEE_BOXES[boxIndex],
  ];
  const bonuses = [5, 5, 7];
  return move.value + regions.reduce(
    (total, region, regionIndex) =>
      total + (region.every((cell) => next[cell] !== 0) ? bonuses[regionIndex] : 0),
    0,
  );
}

function endPointsGame(
  state: BotcheeState,
  board: readonly number[],
  owners: readonly (BotcheePlayer | null)[],
  scores: Readonly<Record<BotcheePlayer, number>>,
  moves: number,
  nowMs: number,
): BotcheeState {
  const boardFull = board.every((value) => value !== 0);
  const winner = scores.human === scores.bot
    ? "draw"
    : scores.human > scores.bot
      ? "won"
      : "lost";
  return {
    ...state,
    board,
    owners,
    scores,
    moves,
    status: winner,
    endReason: boardFull ? "board-full" : "no-legal-moves",
    startedAtMs: null,
    elapsedMs: getBotcheeElapsedMs(state, nowMs),
  };
}

export function playPointMove(
  state: BotcheeState,
  index: number,
  value: number,
  nowMs: number,
): BotcheeState {
  if (state.mode !== "points" || state.status !== "playing") return state;
  if (!isLegalNumber(state.board, index, value)) return state;

  const move: PointMove = { kind: "points", index, value };
  const points = getPointMoveScore(state.board, move);
  const board = [...state.board];
  const owners = [...state.owners];
  board[index] = value;
  owners[index] = state.turn;
  const scores = { ...state.scores, [state.turn]: state.scores[state.turn] + points };
  const moves = state.moves + 1;

  if (board.every((cell) => cell !== 0) || getLegalPointMoves(board).length === 0) {
    return endPointsGame(state, board, owners, scores, moves, nowMs);
  }

  return {
    ...state,
    board,
    owners,
    scores,
    turn: state.turn === "human" ? "bot" : "human",
    moves,
  };
}

export function hasThreeInARow(
  owners: readonly (BotcheePlayer | null)[],
  player: BotcheePlayer,
): boolean {
  return THREE_IN_A_ROW_LINES.some((line) => line.every((index) => owners[index] === player));
}

export function hasFourInARow(board: readonly number[], value: number): boolean {
  return FOUR_IN_A_ROW_LINES.some((line) => line.every((index) => board[index] === value));
}

export function playPatternMove(
  state: BotcheeState,
  index: number,
  value: number,
  nowMs: number,
): BotcheeState {
  if (state.mode !== "fic-fac-foe" || state.status !== "playing") return state;
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= BOTCHEE_BOARD_SIZE ||
    !isLegalPatternMove(state, index, value)
  ) {
    return state;
  }

  const board = [...state.board];
  const owners = [...state.owners];
  board[index] = value;
  owners[index] = state.turn;
  const moves = state.moves + 1;

  if (hasThreeInARow(owners, state.turn)) {
    return {
      ...state,
      board,
      owners,
      moves,
      status: state.turn === "human" ? "won" : "lost",
      endReason: "three-in-a-row",
      startedAtMs: null,
      elapsedMs: getBotcheeElapsedMs(state, nowMs),
    };
  }

  if (board.every((cell) => cell !== 0) || getLegalPatternMoves(board, owners).length === 0) {
    return {
      ...state,
      board,
      owners,
      moves,
      status: "draw",
      endReason: board.every((cell) => cell !== 0) ? "board-full" : "no-legal-moves",
      startedAtMs: null,
      elapsedMs: getBotcheeElapsedMs(state, nowMs),
    };
  }

  return {
    ...state,
    board,
    owners,
    turn: state.turn === "human" ? "bot" : "human",
    moves,
  };
}

export function selectDie(state: BotcheeState, dieId: number): BotcheeState {
  if (
    state.mode !== "flips" ||
    state.status !== "playing" ||
    !state.tray.some((die) => die.id === dieId)
  ) return state;
  return { ...state, selectedDieId: dieId };
}

export function isLegalPatternMove(
  state: BotcheeState,
  index: number,
  value: number,
): boolean {
  if (
    state.mode !== "fic-fac-foe" ||
    state.status !== "playing" ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= BOTCHEE_BOARD_SIZE ||
    state.board[index] !== 0 ||
    state.owners[index] !== null ||
    !BOTCHEE_VALUES.includes(value as (typeof BOTCHEE_VALUES)[number])
  ) return false;
  if (state.board.filter((placed) => placed === value).length >= 4) return false;
  return isLegalNumber(state.board, index, value);
}

export function flipSelectedDie(state: BotcheeState): BotcheeState {
  if (state.mode !== "flips" || state.status !== "playing" || state.selectedDieId === null) return state;
  const selectedDie = state.tray.find((die) => die.id === state.selectedDieId);
  if (!selectedDie) return state;
  const tray = state.tray.map((die) =>
    die.id === state.selectedDieId ? { ...die, face: die.face === 4 ? 1 : die.face + 1 } : die,
  );
  return { ...state, tray, moves: state.moves + 1, flips: state.flips + 1 };
}

export function playFlipsMove(
  state: BotcheeState,
  index: number,
  nowMs: number,
): BotcheeState {
  if (state.mode !== "flips" || state.status !== "playing" || state.selectedDieId === null) return state;
  const die = state.tray.find((candidate) => candidate.id === state.selectedDieId);
  if (!die || !isLegalNumber(state.board, index, die.face)) return state;

  const board = [...state.board];
  const owners = [...state.owners];
  board[index] = die.face;
  owners[index] = "human";
  const tray = state.tray.filter((candidate) => candidate.id !== die.id);
  const moves = state.moves + 1;

  if (board.every((value) => value !== 0)) {
    return {
      ...state,
      board,
      owners,
      tray,
      selectedDieId: null,
      moves,
      status: "solved",
      endReason: "solved",
      startedAtMs: null,
      elapsedMs: getBotcheeElapsedMs(state, nowMs),
    };
  }

  if (!getLegalPointMoves(board).length) {
    return {
      ...state,
      board,
      owners,
      tray,
      selectedDieId: null,
      moves,
      status: "botched",
      endReason: "botched",
      startedAtMs: null,
      elapsedMs: getBotcheeElapsedMs(state, nowMs),
    };
  }

  return { ...state, board, owners, tray, selectedDieId: null, moves };
}

function pick<T>(items: readonly T[], random: () => number): T | undefined {
  if (items.length === 0) return undefined;
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)));
  return items[index];
}

function pickBest<T>(
  candidates: readonly T[],
  score: (candidate: T) => number,
  random: () => number,
): T | undefined {
  if (candidates.length === 0) return undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  let best: T[] = [];
  for (const candidate of candidates) {
    const candidateScore = score(candidate);
    if (candidateScore > bestScore) {
      bestScore = candidateScore;
      best = [candidate];
    } else if (candidateScore === bestScore) {
      best.push(candidate);
    }
  }
  return pick(best, random);
}

function bestPointResponseScore(board: readonly number[]): number {
  const moves = getLegalPointMoves(board);
  return moves.reduce((best, move) => Math.max(best, getPointMoveScore(board, move)), 0);
}

function evaluateFicFacFoe(
  owners: readonly (BotcheePlayer | null)[],
  bot: BotcheePlayer,
): number {
  return THREE_IN_A_ROW_LINES.reduce((total, line) => {
    const botCount = line.filter((index) => owners[index] === bot).length;
    const humanCount = line.filter((index) => owners[index] === (bot === "human" ? "bot" : "human")).length;
    if (botCount > 0 && humanCount > 0) return total;
    const weight = [0, 1, 10, 10_000];
    return total + (botCount > 0 ? weight[botCount] : -weight[humanCount]);
  }, 0);
}

function searchFicFacFoe(
  state: BotcheeState,
  turn: BotcheePlayer,
  bot: BotcheePlayer,
  depth: number,
  alpha: number,
  beta: number,
  cache: Map<string, number>,
): number {
  if (hasThreeInARow(state.owners, bot)) return 10_000 + depth;
  if (hasThreeInARow(state.owners, bot === "human" ? "bot" : "human")) return -10_000 - depth;
  if (depth === 0 || state.status !== "playing") return evaluateFicFacFoe(state.owners, bot);

  const key = `${state.board.join("")}:${state.owners.join("")}:${turn}:${depth}:${bot}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const maximizing = turn === bot;
  let best = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  let pruned = false;
  const moves = getLegalPatternMoves(state.board, state.owners);
  if (moves.length === 0) return evaluateFicFacFoe(state.owners, bot);
  for (const move of moves) {
    const nextBoard = [...state.board];
    const nextOwners = [...state.owners];
    nextBoard[move.index] = move.value;
    nextOwners[move.index] = turn;
    const nextState: BotcheeState = {
      ...state,
      board: nextBoard,
      owners: nextOwners,
      turn: turn === "human" ? "bot" : "human",
      moves: state.moves + 1,
      status: hasThreeInARow(nextOwners, turn) ? (turn === "bot" ? "won" : "lost") : "playing",
      endReason: hasThreeInARow(nextOwners, turn) ? "three-in-a-row" : null,
    };
    const score = searchFicFacFoe(
      nextState,
      turn === "human" ? "bot" : "human",
      bot,
      depth - 1,
      alpha,
      beta,
      cache,
    );
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) {
      pruned = true;
      break;
    }
  }
  if (!pruned) cache.set(key, best);
  return best;
}

export function chooseBotMove(
  state: BotcheeState,
  random: () => number = Math.random,
): BotMove | undefined {
  if (state.status !== "playing" || state.turn !== "bot") return undefined;

  if (state.mode === "points") {
    const moves = getLegalPointMoves(state.board);
    if (state.botLevel === 0) return pick(moves, random);
    if (state.botLevel === 1) {
      return pickBest(moves, (move) => getPointMoveScore(state.board, move), random);
    }
    return pickBest(moves, (move) => {
      const next = [...state.board];
      next[move.index] = move.value;
      return getPointMoveScore(state.board, move) - bestPointResponseScore(next);
    }, random);
  }

  if (state.mode === "fic-fac-foe") {
    const moves = getLegalPatternMoves(state.board, state.owners);
    if (state.botLevel === 0) return pick(moves, random);

    const bot: BotcheePlayer = "bot";
    const winningMove = moves.find((move) => {
      const nextOwners = [...state.owners];
      nextOwners[move.index] = bot;
      return hasThreeInARow(nextOwners, bot);
    });
    if (winningMove) return winningMove;

    const blockingMoves = moves.filter((move) => {
      const nextOwners = [...state.owners];
      nextOwners[move.index] = "human";
      return hasThreeInARow(nextOwners, "human");
    });
    if (blockingMoves.length > 0) {
      if (state.botLevel === 1) return pick(blockingMoves, random);
      return pickBest(blockingMoves, (move) => {
        const nextOwners = [...state.owners];
        nextOwners[move.index] = bot;
        return evaluateFicFacFoe(nextOwners, bot);
      }, random);
    }

    if (state.botLevel === 1) {
      return pickBest(moves, (move) => {
        const nextOwners = [...state.owners];
        nextOwners[move.index] = bot;
        return evaluateFicFacFoe(nextOwners, bot);
      }, random);
    }

    const cache = new Map<string, number>();
    return pickBest(moves, (move) => {
      const nextBoard = [...state.board];
      const nextOwners = [...state.owners];
      nextBoard[move.index] = move.value;
      nextOwners[move.index] = bot;
      const nextState = {
        ...state,
        board: nextBoard,
        owners: nextOwners,
        turn: "human" as const,
        moves: state.moves + 1,
        status: hasThreeInARow(nextOwners, bot) ? "won" as const : "playing" as const,
        endReason: hasThreeInARow(nextOwners, bot) ? "three-in-a-row" as const : null,
      };
      return searchFicFacFoe(
        nextState,
        "human",
        bot,
        3,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        cache,
      );
    }, random);
  }

  return undefined;
}

export interface EloRecord {
  readonly rating: number;
  readonly games: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
}

export const INITIAL_ELO: EloRecord = { rating: 800, games: 0, wins: 0, losses: 0, draws: 0 };
const BOT_ELO: Readonly<Record<BotLevel, number>> = { 0: 600, 1: 900, 2: 1200 };

export function getAdaptiveBotLevel(rating: number): BotLevel {
  if (rating < 700) return 0;
  if (rating < 1_050) return 1;
  return 2;
}

export function updateElo(
  record: EloRecord,
  botLevel: BotLevel,
  result: "win" | "loss" | "draw",
): EloRecord {
  const expected = 1 / (1 + 10 ** ((BOT_ELO[botLevel] - record.rating) / 400));
  const actual = result === "win" ? 1 : result === "loss" ? 0 : 0.5;
  const rating = Math.max(100, Math.round(record.rating + 32 * (actual - expected)));
  return {
    rating,
    games: record.games + 1,
    wins: record.wins + (result === "win" ? 1 : 0),
    losses: record.losses + (result === "loss" ? 1 : 0),
    draws: record.draws + (result === "draw" ? 1 : 0),
  };
}
