import type { GameMode } from "./engine";

export interface LeaderboardScore {
  readonly mode: GameMode;
  readonly playerName: string;
  readonly moves: number;
  readonly elapsedMs: number;
}

export interface LeaderboardClient {
  submitScore(score: LeaderboardScore): Promise<void>;
  getScores(mode: GameMode): Promise<readonly LeaderboardScore[]>;
}

// Inject a real service here when the repository has a leaderboard backend.
export const leaderboardClient: LeaderboardClient | null = null;
