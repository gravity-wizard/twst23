import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { updatePersonalBest } from "./engine";
import { readSavedData, savePersonalBests, savePreferences } from "./persistence";

const storage = new Map<string, string>();

function installStorage() {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });
}

describe("local game persistence", () => {
  beforeEach(() => {
    storage.clear();
    installStorage();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("persists mode preferences and personal records", () => {
    savePreferences({ mode: "classic" });
    const bests = updatePersonalBest(
      {
        twisted: { bestMoves: null, bestTimeMs: null },
        classic: { bestMoves: null, bestTimeMs: null },
      },
      "classic",
      { moves: 30, elapsedMs: 42_500 },
    );
    savePersonalBests(bests);

    expect(readSavedData()).toEqual({
      preferences: { mode: "classic" },
      personalBests: bests,
      warning: null,
    });
  });

  it("reports invalid stored scores instead of accepting corrupt records", () => {
    storage.set(
      "twisted23.personal-bests.v1",
      JSON.stringify({ twisted: { bestMoves: -1, bestTimeMs: null } }),
    );

    const saved = readSavedData();
    expect(saved.warning).toMatch(/invalid format/i);
    expect(saved.personalBests.twisted).toEqual({ bestMoves: null, bestTimeMs: null });
  });
});
