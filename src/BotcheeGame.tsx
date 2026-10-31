import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  BOTCHEE_BOARD_SIZE,
  BOTCHEE_VALUES,
  chooseBotMove,
  createBotcheeGame,
  getAdaptiveBotLevel,
  getBotcheeElapsedMs,
  getLegalPointMoves,
  getLegalPatternMoves,
  hasThreeInARow,
  isLegalNumber,
  isLegalPatternMove,
  playFlipsMove,
  playPatternMove,
  playPointMove,
  selectDie,
  flipSelectedDie,
  startBotcheeGame,
  updateElo,
  type BotcheeMode,
  type BotcheeState,
  type BotLevel,
  type EloRecord,
} from "./botcheeEngine";
import "./botchee.css";

interface LocalRecords {
  readonly pointsHighScore: number | null;
  readonly ficFacFoeBestMoves: number | null;
  readonly flipsBestMoves: number | null;
  readonly flipsBestTimeMs: number | null;
  readonly pointsElo: EloRecord;
  readonly ficFacFoeElo: EloRecord;
}

type DiceShape = "rounded" | "square";

interface DiceStyle {
  readonly colors: readonly [string, string, string, string];
  readonly playerColors: Readonly<Record<"human" | "bot", string>>;
  readonly shape: DiceShape;
}

const RECORDS_KEY = "botchee.local-records.v1";
const MODE_KEY = "botchee.mode.v1";
const LEVEL_KEY = "botchee.bot-level.v1";
const AUTO_LEVEL_KEY = "botchee.auto-level.v1";
const SOUND_KEY = "botchee.sound.v1";
const DICE_STYLE_KEY = "botchee.dice-style.v1";
export const BOTCHEE_VERSION = "0.4.2";
const DEFAULT_DICE_STYLE: DiceStyle = {
  colors: ["#70a7d8", "#e69b72", "#81cdb0", "#ecc56f"],
  playerColors: { human: "#91d7b6", bot: "#e5a188" },
  shape: "rounded",
};
const EMPTY_RECORDS: LocalRecords = {
  pointsHighScore: null,
  ficFacFoeBestMoves: null,
  flipsBestMoves: null,
  flipsBestTimeMs: null,
  pointsElo: { rating: 800, games: 0, wins: 0, losses: 0, draws: 0 },
  ficFacFoeElo: { rating: 800, games: 0, wins: 0, losses: 0, draws: 0 },
};

