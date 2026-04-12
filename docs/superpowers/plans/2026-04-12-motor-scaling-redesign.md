# Motor Scaling Calculator Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare-bones motor-scaling widget with a full motor-selection tool: Tweakpane input panel + per-motor headroom analysis cards, matching the portal's Stewart platform UI style.

**Architecture:** Pure calculation functions in `calculations.ts`; builtin + user motor database in `motors.ts`; single `MotorCard.svelte` for each motor result; `index.svelte` orchestrates layout, state, and URL persistence. No external dependencies beyond what the project already has.

**Tech Stack:** Svelte 5 (legacy syntax), svelte-tweakpane-ui 1.5.16, Tailwind CSS v4, TypeScript, Vitest (new devDep for unit tests on pure functions).

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/components/calculator/motor-scaling/calculations.ts` | Pure math: RPM, torque, power, inertia, margin, optimal ratio search |
| Create | `src/components/calculator/motor-scaling/motors.ts` | `Motor` type + builtin DB + localStorage helpers |
| Create | `src/components/calculator/motor-scaling/MotorCard.svelte` | Single motor comparison card with headroom bars |
| Replace | `src/components/calculator/motor-scaling/index.svelte` | Layout, Tweakpane inputs, reactive state, URL persistence |
| Create | `src/tests/motor-scaling/calculations.test.ts` | Unit tests for calculations.ts |
| Create | `vitest.config.ts` | Minimal vitest config (TS-only, no browser) |

---

## Task 1: Add vitest and test scaffold

**Files:**
- Create: `vitest.config.ts`
- Create: `src/tests/motor-scaling/calculations.test.ts` (empty scaffold)

- [ ] **Step 1: Install vitest**

```bash
pnpm add -D vitest
```

Expected: vitest added to devDependencies in package.json.

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts` at project root:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run"
```

- [ ] **Step 4: Create test directory and empty test file**

Create `src/tests/motor-scaling/calculations.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
// tests added in Task 2
```

- [ ] **Step 5: Verify vitest runs**

```bash
pnpm test
```

Expected output: `0 tests`, no errors.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/tests/motor-scaling/calculations.test.ts package.json pnpm-lock.yaml
git commit -m "chore: add vitest for motor-scaling unit tests"
```

---

## Task 2: Create motors.ts

**Files:**
- Create: `src/components/calculator/motor-scaling/motors.ts`

- [ ] **Step 1: Create motors.ts**

Create `src/components/calculator/motor-scaling/motors.ts`:

```ts
export interface Motor {
  id: string;
  name: string;
  ratedRPM: number;
  ratedTorque_Nm: number;
  peakTorque_Nm: number;
  continuousPower_W: number;
  inertia_kgm2: number;
  source: 'builtin' | 'user';
}

export const BUILTIN_MOTORS: Motor[] = [
  {
    id: 'jmc-ihss57-36-10-30',
    name: 'JMC iHSS57 (200W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 0.64,
    peakTorque_Nm: 1.92,
    continuousPower_W: 200,
    inertia_kgm2: 1.7e-5,
    source: 'builtin',
  },
  {
    id: 'jmc-ihss57-36-20-40',
    name: 'JMC iHSS57 (400W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 1.27,
    peakTorque_Nm: 3.81,
    continuousPower_W: 400,
    inertia_kgm2: 2.9e-5,
    source: 'builtin',
  },
  {
    id: 'jmc-ihss86-36-30',
    name: 'JMC iHSS86 (750W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 8.0e-5,
    source: 'builtin',
  },
  {
    id: 'jmc-ihss86-36-40',
    name: 'JMC iHSS86 (1000W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 3.18,
    peakTorque_Nm: 9.54,
    continuousPower_W: 1000,
    inertia_kgm2: 1.1e-4,
    source: 'builtin',
  },
  {
    id: 'leadshine-el5-d507',
    name: 'Leadshine EL5-D507 (750W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 3.9e-5,
    source: 'builtin',
  },
  {
    id: 'leadshine-el5-d1022',
    name: 'Leadshine EL5-D1022 (1kW)',
    ratedRPM: 3000,
    ratedTorque_Nm: 3.18,
    peakTorque_Nm: 9.54,
    continuousPower_W: 1000,
    inertia_kgm2: 2.0e-4,
    source: 'builtin',
  },
  {
    id: 'lichuan-57',
    name: 'Lichuan LC57H280 (280W)',
    ratedRPM: 3000,
    ratedTorque_Nm: 0.9,
    peakTorque_Nm: 2.7,
    continuousPower_W: 280,
    inertia_kgm2: 2.4e-5,
    source: 'builtin',
  },
  {
    id: 'nema34-stepper',
    name: 'NEMA 34 Stepper (12Nm)',
    ratedRPM: 400,
    ratedTorque_Nm: 8.0,
    peakTorque_Nm: 12.0,
    continuousPower_W: 335,
    inertia_kgm2: 5.0e-4,
    source: 'builtin',
  },
];

const USER_MOTORS_KEY = 'motor-scaling-user-motors';

export function loadUserMotors(): Motor[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USER_MOTORS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Motor[];
  } catch {
    return [];
  }
}

export function saveUserMotors(motors: Motor[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(USER_MOTORS_KEY, JSON.stringify(motors));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calculator/motor-scaling/motors.ts
git commit -m "feat: add builtin motor database and localStorage helpers"
```

