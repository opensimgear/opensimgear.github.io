# Actuator Sizing Velocity-Only Motion Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the actuator sizing motion-profile visualization to a single velocity waveform with phase dividers
and labels, removing the position plot and all chart header text.

**Architecture:** Keep the existing parent-driven integration in
`src/components/calculator/actuator-sizing/index.svelte`, but slim the shared geometry helper down to velocity-only data
and make the presentational component render just one SVG plot. Update both geometry and SSR render tests first so the
UI reduction is proven through TDD instead of by manual inspection.

**Tech Stack:** Svelte 5, Astro, Vitest, SVG.

---

## File Structure

- Modify: `src/components/calculator/actuator-sizing/motion-profile-diagram.ts` - remove position-path output and keep
  only velocity geometry plus label metadata
- Modify: `src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte` - reduce the presentational component
  to a single chart with no header or axis text
- Modify: `src/components/calculator/actuator-sizing/index.svelte` - stop passing the removed profile-label prop while
  keeping the diagram embedded in the `Calculated` pane
- Modify: `src/tests/actuator-sizing/motion-profile-diagram.test.ts` - update helper expectations to velocity-only
  output
- Modify: `src/tests/actuator-sizing/motion-profile-diagram-render.test.ts` - update render expectations to match the
  stripped-down component and calculator integration

---

### Task 1: Remove position-path output from the geometry helper

**Files:**

- Modify: `src/components/calculator/actuator-sizing/motion-profile-diagram.ts`
- Modify: `src/tests/actuator-sizing/motion-profile-diagram.test.ts`

- [ ] **Step 1: Write the failing test**

Update `src/tests/actuator-sizing/motion-profile-diagram.test.ts` so the helper tests stop asserting `positionPath` and
instead assert that the helper no longer exposes it:

```ts
describe('buildMotionProfileDiagram', () => {
  it('returns velocity-only geometry for a trapezoidal profile', () => {
    const diagram = buildMotionProfileDiagram({
      strokeLength_mm: 500,
      t_accel_s: 0.2,
      t_const_s: 0.6,
      t_decel_s: 0.2,
      v_peak_mm_s: 625,
      dwellTime_s: 0.5,
      isTriangular: false,
    });

    expect(diagram).not.toHaveProperty('positionPath');
    expect(diagram.phaseBoundaries).toEqual({
      accelEnd: 0.13333333333333333,
      constEnd: 0.5333333333333333,
      decelEnd: 0.6666666666666666,
      dwellEnd: 1,
    });
    expect(diagram.velocityPath).toBe('M 0 1 L 0.133333 0 L 0.533333 0 L 0.666667 1 L 1 1');
    expect(diagram.segments.map((segment) => segment.kind)).toEqual(['accel', 'const', 'decel', 'dwell']);
  });

  it('collapses the constant segment for triangular motion', () => {
    const diagram = buildMotionProfileDiagram({
      strokeLength_mm: 500,
      t_accel_s: 0.2,
      t_const_s: 0,
      t_decel_s: 0.2,
      v_peak_mm_s: 625,
      dwellTime_s: 0.5,
      isTriangular: true,
    });

    expect(diagram).not.toHaveProperty('positionPath');
    expect(diagram.velocityPath).toBe('M 0 1 L 0.222222 0 L 0.444444 1 L 1 1');
    expect(diagram.segments.map((segment) => segment.kind)).toEqual(['accel', 'decel', 'dwell']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/tests/actuator-sizing/motion-profile-diagram.test.ts`

Expected: `FAIL` because `buildMotionProfileDiagram()` still returns `positionPath`.

- [ ] **Step 3: Write minimal implementation**

Update `src/components/calculator/actuator-sizing/motion-profile-diagram.ts` to remove `positionPath` from the public
type and returned object, and delete the now-unused position helper code:

