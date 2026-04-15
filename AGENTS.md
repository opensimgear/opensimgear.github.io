# AGENTS.md

## **Important**

- Do not use the superpowers skill unless explicitly instructed
- Do not use worktrees unless explicitly instructed
- Do use the superpowers:subagent-driven-development skill to implement
- Steps use checkbox (`- [ ]`) syntax for tracking.
- **use the caveman skill always!**

## Commands

Use `pnpm` as the package manager (v10.9.0).

```bash
pnpm dev          # Start Astro dev server
pnpm build        # Type-check (astro check) + build for production
pnpm preview      # Preview the production build locally
pnpm test         # Run Vitest test suite
pnpm dlx eslint . # Lint the codebase (no npm script defined)
pnpm dlx prettier --write . # Format code
```

The `build` command runs `astro check` first, which performs TypeScript type checking across all `.astro`, `.ts`, and
`.svelte` files. Unit tests live in `src/tests/` and run with Vitest via `pnpm test`.

## Architecture

This is the **OpenSimGear documentation website** — a Starlight-based Astro site for a flight simulation open-source
project.

### Tech Stack

- **Astro 6** with **Starlight** (documentation framework) as the core
- **Svelte 5** for interactive components (calculators, 3D visualization)
- **Tailwind CSS v4** configured via `@theme` blocks in `src/styles/global.css` (no `tailwind.config.*` file)
- **Threlte + Three.js** for 3D rendering in the Stewart Platform calculator
- **Path alias:** `~` maps to `./src` (used in imports as `~/components/...`)
- **TweakPane** ui lib used for the settings in calculators. Widgets are here
  https://kitschpatrol.com/svelte-tweakpane-ui/docs/components/

### Content Structure

All documentation lives in `src/content/docs/` and is driven by Astro's content collections with the Starlight loader.
Sidebar structure is configured in `astro.config.mjs` and mixes manual sections with generated entries from content
directories:

- `docs/` — general documentation
- `calculators/` — calculator pages
- `gear/` — gear documentation
- `3rdparty/` — third-party integration guides
- `policies/` — legal pages
- Top-level `.mdx` files: `index.mdx`, `getting-started.mdx`, `contributing.mdx`, `faq.mdx`

### Component Layers

1. **Starlight overrides** (`src/components/overrides/`): Custom `Head.astro`, `Hero.astro`, `PageFrame.astro` that
   replace Starlight's defaults
2. **Calculator components** (`src/components/calculator/`): Svelte-based interactive calculators
   - `actuator-sizing/` — actuator sizing calculator
   - `stewart-platform/` — 3D Stewart Platform calculator using Threlte/Three.js
3. **UI components** (`src/components/ui/`): Reusable Astro UI primitives (Button, WidgetWrapper, Timeline, etc.)
4. **Utility components** (`src/components/util/`): CookieConsent, CookiePreferencesLink, GoogleAnalytics

### Site Configuration

`src/config.ts` is the main source of truth for shared site settings such as URLs, contact emails, footer navigation,
and reusable social links. Some Starlight-specific settings still live in `astro.config.mjs`, so check both before
changing site-wide configuration.

### Integrations of Note

- **Sentry** — enabled only in development (`process.env.NODE_ENV === 'development'`)
- **Partytown** — offloads GA scripts to a web worker; `dataLayer.push` is forwarded
- **@playform/compress** — minifies output at build time
- **astro-icon** — provides `<Icon>` component using Iconify icon sets (`@iconify-json/tabler`, `@iconify-json/mdi`)

### Code Style

- Prettier: print width 120, single quotes, trailing comma ES5
- ESLint: flat config, Astro + TypeScript ESLint + jsx-a11y rules
- Unused variables prefixed with `_` are allowed; `@typescript-eslint/no-non-null-assertion` is off
- `.editorconfig`: 2-space indent, LF line endings, UTF-8
