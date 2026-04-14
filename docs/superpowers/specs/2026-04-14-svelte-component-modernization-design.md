# Svelte Component Modernization Design

**Date:** 2026-04-14

**Project:** OpenSimGear Website

**Scope:** Modernize existing Svelte components to current Svelte 5 conventions without changing UI or calculator
behavior

---

## Context

Project already runs `svelte@5.55.3` with Astro 6, but component code still mixes older Svelte patterns:

- `export let` props in leaf and scene components
- broad `$:` reactive statements for derived state, clamping, and side effects
- legacy `on:` event directives in templates
- imperative mount + URL sync logic spread through large calculator components

Most Svelte code lives in calculator components:

- `src/components/calculator/actuator-sizing/index.svelte`
- `src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte`
- `src/components/calculator/stewart-platform/index.svelte`
- `src/components/calculator/stewart-platform/Scene.svelte`
- `src/components/calculator/stewart-platform/Leg.svelte`
- `src/components/calculator/stewart-platform/Platform.svelte`
- `src/components/calculator/stewart-platform/Joint.svelte`
- `src/components/util/CookiePreferencesLink.svelte`

Current code works, but old patterns make dependencies harder to reason about and make side effects less explicit. One
utility component also contains a stray `debugger` statement that should be removed as part of modernization.

---

## Goals

1. Move component code toward idiomatic Svelte 5 rune-based patterns
2. Make side effects explicit and keep pure computation separate from browser effects
3. Keep current rendered output, interactivity, URL persistence, and public usage intact
4. Reduce future upgrade friction by removing obviously legacy component syntax

---

## Non-Goals

- No UI redesign or visual restyling
- No changes to calculator formulas or domain math in existing `.ts` modules unless required by component migration
- No broad architecture rewrite into stores or shared state unless a small helper extraction becomes necessary to
  support clear rune usage
- No unrelated refactors outside touched Svelte components

---

## Recommended Approach

Use a component-by-component rune migration.

This keeps scope focused on Svelte conventions rather than combining modernization with a larger architecture rewrite.
Each component keeps its current responsibility, but internal state handling becomes clearer:

- mutable local UI state uses `$state(...)`
- pure computed values use `$derived(...)` or `$derived.by(...)`
- browser-only and imperative sync uses `$effect(...)`
- component props use `$props()`
- template event bindings use modern event attributes where supported

This approach gives most long-term value with lower regression risk than extracting shared stores or redesigning state
shape during same pass.

---

## Alternatives Considered

### 1. Aggressive shared-state rewrite

Extract URL state management and repeated geometry/state code into shared helpers or stores while also migrating to
runes.

**Pros:** cleaner architecture, less duplication between calculator entry components.

**Cons:** materially larger scope, more moving parts, higher chance of behavior drift, harder review.

### 2. Mechanical syntax-only refresh

Replace obvious deprecated syntax while leaving most `$:` structure intact.

**Pros:** smallest diff, lowest short-term risk.

**Cons:** leaves old reactive architecture in place, misses most value of Svelte 5 conventions, likely needs another
cleanup later.

---

## Design

### 1. Prop Modernization

Convert component props from `export let` to `$props()` in leaf and scene components where inputs are passed from
parents:

- `src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte`
- `src/components/calculator/stewart-platform/Scene.svelte`
- `src/components/calculator/stewart-platform/Leg.svelte`
- `src/components/calculator/stewart-platform/Platform.svelte`
- `src/components/calculator/stewart-platform/Joint.svelte`
- `src/components/util/CookiePreferencesLink.svelte`

Prop names should stay the same unless parent and child are migrated together inside same local boundary. This keeps
Astro/Svelte call sites stable and avoids unnecessary cross-file churn.

### 2. Local State and Derived Values

Replace broad reactive declarations with explicit rune grouping.

For calculator entry components:

- `src/components/calculator/actuator-sizing/index.svelte`
- `src/components/calculator/stewart-platform/index.svelte`

use `$state` for form values, toggles, popup state, and other mutable user-controlled values.

Use `$derived` or `$derived.by` for:

