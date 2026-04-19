# Stewart Platform Mobile Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Stewart platform calculator usable on mobile by stacking controls under scene, shrinking scene height on narrow viewports, and starting all existing panes collapsed on narrow screens.

**Architecture:** Keep all Stewart platform math and URL state logic in place. Add a small tested helper for responsive layout defaults, then wire `src/components/calculator/stewart-platform/index.svelte` to a viewport flag that controls layout classes, scene height, and `Pane` `expanded` props.

**Tech Stack:** Astro, Svelte 5, Tailwind CSS v4, svelte-tweakpane-ui, Vitest

---

## File Map

- Modify: `src/components/calculator/stewart-platform/index.svelte` — responsive viewport detection, pane expansion state, layout class changes, scene height changes.
- Modify: `src/components/calculator/stewart-platform/state.ts` — small helper(s) for responsive pane defaults and breakpoint logic if extracted for testability.
- Create: `src/tests/stewart-platform/responsive-layout.test.ts` — unit tests for new helper behavior.

### Task 1: Add failing tests for responsive layout helper

**Files:**
- Modify: `src/components/calculator/stewart-platform/state.ts`
- Create: `src/tests/stewart-platform/responsive-layout.test.ts`
- Run: `src/tests/stewart-platform/responsive-layout.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from 'vitest';

import {
  MOBILE_STEWART_BREAKPOINT,
  getStewartPaneExpandedState,
  isNarrowStewartViewport,
} from '../../components/calculator/stewart-platform/state';

describe('isNarrowStewartViewport', () => {
  it('treats widths below the mobile breakpoint as narrow', () => {
    expect(isNarrowStewartViewport(MOBILE_STEWART_BREAKPOINT - 1)).toBe(true);
  });

  it('treats breakpoint width and above as wide', () => {
    expect(isNarrowStewartViewport(MOBILE_STEWART_BREAKPOINT)).toBe(false);
    expect(isNarrowStewartViewport(MOBILE_STEWART_BREAKPOINT + 160)).toBe(false);
  });
});

describe('getStewartPaneExpandedState', () => {
  it('starts all panes collapsed on narrow viewports', () => {
    expect(getStewartPaneExpandedState(true)).toEqual({
      parameters: false,
      actuatorRange: false,
      movement: false,
      constraints: false,
    });
  });

  it('starts all panes expanded on wide viewports', () => {
    expect(getStewartPaneExpandedState(false)).toEqual({
      parameters: true,
      actuatorRange: true,
      movement: true,
      constraints: true,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/tests/stewart-platform/responsive-layout.test.ts`
Expected: FAIL with missing exports from `src/components/calculator/stewart-platform/state.ts`

- [ ] **Step 3: Write minimal implementation**

```ts
export const MOBILE_STEWART_BREAKPOINT = 1024;

export type StewartPaneExpandedState = {
  parameters: boolean;
  actuatorRange: boolean;
  movement: boolean;
  constraints: boolean;
};

export function isNarrowStewartViewport(width: number) {
  return width < MOBILE_STEWART_BREAKPOINT;
}

export function getStewartPaneExpandedState(isNarrow: boolean): StewartPaneExpandedState {
  if (isNarrow) {
    return {
      parameters: false,
      actuatorRange: false,
      movement: false,
      constraints: false,
    };
  }

  return {
    parameters: true,
    actuatorRange: true,
    movement: true,
    constraints: true,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/tests/stewart-platform/responsive-layout.test.ts`
Expected: PASS

### Task 2: Wire responsive layout and pane defaults into calculator component

**Files:**
- Modify: `src/components/calculator/stewart-platform/index.svelte`
- Read: `src/components/calculator/stewart-platform/state.ts`
- Run: `src/tests/stewart-platform/responsive-layout.test.ts`

- [ ] **Step 1: Write failing test expectation for helper-backed mobile defaults**

Keep Task 1 tests as regression coverage. No new component-level test is required if no existing Svelte component test harness exists for this calculator.

