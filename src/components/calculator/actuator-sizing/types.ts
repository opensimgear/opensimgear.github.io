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

export type MotorType = 'ac-servo' | 'dc-servo' | 'bldc-servo' | 'step-servo' | 'closed-loop-stepper';

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
  flange_mm?: number;
  length_mm?: number;
  dimensions_mm?: MotorDimensionsMm;
  shaftDiameter_mm?: number;
  shaftLength_mm?: number;
  voltage_V?: number;
  current_A?: number;
  phases?: number;
  poleCount?: number;
  hasBrake?: boolean;
  encoder?: string;
  protectionRating?: string;
  insulationClass?: string;
  cooling?: string;
  resistance_ohm?: number;
  inductance_mH?: number;
  thermalTimeConstant_s?: number;
  cost_usd?: number;
  price_usd?: number;
  datasheetPath?: string;
  datasheetUrl?: string;
  productUrl?: string;
  sourceNote?: string;
  torqueCurve?: TorqueCurvePoint[];
  speedTorqueCurve?: SpeedTorqueCurvePoint[];
  notes?: string;
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
