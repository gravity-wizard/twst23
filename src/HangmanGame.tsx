import { useEffect, useMemo, useState } from "react";
import {
  HANGMAN_MAX_MISTAKES,
  HANGMAN_WORDS,
  createHangmanGame,
  getHangmanElapsedMs,
  getWordsForDifficulty,
  guessHangmanLetter,
  recordHangmanWord,
  updateHangmanProfile,
  type HangmanDifficulty,
  type HangmanState,
  type HangmanTheme,
  type HangmanWord,
} from "./hangmanEngine";
import {
  readHangmanPreferences,
  readHangmanProfile,
  saveHangmanPreferences,
  saveHangmanProfile,
  type HangmanPreferences,
} from "./hangmanPersistence";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function chooseWord(difficulty: HangmanDifficulty, previousId?: string): HangmanWord {
  const choices = getWordsForDifficulty(difficulty);
  if (choices.length === 0) return HANGMAN_WORDS[0];
  const freshChoices = choices.filter((entry) => entry.id !== previousId);
  const pool = freshChoices.length > 0 ? freshChoices : choices;
  return pool[Math.floor(Math.random() * pool.length)];
}

function formatElapsed(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function Gallows({ mistakes }: { readonly mistakes: number }) {
  return (
    <svg className="hangman-drawing" viewBox="0 0 240 220" role="img" aria-label={`Gallows drawing, ${mistakes} of ${HANGMAN_MAX_MISTAKES} incorrect guesses`}>
      <g className="gallows-frame" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="7">
        <path d="M25 199h145M60 199V24h91M60 55l31-31M151 24v25" />
      </g>
      <g className="gallows-person" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="5">
        {mistakes >= 1 && <circle cx="151" cy="68" r="20" />}
        {mistakes >= 2 && <path d="M151 88v53" />}
        {mistakes >= 3 && <path d="m151 101-26 24" />}
        {mistakes >= 4 && <path d="m151 101 26 24" />}
        {mistakes >= 5 && <path d="m151 141-24 34" />}
        {mistakes >= 6 && <path d="m151 141 24 34" />}
      </g>
    </svg>
  );
}

function getStatusMessage(game: HangmanState): string {
  if (game.status === "won") return `You solved the word in ${formatElapsed(game.elapsedMs)}.`;
  if (game.status === "lost") return `The word was ${game.entry.word}. Start a new round to try again.`;
  return `Guess a letter. ${HANGMAN_MAX_MISTAKES - game.mistakes} ${HANGMAN_MAX_MISTAKES - game.mistakes === 1 ? "mistake" : "mistakes"} remaining.`;
}

export default function HangmanGame() {
  const [preferences, setPreferences] = useState<HangmanPreferences>(() => readHangmanPreferences().preferences);
  const [profile, setProfile] = useState(() => readHangmanProfile().profile);
  const [game, setGame] = useState<HangmanState>(() =>
    createHangmanGame(chooseWord(preferences.difficulty), Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const [storageMessage, setStorageMessage] = useState<string | null>(() =>
    [readHangmanPreferences().warning, readHangmanProfile().warning]
      .filter((message): message is string => message !== null)
      .join(" "));
  const [announcement, setAnnouncement] = useState("Hangman started. Choose a letter.");

  const guessed = useMemo(() => new Set(game.guessedLetters), [game.guessedLetters]);
  const elapsedMs = getHangmanElapsedMs(game, now);
  const wordStats = profile.wordStats[game.entry.id];
  const won = game.status === "won";

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    const warning = saveHangmanPreferences(preferences);
    if (warning) setStorageMessage(warning);
  }, [preferences]);

  useEffect(() => {
    const warning = saveHangmanProfile(profile);
    if (warning) setStorageMessage(warning);
  }, [profile]);

  function startNewGame() {
    const entry = chooseWord(preferences.difficulty, game.entry.id);
    const startedAt = Date.now();
    setGame(createHangmanGame(entry, startedAt));
    setNow(startedAt);
    setAnnouncement(`New ${preferences.difficulty} word selected. Guess a letter.`);
  }

  function chooseLetter(letter: string) {
    if (game.status !== "playing" || guessed.has(letter)) return;
    const next = guessHangmanLetter(game, letter, Date.now());
    if (next === game) return;
    setGame(next);
    if (next.status === "playing") {
      setAnnouncement(next.entry.word.includes(letter)
        ? `${letter} is in the word. ${HANGMAN_MAX_MISTAKES - next.mistakes} mistakes remaining.`
        : `${letter} is not in the word. ${HANGMAN_MAX_MISTAKES - next.mistakes} mistakes remaining.`);
      return;
    }

    const result = next.status === "won";
    const updated = recordHangmanWord(
      updateHangmanProfile(profile, next.entry.rating, result),
      next.entry.id,
      result,
    );
    setProfile(updated);
    const warning = saveHangmanProfile(updated);
    if (warning) setStorageMessage(warning);
    setAnnouncement(result
      ? `You won. The word was ${next.entry.word}. Your local rating is now ${updated.rating}.`
      : `Game over. The word was ${next.entry.word}. Your local rating is now ${updated.rating}.`);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!/^[a-z]$/i.test(event.key)) return;
      if (event.target instanceof HTMLElement &&
          ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      event.preventDefault();
      chooseLetter(event.key.toUpperCase());
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game, guessed, profile]);

  function updatePreference<K extends keyof HangmanPreferences>(
    key: K,
    value: HangmanPreferences[K],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className={`hangman-shell theme-${preferences.theme}`}>
      <header className="town-topbar">
        <a className="brand" href="./" aria-label="Twisted 23 home">
          <span className="brand-mark" aria-hidden="true">23</span>
          <span>TWISTED <strong>23</strong></span>
        </a>
        <a className="town-home-link" href="#/town">Game Town</a>
      </header>

      <section className="hangman-card" aria-labelledby="hangman-title">
        <div className="hangman-heading">
          <p className="hangman-eyebrow">GAME TOWN · WORD GAME</p>
          <h1 id="hangman-title">Hangman’s Gallows</h1>
          <p>Find the word before the drawing is complete.</p>
        </div>

        <div className="hangman-stats" aria-label="Local Hangman stats">
          <div><span>RATING</span><strong>{profile.rating}</strong></div>
          <div><span>WINS</span><strong>{profile.wins} / {profile.games}</strong></div>
          <div><span>TIME</span><strong>{formatElapsed(elapsedMs)}</strong></div>
        </div>

        <div className="hangman-play-area">
          <div className="hangman-illustration">
            <Gallows mistakes={game.mistakes} />
            <span className="hangman-mistakes">{game.mistakes} / {HANGMAN_MAX_MISTAKES} misses</span>
          </div>
          <div className="hangman-word-panel">
            <span className="hangman-category">{game.entry.category}</span>
            <div className="hangman-word" role="group" aria-label="Word to guess">
              {[...game.entry.word].map((letter, index) => {
                const revealed = guessed.has(letter) || game.status === "lost";
                return (
                  <span className={`hangman-letter ${revealed ? "is-revealed" : ""}`} key={`${letter}-${index}`}>
                    {revealed ? letter : ""}
                  </span>
                );
              })}
            </div>
            {preferences.showHint && game.status === "playing" && (
              <p className="hangman-hint"><span>HINT</span>{game.entry.hint}</p>
            )}
            {game.status !== "playing" && (
              <p className={`hangman-result ${won ? "is-win" : "is-loss"}`} role="status">
                {getStatusMessage(game)}
              </p>
            )}
          </div>
        </div>

        <div className="hangman-keyboard" role="group" aria-label="Choose a letter">
          {[...ALPHABET].map((letter) => {
            const used = guessed.has(letter);
            const correct = used && game.entry.word.includes(letter);
            return (
              <button
                type="button"
                key={letter}
                className={`hangman-key ${used ? correct ? "is-correct" : "is-wrong" : ""}`}
                disabled={used || game.status !== "playing"}
                onClick={() => chooseLetter(letter)}
                aria-label={`${letter}${used ? correct ? ", correct" : ", incorrect" : ""}`}
              >
                {letter}
              </button>
            );
          })}
        </div>
        <p className="hangman-keyboard-hint">Tap a letter or use your keyboard.</p>

        <div className="hangman-actions">
          <button type="button" className="hangman-primary" onClick={startNewGame}>
            {game.status === "playing" ? "New word" : "Play again"}
          </button>
          <a className="hangman-secondary" href="#/town">Back to Game Town</a>
        </div>

        <details className="hangman-controls">
          <summary>Customize your game</summary>
          <div className="hangman-control-grid">
            <label>
              <span>Word challenge</span>
              <select
                value={preferences.difficulty}
                onChange={(event) => updatePreference("difficulty", event.target.value as HangmanDifficulty)}
              >
                <option value="easy">Easy</option>
                <option value="standard">Standard</option>
                <option value="challenging">Challenging</option>
              </select>
            </label>
            <label>
              <span>Color theme</span>
              <select
                value={preferences.theme}
                onChange={(event) => updatePreference("theme", event.target.value as HangmanTheme)}
              >
                <option value="evergreen">Evergreen</option>
                <option value="sunset">Sunset</option>
                <option value="violet">Violet</option>
              </select>
            </label>
            <label className="hangman-hint-toggle">
              <input
                type="checkbox"
                checked={preferences.showHint}
                onChange={(event) => updatePreference("showHint", event.target.checked)}
              />
              <span>Show word hint</span>
            </label>
          </div>
          <p>Changes apply to this browser. Challenge difficulty applies to the next word.</p>
        </details>

        <section className="hangman-word-record" aria-label={`${game.entry.word} local record`}>
          <div><span>WORD RATING</span><strong>{wordStats?.plays ? `${Math.round((wordStats.wins / wordStats.plays) * 100)}%` : game.entry.rating}</strong></div>
          <p>{wordStats?.plays
            ? `${wordStats.wins} wins from ${wordStats.plays} tries with this word.`
            : "This word’s challenge rating appears until you play it."}</p>
          <span className="hangman-local-badge">LOCAL ONLY</span>
        </section>

        <aside className="hangman-invite-note">
          <span aria-hidden="true">✉</span>
          <div>
            <strong>Challenge a friend with your own word</strong>
            <p>Member invitations are planned for the shared game server. Private challenge links need server-held words, verified accounts, and authoritative word moderation; this version does not publish an answer in a share URL.</p>
          </div>
        </aside>

        {storageMessage && <p className="hangman-storage-message" role="status">{storageMessage}</p>}
        <p className="hangman-local-note">Practice rating and word results are stored on this device only. Online rooms and verified-member rankings need a shared account and game server.</p>
        <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
      </section>
    </main>
  );
}
