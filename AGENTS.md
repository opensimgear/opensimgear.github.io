# AGENTS.md

## **Important**

- Do not use the superpowers skill unless explicitly instructed
- Do not use worktrees unless explicitly instructed
- Do use the superpowers:subagent-driven-development skill to implement
- **use the caveman skill always!**
- tests can only test inputs, outputs and side effects of functions, never implementation details or constants
- always check if the application is running locally and verify changes in the browser when working on frontend code
- use ~/ for import from src for all code, never relative imports

## Commands

Use `pnpm` as the package manager.

```bash
pnpm dev          # Start Astro dev server
pnpm build        # Type-check (astro check) + build for production
pnpm preview      # Preview the production build locally
pnpm test         # Run Vitest test suite
pnpm e2e          # Run Playwright BDD e2e tests (auto-starts dev server)
pnpm dlx eslint . # Lint the codebase (no npm script defined)
pnpm dlx prettier --write . # Format code, always run after writing code
```

The `build` command runs `astro check` first, which performs TypeScript type checking across all `.astro`, `.ts`, and
`.svelte` files. Unit tests live in `src/tests/` and run with Vitest via `pnpm test`.

E2E tests use **Playwright BDD** with Gherkin feature files in `e2e/features/` and step definitions in `e2e/steps/`.
`pnpm e2e` auto-starts the dev server; to run against an external URL:
`PLAYWRIGHT_BASE_URL=https://example.com pnpm e2e`.

## Architecture

### Tech Stack

- **Astro 6** with **Starlight** (documentation framework) as the core
- **Svelte 5** for interactive components (calculators, 3D visualization)
- **Tailwind CSS v4** configured via `@theme` blocks in `src/styles/global.css` (no `tailwind.config.*` file)
- **Threlte + Three.js** for 3D rendering in the Stewart Platform calculator
- **Path alias:** `~` maps to `./src` (used in imports as `~/components/...`)
- **TweakPane** ui lib used for the settings in calculators. Widgets are here
  https://kitschpatrol.com/svelte-tweakpane-ui/docs/components/

### Component Layers

1. **Starlight overrides** (`src/components/overrides/`): Custom `Head.astro`, `Hero.astro`, `PageTitle.astro`,
   `SiteTitle.astro` that replace Starlight's defaults
2. **Calculator components** (`src/components/calculator/`): Svelte-based interactive calculators
   - `actuator-sizing/` — actuator sizing calculator
   - `stewart-platform/` — 3D Stewart Platform calculator using Threlte/Three.js
   - `aluminum-rig-planner/` — aluminum rig planner with posture optimizer and cut-list generator
   - `shared/` — shared calculator utilities (3D scene controls, viewport gizmo, debounced URL state, SpaceMouse)
3. **Common components** (`src/components/common/`): `Image.astro` wrapper
4. **UI components** (`src/components/ui/`): Reusable Astro UI primitives (Button, WidgetWrapper, Timeline, etc.)
5. **Utility components** (`src/components/util/`): `Analytics.astro`, `CookiePreferencesLink.svelte`,
   `LazyYoutube.svelte`, `cookie-consent.ts`

### Site Configuration

`src/config.ts` is the main source of truth for shared site settings such as URLs, contact emails, footer navigation,
and reusable social links. Some Starlight-specific settings still live in `astro.config.mjs`, so check both before
changing site-wide configuration.

### Integrations of Note

- **astro-icon** — provides `<Icon>` component using Iconify icon sets (`@iconify-json/tabler`, `@iconify-json/mdi`)
- **@sentry/astro** — error tracking (Sentry)
- **starlight-links-validator** — validates internal links at build time
- **starlight-auto-sidebar** — auto-generates sidebar from directory structure
- **@nuasite/checks** — SEO, accessibility, performance checks at build time (see `astro.config.mjs` for config)
- **@playform/compress** — asset compression
- **astro-robots-txt** / **astro-webmanifest** — SEO and PWA support
- **astro-sitemap** — sitemap generation, filtered via `src/utils/seo-policy.ts`

### Code Style

- Always format with prettier
- ESLint: flat config, Astro + TypeScript ESLint + jsx-a11y rules

## When working with Svelte

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and
paths. When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant
sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections. After calling the
list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use
the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions. You MUST use this tool whenever writing Svelte code before
sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code. After completing the code, ask the user if they want a
playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## SEO

- when verifying SEO use the seo-audit skill
- also read the google SEO article here https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=en
