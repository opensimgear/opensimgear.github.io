import { describe, expect, it } from 'vitest';
import { buildMotionProfileDiagram } from '../../components/calculator/actuator-sizing/motion-profile-diagram';

describe('buildMotionProfileDiagram', () => {
  it('returns velocity-only geometry for a trapezoidal profile', () => {
    const diagram = buildMotionProfileDiagram({
      t_accel_s: 0.2,
      t_const_s: 0.6,
      t_decel_s: 0.2,
      dwellTime_s: 0.5,
    });

    expect(diagram).not.toHaveProperty('totalTime_s');
    expect(diagram).not.toHaveProperty('positionPath');

    expect(diagram.phaseBoundaries).toEqual({
      accelEnd: 0.13333333333333333,
      constEnd: 0.5333333333333333,
      decelEnd: 0.6666666666666666,
      dwellEnd: 1,
    });

    expect(diagram.velocityPath).toBe('M 0 1 L 0.133333 0 L 0.533333 0 L 0.666667 1 L 1 1');
    expect(diagram.segments.map((segment) => segment.kind)).toEqual(['accel', 'const', 'decel', 'dwell']);
  });

  it('collapses the constant segment for triangular motion', () => {
    const diagram = buildMotionProfileDiagram({
      t_accel_s: 0.2,
      t_const_s: 0,
      t_decel_s: 0.2,
      dwellTime_s: 0.5,
    });

    expect(diagram.phaseBoundaries).toEqual({
      accelEnd: 0.22222222222222224,
      constEnd: 0.22222222222222224,
      decelEnd: 0.4444444444444445,
      dwellEnd: 1,
    });

    expect(diagram).not.toHaveProperty('positionPath');
    expect(diagram.velocityPath).toBe('M 0 1 L 0.222222 0 L 0.444444 1 L 1 1');
    expect(diagram.segments.map((segment) => segment.kind)).toEqual(['accel', 'decel', 'dwell']);
  });

  it('adds a flat dwell tail only when dwell time is positive', () => {
    const withoutDwell = buildMotionProfileDiagram({
      t_accel_s: 0.2,
      t_const_s: 0.6,
      t_decel_s: 0.2,
      dwellTime_s: 0,
    });

    const withDwell = buildMotionProfileDiagram({
      t_accel_s: 0.2,
      t_const_s: 0.6,
      t_decel_s: 0.2,
      dwellTime_s: 0.5,
    });

    expect(withoutDwell).not.toHaveProperty('positionPath');
    expect(withoutDwell.velocityPath).toBe('M 0 1 L 0.2 0 L 0.8 0 L 1 1');
    expect(withoutDwell.segments.map((segment) => segment.kind)).toEqual(['accel', 'const', 'decel']);

    expect(withDwell).not.toHaveProperty('positionPath');
    expect(withDwell.velocityPath).toBe('M 0 1 L 0.133333 0 L 0.533333 0 L 0.666667 1 L 1 1');
    expect(withDwell.segments.map((segment) => segment.kind)).toEqual(['accel', 'const', 'decel', 'dwell']);
  });

  it('marks only segments wide enough for inline labels', () => {
    const diagram = buildMotionProfileDiagram({
      t_accel_s: 0.2,
      t_const_s: 0.02,
      t_decel_s: 0.2,
      dwellTime_s: 0.5,
    });

    expect(diagram.labelVisibility).toEqual({
      accel: true,
      const: false,
      decel: true,
      dwell: true,
    });
  });
});
