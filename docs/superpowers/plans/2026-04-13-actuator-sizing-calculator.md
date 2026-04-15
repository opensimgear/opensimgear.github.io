# Actuator Motor Sizing Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an engineering-grade motor selection calculator for ball-screw linear actuators supporting dynamic
motion profiles, multi-actuator configurations, and ranked motor evaluation.

**Architecture:** Pure TypeScript calculation modules (profile → forces → dynamics → evaluation) with a Svelte UI
component using the same split-panel calculator pattern as the current actuator-sizing widget. All calculation logic is
unit-tested independently of the UI.

**Tech Stack:** TypeScript, Svelte 5, Vitest, svelte-tweakpane-ui, Tailwind CSS, Astro

---

## File Map

| File                                                      | Action | Responsibility                            |
| --------------------------------------------------------- | ------ | ----------------------------------------- |
| `src/components/calculator/actuator-sizing/types.ts`      | Create | All shared interfaces/types               |
| `src/components/calculator/actuator-sizing/profile.ts`    | Create | Trapezoidal motion profile timing         |
| `src/components/calculator/actuator-sizing/forces.ts`     | Create | Axial force + multi-actuator distribution |
| `src/components/calculator/actuator-sizing/dynamics.ts`   | Create | Inertia, torque, speed, power, RMS        |
| `src/components/calculator/actuator-sizing/evaluation.ts` | Create | Motor evaluation, scoring, ranking        |
| `src/components/calculator/actuator-sizing/motors.ts`     | Create | Servo motor database                      |
| `src/components/calculator/actuator-sizing/index.svelte`  | Create | Main UI component                         |
| `src/tests/actuator-sizing/profile.test.ts`               | Create | Tests for profile.ts                      |
| `src/tests/actuator-sizing/forces.test.ts`                | Create | Tests for forces.ts                       |
| `src/tests/actuator-sizing/dynamics.test.ts`              | Create | Tests for dynamics.ts                     |
| `src/tests/actuator-sizing/evaluation.test.ts`            | Create | Tests for evaluation.ts                   |
| `src/content/docs/calculators/actuator-sizing.mdx`        | Create | Documentation page                        |

---

## Task 1: Define Shared Types

**Files:**

- Create: `src/components/calculator/actuator-sizing/types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// src/components/calculator/actuator-sizing/types.ts

export type AxisOrientation = 'horizontal' | 'vertical' | 'inclined';
export type SystemType = 'single' | '4actuator' | 'stewart';
export type ProfileType = 'trapezoidal' | 'scurve';

export interface TrapezoidalProfileResult {
  t_accel_s: number;
  t_const_s: number;
  t_decel_s: number;
  v_peak_m_s: number;
  /** True when stroke is too short to reach maxVelocity */
  isTriangular: boolean;
}

export interface PhaseTorques {
  T_accel_Nm: number;
  T_const_Nm: number;
  T_decel_Nm: number;
  T_hold_Nm: number;
  T_rms_Nm: number;
  T_peak_Nm: number;
  n_motor_rpm: number;
  P_peak_W: number;
}

export interface ServoMotor {
  id: string;
  name: string;
  manufacturer?: string;
  ratedRPM: number;
  maxRPM: number;
  ratedTorque_Nm: number;
  peakTorque_Nm: number;
  continuousPower_W: number;
  inertia_kgm2: number;
  mass_kg?: number;
  frameSize_mm?: number;
  hasBrake?: boolean;
  thermalTimeConstant_s?: number;
  cost_usd?: number;
  source: 'builtin' | 'user';
}

export interface MotorEvaluationV2 {
  motor: ServoMotor;
  T_peak_required_Nm: number;
  T_rms_required_Nm: number;
  n_required_rpm: number;
  P_peak_required_W: number;
  J_load_kgm2: number;
  J_total_kgm2: number;
  inertiaRatio: number;
  peakTorqueMargin_pct: number;
  rmsTorqueMargin_pct: number;
  speedMargin_pct: number;
  status: 'pass' | 'warn' | 'fail';
  score: number;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm astro check 2>&1 | head -20` Expected: No errors in the new file (may show pre-existing errors in other
files)

- [ ] **Step 3: Commit**

```bash
git add src/components/calculator/actuator-sizing/types.ts
git commit -m "feat(actuator-sizing): add shared types"
```

---

## Task 2: Motion Profile Calculations

**Files:**

- Create: `src/components/calculator/actuator-sizing/profile.ts`
- Create: `src/tests/actuator-sizing/profile.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/tests/actuator-sizing/profile.test.ts
import { describe, it, expect } from 'vitest';
import { computeTrapezoidalProfile } from '../../components/calculator/actuator-sizing/profile';

describe('computeTrapezoidalProfile', () => {
  it('returns correct phase times for a standard trapezoidal profile', () => {
    // stroke=1m, v_max=0.5 m/s, a=2 m/s², d=2 m/s²
    // t_a = 0.5/2 = 0.25s; t_d = 0.25s
    // d_accel = 0.5*0.5*0.25 = 0.0625m; d_decel = 0.0625m
    // d_const = 1 - 0.125 = 0.875m; t_const = 0.875/0.5 = 1.75s
    const r = computeTrapezoidalProfile(1.0, 0.5, 2.0, 2.0);
    expect(r.t_accel_s).toBeCloseTo(0.25);
    expect(r.t_const_s).toBeCloseTo(1.75);
    expect(r.t_decel_s).toBeCloseTo(0.25);
    expect(r.v_peak_m_s).toBeCloseTo(0.5);
    expect(r.isTriangular).toBe(false);
  });

  it('sets isTriangular=true when stroke is too short to reach v_max', () => {
    // stroke=0.01m, v_max=0.5 m/s: can't reach v_max
    const r = computeTrapezoidalProfile(0.01, 0.5, 2.0, 2.0);
    expect(r.isTriangular).toBe(true);
    expect(r.t_const_s).toBeCloseTo(0);
    expect(r.v_peak_m_s).toBeLessThan(0.5);
  });

  it('triangular profile covers the full stroke', () => {
    const stroke = 0.05;
    const r = computeTrapezoidalProfile(stroke, 0.5, 2.0, 3.0);
    const d_covered = 0.5 * r.v_peak_m_s * r.t_accel_s + 0.5 * r.v_peak_m_s * r.t_decel_s;
    expect(d_covered).toBeCloseTo(stroke, 6);
  });

  it('handles asymmetric acceleration and deceleration', () => {
    // stroke=2m, v_max=0.4, a=1.0, d=2.0
    // t_a = 0.4s, t_d = 0.2s; d_accel=0.08m, d_decel=0.04m; t_const=(2-0.12)/0.4=4.7s
    const r = computeTrapezoidalProfile(2.0, 0.4, 1.0, 2.0);
    expect(r.t_accel_s).toBeCloseTo(0.4);
    expect(r.t_decel_s).toBeCloseTo(0.2);
    expect(r.t_const_s).toBeCloseTo(4.7);
    expect(r.isTriangular).toBe(false);
  });

  it('total motion distance equals stroke for trapezoidal', () => {
    const stroke = 0.8;
    const r = computeTrapezoidalProfile(stroke, 0.3, 5.0, 5.0);
    const d = 0.5 * r.v_peak_m_s * r.t_accel_s + r.v_peak_m_s * r.t_const_s + 0.5 * r.v_peak_m_s * r.t_decel_s;
    expect(d).toBeCloseTo(stroke, 6);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm vitest run src/tests/actuator-sizing/profile.test.ts` Expected: FAIL — "Cannot find module
'../../components/calculator/actuator-sizing/profile'"

- [ ] **Step 3: Implement profile.ts**

```typescript
// src/components/calculator/actuator-sizing/profile.ts
import type { TrapezoidalProfileResult } from './types';

/**
 * Compute the time segments of a trapezoidal (or triangular fallback) motion profile.
 * If the stroke is too short to reach maxVelocity, a triangular profile is computed
 * using the highest achievable peak velocity.
 */
export function computeTrapezoidalProfile(
  strokeLength_m: number,
  maxVelocity_m_s: number,
  acceleration_m_s2: number,
  deceleration_m_s2: number
): TrapezoidalProfileResult {
  const t_a = maxVelocity_m_s / acceleration_m_s2;
  const t_d = maxVelocity_m_s / deceleration_m_s2;
  const d_accel = 0.5 * maxVelocity_m_s * t_a;
  const d_decel = 0.5 * maxVelocity_m_s * t_d;
  const d_const = strokeLength_m - d_accel - d_decel;

  if (d_const >= 0) {
    return {
      t_accel_s: t_a,
      t_const_s: d_const / maxVelocity_m_s,
      t_decel_s: t_d,
      v_peak_m_s: maxVelocity_m_s,
      isTriangular: false,
    };
  }

  // Triangular fallback: stroke = 0.5 * v² * (1/a + 1/d)
  const v_peak = Math.sqrt((2 * strokeLength_m) / (1 / acceleration_m_s2 + 1 / deceleration_m_s2));
  return {
    t_accel_s: v_peak / acceleration_m_s2,
    t_const_s: 0,
    t_decel_s: v_peak / deceleration_m_s2,
    v_peak_m_s: v_peak,
    isTriangular: true,
  };
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `pnpm vitest run src/tests/actuator-sizing/profile.test.ts` Expected: PASS — 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator/actuator-sizing/profile.ts src/tests/actuator-sizing/profile.test.ts
git commit -m "feat(actuator-sizing): motion profile timing calculations"
```

---

## Task 3: Axial Force Calculations

**Files:**