```ts
export interface MotionProfileDiagramData {
  phaseBoundaries: {
    accelEnd: number;
    constEnd: number;
    decelEnd: number;
    dwellEnd: number;
  };
  segments: MotionProfileSegment[];
  labelVisibility: {
    accel: boolean;
    const: boolean;
    decel: boolean;
    dwell: boolean;
  };
  velocityPath: string;
}

function fmt(value: number): string {
  return value
    .toFixed(6)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

function isWideEnough(start: number, end: number): boolean {
  return end - start >= 0.12;
}

export function buildMotionProfileDiagram(input: MotionProfileDiagramInput): MotionProfileDiagramData {
  if (input.t_accel_s <= 0 || input.t_decel_s <= 0) {
    throw new Error('Motion-profile diagram requires positive accel and decel durations.');
  }

  const motionTime_s = input.t_accel_s + input.t_const_s + input.t_decel_s;
  const totalTime_s = motionTime_s + input.dwellTime_s;
  const safeTotal = totalTime_s || 1;
  const hasConstPhase = input.t_const_s > 0 && !input.isTriangular;
  const hasDwell = input.dwellTime_s > 0;

  const accelEnd = input.t_accel_s / safeTotal;
  const constEnd = (input.t_accel_s + input.t_const_s) / safeTotal;
  const decelEnd = motionTime_s / safeTotal;
  const dwellEnd = 1;

  const segments: MotionProfileSegment[] = [{ kind: 'accel', start: 0, end: accelEnd }];

  if (hasConstPhase) {
    segments.push({ kind: 'const', start: accelEnd, end: constEnd });
  }

  segments.push({ kind: 'decel', start: hasConstPhase ? constEnd : accelEnd, end: decelEnd });

  if (hasDwell) {
    segments.push({ kind: 'dwell', start: decelEnd, end: dwellEnd });
  }

  const velocityPoints: Array<[number, number]> = [
    [0, 1],
    [accelEnd, 0],
    [decelEnd, 1],
  ];

  if (hasConstPhase) {
    velocityPoints.splice(2, 0, [constEnd, 0]);
  }

  if (hasDwell) {
    velocityPoints.push([1, 1]);
  }

  return {
    phaseBoundaries: { accelEnd, constEnd, decelEnd, dwellEnd },
    segments,
    labelVisibility: {
      accel: isWideEnough(0, accelEnd),
      const: hasConstPhase && isWideEnough(accelEnd, constEnd),
      decel: isWideEnough(hasConstPhase ? constEnd : accelEnd, decelEnd),
      dwell: hasDwell && isWideEnough(decelEnd, 1),
    },
    velocityPath: velocityPoints.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${fmt(x)} ${fmt(y)}`).join(' '),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/tests/actuator-sizing/motion-profile-diagram.test.ts`

Expected: `PASS` for the velocity-only helper tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator/actuator-sizing/motion-profile-diagram.ts src/tests/actuator-sizing/motion-profile-diagram.test.ts
git commit -m "refactor(actuator-sizing): simplify motion geometry"
```

---

### Task 2: Reduce the Svelte component to a single velocity waveform

**Files:**

- Modify: `src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte`
- Modify: `src/tests/actuator-sizing/motion-profile-diagram-render.test.ts`

- [ ] **Step 1: Write the failing test**

Update `src/tests/actuator-sizing/motion-profile-diagram-render.test.ts` so it verifies the stripped-down component
contract:

```ts
describe('MotionProfileDiagram', () => {
  it('renders only the waveform and allowed phase labels', () => {
    const baseDiagram = buildMotionProfileDiagram({
      strokeLength_mm: 500,
      t_accel_s: 0.2,
      t_const_s: 0.6,
      t_decel_s: 0.2,
      v_peak_mm_s: 625,
      dwellTime_s: 0.5,
      isTriangular: false,
    });

    const { body } = renderComponent(MotionProfileDiagram, {
      props: {
        diagram: {
          ...baseDiagram,
          labelVisibility: {
            accel: true,
            const: false,
            decel: true,
            dwell: false,
          },
        },
      },
    });

    expect(body).toContain('aria-label="Motion profile diagram"');
    expect(body).toContain('Accel');
    expect(body).toContain('Decel');
    expect(body).not.toContain('Motion Profile');
    expect(body).not.toContain('Trapezoidal');
    expect(body).not.toContain('Triangular');
    expect(body).not.toContain('Velocity');
    expect(body).not.toContain('Position');
    expect(body).not.toContain('Const');
    expect(body).not.toContain('Dwell');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/tests/actuator-sizing/motion-profile-diagram-render.test.ts`

Expected: `FAIL` because the component still renders header text, axis labels, and expects a `profileLabel` prop.

- [ ] **Step 3: Write minimal implementation**

Update `src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte` to remove the header row and lower chart
entirely:

```svelte
<script lang="ts">
  import type { MotionProfileDiagramData, MotionProfileSegment } from './motion-profile-diagram';

  export let diagram: MotionProfileDiagramData;

  const width = 320;
  const chartHeight = 72;
  const labelY = 14;

  const labels: Record<MotionProfileSegment['kind'], string> = {
    accel: 'Accel',
    const: 'Const',
    decel: 'Decel',
    dwell: 'Dwell',
  };

  function toX(value: number): number {
    return value * width;
  }

  function labelCenter(start: number, end: number): number {
    return toX((start + end) / 2);
  }

  function showLabel(segment: MotionProfileSegment): boolean {
    return diagram.labelVisibility[segment.kind];
  }
</script>

<div class="motion-profile-card">
  <svg viewBox={`0 0 ${width} ${chartHeight}`} class="motion-profile-svg" aria-label="Motion profile diagram" role="img">
    {#each diagram.segments as segment}
      <line class="phase-boundary" x1={toX(segment.end)} y1="0" x2={toX(segment.end)} y2={chartHeight} />
      {#if showLabel(segment)}
        <text x={labelCenter(segment.start, segment.end)} y={labelY} text-anchor="middle" class="segment-label">
          {labels[segment.kind]}
        </text>
      {/if}
    {/each}

    <path d={diagram.velocityPath} transform={`scale(${width}, ${chartHeight})`} class="trace" />
  </svg>
</div>

<style>
  .motion-profile-card {
    border: 1px solid rgb(0 0 0 / 0.12);
    background: linear-gradient(180deg, rgb(255 255 255) 0%, rgb(245 245 245) 100%);
    padding: 0.75rem;
  }

  .motion-profile-svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    color: rgb(38 38 38);
  }

  .trace {
    fill: none;
    stroke: currentColor;
    stroke-width: 0.012;
  }

  .segment-label {
    fill: rgb(115 115 115);
    font-size: 9px;
  }

  .phase-boundary {
    stroke: rgb(212 212 212);
    stroke-dasharray: 3 3;
  }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/tests/actuator-sizing/motion-profile-diagram-render.test.ts`

