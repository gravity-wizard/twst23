const ENGLISH_BLOCKED_WORDS = new Set([
  "arse",
  "arsehole",
  "ass",
  "asshole",
  "bastard",
  "bitch",
  "bollocks",
  "bullshit",
  "cock",
  "crap",
  "cunt",
  "dammit",
  "damn",
  "dick",
  "dumbass",
  "fucking",
  "fuck",
  "motherfucker",
  "piss",
  "prick",
  "pussy",
  "shit",
  "shithead",
  "slut",
  "twat",
  "whore",
]);

export type HangmanWordModeration =
  | { readonly allowed: true; readonly word: string }
  | { readonly allowed: false; readonly reason: "length" | "characters" | "offensive" };

function normalizeForModeration(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/@/g, "a")
    .replace(/[0]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[$5]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/[^a-z]/g, "");
}

/**
 * A first-pass English profanity screen for client-side Hangman words.
 * Invites still require authoritative server moderation before publication.
 */
export function moderateHangmanWord(raw: string): HangmanWordModeration {
  const word = raw.trim().toUpperCase();
  if (word.length < 2 || word.length > 18) return { allowed: false, reason: "length" };
  if (!/^[\p{L}\p{M}\d'-]+$/u.test(word)) return { allowed: false, reason: "characters" };

  const normalized = normalizeForModeration(word);
  if (normalized.length < 2 || normalized.length > 18) {
    return { allowed: false, reason: "characters" };
  }
  if (ENGLISH_BLOCKED_WORDS.has(normalized)) {
    return { allowed: false, reason: "offensive" };
  }
  return { allowed: true, word: normalized.toUpperCase() };
}
