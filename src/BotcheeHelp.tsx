import { useEffect } from "react";
import "./botchee.css";

const HELP_SECTIONS = [
  { id: "faq", label: "FAQ" },
  { id: "rules", label: "Rules" },
  { id: "tutorial", label: "Quick tutorial" },
] as const;

function BotcheeHelp() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Botchee 4×4 — FAQ, rules & tutorial";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="botchee-shell">
      <header className="botchee-topbar">
        <a className="botchee-brand" href="#/botchee" aria-label="Back to Botchee">
          <span className="botchee-brand-mark" aria-hidden="true">B4</span>
          <span>BOTCHEE <strong>4×4</strong></span>
        </a>
        <a className="botchee-back-link" href="#/botchee">Back to game</a>
      </header>
      <article className="botchee-card botchee-help" aria-labelledby="help-title">
        <p className="botchee-eyebrow">BOTCHEE 4×4 GUIDE</p>
        <h1 id="help-title">FAQ, rules &amp; tutorial</h1>
        <nav className="botchee-help-nav" aria-label="Guide sections">
          {HELP_SECTIONS.map(({ id, label }) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>

        <section id="faq">
          <h2>FAQ</h2>
          <h3>Why can the bot win without completing a region?</h3>
          <p>In Play for Points, the winner is decided by total points. Completing a region adds a bonus, but is not required to win. A player can deliberately botch the board by leaving no legal placement; the round ends and the higher score wins.</p>
          <h3>How is a score calculated?</h3>
          <p>Each placed die is worth its face value. Completing a row earns 5 bonus points, a column earns 5, and a 2×2 box earns 7. One placement may complete all three regions for 17 bonus points, in addition to the die value.</p>
          <h3>Are play logs or statistics uploaded?</h3>
          <p>No. Recent game actions and aggregate counts are saved only in this browser for debugging and can be exported or deleted in the game’s local history panel.</p>
          <h3>Can I play a person online?</h3>
          <p>Not yet. The current build is local play against a bot. Shared rooms, multiplayer and a game foyer are future work and require a server.</p>
        </section>

        <section id="rules">
          <h2>Rules</h2>
          <h3>Play for Points</h3>
          <p>Take turns placing a die in an empty square. Numbers cannot repeat in a row, column, or 2×2 box. Score the face value plus any newly completed region bonuses. If the board fills or no legal move remains, the higher score wins.</p>
          <h3>Fic-Fac-Foe</h3>
          <p>Players take turns choosing one of the four copies of each number. Sudoku restrictions apply; claim three consecutive squares in a row, column, or diagonal to win. If no one makes a line and no legal move remains, the game is a draw.</p>
          <h3>Flips</h3>
          <p>Choose a die from the tray, optionally flip it to cycle its face from 1 to 4, then place it legally. Fill the grid to solve it. Each flip and placement counts as one move.</p>
          <h3>The stash colors</h3>
          <p>The one-row stash has 16 dice, four per face. Selecting a die previews your player color; after placement it remains tinted with that player’s customizable color. Tiles use 57% color opacity, and each board square still contains only one die.</p>
        </section>

        <section id="tutorial">
          <h2>Quick tutorial</h2>
          <ol>
            <li>Pick a mode and start a round.</li>
            <li>In Play for Points or Fic-Fac-Foe, choose one of the unplayed dice in the stash row. In Flips, select a tray die.</li>
            <li>Tap a highlighted empty square to place the die. Flips also lets you rotate its face before placement.</li>
            <li>Use the score, remaining dice and turn indicator to plan the next move. Open “Customize your dice &amp; sound” to set player colors.</li>
            <li>Open “Local game history &amp; statistics” to review recent move logs or export them for debugging.</li>
          </ol>
        </section>
        <p className="botchee-local-note">Guide for Botchee preview v0.5.0.</p>
      </article>
    </main>
  );
}

export default BotcheeHelp;