---

## Task 3: Create calculations.ts with TDD

**Files:**
- Create: `src/components/calculator/motor-scaling/calculations.ts`
- Modify: `src/tests/motor-scaling/calculations.test.ts`

- [ ] **Step 1: Write failing tests**

Replace contents of `src/tests/motor-scaling/calculations.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  computeRequiredRPM,
  computeRequiredTorque,
  computeRequiredPower,
  computeReflectedInertia,
  computeMargin,
  evaluateMotor,
  findOptimalDriveRatio,
} from '../../components/calculator/motor-scaling/calculations';
import type { Motor } from '../../components/calculator/motor-scaling/motors';

const testMotor: Motor = {
  id: 'test',
  name: 'Test Motor',
  ratedRPM: 3000,
  ratedTorque_Nm: 2.0,
  peakTorque_Nm: 6.0,
  continuousPower_W: 600,
  inertia_kgm2: 3e-5,
  source: 'builtin',
};

const testReq = {
  axialSpeed_mm_s: 200,
  axialForce_N: 500,
  safetyFactor: 0,
  ballscrewPitch_mm: 10,
  efficiency: 1.0,
};

const testLoad = { screwMass_kg: 0.5, loadMass_kg: 1.0 };

describe('computeRequiredRPM', () => {
  it('returns axialSpeed*60*ratio/pitch', () => {
    // 200 mm/s * 60 / 10 mm * 1 ratio = 1200 RPM
    expect(computeRequiredRPM(200, 1, 10)).toBeCloseTo(1200);
  });
  it('scales linearly with drive ratio', () => {
    expect(computeRequiredRPM(200, 2, 10)).toBeCloseTo(2400);
  });
});

describe('computeRequiredTorque', () => {
  it('returns force*pitch/(1000*2pi*ratio*efficiency)', () => {
    // 500 N * 10 mm / (1000 * 2π * 1 * 1.0) ≈ 0.7958 Nm
    expect(computeRequiredTorque(500, 10, 1, 1.0)).toBeCloseTo(0.7958, 3);
  });
  it('halves when drive ratio doubles', () => {
    const t1 = computeRequiredTorque(500, 10, 1, 1.0);
    const t2 = computeRequiredTorque(500, 10, 2, 1.0);
    expect(t2).toBeCloseTo(t1 / 2, 5);
  });
  it('increases when efficiency is less than 1', () => {
    const t90 = computeRequiredTorque(500, 10, 1, 0.9);
    const t100 = computeRequiredTorque(500, 10, 1, 1.0);
    expect(t90).toBeGreaterThan(t100);
  });
});

describe('computeRequiredPower', () => {
  it('returns torque * angular velocity', () => {
    // 1 Nm * (60 RPM * 2π/60) = 1 * 2π ≈ 6.283 W
    expect(computeRequiredPower(1, 60)).toBeCloseTo(2 * Math.PI, 3);
  });
});

describe('computeReflectedInertia', () => {
  it('returns (m_screw + m_load) * (pitch_m / (2π*ratio))^2', () => {
    // (0.5+1.0) * (0.01 / (2π*1))^2
    const expected = 1.5 * Math.pow(0.01 / (2 * Math.PI), 2);
    expect(computeReflectedInertia(0.5, 1.0, 10, 1)).toBeCloseTo(expected, 10);
  });
});

describe('computeMargin', () => {
  it('returns positive percent when rated > required', () => {
    expect(computeMargin(120, 100)).toBeCloseTo(20);
  });
  it('returns negative percent when rated < required', () => {
    expect(computeMargin(80, 100)).toBeCloseTo(-20);
  });
});

describe('evaluateMotor', () => {
  it('returns pass when motor exceeds all requirements by >20%', () => {
    // testMotor: 3000 RPM, 2 Nm, 600 W
    // At ratio=1: requiredRPM=1200, requiredTorque≈0.796 Nm
    // rpmMargin = (3000-1200)/1200*100 = 150% → pass
    // torqueMargin = (2-0.796)/0.796*100 ≈ 151% → pass
    const result = evaluateMotor(testMotor, testReq, testLoad, 1);
    expect(result.status).toBe('pass');
    expect(result.rpmMargin).toBeGreaterThan(20);
    expect(result.torqueMargin).toBeGreaterThan(20);
  });

  it('returns fail when motor is undersized', () => {
    const underReq = { ...testReq, axialSpeed_mm_s: 3000, axialForce_N: 5000 };
    const result = evaluateMotor(testMotor, underReq, testLoad, 1);
    expect(result.status).toBe('fail');
  });

  it('applies safety factor multiplier to requirements', () => {
    const reqWith20pct = { ...testReq, safetyFactor: 20 };
    const r0 = evaluateMotor(testMotor, testReq, testLoad, 1);
    const r20 = evaluateMotor(testMotor, reqWith20pct, testLoad, 1);
    expect(r20.requiredRPM).toBeCloseTo(r0.requiredRPM * 1.2, 3);
    expect(r20.requiredTorque_Nm).toBeCloseTo(r0.requiredTorque_Nm * 1.2, 3);
  });

  it('computes inertia ratio', () => {
    const result = evaluateMotor(testMotor, testReq, testLoad, 1);
    const expectedInertia = computeReflectedInertia(0.5, 1.0, 10, 1);
    expect(result.inertiaRatio).toBeCloseTo(expectedInertia / testMotor.inertia_kgm2, 3);
  });
});

describe('findOptimalDriveRatio', () => {
  it('returns a ratio where rpmMargin ≈ torqueMargin', () => {
    const ratio = findOptimalDriveRatio(testMotor, testReq, testLoad);
    const result = evaluateMotor(testMotor, testReq, testLoad, ratio);
    expect(Math.abs(result.rpmMargin - result.torqueMargin)).toBeLessThan(1);
  });

  it('returns ratio within [0.5, 10]', () => {
    const ratio = findOptimalDriveRatio(testMotor, testReq, testLoad);
    expect(ratio).toBeGreaterThanOrEqual(0.5);
    expect(ratio).toBeLessThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm test
```

