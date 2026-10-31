export type GameMode = "twisted" | "classic";
export type GameStatus = "ready" | "playing" | "won";

export interface BoardCell {
  readonly id: string;
  readonly row: number;
  readonly column: number;
  readonly solvedTile: number;
  readonly neighbors: readonly string[];
}

export interface PuzzleState {
  readonly mode: GameMode;
  readonly tiles: readonly number[];
  readonly moves: number;
  readonly elapsedMs: number;
  readonly startedAtMs: number | null;
  readonly status: GameStatus;
}

export interface ShuffledBoard {
  readonly tiles: readonly number[];
  readonly movedTiles: readonly number[];
}

const twistedCells: readonly BoardCell[] = [
  { id: "ca", row: 2, column: 0, solvedTile: 1, neighbors: ["da", "cb"] },
  { id: "da", row: 3, column: 0, solvedTile: 4, neighbors: ["ca", "db"] },
  { id: "bb", row: 1, column: 1, solvedTile: 2, neighbors: ["cb", "bc"] },
  { id: "cb", row: 2, column: 1, solvedTile: 5, neighbors: ["ca", "db", "bb", "cc"] },
  { id: "db", row: 3, column: 1, solvedTile: 8, neighbors: ["cb", "eb", "da", "dc"] },
  { id: "eb", row: 4, column: 1, solvedTile: 11, neighbors: ["db", "ec"] },
  { id: "ac", row: 0, column: 2, solvedTile: 3, neighbors: ["bc", "ad"] },
  { id: "bc", row: 1, column: 2, solvedTile: 6, neighbors: ["ac", "cc", "bb", "bd"] },
  { id: "cc", row: 2, column: 2, solvedTile: 9, neighbors: ["cb", "dc", "bc", "cd"] },
  { id: "dc", row: 3, column: 2, solvedTile: 12, neighbors: ["cc", "ec", "db", "dd"] },
  { id: "ec", row: 4, column: 2, solvedTile: 15, neighbors: ["dc", "fc", "eb", "ed"] },
  { id: "fc", row: 5, column: 2, solvedTile: 18, neighbors: ["ec", "fd"] },
  { id: "ad", row: 0, column: 3, solvedTile: 7, neighbors: ["ac", "bd"] },
  { id: "bd", row: 1, column: 3, solvedTile: 10, neighbors: ["ad", "cd", "bc", "be"] },
  { id: "cd", row: 2, column: 3, solvedTile: 13, neighbors: ["bd", "dd", "cc", "ce"] },
  { id: "dd", row: 3, column: 3, solvedTile: 16, neighbors: ["cd", "ed", "dc", "de"] },
  { id: "ed", row: 4, column: 3, solvedTile: 19, neighbors: ["dd", "fd", "ec", "ee"] },
  { id: "fd", row: 5, column: 3, solvedTile: 22, neighbors: ["ed", "fc"] },
  { id: "be", row: 1, column: 4, solvedTile: 14, neighbors: ["bd", "ce"] },
  { id: "ce", row: 2, column: 4, solvedTile: 17, neighbors: ["be", "de", "cd", "cf"] },
  { id: "de", row: 3, column: 4, solvedTile: 20, neighbors: ["ce", "ee", "dd", "df"] },
  { id: "ee", row: 4, column: 4, solvedTile: 23, neighbors: ["de", "ed"] },
  { id: "cf", row: 2, column: 5, solvedTile: 21, neighbors: ["ce", "df"] },
  { id: "df", row: 3, column: 5, solvedTile: 0, neighbors: ["cf", "de"] },
];

const classicCells: readonly BoardCell[] = Array.from({ length: 24 }, (_, index) => {
  const row = Math.floor(index / 4);
  const column = index % 4;
  const neighbors: string[] = [];

  if (row > 0) neighbors.push(`r${row}c${column + 1}`);
  if (row < 5) neighbors.push(`r${row + 2}c${column + 1}`);
  if (column > 0) neighbors.push(`r${row + 1}c${column}`);
  if (column < 3) neighbors.push(`r${row + 1}c${column + 2}`);

  return {
    id: `r${row + 1}c${column + 1}`,
    row,
    column,
    solvedTile: index === 23 ? 0 : index + 1,
    neighbors,
  };
});

export const BOARD_CELLS: Readonly<Record<GameMode, readonly BoardCell[]>> = {
  twisted: twistedCells,
  classic: classicCells,
};

const cellIndexes: Readonly<Record<GameMode, ReadonlyMap<string, number>>> = {
  twisted: new Map(twistedCells.map((cell, index) => [cell.id, index])),
  classic: new Map(classicCells.map((cell, index) => [cell.id, index])),
};

export function createGame(mode: GameMode): PuzzleState {
  return {
    mode,
    tiles: BOARD_CELLS[mode].map((cell) => cell.solvedTile),
    moves: 0,
    elapsedMs: 0,
    startedAtMs: null,
    status: "ready",
  };
}

export function isSolved(state: PuzzleState): boolean {
  return state.tiles.every((tile, index) => tile === BOARD_CELLS[state.mode][index].solvedTile);
}

