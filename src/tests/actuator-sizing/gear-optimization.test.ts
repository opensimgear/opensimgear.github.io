import { describe, expect, it } from 'vitest';
import {
  findOptimalGearRatio,
  type GearOptimizationContext,
} from '~/components/calculator/actuator-sizing/gear-optimization';
import {
  computeLoadInertia,
  computePhaseTorques,
  computeTotalInertia,
} from '~/components/calculator/actuator-sizing/dynamics';
import type { ServoMotor } from '~/components/calculator/actuator-sizing/types';

// ─── fixtures ───────────────────────────────────────────────────────────────

const BASE_MOTOR: ServoMotor = {
  id: 'test',
  name: 'Test Motor',
  ratedRPM: 3000,
  maxRPM: 3000,
  ratedTorque_Nm: 1.5,
  peakTorque_Nm: 4.5,
  continuousPower_W: 500,
  inertia_kgm2: 1e-4,
  source: 'builtin',
};

const BASE_CTX: GearOptimizationContext = {
  mass_kg: 10,
  lead_m: 0.01,
  F_static_N: 100,
  F_hold_N: 98.1,
  acceleration_m_s2: 5,
  deceleration_m_s2: 5,
  v_peak_m_s: 0.2,
  t_accel_s: 0.04,
  t_const_s: 0.02,
  t_decel_s: 0.04,
  dwellTime_s: 0.1,
  J_screw_rot_kgm2: 1e-6,
  J_gear_kgm2: 0,
  gearEfficiency: 0.95,
  screwEfficiency: 0.9,
  safetyFactor_pct: 20,
};

// ─── helper ─────────────────────────────────────────────────────────────────

/** Mirrors the internal computeObjective: rpmDeficit − torqueDeficit. */
function objective(ratio: number, ctx: GearOptimizationContext, motor: ServoMotor): number {
  const multiplier = 1 + ctx.safetyFactor_pct / 100;
  const J_load = computeLoadInertia(ctx.mass_kg, ctx.lead_m, ratio);
  const J_total = computeTotalInertia(motor.inertia_kgm2, ctx.J_gear_kgm2, ctx.J_screw_rot_kgm2, J_load, ratio);
  const phases = computePhaseTorques(
    ctx.F_static_N,
    ctx.F_hold_N,
    J_total,
    ctx.acceleration_m_s2,
    ctx.deceleration_m_s2,
    ctx.v_peak_m_s,
    ctx.lead_m,
    ratio,
    ctx.gearEfficiency,
    ctx.screwEfficiency,
    ctx.t_accel_s,
    ctx.t_const_s,
    ctx.t_decel_s,
    ctx.dwellTime_s
  );
  const d = (req: number, rated: number) => (req <= 0 ? -Infinity : ((req - rated) / req) * 100);
  const n_req = phases.n_motor_rpm * multiplier;
  const T_peak_req = phases.T_peak_Nm * multiplier;
  const T_rms_req = phases.T_rms_Nm * multiplier;
  const rpmDeficit = d(n_req, motor.maxRPM);
  const torqueDeficit = Math.max(d(T_peak_req, motor.peakTorque_Nm), d(T_rms_req, motor.ratedTorque_Nm));
  return rpmDeficit - torqueDeficit;
}