Expected: multiple "Cannot find module" or import errors.

- [ ] **Step 3: Create calculations.ts**

Create `src/components/calculator/motor-scaling/calculations.ts`:

```ts
import type { Motor } from './motors';

export interface Requirements {
  axialSpeed_mm_s: number;
  axialForce_N: number;
  safetyFactor: number;   // percent, e.g. 20 means ×1.20
  ballscrewPitch_mm: number;
  efficiency: number;     // fraction 0–1, e.g. 0.9
}

export interface LoadInertia {
  screwMass_kg: number;
  loadMass_kg: number;
}

export interface MotorEvaluation {
  driveRatio: number;
  requiredRPM: number;
  requiredTorque_Nm: number;
  requiredPower_W: number;
  reflectedInertia_kgm2: number;
  rpmMargin: number;      // percent, positive = headroom
  torqueMargin: number;
  powerMargin: number;
  inertiaRatio: number;   // reflectedInertia / motor.inertia_kgm2
  status: 'pass' | 'warn' | 'fail';
}

export function computeRequiredRPM(
  axialSpeed_mm_s: number,
  driveRatio: number,
  pitch_mm: number,
): number {
  return (axialSpeed_mm_s * 60 * driveRatio) / pitch_mm;
}

export function computeRequiredTorque(
  axialForce_N: number,
  pitch_mm: number,
  driveRatio: number,
  efficiency: number,
): number {
  return (axialForce_N * pitch_mm) / (1000 * 2 * Math.PI * driveRatio * efficiency);
}

export function computeRequiredPower(torque_Nm: number, rpm: number): number {
  return torque_Nm * ((rpm * 2 * Math.PI) / 60);
}

export function computeReflectedInertia(
  screwMass_kg: number,
  loadMass_kg: number,
  pitch_mm: number,
  driveRatio: number,
): number {
  const pitch_m = pitch_mm / 1000;
  return (screwMass_kg + loadMass_kg) * Math.pow(pitch_m / (2 * Math.PI * driveRatio), 2);
}

export function computeMargin(rated: number, required: number): number {
  return ((rated - required) / required) * 100;
}

export function evaluateMotor(
  motor: Motor,
  req: Requirements,
  load: LoadInertia,
  driveRatio: number,
): MotorEvaluation {
  const mult = 1 + req.safetyFactor / 100;
  const safeSpeed = req.axialSpeed_mm_s * mult;
  const safeForce = req.axialForce_N * mult;

  const requiredRPM = computeRequiredRPM(safeSpeed, driveRatio, req.ballscrewPitch_mm);
  const requiredTorque_Nm = computeRequiredTorque(
    safeForce,
    req.ballscrewPitch_mm,
    driveRatio,
    req.efficiency,
  );
  const requiredPower_W = computeRequiredPower(requiredTorque_Nm, requiredRPM);
  const reflectedInertia_kgm2 = computeReflectedInertia(
    load.screwMass_kg,
    load.loadMass_kg,
    req.ballscrewPitch_mm,
    driveRatio,
  );

  const rpmMargin = computeMargin(motor.ratedRPM, requiredRPM);
  const torqueMargin = computeMargin(motor.ratedTorque_Nm, requiredTorque_Nm);
  const powerMargin = computeMargin(motor.continuousPower_W, requiredPower_W);
  const inertiaRatio = reflectedInertia_kgm2 / motor.inertia_kgm2;

  let status: 'pass' | 'warn' | 'fail';
  if (rpmMargin < 0 || torqueMargin < 0 || powerMargin < 0) {
    status = 'fail';
  } else if (rpmMargin < 20 || torqueMargin < 20 || powerMargin < 20) {
    status = 'warn';
  } else {
    status = 'pass';
  }

  return {
    driveRatio,
    requiredRPM,
    requiredTorque_Nm,
    requiredPower_W,
    reflectedInertia_kgm2,
    rpmMargin,
    torqueMargin,
    powerMargin,
    inertiaRatio,
    status,
  };
}

/**
 * Binary-search for the drive ratio that maximises min(rpmMargin, torqueMargin).
 * As driveRatio increases: rpmMargin decreases, torqueMargin increases.
 * Optimal = crossover point where both are equal.
 */
export function findOptimalDriveRatio(
  motor: Motor,
  req: Requirements,
  load: LoadInertia,
): number {
  const mult = 1 + req.safetyFactor / 100;
  const safeSpeed = req.axialSpeed_mm_s * mult;
  const safeForce = req.axialForce_N * mult;

  let lo = 0.5;
  let hi = 10;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const rpm = computeRequiredRPM(safeSpeed, mid, req.ballscrewPitch_mm);
    const torque = computeRequiredTorque(safeForce, req.ballscrewPitch_mm, mid, req.efficiency);
    const rpmM = computeMargin(motor.ratedRPM, rpm);
    const torqueM = computeMargin(motor.ratedTorque_Nm, torque);
    if (rpmM > torqueM) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pnpm test
```

