import type { PhaseTorques } from './types';

const STEEL_DENSITY_KG_M3 = 7850;

export function computeScrewMass(diameter_mm: number, length_mm: number, density = STEEL_DENSITY_KG_M3): number {
  const radius_m = diameter_mm / 2 / 1000;
  const length_m = length_mm / 1000;
  return density * Math.PI * radius_m * radius_m * length_m;
}

export function computeScrewRotationalInertia(mass_kg: number, radius_m: number): number {
  return 0.5 * mass_kg * radius_m * radius_m;
}

export function computeLoadInertia(mass_kg: number, lead_m: number, gearRatio: number): number {
  const effectiveLead = lead_m / (2 * Math.PI * gearRatio);
  return mass_kg * effectiveLead * effectiveLead;
}

export function computeTotalInertia(
  J_motor_kgm2: number,
  J_gear_kgm2: number,
  J_screw_rot_kgm2: number,
  J_load_kgm2: number,
  gearRatio: number
): number {
  return J_motor_kgm2 + J_gear_kgm2 + J_screw_rot_kgm2 / (gearRatio * gearRatio) + J_load_kgm2;
}

export function computeMotorSpeedRPM(velocity_m_s: number, lead_m: number, gearRatio: number): number {
  return (velocity_m_s / lead_m) * gearRatio * 60;
}

export function computeAngularAcceleration(linear_accel_m_s2: number, lead_m: number, gearRatio: number): number {
  return (linear_accel_m_s2 * 2 * Math.PI * gearRatio) / lead_m;
}

export function computeScrewTorque(
  force_N: number,
  lead_m: number,
  screwEfficiency: number,
  gearRatio: number,
  gearEfficiency: number
): number {
  return (force_N * lead_m) / (2 * Math.PI * screwEfficiency * gearRatio * gearEfficiency);
}

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
  const TLoad = computeScrewTorque(F_static_N, lead_m, screwEfficiency, gearRatio, gearEfficiency);
  const THold = computeScrewTorque(F_hold_N, lead_m, screwEfficiency, gearRatio, gearEfficiency);
  const alphaAccel = computeAngularAcceleration(acceleration_m_s2, lead_m, gearRatio);
  const alphaDecel = computeAngularAcceleration(deceleration_m_s2, lead_m, gearRatio);
  const TAccel = TLoad + J_total_kgm2 * alphaAccel;
  const TConst = TLoad;
  const TDecel = TLoad - J_total_kgm2 * alphaDecel;
  const totalTime = t_accel_s + t_const_s + t_decel_s + dwellTime_s;
  const TRms = Math.sqrt(
    (TAccel ** 2 * t_accel_s + TConst ** 2 * t_const_s + TDecel ** 2 * t_decel_s + THold ** 2 * dwellTime_s) / totalTime
  );
  const TPeak = Math.max(Math.abs(TAccel), Math.abs(TConst), Math.abs(TDecel), Math.abs(THold));
  const nMotorRpm = computeMotorSpeedRPM(v_peak_m_s, lead_m, gearRatio);
  const omega = (nMotorRpm * 2 * Math.PI) / 60;

  return {
    T_accel_Nm: TAccel,
    T_const_Nm: TConst,
    T_decel_Nm: TDecel,
    T_hold_Nm: THold,
    T_rms_Nm: TRms,
    T_peak_Nm: TPeak,
    n_motor_rpm: nMotorRpm,
    P_peak_W: TPeak * omega,
  };
}
