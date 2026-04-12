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
  STEEL_DENSITY_KG_M3,
} from '../../components/calculator/actuator-sizing/dynamics';

describe('computeScrewMass', () => {
  it('returns rho*pi*r^2*L for steel', () => {
    const r = 0.008;
    const l = 0.5;
    const expected = STEEL_DENSITY_KG_M3 * Math.PI * r * r * l;
    expect(computeScrewMass(16, 500)).toBeCloseTo(expected, 5);
  });
});

describe('computeScrewRotationalInertia', () => {
  it('returns 0.5 * m * r^2', () => {
    expect(computeScrewRotationalInertia(1.0, 0.01)).toBeCloseTo(0.5 * 1.0 * 0.01 * 0.01, 10);
  });
});

describe('computeLoadInertia', () => {
  it('returns m * (lead / (2pi * i))^2', () => {
    const expected = 50 * Math.pow(0.01 / (2 * Math.PI), 2);
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
    const JScrewRot = 0.5 * 0.7892 * 0.008 * 0.008;
    const JLoad = computeLoadInertia(50, 0.01, 1);
    const JTotal = computeTotalInertia(3e-5, 0, JScrewRot, JLoad, 1);
    expect(JTotal).toBeCloseTo(3e-5 + JScrewRot + JLoad, 10);
  });

  it('reflects J_screw_rot through gear ratio squared', () => {
    const j1 = computeTotalInertia(0, 0, 1e-4, 0, 1);
    const j2 = computeTotalInertia(0, 0, 1e-4, 0, 2);
    expect(j1).toBeCloseTo(1e-4, 10);
    expect(j2).toBeCloseTo(1e-4 / 4, 10);
  });
});

describe('computeMotorSpeedRPM', () => {
  it('returns (v / lead) * gearRatio * 60', () => {
    expect(computeMotorSpeedRPM(0.3, 0.01, 1)).toBeCloseTo(1800);
  });

  it('scales linearly with gear ratio', () => {
    expect(computeMotorSpeedRPM(0.3, 0.01, 2)).toBeCloseTo(3600);
  });
});

describe('computeAngularAcceleration', () => {
  it('returns a * 2pi * gearRatio / lead', () => {
    expect(computeAngularAcceleration(5, 0.01, 1)).toBeCloseTo((5 * 2 * Math.PI) / 0.01, 3);
  });
});

describe('computeScrewTorque', () => {
  it('returns F * lead / (2pi * eta_screw * i * eta_gear)', () => {
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
  const tLoad = computeScrewTorque(50, 0.01, 0.9, 1, 1);
  const inertiaTorque = jTotal * computeAngularAcceleration(5, 0.01, 1);
  const expectedTAccel = tLoad + inertiaTorque;
  const expectedTDecel = tLoad - inertiaTorque;
  const expectedTRms = Math.sqrt(
    (expectedTAccel ** 2 * 0.06 + tLoad ** 2 * 1.607 + expectedTDecel ** 2 * 0.06) / (0.06 + 1.607 + 0.06 + 0.1)
  );

  const result = computePhaseTorques(50, 0, jTotal, 5, 5, 0.3, 0.01, 1, 1.0, 0.9, 0.06, 1.607, 0.06, 0.1);

  it('T_accel includes inertial torque (> T_const)', () => {
    expect(result.T_accel_Nm).toBeGreaterThan(result.T_const_Nm);
    expect(result.T_accel_Nm).toBeCloseTo(expectedTAccel, 6);
  });

  it('T_const equals screw torque from static load only', () => {
    expect(result.T_const_Nm).toBeCloseTo(0.08842, 3);
  });

  it('T_decel is negative for horizontal axis (regenerating)', () => {
    expect(result.T_decel_Nm).toBeLessThan(0);
    expect(result.T_decel_Nm).toBeCloseTo(expectedTDecel, 6);
  });

  it('T_peak equals max absolute phase torque', () => {
    expect(result.T_peak_Nm).toBeCloseTo(
      Math.max(Math.abs(expectedTAccel), Math.abs(tLoad), Math.abs(expectedTDecel)),
      6
    );
  });

  it('T_rms is positive and less than T_peak', () => {
    expect(result.T_rms_Nm).toBeGreaterThan(0);
    expect(result.T_rms_Nm).toBeLessThan(result.T_peak_Nm);
    expect(result.T_rms_Nm).toBeCloseTo(expectedTRms, 6);
  });

  it('motor speed is correct', () => {
    expect(result.n_motor_rpm).toBeCloseTo(1800);
  });
});
