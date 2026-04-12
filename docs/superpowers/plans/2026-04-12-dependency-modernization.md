# Dependency Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade all dependencies to latest versions, anchored on Astro 5→6, fixing all post-upgrade breakage so `pnpm astro check && pnpm build` pass cleanly.

**Architecture:** Five sequential layers — each one upgrades a cohesive group of packages, verifies with `pnpm astro check && pnpm build`, fixes any breakage, then commits. Never proceed to the next layer until the current one is green.

**Tech Stack:** Astro 6, Starlight 0.38, Svelte 5, TailwindCSS 4.2, Threlte/Three.js, Sentry 10, TypeScript 6, ESLint 10

---

## Layer 1: Astro Core + Starlight Ecosystem

### Task 1: Bump Layer 1 package versions

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update dependency versions in `package.json`**

Open `package.json` and apply these exact version changes in `"dependencies"`:

```json
"@astrojs/check": "^0.9.8",
"@astrojs/mdx": "^5.0.3",
"@astrojs/partytown": "^2.1.6",
"@astrojs/sitemap": "^3.7.2",
"@astrojs/starlight": "^0.38.3",
"@astrojs/starlight-tailwind": "^5.0.0",
"@astrojs/svelte": "^8.0.4",
"astro": "^6.1.5",
"astro-expressive-code": "^0.41.7",
```

- [ ] **Step 2: Install updated packages**

```bash
pnpm install
```

Expected: lockfile updated, no install errors.

---

### Task 2: Fix Layer 1 breakage

**Files:**
- Modify: `astro.config.mjs`
- Modify: `src/styles/global.css`
- Modify: `src/content/config.ts`
- Modify: `src/components/overrides/Head.astro` (if needed)
- Modify: `src/components/overrides/Hero.astro` (if needed)
- Modify: `src/components/overrides/PageFrame.astro` (if needed)
- Modify: `svelte.config.js` (if needed)

- [ ] **Step 1: Run type check and capture errors**

```bash
pnpm astro check 2>&1 | tee /tmp/layer1-check.txt
cat /tmp/layer1-check.txt
```

- [ ] **Step 2: Fix `@astrojs/starlight-tailwind` v5 CSS import**

`@astrojs/starlight-tailwind` v5 changed how it integrates with TailwindCSS 4. Open `src/styles/global.css` and update the import line. In v4 the import was:

```css
@import '@astrojs/starlight-tailwind';
```

In v5 this may have been removed (Starlight now injects its theme directly via the Vite plugin). If you see a build error referencing this import, remove the line entirely:

```css
/* REMOVE this line if it causes an error in v5: */
/* @import '@astrojs/starlight-tailwind'; */
```

The file should still retain the layer declarations and theme variables:

```css
@import 'https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@3.0.1/dist/cookieconsent.css';

@layer base, starlight, theme, components, utilities;

@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities);

@theme {
  --color-accent-200: #a0d9ab;
  --color-accent-500: #00a449;
  --color-accent-600: #00823a;
  --color-accent-700: #007132;
  --color-accent-800: #00602b;
  --color-accent-900: #003e18;
  --color-accent-950: #002d0f;
  --color-gray-100: #f4f6fa;
  --color-gray-200: #e8eef6;
  --color-gray-300: #bcc3cc;
  --color-gray-400: #808d9e;
  --color-gray-500: #4d5969;
  --color-gray-700: #2e3948;
  --color-gray-800: #1d2835;
  --color-gray-900: #14191f;
}
```

If the import still works fine in v5, leave it in place.

- [ ] **Step 3: Fix Astro 6 content config if needed**

`src/content/config.ts` currently uses:

```typescript
import { defineCollection } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    schema: docsSchema(),
  }),
};
```

Astro 6 stabilized the Content Layer API. If `pnpm astro check` reports errors about `defineCollection` or schema, update to use Starlight's `defineCollection` re-export:

```typescript
import { defineCollection } from '@astrojs/starlight/utils/collections';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    schema: docsSchema(),
  }),
};
```

If no errors, leave the current code unchanged.

- [ ] **Step 4: Fix `astro.config.mjs` integration option changes**

Astro 6 and Starlight 0.38 may have renamed or removed some integration options. Open `astro.config.mjs` and check for these patterns:

**Social links format** — Starlight 0.38 changed the `social` array shape. If you see a type error on the `social` field, the new format requires explicit `icon` as an iconify id string. Current config:

