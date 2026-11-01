import { useMemo, useState } from "react";
import {
  HANGMAN_WORDS,
  getApprovedHangmanWords,
  getHangmanWordRating,
} from "./hangmanEngine";
import { readHangmanProfile } from "./hangmanPersistence";

type SortKey = "name" | "rating" | "games";
type SortDirection = "ascending" | "descending";

const GAMES = [
  {
    name: "Twisted 23",
    category: "Puzzle",
    description: "Slide the numbered tiles back into their unusual home order.",
    href: "./",
    status: "Playable",
  },
  {
    name: "Botchee 4×4",
    category: "Dice strategy",
    description: "Play Points, Fic-Fac-Foe, or Flips against a local bot.",
    href: "#/botchee",
    status: "Playable",
  },
  {
    name: "Hangman’s Gallows",
    category: "Word game",
    description: "Guess the hidden word before the gallows drawing is complete.",
    href: "#/hangman",
    status: "Playable",
  },
  {
    name: "Backgammon",
    category: "Board game",
    description: "Planned for a future game-town release.",
    href: null,
    status: "Planned",
  },
];

export default function GameTown() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rating");
  const [sortDirection, setSortDirection] = useState<SortDirection>("descending");
  const profileLoad = useMemo(readHangmanProfile, []);
  const { profile } = profileLoad;
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const games = GAMES.filter((game) =>
    `${game.name} ${game.category} ${game.description} ${game.status}`
      .toLocaleLowerCase()
      .includes(normalizedQuery));
  const words = getApprovedHangmanWords(HANGMAN_WORDS).filter((entry) =>
    `${entry.word} ${entry.category} ${entry.hint}`.toLocaleLowerCase().includes(normalizedQuery));

  const records = [
    {
      kind: "Player",
      name: "You · this device",
      rating: profile.rating,
      games: profile.games,
      detail: `${profile.wins} wins · ${profile.losses} losses`,
    },
    ...words.map((entry) => {
      const stats = profile.wordStats[entry.id];
      return {
        kind: "Word",
        name: entry.word,
        rating: getHangmanWordRating(entry, stats),
        games: stats?.plays ?? 0,
        detail: `${entry.category} · ${stats?.plays ? `${stats.wins} / ${stats.plays} wins` : "not played"}`,
      };
    }),
  ];

  records.sort((first, second) => {
    const comparison = sortKey === "name"
      ? first.name.localeCompare(second.name)
      : sortKey === "games"
        ? first.games - second.games
        : first.rating - second.rating;
    return sortDirection === "ascending" ? comparison : -comparison;
  });

  function chooseSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection(sortDirection === "ascending" ? "descending" : "ascending");
    } else {
      setSortKey(key);
      setSortDirection(key === "name" ? "ascending" : "descending");
    }
  }

  const sortLabel = (key: SortKey) => sortKey === key
    ? sortDirection === "ascending" ? "ascending" : "descending"
    : "none";

  return (
    <main className="game-town-shell">
      <header className="town-topbar">
        <a className="brand" href="https://www.twisted23.com/" aria-label="Twisted23.com home">
          <span className="brand-mark" aria-hidden="true">23</span>
          <span>TWISTED <strong>23</strong></span>
        </a>
        <a className="town-home-link" href="./">Slider game</a>
      </header>

      <section className="town-hero" aria-labelledby="town-title">
        <p className="town-eyebrow">TWISTED23 GAME WORLD</p>
        <h1 id="town-title">Welcome to Game Town</h1>
        <p>Find a game, look up a word, or check your local practice ratings.</p>
        <label className="town-search">
          <span className="sr-only">Search games and Hangman words</span>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search games, categories, or words"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button>
          )}
        </label>
        <p className="town-access-note">
          Open to visitors · verified-member rooms and shared rankings are not connected yet.
        </p>
      </section>

      <section className="town-section" aria-labelledby="games-title">
        <div className="town-section-heading">
          <div>
            <p className="town-eyebrow">EXPLORE</p>
            <h2 id="games-title">Games &amp; places</h2>
          </div>
          <span>{games.length} found</span>
        </div>
        {games.length ? (
          <div className="town-game-grid">
            {games.map((game) => (
              <article className="town-game-card" key={game.name}>
                <span className={`town-game-status ${game.status === "Planned" ? "is-planned" : ""}`}>
                  {game.status}
                </span>
                <p>{game.category}</p>
                <h3>{game.name}</h3>
                <p className="town-game-description">{game.description}</p>
                {game.href
                  ? <a href={game.href} className="town-game-link">Enter game <span aria-hidden="true">→</span></a>
                  : <span className="town-game-link is-unavailable">Not open yet</span>}
              </article>
            ))}
          </div>
        ) : <p className="town-empty">No games match this search.</p>}
      </section>

      <section className="town-section" aria-labelledby="ratings-title">
        <div className="town-section-heading">
          <div>
            <p className="town-eyebrow">LOCAL PRACTICE</p>
            <h2 id="ratings-title">Ratings &amp; word sheet</h2>
          </div>
          <span>{records.length} rows</span>
        </div>
        <p className="town-table-note">
          Your player rating and word results are stored only in this browser. Unplayed words show their
          challenge rating; played words show your local success rate × 1,000. These are not verified-member
          or global rankings.
        </p>
        {profileLoad.warning && <p className="town-storage-warning" role="status">{profileLoad.warning}</p>}
        <div className="town-table-wrap">
          <table className="town-table">
            <caption className="sr-only">Sortable local player and Hangman word ratings</caption>
            <thead>
              <tr>
                <th scope="col" aria-sort={sortLabel("name")}>
                  <button type="button" onClick={() => chooseSort("name")}>Player / word</button>
                </th>
                <th scope="col" aria-sort={sortLabel("rating")}>
                  <button type="button" onClick={() => chooseSort("rating")}>Rating</button>
                </th>
                <th scope="col" aria-sort={sortLabel("games")}>
                  <button type="button" onClick={() => chooseSort("games")}>Games</button>
                </th>
                <th scope="col">Record / category</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={`${record.kind}-${record.name}`}>
                  <td><span className={`town-kind kind-${record.kind.toLowerCase()}`}>{record.kind}</span>{record.name}</td>
                  <td>{record.rating.toLocaleString()}</td>
                  <td>{record.games}</td>
                  <td>{record.detail}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={4}>No words match this search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="town-member-note">
        <span aria-hidden="true">✦</span>
        <div>
          <strong>Verified-member access is a future connection.</strong>
          <p>There is no sign-in, membership verification, or shared player database in this browser build. A real account service is needed before member profiles, private rooms, or cross-player rating tables can appear.</p>
        </div>
      </aside>
      <footer className="town-footer">A small town for clever games · local data stays on this device</footer>
    </main>
  );
}
