import { useEffect, useMemo, useState } from "react";
import {
  BOTCHEE_BOARD_SIZE,
  BOTCHEE_VALUES,
  chooseBotMove,
  createBotcheeGame,
  getBotcheeElapsedMs,
  getLegalPointMoves,
  hasFourInARow,
  isLegalNumber,
  playFlipsMove,
  playPatternMove,
  playPointMove,
  selectDie,
  flipSelectedDie,
  startBotcheeGame,
  type BotcheeMode,
  type BotcheeState,
  type BotLevel,
} from "./botcheeEngine";
import "./botchee.css";

interface LocalRecords {
  readonly pointsHighScore: number | null;
  readonly ficFacFoeBestMoves: number | null;
  readonly flipsBestMoves: number | null;
  readonly flipsBestTimeMs: number | null;
}

const RECORDS_KEY = "botchee.local-records.v1";
const MODE_KEY = "botchee.mode.v1";
const LEVEL_KEY = "botchee.bot-level.v1";
export const BOTCHEE_VERSION = "0.3.0";
const EMPTY_RECORDS: LocalRecords = {
  pointsHighScore: null,
  ficFacFoeBestMoves: null,
  flipsBestMoves: null,
  flipsBestTimeMs: null,
};

const MODES: readonly { readonly id: BotcheeMode; readonly label: string }[] = [
  { id: "points", label: "Points" },
  { id: "fic-fac-foe", label: "Fic-Fac-Foe" },
  { id: "flips", label: "Flips" },
];

function isMode(value: string | null): value is BotcheeMode {
  return value === "points" || value === "fic-fac-foe" || value === "flips";
}

