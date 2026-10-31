import type { BotcheeMode, BotcheePlayer, BotcheeStatus, BotLevel, PointMoveBreakdown } from "./botcheeEngine";

export interface GameLogAction {
  readonly player: BotcheePlayer;
  readonly kind: "place" | "flip";
  readonly index?: number;
  readonly dieId?: number;
  readonly fromValue?: number;
  readonly value?: number;
  readonly score?: PointMoveBreakdown;
}

export interface GameLog {
  readonly id: string;
  readonly startedAtMs: number;
  readonly endedAtMs: number;
  readonly mode: BotcheeMode;
  readonly botLevel: BotLevel;
  readonly status: BotcheeStatus | "abandoned";
  readonly endReason: string | null;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly scores: Readonly<Record<BotcheePlayer, number>>;
  readonly actions: readonly GameLogAction[];
}

export interface BackgroundStats {
  readonly totalGames: number;
  readonly completedGames: number;
  readonly abandonedGames: number;
  readonly activeGames: number;
  readonly botches: number;
  readonly byMode: Readonly<Record<BotcheeMode, number>>;
}

export function summarizeGameLogs(logs: readonly GameLog[]): BackgroundStats {
  return logs.reduce<BackgroundStats>((stats, log) => ({
    totalGames: stats.totalGames + 1,
    completedGames: stats.completedGames + (log.status === "abandoned" || log.status === "playing" ? 0 : 1),
    abandonedGames: stats.abandonedGames + (log.status === "abandoned" ? 1 : 0),
    activeGames: stats.activeGames + (log.status === "playing" ? 1 : 0),
    botches: stats.botches + (log.status === "botched" || log.endReason === "no-legal-moves" ? 1 : 0),
    byMode: { ...stats.byMode, [log.mode]: stats.byMode[log.mode] + 1 },
  }), {
    totalGames: 0,
    completedGames: 0,
    abandonedGames: 0,
    activeGames: 0,
    botches: 0,
    byMode: { points: 0, "fic-fac-foe": 0, flips: 0 },
  });
}

export function addGameLog(logs: readonly GameLog[], log: GameLog, limit = 50): readonly GameLog[] {
  return [log, ...logs.filter((existing) => existing.id !== log.id)].slice(0, limit);
}
