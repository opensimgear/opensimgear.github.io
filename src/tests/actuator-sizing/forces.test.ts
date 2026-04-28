import { describe, expect, it } from 'vitest';
import {
  computeForcePerActuator,
  computeHoldingForce,
  computeStaticForce,
} from '~/components/calculator/actuator-sizing/forces';

describe('computeStaticForce', () => {
  it('sums gravity and friction for known mass', () => {
    const F = computeStaticForce(50, 100);
    expect(F).toBeCloseTo(590.5, 1);
  });
});

describe('computeHoldingForce', () => {
  it('returns gravity force for known mass', () => {
    const F = computeHoldingForce(50);
    expect(F).toBeCloseTo(490.5, 1);
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
    expect(computeForcePerActuator(1000, 'stewart', 1.0, 45)).toBeCloseTo(235.702, 3);
  });

  it('applies imbalance factor for Stewart platform', () => {
    expect(computeForcePerActuator(1000, 'stewart', 1.2, 45)).toBeCloseTo(282.843, 3);
  });
});
