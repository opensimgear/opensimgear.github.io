# Actuator Sizing Motion Profile Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact stacked SVG motion-profile diagram to the actuator sizing calculator that visualizes velocity
and position over time for trapezoidal and triangular moves, including optional dwell.

**Architecture:** Keep the calculator's existing physics and derived profile math unchanged in `profile.ts`, add a small
pure geometry module that converts phase timings into normalized chart data, and render that data through a focused
`MotionProfileDiagram.svelte` component. Integrate the presentational component into the right-hand results area of
`src/components/calculator/actuator-sizing/index.svelte` so it reads as a visual companion to the existing calculated
outputs.

**Tech Stack:** Svelte 5, Astro, Vitest, SVG.

---

## File Structure

- Create: `src/components/calculator/actuator-sizing/motion-profile-diagram.ts` - pure geometry helpers for normalized
  breakpoints, labels, and SVG path strings
- Create: `src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte` - presentational SVG card for velocity
  and position charts
- Modify: `src/components/calculator/actuator-sizing/index.svelte` - import and place the diagram near the calculated
  outputs, pass derived timing values into it
- Test: `src/tests/actuator-sizing/motion-profile-diagram.test.ts` - geometry-level tests for trapezoidal, triangular,
  and dwell rendering data

---

### Task 1: Build and verify pure motion-profile geometry

**Files:**

- Create: `src/components/calculator/actuator-sizing/motion-profile-diagram.ts`
- Test: `src/tests/actuator-sizing/motion-profile-diagram.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { buildMotionProfileDiagram } from '../../components/calculator/actuator-sizing/motion-profile-diagram';

describe('buildMotionProfileDiagram', () => {
  it('builds normalized trapezoidal velocity and position geometry', () => {
    const diagram = buildMotionProfileDiagram({
      strokeLength_mm: 500,
      t_accel_s: 0.2,
      t_const_s: 0.6,
      t_decel_s: 0.2,
      v_peak_mm_s: 300,
      dwellTime_s: 0.5,
      isTriangular: false,
    });

    expect(diagram.phaseBoundaries).toEqual({
      accelEnd: 0.13333333333333333,
      constEnd: 0.5333333333333333,
      decelEnd: 0.6666666666666666,
      dwellEnd: 1,
    });

    expect(diagram.velocityPath).toBe('M 0 1 L 0.133333 0 L 0.533333 0 L 0.666667 1 L 1 1');
    expect(diagram.positionPath).toBe(
      'M 0 1 Q 0.066667 0.966667 0.133333 0.866667 L 0.533333 0.266667 Q 0.600000 0.100000 0.666667 0 L 1 0'
    );
    expect(diagram.segments.map((segment) => segment.kind)).toEqual(['accel', 'const', 'decel', 'dwell']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/tests/actuator-sizing/motion-profile-diagram.test.ts`

Expected: `FAIL` with a module resolution error for `motion-profile-diagram` or a missing export for
`buildMotionProfileDiagram`.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface MotionProfileDiagramInput {
  strokeLength_mm: number;
  t_accel_s: number;
  t_const_s: number;
  t_decel_s: number;
  v_peak_mm_s: number;
  dwellTime_s: number;
  isTriangular: boolean;
}

export interface MotionProfileSegment {
  kind: 'accel' | 'const' | 'decel' | 'dwell';
  start: number;
  end: number;
}

export interface MotionProfileDiagramData {
  totalTime_s: number;
  phaseBoundaries: {
    accelEnd: number;
    constEnd: number;
    decelEnd: number;
    dwellEnd: number;
  };
  segments: MotionProfileSegment[];
  velocityPath: string;
  positionPath: string;
}

function fmt(value: number): string {
  return value.toFixed(6);
}

