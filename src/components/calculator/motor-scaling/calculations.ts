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
