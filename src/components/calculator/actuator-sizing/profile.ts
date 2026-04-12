import type { TrapezoidalProfileResult } from './types';

export function computeTrapezoidalProfile(
  strokeLength_m: number,
  maxVelocity_m_s: number,
  acceleration_m_s2: number,
  deceleration_m_s2: number
): TrapezoidalProfileResult {
  const tAccel = maxVelocity_m_s / acceleration_m_s2;
  const tDecel = maxVelocity_m_s / deceleration_m_s2;
  const dAccel = 0.5 * maxVelocity_m_s * tAccel;
  const dDecel = 0.5 * maxVelocity_m_s * tDecel;
  const dConst = strokeLength_m - dAccel - dDecel;

  if (dConst >= 0) {
    return {
      t_accel_s: tAccel,
      t_const_s: dConst / maxVelocity_m_s,
      t_decel_s: tDecel,
      v_peak_m_s: maxVelocity_m_s,
      isTriangular: false,
    };
  }

  const vPeak = Math.sqrt((2 * strokeLength_m) / (1 / acceleration_m_s2 + 1 / deceleration_m_s2));

  return {
    t_accel_s: vPeak / acceleration_m_s2,
    t_const_s: 0,
    t_decel_s: vPeak / deceleration_m_s2,
    v_peak_m_s: vPeak,
    isTriangular: true,
  };
}