Expected: `PASS` for the stripped-down component render contract.

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte src/tests/actuator-sizing/motion-profile-diagram-render.test.ts
git commit -m "refactor(actuator-sizing): streamline motion diagram"
```

---

### Task 3: Simplify calculator integration and run verification

**Files:**

- Modify: `src/components/calculator/actuator-sizing/index.svelte`
- Modify: `src/tests/actuator-sizing/motion-profile-diagram-render.test.ts`

- [ ] **Step 1: Write the failing test**

Update the calculator integration assertion in `src/tests/actuator-sizing/motion-profile-diagram-render.test.ts` so it
proves the integrated calculator no longer emits the removed text:

```ts
it('renders the actuator sizing calculator with the integrated velocity-only diagram', () => {
  const { body } = renderComponent(ActuatorSizingCalculator);

  expect(body).toContain('aria-label="Motion profile diagram"');
  expect(body).not.toContain('Motion Profile');
  expect(body).not.toContain('Trapezoidal');
  expect(body).not.toContain('Triangular');
  expect(body).not.toContain('Velocity');
  expect(body).not.toContain('Position');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/tests/actuator-sizing/motion-profile-diagram-render.test.ts`

Expected: `FAIL` because `index.svelte` still passes `profileLabel` and the old component contract still appears in the
rendered calculator output.

- [ ] **Step 3: Write minimal implementation**

Update `src/components/calculator/actuator-sizing/index.svelte` so it stops computing and passing the removed label
prop:

```svelte
<script lang="ts">
  import MotionProfileDiagram from './MotionProfileDiagram.svelte';
  import { buildMotionProfileDiagram } from './motion-profile-diagram';
  // existing imports unchanged

  $: profile = computeTrapezoidalProfile(strokeLength / 1000, maxVelocity / 1000, acceleration / 1000, deceleration / 1000);
  $: profileDiagram = buildMotionProfileDiagram({
    strokeLength_mm: strokeLength,
    t_accel_s: profile.t_accel_s,
    t_const_s: profile.t_const_s,
    t_decel_s: profile.t_decel_s,
    v_peak_mm_s: profile.v_peak_m_s * 1000,
    dwellTime_s: dwellTime,
    isTriangular: profile.isTriangular,
  });
</script>

<Pane title="Calculated" position="inline">
  <!-- existing monitors -->

  <div class="motion-profile-diagram-wrap">
    <MotionProfileDiagram diagram={profileDiagram} />
  </div>
</Pane>
```

- [ ] **Step 4: Run verification to confirm the simplification works**

Run these commands:

```bash
pnpm test src/tests/actuator-sizing/motion-profile-diagram.test.ts src/tests/actuator-sizing/motion-profile-diagram-render.test.ts
pnpm build
```

Expected:

- `pnpm test src/tests/actuator-sizing/motion-profile-diagram.test.ts src/tests/actuator-sizing/motion-profile-diagram-render.test.ts`
  -> `PASS`
- `pnpm build` -> `astro check` succeeds and the production build completes successfully

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator/actuator-sizing/index.svelte src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte src/components/calculator/actuator-sizing/motion-profile-diagram.ts src/tests/actuator-sizing/motion-profile-diagram.test.ts src/tests/actuator-sizing/motion-profile-diagram-render.test.ts
git commit -m "refactor(actuator-sizing): use velocity-only profile chart"
```

---

## Self-Review

- **Spec coverage:** The plan removes the position chart, header/profile/axis text, simplifies the helper to
  velocity-only output, updates parent integration, updates helper tests, updates render tests, and ends with focused
  tests plus `pnpm build` verification.
- **Placeholder scan:** No `TODO`, `TBD`, or deferred instructions remain; every code-changing step includes explicit
  code or exact assertions/commands.
- **Type consistency:** `MotionProfileDiagram` is planned to accept only `diagram: MotionProfileDiagramData`, and the
  helper’s planned output matches that component contract after `positionPath` removal.
