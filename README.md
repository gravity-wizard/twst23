# Twisted 23

A mobile-first React + TypeScript browser version of the legacy slider puzzle. The original iOS project remains under `legacy-ios/two3` and is not modified by the web game.

## Run locally

```sh
npm install
npm run dev
npm test
npm run build
```

## Deploy to GitHub Pages

The GitHub Actions workflow in `.github/workflows/pages.yml` builds and publishes the app to `https://gravity-wizard.github.io/twst23/` when changes are pushed to `main` or the current game branch. The repository's Pages site must use **GitHub Actions** as its build and deployment source. The build already includes the `/twst23/` project-site base path; local development continues to use `/`.

## Twisted23.com WordPress page

The game is embedded on the published [`/play/` page](https://www.twisted23.com/play/) using a WordPress Custom HTML block:

```html
<iframe
  src="https://gravity-wizard.github.io/twst23/"
  title="Play Twisted 23"
  loading="lazy"
  style="display:block;width:100%;min-height:980px;border:0;border-radius:20px"
></iframe>
```

WordPress administrator access is required to add or publish the block. The hosted game keeps preferences and personal-best scores in each player's browser; those records do not sync between players.

## Game model

The Twisted 23 engine uses the original 24 playable positions in a sparse 6×6 coordinate space. Its explicit neighbor graph follows the retained Swift cells and the original custom solved sequence; the presentation tilts that graph so its logical horizontal/vertical moves look diagonal. The optional 4×6 mode uses a conventional rectangular neighbor graph.

The pure rules and state transitions are in `src/engine.ts`. Browser preferences and per-mode personal bests are saved locally under versioned `localStorage` keys by `src/persistence.ts`.

## Botchee 4×4

Botchee is available as a separate hash route at `https://gravity-wizard.github.io/twst23/#/botchee`; the existing Twisted 23 route remains the default. The current preview is labeled **v0.5.1** in the on-screen footer so screenshots identify the build. Version 1.0 is reserved for a later release after broad gameplay validation and stability checks; this remains a playable preview, not a flawless release. A dedicated WordPress page can embed it with:

```html
<iframe
  src="https://gravity-wizard.github.io/twst23/#/botchee"
  title="Play Botchee 4×4"
  loading="lazy"
  style="display:block;width:100%;min-height:1100px;border:0;border-radius:20px"
></iframe>
```

The pure rules and bot strategies are in `src/botcheeEngine.ts`. Play for Points adds each die’s face value, plus 5 for a completed row, 5 for a column, and 7 for a box; one placement can earn 17 bonus points. Filling the board or leaving no legal moves ends the round, and the higher total score wins, so intentionally botching a puzzle can be a strategy. The Swift source names `zBest1move` and `zBotcher`, but does not contain numeric levels 0/1/2. This browser version defines those levels as beginner/random legal moves, best immediate score (the `zBest1move` behavior), and strategic lookahead; Auto selects a level from separate local Elo ratings for Points and Fic-Fac-Foe. Fic-Fac-Foe alternates players choosing numbers, enforces the same Sudoku regions and a maximum of four copies of each value, and wins when a player owns three consecutive cells in a row, column, or diagonal. Elo starts at 800 and only describes results against this browser's bots; it is not a global ranking. The stash has four face positions with four dice stacked at each; untouched dice use a translucent additive mix of both player colors, selected dice preview the active player’s color, and placed dice retain that owner tint. Stash and board colors are blended at 57% opacity. The customization panel saves a separate color for each die value, individual board colors for the human and bot, rounded or square dice, and an optional sound setting locally.

The original Botchee source archive provides `snd_bonus10.mp3` and `snd_error.mp3`, but no dedicated match-win or match-loss sound. The Points-mode end sounds reuse those source clips respectively for a win and a loss; the mapping is a browser-game interpretation, not an original match-result behavior. Fic-Fac-Foe and Flips are interpreted from the published Botchee Deluxe mode descriptions, not from the Swift app's game engine. In Flips, changing a selected die cycles its value 1→2→3→4→1 and counts as one move; that transition is a browser-game interpretation, not a confirmed physical-die rule. A flip now gets a brief 3D roll animation inspired by the older Objective-C cube-orientation project; that archive models one cube per cell and contains no silo-stack rules or animation frames. The browser game keeps one die per board square. Recent move-by-move logs and background counts (mode, completed/abandoned rounds, and botches) are saved locally, can be exported or deleted, and are never uploaded.

The in-app FAQ, rules, and tutorial are available from the Botchee game. Online person-to-person rooms and a shared game foyer are future work; the current build has only local bot play and no server.

## Game Town and Hangman

The Game Town directory is available at `#/town`; Hangman's Gallows is at `#/hangman`. Visitors can search the bundled game and word catalogue, sort the local player/word sheet by name, rating, or games, and play Hangman with keyboard or touch input. The six-mistake word game includes easy, standard, and challenging word bands, hints, three color themes, a timer, and a locally persisted practice rating and per-word record. The Hangman rating is a local practice estimate against bundled word challenge ratings; it is not a verified-member or global ranking. `src/hangmanModeration.ts` provides a conservative English profanity screen, normalizes accents and common leetspeak, and is applied when selecting word pools and constructing a game. The built-in dictionary is curated; user-submitted words and invites still need authoritative server-side moderation. This client-side list is not comprehensive and should not be treated as a full hate-speech, multilingual, or adversarial-content moderation system.

Members will eventually be able to set a word and invite a specific person to guess it. This release intentionally does not create invite links: a private challenge needs server-held answers, expiring invite tokens, identity/verification, and server-validated results. The app has no authentication or game backend, so the member notice is an integration point rather than a simulated sign-in, member search, invitation, or global leaderboard. Local preferences and records stay in browser storage.

## Multiplayer and game-world direction

There is no room server, account system, global leaderboard, or TopHatSudoku source configured in this repository. Botchee is therefore local single-player against a bot (or solo in Flips), and Hangman is local solo play; global rooms or rankings must not be presented until a real backend exists. A multiplayer phase should use a server-authoritative room service with versioned game state, validated move events, player/room identity, turn ownership, reconnect/resume, and server-verified results. WordPress can remain the per-game entry/embedding layer, while TopHatSudoku supplies shared identity/profile and game-world navigation once its repository and integration contract are available. Social login should use a standard OIDC provider and minimal profile data; any monetization should be optional (for example cosmetics or a noncompetitive membership), not alter move rules or scores. Backgammon can be added later as a separate game route/page against the same room contract.

## Leaderboard integration

No leaderboard endpoint or server-side score storage exists in this repository. The game therefore does not display fabricated global rankings; personal records are explicitly local to this device. `src/leaderboard.ts` defines the typed `LeaderboardClient` contract where a real authenticated backend can be injected. A production integration needs a backend for score submission and retrieval, plus server-side validation/ranking before the UI advertises global standings.
