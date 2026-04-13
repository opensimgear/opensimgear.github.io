export type SystemType = 'single' | '4actuator' | 'stewart';
export type ProfileType = 'trapezoidal' | 'scurve';

export interface TrapezoidalProfileResult {
  t_accel_s: number;
  t_const_s: number;
  t_decel_s: number;
  v_peak_m_s: number;
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
  gearRatio: number;
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