Expected: all tests pass, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator/motor-scaling/calculations.ts src/tests/motor-scaling/calculations.test.ts
git commit -m "feat: add motor scaling calculation functions with tests"
```

---

## Task 4: Create MotorCard.svelte

**Files:**
- Create: `src/components/calculator/motor-scaling/MotorCard.svelte`

- [ ] **Step 1: Create MotorCard.svelte**

Create `src/components/calculator/motor-scaling/MotorCard.svelte`:

```svelte
<script lang="ts">
  import type { Motor } from './motors';
  import type { MotorEvaluation } from './calculations';

  export let motor: Motor;
  export let evaluation: MotorEvaluation;
  export let onDelete: (() => void) | null = null;

  // Bar scale: required value is always rendered at 50% of bar width.
  // Rated fills proportionally: ratedFill = rated / (required * 2) * 100, clamped to 0–100%.
  function barFill(rated: number, required: number): number {
    return Math.min(100, Math.max(0, (rated / (required * 2)) * 100));
  }

  function marginColor(margin: number): string {
    if (margin < 0) return '#ef4444';      // red-500
    if (margin < 20) return '#f59e0b';     // amber-500
    return '#22c55e';                      // green-500
  }

  $: borderClass =
    evaluation.status === 'fail'
      ? 'border-red-500'
      : evaluation.status === 'warn'
        ? 'border-amber-500'
        : 'border-green-500';

  $: badgeClass =
    evaluation.status === 'fail'
      ? 'bg-red-100 text-red-700'
      : evaluation.status === 'warn'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-green-100 text-green-700';

  $: badgeLabel =
    evaluation.status === 'fail' ? '✗ Fail' : evaluation.status === 'warn' ? '⚠ Warn' : '✓ Pass';
