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

## Embed on Twisted23.com (WordPress)

After the GitHub Pages deployment finishes, add a **Custom HTML** block to the WordPress page where the game should appear and paste:

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

## Leaderboard integration

No leaderboard endpoint or server-side score storage exists in this repository. The game therefore does not display fabricated global rankings; personal records are explicitly local to this device. `src/leaderboard.ts` defines the typed `LeaderboardClient` contract where a real authenticated backend can be injected. A production integration needs a backend for score submission and retrieval, plus server-side validation/ranking before the UI advertises global standings.