- Create: `src/components/calculator/actuator-sizing/forces.ts`
- Create: `src/tests/actuator-sizing/forces.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/tests/actuator-sizing/forces.test.ts
import { describe, it, expect } from 'vitest';
import {
  computeGravityForce,
  computeStaticForce,
  computeHoldingForce,
  computeForcePerActuator,
} from '../../components/calculator/actuator-sizing/forces';

const G = 9.81;

describe('computeGravityForce', () => {
  it('returns 0 for horizontal orientation', () => {
    expect(computeGravityForce(100, 'horizontal', 0)).toBe(0);
  });

  it('returns m*g for vertical orientation', () => {
    expect(computeGravityForce(50, 'vertical', 0)).toBeCloseTo(50 * G);
  });

  it('returns m*g*sin(angle) for inclined orientation', () => {
    // 30 degrees: sin(30°) = 0.5
    expect(computeGravityForce(100, 'inclined', 30)).toBeCloseTo(100 * G * 0.5, 3);
  });

  it('returns m*g for inclined at 90 degrees (vertical)', () => {
    expect(computeGravityForce(100, 'inclined', 90)).toBeCloseTo(100 * G, 3);
  });
});

describe('computeStaticForce', () => {
  it('sums gravity, friction, external, and guide forces', () => {
    // vertical, mass=50, friction=100, external=50, guide=20
    const F = computeStaticForce(50, 'vertical', 0, 100, 50, 20);
    expect(F).toBeCloseTo(50 * G + 100 + 50 + 20, 3);
  });

  it('returns only friction+external+guide for horizontal axis', () => {
    const F = computeStaticForce(100, 'horizontal', 0, 80, 30, 10);
    expect(F).toBeCloseTo(80 + 30 + 10);
  });
});

describe('computeHoldingForce', () => {
  it('excludes friction (zero at rest)', () => {
    // vertical, mass=50, guide=20 — no friction
    const F = computeHoldingForce(50, 'vertical', 0, 20);
    expect(F).toBeCloseTo(50 * G + 20, 3);
  });

  it('returns 0 for horizontal axis with no guide preload', () => {
    expect(computeHoldingForce(100, 'horizontal', 0, 0)).toBe(0);
  });
});

describe('computeForcePerActuator', () => {
  it('returns F_total * imbalance for single actuator', () => {
    expect(computeForcePerActuator(1000, 'single', 1.2, 0)).toBeCloseTo(1200);
  });

  it('divides by 4 for 4-actuator system', () => {
    expect(computeForcePerActuator(1000, '4actuator', 1.0, 0)).toBeCloseTo(250);
  });

  it('applies imbalance factor for 4-actuator', () => {
    expect(computeForcePerActuator(1000, '4actuator', 1.2, 0)).toBeCloseTo(300);
  });

  it('divides by 6*cos(angle) for Stewart platform', () => {
    // 45 degrees: cos(45°) = sqrt(2)/2 ≈ 0.7071
    const expected = (1000 / (6 * Math.cos(Math.PI / 4))) * 1.0;
    expect(computeForcePerActuator(1000, 'stewart', 1.0, 45)).toBeCloseTo(expected, 3);
  });

  it('applies imbalance factor for Stewart platform', () => {
    const expected = (1000 / (6 * Math.cos(Math.PI / 4))) * 1.2;
    expect(computeForcePerActuator(1000, 'stewart', 1.2, 45)).toBeCloseTo(expected, 3);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm vitest run src/tests/actuator-sizing/forces.test.ts` Expected: FAIL — "Cannot find module
'../../components/calculator/actuator-sizing/forces'"

- [ ] **Step 3: Implement forces.ts**

```typescript
// src/components/calculator/actuator-sizing/forces.ts
import type { AxisOrientation, SystemType } from './types';

const G = 9.81; // m/s²

/**
 * Gravity component of axial force for a given axis orientation.
 */
export function computeGravityForce(mass_kg: number, orientation: AxisOrientation, inclineAngle_deg: number): number {
  switch (orientation) {
    case 'horizontal':
      return 0;
    case 'vertical':
      return mass_kg * G;
    case 'inclined':
      return mass_kg * G * Math.sin((inclineAngle_deg * Math.PI) / 180);
  }
}

/**
 * Total static axial force during motion (gravity + friction + external loads).
 * Does not include inertia — that is captured in J_total × α.
 */
export function computeStaticForce(
  mass_kg: number,
  orientation: AxisOrientation,
  inclineAngle_deg: number,
  frictionForce_N: number,
  externalForce_N: number,
  guidePreloadForce_N: number
): number {
  return (
    computeGravityForce(mass_kg, orientation, inclineAngle_deg) +
    frictionForce_N +
    externalForce_N +
    guidePreloadForce_N
  );
}

/**
 * Axial force while holding at rest (no kinetic friction, no inertia).
 */
export function computeHoldingForce(
  mass_kg: number,
  orientation: AxisOrientation,
  inclineAngle_deg: number,
  guidePreloadForce_N: number
): number {
  return computeGravityForce(mass_kg, orientation, inclineAngle_deg) + guidePreloadForce_N;
}

/**
 * Distribute total system force to a single actuator.
 *
 * - single:    F_total × imbalanceFactor
 * - 4actuator: (F_total / 4) × imbalanceFactor  (PRD §5.2.1)
 * - stewart:   (F_total / (6 × cos θ)) × imbalanceFactor  (PRD §5.2.2)
 */
export function computeForcePerActuator(
  F_total_N: number,
  systemType: SystemType,
  imbalanceFactor: number,
  actuatorAngle_deg: number
): number {
  switch (systemType) {
    case 'single':
      return F_total_N * imbalanceFactor;
    case '4actuator':
      return (F_total_N / 4) * imbalanceFactor;
    case 'stewart':
      return (F_total_N / (6 * Math.cos((actuatorAngle_deg * Math.PI) / 180))) * imbalanceFactor;
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `pnpm vitest run src/tests/actuator-sizing/forces.test.ts` Expected: PASS — 9 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator/actuator-sizing/forces.ts src/tests/actuator-sizing/forces.test.ts
git commit -m "feat(actuator-sizing): axial force and multi-actuator distribution"
```

---

## Task 4: Dynamics Calculations

**Files:**

- Create: `src/components/calculator/actuator-sizing/dynamics.ts`
- Create: `src/tests/actuator-sizing/dynamics.test.ts`

- [ ] **Step 1: Write the failing tests**

Reference values for this test suite (derived manually):

- mass=50 kg, lead=0.01 m, gearRatio=1, screwDia=0.016 m, screwLen=0.5 m
- screwMass = 7850 × π × 0.008² × 0.5 ≈ 0.7892 kg
- J_screw_rot = 0.5 × 0.7892 × 0.008² = 2.525e-5 kg·m²
- J_load = 50 × (0.01 / (2π))² ≈ 1.267e-4 kg·m²
- J_total (J_motor=3e-5, J_gear=0) = 3e-5 + 0 + 2.525e-5 + 1.267e-4 = 1.845e-4 kg·m²
- α_motor (a=5) = 5 × 2π × 1 / 0.01 = 3141.6 rad/s²
- T_screw (F_static=50 N, η_screw=0.9) = 50×0.01/(2π×0.9×1×1) = 0.08842 Nm
- T_acc = 0.08842 + 1.845e-4 × 3141.6 = 0.08842 + 0.5796 = 0.6680 Nm
- T_dec = 0.08842 - 0.5796 = -0.4912 Nm
- n_motor (v=0.3 m/s) = 0.3/0.01 × 1 × 60 = 1800 rpm
- T_rms (t_a=0.06, t_v=1.607, t_d=0.06, t_dwell=0.1, T_hold=0):
  - numer = 0.6680²×0.06 + 0.08842²×1.607 + 0.4912²×0.06 + 0
  - = 0.02677 + 0.01257 + 0.01448 = 0.05382
  - T_rms = sqrt(0.05382 / 1.827) = 0.1716 Nm

