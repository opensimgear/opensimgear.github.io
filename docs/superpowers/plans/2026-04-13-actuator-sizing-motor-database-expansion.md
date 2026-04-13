# Actuator Sizing Motor Database Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the actuator-sizing motor catalog to roughly 30-50 source-backed 200 W to 1000 W motors, add richer
optional metadata fields, and vendor the source datasheets under `docs/motors/` without changing calculator behavior.

**Architecture:** Keep the current calculation-facing `ServoMotor` contract intact for required fields and add only
optional metadata fields plus optional curve point arrays. Preserve current runtime behavior by keeping validation
backward-compatible and treating the richer dataset as passive metadata for now.

**Tech Stack:** TypeScript, Svelte 5, Vitest, Astro, pnpm

---

## File Map

| File                                                  | Action | Responsibility                                                           |
| ----------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `src/components/calculator/actuator-sizing/types.ts`  | Modify | Extend `ServoMotor` with optional catalog metadata and curve point types |
| `src/components/calculator/actuator-sizing/motors.ts` | Modify | Expand built-in catalog and keep localStorage validation compatible      |
| `src/tests/actuator-sizing/motors.test.ts`            | Create | Protect schema/validation compatibility and dataset invariants           |
| `docs/motors/`                                        | Create | Vendor source datasheets and stable source paths                         |

---

## Task 1: Extend Shared Motor Types

**Files:**

- Modify: `src/components/calculator/actuator-sizing/types.ts`
- Test: `src/tests/actuator-sizing/motors.test.ts`

- [ ] **Step 1: Write the failing test for richer optional motor metadata**

```typescript
import { describe, expect, it } from 'vitest';
import type { ServoMotor } from '../../components/calculator/actuator-sizing/types';

describe('ServoMotor catalog metadata', () => {
  it('accepts optional metadata fields without affecting required calculator fields', () => {
    const motor: ServoMotor = {
      id: 'metadata-smoke-test',
      name: 'Metadata Smoke Test',
      manufacturer: 'Test Vendor',
      motorType: 'ac-servo',
      series: 'Example Series',
      ratedRPM: 3000,
      maxRPM: 5000,
      ratedTorque_Nm: 1.27,
      peakTorque_Nm: 3.81,
      continuousPower_W: 400,
      inertia_kgm2: 2.9e-5,
      dimensions_mm: { width: 60, height: 60, length: 123 },
      torqueCurve: [
        { rpm: 0, torque_Nm: 3.8 },
        { rpm: 3000, torque_Nm: 1.27 },
      ],
      source: 'builtin',
    };

    expect(motor.motorType).toBe('ac-servo');
    expect(motor.dimensions_mm?.length).toBe(123);
    expect(motor.torqueCurve?.[1]?.torque_Nm).toBe(1.27);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails for missing type fields**

Run: `pnpm vitest run src/tests/actuator-sizing/motors.test.ts` Expected: FAIL with TypeScript errors for missing
`motorType`, `dimensions_mm`, or `torqueCurve` definitions.

- [ ] **Step 3: Add the minimal new optional type definitions**

```typescript
export type MotorType = 'ac-servo' | 'dc-servo' | 'bldc' | 'stepper' | 'closed-loop-stepper';

export interface MotorDimensionsMm {
  width: number;
  height: number;
  length: number;
}

export interface TorqueCurvePoint {
  rpm: number;
  torque_Nm: number;
}

export interface SpeedTorqueCurvePoint {
  rpm: number;
  continuousTorque_Nm?: number;
  peakTorque_Nm?: number;
}

export interface ServoMotor {
  id: string;
  name: string;
  manufacturer?: string;
  motorType?: MotorType;
  series?: string;
  model?: string;
  ratedRPM: number;
  maxRPM: number;
  ratedTorque_Nm: number;
  peakTorque_Nm: number;
  continuousPower_W: number;
  inertia_kgm2: number;
  mass_kg?: number;
  frameSize_mm?: number;
  length_mm?: number;
  flange_mm?: number;
  dimensions_mm?: MotorDimensionsMm;
  shaftDiameter_mm?: number;
  shaftLength_mm?: number;
  voltage_V?: number;
  current_A?: number;
  phases?: number;
  poleCount?: number;
  encoder?: string;
  protectionRating?: string;
  insulationClass?: string;
  cooling?: string;
  resistance_ohm?: number;
  inductance_mH?: number;
  hasBrake?: boolean;
  thermalTimeConstant_s?: number;
  price_usd?: number;
  datasheetUrl?: string;
  productUrl?: string;
  sourceNote?: string;
  torqueCurve?: TorqueCurvePoint[];
  speedTorqueCurve?: SpeedTorqueCurvePoint[];
  notes?: string;
  source: 'builtin' | 'user';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/tests/actuator-sizing/motors.test.ts` Expected: PASS

---

## Task 2: Protect localStorage Compatibility and Dataset Invariants

**Files:**

- Modify: `src/components/calculator/actuator-sizing/motors.ts`
- Test: `src/tests/actuator-sizing/motors.test.ts`

- [ ] **Step 1: Add failing tests for user-motor compatibility and catalog coverage**

```typescript
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BUILTIN_SERVO_MOTORS,
  loadUserServoMotors,
  saveUserServoMotors,
} from '../../components/calculator/actuator-sizing/motors';

