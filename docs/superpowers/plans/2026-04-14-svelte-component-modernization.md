# Svelte Component Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the existing Svelte components to idiomatic Svelte 5 rune conventions while keeping current
calculator behavior, rendering, and URL persistence intact.

**Architecture:** Keep domain math in existing TypeScript modules and migrate component internals in place. Extract only
small pure helpers where they make rune-based state management testable, then convert component props, local state,
derived values, and side effects to `$props`, `$state`, `$derived`, and `$effect` with behavior-preserving render tests
and build verification.

**Tech Stack:** Astro 6, Svelte 5, Threlte, TypeScript, Vitest

---

## File Structure

- Modify: `src/components/calculator/actuator-sizing/index.svelte` - migrate local state, derived calculations, popup
  state, and URL sync to runes
- Modify: `src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte` - migrate prop handling to `$props()`
- Modify: `src/components/calculator/stewart-platform/index.svelte` - migrate parameter state, derived geometry,
  clamping, and URL sync to runes
- Modify: `src/components/calculator/stewart-platform/Scene.svelte` - migrate props and internal derived scene geometry
  to runes
- Modify: `src/components/calculator/stewart-platform/Leg.svelte` - migrate props and local derived geometry to runes
- Modify: `src/components/calculator/stewart-platform/Platform.svelte` - migrate props and geometry creation to runes
- Modify: `src/components/calculator/stewart-platform/Joint.svelte` - migrate props to `$props()`
- Modify: `src/components/util/CookiePreferencesLink.svelte` - migrate props, modernize event syntax, remove stray
  `debugger`
- Create: `src/components/calculator/shared/query-state.ts` - pure base64 query-state encode/decode helpers shared by
  calculator entry components
- Create: `src/components/calculator/stewart-platform/state.ts` - pure clamp helpers for movement bounds used by the
  Stewart platform entry component
- Create: `src/tests/svelte/query-state.test.ts` - focused tests for shared URL-state helpers
- Create: `src/tests/stewart-platform/state.test.ts` - focused tests for movement-clamp helpers
- Create: `src/tests/svelte/component-modernization-render.test.ts` - SSR render smoke tests for migrated Svelte
  components

---

### Task 1: Add failing tests for shared query-state helpers

**Files:**

- Create: `src/tests/svelte/query-state.test.ts`
- Create: `src/components/calculator/shared/query-state.ts`
- Test: `src/tests/svelte/query-state.test.ts`

- [ ] **Step 1: Write failing tests for encode/decode and invalid input**

```ts
import { describe, expect, it } from 'vitest';

import { decodeQueryState, encodeQueryState } from '../../components/calculator/shared/query-state';

describe('query-state helpers', () => {
  it('round-trips calculator state through base64 json encoding', () => {
    const state = {
      strokeLength: 100,
      maxVelocity: 300,
      systemType: 'stewart',
      autoGearRatio: true,
    };

    expect(decodeQueryState(encodeQueryState(state))).toEqual(state);
  });

  it('returns null for invalid encoded payloads', () => {
    expect(decodeQueryState('%%%not-base64%%%')).toBeNull();
  });

  it('returns null for valid base64 with invalid json', () => {
    expect(decodeQueryState('bm90LWpzb24=')).toBeNull();
  });
});
```

- [ ] **Step 2: Run focused test to verify RED**

Run: `pnpm test src/tests/svelte/query-state.test.ts`

Expected: FAIL because `src/components/calculator/shared/query-state.ts` does not exist yet

- [ ] **Step 3: Implement the shared query-state helper**

```ts
export function encodeQueryState(state: Record<string, unknown>) {
  return btoa(JSON.stringify(state));
}

export function decodeQueryState(encoded: string): Record<string, unknown> | null {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Re-run focused test to verify GREEN**

Run: `pnpm test src/tests/svelte/query-state.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator/shared/query-state.ts src/tests/svelte/query-state.test.ts
git commit -m "test(svelte): add query state helper coverage"
```

### Task 2: Add failing tests for Stewart platform movement clamping helpers

**Files:**

- Create: `src/tests/stewart-platform/state.test.ts`
- Create: `src/components/calculator/stewart-platform/state.ts`
- Test: `src/tests/stewart-platform/state.test.ts`

- [ ] **Step 1: Write failing tests for bounded movement clamping**

```ts
import { describe, expect, it } from 'vitest';

