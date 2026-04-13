import { describe, expect, it } from 'vitest';
import {
  computeForcePerActuator,
  computeGravityForce,
  computeHoldingForce,
  computeStaticForce,
} from '../../components/calculator/actuator-sizing/forces';

const G = 9.81;

describe('computeGravityForce', () => {
  it('returns m*g', () => {
    expect(computeGravityForce(50)).toBeCloseTo(50 * G);
  });
});

describe('computeStaticForce', () => {
  it('sums gravity and friction', () => {
    const F = computeStaticForce(50, 100);
    expect(F).toBeCloseTo(50 * G + 100, 3);
  });
});

describe('computeHoldingForce', () => {
  it('returns gravity only (friction zero at rest)', () => {
    const F = computeHoldingForce(50);
    expect(F).toBeCloseTo(50 * G, 3);
  });
});

describe('computeForcePerActuator', () => {
  it('returns F_total * imbalance for single actuator', () => {
    expect(computeForcePerActuator(1000, 'single', 1.2, 0)).toBeCloseTo(1200);
  });

  it('divides by 4 for 4-actuator system', () => {
    expect(computeForcePerActuator(1000, '4actuator', 1.0, 0)).toBeCloseTo(250);
  });

  it('applies imbalance factor for 4-actuator', () => {
    expect(computeForcePerActuator(1000, '4actuator', 1.2, 0)).toBeCloseTo(300);
  });

  it('divides by 6*cos(angle) for Stewart platform', () => {
    const expected = 1000 / (6 * Math.cos(Math.PI / 4));
    expect(computeForcePerActuator(1000, 'stewart', 1.0, 45)).toBeCloseTo(expected, 3);
  });

  it('applies imbalance factor for Stewart platform', () => {
    const expected = (1000 / (6 * Math.cos(Math.PI / 4))) * 1.2;
    expect(computeForcePerActuator(1000, 'stewart', 1.2, 45)).toBeCloseTo(expected, 3);
  });
});