```js
social: [
  { label: 'Github', icon: 'github', href: '...' },
  { label: 'Discord', icon: 'discord', href: '...' },
],
```

If the type errors reference a different expected shape, check the Starlight 0.38 changelog via:
```bash
cat node_modules/@astrojs/starlight/CHANGELOG.md | head -200
```

Then adjust accordingly. The `icon` field may now accept only `@astrojs/starlight/icons` values or require `{ type: 'github', href: '...' }` shape.

- [ ] **Step 5: Fix any remaining type errors from `pnpm astro check`**

Read `/tmp/layer1-check.txt`. For each error:

- If it references a removed Astro API (e.g., `Astro.glob`, `getEntryBySlug`), check the Astro 6 migration guide:
  ```bash
  cat node_modules/astro/CHANGELOG.md | grep -A5 "BREAKING"
  ```
- If it references a Starlight component override prop change, check:
  ```bash
  cat node_modules/@astrojs/starlight/CHANGELOG.md | grep -A5 "BREAKING"
  ```
- Fix each error in the referenced file.

- [ ] **Step 6: Run full build**

```bash
pnpm build 2>&1 | tee /tmp/layer1-build.txt
cat /tmp/layer1-build.txt
```

Expected: `19 page(s) built` (or similar count), `[build] Complete!`

If build fails, read the error and fix the referenced file. Common build-time (not type-time) issues:
- CSS `@import` order errors → reorder imports in `src/styles/global.css`
- Missing Vite plugin → ensure `tailwindcss()` is still in `vite.plugins` in `astro.config.mjs`

- [ ] **Step 7: Commit Layer 1**

```bash
git add package.json pnpm-lock.yaml astro.config.mjs src/styles/global.css src/content/config.ts src/components/overrides/
git commit -m "chore: upgrade astro 6 + starlight ecosystem"
```

---

## Layer 2: CSS / UI

### Task 3: Bump Layer 2 package versions

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update versions in `package.json`**

In `"dependencies"`:
```json
"@tailwindcss/forms": "^0.5.11",
"@tailwindcss/typography": "^0.5.19",
"@tailwindcss/vite": "^4.2.2",
"preline": "^4.1.3",
"tailwindcss": "^4.2.2",
```

In `"devDependencies"`:
```json
"tailwind-merge": "3.5.0",
```

- [ ] **Step 2: Install updated packages**

```bash
pnpm install
```

---

### Task 4: Fix Layer 2 breakage

**Files:**
- Modify: `src/styles/global.css` (if Tailwind 4.2 CSS API changed)
- Modify: any component using Preline JS classes

- [ ] **Step 1: Run type check**

```bash
pnpm astro check 2>&1 | tee /tmp/layer2-check.txt
cat /tmp/layer2-check.txt
```

