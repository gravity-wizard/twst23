import { describe, expect, it } from "vitest";
import {
  HANGMAN_WORDS,
  createHangmanGame,
  getApprovedHangmanWords,
  getWordsForDifficulty,
} from "./hangmanEngine";
import { moderateHangmanWord } from "./hangmanModeration";

describe("Hangman word moderation", () => {
  it("allows normal words and folds accented spelling", () => {
    expect(moderateHangmanWord("café")).toEqual({ allowed: true, word: "CAFE" });
    expect(moderateHangmanWord("lighthouse")).toEqual({ allowed: true, word: "LIGHTHOUSE" });
  });

  it("rejects known English profanity, including common leetspeak", () => {
    expect(moderateHangmanWord("fuck")).toEqual({ allowed: false, reason: "offensive" });
    expect(moderateHangmanWord("sh1t")).toEqual({ allowed: false, reason: "offensive" });
  });

  it("does not reject safe words containing a blocked spelling as a substring", () => {
    expect(moderateHangmanWord("compass")).toEqual({ allowed: true, word: "COMPASS" });
    expect(moderateHangmanWord("classic")).toEqual({ allowed: true, word: "CLASSIC" });
  });

  it("requires a bounded, single-word letter input", () => {
    expect(moderateHangmanWord("A")).toEqual({ allowed: false, reason: "length" });
    expect(moderateHangmanWord("supercalifragilisticexpialidocious")).toEqual({
      allowed: false,
      reason: "length",
    });
    expect(moderateHangmanWord("two words")).toEqual({ allowed: false, reason: "characters" });
    expect(moderateHangmanWord("---")).toEqual({ allowed: false, reason: "characters" });
  });

  it("keeps the built-in dictionary screened and refuses unsafe game entries", () => {
    expect(HANGMAN_WORDS.every((entry) => moderateHangmanWord(entry.word).allowed)).toBe(true);
    expect(() => createHangmanGame({
      id: "unsafe",
      word: "fuck",
      category: "test",
      hint: "not allowed",
      rating: 800,
    }, 0)).toThrow("Hangman word rejected by the content filter.");
    const unsafeWord = { ...HANGMAN_WORDS[0], id: "unsafe", word: "sh1t" };
    expect(getApprovedHangmanWords([HANGMAN_WORDS[0], unsafeWord])).toEqual([HANGMAN_WORDS[0]]);
    expect(getWordsForDifficulty("easy").some((entry) => entry.word === "COMPASS")).toBe(true);
  });
});
