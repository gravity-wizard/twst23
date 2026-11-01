import {
  EMPTY_HANGMAN_PROFILE,
  type HangmanDifficulty,
  type HangmanProfile,
  type HangmanTheme,
} from "./hangmanEngine";

const PROFILE_KEY = "game-town.hangman-profile.v1";
const PREFERENCES_KEY = "game-town.hangman-preferences.v1";

export interface HangmanPreferences {
  readonly difficulty: HangmanDifficulty;
  readonly theme: HangmanTheme;
  readonly showHint: boolean;
}

export const DEFAULT_HANGMAN_PREFERENCES: HangmanPreferences = {
  difficulty: "standard",
  theme: "evergreen",
  showHint: true,
};

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isHangmanProfile(value: unknown): value is HangmanProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  if (
    !Number.isInteger(profile.rating) || Number(profile.rating) < 100 ||
    !isNonNegativeInteger(profile.games) ||
    !isNonNegativeInteger(profile.wins) ||
    !isNonNegativeInteger(profile.losses) ||
    !profile.wordStats || typeof profile.wordStats !== "object" || Array.isArray(profile.wordStats)
  ) return false;
  return Object.values(profile.wordStats).every((stats) => {
    if (!stats || typeof stats !== "object") return false;
    const record = stats as Record<string, unknown>;
    return isNonNegativeInteger(record.plays) &&
      isNonNegativeInteger(record.wins) &&
      Number(record.wins) <= Number(record.plays);
  });
}

function isPreferences(value: unknown): value is HangmanPreferences {
  if (!value || typeof value !== "object") return false;
  const preferences = value as Record<string, unknown>;
  return (preferences.difficulty === "easy" ||
      preferences.difficulty === "standard" ||
      preferences.difficulty === "challenging") &&
    (preferences.theme === "evergreen" ||
      preferences.theme === "sunset" ||
      preferences.theme === "violet") &&
    typeof preferences.showHint === "boolean";
}

export function readHangmanProfile(): { readonly profile: HangmanProfile; readonly warning: string | null } {
  try {
    const saved = window.localStorage.getItem(PROFILE_KEY);
    if (!saved) return { profile: EMPTY_HANGMAN_PROFILE, warning: null };
    const parsed: unknown = JSON.parse(saved);
    if (!isHangmanProfile(parsed)) throw new Error("Saved Hangman records have an invalid format.");
    return { profile: parsed, warning: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown storage error";
    return { profile: EMPTY_HANGMAN_PROFILE, warning: `Local records could not be read: ${reason}` };
  }
}

export function readHangmanPreferences(): {
  readonly preferences: HangmanPreferences;
  readonly warning: string | null;
} {
  try {
    const saved = window.localStorage.getItem(PREFERENCES_KEY);
    if (!saved) return { preferences: DEFAULT_HANGMAN_PREFERENCES, warning: null };
    const parsed: unknown = JSON.parse(saved);
    if (!isPreferences(parsed)) throw new Error("Saved Hangman preferences have an invalid format.");
    return { preferences: parsed, warning: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown storage error";
    return { preferences: DEFAULT_HANGMAN_PREFERENCES, warning: `Preferences could not be read: ${reason}` };
  }
}

export function saveHangmanProfile(profile: HangmanProfile): string | null {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return null;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown storage error";
    return `Local records could not be saved: ${reason}`;
  }
}

export function saveHangmanPreferences(preferences: HangmanPreferences): string | null {
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    return null;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown storage error";
    return `Preferences could not be saved: ${reason}`;
  }
}
