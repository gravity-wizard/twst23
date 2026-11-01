import { moderateHangmanWord } from "./hangmanModeration";

export interface HangmanWord {
  readonly id: string;
  readonly word: string;
  readonly category: string;
  readonly hint: string;
  readonly rating: number;
}

export const HANGMAN_WORDS: readonly HangmanWord[] = [
  { id: "boardwalk", word: "BOARDWALK", category: "Places", hint: "A path beside the sea", rating: 780 },
  { id: "compass", word: "COMPASS", category: "Travel", hint: "Points north", rating: 650 },
  { id: "constellation", word: "CONSTELLATION", category: "Sky", hint: "A pattern among the stars", rating: 1_180 },
  { id: "detour", word: "DETOUR", category: "Travel", hint: "An alternate route", rating: 510 },
  { id: "firefly", word: "FIREFLY", category: "Nature", hint: "A tiny nighttime light", rating: 620 },
  { id: "fjord", word: "FJORD", category: "Places", hint: "A narrow sea inlet", rating: 890 },
  { id: "galloping", word: "GALLOPING", category: "Movement", hint: "A horse's lively pace", rating: 720 },
  { id: "harbor", word: "HARBOR", category: "Places", hint: "Sheltered water for boats", rating: 590 },
  { id: "jigsaw", word: "JIGSAW", category: "Games", hint: "A picture made of interlocking pieces", rating: 740 },
  { id: "lighthouse", word: "LIGHTHOUSE", category: "Places", hint: "Guides ships from shore", rating: 810 },
  { id: "meadow", word: "MEADOW", category: "Nature", hint: "A grassy open field", rating: 570 },
  { id: "nightingale", word: "NIGHTINGALE", category: "Nature", hint: "A famous songbird", rating: 980 },
  { id: "orbit", word: "ORBIT", category: "Sky", hint: "A path around a planet", rating: 540 },
  { id: "puzzling", word: "PUZZLING", category: "Games", hint: "Mysterious or hard to solve", rating: 690 },
  { id: "quartz", word: "QUARTZ", category: "Nature", hint: "A common crystal", rating: 920 },
  { id: "rookery", word: "ROOKERY", category: "Nature", hint: "A nesting place for birds", rating: 850 },
  { id: "stargazer", word: "STARGAZER", category: "Sky", hint: "Someone who watches the night sky", rating: 760 },
  { id: "tidepool", word: "TIDEPOOL", category: "Nature", hint: "A little sea left among rocks", rating: 680 },
  { id: "wayfinder", word: "WAYFINDER", category: "Travel", hint: "One who discovers a route", rating: 830 },
  { id: "xylophone", word: "XYLOPHONE", category: "Music", hint: "A tuned instrument with wooden bars", rating: 1_100 },
];

export const HANGMAN_MAX_MISTAKES = 6;

export type HangmanStatus = "playing" | "won" | "lost";
export type HangmanDifficulty = "easy" | "standard" | "challenging";
export type HangmanTheme = "evergreen" | "sunset" | "violet";

export interface HangmanState {
  readonly entry: HangmanWord;
  readonly guessedLetters: readonly string[];
  readonly mistakes: number;
  readonly status: HangmanStatus;
  readonly startedAt: number;
  readonly elapsedMs: number;
}

export interface HangmanProfile {
  readonly rating: number;
  readonly games: number;
  readonly wins: number;
  readonly losses: number;
  readonly wordStats: Readonly<Record<string, { readonly plays: number; readonly wins: number }>>;
}

export const EMPTY_HANGMAN_PROFILE: HangmanProfile = {
  rating: 800,
  games: 0,
  wins: 0,
  losses: 0,
  wordStats: {},
};

export function getWordsForDifficulty(
  difficulty: HangmanDifficulty,
  words: readonly HangmanWord[] = HANGMAN_WORDS,
): readonly HangmanWord[] {
  const safeWords = getApprovedHangmanWords(words);
  if (difficulty === "easy") return safeWords.filter((entry) => entry.rating < 700);
  if (difficulty === "challenging") return safeWords.filter((entry) => entry.rating >= 800);
  return safeWords.filter((entry) => entry.rating >= 700 && entry.rating < 800);
}

export function getApprovedHangmanWords(
  words: readonly HangmanWord[] = HANGMAN_WORDS,
): readonly HangmanWord[] {
  return words.filter((entry) => moderateHangmanWord(entry.word).allowed);
}

export function createHangmanGame(entry: HangmanWord, startedAt: number): HangmanState {
  if (!moderateHangmanWord(entry.word).allowed) {
    throw new Error("Hangman word rejected by the content filter.");
  }
  return {
    entry,
    guessedLetters: [],
    mistakes: 0,
    status: "playing",
    startedAt,
    elapsedMs: 0,
  };
}

export function getHangmanElapsedMs(state: HangmanState, nowMs: number): number {
  return state.status === "playing"
    ? Math.max(0, nowMs - state.startedAt)
    : state.elapsedMs;
}

export function guessHangmanLetter(
  state: HangmanState,
  letter: string,
  nowMs: number,
): HangmanState {
  const normalized = letter.toUpperCase();
  if (
    state.status !== "playing" ||
    !/^[A-Z]$/.test(normalized) ||
    state.guessedLetters.includes(normalized)
  ) return state;

  const guessedLetters = [...state.guessedLetters, normalized];
  const mistakes = state.mistakes + (state.entry.word.includes(normalized) ? 0 : 1);
  const won = [...state.entry.word].every((character) => guessedLetters.includes(character));
  const status: HangmanStatus = won ? "won" : mistakes >= HANGMAN_MAX_MISTAKES ? "lost" : "playing";
  return {
    ...state,
    guessedLetters,
    mistakes,
    status,
    elapsedMs: status === "playing" ? 0 : Math.max(0, nowMs - state.startedAt),
  };
}

export function updateHangmanProfile(
  profile: HangmanProfile,
  wordRating: number,
  won: boolean,
): HangmanProfile {
  const expected = 1 / (1 + 10 ** ((wordRating - profile.rating) / 400));
  const rating = Math.max(100, Math.round(profile.rating + 24 * ((won ? 1 : 0) - expected)));
  return {
    rating,
    games: profile.games + 1,
    wins: profile.wins + (won ? 1 : 0),
    losses: profile.losses + (won ? 0 : 1),
    wordStats: profile.wordStats,
  };
}

export function recordHangmanWord(
  profile: HangmanProfile,
  wordId: string,
  won: boolean,
): HangmanProfile {
  const previous = profile.wordStats[wordId] ?? { plays: 0, wins: 0 };
  return {
    ...profile,
    wordStats: {
      ...profile.wordStats,
      [wordId]: {
        plays: previous.plays + 1,
        wins: previous.wins + (won ? 1 : 0),
      },
    },
  };
}

export function getHangmanWordRating(
  entry: HangmanWord,
  stats: HangmanProfile["wordStats"][string] | undefined,
): number {
  if (!stats || stats.plays === 0) return entry.rating;
  return Math.round((stats.wins / stats.plays) * 1_000);
}
