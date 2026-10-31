import { describe, expect, it } from "vitest";
import {
  BOTCHEE_BOXES,
  BOTCHEE_COLUMNS,
  BOTCHEE_ROWS,
  FOUR_IN_A_ROW_LINES,
  THREE_IN_A_ROW_LINES,
  chooseBotMove,
  createBotcheeGame,
  getAdaptiveBotLevel,
  getBotcheeElapsedMs,
  getLegalPointMoves,
  getLegalPatternMoves,
  getPointMoveScore,
  hasFourInARow,
  hasThreeInARow,
  isLegalNumber,
  isLegalPatternMove,
  playFlipsMove,
  playPatternMove,
  playPointMove,
  selectDie,
  flipSelectedDie,
  startBotcheeGame,
  updateElo,
} from "./botcheeEngine";

const SOLVED_BOARD = [
  1, 2, 3, 4,
  3, 4, 1, 2,
  2, 1, 4, 3,
  4, 3, 2, 1,
];

describe("Botchee 4×4 topology", () => {
  it("defines 4 rows, 4 columns, 4 corner boxes, and 10 four-in-a-row lines", () => {
    expect(BOTCHEE_ROWS).toHaveLength(4);
    expect(BOTCHEE_COLUMNS).toHaveLength(4);
    expect(BOTCHEE_BOXES).toHaveLength(4);
    expect(FOUR_IN_A_ROW_LINES).toHaveLength(10);
    expect(BOTCHEE_BOXES[0]).toEqual([0, 1, 4, 5]);
    expect(FOUR_IN_A_ROW_LINES.slice(-2)).toEqual([[0, 5, 10, 15], [3, 6, 9, 12]]);
  });
});

describe("Points mode", () => {
  it("rejects repeated values in a row, column, box, and occupied cell", () => {
    const state = startBotcheeGame(createBotcheeGame("points"), 1);
    expect(isLegalNumber(state.board, 0, 1)).toBe(true);
    expect(isLegalNumber([1, ...state.board.slice(1)], 1, 1)).toBe(false);
    expect(isLegalNumber([1, ...state.board.slice(1)], 4, 1)).toBe(false);
    expect(isLegalNumber([1, ...state.board.slice(1)], 5, 1)).toBe(false);
    expect(isLegalNumber([1, ...state.board.slice(1)], 0, 2)).toBe(false);
    expect(getLegalPointMoves(state.board)).toHaveLength(64);
  });

  it("scores the die and all newly completed regions", () => {
    const board = [...SOLVED_BOARD];
    board[15] = 0;
    const state = {
      ...startBotcheeGame(createBotcheeGame("points"), 10),
      board,
    };
    const move = { kind: "points" as const, index: 15, value: 1 };
    expect(getPointMoveScore(board, move)).toBe(18);

    const next = playPointMove(state, move.index, move.value, 20);
    expect(next.board).toEqual(SOLVED_BOARD);
    expect(next.scores.human).toBe(18);
    expect(next.moves).toBe(1);
    expect(next.status).toBe("won");
    expect(next.endReason).toBe("board-full");
    expect(next.elapsedMs).toBe(10);
    expect(getBotcheeElapsedMs(next, 1000)).toBe(10);
  });

  it("leaves the state untouched after an invalid placement", () => {
    const state = startBotcheeGame(createBotcheeGame("points"), 0);
    expect(playPointMove(state, 16, 1, 100)).toBe(state);
    expect(playPointMove(state, 0, 0, 100)).toBe(state);
  });

  it("offers three distinct bot levels with only legal moves", () => {
    for (const botLevel of [0, 1, 2] as const) {
      const state = {
        ...startBotcheeGame(createBotcheeGame("points", botLevel), 0),
        turn: "bot" as const,
      };
      const move = chooseBotMove(state, () => 0);
      expect(move?.kind).toBe("points");
      if (move?.kind === "points") {
        expect(isLegalNumber(state.board, move.index, move.value)).toBe(true);
      }
    }
  });

  it("uses the highest immediate-scoring move for level 1", () => {
    const board = [...SOLVED_BOARD];
    board[15] = 0;
    const state = {
      ...startBotcheeGame(createBotcheeGame("points", 1), 0),
      board,
      turn: "bot" as const,
    };
    const move = chooseBotMove(state, () => 0);
    expect(move).toEqual({ kind: "points", index: 15, value: 1 });
    if (move?.kind === "points") expect(getPointMoveScore(board, move)).toBe(18);
  });
});