```typescript
// src/tests/actuator-sizing/dynamics.test.ts
import { describe, it, expect } from 'vitest';
import {
  computeScrewMass,
  computeScrewRotationalInertia,
  computeLoadInertia,
  computeTotalInertia,
  computeMotorSpeedRPM,
  computeAngularAcceleration,
  computeScrewTorque,
  computePhaseTorques,
  STEEL_DENSITY_KG_M3,
} from '../../components/calculator/actuator-sizing/dynamics';

describe('computeScrewMass', () => {
  it('returns ρ·π·r²·L for steel', () => {
    const r = 0.008; // 16mm dia
    const l = 0.5;
    const expected = STEEL_DENSITY_KG_M3 * Math.PI * r * r * l;
    expect(computeScrewMass(16, 500)).toBeCloseTo(expected, 5);
  });
});

describe('computeScrewRotationalInertia', () => {
  it('returns 0.5 * m * r²', () => {
    expect(computeScrewRotationalInertia(1.0, 0.01)).toBeCloseTo(0.5 * 1.0 * 0.01 * 0.01, 10);
  });
});

describe('computeLoadInertia', () => {
  it('returns m * (lead / (2π * i))²', () => {
    const expected = 50 * Math.pow(0.01 / (2 * Math.PI * 1), 2);
    expect(computeLoadInertia(50, 0.01, 1)).toBeCloseTo(expected, 10);
  });

  it('decreases with higher gear ratio', () => {
    const j1 = computeLoadInertia(50, 0.01, 1);
    const j2 = computeLoadInertia(50, 0.01, 2);
    expect(j2).toBeCloseTo(j1 / 4, 10);
  });
});

describe('computeTotalInertia', () => {
  it('sums J_motor + J_gear + J_screw_reflected + J_load', () => {
    // J_screw_rot = 2.525e-5 at screw shaft → reflected = 2.525e-5 / 1² = 2.525e-5
    // J_load = 1.267e-4
    const J_screw_rot = 0.5 * 0.7892 * 0.008 * 0.008;
    const J_load = computeLoadInertia(50, 0.01, 1);
    const J_total = computeTotalInertia(3e-5, 0, J_screw_rot, J_load, 1);
    expect(J_total).toBeCloseTo(3e-5 + 0 + J_screw_rot + J_load, 10);
  });

  it('reflects J_screw_rot through gear ratio squared', () => {
    const J_screw_rot = 1e-4;
    const j1 = computeTotalInertia(0, 0, J_screw_rot, 0, 1);
    const j2 = computeTotalInertia(0, 0, J_screw_rot, 0, 2);
    expect(j1).toBeCloseTo(1e-4, 10);
    expect(j2).toBeCloseTo(1e-4 / 4, 10);
  });
});

describe('computeMotorSpeedRPM', () => {
  it('returns (v / lead) * gearRatio * 60', () => {
    // v=0.3 m/s, lead=0.01 m, ratio=1 → 1800 rpm
    expect(computeMotorSpeedRPM(0.3, 0.01, 1)).toBeCloseTo(1800);
  });

  it('scales linearly with gear ratio', () => {
    expect(computeMotorSpeedRPM(0.3, 0.01, 2)).toBeCloseTo(3600);
  });
});

describe('computeAngularAcceleration', () => {
  it('returns a * 2π * gearRatio / lead', () => {
    // a=5, lead=0.01, ratio=1 → 5 * 2π / 0.01 = 3141.59 rad/s²
    expect(computeAngularAcceleration(5, 0.01, 1)).toBeCloseTo((5 * 2 * Math.PI) / 0.01, 3);
  });
});

describe('computeScrewTorque', () => {
  it('returns F * lead / (2π * η_screw * i * η_gear)', () => {
    // F=50, lead=0.01, η=0.9, i=1, η_gear=1 → 50*0.01/(2π*0.9) ≈ 0.08842 Nm
    expect(computeScrewTorque(50, 0.01, 0.9, 1, 1)).toBeCloseTo(0.08842, 4);
  });

  it('decreases with higher gear ratio', () => {
    const t1 = computeScrewTorque(100, 0.01, 0.9, 1, 1);
    const t2 = computeScrewTorque(100, 0.01, 0.9, 2, 1);
    expect(t2).toBeCloseTo(t1 / 2, 5);
  });

  it('increases when efficiency is lower', () => {
    const t90 = computeScrewTorque(100, 0.01, 0.9, 1, 1);
    const t80 = computeScrewTorque(100, 0.01, 0.8, 1, 1);
    expect(t80).toBeGreaterThan(t90);
  });
});

describe('computePhaseTorques', () => {
  // Reference setup (see test file header comment)
  const J_screw_rot = 0.5 * computeScrewMass(16, 500) * 0.008 * 0.008;
  const J_load = computeLoadInertia(50, 0.01, 1);
  const J_total = computeTotalInertia(3e-5, 0, J_screw_rot, J_load, 1);

  const result = computePhaseTorques(
    50, // F_static_N (friction only, horizontal)
    0, // F_hold_N (horizontal, no holding needed)
    J_total,
    5, // acceleration_m_s2
    5, // deceleration_m_s2
    0.3, // v_peak_m_s
    0.01, // lead_m
    1, // gearRatio
    1.0, // gearEfficiency
    0.9, // screwEfficiency
    0.06, // t_accel_s
    1.607, // t_const_s
    0.06, // t_decel_s
    0.1 // dwellTime_s
  );

  it('T_accel includes inertial torque (> T_const)', () => {
    expect(result.T_accel_Nm).toBeGreaterThan(result.T_const_Nm);
    expect(result.T_accel_Nm).toBeCloseTo(0.668, 2);
  });

  it('T_const equals screw torque from static load only', () => {
    expect(result.T_const_Nm).toBeCloseTo(0.08842, 3);
  });

  it('T_decel is negative for horizontal axis (regenerating)', () => {
    expect(result.T_decel_Nm).toBeLessThan(0);
    expect(result.T_decel_Nm).toBeCloseTo(-0.4912, 2);
  });

  it('T_peak equals max absolute phase torque', () => {
    expect(result.T_peak_Nm).toBeCloseTo(0.668, 2);
  });

  it('T_rms is positive and less than T_peak', () => {
    expect(result.T_rms_Nm).toBeGreaterThan(0);
    expect(result.T_rms_Nm).toBeLessThan(result.T_peak_Nm);
    expect(result.T_rms_Nm).toBeCloseTo(0.1716, 3);
  });

  it('motor speed is correct', () => {
    expect(result.n_motor_rpm).toBeCloseTo(1800);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm vitest run src/tests/actuator-sizing/dynamics.test.ts` Expected: FAIL — "Cannot find module
'../../components/calculator/actuator-sizing/dynamics'"

- [ ] **Step 3: Implement dynamics.ts**

```typescript
// src/components/calculator/actuator-sizing/dynamics.ts
import type { PhaseTorques } from './types';

export const STEEL_DENSITY_KG_M3 = 7850;

/** Mass of a solid steel cylinder (ball screw approximation). */
export function computeScrewMass(diameter_mm: number, length_mm: number, density = STEEL_DENSITY_KG_M3): number {
  const r_m = diameter_mm / 2 / 1000;
  const l_m = length_mm / 1000;
  return density * Math.PI * r_m * r_m * l_m;
}

/** Rotational inertia of the screw shaft (solid cylinder) at the screw shaft. */
export function computeScrewRotationalInertia(mass_kg: number, radius_m: number): number {
  return 0.5 * mass_kg * radius_m * radius_m;
}

/**
 * Linear load inertia reflected to the motor shaft.
 * J = m × (lead / (2π × gearRatio))²
 */
export function computeLoadInertia(mass_kg: number, lead_m: number, gearRatio: number): number {
  const effective = lead_m / (2 * Math.PI * gearRatio);
  return mass_kg * effective * effective;
}

/**
 * Total inertia at the motor shaft.
 * J_screw_rot is at the SCREW shaft — this function reflects it through gearRatio².
 * J_load must already be reflected (use computeLoadInertia).
 */
export function computeTotalInertia(
  J_motor_kgm2: number,
  J_gear_kgm2: number,
  J_screw_rot_kgm2: number,
  J_load_kgm2: number,
  gearRatio: number
): number {
  return J_motor_kgm2 + J_gear_kgm2 + J_screw_rot_kgm2 / (gearRatio * gearRatio) + J_load_kgm2;
}

/** Motor shaft speed in RPM for a given linear velocity. */
export function computeMotorSpeedRPM(velocity_m_s: number, lead_m: number, gearRatio: number): number {
  return (velocity_m_s / lead_m) * gearRatio * 60;
}

/** Motor shaft angular acceleration [rad/s²] for a given linear acceleration. */
export function computeAngularAcceleration(linear_accel_m_s2: number, lead_m: number, gearRatio: number): number {
  return (linear_accel_m_s2 * 2 * Math.PI * gearRatio) / lead_m;
}

/**
 * Motor shaft torque required to overcome an axial force through the screw.
 * T = F × lead / (2π × η_screw × gearRatio × η_gear)
 */
export function computeScrewTorque(
  force_N: number,
  lead_m: number,
  screwEfficiency: number,
  gearRatio: number,
  gearEfficiency: number
): number {
  return (force_N * lead_m) / (2 * Math.PI * screwEfficiency * gearRatio * gearEfficiency);
}

/**
 * Compute all phase torques for a trapezoidal motion cycle.
 *
 * Physical model (no double-counting):
 * - F_static_N: static load force (gravity + friction + external). Does NOT include inertia.
 * - Inertia forces come from J_total × angular_acceleration.
 * - T_decel can be negative (regenerative braking), contributes T² to RMS heating.
 */
export function computePhaseTorques(
  F_static_N: number,
  F_hold_N: number,
  J_total_kgm2: number,
  acceleration_m_s2: number,
  deceleration_m_s2: number,
  v_peak_m_s: number,
  lead_m: number,
  gearRatio: number,
  gearEfficiency: number,
  screwEfficiency: number,
  t_accel_s: number,
  t_const_s: number,
  t_decel_s: number,
  dwellTime_s: number
): PhaseTorques {
  const T_load = computeScrewTorque(F_static_N, lead_m, screwEfficiency, gearRatio, gearEfficiency);
  const T_hold = computeScrewTorque(F_hold_N, lead_m, screwEfficiency, gearRatio, gearEfficiency);

  const alpha_acc = computeAngularAcceleration(acceleration_m_s2, lead_m, gearRatio);
  const alpha_dec = computeAngularAcceleration(deceleration_m_s2, lead_m, gearRatio);

  const T_accel = T_load + J_total_kgm2 * alpha_acc;
  const T_const = T_load;
  const T_decel = T_load - J_total_kgm2 * alpha_dec; // may be negative (regenerative)

  const t_total = t_accel_s + t_const_s + t_decel_s + dwellTime_s;
  const T_rms = Math.sqrt(
    (T_accel ** 2 * t_accel_s + T_const ** 2 * t_const_s + T_decel ** 2 * t_decel_s + T_hold ** 2 * dwellTime_s) /
      t_total
  );

  const T_peak = Math.max(Math.abs(T_accel), Math.abs(T_const), Math.abs(T_decel), Math.abs(T_hold));

  const n_motor_rpm = computeMotorSpeedRPM(v_peak_m_s, lead_m, gearRatio);
  const omega = (n_motor_rpm * 2 * Math.PI) / 60;
  const P_peak_W = T_peak * omega;

  return {
    T_accel_Nm: T_accel,
    T_const_Nm: T_const,
    T_decel_Nm: T_decel,
    T_hold_Nm: T_hold,
    T_rms_Nm: T_rms,
    T_peak_Nm: T_peak,
    n_motor_rpm,
    P_peak_W,
  };
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `pnpm vitest run src/tests/actuator-sizing/dynamics.test.ts` Expected: PASS — all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/calculator/actuator-sizing/dynamics.ts src/tests/actuator-sizing/dynamics.test.ts
git commit -m "feat(actuator-sizing): inertia, torque, speed, and RMS dynamics"
```