import { clampPlatformMovement } from '../../components/calculator/stewart-platform/state';

describe('clampPlatformMovement', () => {
  it('clamps rotation and translation to current platform constraints', () => {
    expect(
      clampPlatformMovement(
        { x: 12, y: -14, z: 22 },
        { x: 0.08, y: -0.09, z: 0.12 },
        {
          pitch: 10,
          roll: 8,
          yaw: 15,
          transX: 0.04,
          transY: 0.05,
          transZUp: 0.03,
          transZDown: 0.02,
        }
      )
    ).toEqual({
      rotation: { x: 10, y: -8, z: 15 },
      translation: { x: 0.04, y: -0.05, z: 0.03 },
    });
  });

  it('preserves values already inside bounds', () => {
    expect(
      clampPlatformMovement(
        { x: 2, y: -3, z: 4 },
        { x: 0.01, y: -0.02, z: 0.01 },
        {
          pitch: 10,
          roll: 8,
          yaw: 15,
          transX: 0.04,
          transY: 0.05,
          transZUp: 0.03,
          transZDown: 0.02,
        }
      )
    ).toEqual({
      rotation: { x: 2, y: -3, z: 4 },
      translation: { x: 0.01, y: -0.02, z: 0.01 },
    });
  });
});
```

- [ ] **Step 2: Run focused test to verify RED**

Run: `pnpm test src/tests/stewart-platform/state.test.ts`

Expected: FAIL because `src/components/calculator/stewart-platform/state.ts` does not exist yet

- [ ] **Step 3: Implement the clamp helper**

```ts
type Rotation = { x: number; y: number; z: number };
type Translation = { x: number; y: number; z: number };