describe('motor catalog storage', () => {
  beforeEach(() => localStorage.clear());

  it('loads legacy user motors that only contain the original required fields', () => {
    localStorage.setItem(
      'actuator-sizing-user-motors',
      JSON.stringify([
        {
          id: 'legacy-user-motor',
          name: 'Legacy User Motor',
          ratedRPM: 3000,
          maxRPM: 4500,
          ratedTorque_Nm: 1.27,
          peakTorque_Nm: 3.81,
          continuousPower_W: 400,
          inertia_kgm2: 2.9e-5,
          source: 'user',
        },
      ])
    );

    expect(loadUserServoMotors()).toHaveLength(1);
  });

  it('contains at least 30 built-in motors between 200 W and 1000 W', () => {
    expect(BUILTIN_SERVO_MOTORS.length).toBeGreaterThanOrEqual(30);
    expect(
      BUILTIN_SERVO_MOTORS.every((motor) => motor.continuousPower_W >= 200 && motor.continuousPower_W <= 1000)
    ).toBe(true);
  });

  it('keeps built-in entries source-backed', () => {
    expect(BUILTIN_SERVO_MOTORS.every((motor) => motor.datasheetUrl || motor.sourceNote)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails against the old catalog**

Run: `pnpm vitest run src/tests/actuator-sizing/motors.test.ts` Expected: FAIL because the current built-in list is too
small and lacks datasheet metadata.

- [ ] **Step 3: Update validation minimally and expand the built-in dataset**

```typescript
function isValidServoMotor(value: unknown): value is ServoMotor {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const motor = value as Record<string, unknown>;
  return (
    typeof motor.id === 'string' &&
    typeof motor.name === 'string' &&
    typeof motor.ratedRPM === 'number' &&
    typeof motor.maxRPM === 'number' &&
    typeof motor.ratedTorque_Nm === 'number' &&
    typeof motor.peakTorque_Nm === 'number' &&
    typeof motor.continuousPower_W === 'number' &&
    typeof motor.inertia_kgm2 === 'number' &&
    motor.source === 'user'
  );
}

export const BUILTIN_SERVO_MOTORS: ReadonlyArray<ServoMotor> = [
  {
    id: 'vendor-model-400w',
    name: 'Vendor Model (400W)',
    manufacturer: 'Vendor',
    motorType: 'ac-servo',
    ratedRPM: 3000,
    maxRPM: 5000,
    ratedTorque_Nm: 1.27,
    peakTorque_Nm: 3.81,
    continuousPower_W: 400,
    inertia_kgm2: 2.9e-5,
    datasheetUrl: '/docs/motors/vendor/model/datasheet.pdf',
    sourceNote: 'Vendor datasheet, rev YYYY-MM',
    source: 'builtin',
  },
  // ...expand to roughly 30-50 real source-backed motors...
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/tests/actuator-sizing/motors.test.ts` Expected: PASS

---

## Task 3: Vendor Datasheets Into the Repository

**Files:**

- Create: `docs/motors/`
- Modify: `src/components/calculator/actuator-sizing/motors.ts`

- [ ] **Step 1: Create stable manufacturer/model directories and add source files**

```text
docs/motors/
  delta/ecma-c20807/datasheet.pdf
  jmc/ihss57-400w/datasheet.pdf
  leadshine/el5-d507/datasheet.pdf
  steppperonline/nema34-1000w/datasheet.pdf
```

- [ ] **Step 2: Point catalog entries at vendored sources**

```typescript
{
  id: 'delta-ecma-c20807-750w',
  name: 'Delta ECMA-C20807 (750W)',
  manufacturer: 'Delta',
  series: 'ECMA-C2',
  ratedRPM: 3000,
  maxRPM: 5000,
  ratedTorque_Nm: 2.39,
  peakTorque_Nm: 7.16,
  continuousPower_W: 750,
  inertia_kgm2: 1.13e-4,
  datasheetUrl: 'docs/motors/delta/ecma-c20807/datasheet.pdf',
  sourceNote: 'Vendored Delta ECMA-C2 catalog PDF',
  source: 'builtin',
}
```

- [ ] **Step 3: Verify each built-in entry resolves to a source path or source note**

Run: `pnpm vitest run src/tests/actuator-sizing/motors.test.ts -t "keeps built-in entries source-backed"` Expected: PASS

---

## Task 4: Full Verification

**Files:**

- Modify: `src/components/calculator/actuator-sizing/types.ts`
- Modify: `src/components/calculator/actuator-sizing/motors.ts`
- Create: `src/tests/actuator-sizing/motors.test.ts`
- Create: `docs/motors/`

- [ ] **Step 1: Run the focused actuator-sizing tests**

Run: `pnpm vitest run src/tests/actuator-sizing/*.test.ts` Expected: PASS

- [ ] **Step 2: Run the full project verification**

Run: `pnpm build` Expected: PASS with Astro check and production build completing successfully

- [ ] **Step 3: Review changed files**

Run: `git status --short` Expected: only the intended type, motor catalog, test, and `docs/motors/` changes appear
