# OpenSimGear Website

Documentation website for OpenSimGear, built with Astro and Starlight.

## Requirements

- Node.js
- pnpm

## Getting Started

```bash
pnpm install
pnpm dev
```

## Commands

- `pnpm dev` - start local dev server
- `pnpm build` - run Astro checks and production build
- `pnpm preview` - preview production build locally
- `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4321 pnpm e2e` - run Playwright BDD smoke tests against a running site

## Tech Stack

- Astro 6
- Starlight
- Svelte 5
- Tailwind CSS v4

## End-to-End Tests

E2E tests use Playwright with Gherkin feature files and Cucumber-style step definitions via `playwright-bdd`.

To run them locally, just run:

```bash
pnpm e2e
```

To run them against an already deployed site instead:

```bash
PLAYWRIGHT_BASE_URL=https://opensimgear.github.io pnpm e2e
```

GitHub Actions runs smoke suite after GitHub Pages deployment using live deployed URL.