type PlatformSpec = {
  pitch: number;
  roll: number;
  yaw: number;
  transX: number;
  transY: number;
  transZUp: number;
  transZDown: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function clampPlatformMovement(rotation: Rotation, translation: Translation, spec: PlatformSpec) {
  return {
    rotation: {
      x: clamp(rotation.x, -spec.pitch, spec.pitch),
      y: clamp(rotation.y, -spec.roll, spec.roll),
      z: clamp(rotation.z, -spec.yaw, spec.yaw),
    },
    translation: {
      x: clamp(translation.x, -spec.transX, spec.transX),
      y: clamp(translation.y, -spec.transY, spec.transY),
      z: clamp(translation.z, -spec.transZDown, spec.transZUp),
    },
  };
}
```

- [ ] **Step 4: Re-run focused test to verify GREEN**

Run: `pnpm test src/tests/stewart-platform/state.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator/stewart-platform/state.ts src/tests/stewart-platform/state.test.ts
git commit -m "test(stewart): add movement clamp helper"
```

### Task 3: Add failing SSR render tests for migrated component APIs

**Files:**

- Create: `src/tests/svelte/component-modernization-render.test.ts`
- Modify: `src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte`
- Modify: `src/components/calculator/stewart-platform/index.svelte`
- Modify: `src/components/util/CookiePreferencesLink.svelte`
- Test: `src/tests/svelte/component-modernization-render.test.ts`

- [ ] **Step 1: Write failing SSR render tests that lock current output shape**

```ts
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import MotionProfileDiagram from '../../components/calculator/actuator-sizing/MotionProfileDiagram.svelte';
import StewartPlatformCalculator from '../../components/calculator/stewart-platform/index.svelte';
import CookiePreferencesLink from '../../components/util/CookiePreferencesLink.svelte';
import { buildMotionProfileDiagram } from '../../components/calculator/actuator-sizing/motion-profile-diagram';

const renderComponent = render as (component: any, options?: any) => { body: string };

describe('modernized Svelte components', () => {
  it('renders the motion profile diagram with the svg accessibility label', () => {
    const { body } = renderComponent(MotionProfileDiagram, {
      props: {
        diagram: buildMotionProfileDiagram({
          t_accel_s: 0.2,
          t_const_s: 0.6,
          t_decel_s: 0.2,
          dwellTime_s: 0.5,
        }),
      },
    });

    expect(body).toContain('aria-label="Phase timing diagram"');
  });

  it('renders the Stewart platform calculator shell', () => {
    const { body } = renderComponent(StewartPlatformCalculator);

    expect(body).toContain('Platform');
    expect(body).toContain('Constraints');
  });

  it('renders the cookie preferences trigger label', () => {
    const { body } = renderComponent(CookiePreferencesLink, { props: { label: 'Cookie settings' } });

    expect(body).toContain('Cookie settings');
    expect(body).toContain('<button');
  });
});
```

- [ ] **Step 2: Run focused test to verify current baseline passes before migration**

Run: `pnpm test src/tests/svelte/component-modernization-render.test.ts`

Expected: PASS

- [ ] **Step 3: Migrate the simple prop-only components to `$props()`**

```svelte
<script lang="ts">
  import type { MotionProfileDiagramData, MotionProfileSegment } from './motion-profile-diagram';

  const { diagram }: { diagram: MotionProfileDiagramData } = $props();

  const width = 320;
  const chartHeight = 72;
  const labelY = 14;
  const totalHeight = chartHeight;

  const labels: Record<MotionProfileSegment['kind'], string> = {
    accel: 'Accel',
    const: 'Const',
    decel: 'Decel',
    dwell: 'Dwell',
  };
```

```svelte
<script lang="ts">
  import * as CookieConsent from 'vanilla-cookieconsent';

  const { label = '' }: { label?: string } = $props();

  function showCookiePreferences(event: MouseEvent) {
    event.preventDefault();
    CookieConsent.showPreferences();
  }
</script>

<button type="button" onclick={showCookiePreferences}>{label}</button>
```

- [ ] **Step 4: Re-run focused render test to verify GREEN remains intact**

Run: `pnpm test src/tests/svelte/component-modernization-render.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte src/components/util/CookiePreferencesLink.svelte src/tests/svelte/component-modernization-render.test.ts
git commit -m "refactor(svelte): modernize simple component props"
```

### Task 4: Modernize Stewart platform leaf components and entry component

**Files:**

- Modify: `src/components/calculator/stewart-platform/index.svelte`
- Modify: `src/components/calculator/stewart-platform/Scene.svelte`
- Modify: `src/components/calculator/stewart-platform/Leg.svelte`
- Modify: `src/components/calculator/stewart-platform/Platform.svelte`
- Modify: `src/components/calculator/stewart-platform/Joint.svelte`
- Modify: `src/components/calculator/shared/query-state.ts`
- Modify: `src/components/calculator/stewart-platform/state.ts`
- Test: `src/tests/stewart-platform/state.test.ts`
- Test: `src/tests/svelte/component-modernization-render.test.ts`

- [ ] **Step 1: Convert leaf props to `$props()` and local reactive values to runes**

```svelte
<script lang="ts">
  import { BufferGeometry, Vector3 } from 'three';

  const { points = [], color = 'green' }: { points?: Vector3[]; color?: string } = $props();

  const geometry = $derived(new BufferGeometry().setFromPoints(points).setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5]));
</script>
```

```svelte
<script lang="ts">
  import type { Vector3 } from 'three';

  const { position, scale = 0.01, color = 'red' }: { position: Vector3; scale?: number; color?: string } = $props();