function isDiceColors(value: unknown): value is DiceStyle["colors"] {
  return Array.isArray(value) &&
    value.length === 4 &&
    value.every((color) => typeof color === "string" && /^#[\da-f]{6}$/i.test(color));
}

function isPlayerColors(value: unknown): value is DiceStyle["playerColors"] {
  if (!value || typeof value !== "object") return false;
  const colors = value as Record<string, unknown>;
  return ["human", "bot"].every((player) =>
    typeof colors[player] === "string" && /^#[\da-f]{6}$/i.test(colors[player] as string));
}

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
  readonly autoLevel: boolean;
  readonly soundEnabled: boolean;
  readonly warning: string | null;
} {
  try {
    const savedMode = window.localStorage.getItem(MODE_KEY);
    const savedLevel = window.localStorage.getItem(LEVEL_KEY);
    return {
      mode: isMode(savedMode) ? savedMode : "points",
      botLevel: isBotLevel(savedLevel) ? Number(savedLevel) as BotLevel : 1,
      autoLevel: window.localStorage.getItem(AUTO_LEVEL_KEY) !== "false",
      soundEnabled: window.localStorage.getItem(SOUND_KEY) !== "false",
      warning: null,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown storage error";
    return {
      mode: "points",
      botLevel: 1,
      autoLevel: true,
      soundEnabled: true,
      warning: `Preferences could not be read: ${reason}`,
    };
  }
}

function readDiceStyle(): { readonly style: DiceStyle; readonly warning: string | null } {
  try {
    const saved = window.localStorage.getItem(DICE_STYLE_KEY);
    if (!saved) return { style: DEFAULT_DICE_STYLE, warning: null };
    const value: unknown = JSON.parse(saved);
    if (!value || typeof value !== "object") throw new Error("Saved dice appearance has an invalid format.");
    const candidate = value as Record<string, unknown>;
    if (
      !isDiceColors(candidate.colors) ||
      (candidate.playerColors !== undefined && !isPlayerColors(candidate.playerColors)) ||
      (candidate.shape !== "rounded" && candidate.shape !== "square")
    ) throw new Error("Saved dice appearance has an invalid format.");
    return {
      style: {
        colors: candidate.colors,
        playerColors: isPlayerColors(candidate.playerColors)
          ? candidate.playerColors
          : DEFAULT_DICE_STYLE.playerColors,
        shape: candidate.shape,
      },
      warning: null,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown storage error";
    return { style: DEFAULT_DICE_STYLE, warning: `Dice appearance could not be read: ${reason}` };
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
    const isEloRecord = (record: unknown): record is EloRecord => {
      if (!record || typeof record !== "object") return false;
      const elo = record as Record<string, unknown>;
      return Number.isInteger(elo.rating) && Number(elo.rating) >= 100 &&
        ["games", "wins", "losses", "draws"].every((key) =>
          Number.isInteger(elo[key]) && Number(elo[key]) >= 0);
    };
    const pointsElo = candidate.pointsElo === undefined
      ? EMPTY_RECORDS.pointsElo
      : isEloRecord(candidate.pointsElo) ? candidate.pointsElo : null;
    const ficFacFoeElo = candidate.ficFacFoeElo === undefined
      ? EMPTY_RECORDS.ficFacFoeElo
      : isEloRecord(candidate.ficFacFoeElo) ? candidate.ficFacFoeElo : null;
    if (!pointsElo || !ficFacFoeElo) throw new Error("Saved ratings have an invalid format.");
    return {
      records: {
        pointsHighScore: candidate.pointsHighScore,
        ficFacFoeBestMoves: candidate.ficFacFoeBestMoves,
        flipsBestMoves: candidate.flipsBestMoves,
        flipsBestTimeMs: candidate.flipsBestTimeMs,
        pointsElo,
        ficFacFoeElo,
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
    return "Place a legal number to claim a square. Get three of your marks in a line to win.";
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
  if (state.status === "draw") return "No legal moves remain. The round is a draw.";
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
  const savedDiceStyle = useMemo(readDiceStyle, []);
  const [mode, setMode] = useState<BotcheeMode>(savedSettings.mode);
  const [botLevel, setBotLevel] = useState<BotLevel>(savedSettings.botLevel);
  const [autoLevel, setAutoLevel] = useState(savedSettings.autoLevel);
  const [soundEnabled, setSoundEnabled] = useState(savedSettings.soundEnabled);
  const [game, setGame] = useState(() => createBotcheeGame(mode, botLevel));
  const [selectedValue, setSelectedValue] = useState<number | null>(
    mode === "fic-fac-foe" ? null : 1,
  );
  const [diceStyle, setDiceStyle] = useState(savedDiceStyle.style);
  const [records, setRecords] = useState(savedRecords.records);
  const [storageMessage, setStorageMessage] = useState<string | null>(
    savedSettings.warning ?? savedRecords.warning ?? savedDiceStyle.warning,
  );
  const [soundMessage, setSoundMessage] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("Choose a game mode and start a round.");
  const [flippingDieId, setFlippingDieId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const previousStatus = useRef(game.status);

  const elapsedMs = getBotcheeElapsedMs(game, now);
  const selectedDie = game.tray.find((die) => die.id === game.selectedDieId) ?? null;
  const legalPointMoves = useMemo(() => getLegalPointMoves(game.board), [game.board]);
  const legalPatternMoves = useMemo(
    () => getLegalPatternMoves(game.board, game.owners),
    [game.board, game.owners],
  );
  const humanTurn = game.turn === "human";
  const ratingRecord = mode === "points" ? records.pointsElo : records.ficFacFoeElo;
  const effectiveBotLevel = autoLevel ? getAdaptiveBotLevel(ratingRecord.rating) : botLevel;

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
      window.localStorage.setItem(AUTO_LEVEL_KEY, String(autoLevel));
      window.localStorage.setItem(SOUND_KEY, String(soundEnabled));
      window.localStorage.setItem(DICE_STYLE_KEY, JSON.stringify(diceStyle));
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown storage error";
      setStorageMessage(`Your preferences could not be saved: ${reason}`);
    }
  }, [autoLevel, botLevel, diceStyle, mode, soundEnabled]);

  useEffect(() => {
    const previous = previousStatus.current;
    previousStatus.current = game.status;
    if (
      !soundEnabled ||
      previous !== "playing" ||
      game.mode !== "points" ||
      (game.status !== "won" && game.status !== "lost")
    ) return;

    const audio = new Audio(game.status === "won" ? "./audio/botchee-win.mp3" : "./audio/botchee-loss.mp3");
    void audio.play().catch(() => {
      setSoundMessage("The browser blocked the game sound. Check device volume or tap the sound toggle to retry.");
    });
  }, [game.mode, game.status, soundEnabled]);

  useEffect(() => {
    if (game.status !== "playing" || game.turn !== "bot") return;
    const timeoutId = window.setTimeout(() => {
      const move = chooseBotMove(game);
      if (!move) return;
      const next = move.kind === "points"
        ? playPointMove(game, move.index, move.value, Date.now())
        : playPatternMove(game, move.index, move.value, Date.now());
      commitGame(next);
      setAnnouncement(next.status !== "playing"
        ? resultText(next)
        : move.kind === "points"
          ? `Bot placed ${move.value} for ${next.scores.bot - game.scores.bot} points.`
          : `Bot placed ${move.value} in square ${move.index + 1}.`);
      if (move.kind === "pattern") setSelectedValue(null);
    }, 420);
    return () => window.clearTimeout(timeoutId);
  }, [game]);

  function getBotLevelForMode(nextMode: BotcheeMode): BotLevel {
    if (!autoLevel || nextMode === "flips") return botLevel;
    const levelRating = nextMode === "points" ? records.pointsElo.rating : records.ficFacFoeElo.rating;
    return getAdaptiveBotLevel(levelRating);
  }

  function saveFinishedRecord(next: BotcheeState) {
    if (next.moves === 0 || next.status === "playing" || next.status === "ready") return;
    const result = next.status === "won" ? "win" : next.status === "lost" ? "loss" : "draw";
    const updatedRating = next.mode === "points"
      ? updateElo(records.pointsElo, next.botLevel, result)
      : next.mode === "fic-fac-foe"
        ? updateElo(records.ficFacFoeElo, next.botLevel, result)
        : null;
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
      pointsElo: next.mode === "points" && updatedRating ? updatedRating : records.pointsElo,
      ficFacFoeElo: next.mode === "fic-fac-foe" && updatedRating ? updatedRating : records.ficFacFoeElo,
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
    const next = startBotcheeGame(createBotcheeGame(mode, getBotLevelForMode(mode)), startedAt);
    setFlippingDieId(null);
    setGame(next);
    setNow(startedAt);
    setSelectedValue(mode === "fic-fac-foe" ? null : 1);
    setAnnouncement(`${MODES.find((entry) => entry.id === mode)?.label} started.`);
  }

  function chooseMode(nextMode: BotcheeMode) {
    setFlippingDieId(null);
    setMode(nextMode);
    setGame(createBotcheeGame(nextMode, getBotLevelForMode(nextMode)));
    setSelectedValue(nextMode === "fic-fac-foe" ? null : 1);
    setAnnouncement(`${MODES.find((entry) => entry.id === nextMode)?.label} selected. Start a round when ready.`);
  }

  function chooseLevel(value: string) {
    if (value === "auto") {
      setAutoLevel(true);
      setGame(createBotcheeGame(mode, getAdaptiveBotLevel(ratingRecord.rating)));
      setAnnouncement(`Adaptive level selected. Your ${ratingRecord.rating} rating sets the bot level.`);
    } else {
      const level = Number(value) as BotLevel;
      setAutoLevel(false);
      setBotLevel(level);
      setGame(createBotcheeGame(mode, level));
      setAnnouncement(`Bot level ${level} selected.`);
    }
  }

  function playCell(index: number) {
    if (game.status !== "playing" || !humanTurn) return;
    const next = game.mode === "points" && selectedValue !== null
      ? playPointMove(game, index, selectedValue, Date.now())
      : game.mode === "fic-fac-foe" && selectedValue !== null
        ? playPatternMove(game, index, selectedValue, Date.now())
        : game.mode === "flips"
          ? playFlipsMove(game, index, Date.now())
          : game;
    if (next === game) return;
    commitGame(next);
    if (game.mode === "fic-fac-foe") setSelectedValue(null);
    setAnnouncement(next.status === "playing"
      ? game.mode === "points"
        ? `You placed ${selectedValue}. Your score is ${next.scores.human}.`
        : game.mode === "fic-fac-foe"
          ? `You placed ${selectedValue}. ${BOTCHEE_VALUES.map((value) => `${value}: ${next.board.filter((tile) => tile === value).length}`).join(", ")}.`
          : `Die placed. ${next.moves} moves used.`
      : resultText(next));
  }

  function flipDie() {
    const flippedDieId = game.selectedDieId;
    const next = flipSelectedDie(game);
    commitGame(next);
    if (next !== game) {
      setFlippingDieId(flippedDieId);
      const die = next.tray.find((candidate) => candidate.id === next.selectedDieId);
      setAnnouncement(`Die flipped to ${die?.face ?? "a new value"}. ${next.moves} moves used.`);
    }
  }

  const currentLabel = humanTurn ? "Your turn" : "Bot’s turn";
  const statusText = resultText(game);

  function isCellPlayable(index: number): boolean {
    if (game.status !== "playing" || !humanTurn) return false;
    if (game.mode === "points") {
      return selectedValue !== null && isLegalNumber(game.board, index, selectedValue);
    }
    if (game.mode === "fic-fac-foe") {
      return selectedValue !== null && isLegalPatternMove(game, index, selectedValue);
    }
    return selectedDie !== null && isLegalNumber(game.board, index, selectedDie.face);
  }

  function cellLabel(index: number): string {
    const value = game.board[index];
    if (value === 0) return `Empty square ${index + 1}${isCellPlayable(index) ? ", legal move" : ""}`;
    if (game.mode === "fic-fac-foe") {
      const owner = game.owners[index] === "bot" ? "bot" : "you";
      return `Square ${index + 1}, number ${value}, placed by ${owner}`;
    }
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
              <span>{autoLevel ? `Adaptive · Elo ${ratingRecord.rating}` : "Bot strength"}</span>
              <select
                value={autoLevel ? "auto" : botLevel}
                onChange={(event) => chooseLevel(event.target.value)}
                aria-label="Bot strength"
              >
                <option value="auto">Auto · Level {effectiveBotLevel}</option>
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
              <span>{mode === "points" ? "You" : "You · dice"}</span>
              <strong>{mode === "points"
                ? game.scores.human
                : game.owners.filter((owner) => owner === "human").length}</strong>
            </div>
            <span className="score-separator" aria-hidden="true">vs</span>
            <div className={game.turn === "bot" && game.status === "playing" ? "is-current" : ""}>
              <span>{mode === "points" ? "Bot" : "Bot · dice"}</span>
              <strong>{mode === "points"
                ? game.scores.bot
                : game.owners.filter((owner) => owner === "bot").length}</strong>
            </div>
          </div>
        )}

        <div className="botchee-board-frame">
          <div className="botchee-board" role="group" aria-label={`Botchee ${MODES.find((entry) => entry.id === mode)?.label} board, ${game.status}`}>
            {Array.from({ length: BOTCHEE_BOARD_SIZE }, (_, index) => {
              const value = game.board[index];
              const playable = isCellPlayable(index);
              const label = value === 0 ? "" : String(value);
              return (
                <button
                  key={index}
                  type="button"
                  className={[
                    "botchee-cell",
                    value === 0 ? "is-empty" : "",
                    value > 0 ? `has-value die-value-${value}` : "",
                    playable ? "is-playable" : "",
                    game.owners[index] === "bot" ? "is-bot" : "",
                    game.owners[index] === "human" ? "is-human" : "",
                    `dice-shape-${diceStyle.shape}`,
                  ].filter(Boolean).join(" ")}
                  style={value > 0 ? {
                    "--die-color": diceStyle.colors[value - 1],
                    "--player-color": diceStyle.playerColors[game.owners[index] ?? "human"],
                  } as CSSProperties : undefined}
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

        {mode !== "flips" && (
          <div className="botchee-number-picker" role="group" aria-label="Choose a die value">
            <span>{mode === "points" ? "Choose a number" : "Choose the number for your next turn"}</span>
            <div>
              {BOTCHEE_VALUES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`die-value-${value} dice-shape-${diceStyle.shape} ${selectedValue === value ? "is-selected" : ""}`}
                  aria-pressed={selectedValue === value}
                  style={{ "--die-color": diceStyle.colors[value - 1] } as CSSProperties}
                  aria-label={`Choose ${value}${(mode === "points"
                    ? legalPointMoves.some((move) => move.value === value)
                    : legalPatternMoves.some((move) => move.value === value)) ? "" : ", no legal square"}`}
                  onClick={() => setSelectedValue(value)}
                  disabled={game.status !== "playing" || !humanTurn || !(mode === "points"
                    ? legalPointMoves.some((move) => move.value === value)
                    : legalPatternMoves.some((move) => move.value === value))}
                >
                  {value}
                </button>
              ))}
            </div>
            <small>
              {mode === "points"
                ? game.status === "playing"
                  ? selectedValue !== null && legalPointMoves.some((move) => move.value === selectedValue)
                    ? `${selectedValue} points, plus 5 for a row or column and 7 for a 2×2 box.`
                    : selectedValue === null ? "Choose a number first." : `No legal placement for ${selectedValue}.`
                  : "Fill a row, column, or 2×2 box to score bonus points."
                : `${selectedValue === null && game.status === "playing" && humanTurn ? "Choose a number first. " : ""}Remaining dice: ${BOTCHEE_VALUES.map((value) =>
                  `${value}: ${4 - game.board.filter((tile) => tile === value).length}`).join(" · ")}. No repeats in any row, column, or 2×2 box.`}
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
                  className={`die-chip dice-shape-${diceStyle.shape}${game.selectedDieId === die.id ? " is-selected" : ""}${flippingDieId === die.id ? " is-flipping" : ""}`}
                  style={{ "--die-color": diceStyle.colors[die.face - 1] } as CSSProperties}
                  aria-label={`Die ${die.id + 1}, showing ${die.face}${game.selectedDieId === die.id ? ", selected" : ""}`}
                  aria-pressed={game.selectedDieId === die.id}
                  disabled={game.status !== "playing"}
                  onAnimationEnd={(event) => {
                    if (event.animationName === "die-roll") {
                      setFlippingDieId((current) => current === die.id ? null : current);
                    }
                  }}
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
        {game.status === "playing" && mode === "fic-fac-foe" && hasThreeInARow(game.owners, "human") && (
          <p className="botchee-subhint">Three in a row!</p>
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
                const reset = createBotcheeGame(mode, getBotLevelForMode(mode));
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
              ? "Fic-Fac-Foe: take turns choosing numbers 1–4. Sudoku rules apply, with only four of each number. Claim any three adjacent squares in a line to win."
              : "Flips: complete a valid 4×4 number grid. Each flip cycles the selected die through 1, 2, 3, 4."}
        </p>
        {mode !== "flips" && (
          <section className="botchee-rating" aria-label={`${MODES.find((entry) => entry.id === mode)?.label} local rating`}>
            <div>
              <span>LOCAL ELO</span>
              <strong>{ratingRecord.rating}</strong>
            </div>
            <div>
              <span>W · L · D</span>
              <strong>{ratingRecord.wins} · {ratingRecord.losses} · {ratingRecord.draws}</strong>
            </div>
            <p>{autoLevel
              ? `Adaptive play: Level ${effectiveBotLevel} based on this mode's rating.`
              : "Rating tracks your matches; choose Auto to scale bot strength."}</p>
          </section>
        )}
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
        <details className="botchee-customize">
          <summary>Customize your dice &amp; sound</summary>
          <div className="dice-color-controls" role="group" aria-label="Customize number colors">
            <p className="botchee-customize-label">Number colors · picker and tray</p>
            {BOTCHEE_VALUES.map((value) => (
              <label key={value}>
                <span>Die {value}</span>
                <input
                  type="color"
                  value={diceStyle.colors[value - 1]}
                  aria-label={`Choose the color for die ${value}`}
                  onChange={(event) => {
                    const colors = [...diceStyle.colors] as [string, string, string, string];
                    colors[value - 1] = event.target.value;
                    setDiceStyle({ ...diceStyle, colors });
                  }}
                />
              </label>
            ))}
          </div>
          <div className="dice-color-controls player-color-controls" role="group" aria-label="Customize player colors">
            <p className="botchee-customize-label">Placed dice · player colors</p>
            {(["human", "bot"] as const).map((player) => (
              <label key={player}>
                <span>{player === "human" ? "Your dice" : "Bot dice"}</span>
                <input
                  type="color"
                  value={diceStyle.playerColors[player]}
                  aria-label={`Choose the board color for ${player === "human" ? "your" : "the bot's"} dice`}
                  onChange={(event) => setDiceStyle({
                    ...diceStyle,
                    playerColors: { ...diceStyle.playerColors, [player]: event.target.value },
                  })}
                />
              </label>
            ))}
          </div>
          <label className="botchee-shape-control">
            <span>Die shape</span>
            <select
              value={diceStyle.shape}
              onChange={(event) => setDiceStyle({
                ...diceStyle,
                shape: event.target.value as DiceShape,
              })}
            >
              <option value="rounded">Rounded</option>
              <option value="square">Square</option>
            </select>
          </label>
          <label className="botchee-sound-control">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => {
                setSoundEnabled(event.target.checked);
                setSoundMessage(null);
              }}
            />
            <span>Play original Botchee win / loss sounds in Points</span>
          </label>
          <small>Appearance and sound preferences are saved on this device.</small>
        </details>
        {soundMessage && <p className="botchee-storage" role="status">{soundMessage}</p>}
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