</script>

<div class="border-2 rounded-md p-3 {borderClass} bg-white text-sm font-mono">
  <div class="flex items-start justify-between mb-2">
    <div class="font-sans font-semibold text-gray-800 text-sm leading-tight">{motor.name}</div>
    <div class="flex items-center gap-1">
      <span class="text-xs font-sans font-semibold px-1.5 py-0.5 rounded {badgeClass}">{badgeLabel}</span>
      {#if onDelete}
        <button
          on:click={onDelete}
          class="text-gray-400 hover:text-red-500 transition-colors text-xs px-1"
          title="Remove motor"
        >✕</button>
      {/if}
    </div>
  </div>

  <!-- Headroom bars -->
  <div class="space-y-1.5 mb-2">
    {#each [
      { label: 'RPM', rated: motor.ratedRPM, required: evaluation.requiredRPM, margin: evaluation.rpmMargin, unit: 'rpm' },
      { label: 'Torque', rated: motor.ratedTorque_Nm, required: evaluation.requiredTorque_Nm, margin: evaluation.torqueMargin, unit: 'Nm' },
      { label: 'Power', rated: motor.continuousPower_W, required: evaluation.requiredPower_W, margin: evaluation.powerMargin, unit: 'W' },
    ] as row}
      <div class="grid grid-cols-[3rem_1fr_4rem] gap-1 items-center">
        <span class="text-gray-500 text-xs">{row.label}</span>
        <div class="relative h-2 bg-gray-200 rounded overflow-visible">
          <!-- Rated fill -->
          <div
            class="absolute inset-y-0 left-0 rounded"
            style="width: {barFill(row.rated, row.required)}%; background-color: {marginColor(row.margin)}"
          ></div>
          <!-- Required tick at 50% -->
          <div class="absolute inset-y-[-2px] w-0.5 bg-gray-600" style="left: 50%"></div>
        </div>
        <span
          class="text-xs text-right"
          style="color: {marginColor(row.margin)}"
        >{row.margin >= 0 ? '+' : ''}{row.margin.toFixed(0)}%</span>
      </div>
    {/each}
  </div>

  <!-- Metadata row -->
  <div class="flex gap-4 text-xs text-gray-500 border-t border-gray-100 pt-1.5 mt-1">
    <span>Ratio <span class="text-gray-700">{evaluation.driveRatio.toFixed(2)}</span></span>
    <span>
      Inertia
      <span class="text-gray-700" class:text-amber-600={evaluation.inertiaRatio > 10}>
        {evaluation.inertiaRatio.toFixed(1)}:1
      </span>
    </span>
    <span>Peak <span class="text-gray-700">{motor.peakTorque_Nm.toFixed(2)} Nm</span></span>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calculator/motor-scaling/MotorCard.svelte
