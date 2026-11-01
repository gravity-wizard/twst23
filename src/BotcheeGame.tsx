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
  getPointMoveBreakdown,
  hasThreeInARow,
  isLegalNumber,
  isLegalPatternMove,
  playFlipsMove,
  playPatternMove,
  playPointMove,
  selectStashDie,
  selectDie,
  flipSelectedDie,
  startBotcheeGame,
  updateElo,
  type BotcheeMode,
  type BotcheeState,
  type BotLevel,
  type EloRecord,
} from "./botcheeEngine";
import { mixAdditiveColors } from "./botcheeColors";
import {
  addGameLog,
  summarizeGameLogs,
  type GameLog,
  type GameLogAction,
} from "./botcheeHistory";
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
const GAME_LOG_KEY = "botchee.game-logs.v1";
const GAME_LOG_LIMIT = 50;
export const BOTCHEE_VERSION = "0.5.1";
const DEFAULT_DICE_STYLE: DiceStyle = {
  colors: ["#70a7d8", "#e69b72", "#81cdb0", "#ecc56f"],
  playerColors: { human: "#43c47b", bot: "#f1c75b" },
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

function readGameLogs(): { logs: readonly GameLog[]; warning: string | null } {
  try {
    const saved = window.localStorage.getItem(GAME_LOG_KEY);
    if (!saved) return { logs: [], warning: null };
    const value: unknown = JSON.parse(saved);
    if (!Array.isArray(value)) throw new Error("Saved game history has an invalid format.");
    const logs = value.filter((entry): entry is GameLog => {
      if (!entry || typeof entry !== "object") return false;
      const log = entry as Record<string, unknown>;
      const score = log.scores as Record<string, unknown> | null;
      return typeof log.id === "string" &&
        typeof log.startedAtMs === "number" &&
        typeof log.endedAtMs === "number" &&
        Number.isInteger(log.botLevel) && [0, 1, 2].includes(Number(log.botLevel)) &&
        (log.mode === "points" || log.mode === "fic-fac-foe" || log.mode === "flips") &&
        ["ready", "playing", "won", "lost", "draw", "solved", "botched", "abandoned"].includes(String(log.status)) &&
        Number.isInteger(log.moves) && Number(log.moves) >= 0 &&
        typeof log.elapsedMs === "number" && Number.isFinite(log.elapsedMs) &&
        !!score && typeof score.human === "number" && typeof score.bot === "number" &&
        Array.isArray(log.actions) &&
        log.actions.every((action) => {
          if (!action || typeof action !== "object") return false;
          const entry = action as Record<string, unknown>;
          const breakdown = entry.score;
          return (entry.player === "human" || entry.player === "bot") &&
            (entry.kind === "place" || entry.kind === "flip") &&
            (entry.index === undefined || Number.isInteger(entry.index)) &&
            (entry.dieId === undefined || Number.isInteger(entry.dieId)) &&
            (entry.fromValue === undefined || Number.isInteger(entry.fromValue)) &&
            (entry.value === undefined || Number.isInteger(entry.value)) &&
            (breakdown === undefined || (
              !!breakdown &&
              typeof breakdown === "object" &&
              ["dieValue", "rowBonus", "columnBonus", "boxBonus", "total"].every((key) =>
                typeof (breakdown as Record<string, unknown>)[key] === "number" &&
                Number.isFinite((breakdown as Record<string, number>)[key]))
            ));
        });
    }).map((entry) => entry.status === "playing" ? { ...entry, status: "abandoned" as const } : entry)
      .slice(0, GAME_LOG_LIMIT);
    return { logs, warning: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown storage error";
    return { logs: [], warning: `Local game history could not be read: ${reason}` };
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
  if (state.status === "draw") {
    if (state.mode === "points") {
      const ending = state.endReason === "no-legal-moves" ? " No legal moves remained." : " The board filled.";
      return `Points tied, ${state.scores.human}–${state.scores.bot}.${ending}`;
    }
    return "No legal moves remain. The round is a draw.";
  }
  if (state.mode === "points") {
    const winner = state.status === "won" ? "You" : "The bot";
    const outcome = state.endReason === "no-legal-moves"
      ? " Puzzle ended with no legal moves (botch)."
      : " Board filled.";
    return `${winner} win${winner === "You" ? "" : "s"} on points, ${state.scores.human}–${state.scores.bot}.${outcome}`;
  }
  return state.status === "won" ? `You won in ${state.moves} moves.` : `The bot won in ${state.moves} moves.`;
}

function BotcheeGame() {
  const savedSettings = useMemo(readSettings, []);
  const savedRecords = useMemo(readRecords, []);
  const savedDiceStyle = useMemo(readDiceStyle, []);
  const savedGameLogs = useMemo(readGameLogs, []);
  const [mode, setMode] = useState<BotcheeMode>(savedSettings.mode);
  const [botLevel, setBotLevel] = useState<BotLevel>(savedSettings.botLevel);
  const [autoLevel, setAutoLevel] = useState(savedSettings.autoLevel);
  const [soundEnabled, setSoundEnabled] = useState(savedSettings.soundEnabled);
  const [game, setGame] = useState(() => createBotcheeGame(mode, botLevel));
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [diceStyle, setDiceStyle] = useState(savedDiceStyle.style);
  const [records, setRecords] = useState(savedRecords.records);
  const [gameLogs, setGameLogs] = useState<readonly GameLog[]>(savedGameLogs.logs);
  const [storageMessage, setStorageMessage] = useState<string | null>(
    savedSettings.warning ?? savedRecords.warning ?? savedDiceStyle.warning ?? savedGameLogs.warning,
  );
  const [soundMessage, setSoundMessage] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("Choose a game mode and start a round.");
  const [flippingDieId, setFlippingDieId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const previousStatus = useRef(game.status);
  const roundStartedAt = useRef<number | null>(null);
  const roundId = useRef<string | null>(null);
  const gameActions = useRef<GameLogAction[]>([]);

  const elapsedMs = getBotcheeElapsedMs(game, now);
  const selectedDie = game.tray.find((die) => die.id === game.selectedDieId) ?? null;
  const legalPointMoves = useMemo(() => getLegalPointMoves(game.board), [game.board]);
  const legalPatternMoves = useMemo(
    () => getLegalPatternMoves(game.board, game.owners),
    [game.board, game.owners],
  );
  const humanTurn = game.turn === "human";
  const additiveStashColor = mixAdditiveColors(
    diceStyle.playerColors.human,
    diceStyle.playerColors.bot,
  );
  const ratingRecord = mode === "points" ? records.pointsElo : records.ficFacFoeElo;
  const effectiveBotLevel = autoLevel ? getAdaptiveBotLevel(ratingRecord.rating) : botLevel;
  const backgroundStats = useMemo(() => summarizeGameLogs(gameLogs), [gameLogs]);

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
      const score = move.kind === "points"
        ? getPointMoveBreakdown(game.board, move)
        : undefined;
      commitGame(next, {
        player: "bot",
        kind: "place",
        index: move.index,
        dieId: game.stash.find((die) => die.owner === null && die.face === move.value)?.id,
        value: move.value,
        ...(score ? { score } : {}),
      });
      setAnnouncement(next.status !== "playing"
        ? resultText(next)
        : move.kind === "points"
          ? `Bot placed ${move.value} for ${next.scores.bot - game.scores.bot} points.`
          : `Bot placed ${move.value} in square ${move.index + 1}.`);
      setSelectedValue(null);
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

  function persistGameLog(next: BotcheeState, status: GameLog["status"] = next.status, keepOpen = false) {
    const endedAtMs = Date.now();
    const startedAtMs = roundStartedAt.current ?? next.startedAtMs ?? endedAtMs - next.elapsedMs;
    const log: GameLog = {
      id: roundId.current ?? `${startedAtMs}-${endedAtMs}`,
      startedAtMs,
      endedAtMs,
      mode: next.mode,
      botLevel: next.botLevel,
      status,
      endReason: next.endReason,
      moves: next.moves,
      elapsedMs: next.status === "playing" ? getBotcheeElapsedMs(next, endedAtMs) : next.elapsedMs,
      scores: next.scores,
      actions: [...gameActions.current],
    };
    const updatedLogs = addGameLog(gameLogs, log, GAME_LOG_LIMIT);
    setGameLogs(updatedLogs);
    if (!keepOpen) {
      gameActions.current = [];
      roundStartedAt.current = null;
      roundId.current = null;
    }
    try {
      window.localStorage.setItem(GAME_LOG_KEY, JSON.stringify(updatedLogs));
      setStorageMessage(null);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown storage error";
      setStorageMessage(`Local game history could not be saved: ${reason}`);
    }
  }

  function commitGame(next: BotcheeState, action?: GameLogAction) {
    if (next === game) return;
    if (action) gameActions.current = [...gameActions.current, action];
    setGame(next);
    if (next.status !== "playing" && next.status !== "ready") {
      saveFinishedRecord(next);
      persistGameLog(next);
    } else if (action) {
      persistGameLog(next, "playing", true);
    }
  }

  function startRound() {
    const startedAt = Date.now();
    if (game.status === "playing" && roundStartedAt.current !== null) persistGameLog(game, "abandoned");
    else gameActions.current = [];
    const next = startBotcheeGame(createBotcheeGame(mode, getBotLevelForMode(mode)), startedAt);
    roundStartedAt.current = startedAt;
    roundId.current = `${startedAt}-${Math.random().toString(36).slice(2, 8)}`;
    setFlippingDieId(null);
    setGame(next);
    setNow(startedAt);
    setSelectedValue(null);
    setAnnouncement(`${MODES.find((entry) => entry.id === mode)?.label} started.`);
  }

  function chooseMode(nextMode: BotcheeMode) {
    if (game.status === "playing" && roundStartedAt.current !== null) persistGameLog(game, "abandoned");
    else gameActions.current = [];
    setFlippingDieId(null);
    setMode(nextMode);
    setGame(createBotcheeGame(nextMode, getBotLevelForMode(nextMode)));
    setSelectedValue(null);
    setAnnouncement(`${MODES.find((entry) => entry.id === nextMode)?.label} selected. Start a round when ready.`);
  }

  function chooseLevel(value: string) {
    if (value === "auto") {
      setAutoLevel(true);
      if (game.status === "playing" && roundStartedAt.current !== null) persistGameLog(game, "abandoned");
      setGame(createBotcheeGame(mode, getAdaptiveBotLevel(ratingRecord.rating)));
      setSelectedValue(null);
      setAnnouncement(`Adaptive level selected. Your ${ratingRecord.rating} rating sets the bot level.`);
    } else {
      const level = Number(value) as BotLevel;
      setAutoLevel(false);
      setBotLevel(level);
      if (game.status === "playing" && roundStartedAt.current !== null) persistGameLog(game, "abandoned");
      setGame(createBotcheeGame(mode, level));
      setSelectedValue(null);
      setAnnouncement(`Bot level ${level} selected.`);
    }
  }

  function chooseStashDie(dieId: number) {
    if (!humanTurn || game.status !== "playing") return;
    const die = game.stash.find((candidate) => candidate.id === dieId);
    if (!die || die.owner !== null) return;
    const next = selectStashDie(game, dieId);
    if (next === game) return;
    setGame(next);
    setSelectedValue(die.face);
    setAnnouncement(`Die ${die.face} selected. It will take your color when placed.`);
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
    const action: GameLogAction = game.mode === "flips"
      ? {
          player: "human",
          kind: "place",
          index,
          value: selectedDie?.face,
          dieId: selectedDie?.id,
        }
      : {
          player: "human",
          kind: "place",
          index,
          ...(game.selectedDieId === null ? {} : { dieId: game.selectedDieId }),
          value: selectedValue ?? undefined,
          ...(game.mode === "points" && selectedValue !== null
            ? { score: getPointMoveBreakdown(game.board, { kind: "points", index, value: selectedValue }) }
            : {}),
        };
    commitGame(next, action);
    setSelectedValue(null);
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
    const flippedDie = next.tray.find((die) => die.id === selectedDie?.id);
    commitGame(next, selectedDie ? {
      player: "human",
      kind: "flip",
      dieId: selectedDie.id,
      fromValue: selectedDie.face,
      value: flippedDie?.face,
    } : undefined);
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
      return selectedValue !== null && game.selectedDieId !== null &&
        isLegalNumber(game.board, index, selectedValue);
    }
    if (game.mode === "fic-fac-foe") {
      return selectedValue !== null && game.selectedDieId !== null &&
        isLegalPatternMove(game, index, selectedValue);
    }
    return selectedDie !== null && isLegalNumber(game.board, index, selectedDie.face);
  }

  function exportGameLogs() {
    const blob = new Blob([JSON.stringify({ version: BOTCHEE_VERSION, exportedAt: new Date().toISOString(), games: gameLogs }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "botchee-game-logs.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearGameLogs() {
    if (!window.confirm("Delete all locally saved Botchee game logs?")) return;
    setGameLogs([]);
    gameActions.current = [];
    if (roundStartedAt.current !== null) {
      roundId.current = `${roundStartedAt.current}-after-clear-${Date.now()}`;
    }
    try {
      window.localStorage.removeItem(GAME_LOG_KEY);
      setStorageMessage(null);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown storage error";
      setStorageMessage(`Local game history could not be cleared: ${reason}`);
    }
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
        <nav className="botchee-nav" aria-label="Game destinations">
          <a className="botchee-back-link" href="#/town">Game Town</a>
          <a className="botchee-back-link" href="./">Twisted 23</a>
        </nav>
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
          <div className="botchee-dice-tray botchee-stash">
            <div className="tray-heading">
              <span>Four stacks · {game.stash.filter((die) => die.owner === null).length} dice left</span>
              <span>{selectedValue === null ? "Choose a die" : `Selected ${selectedValue}`}</span>
            </div>
            <div className="botchee-stash-list" role="group" aria-label="Four stacks of four dice">
              {BOTCHEE_VALUES.map((face) => {
                const stack = game.stash.filter((die) => die.face === face);
                const availableCount = stack.filter((die) => die.owner === null).length;
                return (
                  <div className="stash-stack" role="group" aria-label={`Face ${face} stack, ${availableCount} dice available`} key={face}>
                    {stack.map((die, stackIndex) => {
                      const playable = mode === "points"
                        ? legalPointMoves.some((move) => move.value === die.face)
                        : legalPatternMoves.some((move) => move.value === die.face);
                      const available = die.owner === null;
                      const selected = game.selectedDieId === die.id;
                      const color = die.owner
                        ? diceStyle.playerColors[die.owner]
                        : selected && humanTurn
                          ? diceStyle.playerColors.human
                          : additiveStashColor;
                      return (
                        <button
                          key={die.id}
                          type="button"
                          className={[
                            "stash-die",
                            `dice-shape-${diceStyle.shape}`,
                            available ? "" : "is-played",
                            selected ? "is-selected" : "",
                            `die-value-${die.face}`,
                          ].filter(Boolean).join(" ")}
                          style={{
                            "--die-color": diceStyle.colors[die.face - 1],
                            "--player-color": color,
                            "--stash-color": additiveStashColor,
                          } as CSSProperties}
                          aria-label={`Die ${die.face}, stack position ${stackIndex + 1} of 4${available ? "" : `, played by ${die.owner}`}${selected ? ", selected" : ""}`}
                          aria-pressed={selected}
                          disabled={game.status !== "playing" || !humanTurn || !available || !playable}
                          onClick={() => chooseStashDie(die.id)}
                        >
                          {die.face}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <small>
              {mode === "points"
                ? "Choose a die from one of the four face stacks, then a legal square. Each die is worth its face value; complete a row or column for +5, or a box for +7. A single move can earn all three bonuses."
                : "Choose a die from one of the four face stacks, then a legal square. No repeated number in any row, column, or 2×2 box; three claimed squares in a line win."}
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
                if (roundStartedAt.current !== null) persistGameLog(game, "abandoned");
                const reset = createBotcheeGame(mode, getBotLevelForMode(mode));
                setGame(reset);
                setSelectedValue(null);
                setAnnouncement("Round paused. Start a new game when ready.");
              }}
            >
              Quit round
            </button>
          )}
        </div>

        <p className="botchee-rule-note">
          {mode === "points"
            ? "Play for Points: die values plus region bonuses; botching can end the round."
            : mode === "fic-fac-foe"
              ? "Fic-Fac-Foe: Sudoku-legal placements; claim three consecutive squares in a line."
              : "Flips: change a die’s face and solve the valid 4×4 grid."}
          {" "}
          <a href="#faq">FAQ · rules · tutorial</a>
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
        <details className="botchee-history">
          <summary>Local game history &amp; statistics</summary>
          <p>
            Recent {backgroundStats.totalGames} games logged (50 kept) · {backgroundStats.completedGames} completed ·{" "}
            {backgroundStats.activeGames} in progress · {backgroundStats.abandonedGames} abandoned · {backgroundStats.botches} botches
          </p>
          <p className="botchee-history-modes">
            Points {backgroundStats.byMode.points} · Fic-Fac-Foe {backgroundStats.byMode["fic-fac-foe"]} · Flips {backgroundStats.byMode.flips}
          </p>
          {gameLogs.length === 0 ? (
            <small>No games logged yet. Finished, botched, and abandoned rounds are recorded here.</small>
          ) : (
            <ol className="botchee-history-list">
              {gameLogs.slice(0, 5).map((log) => (
                <li key={log.id}>
                  <strong>{MODES.find((entry) => entry.id === log.mode)?.label}</strong>
                  {" · "}
                  {log.status === "abandoned" ? "Abandoned" : log.status === "playing" ? "In progress" : log.status}
                  {log.mode === "points" ? ` · ${log.scores.human}–${log.scores.bot}` : ""}
                  {" · "}
                  {log.moves} moves
                  <details>
                    <summary>{log.actions.length} logged actions</summary>
                    <ol>
                      {log.actions.map((action, index) => (
                        <li key={`${log.id}-${index}`}>
                          {action.player} {action.kind}
                          {action.fromValue === undefined
                            ? action.value === undefined ? "" : ` ${action.value}`
                            : ` ${action.fromValue} → ${action.value ?? "?"}`}
                          {action.dieId === undefined ? "" : ` · die ${action.dieId + 1}`}
                          {action.index === undefined ? "" : ` at square ${action.index + 1}`}
                          {action.score && action.score.total > action.score.dieValue
                            ? ` · ${action.score.dieValue} + ${action.score.rowBonus} row + ${action.score.columnBonus} column + ${action.score.boxBonus} box = ${action.score.total}`
                            : ""}
                        </li>
                      ))}
                    </ol>
                  </details>
                </li>
              ))}
            </ol>
          )}
          <div className="botchee-history-actions">
            <button type="button" className="botchee-secondary" onClick={exportGameLogs} disabled={gameLogs.length === 0}>
              Export logs
            </button>
            <button type="button" className="botchee-secondary" onClick={clearGameLogs} disabled={gameLogs.length === 0}>
              Delete logs
            </button>
          </div>
          <small>Saved only in this browser; no gameplay or background statistics are sent to a server.</small>
        </details>
        <p className="botchee-local-note">Local play only · results stay on this device</p>
        <details className="botchee-customize">
          <summary>Customize your dice &amp; sound</summary>
          <div className="dice-color-controls" role="group" aria-label="Customize number colors">
            <p className="botchee-customize-label">Number colors · board</p>
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
