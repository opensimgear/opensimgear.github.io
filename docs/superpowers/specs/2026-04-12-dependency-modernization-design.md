# Dependency Modernization Design

**Date:** 2026-04-12
**Project:** OpenSimGear Website
**Scope:** Full dependency upgrade targeting Astro 6 as anchor, all ecosystem packages updated to latest

---

## Context

The project is an Astro 5 Starlight documentation site with:
- Svelte 5 interactive components (3D simulators via Threlte/Three.js, motor scaling calculator)
- TailwindCSS 4 for styling
- Sentry 9 for error tracking
- Partytown for deferred scripts
- Cookie consent
- Custom Starlight component overrides (Head, Hero, PageFrame)

Current state: working directory already has minor version bumps applied; project builds cleanly with 0 type errors on Astro 5. Many packages are behind including several major version jumps.

---

## Approach: Layered Upgrade (Option B)

Upgrade in five independent layers, verifying `pnpm astro check && pnpm build` passes after each before proceeding. Tightly coupled packages move together; independent packages are grouped by domain.

---

## Layer 1 — Astro Core + Starlight Ecosystem

**Packages:**
- `astro`: 5.16.6 → 6.x
- `@astrojs/mdx`: 4.x → 5.x
- `@astrojs/svelte`: 7.x → 8.x
- `@astrojs/starlight`: 0.34.x → 0.38.x
- `@astrojs/starlight-tailwind`: 4.x → 5.x
- `@astrojs/check`: patch update
- `@astrojs/sitemap`: minor update
- `@astrojs/partytown`: patch update

**Expected breakage areas:**
- `src/content/config.ts` — content collection API changes between Astro 5 and 6
- `src/styles/global.css` — `@astrojs/starlight-tailwind` v5 may change CSS import paths or layer setup
- Starlight component overrides (`Head.astro`, `Hero.astro`, `PageFrame.astro`) — slot or prop API may change
- `astro.config.mjs` — integration option signatures may change

**Verification:** `pnpm astro check && pnpm build` must pass with 0 errors.

---

## Layer 2 — CSS / UI

**Packages:**
- `tailwindcss`: 4.1.x → 4.2.x
- `@tailwindcss/vite`: 4.1.x → 4.2.x
- `@tailwindcss/forms`: patch update
- `@tailwindcss/typography`: patch update (if behind)
- `preline`: 3.x → 4.x
- `tailwind-merge`: minor update

**Expected breakage areas:**
- `preline` 3→4 is a major bump; any usage of Preline JS classes or initialization in components may need updating
- TailwindCSS 4.1→4.2 is minor; unlikely to break but `@apply` rules and custom utilities should be verified

**Verification:** `pnpm astro check && pnpm build` must pass; visually inspect any pages using Preline components.

---

## Layer 3 — Svelte / 3D

**Packages:**
- `svelte`: 5.46.x → 5.55.x
- `@threlte/core`: 8.3.x → 8.5.x
- `@threlte/extras`: 9.7.x → 9.14.x
- `three`: 0.176.x → 0.183.x
- `@types/three`: 0.176.x → 0.183.x
- `svelte-tweakpane-ui`: patch update
- `svelte-youtube-embed`: patch update (if behind)

**Expected breakage areas:**
- `three` 0.176→0.183 is a minor but Three.js has frequent API deprecations; check Threlte components
- Threlte minor updates may introduce new prop names or deprecate old ones
- Svelte 5 minor updates are typically safe within Svelte 5

**Files to verify:** `src/components/calculator/stewart-platform/*.svelte`, `src/components/calculator/motor-scaling/index.svelte`

**Verification:** `pnpm astro check && pnpm build` must pass; open calculator pages and verify 3D scenes render.

---

## Layer 4 — Sentry

**Packages:**
- `@sentry/astro`: 9.x → 10.x

**Expected breakage areas:**
- Sentry 10 is a major SDK rewrite; `astro.config.mjs` Sentry integration options may change
- No separate `sentry.client.config.js` / `sentry.server.config.js` in this project — all config is inline in `astro.config.mjs`

**Verification:** `pnpm astro check && pnpm build` must pass; confirm no Sentry-related type errors.

---

## Layer 5 — Dev Tooling

**Packages:**
- `typescript`: 5.x → 6.x
- `eslint`: 9.x → 10.x
- `@eslint/js`: 9.x → 10.x
- `typescript-eslint`: minor update
- `@typescript-eslint/parser`: minor update
- `eslint-plugin-astro`: minor update
- `globals`: 16.x → 17.x
- `prettier`: minor update
- `prettier-plugin-astro`: patch update (if behind)
- `astro-vtbot`: minor update
- `@playform/compress`: 0.1.x → 0.2.x
- `unpic`: minor update

**Expected breakage areas:**
- TypeScript 5→6 may introduce stricter checks; `tsconfig.json` extends `astro/tsconfigs/strict` (auto-updates with Astro) so manual changes are unlikely but may be needed
- ESLint 9→10: project uses `eslint.config.mjs` (flat config) with `eslint-plugin-astro`, `typescript-eslint`, `@eslint/js`, and `globals` — flat config format will likely survive but plugin API changes may need adjustment
- `globals` 16→17: used in `eslint.config.mjs` to provide `globals.browser` and `globals.node`; unlikely to break but API surface may change

**Verification:** `pnpm astro check && pnpm build` must pass; ESLint must run without config errors.

---

## Success Criteria

1. All packages at latest available version
2. `pnpm astro check` passes with 0 errors
3. `pnpm build` completes successfully
4. No runtime regressions in calculator pages (Stewart platform 3D scene, motor scaling)
5. Site deploys and renders correctly

---

## Files Most Likely to Need Changes

| File | Reason |
|------|--------|
| `package.json` | Version bumps across all layers |
| `astro.config.mjs` | Integration API changes (Starlight, Sentry) |
| `src/content/config.ts` | Astro 6 content collection API |
| `src/styles/global.css` | starlight-tailwind v5 CSS import changes |
| `src/components/overrides/*.astro` | Starlight component override API changes |
| `tsconfig.json` | TypeScript 6 config adjustments |
| `eslint.config.mjs` | ESLint 10 flat config / plugin API changes |
| `astro.config.mjs` (Sentry section) | Sentry 10 SDK integration API changes |
