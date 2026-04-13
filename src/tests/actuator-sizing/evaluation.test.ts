import { describe, expect, it } from 'vitest';
import {
  computeMargin,
  computeScore,
  evaluateMotorForActuator,
  rankMotors,
} from '../../components/calculator/actuator-sizing/evaluation';
import type { ServoMotor } from '../../components/calculator/actuator-sizing/types';

const testMotor: ServoMotor = {
  id: 'test',
  name: 'Test Servo',
  ratedRPM: 3000,
  maxRPM: 5000,
  ratedTorque_Nm: 2.0,
  peakTorque_Nm: 6.0,
  continuousPower_W: 600,
  inertia_kgm2: 3e-5,
  source: 'builtin',
};

describe('computeMargin', () => {
  it('returns positive percent when rated > required', () => {
    expect(computeMargin(120, 100)).toBeCloseTo(20);
  });

  it('returns negative percent when rated < required', () => {
    expect(computeMargin(80, 100)).toBeCloseTo(-20);
  });

  it('returns Infinity when required is 0 and rated > 0', () => {
    expect(computeMargin(5, 0)).toBe(Infinity);
  });
});

describe('computeScore', () => {
  it('returns a value between 0 and 150', () => {
    const s = computeScore(0.2, 2.0, 0.8, 6.0, 2160, 3000, 4.2, 'pass');
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(150);
  });

  it('gives higher score for better-utilized motor (closer to limits)', () => {
    const sBig = computeScore(0.2, 10.0, 0.8, 30.0, 2160, 10000, 4.2, 'pass');
    const sFit = computeScore(0.2, 2.0, 0.8, 6.0, 2160, 3000, 4.2, 'pass');
    expect(sFit).toBeGreaterThan(sBig);
  });

  it('penalizes inertia ratio > 10', () => {
    const sNormal = computeScore(0.2, 2.0, 0.8, 6.0, 2160, 3000, 4, 'pass');
    const sBad = computeScore(0.2, 2.0, 0.8, 6.0, 2160, 3000, 20, 'pass');
    expect(sBad).toBeLessThan(sNormal);
  });
});

describe('evaluateMotorForActuator', () => {
  const result = evaluateMotorForActuator(testMotor, 0.668, 0.1716, 1800, 126, 1.267e-4, 1.845e-4, 20);

  it('applies safety factor to required values', () => {
    expect(result.T_peak_required_Nm).toBeCloseTo(0.668 * 1.2, 3);
    expect(result.T_rms_required_Nm).toBeCloseTo(0.1716 * 1.2, 3);
    expect(result.n_required_rpm).toBeCloseTo(1800 * 1.2);
  });

  it('passes for a well-matched motor', () => {
    expect(result.status).toBe('pass');
  });

  it('has positive margins on all constraints', () => {
    expect(result.peakTorqueMargin_pct).toBeGreaterThan(0);
    expect(result.rmsTorqueMargin_pct).toBeGreaterThan(0);
    expect(result.speedMargin_pct).toBeGreaterThan(0);
  });

  it('computes inertia ratio correctly', () => {
    expect(result.inertiaRatio).toBeCloseTo(1.267e-4 / 3e-5, 3);
  });

  it('fails when peak torque is exceeded', () => {
    const r = evaluateMotorForActuator(testMotor, 10, 0.2, 1800, 126, 1.267e-4, 1.845e-4, 0);
    expect(r.status).toBe('fail');
    expect(r.peakTorqueMargin_pct).toBeLessThan(0);
  });

  it('fails when speed is exceeded', () => {
    const r = evaluateMotorForActuator(testMotor, 0.5, 0.2, 8000, 126, 1.267e-4, 1.845e-4, 0);
    expect(r.status).toBe('fail');
    expect(r.speedMargin_pct).toBeLessThan(0);
  });

  it('warns when inertia ratio > 10', () => {
    const jLoadHigh = testMotor.inertia_kgm2 * 15;
    const r = evaluateMotorForActuator(
      testMotor,
      0.5,
      0.2,
      1000,
      100,
      jLoadHigh,
      jLoadHigh + testMotor.inertia_kgm2,
      0
    );
    expect(r.status).toBe('warn');
    expect(r.inertiaRatio).toBeGreaterThan(10);
  });
});

describe('rankMotors', () => {
  const smallMotor: ServoMotor = {
    ...testMotor,
    id: 'small',
    name: 'Small',
    ratedTorque_Nm: 0.1,
    peakTorque_Nm: 0.3,
    maxRPM: 5000,
    inertia_kgm2: 1e-5,
  };

  const results = rankMotors([smallMotor, testMotor], 0.668, 0.1716, 1800, 126, 1.267e-4, 1.845e-4, 20);

  it('returns one result per motor', () => {
    expect(results).toHaveLength(2);
  });

  it('puts passing motors before failing ones', () => {
    expect(results[0].status).not.toBe('fail');
  });

  it('failing motor is last', () => {
    expect(results[results.length - 1].status).toBe('fail');
  });
});