</script>
```

- [ ] **Step 2: Replace the Stewart entry component's `export`/`$:` flow with explicit rune state and effects**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { Matrix3, Vector3 } from 'three';
  import { decodeQueryState, encodeQueryState } from '../shared/query-state';
  import { clampPlatformMovement } from './state';

  const STATE_KEY = 'sps';

  let baseDiameter = $state(DEFAULTS.baseDiameter);
  let platformDiameter = $state(DEFAULTS.platformDiameter);
  let alphaP = $state(DEFAULTS.alphaP);
  let alphaB = $state(DEFAULTS.alphaB);
  let cor = $state({ ...DEFAULTS.cor });
  let actuatorMin = $state(DEFAULTS.actuatorMin);
  let actuatorMax = $state(DEFAULTS.actuatorMax);
  let platformRotation = $state({ ...DEFAULTS.platformRotation });
  let platformTranslation = $state({ ...DEFAULTS.platformTranslation });
  let initialized = $state(false);

  const alphaBGeom = $derived(360 / 3 - alphaB);
  const centerOfRotationRelative = $derived(new Vector3(cor.x, cor.y, cor.z));

  onMount(() => {
    const encoded = new URLSearchParams(window.location.search).get(STATE_KEY);
    const state = encoded ? decodeQueryState(encoded) : null;
    if (state) {
      baseDiameter = (state.baseDiameter as number) ?? DEFAULTS.baseDiameter;
      platformDiameter = (state.platformDiameter as number) ?? DEFAULTS.platformDiameter;
      alphaP = (state.alphaP as number) ?? DEFAULTS.alphaP;
      alphaB = (state.alphaB as number) ?? DEFAULTS.alphaB;
      cor = (state.cor as typeof DEFAULTS.cor) ?? { ...DEFAULTS.cor };
      actuatorMin = (state.actuatorMin as number) ?? DEFAULTS.actuatorMin;
      actuatorMax = (state.actuatorMax as number) ?? DEFAULTS.actuatorMax;
      platformRotation = (state.platformRotation as typeof DEFAULTS.platformRotation) ?? { ...DEFAULTS.platformRotation };
      platformTranslation = (state.platformTranslation as typeof DEFAULTS.platformTranslation) ?? {
        ...DEFAULTS.platformTranslation,
      };
    }
    initialized = true;
  });

  $effect(() => {
    if (!initialized || typeof window === 'undefined') return;

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
    window.history.replaceState({}, '', url.toString());
  });
```

- [ ] **Step 3: Move Stewart clamping into one explicit effect using the tested helper**

```svelte
  $effect(() => {
    const clamped = clampPlatformMovement(platformRotation, platformTranslation, platformSpec);
    platformRotation = clamped.rotation;
    platformTranslation = clamped.translation;
  });
```

- [ ] **Step 4: Modernize template event syntax in touched Stewart files**

```svelte
<Button onclick={resetParams} label="Reset Params" title="Reset" />
<Button onclick={resetActuator} label="Reset Actuator" title="Reset" />
<Button onclick={resetPlatform} label="Reset Platform" title="Reset" />
```

- [ ] **Step 5: Run focused tests to verify GREEN**

Run: `pnpm test src/tests/stewart-platform/state.test.ts src/tests/svelte/component-modernization-render.test.ts`

Expected: PASS

- [ ] **Step 6: Run build to catch Svelte and Threlte migration errors early**

