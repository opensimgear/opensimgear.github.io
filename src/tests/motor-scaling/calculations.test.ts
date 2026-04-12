import { describe, it, expect } from 'vitest';
import {
  computeRequiredRPM,
  computeRequiredTorque,
  computeRequiredPower,
  computeReflectedInertia,
  computeMargin,
  evaluateMotor,
  findOptimalDriveRatio,
} from '../../components/calculator/motor-scaling/calculations';
import type { Motor } from '../../components/calculator/motor-scaling/motors';

const testMotor: Motor = {
  id: 'test',
  name: 'Test Motor',
  ratedRPM: 3000,
  ratedTorque_Nm: 2.0,
  peakTorque_Nm: 6.0,
  continuousPower_W: 600,
  inertia_kgm2: 3e-5,
  source: 'builtin',
};

const testReq = {
  axialSpeed_mm_s: 200,
  axialForce_N: 500,
  safetyFactor: 0,
  ballscrewPitch_mm: 10,
  efficiency: 1.0,
};

const testLoad = { screwMass_kg: 0.5, loadMass_kg: 1.0 };

describe('computeRequiredRPM', () => {
  it('returns axialSpeed*60*ratio/pitch', () => {
    // 200 mm/s * 60 / 10 mm * 1 ratio = 1200 RPM
    expect(computeRequiredRPM(200, 1, 10)).toBeCloseTo(1200);
  });
  it('scales linearly with drive ratio', () => {
    expect(computeRequiredRPM(200, 2, 10)).toBeCloseTo(2400);
  });
});

describe('computeRequiredTorque', () => {
  it('returns force*pitch/(1000*2pi*ratio*efficiency)', () => {
    // 500 N * 10 mm / (1000 * 2π * 1 * 1.0) ≈ 0.7958 Nm
    expect(computeRequiredTorque(500, 10, 1, 1.0)).toBeCloseTo(0.7958, 3);
  });
  it('halves when drive ratio doubles', () => {
    const t1 = computeRequiredTorque(500, 10, 1, 1.0);
    const t2 = computeRequiredTorque(500, 10, 2, 1.0);
    expect(t2).toBeCloseTo(t1 / 2, 5);
  });
  it('increases when efficiency is less than 1', () => {
    const t90 = computeRequiredTorque(500, 10, 1, 0.9);
    const t100 = computeRequiredTorque(500, 10, 1, 1.0);
    expect(t90).toBeGreaterThan(t100);
  });
});

describe('computeRequiredPower', () => {
  it('returns torque * angular velocity', () => {
    // 1 Nm * (60 RPM * 2π/60) = 1 * 2π ≈ 6.283 W
    expect(computeRequiredPower(1, 60)).toBeCloseTo(2 * Math.PI, 3);
  });
});

describe('computeReflectedInertia', () => {
  it('returns (m_screw + m_load) * (pitch_m / (2π*ratio))^2', () => {
    // (0.5+1.0) * (0.01 / (2π*1))^2
    const expected = 1.5 * Math.pow(0.01 / (2 * Math.PI), 2);
    expect(computeReflectedInertia(0.5, 1.0, 10, 1)).toBeCloseTo(expected, 10);
  });
});

describe('computeMargin', () => {
  it('returns positive percent when rated > required', () => {
    expect(computeMargin(120, 100)).toBeCloseTo(20);
  });
  it('returns negative percent when rated < required', () => {
    expect(computeMargin(80, 100)).toBeCloseTo(-20);
  });
});

describe('evaluateMotor', () => {
  it('returns pass when motor exceeds all requirements by >20%', () => {
    // testMotor: 3000 RPM, 2 Nm, 600 W
    // At ratio=1: requiredRPM=1200, requiredTorque≈0.796 Nm
    // rpmMargin = (3000-1200)/1200*100 = 150% → pass
    // torqueMargin = (2-0.796)/0.796*100 ≈ 151% → pass
    const result = evaluateMotor(testMotor, testReq, testLoad, 1);
    expect(result.status).toBe('pass');
    expect(result.rpmMargin).toBeGreaterThan(20);
    expect(result.torqueMargin).toBeGreaterThan(20);
  });

  it('returns fail when motor is undersized', () => {
    const underReq = { ...testReq, axialSpeed_mm_s: 3000, axialForce_N: 5000 };
    const result = evaluateMotor(testMotor, underReq, testLoad, 1);
    expect(result.status).toBe('fail');
  });

  it('applies safety factor multiplier to requirements', () => {
    const reqWith20pct = { ...testReq, safetyFactor: 20 };
    const r0 = evaluateMotor(testMotor, testReq, testLoad, 1);
    const r20 = evaluateMotor(testMotor, reqWith20pct, testLoad, 1);
    expect(r20.requiredRPM).toBeCloseTo(r0.requiredRPM * 1.2, 3);
    expect(r20.requiredTorque_Nm).toBeCloseTo(r0.requiredTorque_Nm * 1.2, 3);
  });

  it('computes inertia ratio', () => {
    const result = evaluateMotor(testMotor, testReq, testLoad, 1);
    const expectedInertia = computeReflectedInertia(0.5, 1.0, 10, 1);
    expect(result.inertiaRatio).toBeCloseTo(expectedInertia / testMotor.inertia_kgm2, 3);
  });
});

describe('findOptimalDriveRatio', () => {
  it('returns a ratio where rpmMargin ≈ torqueMargin', () => {
    const ratio = findOptimalDriveRatio(testMotor, testReq, testLoad);
    const result = evaluateMotor(testMotor, testReq, testLoad, ratio);
    expect(Math.abs(result.rpmMargin - result.torqueMargin)).toBeLessThan(1);
  });

  it('returns ratio within [0.5, 10]', () => {
    const ratio = findOptimalDriveRatio(testMotor, testReq, testLoad);
    expect(ratio).toBeGreaterThanOrEqual(0.5);
    expect(ratio).toBeLessThanOrEqual(10);
  });
});
