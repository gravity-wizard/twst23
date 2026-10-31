import { describe, expect, it } from "vitest";
import { addGameLog, summarizeGameLogs, type GameLog } from "./botcheeHistory";

const log = (id: string, mode: GameLog["mode"], status: GameLog["status"], endReason: string | null = null): GameLog => ({
  id,
  startedAtMs: 1,
  endedAtMs: 2,
  mode,
  botLevel: 2,
  status,
  endReason,
  moves: 4,
  elapsedMs: 1000,
  scores: { human: 4, bot: 2 },
  actions: [],
});

describe("local game history", () => {
  it("summarizes outcomes and mode counts without sending data", () => {
    const stats = summarizeGameLogs([
      log("a", "points", "lost", "no-legal-moves"),
      log("b", "flips", "abandoned"),
      log("c", "fic-fac-foe", "won"),
      log("d", "fic-fac-foe", "draw", "no-legal-moves"),
    ]);

    expect(stats).toEqual({
      totalGames: 4,
      completedGames: 3,
      abandonedGames: 1,
      activeGames: 0,
      botches: 1,
      byMode: { points: 1, "fic-fac-foe": 2, flips: 1 },
    });
  });

  it("keeps the newest game logs within the retention limit", () => {
    expect(addGameLog([log("old", "points", "won")], log("new", "flips", "solved"), 1).map(({ id }) => id))
      .toEqual(["new"]);
  });

  it("replaces a saved in-progress snapshot when the same game advances", () => {
    const first = log("current", "points", "playing");
    const next = { ...first, moves: 2, endedAtMs: 3 };
    const saved = addGameLog([first], next);
    expect(saved).toHaveLength(1);
    expect(saved[0].moves).toBe(2);
    expect(summarizeGameLogs(saved).activeGames).toBe(1);
  });
});