Run: `pnpm build`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/calculator/shared/query-state.ts src/components/calculator/stewart-platform/state.ts src/components/calculator/stewart-platform/index.svelte src/components/calculator/stewart-platform/Scene.svelte src/components/calculator/stewart-platform/Leg.svelte src/components/calculator/stewart-platform/Platform.svelte src/components/calculator/stewart-platform/Joint.svelte src/tests/stewart-platform/state.test.ts src/tests/svelte/component-modernization-render.test.ts
git commit -m "refactor(stewart): migrate calculator to runes"
```

### Task 5: Modernize actuator sizing entry component to runes

**Files:**

- Modify: `src/components/calculator/actuator-sizing/index.svelte`
- Modify: `src/components/calculator/shared/query-state.ts`
- Test: `src/tests/actuator-sizing/motion-profile-diagram-render.test.ts`
- Test: `src/tests/svelte/query-state.test.ts`

- [ ] **Step 1: Add a focused render assertion that the calculator still renders table and diagram landmarks**

```ts
it('renders the actuator sizing calculator table and settings panes', () => {
  const { body } = renderComponent(ActuatorSizingCalculator);

  expect(body).toContain('aria-label="Phase timing diagram"');
  expect(body).toContain('Peak Tq');
  expect(body).toContain('Motion Profile');
  expect(body).toContain('Calculated');
});
```

- [ ] **Step 2: Run focused actuator sizing render test to verify GREEN baseline before refactor**

Run: `pnpm test src/tests/actuator-sizing/motion-profile-diagram-render.test.ts`

Expected: PASS

- [ ] **Step 3: Convert mutable UI values to `$state` and pure calculations to `$derived`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { decodeQueryState, encodeQueryState } from '../shared/query-state';

  let strokeLength = $state(initialValue('strokeLength', DEFAULTS.strokeLength));
  let maxVelocity = $state(initialValue('maxVelocity', DEFAULTS.maxVelocity));
  let acceleration = $state(initialValue('acceleration', DEFAULTS.acceleration));
  let deceleration = $state(initialValue('deceleration', DEFAULTS.deceleration));
  let dwellTime = $state(initialValue('dwellTime', DEFAULTS.dwellTime));
  let systemType = $state(initialValue<SystemType>('systemType', DEFAULTS.systemType));
  let actuatorAngle = $state(initialValue('actuatorAngle', DEFAULTS.actuatorAngle));
  let totalMass = $state(initialValue('totalMass', DEFAULTS.totalMass));
  let imbalanceFactor = $state(initialValue('imbalanceFactor', DEFAULTS.imbalanceFactor));
  let frictionForce = $state(initialValue('frictionForce', DEFAULTS.frictionForce));
  let ballscrewKey = $state(initialValue('ballscrewKey', DEFAULTS.ballscrewKey));
  let customPitch = $state(initialValue('customPitch', DEFAULTS.customPitch));
  let customDiameter = $state(initialValue('customDiameter', DEFAULTS.customDiameter));
  let screwLength = $state(initialValue('screwLength', DEFAULTS.screwLength));
  let screwEfficiency = $state(initialValue('screwEfficiency', DEFAULTS.screwEfficiency));
  let autoGearRatio = $state(initialValue('autoGearRatio', DEFAULTS.autoGearRatio));
  let gearRatio = $state(initialValue('gearRatio', DEFAULTS.gearRatio));
  let gearEfficiency = $state(initialValue('gearEfficiency', DEFAULTS.gearEfficiency));
  let gearInertia = $state(initialValue('gearInertia', DEFAULTS.gearInertia));
  let safetyFactor = $state(initialValue('safetyFactor', DEFAULTS.safetyFactor));
  let holdingRequired = $state(initialValue('holdingRequired', DEFAULTS.holdingRequired));
  let advancedMode = $state(initialValue('advancedMode', DEFAULTS.advancedMode));

  const lead_mm = $derived(
    ballscrewKey === 'custom' ? customPitch : (BALLSCREW_PITCHES[ballscrewKey] ?? DEFAULTS.customPitch)
  );
  const screwDiameter_mm = $derived(
    ballscrewKey === 'custom' ? customDiameter : (BALLSCREW_DIAMETERS[ballscrewKey] ?? DEFAULTS.customDiameter)
  );
  const profile = $derived(
    computeTrapezoidalProfile(strokeLength / 1000, maxVelocity / 1000, acceleration / 1000, deceleration / 1000)
  );
  const profileDiagram = $derived(
    buildMotionProfileDiagram({
      t_accel_s: profile.t_accel_s,
      t_const_s: profile.t_const_s,
      t_decel_s: profile.t_decel_s,
      dwellTime_s: dwellTime,
    })
  );
```

