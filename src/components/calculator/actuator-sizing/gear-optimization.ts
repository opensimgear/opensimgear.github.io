import { computeLoadInertia, computePhaseTorques, computeTotalInertia } from './dynamics';
import type { ServoMotor } from './types';

const GEAR_MIN = 0.5;
const GEAR_MAX = 5.0;
const ITERATIONS = 40;

export interface GearOptimizationContext {
  // Load
  mass_kg: number;
  lead_m: number;
  F_static_N: number;
  F_hold_N: number;
  // Motion profile
  acceleration_m_s2: number;
  deceleration_m_s2: number;
  v_peak_m_s: number;
  t_accel_s: number;
  t_const_s: number;
  t_decel_s: number;
  dwellTime_s: number;
  // Drivetrain
  J_screw_rot_kgm2: number;
  J_gear_kgm2: number;
  gearEfficiency: number;
  screwEfficiency: number;
  // Evaluation
  safetyFactor_pct: number;
}

function deficit(required: number, rated: number): number {
  if (required <= 0) return -Infinity;
  return ((required - rated) / required) * 100;
}

/**
 * Returns rpmDeficit − torqueDeficit at the given ratio.
 *
 * Positive → speed-dominant (ratio is too high).
 * Negative → torque-dominant (ratio is too low).
 * Zero     → balanced; max(rpmDeficit, torqueDeficit) is minimised here.
 */
function computeObjective(ratio: number, ctx: GearOptimizationContext, motor: ServoMotor): number {
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

  const n_req = phases.n_motor_rpm * multiplier;
  const T_peak_req = phases.T_peak_Nm * multiplier;
  const T_rms_req = phases.T_rms_Nm * multiplier;

  const rpmDeficit = deficit(n_req, motor.maxRPM);
  const torqueDeficit = Math.max(deficit(T_peak_req, motor.peakTorque_Nm), deficit(T_rms_req, motor.ratedTorque_Nm));

  return rpmDeficit - torqueDeficit;
}

/**
 * Binary-searches [0.5, 10] for the gear ratio that minimises
 * max(rpmDeficit%, torqueDeficit%). A deficit is negative headroom:
 * (required − rated) / required × 100.
 *
 * As ratio rises rpmDeficit increases and torqueDeficit decreases, so the
 * minimum of their maximum occurs at the crossover where
 * f = rpmDeficit − torqueDeficit = 0. The search converges in O(log n).
 *
 * Solved independently per motor, so each motor gets its own optimal ratio.
 */
export function findOptimalGearRatio(ctx: GearOptimizationContext, motor: ServoMotor): number {
  // Speed-dominant even at the lowest ratio: return minimum (can only get worse).
  if (computeObjective(GEAR_MIN, ctx, motor) >= 0) return GEAR_MIN;
  // Torque-dominant even at the highest ratio: return maximum (best effort).
  if (computeObjective(GEAR_MAX, ctx, motor) <= 0) return GEAR_MAX;

  let lo = GEAR_MIN;
  let hi = GEAR_MAX;
  for (let i = 0; i < ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    if (computeObjective(mid, ctx, motor) < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return Math.round(hi * 10) / 10;
}