- [ ] **Step 2: Run test suite slice to confirm baseline stays green before component edits**

Run: `pnpm test src/tests/stewart-platform/responsive-layout.test.ts src/tests/stewart-platform/clamping.test.ts`
Expected: PASS

- [ ] **Step 3: Write minimal implementation**

Update imports and state setup in `src/components/calculator/stewart-platform/index.svelte`:

```ts
import {
  clampPlatformMovement,
  getStewartPaneExpandedState,
  isNarrowStewartViewport,
  type PlatformSpec,
  type Rotation,
  type StewartPaneExpandedState,
  type Translation,
} from './state';

let isNarrowViewport = $state(false);
let paneExpanded = $state<StewartPaneExpandedState>(getStewartPaneExpandedState(false));

function syncViewportState(width: number) {
  const nextIsNarrow = isNarrowStewartViewport(width);

  if (nextIsNarrow === isNarrowViewport) return;

  isNarrowViewport = nextIsNarrow;
  paneExpanded = getStewartPaneExpandedState(nextIsNarrow);
}

onMount(() => {
  const encoded = new URLSearchParams(window.location.search).get(STATE_KEY);

  if (encoded) {
    const state = decodeQueryState<StewartPlatformQueryState>(encoded);

    if (state) {
      applyQueryState(state);
    }
  }

  syncViewportState(window.innerWidth);

  const handleResize = () => syncViewportState(window.innerWidth);
  window.addEventListener('resize', handleResize);

  mounted = true;

  return () => {
    window.removeEventListener('resize', handleResize);
  };
});
```

Update layout and `Pane` markup:

```svelte
<div class="w-full not-content rounded border border-black">
  <div class="flex flex-col lg:flex-row">
    <div class="relative h-[320px] flex-1 bg-gray-50 sm:h-[420px] lg:h-[600px]">
      <!-- existing Canvas content unchanged -->
    </div>

    <div class="shrink-0 border-t border-black flex flex-col divide-y divide-black lg:border-t-0 lg:border-l">
      <Pane title="Parameters" position="inline" bind:expanded={paneExpanded.parameters}>
        <!-- existing controls -->
      </Pane>
      <Pane title="Actuator Range" position="inline" bind:expanded={paneExpanded.actuatorRange}>
        <!-- existing controls -->
      </Pane>
      <Pane title="Movement" position="inline" bind:expanded={paneExpanded.movement}>
        <!-- existing controls -->
      </Pane>
      <Pane title="Constraints" position="inline" bind:expanded={paneExpanded.constraints}>
        <!-- existing controls -->
      </Pane>
    </div>
  </div>
</div>
```

Preserve all current scene overlay content and control bodies. Only change responsive container classes, scene height classes, and pane `expanded` binding.

- [ ] **Step 4: Run targeted tests to verify helper coverage still passes after component edit**

Run: `pnpm test src/tests/stewart-platform/responsive-layout.test.ts src/tests/stewart-platform/clamping.test.ts`
Expected: PASS

### Task 3: Verify integrated behavior

**Files:**
- Verify: `src/components/calculator/stewart-platform/index.svelte`
- Verify: `src/tests/stewart-platform/responsive-layout.test.ts`

- [ ] **Step 1: Run project checks**

Run: `pnpm test && pnpm build`
Expected: all tests pass, `astro check` passes, production build succeeds

- [ ] **Step 2: Manually verify responsive behavior**

Run: `pnpm dev`

Verify in browser:

```text
- Desktop width: scene left, controls right, panes open as before.
- Narrow width: scene first, control stack below scene.
- Narrow initial load: Parameters / Actuator Range / Movement / Constraints all closed.
- Opening or closing panes does not affect Stewart calculations or movement clamping.
- Scene remains usable and not overly tall on narrow screens.
```

## Self-Review

- Spec coverage: all acceptance criteria map to Tasks 1-3.
- Placeholder scan: removed vague implementation steps; all file paths, commands, and code targets named.
- Type consistency: helper names and pane state keys match across tasks.
