import { describe, expect, it } from 'vitest';
import {
  computeForcePerActuator,
  computeGravityForce,
  computeHoldingForce,
  computeStaticForce,
} from '../../components/calculator/actuator-sizing/forces';

const G = 9.81;

describe('computeGravityForce', () => {
  it('returns 0 for horizontal orientation', () => {
    expect(computeGravityForce(100, 'horizontal', 0)).toBe(0);
  });

  it('returns m*g for vertical orientation', () => {
    expect(computeGravityForce(50, 'vertical', 0)).toBeCloseTo(50 * G);
  });

  it('returns m*g*sin(angle) for inclined orientation', () => {
    expect(computeGravityForce(100, 'inclined', 30)).toBeCloseTo(100 * G * 0.5, 3);
  });

  it('returns m*g for inclined at 90 degrees (vertical)', () => {
    expect(computeGravityForce(100, 'inclined', 90)).toBeCloseTo(100 * G, 3);
  });
});

describe('computeStaticForce', () => {
  it('sums gravity, friction, external, and guide forces', () => {
    const F = computeStaticForce(50, 'vertical', 0, 100, 50, 20);
    expect(F).toBeCloseTo(50 * G + 100 + 50 + 20, 3);
  });

  it('returns only friction+external+guide for horizontal axis', () => {
    const F = computeStaticForce(100, 'horizontal', 0, 80, 30, 10);
    expect(F).toBeCloseTo(80 + 30 + 10);
  });
});

describe('computeHoldingForce', () => {
  it('excludes friction (zero at rest)', () => {
    const F = computeHoldingForce(50, 'vertical', 0, 20);
    expect(F).toBeCloseTo(50 * G + 20, 3);
  });

  it('returns 0 for horizontal axis with no guide preload', () => {
    expect(computeHoldingForce(100, 'horizontal', 0, 0)).toBe(0);
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