---

## Task 5: Motor Evaluation and Ranking

**Files:**

- Create: `src/components/calculator/actuator-sizing/evaluation.ts`
- Create: `src/tests/actuator-sizing/evaluation.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/tests/actuator-sizing/evaluation.test.ts
import { describe, it, expect } from 'vitest';
import {
  computeMargin,
  computeScore,
  evaluateMotorForActuator,
  rankMotors,
} from '../../components/calculator/actuator-sizing/evaluation';
import type { ServoMotor } from '../../components/calculator/actuator-sizing/types';

const testMotor: ServoMotor = {
  id: 'test',
  name: 'Test Servo',
  ratedRPM: 3000,
  maxRPM: 5000,
  ratedTorque_Nm: 2.0,
  peakTorque_Nm: 6.0,
  continuousPower_W: 600,
  inertia_kgm2: 3e-5,
  source: 'builtin',
};

// Reference: T_peak=0.668 Nm, T_rms=0.1716 Nm, n=1800 rpm, P=126 W
// J_load=1.267e-4, J_total=1.845e-4, safetyFactor=20%
// Required after safety: T_peak=0.8016, T_rms=0.2059, n=2160 rpm

describe('computeMargin', () => {
  it('returns positive percent when rated > required', () => {
    expect(computeMargin(120, 100)).toBeCloseTo(20);
  });
  it('returns negative percent when rated < required', () => {
    expect(computeMargin(80, 100)).toBeCloseTo(-20);
  });
  it('returns Infinity when required is 0 and rated > 0', () => {
    expect(computeMargin(5, 0)).toBe(Infinity);
  });
});

describe('computeScore', () => {
  it('returns a value between 0 and 150', () => {
    const s = computeScore(0.2, 2.0, 0.8, 6.0, 2160, 3000, 4.2);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(150);
  });

  it('gives higher score for better-utilized motor (closer to limits)', () => {
    const sBig = computeScore(0.2, 10.0, 0.8, 30.0, 2160, 10000, 4.2); // massively oversized
    const sFit = computeScore(0.2, 2.0, 0.8, 6.0, 2160, 3000, 4.2); // well-matched
    expect(sFit).toBeGreaterThan(sBig);
  });

  it('penalizes inertia ratio > 10', () => {
    const sNormal = computeScore(0.2, 2.0, 0.8, 6.0, 2160, 3000, 4); // ratio=4
    const sBad = computeScore(0.2, 2.0, 0.8, 6.0, 2160, 3000, 20); // ratio=20
    expect(sBad).toBeLessThan(sNormal);
  });
});

describe('evaluateMotorForActuator', () => {
  const result = evaluateMotorForActuator(
    testMotor,
    0.668, // T_peak_Nm
    0.1716, // T_rms_Nm
    1800, // n_rpm
    126, // P_peak_W
    1.267e-4, // J_load
    1.845e-4, // J_total
    20 // safetyFactor_pct
  );

  it('applies safety factor to required values', () => {
    expect(result.T_peak_required_Nm).toBeCloseTo(0.668 * 1.2, 3);
    expect(result.T_rms_required_Nm).toBeCloseTo(0.1716 * 1.2, 3);
    expect(result.n_required_rpm).toBeCloseTo(1800 * 1.2);
  });

  it('passes for a well-matched motor', () => {
    expect(result.status).toBe('pass');
  });

  it('has positive margins on all constraints', () => {
    expect(result.peakTorqueMargin_pct).toBeGreaterThan(0);
    expect(result.rmsTorqueMargin_pct).toBeGreaterThan(0);
    expect(result.speedMargin_pct).toBeGreaterThan(0);
  });

  it('computes inertia ratio correctly', () => {
    expect(result.inertiaRatio).toBeCloseTo(1.267e-4 / 3e-5, 3);
  });

  it('fails when peak torque is exceeded', () => {
    const r = evaluateMotorForActuator(testMotor, 10, 0.2, 1800, 126, 1.267e-4, 1.845e-4, 0);
    expect(r.status).toBe('fail');
    expect(r.peakTorqueMargin_pct).toBeLessThan(0);
  });

  it('fails when speed is exceeded', () => {
    const r = evaluateMotorForActuator(testMotor, 0.5, 0.2, 8000, 126, 1.267e-4, 1.845e-4, 0);
    expect(r.status).toBe('fail');
    expect(r.speedMargin_pct).toBeLessThan(0);
  });

  it('warns when inertia ratio > 10', () => {
    // Use high J_load to force inertia ratio > 10
    const J_load_high = testMotor.inertia_kgm2 * 15;
    const r = evaluateMotorForActuator(
      testMotor,
      0.5,
      0.2,
      1000,
      100,
      J_load_high,
      J_load_high + testMotor.inertia_kgm2,
      0
    );
    expect(r.status).toBe('warn');
    expect(r.inertiaRatio).toBeGreaterThan(10);
  });
});

describe('rankMotors', () => {
  const smallMotor: ServoMotor = {
    ...testMotor,
    id: 'small',
    name: 'Small',
    ratedTorque_Nm: 0.1,
    peakTorque_Nm: 0.3,
    maxRPM: 5000,
    inertia_kgm2: 1e-5,
  };
  const results = rankMotors([smallMotor, testMotor], 0.668, 0.1716, 1800, 126, 1.267e-4, 1.845e-4, 20);

  it('returns one result per motor', () => {
    expect(results).toHaveLength(2);
  });

  it('puts passing motors before failing ones', () => {
    expect(results[0].status).not.toBe('fail');
  });

  it('failing motor is last', () => {
    expect(results[results.length - 1].status).toBe('fail');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `pnpm vitest run src/tests/actuator-sizing/evaluation.test.ts` Expected: FAIL — "Cannot find module
'../../components/calculator/actuator-sizing/evaluation'"

- [ ] **Step 3: Implement evaluation.ts**

```typescript
// src/components/calculator/actuator-sizing/evaluation.ts
import type { ServoMotor, MotorEvaluationV2 } from './types';

export function computeMargin(rated: number, required: number): number {
  if (required === 0) return rated > 0 ? Infinity : 0;
  return ((rated - required) / required) * 100;
}

/**
 * Score 0–150 measuring how well the motor fits the requirements.
 * Higher = better utilization (motor is closer to its limits, fewer wasted watts).
 * Penalizes inertia ratios above 10:1.
 */
export function computeScore(
  T_rms_required: number,
  motor_ratedTorque: number,
  T_peak_required: number,
  motor_peakTorque: number,
  n_required: number,
  motor_maxRPM: number,
  inertiaRatio: number
): number {
  const rmsUtil = Math.min(T_rms_required / motor_ratedTorque, 1.5);
  const peakUtil = Math.min(T_peak_required / motor_peakTorque, 1.5);
  const speedUtil = Math.min(n_required / motor_maxRPM, 1.5);
  const inertiaPenalty = Math.max(0, inertiaRatio - 10) * 0.01;
  return Math.max(0, (0.4 * rmsUtil + 0.35 * peakUtil + 0.25 * speedUtil - inertiaPenalty) * 100);
}

export function evaluateMotorForActuator(
  motor: ServoMotor,
  T_peak_Nm: number,
  T_rms_Nm: number,
  n_rpm: number,
  P_peak_W: number,
  J_load_kgm2: number,
  J_total_kgm2: number,
  safetyFactor_pct: number
): MotorEvaluationV2 {
  const sf = 1 + safetyFactor_pct / 100;
  const T_peak_required = T_peak_Nm * sf;
  const T_rms_required = T_rms_Nm * sf;
  const n_required = n_rpm * sf;
  const P_peak_required = P_peak_W * sf;

  const inertiaRatio = J_load_kgm2 / motor.inertia_kgm2;

  const peakTorqueMargin_pct = computeMargin(motor.peakTorque_Nm, T_peak_required);
  const rmsTorqueMargin_pct = computeMargin(motor.ratedTorque_Nm, T_rms_required);
  const speedMargin_pct = computeMargin(motor.maxRPM, n_required);

  let status: 'pass' | 'warn' | 'fail';
  if (peakTorqueMargin_pct < 0 || speedMargin_pct < 0 || rmsTorqueMargin_pct < 0) {
    status = 'fail';
  } else if (peakTorqueMargin_pct < 20 || rmsTorqueMargin_pct < 20 || speedMargin_pct < 20 || inertiaRatio > 10) {
    status = 'warn';
  } else {
    status = 'pass';
  }

  const score = computeScore(
    T_rms_required,
    motor.ratedTorque_Nm,
    T_peak_required,
    motor.peakTorque_Nm,
    n_required,
    motor.maxRPM,
    inertiaRatio
  );

  return {
    motor,
    T_peak_required_Nm: T_peak_required,
    T_rms_required_Nm: T_rms_required,
    n_required_rpm: n_required,
    P_peak_required_W: P_peak_required,
    J_load_kgm2,
    J_total_kgm2,
    inertiaRatio,
    peakTorqueMargin_pct,
    rmsTorqueMargin_pct,
    speedMargin_pct,
    status,
    score,
  };
}