function maxDeficit(ratio: number, ctx: GearOptimizationContext, motor: ServoMotor): number {
  // max(rpmDeficit, torqueDeficit): when obj = rpm - tq, one of them equals (obj + tq + rpm)/2 ...
  // simpler: just compute directly the same way objective does, reuse the sum approach.
  // max(a, b) = (a + b + |a - b|) / 2, and obj = a - b → a = obj + b, max = max(obj+b, b)
  // Instead, recompute both components via a thin wrapper:
  const multiplier = 1 + ctx.safetyFactor_pct / 100;
  const J_load = computeLoadInertia(ctx.mass_kg, ctx.lead_m, ratio);
  const J_total = computeTotalInertia(motor.inertia_kgm2, ctx.J_gear_kgm2, ctx.J_screw_rot_kgm2, J_load, ratio);
  const phases = computePhaseTorques(
    ctx.F_static_N,
    ctx.F_hold_N,
    J_total,
    ctx.acceleration_m_s2,
    ctx.deceleration_m_s2,
    ctx.v_peak_m_s,
    ctx.lead_m,
    ratio,
    ctx.gearEfficiency,
    ctx.screwEfficiency,
    ctx.t_accel_s,
    ctx.t_const_s,
    ctx.t_decel_s,
    ctx.dwellTime_s
  );
  const d = (req: number, rated: number) => (req <= 0 ? -Infinity : ((req - rated) / req) * 100);
  const n_req = phases.n_motor_rpm * multiplier;
  return Math.max(
    d(n_req, motor.maxRPM),
    d(phases.T_peak_Nm * multiplier, motor.peakTorque_Nm),
    d(phases.T_rms_Nm * multiplier, motor.ratedTorque_Nm)
  );
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('findOptimalGearRatio', () => {
  it('returns 0.5 (GEAR_MIN) when already speed-limited at the lowest ratio', () => {
    // maxRPM=500; at ratio=0.5: n = 0.2/0.01 * 0.5 * 60 = 600 rpm > 500 → speed-dominant
    const motor: ServoMotor = { ...BASE_MOTOR, maxRPM: 500 };
    const ratio = findOptimalGearRatio(BASE_CTX, motor);
    expect(ratio).toBe(0.5);
    // Confirm speed-dominant at GEAR_MIN
    expect(objective(0.5, BASE_CTX, motor)).toBeGreaterThanOrEqual(0);
  });

  it('returns 5.0 (GEAR_MAX) when still torque-limited at the highest ratio', () => {
    // Tiny motor + very heavy load: torque deficit is large even at ratio=10
    const motor: ServoMotor = { ...BASE_MOTOR, peakTorque_Nm: 0.01, ratedTorque_Nm: 0.005 };
    const ctx: GearOptimizationContext = {
      ...BASE_CTX,
      mass_kg: 500,
      F_static_N: 5000,
      F_hold_N: 4905,
    };
    const ratio = findOptimalGearRatio(ctx, motor);
    expect(ratio).toBe(5.0);
    // Confirm torque-dominant at GEAR_MAX
    expect(objective(5.0, ctx, motor)).toBeLessThanOrEqual(0);
  });

  it('returns a ratio within [0.5, 10] for a typical scenario', () => {
    const ratio = findOptimalGearRatio(BASE_CTX, BASE_MOTOR);
    expect(ratio).toBeGreaterThanOrEqual(0.5);
    expect(ratio).toBeLessThanOrEqual(5.0);
  });

  it('result is rounded to one decimal place', () => {
    const ratio = findOptimalGearRatio(BASE_CTX, BASE_MOTOR);
    expect(ratio * 10).toBeCloseTo(Math.round(ratio * 10), 5);
  });

  it('returned ratio minimises max deficit better than either boundary', () => {
    // Motor tight on both speed and torque so the crossover lands inside [0.5, 10]
    const motor: ServoMotor = {
      ...BASE_MOTOR,
      maxRPM: 1500, // speed fails at high ratios
      peakTorque_Nm: 2.5, // torque tight at low ratios
      ratedTorque_Nm: 1.0,
      inertia_kgm2: 1e-5,
    };
    const ctx: GearOptimizationContext = {
      ...BASE_CTX,
      mass_kg: 50,
      F_static_N: 300,
      F_hold_N: 490.5,
      v_peak_m_s: 0.3,
    };

    const ratio = findOptimalGearRatio(ctx, motor);
    const defAtResult = maxDeficit(ratio, ctx, motor);
    const defAtMin = maxDeficit(0.5, ctx, motor);
    const defAtMax = maxDeficit(5.0, ctx, motor);

    // Small tolerance to absorb 1-dp rounding
    expect(defAtResult).toBeLessThanOrEqual(defAtMin + 0.5);
    expect(defAtResult).toBeLessThanOrEqual(defAtMax + 0.5);
  });

  it('each motor gets its own independent ratio', () => {
    // Two motors with different inertias should produce different optimal ratios
    const motorA: ServoMotor = { ...BASE_MOTOR, inertia_kgm2: 1e-6, maxRPM: 6000, peakTorque_Nm: 2 };
    const motorB: ServoMotor = { ...BASE_MOTOR, inertia_kgm2: 1e-3, maxRPM: 1500, peakTorque_Nm: 8 };
    const ctx: GearOptimizationContext = { ...BASE_CTX, mass_kg: 30, F_static_N: 250 };

    const ratioA = findOptimalGearRatio(ctx, motorA);
    const ratioB = findOptimalGearRatio(ctx, motorB);

    // Both are valid ratios
    expect(ratioA).toBeGreaterThanOrEqual(0.5);
    expect(ratioA).toBeLessThanOrEqual(5.0);
    expect(ratioB).toBeGreaterThanOrEqual(0.5);
    expect(ratioB).toBeLessThanOrEqual(5.0);

    // Different motor characteristics should generally produce different ratios
    expect(ratioA).not.toBe(ratioB);
  });
});