- decoded/selected ballscrew geometry
- motion profile values and visualization data
- computed mass/force/inertia/result tables
- Stewart platform geometry, limits, and movement option objects
- center-of-rotation vectors and other pure geometry transforms

Guideline: if logic only reads state and returns value, it belongs in `$derived`, not `$effect`.

### 3. Side Effects

Keep side effects narrow and named.

Use `$effect` only for work such as:

- syncing URL query params after state changes
- browser-only initialization that depends on `window`
- persistence of user motors to local storage if needed by updated flow
- imperative clamping when derived actuator constraints shrink valid movement ranges

Avoid current pattern of broad `$:` blocks that both declare dependencies and perform side effects implicitly.

### 4. Event Syntax

Update legacy `on:click`, `on:mouseenter`, `on:mousemove`, and similar event directives in migrated files to modern
event attributes where supported by current Svelte 5 syntax.

This modernization stays within touched components only. If a third-party component still requires existing syntax at a
specific integration boundary, keep that boundary stable rather than forcing a risky workaround.

### 5. Browser Safety and SSR

Existing components already guard `window` access. Preserve that behavior.

Initialization flow should be:

- read browser URL state only in browser-safe path
- initialize local component state from decoded params where present
- start URL synchronization only after initialization completes so defaults do not overwrite incoming params

This preserves current calculator deep-link behavior while making ordering explicit.

### 6. File-Specific Notes

#### `src/components/calculator/actuator-sizing/index.svelte`

This is largest migration target and should be treated as structured cleanup, not a redesign.

Key changes:

- group user-input fields into rune state declarations
- replace long `$:` chain of computed values with ordered derived values
- isolate URL sync into one effect behind initialized/mounted guard
- keep current table rendering, sort behavior, hover popup, and add/remove custom motor flow unchanged

#### `src/components/calculator/stewart-platform/index.svelte`

Key changes:

- migrate parameter state and movement state to `$state`
- convert geometry/constraint calculations to derived values
- keep current URL persistence behavior under focused effect
- keep clamping logic explicit when actuator constraints or platform geometry change

#### `src/components/calculator/stewart-platform/Scene.svelte`

Key changes:

- convert props to `$props()`
- rewrite internal geometry/status calculations with rune-based derived/effect structure where it improves clarity
- preserve current Threlte scene behavior and valid-position fallback behavior

#### `src/components/util/CookiePreferencesLink.svelte`

Key changes:

- migrate prop handling to `$props()`
- remove stray `debugger`
- keep same button behavior calling `CookieConsent.showPreferences()`

---

## Verification Plan

After modernization:

- run `pnpm test`
- run `pnpm build`

Manual verification focus:

- actuator sizing calculator still updates results as inputs change
- Stewart platform scene still renders and movement controls remain bounded correctly
- URL query state still round-trips on both calculator pages
- cookie preferences link still opens preferences UI

---

## Success Criteria

1. Touched Svelte components use Svelte 5 prop/state/derived/effect conventions where they improve clarity
2. No legacy `export let` remains in migrated component files
3. Legacy `$:` blocks are removed from migrated files when a rune-based equivalent is clearer
4. Deprecated template event syntax is removed from migrated files where modern attribute syntax is supported
5. `pnpm build` passes
6. `pnpm test` passes
7. Calculator behavior and URL persistence remain unchanged from user perspective

---

## Risks and Mitigations

| Risk                                                                  | Mitigation                                                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Large calculator files become harder to migrate safely                | Keep formulas in existing `.ts` modules and preserve current markup structure                  |
| `$effect` misuse causes loops or premature URL writes                 | Use explicit init guard and keep effects limited to side effects only                          |
| Threlte integration behaves differently under refactor                | Preserve current public props and imperative scene behavior; verify scene manually after build |
| Event syntax changes conflict with third-party component expectations | Modernize only where supported; keep integration boundaries stable if necessary                |

---

## Implementation Boundary

This design covers only Svelte component modernization. If migration reveals duplicated URL-state logic worth sharing,
that can be handled as a small helper extraction only if it directly simplifies rune usage and does not expand scope
into a broader app-state refactor.
