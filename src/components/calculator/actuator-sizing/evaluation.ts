import type { MotorEvaluationV2, ServoMotor } from './types';

export function computeMargin(rated: number, required: number): number {
  if (required === 0) {
    return rated > 0 ? Infinity : 0;
  }

  return ((rated - required) / required) * 100;
}

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
  const multiplier = 1 + safetyFactor_pct / 100;
  const T_peak_required = T_peak_Nm * multiplier;
  const T_rms_required = T_rms_Nm * multiplier;
  const n_required = n_rpm * multiplier;
  const P_peak_required = P_peak_W * multiplier;
  const inertiaRatio = J_load_kgm2 / motor.inertia_kgm2;
  const peakTorqueMargin_pct = computeMargin(motor.peakTorque_Nm, T_peak_required);
  const rmsTorqueMargin_pct = computeMargin(motor.ratedTorque_Nm, T_rms_required);
  const speedMargin_pct = computeMargin(motor.maxRPM, n_required);

  let status: 'pass' | 'warn' | 'fail';
  if (peakTorqueMargin_pct < 0 || rmsTorqueMargin_pct < 0 || speedMargin_pct < 0) {
    status = 'fail';
  } else if (peakTorqueMargin_pct < 20 || rmsTorqueMargin_pct < 20 || speedMargin_pct < 20 || inertiaRatio > 10) {
    status = 'warn';
  } else {
    status = 'pass';
  }

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
    score: computeScore(
      T_rms_required,
      motor.ratedTorque_Nm,
      T_peak_required,
      motor.peakTorque_Nm,
      n_required,
      motor.maxRPM,
      inertiaRatio
    ),
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
      const order: Record<MotorEvaluationV2['status'], number> = { pass: 0, warn: 1, fail: 2 };
      const statusDiff = order[a.status] - order[b.status];
      if (statusDiff !== 0) {
        return statusDiff;
      }

      return b.score - a.score;
    });
}