git commit -m "feat: add MotorCard component with headroom bars"
```

---

## Task 5: Rewrite index.svelte — layout and Tweakpane inputs

**Files:**
- Replace: `src/components/calculator/motor-scaling/index.svelte`

- [ ] **Step 1: Replace index.svelte**

Replace the entire contents of `src/components/calculator/motor-scaling/index.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { Pane, Folder, Slider, List, Checkbox, Button, Separator } from 'svelte-tweakpane-ui';
  import MotorCard from './MotorCard.svelte';
  import { BUILTIN_MOTORS, loadUserMotors, saveUserMotors } from './motors';
  import type { Motor } from './motors';
  import {
    evaluateMotor,
    findOptimalDriveRatio,
  } from './calculations';
  import type { Requirements, LoadInertia, MotorEvaluation } from './calculations';

  // --- Defaults ---
  const DEFAULTS = {
    axialSpeed: 200,
    axialForce: 800,
    safetyFactor: 20,
    ballscrewKey: '1610',
    customPitch: 10,
    efficiency: 90,
    fixedMode: false,
    fixedRatio: 2,
    screwMass: 0.5,
    loadMass: 2.0,
  };

  // --- Ballscrew options ---
  const BALLSCREW_OPTIONS = [
    { text: '1605 (5mm)', value: '1605' },
    { text: '1610 (10mm)', value: '1610' },
    { text: '2005 (5mm)', value: '2005' },
    { text: '2010 (10mm)', value: '2010' },
    { text: '2505 (5mm)', value: '2505' },
    { text: '2510 (10mm)', value: '2510' },
    { text: '3205 (5mm)', value: '3205' },
    { text: '3210 (10mm)', value: '3210' },
    { text: 'Custom', value: 'custom' },
  ];

  const BALLSCREW_PITCHES: Record<string, number> = {
    '1605': 5, '1610': 10, '2005': 5, '2010': 10,
    '2505': 5, '2510': 10, '3205': 5, '3210': 10,
  };

  // --- State ---
  let axialSpeed = DEFAULTS.axialSpeed;
  let axialForce = DEFAULTS.axialForce;
  let safetyFactor = DEFAULTS.safetyFactor;
  let ballscrewKey = DEFAULTS.ballscrewKey;
  let customPitch = DEFAULTS.customPitch;
  let efficiency = DEFAULTS.efficiency;
  let fixedMode = DEFAULTS.fixedMode;
  let fixedRatio = DEFAULTS.fixedRatio;
  let screwMass = DEFAULTS.screwMass;
  let loadMass = DEFAULTS.loadMass;

  let userMotors: Motor[] = [];

  // Add-motor form state
  let addName = '';
  let addRPM = 3000;
  let addTorque = 1.0;
  let addPeakTorque = 3.0;
  let addPower = 300;
  let addInertia = 0.00003;
  let addFormOpen = false;

  // --- URL state ---
  const STATE_KEY = 'ms';
  let mounted = false;

  function encodeState() {
    return btoa(
      JSON.stringify({
        axialSpeed, axialForce, safetyFactor,
        ballscrewKey, customPitch, efficiency,
        fixedMode, fixedRatio, screwMass, loadMass,
      }),
    );
  }

  function updateUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set(STATE_KEY, encodeState());
    window.history.replaceState({}, '', url.toString());
  }

  onMount(() => {
    userMotors = loadUserMotors();

    const params = new URLSearchParams(window.location.search);
    const encoded = params.get(STATE_KEY);
    if (encoded) {
      try {
        const s = JSON.parse(atob(encoded));
        axialSpeed = s.axialSpeed ?? DEFAULTS.axialSpeed;
        axialForce = s.axialForce ?? DEFAULTS.axialForce;
        safetyFactor = s.safetyFactor ?? DEFAULTS.safetyFactor;
        ballscrewKey = s.ballscrewKey ?? DEFAULTS.ballscrewKey;
        customPitch = s.customPitch ?? DEFAULTS.customPitch;
        efficiency = s.efficiency ?? DEFAULTS.efficiency;
        fixedMode = s.fixedMode ?? DEFAULTS.fixedMode;
        fixedRatio = s.fixedRatio ?? DEFAULTS.fixedRatio;
        screwMass = s.screwMass ?? DEFAULTS.screwMass;
        loadMass = s.loadMass ?? DEFAULTS.loadMass;
      } catch {
        // malformed URL param — use defaults
      }
    }
    mounted = true;
  });

  $: if (mounted) {
    (axialSpeed, axialForce, safetyFactor, ballscrewKey, customPitch,
      efficiency, fixedMode, fixedRatio, screwMass, loadMass);
    updateUrl();
  }

  // --- Derived ---
  $: pitch_mm =
    ballscrewKey === 'custom' ? customPitch : (BALLSCREW_PITCHES[ballscrewKey] ?? 10);

  $: requirements = {
    axialSpeed_mm_s: axialSpeed,
    axialForce_N: axialForce,
    safetyFactor,
    ballscrewPitch_mm: pitch_mm,
    efficiency: efficiency / 100,
  } satisfies Requirements;

  $: load = {
    screwMass_kg: screwMass,
    loadMass_kg: loadMass,
  } satisfies LoadInertia;

  $: allMotors = [...BUILTIN_MOTORS, ...userMotors];

  $: motorResults = allMotors.map((motor) => {
    const ratio = fixedMode ? fixedRatio : findOptimalDriveRatio(motor, requirements, load);
    const evaluation = evaluateMotor(motor, requirements, load, ratio);
    return { motor, evaluation };
  });

  // Sort: pass first, then warn, then fail; within each group by torque margin desc
  $: sortedResults = [...motorResults].sort((a, b) => {
    const order = { pass: 0, warn: 1, fail: 2 };
    const statusDiff = order[a.evaluation.status] - order[b.evaluation.status];
    if (statusDiff !== 0) return statusDiff;
    return b.evaluation.torqueMargin - a.evaluation.torqueMargin;
  });

  function deleteUserMotor(id: string) {
    userMotors = userMotors.filter((m) => m.id !== id);
    saveUserMotors(userMotors);
  }

  function addUserMotor() {
    if (!addName.trim()) return;
    const newMotor: Motor = {
      id: `user-${Date.now()}`,
      name: addName.trim(),
      ratedRPM: addRPM,
      ratedTorque_Nm: addTorque,
      peakTorque_Nm: addPeakTorque,
      continuousPower_W: addPower,
      inertia_kgm2: addInertia,
      source: 'user',
    };
    userMotors = [...userMotors, newMotor];
    saveUserMotors(userMotors);
    addName = '';
    addRPM = 3000;
    addTorque = 1.0;
    addPeakTorque = 3.0;
    addPower = 300;
    addInertia = 0.00003;
    addFormOpen = false;
  }
