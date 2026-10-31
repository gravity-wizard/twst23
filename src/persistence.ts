import {
  EMPTY_PERSONAL_BESTS,
  type GameMode,
  type PersonalBests,
} from "./engine";

const PREFERENCES_KEY = "twisted23.preferences.v1";
const PERSONAL_BESTS_KEY = "twisted23.personal-bests.v1";

export interface Preferences {
  readonly mode: GameMode;
}

export interface SavedData {
  readonly preferences: Preferences;
  readonly personalBests: PersonalBests;
  readonly warning: string | null;
}

const DEFAULT_PREFERENCES: Preferences = { mode: "twisted" };

function isGameMode(value: unknown): value is GameMode {
  return value === "twisted" || value === "classic";
}

function isPersonalBest(value: unknown): value is PersonalBests {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;

  return (["twisted", "classic"] as const).every((mode) => {
    const best = record[mode];
    if (!best || typeof best !== "object") return false;
    const candidate = best as Record<string, unknown>;
    const validMoves = (entry: unknown) =>
      entry === null || (typeof entry === "number" && Number.isInteger(entry) && entry >= 0);
    const validTime = (entry: unknown) =>
      entry === null || (typeof entry === "number" && Number.isFinite(entry) && entry >= 0);
    return validMoves(candidate.bestMoves) && validTime(candidate.bestTimeMs);
  });
}

export function readSavedData(): SavedData {
  try {
    const savedPreferences = window.localStorage.getItem(PREFERENCES_KEY);
    const savedBests = window.localStorage.getItem(PERSONAL_BESTS_KEY);
    const preferences = savedPreferences ? JSON.parse(savedPreferences) as Record<string, unknown> : {};
    const personalBests = savedBests ? JSON.parse(savedBests) as unknown : EMPTY_PERSONAL_BESTS;

    if (savedBests && !isPersonalBest(personalBests)) {
      throw new Error("Saved personal bests have an invalid format.");
    }

    return {
      preferences: { mode: isGameMode(preferences.mode) ? preferences.mode : DEFAULT_PREFERENCES.mode },
      personalBests: personalBests as PersonalBests,
      warning: null,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown storage error";
    return {
      preferences: DEFAULT_PREFERENCES,
      personalBests: EMPTY_PERSONAL_BESTS,
      warning: `Saved game data could not be read: ${reason}`,
    };
  }
}

export function savePreferences(preferences: Preferences): string | null {
  return saveJson(PREFERENCES_KEY, preferences);
}

export function savePersonalBests(personalBests: PersonalBests): string | null {
  return saveJson(PERSONAL_BESTS_KEY, personalBests);
}

function saveJson(key: string, value: unknown): string | null {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return null;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown storage error";
    return `Game data could not be saved: ${reason}`;
  }
}
