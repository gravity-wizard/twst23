import { describe, expect, it } from "vitest";
import {
  EMPTY_HANGMAN_PROFILE,
  HANGMAN_MAX_MISTAKES,
  createHangmanGame,
  getHangmanElapsedMs,
  getHangmanWordRating,
  getWordsForDifficulty,
  guessHangmanLetter,
  recordHangmanWord,
  updateHangmanProfile,
  type HangmanWord,
} from "./hangmanEngine";

const WORD: HangmanWord = {
  id: "test-word",
  word: "GAME",
  category: "Test",
  hint: "A pastime",
  rating: 800,
};

describe("Hangman engine", () => {
  it("filters word sets into non-overlapping rating bands", () => {
    expect(getWordsForDifficulty("easy").every((entry) => entry.rating < 700)).toBe(true);
    expect(getWordsForDifficulty("standard").every((entry) => entry.rating >= 700 && entry.rating < 800)).toBe(true);
    expect(getWordsForDifficulty("challenging").every((entry) => entry.rating >= 800)).toBe(true);
  });

  it("counts unique wrong guesses and detects a win", () => {
    const state = createHangmanGame(WORD, 100);
    const right = guessHangmanLetter(state, "g", 200);
    expect(right.guessedLetters).toEqual(["G"]);
    expect(right.mistakes).toBe(0);
    expect(guessHangmanLetter(right, "G", 300)).toBe(right);
    const won = ["A", "M", "E"].reduce(
      (current, letter) => guessHangmanLetter(current, letter, 1_000),
      right,
    );
    expect(won.status).toBe("won");
    expect(won.elapsedMs).toBe(900);
    expect(getHangmanElapsedMs(won, 4_000)).toBe(900);
  });

  it("ends after seven mistakes and rejects subsequent guesses", () => {
    const letters = "BCDFHI";
    const lost = [...letters].reduce(
      (current, letter) => guessHangmanLetter(current, letter, 2_500),
      createHangmanGame(WORD, 500),
    );
    expect(HANGMAN_MAX_MISTAKES).toBe(6);
    expect(lost.status).toBe("lost");
    expect(lost.elapsedMs).toBe(2_000);
    expect(guessHangmanLetter(lost, "A", 3_000)).toBe(lost);
  });

  it("updates local skill and per-word ratings after a completed game", () => {
    const won = updateHangmanProfile(EMPTY_HANGMAN_PROFILE, 800, true);
    expect(won.rating).toBeGreaterThan(800);
    expect(won).toMatchObject({ games: 1, wins: 1, losses: 0 });
    const withWord = recordHangmanWord(won, WORD.id, true);
    expect(withWord.wordStats[WORD.id]).toEqual({ plays: 1, wins: 1 });
    expect(getHangmanWordRating(WORD, withWord.wordStats[WORD.id])).toBe(1_000);
  });
});