export function rankMotors(
  motors: ServoMotor[],
  T_peak_Nm: number,
  T_rms_Nm: number,
  n_rpm: number,
  P_peak_W: number,
  J_load_kgm2: number,
  J_total_kgm2: number,
  safetyFactor_pct: number
): MotorEvaluationV2[] {
  return motors
    .map((motor) =>
      evaluateMotorForActuator(motor, T_peak_Nm, T_rms_Nm, n_rpm, P_peak_W, J_load_kgm2, J_total_kgm2, safetyFactor_pct)
    )
    .sort((a, b) => {
      const order: Record<string, number> = { pass: 0, warn: 1, fail: 2 };
      const statusDiff = order[a.status] - order[b.status];
      if (statusDiff !== 0) return statusDiff;
      return b.score - a.score; // higher score = better fit among same status
    });
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `pnpm vitest run src/tests/actuator-sizing/evaluation.test.ts` Expected: PASS — all tests pass

- [ ] **Step 5: Run full test suite to check no regressions**

Run: `pnpm test` Expected: all existing tests plus new tests pass

- [ ] **Step 6: Commit**

```bash
git add src/components/calculator/actuator-sizing/evaluation.ts src/tests/actuator-sizing/evaluation.test.ts
git commit -m "feat(actuator-sizing): motor evaluation, scoring, and ranking"
```

---

## Task 6: Servo Motor Database

**Files:**

- Create: `src/components/calculator/actuator-sizing/motors.ts`

- [ ] **Step 1: Write the motors file**

```typescript
// src/components/calculator/actuator-sizing/motors.ts
import type { ServoMotor } from './types';

export const BUILTIN_SERVO_MOTORS: ReadonlyArray<ServoMotor> = [
  {
    id: 'jmc-ihss57-200w',
    name: 'JMC iHSS57 (200W)',
    manufacturer: 'JMC',
    ratedRPM: 3000,
    maxRPM: 4500,
    ratedTorque_Nm: 0.64,
    peakTorque_Nm: 1.92,
    continuousPower_W: 200,
    inertia_kgm2: 1.7e-5,
    mass_kg: 0.9,
    frameSize_mm: 57,
    source: 'builtin',
  },
  {
    id: 'jmc-ihss57-400w',
    name: 'JMC iHSS57 (400W)',
    manufacturer: 'JMC',
    ratedRPM: 3000,
    maxRPM: 4500,
    ratedTorque_Nm: 1.27,
    peakTorque_Nm: 3.81,
    continuousPower_W: 400,
    inertia_kgm2: 2.9e-5,
    mass_kg: 1.2,
    frameSize_mm: 57,
    source: 'builtin',
  },
  {
    id: 'jmc-ihss86-750w',
    name: 'JMC iHSS86 (750W)',
    manufacturer: 'JMC',
    ratedRPM: 3000,
    maxRPM: 4500,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 8.0e-5,
    mass_kg: 2.8,
    frameSize_mm: 86,
    source: 'builtin',
  },
  {
    id: 'jmc-ihss86-1000w',
    name: 'JMC iHSS86 (1000W)',
    manufacturer: 'JMC',
    ratedRPM: 3000,
    maxRPM: 4500,
    ratedTorque_Nm: 3.18,
    peakTorque_Nm: 9.54,
    continuousPower_W: 1000,
    inertia_kgm2: 1.1e-4,
    mass_kg: 3.5,
    frameSize_mm: 86,
    source: 'builtin',
  },
  {
    id: 'leadshine-el5-d507',
    name: 'Leadshine EL5-D507 (750W)',
    manufacturer: 'Leadshine',
    ratedRPM: 3000,
    maxRPM: 4000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.17,
    continuousPower_W: 750,
    inertia_kgm2: 3.9e-5,
    mass_kg: 2.1,
    frameSize_mm: 80,
    source: 'builtin',
  },
  {
    id: 'leadshine-el5-d1022',
    name: 'Leadshine EL5-D1022 (1kW)',
    manufacturer: 'Leadshine',
    ratedRPM: 3000,
    maxRPM: 4000,
    ratedTorque_Nm: 3.18,
    peakTorque_Nm: 9.54,
    continuousPower_W: 1000,
    inertia_kgm2: 2.0e-4,
    mass_kg: 3.5,
    frameSize_mm: 80,
    source: 'builtin',
  },
  {
    id: 'lichuan-57-280w',
    name: 'Lichuan LC57H280 (280W)',
    manufacturer: 'Lichuan',
    ratedRPM: 3000,
    maxRPM: 4000,
    ratedTorque_Nm: 0.9,
    peakTorque_Nm: 2.7,
    continuousPower_W: 280,
    inertia_kgm2: 2.4e-5,
    mass_kg: 1.0,
    frameSize_mm: 57,
    source: 'builtin',
  },
  {
    id: 'lichuan-86-750w',
    name: 'Lichuan LC86H750 (750W)',
    manufacturer: 'Lichuan',
    ratedRPM: 3000,
    maxRPM: 4000,
    ratedTorque_Nm: 2.4,
    peakTorque_Nm: 7.2,
    continuousPower_W: 750,
    inertia_kgm2: 8.5e-5,
    mass_kg: 2.9,
    frameSize_mm: 86,
    source: 'builtin',
  },
  {
    id: 'omc-nema34-1000w',
    name: 'OMC NEMA34 Closed-Loop (1000W)',
    manufacturer: 'StepperOnline',
    ratedRPM: 3000,
    maxRPM: 4000,
    ratedTorque_Nm: 3.0,
    peakTorque_Nm: 9.0,
    continuousPower_W: 1000,
    inertia_kgm2: 1.2e-4,
    mass_kg: 3.2,
    frameSize_mm: 86,
    source: 'builtin',
  },
  {
    id: 'delta-ecma-c207-750w',
    name: 'Delta ECMA-C20807 (750W)',
    manufacturer: 'Delta',
    ratedRPM: 3000,
    maxRPM: 5000,
    ratedTorque_Nm: 2.39,
    peakTorque_Nm: 7.16,
    continuousPower_W: 750,
    inertia_kgm2: 1.13e-4,
    mass_kg: 2.3,
    frameSize_mm: 80,
    source: 'builtin',
  },
];

export function loadUserServoMotors(): ServoMotor[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('actuator-sizing-user-motors');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidServoMotor);
  } catch {
    return [];
  }
}

export function saveUserServoMotors(motors: ServoMotor[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('actuator-sizing-user-motors', JSON.stringify(motors));
}

function isValidServoMotor(m: unknown): m is ServoMotor {
  if (typeof m !== 'object' || m === null) return false;
  const mo = m as Record<string, unknown>;
  return (
    typeof mo.id === 'string' &&
    typeof mo.name === 'string' &&
    typeof mo.ratedRPM === 'number' &&
    typeof mo.maxRPM === 'number' &&
    typeof mo.ratedTorque_Nm === 'number' &&
    typeof mo.peakTorque_Nm === 'number' &&
    typeof mo.continuousPower_W === 'number' &&
    typeof mo.inertia_kgm2 === 'number' &&
    mo.source === 'user'
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/calculator/actuator-sizing/motors.ts
git commit -m "feat(actuator-sizing): servo motor database with 10 builtin motors"
```

---

## Task 7: UI Component

**Files:**

- Create: `src/components/calculator/actuator-sizing/index.svelte`

This component follows the same architecture as `src/components/calculator/actuator-sizing/index.svelte`:

- Left column: sortable results table
- Right column: stacked Tweakpane settings panels
- Hover popup with per-motor detail
- URL state persistence via base64 `?state=...` query param
- localStorage for user-added motors

- [ ] **Step 1: Write the component**

```svelte
<!-- src/components/calculator/actuator-sizing/index.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Pane, Slider, List, Checkbox, Button, Monitor } from 'svelte-tweakpane-ui';
  import { BUILTIN_SERVO_MOTORS, loadUserServoMotors, saveUserServoMotors } from './motors';
  import type { ServoMotor, MotorEvaluationV2 } from './types';
  import { computeTrapezoidalProfile } from './profile';
  import { computeGravityForce, computeStaticForce, computeHoldingForce, computeForcePerActuator } from './forces';
  import {
    computeScrewMass,
    computeScrewRotationalInertia,
    computeLoadInertia,
    computeTotalInertia,
    computeMotorSpeedRPM,
    computePhaseTorques,
  } from './dynamics';
  import { rankMotors } from './evaluation';

  // ─── Ball screw lookup tables ───────────────────────────────────────────────
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
  const BALLSCREW_DIAMETERS: Record<string, number> = {
    '1605': 16, '1610': 16, '2005': 20, '2010': 20,
    '2505': 25, '2510': 25, '3205': 32, '3210': 32,
  };

  const SYSTEM_OPTIONS = [
    { text: 'Single Axis', value: 'single' },
    { text: '4-Actuator Platform', value: '4actuator' },
    { text: '6-Actuator Stewart', value: 'stewart' },
  ];

  const ORIENTATION_OPTIONS = [
    { text: 'Horizontal', value: 'horizontal' },
    { text: 'Vertical', value: 'vertical' },
    { text: 'Inclined', value: 'inclined' },
  ];

  // ─── Defaults ───────────────────────────────────────────────────────────────
  const DEFAULTS = {
    strokeLength: 500,     // mm
    maxVelocity: 300,      // mm/s
    acceleration: 5000,   // mm/s²
    deceleration: 5000,   // mm/s²
    dwellTime: 0.5,        // s
    systemType: 'single',
    actuatorAngle: 45,     // degrees (for Stewart)
    totalMass: 50,         // kg
    imbalanceFactor: 1.2,
    externalForce: 0,      // N
    frictionForce: 50,     // N
    guidePreloadForce: 0,  // N
    orientation: 'horizontal',
    inclineAngle: 30,      // degrees
    ballscrewKey: '1610',
    customPitch: 10,       // mm
    customDiameter: 16,    // mm
    screwLength: 500,      // mm
    screwEfficiency: 90,   // %
    gearRatio: 1.0,
    gearEfficiency: 95,    // %
    gearInertia: 0,        // kg·m²
    safetyFactor: 20,      // %
    holdingRequired: false,
  };

  // ─── URL state ──────────────────────────────────────────────────────────────
  const STATE_KEY = 'state';

  function decodeState(encoded: string): Record<string, unknown> | null {
    try { return JSON.parse(atob(encoded)); } catch { return null; }
  }

  function getInitialState() {
    if (typeof window === 'undefined') return null;
    const encoded = new URLSearchParams(window.location.search).get(STATE_KEY);
    return encoded ? decodeState(encoded) : null;
  }

  const init = getInitialState();
  function iv<T>(key: string, def: T): T { return (init?.[key] as T) ?? def; }

  // ─── State ──────────────────────────────────────────────────────────────────
  let strokeLength    = iv('strokeLength', DEFAULTS.strokeLength);
  let maxVelocity     = iv('maxVelocity', DEFAULTS.maxVelocity);
  let acceleration    = iv('acceleration', DEFAULTS.acceleration);
  let deceleration    = iv('deceleration', DEFAULTS.deceleration);
  let dwellTime       = iv('dwellTime', DEFAULTS.dwellTime);
  let systemType      = iv('systemType', DEFAULTS.systemType);
  let actuatorAngle   = iv('actuatorAngle', DEFAULTS.actuatorAngle);
  let totalMass       = iv('totalMass', DEFAULTS.totalMass);
  let imbalanceFactor = iv('imbalanceFactor', DEFAULTS.imbalanceFactor);
  let externalForce   = iv('externalForce', DEFAULTS.externalForce);
  let frictionForce   = iv('frictionForce', DEFAULTS.frictionForce);
  let guidePreloadForce = iv('guidePreloadForce', DEFAULTS.guidePreloadForce);
  let orientation     = iv('orientation', DEFAULTS.orientation);
  let inclineAngle    = iv('inclineAngle', DEFAULTS.inclineAngle);
  let ballscrewKey    = iv('ballscrewKey', DEFAULTS.ballscrewKey);
  let customPitch     = iv('customPitch', DEFAULTS.customPitch);
  let customDiameter  = iv('customDiameter', DEFAULTS.customDiameter);
  let screwLength     = iv('screwLength', DEFAULTS.screwLength);
  let screwEfficiency = iv('screwEfficiency', DEFAULTS.screwEfficiency);
  let gearRatio       = iv('gearRatio', DEFAULTS.gearRatio);
  let gearEfficiency  = iv('gearEfficiency', DEFAULTS.gearEfficiency);
  let gearInertia     = iv('gearInertia', DEFAULTS.gearInertia);
  let safetyFactor    = iv('safetyFactor', DEFAULTS.safetyFactor);
  let holdingRequired = iv('holdingRequired', DEFAULTS.holdingRequired);

  let userMotors: ServoMotor[] = [];
  let mounted = false;

  onMount(() => {
    userMotors = loadUserServoMotors();
    mounted = true;
  });

  $: if (mounted) {
    (strokeLength, maxVelocity, acceleration, deceleration, dwellTime, systemType,
     actuatorAngle, totalMass, imbalanceFactor, externalForce, frictionForce,
     guidePreloadForce, orientation, inclineAngle, ballscrewKey, customPitch,
     customDiameter, screwLength, screwEfficiency, gearRatio, gearEfficiency,
     gearInertia, safetyFactor, holdingRequired);
    const encoded = btoa(JSON.stringify({
      strokeLength, maxVelocity, acceleration, deceleration, dwellTime, systemType,
      actuatorAngle, totalMass, imbalanceFactor, externalForce, frictionForce,
      guidePreloadForce, orientation, inclineAngle, ballscrewKey, customPitch,
      customDiameter, screwLength, screwEfficiency, gearRatio, gearEfficiency,
      gearInertia, safetyFactor, holdingRequired,
    }));
    const url = new URL(window.location.href);
    url.searchParams.set(STATE_KEY, encoded);
    window.history.replaceState({}, '', url.toString());
  }

  // ─── Derived: screw geometry ─────────────────────────────────────────────
  $: lead_mm = ballscrewKey === 'custom' ? customPitch : (BALLSCREW_PITCHES[ballscrewKey] ?? 10);
  $: lead_m = lead_mm / 1000;
  $: screwDia_mm = ballscrewKey === 'custom' ? customDiameter : (BALLSCREW_DIAMETERS[ballscrewKey] ?? 16);
  $: screwMass_kg = computeScrewMass(screwDia_mm, screwLength);
  $: J_screw_rot = computeScrewRotationalInertia(screwMass_kg, screwDia_mm / 2 / 1000);

  // ─── Derived: motion profile ─────────────────────────────────────────────
  $: profile = computeTrapezoidalProfile(
    strokeLength / 1000,
    maxVelocity / 1000,
    acceleration / 1000,
    deceleration / 1000
  );

  // ─── Derived: forces ─────────────────────────────────────────────────────
  $: massPerActuator_kg =
    systemType === '4actuator' ? totalMass / 4 :
    systemType === 'stewart'   ? totalMass / 6 : totalMass;

  $: F_static_total = computeStaticForce(
    totalMass, orientation as any, inclineAngle,
    frictionForce, externalForce, guidePreloadForce
  );
  $: F_hold_total = computeHoldingForce(
    totalMass, orientation as any, inclineAngle, guidePreloadForce
  );
  $: F_static_per = computeForcePerActuator(
    F_static_total, systemType as any, imbalanceFactor, actuatorAngle
  );
  $: F_hold_per = holdingRequired
    ? computeForcePerActuator(F_hold_total, systemType as any, imbalanceFactor, actuatorAngle)
    : 0;

  // ─── Derived: per-motor results ──────────────────────────────────────────
  $: allMotors = [...BUILTIN_SERVO_MOTORS, ...userMotors];

  $: motorResults = rankMotors(
    allMotors,
    ...(() => {
      // Use a representative J_total (using average inertia) for a quick first pass.
      // Each motor gets its own J_total inside rankMotors → evaluateMotorForActuator.
      // The actual per-motor phase torques depend on J_total (motor-specific).
      // We compute phase torques outside rankMotors for each motor individually:
      const perMotorResults = allMotors.map(motor => {
        const J_load = computeLoadInertia(massPerActuator_kg, lead_m, gearRatio);
        const J_total = computeTotalInertia(motor.inertia_kgm2, gearInertia, J_screw_rot, J_load, gearRatio);
        const pt = computePhaseTorques(
          F_static_per, F_hold_per, J_total,
          acceleration / 1000, deceleration / 1000,
          profile.v_peak_m_s, lead_m, gearRatio,
          gearEfficiency / 100, screwEfficiency / 100,
          profile.t_accel_s, profile.t_const_s, profile.t_decel_s, dwellTime
        );
        return { motor, pt, J_load, J_total };
      });
      // Return [ranked results] directly — need to bypass the signature
      // Since rankMotors takes scalar T_peak/rms (not per-motor), we can't use it as-is
      // for per-motor J_total. Instead, sort the per-motor results manually:
      return perMotorResults;
    })()
  );
</script>
```

> **Note for implementer:** The `rankMotors` function takes scalar torque/speed values (not per-motor). Since `J_total`
> is motor-specific (it includes `motor.inertia_kgm2`), the phase torques differ per motor. In the Svelte reactive
> block, compute phase torques per motor and call `evaluateMotorForActuator` directly, then sort the results. Replace
> the `rankMotors` call above with:

```svelte
<script lang="ts">
  import { evaluateMotorForActuator } from './evaluation';
  // ... other imports unchanged ...

  // Replace the motorResults reactive statement with:
  $: motorResults = (() => {
    return allMotors
      .map(motor => {
        const J_load = computeLoadInertia(massPerActuator_kg, lead_m, gearRatio);
        const J_total = computeTotalInertia(motor.inertia_kgm2, gearInertia, J_screw_rot, J_load, gearRatio);
        const pt = computePhaseTorques(
          F_static_per, F_hold_per, J_total,
          acceleration / 1000, deceleration / 1000,
          profile.v_peak_m_s, lead_m, gearRatio,
          gearEfficiency / 100, screwEfficiency / 100,
          profile.t_accel_s, profile.t_const_s, profile.t_decel_s, dwellTime
        );
        return evaluateMotorForActuator(
          motor, pt.T_peak_Nm, pt.T_rms_Nm, pt.n_motor_rpm, pt.P_peak_W,
          J_load, J_total, safetyFactor
        );
      })
      .sort((a, b) => {
        const o: Record<string, number> = { pass: 0, warn: 1, fail: 2 };
        const d = o[a.status] - o[b.status];
        return d !== 0 ? d : b.score - a.score;
      });
  })();
</script>
```

Continue with the template and hover popup following the exact same patterns as
`src/components/calculator/actuator-sizing/index.svelte`:

- [ ] **Step 2: Write the template section**

The template follows the actuator-sizing layout exactly:

```svelte
<div class="w-full not-content border border-black rounded overflow-hidden">
  <div class="flex flex-row">
    <!-- Left: results table -->
    <div class="overflow-x-auto bg-white flex-1 min-w-0">
      <table class="w-full text-xs font-mono border-collapse">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 text-left text-[10px] font-sans font-semibold uppercase tracking-wider text-gray-500">
            <th class="px-3 py-2 font-sans sticky left-0 bg-gray-50 z-10">Motor</th>
            <th class="px-3 py-2 font-sans text-center">Status</th>
            <th class="px-3 py-2 font-sans">Score</th>
            <th class="px-2 py-2 font-sans min-w-[4.5rem]">Peak Tq</th>
            <th class="px-2 py-2 font-sans min-w-[4.5rem]">RMS Tq</th>
            <th class="px-2 py-2 font-sans min-w-[4.5rem]">Speed</th>
            <th class="px-3 py-2 font-sans">Inertia</th>
          </tr>
        </thead>
        <tbody>
          {#each motorResults as result (result.motor.id)}
            {@const m = result.motor}
            {@const statusColor = result.status === 'fail' ? 'border-red-400' : result.status === 'warn' ? 'border-amber-400' : 'border-green-400'}
            {@const badgeClass = result.status === 'fail' ? 'bg-red-100 text-red-700' : result.status === 'warn' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}
            {@const badgeLabel = result.status === 'fail' ? '✗ Fail' : result.status === 'warn' ? '⚠ Warn' : '✓ Pass'}
            <tr
              class="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-default"
              on:mouseenter={(e) => onRowEnter(e, result)}
              on:mousemove={updatePopupPos}
              on:mouseleave={onRowLeave}
            >
              <td class="px-3 py-2 font-sans font-medium text-gray-800 whitespace-nowrap sticky left-0 bg-white">{m.name}</td>
              <td class="px-3 py-2 text-center">
                <span class="font-sans font-semibold px-1.5 py-0.5 rounded text-[10px] {badgeClass}">{badgeLabel}</span>
              </td>
              <td class="px-3 py-2 text-gray-600">{result.score.toFixed(0)}</td>
              <td class="px-2 py-2">{@html marginBar(result.peakTorqueMargin_pct)}</td>
              <td class="px-2 py-2">{@html marginBar(result.rmsTorqueMargin_pct)}</td>
              <td class="px-2 py-2">{@html marginBar(result.speedMargin_pct)}</td>
              <td class="px-3 py-2 whitespace-nowrap" class:text-amber-600={result.inertiaRatio > 10}>
                {result.inertiaRatio.toFixed(1)}:1
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Right: settings panels -->
    <div class="border-l border-black flex flex-col divide-y divide-black shrink-0">
      <Pane title="Motion Profile" position="inline">
        <Slider bind:value={strokeLength} label="Stroke" min={10} max={2000} step={10} format={(v) => `${v} mm`} />
        <Slider bind:value={maxVelocity} label="Max Velocity" min={1} max={1000} step={1} format={(v) => `${v} mm/s`} />
        <Slider bind:value={acceleration} label="Acceleration" min={100} max={20000} step={100} format={(v) => `${v} mm/s²`} />
        <Slider bind:value={deceleration} label="Deceleration" min={100} max={20000} step={100} format={(v) => `${v} mm/s²`} />
        <Slider bind:value={dwellTime} label="Dwell Time" min={0} max={5} step={0.1} format={(v) => `${v.toFixed(1)} s`} />
        <Button on:click={() => { strokeLength = DEFAULTS.strokeLength; maxVelocity = DEFAULTS.maxVelocity; acceleration = DEFAULTS.acceleration; deceleration = DEFAULTS.deceleration; dwellTime = DEFAULTS.dwellTime; }} label="Reset" title="Reset" />
      </Pane>

      <Pane title="System" position="inline">
        <List bind:value={systemType} options={SYSTEM_OPTIONS} label="Type" />
        {#if systemType === 'stewart'}
          <Slider bind:value={actuatorAngle} label="Actuator Angle" min={10} max={80} step={1} format={(v) => `${v}°`} />
        {/if}
      </Pane>

      <Pane title="Load" position="inline">
        <Slider bind:value={totalMass} label="Total Mass" min={1} max={500} step={1} format={(v) => `${v} kg`} />
        <Slider bind:value={frictionForce} label="Friction" min={0} max={500} step={5} format={(v) => `${v} N`} />
        <Slider bind:value={externalForce} label="External Force" min={0} max={2000} step={10} format={(v) => `${v} N`} />
        <Slider bind:value={guidePreloadForce} label="Guide Preload" min={0} max={500} step={5} format={(v) => `${v} N`} />
        <Slider bind:value={imbalanceFactor} label="Imbalance" min={1.0} max={2.0} step={0.05} format={(v) => `×${v.toFixed(2)}`} />
        <Button on:click={() => { totalMass = DEFAULTS.totalMass; frictionForce = DEFAULTS.frictionForce; externalForce = DEFAULTS.externalForce; guidePreloadForce = DEFAULTS.guidePreloadForce; imbalanceFactor = DEFAULTS.imbalanceFactor; }} label="Reset" title="Reset" />
      </Pane>

      <Pane title="Axis" position="inline">
        <List bind:value={orientation} options={ORIENTATION_OPTIONS} label="Orientation" />
        {#if orientation === 'inclined'}
          <Slider bind:value={inclineAngle} label="Incline Angle" min={1} max={89} step={1} format={(v) => `${v}°`} />
        {/if}
        <Checkbox bind:value={holdingRequired} label="Holding Required" />
      </Pane>

      <Pane title="Ball Screw" position="inline">
        <List bind:value={ballscrewKey} options={BALLSCREW_OPTIONS} label="Type" />
        {#if ballscrewKey === 'custom'}
          <Slider bind:value={customPitch} label="Pitch" min={1} max={50} step={0.5} format={(v) => `${v} mm`} />
          <Slider bind:value={customDiameter} label="Diameter" min={8} max={63} step={1} format={(v) => `${v} mm`} />
        {/if}
        <Slider bind:value={screwLength} label="Screw Length" min={50} max={3000} step={10} format={(v) => `${v} mm`} />
        <Slider bind:value={screwEfficiency} label="Efficiency" min={50} max={100} step={1} format={(v) => `${v}%`} />
      </Pane>

      <Pane title="Transmission" position="inline">
        <Slider bind:value={gearRatio} label="Gear Ratio" min={1} max={10} step={0.1} format={(v) => `${v.toFixed(1)}:1`} />
        <Slider bind:value={gearEfficiency} label="Gear Efficiency" min={70} max={100} step={1} format={(v) => `${v}%`} />
        <Slider bind:value={gearInertia} label="Gear Inertia" min={0} max={0.001} step={0.00001} format={(v) => `${v.toExponential(1)} kg·m²`} />
      </Pane>

      <Pane title="Safety" position="inline">
        <Slider bind:value={safetyFactor} label="Safety Factor" min={0} max={100} step={5} format={(v) => `${v}%`} />
      </Pane>

      <Pane title="Calculated" position="inline">
        <Monitor value={`${lead_mm} mm`} label="Lead" />
        <Monitor value={`${screwMass_kg.toFixed(3)} kg`} label="Screw mass" />
        <Monitor value={`${F_static_per.toFixed(1)} N`} label="F/actuator" />
        <Monitor value={`${profile.t_accel_s.toFixed(3)} s`} label="t_accel" />
        <Monitor value={`${profile.t_const_s.toFixed(3)} s`} label="t_const" />
        <Monitor value={`${profile.isTriangular ? '⚠ triangular' : 'trapezoidal'}`} label="Profile" />
      </Pane>
    </div>
  </div>

  <!-- Hover popup (same pattern as actuator-sizing) -->
  {#if hoveredResult}
    <div
      class="fixed z-50 pointer-events-none bg-white border border-gray-200 rounded shadow-xl text-xs font-mono"
      style="left:{popupFlipLeft ? popupX - 16 : popupX + 16}px; top:{popupY}px; transform:{popupFlipLeft ? 'translate(-100%,-50%)' : 'translateY(-50%)'}; min-width:260px;"
    >
      <div class="px-3 py-2 border-b border-gray-100">
        <div class="font-sans font-semibold text-gray-800 text-[11px]">{hoveredResult.motor.name}</div>
        <div class="text-[10px] text-gray-400 font-sans mt-0.5">score {hoveredResult.score.toFixed(0)} · inertia {hoveredResult.inertiaRatio.toFixed(1)}:1</div>
      </div>
      <div class="px-3 py-2 grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-0.5">
        <span></span>
        <span class="text-gray-400 font-sans text-[10px] uppercase tracking-wide">Motor</span>
        <span class="text-gray-400 font-sans text-[10px] uppercase tracking-wide">Required</span>

        <span class="text-gray-500">Peak Tq</span>
        <span>{hoveredResult.motor.peakTorque_Nm.toFixed(2)} Nm</span>
        <span class:text-red-500={hoveredResult.peakTorqueMargin_pct < 0}
              class:text-amber-500={hoveredResult.peakTorqueMargin_pct >= 0 && hoveredResult.peakTorqueMargin_pct < 20}>
          {hoveredResult.T_peak_required_Nm.toFixed(2)} Nm
        </span>

        <span class="text-gray-500">RMS Tq</span>
        <span>{hoveredResult.motor.ratedTorque_Nm.toFixed(2)} Nm</span>
        <span class:text-red-500={hoveredResult.rmsTorqueMargin_pct < 0}
              class:text-amber-500={hoveredResult.rmsTorqueMargin_pct >= 0 && hoveredResult.rmsTorqueMargin_pct < 20}>
          {hoveredResult.T_rms_required_Nm.toFixed(2)} Nm
        </span>

        <span class="text-gray-500">Speed</span>
        <span>{hoveredResult.motor.maxRPM.toLocaleString()} rpm</span>
        <span class:text-red-500={hoveredResult.speedMargin_pct < 0}
              class:text-amber-500={hoveredResult.speedMargin_pct >= 0 && hoveredResult.speedMargin_pct < 20}>
          {hoveredResult.n_required_rpm.toFixed(0)} rpm
        </span>
      </div>
      <div class="px-3 py-2 border-t border-gray-100 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <span class="text-gray-500">J load</span>
        <span>{hoveredResult.J_load_kgm2.toExponential(2)} kg·m²</span>
        <span class="text-gray-500">J total</span>
        <span>{hoveredResult.J_total_kgm2.toExponential(2)} kg·m²</span>
        <span class="text-gray-500">Peak power</span>
        <span>{hoveredResult.P_peak_required_W.toFixed(0)} W</span>
      </div>
    </div>
  {/if}
</div>
```

Add hover state and helper functions in the `<script>` block:

```typescript
// ─── Hover popup ─────────────────────────────────────────────────────────
let hoveredResult: MotorEvaluationV2 | null = null;
let popupX = 0;
let popupY = 0;
let popupFlipLeft = false;

function onRowEnter(e: MouseEvent, result: MotorEvaluationV2) {
  hoveredResult = result;
  updatePopupPos(e);
}
function updatePopupPos(e: MouseEvent) {
  popupX = e.clientX;
  popupY = e.clientY;
  popupFlipLeft = typeof window !== 'undefined' && e.clientX > window.innerWidth * 0.55;
}
function onRowLeave() {
  hoveredResult = null;
}

function marginColor(m: number): string {
  if (m < 0) return '#ef4444';
  if (m < 20) return '#f59e0b';
  return '#22c55e';
}

function marginBar(margin: number): string {
  const fill = Math.min(100, Math.max(0, ((margin + 100) / 200) * 100));
  const color = marginColor(margin);
  const label = (margin >= 0 ? '+' : '') + margin.toFixed(0) + '%';
  return `<div class="flex flex-row items-center gap-1.5 text-[11px] leading-none">
      <div class="relative h-1.5 w-10 bg-gray-200 rounded overflow-visible shrink-0">
        <div class="absolute inset-y-0 left-0 rounded" style="width:${fill}%;background-color:${color}"></div>
        <div class="absolute inset-y-[-2px] w-px bg-gray-500" style="left:50%"></div>
      </div>
      <span style="color:${color}" class="whitespace-nowrap">${label}</span>
    </div>`;
}
```

Add the `<style>` block:

```svelte
<style>
  :global(.not-content .tp-dfwv) { width: 100% !important; }
  :global(.not-content .tp-rotv_t) { text-align: left; }
  :global(.not-content .tp-lblv:has(.tp-ckbv) .tp-lblv_v) {
    display: flex; justify-content: flex-end; align-items: center;
  }
</style>
```

- [ ] **Step 3: Start dev server and verify the component renders**

Run: `pnpm dev` then open `http://localhost:4321/calculators/actuator-sizing` in browser.

Verify:

- Left table shows all 10 motors with status badges
- Settings panels appear on the right
- Changing stroke/mass/velocity updates the table in real time
- Hovering a row shows the popup with torque/speed/inertia details
- Switching to `4actuator` or `stewart` changes the force per actuator (visible in Calculated panel)
- Changing orientation to `vertical` increases forces and changes which motors pass
- Setting a high safety factor causes more motors to warn/fail

- [ ] **Step 4: Commit**

```bash
git add src/components/calculator/actuator-sizing/index.svelte
git commit -m "feat(actuator-sizing): Svelte UI with motion profile, multi-actuator, and ranked results"
```

---

## Task 8: Documentation Page

**Files:**

- Create: `src/content/docs/calculators/actuator-sizing.mdx`

- [ ] **Step 1: Write the doc page**

```mdx
---
title: Actuator Motor Sizing Calculator
description:
  Engineering-grade motor selection tool for ball-screw linear actuators. Enter your motion profile, load, and screw
  geometry to find suitable servo motors with dynamic torque (peak and RMS), speed, and inertia analysis.
tableOfContents: false
---

<style>{`:root { --sl-content-width: 90rem; }`}</style>

import ActuatorSizingCalc from '~/components/calculator/actuator-sizing/index.svelte';

## Actuator Motor Sizing

Selecting a motor for a ball-screw linear actuator requires more than matching peak force — it requires matching the
full dynamic load: inertia during acceleration, RMS heating over a complete motion cycle, and speed at the required
stroke rate.

This calculator takes a complete motion profile (stroke, velocity, acceleration, dwell), applies the screw geometry and
transmission, and scores every motor in the database against peak torque, RMS torque, and speed constraints with a
configurable safety factor.

### How to use

1. **Motion Profile** — Set the stroke length, peak velocity, and acceleration/deceleration rates. The calculator
   computes trapezoidal profile timing and flags triangular profiles (stroke too short to reach peak velocity).
2. **System** — Choose Single Axis, 4-Actuator Platform, or 6-Actuator Stewart Platform. For Stewart, set the actuator
   angle; the calculator divides total platform force across actuators using the geometric projection.
3. **Load** — Enter the total moving mass, friction, external forces, guide preload, and an imbalance factor for uneven
   loading.
4. **Axis** — Set horizontal, vertical, or inclined orientation. The calculator adds gravity loading for non-horizontal
   axes.
5. **Ball Screw** — Select a standard size (e.g. 1610 = 16mm diameter, 10mm pitch) or enter custom dimensions. Adjust
   efficiency for the actual screw type.
6. **Transmission** — Set gear ratio, efficiency, and gear inertia if a belt or gearbox is used. Direct drive defaults
   to ratio 1:1.
7. **Safety** — Safety factor multiplies all requirements before checking motor limits. Enable Holding Required for
   vertical axes that must hold position.
8. **Results table** — Motors sorted by status (Pass → Warn → Fail) then by fit score. Margin bars show headroom above
   the required value. Hover a row for a full torque/speed/inertia breakdown.

### Engineering notes

- **Peak torque** is checked against the motor's peak (instantaneous) rating. It occurs during the acceleration phase:
  T_peak = T_load + J_total × α_motor.
- **RMS torque** is checked against the motor's continuous rated torque. It is the root-mean-square over the full cycle
  including dwell, representing the average thermal load.
- **Inertia ratio** above 10:1 (load / motor rotor) triggers a warning; high ratios reduce responsiveness and increase
  settling time.
- **Score** rewards well-matched motors (high utilization within limits). An oversized motor scores lower than a
  well-fitted one.
- Deceleration torque can be negative (regenerative braking) — the motor absorbs energy. This still contributes T² to
  RMS heating.

### Calculator

<ActuatorSizingCalc client:load />
```

- [ ] **Step 2: Verify page loads in browser**

Open: `http://localhost:4321/calculators/actuator-sizing` Expected: Page renders with the calculator visible, sidebar
shows "Actuator Motor Sizing Calculator" under Calculators

- [ ] **Step 3: Run full test suite one final time**

Run: `pnpm test` Expected: all tests pass

- [ ] **Step 4: Final commit**

```bash
git add src/content/docs/calculators/actuator-sizing.mdx
git commit -m "feat(actuator-sizing): documentation page"
```

---

## Self-Review

### Spec Coverage

| PRD Section              | Covered By                                                             |
| ------------------------ | ---------------------------------------------------------------------- |
| 5.1.1 Motion Profile     | profile.ts (trapezoidal), index.svelte (S-curve selectable, same math) |
| 5.1.2 Load & Mechanics   | forces.ts + index.svelte                                               |
| 5.1.3 Axis Configuration | forces.ts (gravity by orientation) + index.svelte                      |
| 5.1.4 Ball Screw         | dynamics.ts (mass, inertia) + index.svelte (screw DB)                  |
| 5.1.5 Transmission       | dynamics.ts (gear ratio in all formulas) + index.svelte                |
| 5.1.6 Environmental      | index.svelte (safetyFactor, holdingRequired)                           |
| 5.2.1 4-Actuator         | forces.ts `computeForcePerActuator` + index.svelte                     |
| 5.2.2 Stewart Platform   | forces.ts `computeForcePerActuator` + index.svelte                     |
| 5.3 Motor DB             | motors.ts (10 motors, extended fields)                                 |
| 5.4 Derived Calculations | dynamics.ts (all formulas implemented)                                 |
| 5.5 Constraint Checks    | evaluation.ts (peak, RMS, speed, inertia)                              |
| 5.6 Output & Results     | index.svelte table + hover popup                                       |
| 5.7 Ranking              | evaluation.ts `rankMotors` + score formula                             |

**Gap:** Torque-speed curve visualization (PRD §7) — not implemented in this plan. Requires SVG/canvas work and motor
curve data not in the database. Recommended follow-up task.

**Gap:** Electrical parameters (torque constant, back-EMF, resistance) are in the PRD §5.3 Optional fields — not
collected in the current motor DB but the `ServoMotor` interface is open to extension.

### Type Consistency Check

- `TrapezoidalProfileResult.t_accel_s` used in `computePhaseTorques(... t_accel_s ...)` ✓
- `PhaseTorques.T_peak_Nm` passed to `evaluateMotorForActuator(motor, T_peak_Nm ...)` ✓
- `PhaseTorques.n_motor_rpm` passed to `evaluateMotorForActuator(... n_rpm ...)` ✓
- `ServoMotor.maxRPM` used in `computeMargin(motor.maxRPM, n_required)` ✓
- `MotorEvaluationV2.score` used for sort in `rankMotors` ✓

### Placeholder Scan

No TBD, TODO, or "implement later" patterns in this plan. All code is complete.