- [ ] **Step 4: Replace broad reactive side effects with focused `$effect` blocks**

```svelte
  $effect(() => {
    if (!advancedMode) {
      frictionForce = DEFAULTS.frictionForce;
      imbalanceFactor = DEFAULTS.imbalanceFactor;
      screwEfficiency = DEFAULTS.screwEfficiency;
      gearEfficiency = DEFAULTS.gearEfficiency;
      gearInertia = DEFAULTS.gearInertia;
    }
  });

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
    window.history.replaceState({}, '', url.toString());
  });
```

- [ ] **Step 5: Modernize event attributes in touched markup**

```svelte
<button type="button" onclick={() => onSortHeaderClick('status')}>...</button>
<tr onmouseenter={(event) => onRowEnter(event, result)} onmousemove={updatePopupPos} onmouseleave={onRowLeave}>
  ...
</tr>
<Button onclick={resetMotionProfile} label="Reset" title="Reset" />
```

- [ ] **Step 6: Run focused tests to verify GREEN**

Run: `pnpm test src/tests/actuator-sizing/motion-profile-diagram-render.test.ts src/tests/svelte/query-state.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/calculator/actuator-sizing/index.svelte src/components/calculator/shared/query-state.ts src/tests/actuator-sizing/motion-profile-diagram-render.test.ts src/tests/svelte/query-state.test.ts
git commit -m "refactor(actuator): migrate calculator to runes"
```

### Task 6: Final verification and scope review

**Files:**

- Verify only: `src/components/calculator/actuator-sizing/index.svelte`
- Verify only: `src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte`
- Verify only: `src/components/calculator/stewart-platform/index.svelte`
- Verify only: `src/components/calculator/stewart-platform/Scene.svelte`
- Verify only: `src/components/calculator/stewart-platform/Leg.svelte`
- Verify only: `src/components/calculator/stewart-platform/Platform.svelte`
- Verify only: `src/components/calculator/stewart-platform/Joint.svelte`
- Verify only: `src/components/util/CookiePreferencesLink.svelte`
- Verify only: `src/components/calculator/shared/query-state.ts`
- Verify only: `src/components/calculator/stewart-platform/state.ts`
- Verify only: `src/tests/svelte/query-state.test.ts`
- Verify only: `src/tests/stewart-platform/state.test.ts`
- Verify only: `src/tests/svelte/component-modernization-render.test.ts`
- Verify only: `src/tests/actuator-sizing/motion-profile-diagram-render.test.ts`

- [ ] **Step 1: Run targeted modernization tests together**

Run:
`pnpm test src/tests/svelte/query-state.test.ts src/tests/stewart-platform/state.test.ts src/tests/svelte/component-modernization-render.test.ts src/tests/actuator-sizing/motion-profile-diagram-render.test.ts`

Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`

Expected: PASS

- [ ] **Step 3: Run production build**

Run: `pnpm build`

Expected: PASS with both `astro check` and `astro build` succeeding

- [ ] **Step 4: Inspect diff for scope sanity**

Run:
`git diff -- docs/superpowers/specs/2026-04-14-svelte-component-modernization-design.md docs/superpowers/plans/2026-04-14-svelte-component-modernization.md src/components/calculator/actuator-sizing/index.svelte src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte src/components/calculator/stewart-platform/index.svelte src/components/calculator/stewart-platform/Scene.svelte src/components/calculator/stewart-platform/Leg.svelte src/components/calculator/stewart-platform/Platform.svelte src/components/calculator/stewart-platform/Joint.svelte src/components/util/CookiePreferencesLink.svelte src/components/calculator/shared/query-state.ts src/components/calculator/stewart-platform/state.ts src/tests/svelte/query-state.test.ts src/tests/stewart-platform/state.test.ts src/tests/svelte/component-modernization-render.test.ts src/tests/actuator-sizing/motion-profile-diagram-render.test.ts`

Expected: Only planned Svelte modernization files, helper files, tests, spec, and plan changed
