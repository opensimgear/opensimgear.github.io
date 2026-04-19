# Calculator URL Debounce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Debounce query-string writes for both calculators so the URL updates 300ms after input settles instead of on every reactive state change.

**Architecture:** Add one shared debounced URL writer helper in `src/components/calculator/shared/`, test it with fake timers, then replace direct `history.replaceState()` calls in both calculator components with helper-backed scheduling plus teardown cleanup. Keep query encoding/decoding and calculator state shape logic unchanged.

**Tech Stack:** Svelte 5, TypeScript, Vitest, browser History API

---

## File Map

- Create: `src/components/calculator/shared/debounced-url-state.ts` — shared browser helper for trailing debounced URL writes and cleanup.
- Create: `src/tests/calculator/debounced-url-state.test.ts` — fake-timer tests for helper behavior.
- Modify: `src/components/calculator/actuator-sizing/index.svelte` — swap direct URL writes for shared helper scheduling and cleanup.
- Modify: `src/components/calculator/stewart-platform/index.svelte` — swap direct URL writes for shared helper scheduling and cleanup.

### Task 1: Add failing tests for shared debounced URL helper

**Files:**
- Create: `src/tests/calculator/debounced-url-state.test.ts`
- Create: `src/components/calculator/shared/debounced-url-state.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDebouncedUrlStateWriter } from '../../components/calculator/shared/debounced-url-state';

describe('createDebouncedUrlStateWriter', () => {
  let replaceState: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    replaceState = vi.fn();
    window.history.replaceState = replaceState;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits until debounce interval before writing url', () => {
    const writer = createDebouncedUrlStateWriter(300);

    writer.schedule('https://example.com/?state=one');

    vi.advanceTimersByTime(299);
    expect(replaceState).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(replaceState).toHaveBeenCalledWith({}, '', 'https://example.com/?state=one');
  });

  it('keeps only latest pending url during rapid updates', () => {
    const writer = createDebouncedUrlStateWriter(300);

    writer.schedule('https://example.com/?state=one');
    vi.advanceTimersByTime(150);
    writer.schedule('https://example.com/?state=two');

    vi.advanceTimersByTime(299);
    expect(replaceState).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith({}, '', 'https://example.com/?state=two');
  });

  it('cancels pending write on cleanup', () => {
    const writer = createDebouncedUrlStateWriter(300);

    writer.schedule('https://example.com/?state=one');
    writer.cancel();
    vi.runAllTimers();

    expect(replaceState).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/tests/calculator/debounced-url-state.test.ts`
Expected: FAIL with missing module or missing export for `createDebouncedUrlStateWriter`

- [ ] **Step 3: Write minimal implementation**

```ts
export function createDebouncedUrlStateWriter(delayMs: number) {
  let timeoutId: ReturnType<typeof window.setTimeout> | null = null;
  let nextUrl = '';

  function cancel() {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function schedule(url: string) {
    nextUrl = url;
    cancel();
    timeoutId = window.setTimeout(() => {
      window.history.replaceState({}, '', nextUrl);
      timeoutId = null;
    }, delayMs);
  }

  return { schedule, cancel };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/tests/calculator/debounced-url-state.test.ts`
Expected: PASS

### Task 2: Use shared debounced writer in actuator sizing calculator

**Files:**
- Modify: `src/components/calculator/actuator-sizing/index.svelte`
- Read: `src/components/calculator/shared/debounced-url-state.ts`
- Test: `src/tests/calculator/debounced-url-state.test.ts`

- [ ] **Step 1: Write failing integration-facing test by extending helper coverage only if needed**

Keep Task 1 helper tests as regression coverage. No new component test is required if no calculator component harness exists already.

- [ ] **Step 2: Run helper test before component edit**

Run: `pnpm test src/tests/calculator/debounced-url-state.test.ts`
Expected: PASS

- [ ] **Step 3: Write minimal implementation**

Add helper import and local writer in `src/components/calculator/actuator-sizing/index.svelte`:

```ts
import { createDebouncedUrlStateWriter } from '../shared/debounced-url-state';

const URL_STATE_DEBOUNCE_MS = 300;
const debouncedUrlStateWriter = createDebouncedUrlStateWriter(URL_STATE_DEBOUNCE_MS);
```

Update mount teardown:

```ts
onMount(() => {
  const encoded = new URLSearchParams(window.location.search).get(STATE_KEY);

  if (encoded) {
    const state = decodeQueryState<ActuatorSizingQueryState>(encoded);

    if (state) {
      applyQueryState(state);
    }
  }

  userMotors = loadUserServoMotors();
  mounted = true;

  return () => {
    debouncedUrlStateWriter.cancel();
  };
});
```

