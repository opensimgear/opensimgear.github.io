import { describe, expect, it } from 'vitest';
import { computeTrapezoidalProfile } from '~/components/calculator/actuator-sizing/profile';

describe('computeTrapezoidalProfile', () => {
  it('returns correct phase times for a standard trapezoidal profile', () => {
    const r = computeTrapezoidalProfile(1.0, 0.5, 2.0, 2.0);
    expect(r.t_accel_s).toBeCloseTo(0.25);
    expect(r.t_const_s).toBeCloseTo(1.75);
    expect(r.t_decel_s).toBeCloseTo(0.25);
    expect(r.v_peak_m_s).toBeCloseTo(0.5);
    expect(r.isTriangular).toBe(false);
  });

  it('sets isTriangular=true when stroke is too short to reach v_max', () => {
    const r = computeTrapezoidalProfile(0.01, 0.5, 2.0, 2.0);
    expect(r.isTriangular).toBe(true);
    expect(r.t_const_s).toBeCloseTo(0);
    expect(r.v_peak_m_s).toBeLessThan(0.5);
  });

  it('triangular profile covers the full stroke', () => {
    const stroke = 0.05;
    const r = computeTrapezoidalProfile(stroke, 0.5, 2.0, 3.0);
    const dCovered = 0.5 * r.v_peak_m_s * r.t_accel_s + 0.5 * r.v_peak_m_s * r.t_decel_s;
    expect(dCovered).toBeCloseTo(stroke, 6);
  });

  it('handles asymmetric acceleration and deceleration', () => {
    const r = computeTrapezoidalProfile(2.0, 0.4, 1.0, 2.0);
    expect(r.t_accel_s).toBeCloseTo(0.4);
    expect(r.t_decel_s).toBeCloseTo(0.2);
    expect(r.t_const_s).toBeCloseTo(4.7);
    expect(r.isTriangular).toBe(false);
  });

  it('total motion distance equals stroke for trapezoidal', () => {
    const stroke = 0.8;
    const r = computeTrapezoidalProfile(stroke, 0.3, 5.0, 5.0);
    const d = 0.5 * r.v_peak_m_s * r.t_accel_s + r.v_peak_m_s * r.t_const_s + 0.5 * r.v_peak_m_s * r.t_decel_s;
    expect(d).toBeCloseTo(stroke, 6);
  });
});