</script>

<div class="w-full not-content border border-black rounded overflow-hidden">
  <div class="flex flex-col md:flex-row">
    <!-- Left: Tweakpane inputs -->
    <div class="border-b border-black md:border-b-0 md:border-r md:w-72 shrink-0">
      <Pane title="Motor Scaling" position="inline">
        <Folder title="Requirements">
          <Slider bind:value={axialSpeed} label="Axial Speed" min={1} max={1000} step={1}
            format={(v) => `${v} mm/s`} />
          <Slider bind:value={axialForce} label="Axial Force" min={1} max={5000} step={10}
            format={(v) => `${v} N`} />
          <Slider bind:value={safetyFactor} label="Safety Factor" min={0} max={100} step={1}
            format={(v) => `${v}%`} />
        </Folder>

        <Folder title="Ballscrew">
          <List bind:value={ballscrewKey} options={BALLSCREW_OPTIONS} label="Type" />
          {#if ballscrewKey === 'custom'}
            <Slider bind:value={customPitch} label="Pitch" min={1} max={50} step={0.5}
              format={(v) => `${v} mm`} />
          {/if}
          <Slider bind:value={efficiency} label="Efficiency" min={50} max={100} step={1}
            format={(v) => `${v}%`} />
        </Folder>

        <Folder title="Drive Ratio">
          <Checkbox bind:value={fixedMode} label="Fixed ratio" />
          {#if fixedMode}
            <Slider bind:value={fixedRatio} label="Ratio" min={0.5} max={10} step={0.1}
              format={(v) => `${v.toFixed(1)}:1`} />
          {/if}
        </Folder>

        <Folder title="Load Inertia">
          <Slider bind:value={screwMass} label="Screw mass" min={0} max={10} step={0.1}
            format={(v) => `${v.toFixed(1)} kg`} />
          <Slider bind:value={loadMass} label="Load mass" min={0} max={50} step={0.5}
            format={(v) => `${v.toFixed(1)} kg`} />
        </Folder>
      </Pane>
    </div>

    <!-- Right: Motor results -->
    <div class="flex-1 overflow-y-auto max-h-[600px] p-3 bg-gray-50">
      <div class="text-[10px] font-sans font-semibold uppercase tracking-wider text-gray-500 mb-2">
        {sortedResults.length} motors · {fixedMode ? `ratio ${fixedRatio.toFixed(1)}:1 fixed` : 'ratio auto-optimised'}
      </div>

      <div class="space-y-2">
        {#each sortedResults as { motor, evaluation } (motor.id)}
          <MotorCard
            {motor}
            {evaluation}
            onDelete={motor.source === 'user' ? () => deleteUserMotor(motor.id) : null}
          />
        {/each}
      </div>

      <!-- Add custom motor -->
      <div class="mt-4 border border-dashed border-gray-300 rounded-md">
        {#if !addFormOpen}
          <button
            on:click={() => (addFormOpen = true)}
            class="w-full text-xs text-gray-500 hover:text-gray-700 py-2 px-3 text-left transition-colors"
          >
            + Add custom motor
          </button>
        {:else}
          <div class="p-3 space-y-2">
            <div class="text-xs font-sans font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Add Motor
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs font-mono">
              <label class="col-span-2 flex flex-col gap-0.5">
                <span class="text-gray-500">Name</span>
                <input bind:value={addName} type="text" placeholder="e.g. Delta ECMA-C207"
                  class="border border-gray-300 rounded px-2 py-1 text-xs" />
              </label>
              <label class="flex flex-col gap-0.5">
                <span class="text-gray-500">Rated RPM</span>
                <input bind:value={addRPM} type="number" min="1"
                  class="border border-gray-300 rounded px-2 py-1 text-xs" />
              </label>
              <label class="flex flex-col gap-0.5">
                <span class="text-gray-500">Rated Torque (Nm)</span>
                <input bind:value={addTorque} type="number" min="0" step="0.01"
                  class="border border-gray-300 rounded px-2 py-1 text-xs" />
              </label>
              <label class="flex flex-col gap-0.5">
                <span class="text-gray-500">Peak Torque (Nm)</span>
                <input bind:value={addPeakTorque} type="number" min="0" step="0.01"
                  class="border border-gray-300 rounded px-2 py-1 text-xs" />
              </label>
              <label class="flex flex-col gap-0.5">
                <span class="text-gray-500">Cont. Power (W)</span>
                <input bind:value={addPower} type="number" min="1"
                  class="border border-gray-300 rounded px-2 py-1 text-xs" />
              </label>
              <label class="col-span-2 flex flex-col gap-0.5">
                <span class="text-gray-500">Rotor Inertia (kg·m²)</span>
                <input bind:value={addInertia} type="number" min="0" step="0.000001"
                  class="border border-gray-300 rounded px-2 py-1 text-xs" />
              </label>
            </div>
            <div class="flex gap-2 pt-1">
              <button
                on:click={addUserMotor}
                class="btn-primary text-xs py-1.5 px-3 rounded"
              >Save</button>
              <button
                on:click={() => (addFormOpen = false)}
                class="text-xs text-gray-500 hover:text-gray-700 py-1.5 px-3"
              >Cancel</button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Start dev server and open the motor scaling page**

```bash
pnpm dev
```

Open: `http://localhost:4321/calculators/motor-scaling`

Verify:
- Widget renders with two-column layout
- Tweakpane folders open/close
- Ballscrew list changes pitch correctly
- Motor cards display with colored borders
- "Fixed ratio" checkbox shows/hides ratio slider

- [ ] **Step 3: Commit**

```bash
git add src/components/calculator/motor-scaling/index.svelte
git commit -m "feat: rewrite motor-scaling widget with Tweakpane + motor comparison cards"
```

---

## Task 6: Verify, polish, and final commit

**Files:**
- Modify: `src/content/docs/calculators/motor-scaling.mdx` (update description)

- [ ] **Step 1: Run full build check**

```bash
pnpm build
```

Expected: builds without TypeScript errors.

- [ ] **Step 2: Verify URL state persistence**

In the browser:
1. Change axial speed to 300, force to 1200
2. Reload the page
3. Verify sliders restore to 300 / 1200

- [ ] **Step 3: Verify localStorage for user motors**

In the browser:
1. Click "+ Add custom motor"
2. Fill in name "Test Motor", RPM 3000, Torque 1.5 Nm, Peak 4.5 Nm, Power 400W, Inertia 0.00003
3. Click Save
4. Verify the card appears in the list
5. Reload the page — verify the motor persists
6. Click ✕ on the card — verify it disappears and stays gone after reload

- [ ] **Step 4: Update page description**

Edit `src/content/docs/calculators/motor-scaling.mdx`:

```mdx
---
title: Motor Scaling Calculator
description: Motor selection tool for sim racing motion systems. Enter your axial speed and force requirements to find suitable motors from the builtin database, with per-motor headroom analysis and optimal drive ratio calculation.
---

import MotorScalingCalc from '~/components/calculator/motor-scaling/index.svelte'

## Motor Scaling

<MotorScalingCalc client:load/>
```

- [ ] **Step 5: Final commit**

```bash
git add src/content/docs/calculators/motor-scaling.mdx
git commit -m "docs: update motor-scaling page title and description"
```