Expected: 0 errors (Tailwind changes are CSS-only and don't affect TS types).

- [ ] **Step 2: Check for Preline 3→4 breaking changes**

Preline 4.x reorganized its component classes and JS API. Check which Preline features are used:

```bash
grep -r "preline\|hs-" src/ --include="*.astro" --include="*.svelte" --include="*.ts" -l
```

If no files reference Preline classes or the `preline` import, no changes needed.

If files import from `preline`, check the import changed from `preline/src/index.js` to `preline` barrel exports in v4:

Old (v3):
```js
import 'preline/dist/preline.js';
```

New (v4):
```js
import 'preline';
```

Check the actual import in any affected file and update accordingly.

- [ ] **Step 3: Run full build**

```bash
pnpm build 2>&1 | tee /tmp/layer2-build.txt
cat /tmp/layer2-build.txt
```

Expected: `[build] Complete!`

If CSS errors appear about `@apply` or `@utility`, check that the TailwindCSS 4.2 syntax in `src/styles/global.css` is still valid. The `@utility` directive and `@layer` usage should be unchanged between 4.1 and 4.2.

- [ ] **Step 4: Commit Layer 2**

```bash
git add package.json pnpm-lock.yaml src/
git commit -m "chore: upgrade tailwindcss 4.2 and preline 4"
```

---

## Layer 3: Svelte / 3D

### Task 5: Bump Layer 3 package versions

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update versions in `package.json`**

In `"dependencies"`:
```json
"@threlte/core": "^8.5.9",
"@threlte/extras": "^9.14.5",
"@types/three": "^0.183.1",
"svelte": "^5.55.3",
"svelte-tweakpane-ui": "^1.5.16",
"three": "^0.183.2",
```

- [ ] **Step 2: Install updated packages**

```bash
pnpm install
```

---

### Task 6: Fix Layer 3 breakage

**Files:**
- Modify: `src/components/calculator/stewart-platform/*.svelte` (if Three.js API changed)
- Modify: `src/components/calculator/motor-scaling/index.svelte` (if needed)

- [ ] **Step 1: Run type check**

```bash
pnpm astro check 2>&1 | tee /tmp/layer3-check.txt
cat /tmp/layer3-check.txt
```

- [ ] **Step 2: Fix Three.js 0.176→0.183 API changes if needed**

Three.js 0.183 deprecates and removes APIs incrementally. Check the changelog for removed items:

```bash
cat node_modules/three/CHANGELOG.md | grep -E "^## r18[0-9]" -A 30 | grep -i "remov\|break\|deprecat"
```

Common Three.js migration patterns between r176–r183:
- `Geometry` was removed long ago (already gone)
- `MeshStandardMaterial` API is stable
- `WebGLRenderer` constructor options are stable
- If any error references a removed class, check the Three.js migration guide in `node_modules/three/CHANGELOG.md`

Fix any type errors in the `src/components/calculator/` files:

```bash
grep -r "three" src/components/calculator/ --include="*.svelte" | head -30
```

- [ ] **Step 3: Fix Threlte minor version changes if needed**

Threlte `@threlte/core` 8.3→8.5 and `@threlte/extras` 9.7→9.14 are minor updates. Check for deprecated prop names:

```bash
cat node_modules/@threlte/core/CHANGELOG.md | head -100
cat node_modules/@threlte/extras/CHANGELOG.md | head -100
```

Fix any prop name changes in the Stewart platform components (`Joint.svelte`, `Leg.svelte`, `Platform.svelte`, `Scene.svelte`).

- [ ] **Step 4: Run full build**

```bash
pnpm build 2>&1 | tee /tmp/layer3-build.txt
cat /tmp/layer3-build.txt
```

Expected: `[build] Complete!`

- [ ] **Step 5: Commit Layer 3**

```bash
git add package.json pnpm-lock.yaml src/components/calculator/
git commit -m "chore: upgrade svelte 5.55, threlte, three.js 0.183"
```

---

## Layer 4: Sentry

### Task 7: Bump and fix Sentry

**Files:**
- Modify: `package.json`
- Modify: `astro.config.mjs`

- [ ] **Step 1: Update Sentry version in `package.json`**

In `"dependencies"`:
```json
"@sentry/astro": "^10.48.0",
```

- [ ] **Step 2: Install**

```bash
pnpm install
```

- [ ] **Step 3: Check Sentry 10 breaking changes**

```bash
cat node_modules/@sentry/astro/CHANGELOG.md | head -150
```

Sentry 10 is a major SDK rewrite. The Astro integration API in `astro.config.mjs` likely changed. Current config:

```js
sentry({
  enabled: process.env.NODE_ENV === 'development',
}),
```

In Sentry 10, the `enabled` option may have been replaced by conditional integration inclusion, or the option name changed. Common Sentry 10 pattern:

```js
// Option A: still using `enabled` (check changelog)
sentry({
  enabled: process.env.NODE_ENV === 'development',
}),

// Option B: if `enabled` was removed, conditionally include the integration
...(process.env.NODE_ENV === 'development' ? [sentry()] : []),
```

Read the changelog and apply whichever pattern matches Sentry 10's API.

- [ ] **Step 4: Run type check and build**

```bash
pnpm astro check 2>&1 | tee /tmp/layer4-check.txt
cat /tmp/layer4-check.txt
pnpm build 2>&1 | tee /tmp/layer4-build.txt
cat /tmp/layer4-build.txt
```

Expected: 0 errors, `[build] Complete!`

If Sentry-related type errors appear (e.g., on `SentryAstroOptions`), read the error message and check the new type signature:

```bash
cat node_modules/@sentry/astro/build/module/index.d.ts | head -50
```

Adjust `astro.config.mjs` to match the new type.

- [ ] **Step 5: Commit Layer 4**

```bash
git add package.json pnpm-lock.yaml astro.config.mjs
git commit -m "chore: upgrade @sentry/astro to v10"
```

---

## Layer 5: Dev Tooling

### Task 8: Bump Layer 5 package versions

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update devDependency versions in `package.json`**

In `"dependencies"`:
```json
"typescript": "^6.0.2",
```

In `"devDependencies"`:
```json
"@eslint/js": "10.0.1",
"@playform/compress": "0.2.3",
"@typescript-eslint/parser": "8.58.1",
"astro-vtbot": "2.1.12",
"eslint": "10.2.0",
"eslint-plugin-astro": "1.7.0",
"globals": "17.5.0",
"prettier": "3.8.2",
"typescript-eslint": "8.58.1",
"unpic": "4.2.2",
```

- [ ] **Step 2: Install**

```bash
pnpm install
```

---

### Task 9: Fix Layer 5 breakage

**Files:**
- Modify: `eslint.config.mjs`
- Modify: `tsconfig.json` (if needed)
- Modify: `astro.config.mjs` (for `@playform/compress` v0.2 API changes)

- [ ] **Step 1: Run type check**

```bash
pnpm astro check 2>&1 | tee /tmp/layer5-check.txt
cat /tmp/layer5-check.txt
```

TypeScript 6 introduces stricter checks. Common issues:
- `exactOptionalPropertyTypes` stricter enforcement — if you see errors about `undefined` vs `missing property`, the fix is to add explicit `| undefined` to the type or use optional chaining
- `noUncheckedIndexedAccess` — if enabled in tsconfig and new errors appear, cast the array access or add a null check

If TypeScript errors appear that didn't exist before, check which tsconfig settings changed:
```bash
cat node_modules/astro/tsconfigs/strict.json
```

Adjust `tsconfig.json` if needed (e.g., add `"exactOptionalPropertyTypes": false` to opt out of a newly defaulted strict option).

- [ ] **Step 2: Fix ESLint 9→10 config changes**

ESLint 10 may have removed some rule APIs. The current `eslint.config.mjs` uses flat config which is the right format. Check for breakage:

```bash
./node_modules/.bin/eslint --version
./node_modules/.bin/eslint src/env.d.ts 2>&1 | head -30
```

Common ESLint 10 issues:
- If `eslintPluginAstro.configs['flat/recommended']` no longer exists, it may have been renamed. Check:
  ```bash
  node -e "import('eslint-plugin-astro').then(m => console.log(Object.keys(m.default.configs)))"
  ```
  Update the config key in `eslint.config.mjs` to match.

- If `globals.browser` or `globals.node` no longer exist in `globals` v17, check:
  ```bash
  node -e "import('globals').then(m => console.log(Object.keys(m.default).slice(0,10)))"
  ```
  Update property access in `eslint.config.mjs` to match the new API.

- [ ] **Step 3: Fix `@playform/compress` v0.2 API changes**

`@playform/compress` changed from 0.1→0.2. Check if the integration import or options changed:

```bash
cat node_modules/@playform/compress/CHANGELOG.md | head -80
```

Current usage in `astro.config.mjs`:
```js
import playformCompress from '@playform/compress';
// ...
playformCompress(),
```

If the import path or function signature changed in 0.2, update accordingly. Check the new export:
```bash
node -e "import('@playform/compress').then(m => console.log(Object.keys(m)))"
```

- [ ] **Step 4: Run full build**

```bash
pnpm build 2>&1 | tee /tmp/layer5-build.txt
cat /tmp/layer5-build.txt
```

Expected: `[build] Complete!`

- [ ] **Step 5: Commit Layer 5**

```bash
git add package.json pnpm-lock.yaml eslint.config.mjs tsconfig.json astro.config.mjs
git commit -m "chore: upgrade typescript 6, eslint 10, and dev tooling"
```

---

## Final Verification

### Task 10: End-to-end verification

- [ ] **Step 1: Clean build**

```bash
rm -rf dist
pnpm build 2>&1 | tail -20
```

Expected: `[build] Complete!` with page count matching before the upgrade.

- [ ] **Step 2: Verify type check is clean**

```bash
pnpm astro check
```

Expected:
```
Result (26 files):
- 0 errors
- 0 warnings
- 0 hints
```

- [ ] **Step 3: Confirm all packages are at latest**

```bash
pnpm outdated
```

Expected: empty output (exit 0). If any packages still appear, they have newer versions released since this plan was written — bump them in `package.json` and repeat the fix/verify cycle.

- [ ] **Step 4: Final commit if any remaining changes**

```bash
git status
# If any modified files remain:
git add -A
git commit -m "chore: finalize dependency modernization"
```