describe("Fic-Fac-Foe mode", () => {
  it("recognizes horizontal, vertical, and both diagonal wins", () => {
    expect(THREE_IN_A_ROW_LINES).toHaveLength(20);
    expect(hasThreeInARow(["human", "human", "human", null, ...Array(12).fill(null)], "human")).toBe(true);
    expect(hasThreeInARow([null, "bot", null, null, null, "bot", null, null, null, "bot", null, null, null, null, null, null], "bot")).toBe(true);
    expect(hasThreeInARow(["human", null, null, null, null, "human", null, null, null, null, "human", null, null, null, null, null], "human")).toBe(true);
    expect(hasThreeInARow([null, null, null, "bot", null, null, "bot", null, null, "bot", null, null, "bot", null, null, null], "bot")).toBe(true);
    expect(hasFourInARow([1, 1, 1, 1, ...Array(12).fill(0)], 1)).toBe(true);
  });

  it("limits each number to four and applies row, column, and box Sudoku rules", () => {
    const state = {
      ...startBotcheeGame(createBotcheeGame("fic-fac-foe"), 0),
      board: [1, ...Array(15).fill(0)],
    };
    expect(isLegalPatternMove(state, 1, 1)).toBe(false);
    expect(isLegalPatternMove(state, 4, 1)).toBe(false);
    expect(isLegalPatternMove(state, 5, 1)).toBe(false);
    expect(isLegalPatternMove(state, 1, 2)).toBe(true);
    expect(getLegalPatternMoves(state.board, state.owners).every((move) => move.value !== 1)).toBe(false);
    const fourOnes = { ...state, board: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] };
    expect(getLegalPatternMoves(fourOnes.board, fourOnes.owners).every((move) => move.value !== 1)).toBe(true);
  });

  it("wins on three owned marks regardless of chosen number and freezes the elapsed timer", () => {
    const state = {
      ...startBotcheeGame(createBotcheeGame("fic-fac-foe"), 100),
      board: [1, 2, 3, 0, ...Array(12).fill(0)],
      owners: ["human", "human", "human", null, ...Array(12).fill(null)],
      turn: "human" as const,
    };
    const next = playPatternMove(state, 3, 4, 230);
    expect(next.status).toBe("won");
    expect(next.endReason).toBe("three-in-a-row");
    expect(next.moves).toBe(1);
    expect(next.elapsedMs).toBe(130);
    expect(getBotcheeElapsedMs(next, 2000)).toBe(130);
  });

  it("alternates ownership while each player chooses a legal number", () => {
    const started = startBotcheeGame(createBotcheeGame("fic-fac-foe"), 10);
    const humanMove = playPatternMove(started, 0, 1, 20);
    expect(humanMove.turn).toBe("bot");
    expect(humanMove.owners[0]).toBe("human");

    const botMove = playPatternMove(humanMove, 5, 2, 30);
    expect(botMove.turn).toBe("human");
    expect(botMove.owners[5]).toBe("bot");
    expect(botMove.board[5]).toBe(2);
  });

  it("blocks an immediate three-in-a-row at level 1 and level 2", () => {
    for (const botLevel of [1, 2] as const) {
      const state = {
        ...startBotcheeGame(createBotcheeGame("fic-fac-foe", botLevel), 0),
        board: [1, 2, 3, 0, ...Array(12).fill(0)],
        owners: ["human", "human", "human", null, ...Array(12).fill(null)],
        turn: "bot" as const,
      };
      const move = chooseBotMove(state, () => 0);
      expect(move?.kind).toBe("pattern");
      if (move?.kind === "pattern") {
        expect(move.index).toBe(3);
        expect(isLegalPatternMove(state, move.index, move.value)).toBe(true);
      }
    }
  });
});

describe("adaptive local Elo", () => {
  it("updates rating after match results and selects stronger bots as rating rises", () => {
    const draw = updateElo({ rating: 800, games: 0, wins: 0, losses: 0, draws: 0 }, 1, "draw");
    expect(draw).toEqual({ rating: 804, games: 1, wins: 0, losses: 0, draws: 1 });
    expect(updateElo(draw, 1, "win").rating).toBeGreaterThan(draw.rating);
    expect(updateElo(draw, 1, "loss").rating).toBeLessThan(draw.rating);
    expect(getAdaptiveBotLevel(699)).toBe(0);
    expect(getAdaptiveBotLevel(700)).toBe(1);
    expect(getAdaptiveBotLevel(1_050)).toBe(2);
  });
});

describe("Flips mode", () => {
  it("counts both flips and placements and solves a valid completed board", () => {
    const board = [...SOLVED_BOARD];
    board[15] = 0;
    const started = {
      ...startBotcheeGame(createBotcheeGame("flips"), 100, () => 0),
      board,
      tray: [{ id: 8, face: 4 }],
    };
    const selected = selectDie(started, 8);
    const flipped = flipSelectedDie(selected);
    expect(flipped.tray[0].face).toBe(1);
    expect(flipped.moves).toBe(1);
    expect(flipped.flips).toBe(1);

    const solved = playFlipsMove(flipped, 15, 150);
    expect(solved.status).toBe("solved");
    expect(solved.endReason).toBe("solved");
    expect(solved.moves).toBe(2);
    expect(solved.elapsedMs).toBe(50);
    expect(solved.board).toEqual(SOLVED_BOARD);
  });

  it("does not place a die into a conflicting square", () => {
    const state = {
      ...startBotcheeGame(createBotcheeGame("flips"), 0, () => 0),
      tray: [{ id: 1, face: 1 }],
      selectedDieId: 1,
      board: [1, ...Array(15).fill(0)],
    };
    expect(playFlipsMove(state, 1, 10)).toBe(state);
  });
});