export function isLegalMove(state: PuzzleState, fromCellId: string): boolean {
  if (state.status !== "playing") return false;
  const blankIndex = state.tiles.indexOf(0);
  const fromIndex = cellIndexes[state.mode].get(fromCellId);
  if (fromIndex === undefined || blankIndex < 0 || state.tiles[fromIndex] === 0) return false;
  const blankCell = BOARD_CELLS[state.mode][blankIndex];
  return blankCell.neighbors.includes(fromCellId);
}

export function moveTile(
  state: PuzzleState,
  fromCellId: string,
  nowMs: number,
): PuzzleState {
  if (!isLegalMove(state, fromCellId)) return state;

  const fromIndex = cellIndexes[state.mode].get(fromCellId);
  const blankIndex = state.tiles.indexOf(0);
  if (fromIndex === undefined) return state;

  const tiles = [...state.tiles];
  [tiles[blankIndex], tiles[fromIndex]] = [tiles[fromIndex], tiles[blankIndex]];
  const completed = tiles.every((tile, index) => tile === BOARD_CELLS[state.mode][index].solvedTile);
  const elapsedMs = completed ? getElapsedMs(state, nowMs) : state.elapsedMs;

  return {
    ...state,
    tiles,
    moves: state.moves + 1,
    elapsedMs,
    startedAtMs: completed ? null : state.startedAtMs,
    status: completed ? "won" : "playing",
  };
}

export function getElapsedMs(state: PuzzleState, nowMs: number): number {
  if (state.status !== "playing" || state.startedAtMs === null) return state.elapsedMs;
  return state.elapsedMs + Math.max(0, nowMs - state.startedAtMs);
}

export function shuffleFromSolved(
  mode: GameMode,
  steps: number,
  random: () => number = Math.random,
): ShuffledBoard {
  if (!Number.isInteger(steps) || steps < 1) {
    throw new RangeError("Shuffle steps must be a positive integer.");
  }

  const cells = BOARD_CELLS[mode];
  const cellIndex = cellIndexes[mode];
  const tiles = cells.map((cell) => cell.solvedTile);
  const movedTiles: number[] = [];
  let blankIndex = tiles.indexOf(0);
  let previousBlankId: string | null = null;

  for (let step = 0; step < steps; step += 1) {
    const blankId = cells[blankIndex].id;
    const available = cells[blankIndex].neighbors.filter((id) => id !== previousBlankId);
    const choices = available.length > 0 ? available : cells[blankIndex].neighbors;
    const selected = Math.min(
      choices.length - 1,
      Math.max(0, Math.floor(random() * choices.length)),
    );
    const fromCellId = choices[selected];
    const fromIndex = cellIndex.get(fromCellId);

    if (fromIndex === undefined) {
      throw new Error(`Board topology references an unknown cell: ${fromCellId}`);
    }

    movedTiles.push(tiles[fromIndex]);
    [tiles[blankIndex], tiles[fromIndex]] = [tiles[fromIndex], tiles[blankIndex]];
    previousBlankId = blankId;
    blankIndex = fromIndex;
  }

  if (tiles.every((tile, index) => tile === cells[index].solvedTile)) {
    const neighborId = cells[blankIndex].neighbors[0];
    const neighborIndex = cellIndex.get(neighborId);
    if (neighborIndex === undefined) {
      throw new Error(`Board topology references an unknown cell: ${neighborId}`);
    }
    movedTiles.push(tiles[neighborIndex]);
    [tiles[blankIndex], tiles[neighborIndex]] = [tiles[neighborIndex], tiles[blankIndex]];
  }

  return { tiles, movedTiles };
}

export function shuffleGame(
  mode: GameMode,
  nowMs: number,
  random: () => number = Math.random,
): PuzzleState {
  const { tiles } = shuffleFromSolved(mode, 180, random);
  return {
    mode,
    tiles,
    moves: 0,
    elapsedMs: 0,
    startedAtMs: nowMs,
    status: "playing",
  };
}

export interface PersonalBest {
  readonly bestMoves: number | null;
  readonly bestTimeMs: number | null;
}

export type PersonalBests = Readonly<Record<GameMode, PersonalBest>>;

export const EMPTY_PERSONAL_BESTS: PersonalBests = {
  twisted: { bestMoves: null, bestTimeMs: null },
  classic: { bestMoves: null, bestTimeMs: null },
};

export function updatePersonalBest(
  bests: PersonalBests,
  mode: GameMode,
  result: { readonly moves: number; readonly elapsedMs: number },
): PersonalBests {
  if (
    !Number.isInteger(result.moves) ||
    result.moves < 1 ||
    !Number.isFinite(result.elapsedMs) ||
    result.elapsedMs < 0
  ) return bests;

  const current = bests[mode];
  return {
    ...bests,
    [mode]: {
      bestMoves: current.bestMoves === null ? result.moves : Math.min(current.bestMoves, result.moves),
      bestTimeMs:
        current.bestTimeMs === null ? result.elapsedMs : Math.min(current.bestTimeMs, result.elapsedMs),
    },
  };
}
