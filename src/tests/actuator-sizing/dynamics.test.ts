import { describe, expect, it } from 'vitest';
import {
  computeAngularAcceleration,
  computeLoadInertia,
  computeMotorSpeedRPM,
  computePhaseTorques,
  computeScrewMass,
  computeScrewRotationalInertia,
  computeScrewTorque,
  computeTotalInertia,
} from '~/components/calculator/actuator-sizing/dynamics';

describe('computeScrewMass', () => {
  it('returns expected mass for a 16mm diameter 500mm steel screw', () => {
    expect(computeScrewMass(16, 500)).toBeCloseTo(0.78917, 4);
  });
});

describe('computeScrewRotationalInertia', () => {
  it('returns expected rotational inertia for known mass and radius', () => {
    expect(computeScrewRotationalInertia(1.0, 0.01)).toBeCloseTo(5e-5, 10);
  });
});

describe('computeLoadInertia', () => {
  it('returns expected inertia for known mass, lead, and gear ratio', () => {
    expect(computeLoadInertia(50, 0.01, 1)).toBeCloseTo(1.2665e-4, 6);
  });

  it('decreases with higher gear ratio', () => {
    const j1 = computeLoadInertia(50, 0.01, 1);
    const j2 = computeLoadInertia(50, 0.01, 2);
    expect(j2).toBeCloseTo(j1 / 4, 10);
  });
});

describe('computeTotalInertia', () => {
  it('sums motor, gear, screw and load inertia components', () => {
    const JScrewRot = 0.5 * 0.7892 * 0.008 * 0.008;
    const JLoad = computeLoadInertia(50, 0.01, 1);
    const JTotal = computeTotalInertia(3e-5, 0, JScrewRot, JLoad, 1);
    expect(JTotal).toBeCloseTo(1.819e-4, 6);
  });

  it('reflects screw inertia through gear ratio squared', () => {
    const j1 = computeTotalInertia(0, 0, 1e-4, 0, 1);
    const j2 = computeTotalInertia(0, 0, 1e-4, 0, 2);
    expect(j1).toBeCloseTo(1e-4, 10);
    expect(j2).toBeCloseTo(1e-4 / 4, 10);
  });
});

describe('computeMotorSpeedRPM', () => {
  it('returns expected RPM for known velocity, lead and gear ratio', () => {
    expect(computeMotorSpeedRPM(0.3, 0.01, 1)).toBeCloseTo(1800);
  });

  it('scales linearly with gear ratio', () => {
    expect(computeMotorSpeedRPM(0.3, 0.01, 2)).toBeCloseTo(3600);
  });
});

describe('computeAngularAcceleration', () => {
  it('returns expected angular acceleration for known linear acceleration, lead and gear ratio', () => {
    expect(computeAngularAcceleration(5, 0.01, 1)).toBeCloseTo(3141.593, 3);
  });
});

describe('computeScrewTorque', () => {
  it('returns expected torque for known force, lead, efficiency and gear ratio', () => {
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
  const jScrewRot = computeScrewRotationalInertia(computeScrewMass(16, 500), 0.008);
  const jLoad = computeLoadInertia(50, 0.01, 1);
  const jTotal = computeTotalInertia(3e-5, 0, jScrewRot, jLoad, 1);

  const result = computePhaseTorques(50, 0, jTotal, 5, 5, 0.3, 0.01, 1, 1.0, 0.9, 0.06, 1.607, 0.06, 0.1);

  it('T_accel includes inertial torque (> T_const)', () => {
    expect(result.T_accel_Nm).toBeGreaterThan(result.T_const_Nm);
  });

  it('T_const equals screw torque from static load only', () => {
    expect(result.T_const_Nm).toBeCloseTo(0.08842, 3);
  });

  it('T_decel is negative for horizontal axis (regenerating)', () => {
    expect(result.T_decel_Nm).toBeLessThan(0);
  });

  it('T_peak equals max absolute phase torque', () => {
    expect(result.T_peak_Nm).toBe(
      Math.max(Math.abs(result.T_accel_Nm), Math.abs(result.T_const_Nm), Math.abs(result.T_decel_Nm))
    );
  });

  it('T_rms is positive and less than T_peak', () => {
    expect(result.T_rms_Nm).toBeGreaterThan(0);
    expect(result.T_rms_Nm).toBeLessThan(result.T_peak_Nm);
  });

  it('motor speed is correct', () => {
    expect(result.n_motor_rpm).toBeCloseTo(1800);
  });
});