Replace direct write inside reactive effect:

```ts
$effect(() => {
  if (!mounted || typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.set(
    STATE_KEY,
    encodeQueryState({
      strokeLength,
      maxVelocity,
      acceleration,
      deceleration,
      dwellTime,
      systemType,
      actuatorAngle,
      totalMass,
      imbalanceFactor,
      frictionForce,
      ballscrewKey,
      customPitch,
      customDiameter,
      screwLength,
      screwEfficiency,
      autoGearRatio,
      gearRatio,
      gearEfficiency,
      gearInertia,
      safetyFactor,
      holdingRequired,
      advancedMode,
    })
  );

  debouncedUrlStateWriter.schedule(url.toString());
});
```

- [ ] **Step 4: Run tests to verify actuator sizing integration did not break helper behavior**

Run: `pnpm test src/tests/calculator/debounced-url-state.test.ts`
Expected: PASS

### Task 3: Use shared debounced writer in Stewart platform calculator

**Files:**
- Modify: `src/components/calculator/stewart-platform/index.svelte`
- Read: `src/components/calculator/shared/debounced-url-state.ts`
- Test: `src/tests/calculator/debounced-url-state.test.ts`

- [ ] **Step 1: Run existing test slice before component edit**

Run: `pnpm test src/tests/calculator/debounced-url-state.test.ts src/tests/stewart-platform/responsive-layout.test.ts src/tests/stewart-platform/clamping.test.ts`
Expected: PASS

- [ ] **Step 2: Write minimal implementation**

Add helper import and local writer in `src/components/calculator/stewart-platform/index.svelte`:

```ts
import { createDebouncedUrlStateWriter } from '../shared/debounced-url-state';

const URL_STATE_DEBOUNCE_MS = 300;
const debouncedUrlStateWriter = createDebouncedUrlStateWriter(URL_STATE_DEBOUNCE_MS);
```

Update mount teardown:

```ts
onMount(() => {
  const encoded = new URLSearchParams(window.location.search).get(STATE_KEY);

  if (encoded) {
    const state = decodeQueryState<StewartPlatformQueryState>(encoded);

    if (state) {
      applyQueryState(state);
    }
  }

  syncViewportState(window.innerWidth, true);

  const handleResize = () => syncViewportState(window.innerWidth);
  window.addEventListener('resize', handleResize);

  mounted = true;

  return () => {
    window.removeEventListener('resize', handleResize);
    debouncedUrlStateWriter.cancel();
  };
});
```

Replace direct write inside reactive effect:

```ts
$effect(() => {
  if (!mounted || typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.set(
    STATE_KEY,
    encodeQueryState({
      baseDiameter,
      platformDiameter,
      alphaP,
      alphaB,
      cor,
      actuatorMin,
      actuatorMax,
      platformRotation,
      platformTranslation,
    })
  );

  debouncedUrlStateWriter.schedule(url.toString());
});
```

- [ ] **Step 3: Run tests to verify Stewart integration and existing helper slices stay green**

Run: `pnpm test src/tests/calculator/debounced-url-state.test.ts src/tests/stewart-platform/responsive-layout.test.ts src/tests/stewart-platform/clamping.test.ts`
Expected: PASS

### Task 4: Verify full calculator behavior

**Files:**
- Verify: `src/components/calculator/actuator-sizing/index.svelte`
- Verify: `src/components/calculator/stewart-platform/index.svelte`
- Verify: `src/components/calculator/shared/debounced-url-state.ts`

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: `astro check` passes and production build succeeds

- [ ] **Step 3: Manually verify debounce behavior**

Run: `pnpm dev`

Verify in browser:

```text
- Drag actuator sizing sliders rapidly: URL should not update every frame.
- Pause for ~300ms: URL should update to latest actuator sizing state.
- Drag Stewart controls rapidly: URL should not update every frame.
- Pause for ~300ms: URL should update to latest Stewart state.
- Reload either calculator after URL settles: same state should restore correctly.
```

## Self-Review

- Spec coverage: shared helper, both calculators, cleanup, `300ms`, and unchanged query format all mapped to Tasks 1-4.
- Placeholder scan: all files, commands, and code targets are explicit.
- Type consistency: `createDebouncedUrlStateWriter`, `schedule`, and `cancel` names stay consistent across tasks.