function isBotLevel(value: string | null): value is "0" | "1" | "2" {
  return value === "0" || value === "1" || value === "2";
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function readSettings(): {
  readonly mode: BotcheeMode;
  readonly botLevel: BotLevel;
  readonly warning: string | null;
} {
  try {
    const savedMode = window.localStorage.getItem(MODE_KEY);
    const savedLevel = window.localStorage.getItem(LEVEL_KEY);
    return {
      mode: isMode(savedMode) ? savedMode : "points",
      botLevel: isBotLevel(savedLevel) ? Number(savedLevel) as BotLevel : 1,
      warning: null,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown storage error";
    return { mode: "points", botLevel: 1, warning: `Preferences could not be read: ${reason}` };
  }
}

function readRecords(): { records: LocalRecords; warning: string | null } {
  try {
    const saved = window.localStorage.getItem(RECORDS_KEY);
    if (!saved) return { records: EMPTY_RECORDS, warning: null };
    const value: unknown = JSON.parse(saved);
    if (!value || typeof value !== "object") throw new Error("Saved records have an invalid format.");
    const candidate = value as Record<string, unknown>;
    if (
      !isNullableNumber(candidate.pointsHighScore) ||
      !isNullableNumber(candidate.ficFacFoeBestMoves) ||
      !isNullableNumber(candidate.flipsBestMoves) ||
      !isNullableNumber(candidate.flipsBestTimeMs)
    ) throw new Error("Saved records have an invalid format.");
    return {
      records: {
        pointsHighScore: candidate.pointsHighScore,
        ficFacFoeBestMoves: candidate.ficFacFoeBestMoves,
        flipsBestMoves: candidate.flipsBestMoves,
        flipsBestTimeMs: candidate.flipsBestTimeMs,
      },
      warning: null,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown storage error";
    return { records: EMPTY_RECORDS, warning: `Local records could not be read: ${reason}` };
  }
}

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function titleForStatus(state: BotcheeState): string {
  if (state.status === "ready") return "Pick a way to play.";
  if (state.status === "playing") return state.mode === "flips" ? "Solve the grid." : "Your move.";
  if (state.status === "solved") return "Puzzle solved.";
  if (state.status === "botched") return "Botched.";
  if (state.status === "draw") return "A clever draw.";
  return state.status === "won" ? "Nicely played." : "The bot takes it.";
}

function resultText(state: BotcheeState): string {
  if (state.status === "ready") return "Choose a mode and start a round.";
  if (state.status === "playing" && state.mode === "points") {
    return `Place a legal number. Completing a row, column, or 2×2 box earns a bonus.`;
  }
  if (state.status === "playing" && state.mode === "fic-fac-foe") {
    return "Be the first to make four in a row—across, down, or diagonally.";
  }
  if (state.status === "playing") {
    return "Select a die, flip it if needed, then place it in a legal square.";
  }
  if (state.status === "botched") {
    return "No legal placements remain. Your puzzle is botched.";
  }
  if (state.status === "solved") {
    return `Solved in ${state.moves} moves and ${formatTime(state.elapsedMs)}.`;
  }
  if (state.status === "draw") return "The board filled without a four-in-a-row.";
  if (state.mode === "points") {
    const winner = state.status === "won" ? "You" : "The bot";
    const reason = state.endReason === "no-legal-moves" ? " after the puzzle botched" : "";
    return `${winner} win${winner === "You" ? "" : "s"}${reason}, ${state.scores.human}–${state.scores.bot}.`;
  }
  return state.status === "won" ? `You won in ${state.moves} moves.` : `The bot won in ${state.moves} moves.`;
}

function BotcheeGame() {
  const savedSettings = useMemo(readSettings, []);
  const savedRecords = useMemo(readRecords, []);
  const [mode, setMode] = useState<BotcheeMode>(savedSettings.mode);
  const [botLevel, setBotLevel] = useState<BotLevel>(savedSettings.botLevel);
  const [game, setGame] = useState(() => createBotcheeGame(mode, botLevel));
  const [selectedValue, setSelectedValue] = useState<number | null>(1);
  const [records, setRecords] = useState(savedRecords.records);
  const [storageMessage, setStorageMessage] = useState<string | null>(
    savedSettings.warning ?? savedRecords.warning,
  );
  const [announcement, setAnnouncement] = useState("Choose a game mode and start a round.");
  const [now, setNow] = useState(() => Date.now());

  const elapsedMs = getBotcheeElapsedMs(game, now);
  const selectedDie = game.tray.find((die) => die.id === game.selectedDieId) ?? null;
  const legalPointMoves = useMemo(() => getLegalPointMoves(game.board), [game.board]);
  const humanTurn = game.turn === "human";

  useEffect(() => {
    if (game.status !== "playing") return;
    const timerId = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timerId);
  }, [game.status]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Botchee 4×4 — Dice-grid challenge";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(MODE_KEY, mode);
      window.localStorage.setItem(LEVEL_KEY, String(botLevel));
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown storage error";
      setStorageMessage(`Your preferences could not be saved: ${reason}`);
    }
  }, [botLevel, mode]);

  useEffect(() => {
    if (game.status !== "playing" || game.turn !== "bot") return;
    const timeoutId = window.setTimeout(() => {
      const move = chooseBotMove(game);
      if (!move) return;
      const next = move.kind === "points"
        ? playPointMove(game, move.index, move.value, Date.now())
        : playPatternMove(game, move.index, Date.now());
      commitGame(next);
      setAnnouncement(next.status !== "playing"
        ? resultText(next)
        : move.kind === "points"
          ? `Bot placed ${move.value} for ${next.scores.bot - game.scores.bot} points.`
          : `Bot placed a mark in square ${move.index + 1}.`);
    }, 420);
    return () => window.clearTimeout(timeoutId);
  }, [game]);

  function saveFinishedRecord(next: BotcheeState) {
    if (next.moves === 0 || next.status === "playing" || next.status === "ready") return;
    const updated: LocalRecords = {
      pointsHighScore: next.mode === "points"
        ? Math.max(records.pointsHighScore ?? 0, next.scores.human)
        : records.pointsHighScore,
      ficFacFoeBestMoves: next.mode === "fic-fac-foe" && next.status === "won"
        ? Math.min(records.ficFacFoeBestMoves ?? next.moves, next.moves)
        : records.ficFacFoeBestMoves,
      flipsBestMoves: next.mode === "flips" && next.status === "solved"
        ? Math.min(records.flipsBestMoves ?? next.moves, next.moves)
        : records.flipsBestMoves,
      flipsBestTimeMs: next.mode === "flips" && next.status === "solved"
        ? Math.min(records.flipsBestTimeMs ?? next.elapsedMs, next.elapsedMs)
        : records.flipsBestTimeMs,
    };
    setRecords(updated);
    try {
      window.localStorage.setItem(RECORDS_KEY, JSON.stringify(updated));
      setStorageMessage(null);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown storage error";
      setStorageMessage(`Local records could not be saved: ${reason}`);
    }
  }

  function commitGame(next: BotcheeState) {
    if (next === game) return;
    setGame(next);
    if (next.status !== "playing" && next.status !== "ready") saveFinishedRecord(next);
  }

  function startRound() {
    const startedAt = Date.now();
    const next = startBotcheeGame(createBotcheeGame(mode, botLevel), startedAt);
    setGame(next);
    setNow(startedAt);
    setSelectedValue(1);
    setAnnouncement(`${MODES.find((entry) => entry.id === mode)?.label} started.`);
  }

  function chooseMode(nextMode: BotcheeMode) {
    setMode(nextMode);
    setGame(createBotcheeGame(nextMode, botLevel));
    setSelectedValue(1);
    setAnnouncement(`${MODES.find((entry) => entry.id === nextMode)?.label} selected. Start a round when ready.`);
  }

  function chooseLevel(value: string) {
    const level = Number(value) as BotLevel;
    setBotLevel(level);
    setGame(createBotcheeGame(mode, level));
    setAnnouncement(`Bot level ${level} selected.`);
  }

  function playCell(index: number) {
    if (game.status !== "playing" || !humanTurn) return;
    const next = game.mode === "points" && selectedValue !== null
      ? playPointMove(game, index, selectedValue, Date.now())
      : game.mode === "fic-fac-foe"
        ? playPatternMove(game, index, Date.now())
        : game.mode === "flips"
          ? playFlipsMove(game, index, Date.now())
          : game;
    if (next === game) return;
    commitGame(next);
    setAnnouncement(next.status === "playing"
      ? game.mode === "points"
        ? `You placed ${selectedValue}. Your score is ${next.scores.human}.`
        : game.mode === "fic-fac-foe"
          ? "Your mark placed."
          : `Die placed. ${next.moves} moves used.`
      : resultText(next));
  }

  function flipDie() {
    const next = flipSelectedDie(game);
    commitGame(next);
    if (next !== game) {
      const die = next.tray.find((candidate) => candidate.id === next.selectedDieId);
      setAnnouncement(`Die flipped to ${die?.face ?? "a new value"}. ${next.moves} moves used.`);
    }
  }

  const currentLabel = game.mode === "fic-fac-foe"
    ? humanTurn ? "Your turn · X" : "Bot’s turn · O"
    : humanTurn ? "Your turn" : "Bot’s turn";
  const statusText = resultText(game);

  function isCellPlayable(index: number): boolean {
    if (game.status !== "playing" || !humanTurn) return false;
    if (game.mode === "points") {
      return selectedValue !== null && isLegalNumber(game.board, index, selectedValue);
    }
    if (game.mode === "fic-fac-foe") return game.board[index] === 0;
    return selectedDie !== null && isLegalNumber(game.board, index, selectedDie.face);
  }

  function cellLabel(index: number): string {
    const value = game.board[index];
    if (value === 0) return `Empty square ${index + 1}${isCellPlayable(index) ? ", legal move" : ""}`;
    if (game.mode === "fic-fac-foe") return value === 1 ? `Square ${index + 1}, your mark` : `Square ${index + 1}, bot mark`;
    const owner = game.owners[index] === "bot" ? "bot" : "you";
    return `Square ${index + 1}, ${value}, placed by ${owner}`;
  }

  return (
    <main className="botchee-shell">
      <header className="botchee-topbar">
        <a className="botchee-brand" href="./" aria-label="Twisted 23 home">
          <span className="botchee-brand-mark" aria-hidden="true">B4</span>
          <span>BOTCHEE <strong>4×4</strong></span>
        </a>
        <a className="botchee-back-link" href="./">Twisted 23</a>
      </header>

      <section className="botchee-card" aria-labelledby="botchee-title">
        <div className="botchee-intro">
          <p className="botchee-eyebrow">THE DICE-GRID CHALLENGE</p>
          <h1 id="botchee-title">{titleForStatus(game)}</h1>
          <p>{statusText}</p>
        </div>

        <div className="botchee-mode-switch" role="group" aria-label="Botchee game mode">
          {MODES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={mode === entry.id ? "is-selected" : ""}
              aria-pressed={mode === entry.id}
              onClick={() => chooseMode(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <div className="botchee-toolbar">
          {mode !== "flips" && (
            <label className="botchee-level">
              <span>Bot strength</span>
              <select
                value={botLevel}
                onChange={(event) => chooseLevel(event.target.value)}
                aria-label="Bot strength"
              >
                <option value="0">0 · Beginner</option>
                <option value="1">1 · Best move</option>
                <option value="2">2 · Strategist</option>
              </select>
            </label>
          )}
          <div className="botchee-clock">
            <span>TIME</span>
            <strong>{formatTime(elapsedMs)}</strong>
          </div>
          <div className="botchee-clock">
            <span>MOVES</span>
            <strong>{game.moves}</strong>
          </div>
        </div>

        {(mode === "points" || mode === "fic-fac-foe") && (
          <div className="botchee-scoreboard" aria-label="Round score">
            <div className={game.turn === "human" && game.status === "playing" ? "is-current" : ""}>
                <span>You</span>
                <strong>{mode === "points" ? game.scores.human : "X"}</strong>
            </div>
            <span className="score-separator" aria-hidden="true">vs</span>
            <div className={game.turn === "bot" && game.status === "playing" ? "is-current" : ""}>
                <span>Bot</span>
                <strong>{mode === "points" ? game.scores.bot : "O"}</strong>
            </div>
          </div>
        )}

        <div className="botchee-board-frame">
          <div className="botchee-board" role="group" aria-label={`Botchee ${MODES.find((entry) => entry.id === mode)?.label} board, ${game.status}`}>
            {Array.from({ length: BOTCHEE_BOARD_SIZE }, (_, index) => {
              const value = game.board[index];
              const playable = isCellPlayable(index);
              const label = mode === "fic-fac-foe"
                ? value === 0 ? "" : value === 1 ? "X" : "O"
                : value === 0 ? "" : String(value);
              return (
                <button
                  key={index}
                  type="button"
                  className={[
                    "botchee-cell",
                    value === 0 ? "is-empty" : "",
                    playable ? "is-playable" : "",
                    game.owners[index] === "bot" ? "is-bot" : "",
                    game.owners[index] === "human" ? "is-human" : "",
                  ].filter(Boolean).join(" ")}
                  aria-label={cellLabel(index)}
                  aria-disabled={!playable}
                  onClick={() => playCell(index)}
                >
                  {label || <span aria-hidden="true" className="cell-dot" />}
                </button>
              );
            })}
          </div>
        </div>

        {mode === "points" && (
          <div className="botchee-number-picker" role="group" aria-label="Choose a die value">
            <span>Choose a number</span>
            <div>
              {BOTCHEE_VALUES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={selectedValue === value ? "is-selected" : ""}
                  aria-pressed={selectedValue === value}
                  aria-label={`Choose ${value}${legalPointMoves.some((move) => move.value === value) ? "" : ", no legal square"}`}
                  onClick={() => setSelectedValue(value)}
                  disabled={game.status !== "playing" || !humanTurn}
                >
                  {value}
                </button>
              ))}
            </div>
            <small>
              {game.status === "playing"
                ? selectedValue === null
                  ? "Choose a die value first."
                  : legalPointMoves.some((move) => move.value === selectedValue)
                    ? `${selectedValue} points, plus 5 for a row or column and 7 for a 2×2 box.`
                    : `No legal placement for ${selectedValue}.`
                : "Fill a row, column, or 2×2 box to score bonus points."}
            </small>
          </div>
        )}

        {mode === "flips" && (
          <div className="botchee-dice-tray" aria-label="Dice tray">
            <div className="tray-heading">
              <span>{game.status === "ready" ? "16 dice ready" : `${game.tray.length} dice left`}</span>
              <button
                type="button"
                className="flip-action"
                onClick={flipDie}
                disabled={!selectedDie || game.status !== "playing"}
              >
                Flip selected die <span aria-hidden="true">↻</span>
              </button>
            </div>
            <div className="die-list" role="group" aria-label="Select a die">
              {game.tray.map((die) => (
                <button
                  key={die.id}
                  type="button"
                  className={game.selectedDieId === die.id ? "die-chip is-selected" : "die-chip"}
                  aria-label={`Die ${die.id + 1}, showing ${die.face}${game.selectedDieId === die.id ? ", selected" : ""}`}
                  aria-pressed={game.selectedDieId === die.id}
                  disabled={game.status !== "playing"}
                  onClick={() => {
                    setGame(selectDie(game, die.id));
                    setAnnouncement(`Die ${die.id + 1} selected, showing ${die.face}.`);
                  }}
                >
                  <span>{die.face}</span>
                </button>
              ))}
            </div>
            <small>Each placement and each flip counts as one move.</small>
          </div>
        )}

        <div className="botchee-turnline" role="status">{game.status === "playing" ? currentLabel : statusText}</div>
        {game.status === "playing" && mode === "points" && legalPointMoves.length === 0 && (
          <p className="botchee-subhint">No legal number can be placed. The round will end as a botch.</p>
        )}
        {game.status === "playing" && mode === "fic-fac-foe" && hasFourInARow(game.board, 1) && (
          <p className="botchee-subhint">Four in a row!</p>
        )}

        <div className="botchee-actions">
          <button type="button" className="botchee-primary" onClick={startRound}>
            {game.status === "ready" ? "Start game" : "New game"}
          </button>
          {game.status === "playing" && (
            <button
              type="button"
              className="botchee-secondary"
              onClick={() => {
                const reset = createBotcheeGame(mode, botLevel);
                setGame(reset);
                setAnnouncement("Round paused. Start a new game when ready.");
              }}
            >
              Quit round
            </button>
          )}
        </div>

        <p className="botchee-rule-note">
          {mode === "points"
            ? "Swift rules: no repeats in any row, column, or 2×2 corner box. Score the die value plus region bonuses."
            : mode === "fic-fac-foe"
              ? "Pattern play: make four of your marks in a horizontal, vertical, or diagonal line."
              : "Flips: complete a valid 4×4 number grid. Each flip cycles the selected die through 1, 2, 3, 4."}
        </p>
        {mode === "fic-fac-foe" && records.ficFacFoeBestMoves !== null && (
          <p className="botchee-record">Best win: {records.ficFacFoeBestMoves} moves</p>
        )}
        {mode === "points" && records.pointsHighScore !== null && (
          <p className="botchee-record">Personal high score: {records.pointsHighScore}</p>
        )}
        {mode === "flips" && (
          <p className="botchee-record">
            Best: {records.flipsBestMoves === null ? "— moves" : `${records.flipsBestMoves} moves`}
            {" · "}
            {records.flipsBestTimeMs === null ? "—" : formatTime(records.flipsBestTimeMs)}
          </p>
        )}
        <p className="botchee-local-note">Local play only · results stay on this device</p>
        {storageMessage && <p className="botchee-storage" role="status">{storageMessage}</p>}
        <p className="botchee-sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
      </section>

      <footer className="botchee-footer">
        <span className="botchee-version" aria-label={`Botchee version ${BOTCHEE_VERSION}`}>v{BOTCHEE_VERSION}</span>
        <span>Preview build · Part of the TopHatSudoku game-world idea · online rooms need a shared game server.</span>
      </footer>
    </main>
  );
}

export default BotcheeGame;
