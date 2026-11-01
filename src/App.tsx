import { useEffect, useMemo, useState } from "react";
import BotcheeGame from "./BotcheeGame";
import BotcheeHelp from "./BotcheeHelp";
import GameTown from "./GameTown";
import HangmanGame from "./HangmanGame";
import {
  BOARD_CELLS,
  createGame,
  getElapsedMs,
  isLegalMove,
  moveTile,
  shuffleGame,
  updatePersonalBest,
  type GameMode,
  type PersonalBests,
  type PuzzleState,
} from "./engine";
import {
  readSavedData,
  savePersonalBests,
  savePreferences,
  type Preferences,
} from "./persistence";

const MODE_LABELS: Record<GameMode, string> = {
  twisted: "Twisted 23",
  classic: "4 × 6",
};

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((milliseconds % 1000) / 100);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
}

function TwistedGame() {
  const saved = useMemo(() => readSavedData(), []);
  const [preferences, setPreferences] = useState<Preferences>(saved.preferences);
  const [game, setGame] = useState<PuzzleState>(() => createGame(saved.preferences.mode));
  const [personalBests, setPersonalBests] = useState<PersonalBests>(saved.personalBests);
  const [storageMessage, setStorageMessage] = useState<string | null>(saved.warning);
  const [now, setNow] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState("Choose Shuffle to begin a new puzzle.");

  const cells = BOARD_CELLS[game.mode];
  const blankIndex = game.tiles.indexOf(0);
  const elapsedMs = getElapsedMs(game, now);
  const best = personalBests[game.mode];
  const modeName = MODE_LABELS[game.mode];

  useEffect(() => {
    const warning = savePreferences(preferences);
    if (warning) setStorageMessage(warning);
  }, [preferences]);

  useEffect(() => {
    if (game.status !== "playing") return;
    const timerId = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timerId);
  }, [game.status]);

  function chooseMode(mode: GameMode) {
    if (mode === game.mode) return;
    setPreferences({ mode });
    setGame(createGame(mode));
    setAnnouncement(`${MODE_LABELS[mode]} selected. Shuffle to start.`);
  }

  function startShuffle() {
    const next = shuffleGame(game.mode, Date.now());
    setGame(next);
    setNow(Date.now());
    setAnnouncement(`${modeName} shuffled. Timer started. Find the original order.`);
  }

  function resetGame() {
    setGame(createGame(game.mode));
    setNow(Date.now());
    setAnnouncement("Puzzle reset. Shuffle to start a new game.");
  }

  function playMove(cellId: string) {
    if (!isLegalMove(game, cellId)) return;
    const movedTile = game.tiles[cells.findIndex((cell) => cell.id === cellId)];
    const next = moveTile(game, cellId, Date.now());
    setGame(next);
    setNow(Date.now());

    if (next.status === "won") {
      const updated = updatePersonalBest(personalBests, next.mode, {
        moves: next.moves,
        elapsedMs: next.elapsedMs,
      });
      setPersonalBests(updated);
      const warning = savePersonalBests(updated);
      if (warning) setStorageMessage(warning);
      setAnnouncement(
        `Puzzle solved in ${next.moves} moves and ${formatTime(next.elapsedMs)}.`,
      );
    } else {
      setAnnouncement(`Tile ${movedTile} moved. ${next.moves} ${next.moves === 1 ? "move" : "moves"}.`);
    }
  }

  function handleBoardKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const directions: Record<string, readonly [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const delta = directions[event.key];
    if (!delta || blankIndex < 0 || game.status !== "playing") return;

    const blankCell = cells[blankIndex];
    const target = cells.find(
      (cell) =>
        cell.row === blankCell.row + delta[0] &&
        cell.column === blankCell.column + delta[1] &&
        blankCell.neighbors.includes(cell.id),
    );
    if (!target) return;

    event.preventDefault();
    playMove(target.id);
  }

  const twisted = game.mode === "twisted";

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="./" aria-label="Twisted 23 home">
          <span className="brand-mark" aria-hidden="true">23</span>
          <span>TWISTED <strong>23</strong></span>
        </a>
        <span className="topbar-note">A clever little shuffle</span>
        <nav className="game-nav" aria-label="Game destinations">
          <a href="#/town">Game Town</a>
          <a className="game-link" href="#/botchee">Botchee 4×4</a>
        </nav>
      </header>

      <section className="game-card" aria-labelledby="game-title">
        <div className="intro">
          <p className="eyebrow">THE SLIDER, TURNED SIDEWAYS</p>
          <h1 id="game-title">{game.status === "won" ? "Beautifully done." : "Find your flow."}</h1>
          <p className="intro-copy">
            {game.status === "won"
              ? "Every tile is back where it belongs. Fancy another round?"
              : "Slide the tiles into their home order. The clock starts when you shuffle."}
          </p>
        </div>

        <div className="mode-switch" role="group" aria-label="Puzzle mode">
          {(["twisted", "classic"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`mode-option ${game.mode === mode ? "is-selected" : ""}`}
              aria-pressed={game.mode === mode}
              onClick={() => chooseMode(mode)}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        <div className="stats" aria-label={`${modeName} game statistics`}>
          <div className="stat">
            <span className="stat-label">TIME</span>
            <span className="stat-value" aria-label={`Time ${formatTime(elapsedMs)}`}>
              {formatTime(elapsedMs)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">MOVES</span>
            <span className="stat-value">{game.moves}</span>
          </div>
          <div className="stat best-stat">
            <span className="stat-label">BEST</span>
            <span className="stat-value">
              {best.bestMoves === null ? "—" : best.bestMoves}
              <small> moves</small>
            </span>
          </div>
        </div>

        <div className="board-wrap">
          <div
            className={`board-stage ${twisted ? "twisted-stage" : "classic-stage"}`}
            onKeyDown={handleBoardKeyDown}
          >
            <div
              className={`board-grid ${twisted ? "twisted-grid" : "classic-grid"}`}
              role="grid"
              aria-label={`${modeName} puzzle board, ${game.moves} moves, ${game.status === "playing" ? "in progress" : game.status}`}
              aria-rowcount={6}
              aria-colcount={twisted ? 6 : 4}
            >
              {cells.map((cell, index) => {
                const tile = game.tiles[index];
                const isBlank = tile === 0;
                const canMove = !isBlank && isLegalMove(game, cell.id);
                const row = String.fromCharCode(97 + cell.row);
                const column = String.fromCharCode(97 + cell.column);

                return (
                  <div
                    className={`board-cell ${isBlank ? "blank-cell" : ""}`}
                    key={cell.id}
                    role="gridcell"
                    aria-label={
                      isBlank
                        ? `Empty space, row ${row}, column ${column}`
                        : `Tile ${tile}, row ${row}, column ${column}${canMove ? ", can move" : ""}`
                    }
                    aria-rowindex={cell.row + 1}
                    aria-colindex={cell.column + 1}
                    style={{
                      gridRow: cell.row + 1,
                      gridColumn: cell.column + 1,
                    }}
                  >
                    {isBlank ? (
                      <span className="blank-mark" aria-hidden="true" />
                    ) : (
                      <button
                        type="button"
                        className={`tile ${canMove ? "tile-available" : ""}`}
                        aria-label={`Move tile ${tile} into the empty space`}
                        aria-disabled={!canMove}
                        onClick={() => playMove(cell.id)}
                      >
                        <span className="tile-label">{tile}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <p className="board-hint">
          {game.status === "playing"
            ? "Tap a glowing tile, or use the arrow keys."
            : "Ready when you are. Shuffle to start."}
        </p>

        <div className="actions">
          <button className="primary-action" type="button" onClick={startShuffle}>
            <span aria-hidden="true">⤨</span> Shuffle
          </button>
          <button className="secondary-action" type="button" onClick={resetGame}>
            Reset
          </button>
        </div>

        <div className="personal-record" aria-label="Personal best records">
          <span className="record-icon" aria-hidden="true">✦</span>
          <span>
            Personal best
            <strong>
              {best.bestMoves === null ? "Not set" : `${best.bestMoves} moves`}
              <span className="record-divider"> · </span>
              {best.bestTimeMs === null ? "—" : formatTime(best.bestTimeMs)}
            </strong>
          </span>
          <span className="local-badge">ON THIS DEVICE</span>
        </div>

        <p className="leaderboard-note">
          Online leaderboards are not connected yet. Scores stay on this device.
        </p>
        {storageMessage && (
          <p className="storage-message" role="status">{storageMessage}</p>
        )}
        <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
      </section>

      <footer className="page-footer">
        <span>One empty space. Twenty-three ways to get there.</span>
      </footer>
    </main>
  );
}

function App() {
  const [route, setRoute] = useState(() => window.location.hash);

  useEffect(() => {
    const updateRoute = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", updateRoute);
    return () => window.removeEventListener("hashchange", updateRoute);
  }, []);

  if (route === "#/botchee/help" || route === "#faq" || route === "#rules" || route === "#tutorial") {
    return <BotcheeHelp />;
  }
  if (route === "#/town") return <GameTown />;
  if (route === "#/hangman") return <HangmanGame />;
  return route === "#/botchee" ? <BotcheeGame /> : <TwistedGame />;
}

export default App;
