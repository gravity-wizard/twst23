import { describe, expect, it } from "vitest";
import {
  BOARD_CELLS,
  createGame,
  getElapsedMs,
  isLegalMove,
  isSolved,
  moveTile,
  shuffleFromSolved,
  shuffleGame,
  updatePersonalBest,
  type PuzzleState,
} from "./engine";

describe("Twisted 23 board topology", () => {
  it("has the original 24-cell sparse 6x6 mask and solved order", () => {
    const cells = BOARD_CELLS.twisted;
    expect(cells).toHaveLength(24);
    expect(cells.map((cell) => cell.id)).toEqual([
      "ca", "da", "bb", "cb", "db", "eb", "ac", "bc",
      "cc", "dc", "ec", "fc", "ad", "bd", "cd", "dd",
      "ed", "fd", "be", "ce", "de", "ee", "cf", "df",
    ]);
    expect(cells.map((cell) => cell.solvedTile)).toEqual([
      1, 4, 2, 5, 8, 11, 3, 6, 9, 12, 15, 18,
      7, 10, 13, 16, 19, 22, 14, 17, 20, 23, 21, 0,
    ]);
    expect(cells[23].neighbors).toEqual(["cf", "de"]);
    expect(cells.find((cell) => cell.id === "ac")?.neighbors).toEqual(["bc", "ad"]);
  });

  it("has a separate conventional 4-column by 6-row topology", () => {
    const cells = BOARD_CELLS.classic;
    expect(cells).toHaveLength(24);
    expect(cells[0].neighbors).toEqual(["r2c1", "r1c2"]);
    expect(cells[23].neighbors).toEqual(["r5c4", "r6c3"]);
    expect(cells.map((cell) => cell.solvedTile)).toEqual([
      ...Array.from({ length: 23 }, (_, index) => index + 1),
      0,
    ]);
  });

  it("encodes reciprocal edges in both graphs", () => {
    for (const cells of Object.values(BOARD_CELLS)) {
      const byId = new Map(cells.map((cell) => [cell.id, cell]));
      for (const cell of cells) {
        for (const neighborId of cell.neighbors) {
          expect(byId.get(neighborId)?.neighbors).toContain(cell.id);
        }
      }
    }
  });
});

describe("puzzle transitions", () => {
  it("allows only adjacent tiles to move into the blank", () => {
    const game = shuffleGame("twisted", 1, () => 0);
    const blank = game.tiles.indexOf(0);
    const blankCell = BOARD_CELLS.twisted[blank];
    const legalCell = blankCell.neighbors[0];
    const illegalCell = BOARD_CELLS.twisted.find(
      (cell) => cell.id !== legalCell && !blankCell.neighbors.includes(cell.id),
    )!;

    expect(isLegalMove(game, legalCell)).toBe(true);
    expect(isLegalMove(game, illegalCell.id)).toBe(false);
    expect(moveTile(game, illegalCell.id, 100)).toBe(game);
    expect(moveTile(createGame("twisted"), "ca", 10).moves).toBe(0);
  });

  it("counts a legal move and detects the solved state", () => {
    const solved = createGame("classic");
    const shuffled = shuffleGame("classic", 0, () => 0);
    const blank = shuffled.tiles.indexOf(0);
    const fromCell = BOARD_CELLS.classic[blank].neighbors[0];
    const moved = moveTile(shuffled, fromCell, 250);

    expect(moved.moves).toBe(1);
    expect(isSolved(moved)).toBe(false);
    expect(isSolved(solved)).toBe(true);
  });

  it("creates only reachable shuffled states and starts the clock after shuffling", () => {
    for (const mode of ["twisted", "classic"] as const) {
      const shuffled = shuffleFromSolved(mode, 125, () => 0.42);
      let replay: PuzzleState = createGame(mode);
      replay = { ...replay, status: "playing", startedAtMs: 0 };

      for (const tile of shuffled.movedTiles) {
        const fromCell = BOARD_CELLS[mode][replay.tiles.indexOf(tile)].id;
        expect(isLegalMove(replay, fromCell)).toBe(true);
        replay = moveTile(replay, fromCell, 0);
      }
      expect(replay.tiles).toEqual(shuffled.tiles);
      expect(isSolved(replay)).toBe(false);

      const started = shuffleGame(mode, 1_000, () => 0.42);
      expect(started.status).toBe("playing");
      expect(started.startedAtMs).toBe(1_000);
      expect(started.moves).toBe(0);
    }
  });

  it("tracks elapsed time and freezes it when the last tile is restored", () => {
    const shuffled = shuffleFromSolved("classic", 1, () => 0);
    let game: PuzzleState = {
      ...createGame("classic"),
      tiles: shuffled.tiles,
      status: "playing" as const,
      startedAtMs: 2_000,
    };
    expect(getElapsedMs(game, 2_750)).toBe(750);

    const tileToReturn = shuffled.movedTiles[0];
    const fromCell = BOARD_CELLS.classic[game.tiles.indexOf(tileToReturn)].id;
    game = moveTile(game, fromCell, 2_900);
    expect(game.status).toBe("won");
    expect(game.elapsedMs).toBe(900);
    expect(game.startedAtMs).toBeNull();
    expect(getElapsedMs(game, 9_000)).toBe(900);
  });

  it("updates move and time records independently", () => {
    const bests = updatePersonalBest(
      {
        twisted: { bestMoves: 14, bestTimeMs: 50_000 },
        classic: { bestMoves: null, bestTimeMs: null },
      },
      "twisted",
      { moves: 12, elapsedMs: 52_000 },
    );

    expect(bests.twisted).toEqual({ bestMoves: 12, bestTimeMs: 50_000 });
    expect(updatePersonalBest(bests, "twisted", { moves: 13, elapsedMs: 40_000 }).twisted)
      .toEqual({ bestMoves: 12, bestTimeMs: 40_000 });
    expect(updatePersonalBest(bests, "twisted", { moves: 0, elapsedMs: 2 }).twisted)
      .toEqual(bests.twisted);
  });
});