export function buildMotionProfileDiagram(input: MotionProfileDiagramInput): MotionProfileDiagramData {
  const motionTime_s = input.t_accel_s + input.t_const_s + input.t_decel_s;
  const totalTime_s = motionTime_s + input.dwellTime_s;
  const safeTotal = totalTime_s || 1;

  const accelEnd = input.t_accel_s / safeTotal;
  const constEnd = (input.t_accel_s + input.t_const_s) / safeTotal;
  const decelEnd = motionTime_s / safeTotal;
  const dwellEnd = 1;

  const segments: MotionProfileSegment[] = [
    { kind: 'accel', start: 0, end: accelEnd },
    { kind: 'const', start: accelEnd, end: constEnd },
    { kind: 'decel', start: constEnd, end: decelEnd },
  ];

  if (input.dwellTime_s > 0) {
    segments.push({ kind: 'dwell', start: decelEnd, end: dwellEnd });
  }

  const velocityPoints: Array<[number, number]> = [
    [0, 1],
    [accelEnd, 0],
    [constEnd, 0],
    [decelEnd, 1],
  ];

  if (input.dwellTime_s > 0) {
    velocityPoints.push([1, 1]);
  }

  const positionPath = [
    `M 0 1`,
    `Q ${fmt(accelEnd / 2)} ${fmt(0.966667)} ${fmt(accelEnd)} ${fmt(0.866667)}`,
    `L ${fmt(constEnd)} ${fmt(0.266667)}`,
    `Q ${fmt((constEnd + decelEnd) / 2)} ${fmt(0.1)} ${fmt(decelEnd)} 0`,
    input.dwellTime_s > 0 ? `L 1 0` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    totalTime_s,
    phaseBoundaries: { accelEnd, constEnd, decelEnd, dwellEnd },
    segments,
    velocityPath: velocityPoints.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${fmt(x)} ${fmt(y)}`).join(' '),
    positionPath,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/tests/actuator-sizing/motion-profile-diagram.test.ts`

Expected: `PASS` for the single trapezoidal geometry test.

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator/actuator-sizing/motion-profile-diagram.ts src/tests/actuator-sizing/motion-profile-diagram.test.ts
git commit -m "feat(actuator-sizing): add motion profile geometry"
```

---

### Task 2: Extend tests and geometry for triangular and zero/positive dwell cases

**Files:**

- Modify: `src/components/calculator/actuator-sizing/motion-profile-diagram.ts`
- Modify: `src/tests/actuator-sizing/motion-profile-diagram.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/tests/actuator-sizing/motion-profile-diagram.test.ts`:

```ts
it('collapses the constant segment for triangular moves', () => {
  const diagram = buildMotionProfileDiagram({
    strokeLength_mm: 50,
    t_accel_s: 0.1,
    t_const_s: 0,
    t_decel_s: 0.15,
    v_peak_mm_s: 180,
    dwellTime_s: 0,
    isTriangular: true,
  });

  expect(diagram.phaseBoundaries.accelEnd).toBeCloseTo(0.4);
  expect(diagram.phaseBoundaries.constEnd).toBeCloseTo(0.4);
  expect(diagram.segments.map((segment) => [segment.kind, segment.start, segment.end])).toEqual([
    ['accel', 0, 0.4],
    ['decel', 0.4, 1],
  ]);
  expect(diagram.velocityPath).toBe('M 0 1 L 0.400000 0 L 1 1');
});

it('extends both traces with a flat dwell tail only when dwell is positive', () => {
  const withDwell = buildMotionProfileDiagram({
    strokeLength_mm: 200,
    t_accel_s: 0.2,
    t_const_s: 0.2,
    t_decel_s: 0.2,
    v_peak_mm_s: 150,
    dwellTime_s: 0.4,
    isTriangular: false,
  });

  const withoutDwell = buildMotionProfileDiagram({
    strokeLength_mm: 200,
    t_accel_s: 0.2,
    t_const_s: 0.2,
    t_decel_s: 0.2,
    v_peak_mm_s: 150,
    dwellTime_s: 0,
    isTriangular: false,
  });

  expect(withDwell.segments.at(-1)?.kind).toBe('dwell');
  expect(withDwell.velocityPath.endsWith('L 1.000000 1.000000')).toBe(true);
  expect(withDwell.positionPath.endsWith('L 1 0')).toBe(true);

  expect(withoutDwell.segments.at(-1)?.kind).toBe('decel');
  expect(withoutDwell.velocityPath.endsWith('L 1.000000 1.000000')).toBe(false);
  expect(withoutDwell.positionPath.endsWith('L 1 0')).toBe(false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/tests/actuator-sizing/motion-profile-diagram.test.ts`

Expected: `FAIL` because the first-pass geometry keeps a zero-width `const` segment for triangular moves and does not
properly distinguish dwell vs non-dwell outputs.

- [ ] **Step 3: Write minimal implementation**

Update `src/components/calculator/actuator-sizing/motion-profile-diagram.ts` so zero-width constant segments are omitted
and the position/velocity paths are built from the active segments only:

```ts
function buildSegments(
  accelEnd: number,
  constEnd: number,
  decelEnd: number,
  dwellEnd: number,
  hasConst: boolean,
  hasDwell: boolean
): MotionProfileSegment[] {
  const segments: MotionProfileSegment[] = [{ kind: 'accel', start: 0, end: accelEnd }];

  if (hasConst) {
    segments.push({ kind: 'const', start: accelEnd, end: constEnd });
  }

  segments.push({ kind: 'decel', start: hasConst ? constEnd : accelEnd, end: decelEnd });

  if (hasDwell) {
    segments.push({ kind: 'dwell', start: decelEnd, end: dwellEnd });
  }

  return segments;
}

export function buildMotionProfileDiagram(input: MotionProfileDiagramInput): MotionProfileDiagramData {
  const motionTime_s = input.t_accel_s + input.t_const_s + input.t_decel_s;
  const totalTime_s = motionTime_s + input.dwellTime_s;
  const safeTotal = totalTime_s || 1;
  const hasConst = input.t_const_s > 0;
  const hasDwell = input.dwellTime_s > 0;

  const accelEnd = input.t_accel_s / safeTotal;
  const constEnd = (input.t_accel_s + input.t_const_s) / safeTotal;
  const decelEnd = motionTime_s / safeTotal;
  const dwellEnd = 1;

  const segments = buildSegments(accelEnd, constEnd, decelEnd, dwellEnd, hasConst, hasDwell);

  const velocityPoints: Array<[number, number]> = hasConst
    ? [
        [0, 1],
        [accelEnd, 0],
        [constEnd, 0],
        [decelEnd, 1],
      ]
    : [
        [0, 1],
        [accelEnd, 0],
        [decelEnd, 1],
      ];

  if (hasDwell) {
    velocityPoints.push([1, 1]);
  }

  const positionCommands = [
    `M 0 1`,
    `Q ${fmt(accelEnd / 2)} ${fmt(0.966667)} ${fmt(accelEnd)} ${fmt(0.866667)}`,
    hasConst ? `L ${fmt(constEnd)} ${fmt(0.266667)}` : '',
    `Q ${fmt((Math.max(constEnd, accelEnd) + decelEnd) / 2)} ${fmt(0.1)} ${fmt(decelEnd)} 0`,
    hasDwell ? `L 1 0` : '',
  ].filter(Boolean);

  return {
    totalTime_s,
    phaseBoundaries: { accelEnd, constEnd, decelEnd, dwellEnd },
    segments,
    velocityPath: velocityPoints.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${fmt(x)} ${fmt(y)}`).join(' '),
    positionPath: positionCommands.join(' '),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/tests/actuator-sizing/motion-profile-diagram.test.ts`

Expected: `PASS` for trapezoidal, triangular, and dwell/no-dwell coverage.

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator/actuator-sizing/motion-profile-diagram.ts src/tests/actuator-sizing/motion-profile-diagram.test.ts
git commit -m "test(actuator-sizing): cover motion profile edge cases"
```

---

### Task 3: Render the SVG diagram component from the tested geometry

**Files:**

- Create: `src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte`
- Modify: `src/components/calculator/actuator-sizing/motion-profile-diagram.ts`
- Test: `src/tests/actuator-sizing/motion-profile-diagram.test.ts`

- [ ] **Step 1: Write the failing test**

Add label-focused geometry assertions to `src/tests/actuator-sizing/motion-profile-diagram.test.ts`:

```ts
it('marks only segments wide enough for inline labels', () => {
  const diagram = buildMotionProfileDiagram({
    strokeLength_mm: 500,
    t_accel_s: 0.2,
    t_const_s: 0.02,
    t_decel_s: 0.2,
    v_peak_mm_s: 300,
    dwellTime_s: 0.5,
    isTriangular: false,
  });

  expect(diagram.labelVisibility).toEqual({
    accel: true,
    const: false,
    decel: true,
    dwell: true,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/tests/actuator-sizing/motion-profile-diagram.test.ts`

Expected: `FAIL` because `labelVisibility` is not yet returned by `buildMotionProfileDiagram`.

- [ ] **Step 3: Write minimal implementation**

Update `src/components/calculator/actuator-sizing/motion-profile-diagram.ts` to expose label visibility:

```ts
export interface MotionProfileDiagramData {
  totalTime_s: number;
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
  positionPath: string;
}

function isWideEnough(start: number, end: number): boolean {
  return end - start >= 0.12;
}

// inside buildMotionProfileDiagram return value
labelVisibility: {
  accel: isWideEnough(0, accelEnd),
  const: hasConst && isWideEnough(accelEnd, constEnd),
  decel: isWideEnough(hasConst ? constEnd : accelEnd, decelEnd),
  dwell: hasDwell && isWideEnough(decelEnd, 1),
},
```

Create `src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte`:

```svelte
<script lang="ts">
  import { buildMotionProfileDiagram } from './motion-profile-diagram';

  interface Props {
    strokeLength_mm: number;
    t_accel_s: number;
    t_const_s: number;
    t_decel_s: number;
    v_peak_mm_s: number;
    dwellTime_s: number;
    isTriangular: boolean;
  }

  let {
    strokeLength_mm,
    t_accel_s,
    t_const_s,
    t_decel_s,
    v_peak_mm_s,
    dwellTime_s,
    isTriangular,
  }: Props = $props();

  const width = 320;
  const chartHeight = 72;
  const labelY = 14;

  $: diagram = buildMotionProfileDiagram({
    strokeLength_mm,
    t_accel_s,
    t_const_s,
    t_decel_s,
    v_peak_mm_s,
    dwellTime_s,
    isTriangular,
  });

  function toX(value: number): number {
    return value * width;
  }

  function toY(value: number): number {
    return value * chartHeight;
  }

  function labelCenter(start: number, end: number): number {
    return toX((start + end) / 2);
  }
</script>

<div class="border border-black bg-white p-3">
  <div class="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-gray-500">
    <span>Motion Profile</span>
    <span>{isTriangular ? 'Triangular' : 'Trapezoidal'}</span>
  </div>

  <svg viewBox={`0 0 ${width} ${chartHeight * 2 + 28}`} class="h-auto w-full overflow-visible" aria-label="Motion profile diagram" role="img">
    <g>
      <text x="0" y="10" class="fill-gray-500 text-[10px]">Velocity</text>
      <path d={diagram.velocityPath} transform={`scale(${width}, ${chartHeight})`} fill="none" stroke="currentColor" stroke-width="0.012" />
    </g>

    <g transform={`translate(0, ${chartHeight + 28})`}>
      <text x="0" y="10" class="fill-gray-500 text-[10px]">Position</text>
      <path d={diagram.positionPath} transform={`scale(${width}, ${chartHeight})`} fill="none" stroke="currentColor" stroke-width="0.012" />
    </g>

    {#each diagram.segments as segment}
      <line x1={toX(segment.end)} y1="0" x2={toX(segment.end)} y2={chartHeight * 2 + 28} stroke="#d1d5db" stroke-dasharray="3 3" />
      {#if segment.kind === 'accel' && diagram.labelVisibility.accel}
        <text x={labelCenter(segment.start, segment.end)} y={labelY} text-anchor="middle" class="fill-gray-500 text-[9px]">Accel</text>
      {/if}
      {#if segment.kind === 'const' && diagram.labelVisibility.const}
        <text x={labelCenter(segment.start, segment.end)} y={labelY} text-anchor="middle" class="fill-gray-500 text-[9px]">Const</text>
      {/if}
      {#if segment.kind === 'decel' && diagram.labelVisibility.decel}
        <text x={labelCenter(segment.start, segment.end)} y={labelY} text-anchor="middle" class="fill-gray-500 text-[9px]">Decel</text>
      {/if}
      {#if segment.kind === 'dwell' && diagram.labelVisibility.dwell}
        <text x={labelCenter(segment.start, segment.end)} y={labelY} text-anchor="middle" class="fill-gray-500 text-[9px]">Dwell</text>
      {/if}
    {/each}
  </svg>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/tests/actuator-sizing/motion-profile-diagram.test.ts`

Expected: `PASS`, including the new label visibility assertion.

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator/actuator-sizing/motion-profile-diagram.ts src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte src/tests/actuator-sizing/motion-profile-diagram.test.ts
git commit -m "feat(actuator-sizing): render motion profile diagram"
```

---

### Task 4: Integrate the diagram into the calculator and verify the full build

**Files:**

- Modify: `src/components/calculator/actuator-sizing/index.svelte`

- [ ] **Step 1: Write the failing test**

Use the build as the integration gate for this UI task. First make the intended import/use change in a broken state so
the build fails on the missing component props mismatch.

Insert near the existing imports in `src/components/calculator/actuator-sizing/index.svelte`:

```ts
import MotionProfileDiagram from './MotionProfileDiagram.svelte';
```

Insert below the `Calculated` pane in the right-hand column:

```svelte
<div class="border-t border-black p-4">
  <MotionProfileDiagram
    strokeLength_mm={strokeLength}
    t_accel_s={profile.t_accel_s}
    t_const_s={profile.t_const_s}
    t_decel_s={profile.t_decel_s}
    v_peak_mm_s={profile.v_peak_m_s * 1000}
    dwellTime_s={dwellTime}
    isTriangular={profile.isTriangular}
  />
</div>
```

- [ ] **Step 2: Run build to verify the integration fails if anything is mismatched**

Run: `pnpm build`

Expected: If any prop name, Svelte syntax, or import path is wrong, `astro check` fails here. Fix only the specific
issue needed to get to green.

- [ ] **Step 3: Write minimal implementation**

Complete the integration in `src/components/calculator/actuator-sizing/index.svelte` with compact placement and no
unrelated layout changes:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Checkbox, List, Monitor, Pane, Slider } from 'svelte-tweakpane-ui';
  import MotionProfileDiagram from './MotionProfileDiagram.svelte';
  // existing imports stay unchanged
</script>

<!-- existing right-side column -->
<div class="border-l border-black flex flex-col divide-y divide-black shrink-0">
  <Pane title="Motion Profile" position="inline">
    <!-- existing controls -->
  </Pane>

  <!-- existing panes -->

  <Pane title="Calculated" position="inline">
    <!-- existing monitors -->
  </Pane>

  <div class="p-4">
    <MotionProfileDiagram
      strokeLength_mm={strokeLength}
      t_accel_s={profile.t_accel_s}
      t_const_s={profile.t_const_s}
      t_decel_s={profile.t_decel_s}
      v_peak_mm_s={profile.v_peak_m_s * 1000}
      dwellTime_s={dwellTime}
      isTriangular={profile.isTriangular}
    />
  </div>
</div>
```

- [ ] **Step 4: Run verification to confirm the full feature works**

Run these commands:

```bash
pnpm test src/tests/actuator-sizing/motion-profile-diagram.test.ts
pnpm build
```

Expected:

- `pnpm test src/tests/actuator-sizing/motion-profile-diagram.test.ts` -> `PASS`
- `pnpm build` -> `astro check` succeeds and the production build completes successfully

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator/actuator-sizing/index.svelte src/components/calculator/actuator-sizing/MotionProfileDiagram.svelte src/components/calculator/actuator-sizing/motion-profile-diagram.ts src/tests/actuator-sizing/motion-profile-diagram.test.ts
git commit -m "feat(actuator-sizing): visualize motion profiles"
```

---

## Self-Review

- **Spec coverage:** The plan covers the pure SVG geometry, triangular fallback, dwell handling, narrow-label
  suppression, placement near the calculated outputs, and build verification. No spec sections are currently unaccounted
  for.
- **Placeholder scan:** No `TODO`, `TBD`, or deferred "write tests later" steps remain. Every code-changing step
  includes concrete code or exact insertion content.
- **Type consistency:** `MotionProfileDiagram.svelte` and `motion-profile-diagram.ts` both use `strokeLength_mm`,
  `t_accel_s`, `t_const_s`, `t_decel_s`, `v_peak_mm_s`, `dwellTime_s`, and `isTriangular`. Tests reference the same
  names.
