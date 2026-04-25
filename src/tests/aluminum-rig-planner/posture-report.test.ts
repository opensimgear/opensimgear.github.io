import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PLANNER_INPUT,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
} from '../../components/calculator/aluminum-rig-planner/constants';
import { createPlannerPostureReport } from '../../components/calculator/aluminum-rig-planner/posture-report';

describe('aluminum rig planner posture report', () => {
  it('creates finite default posture metrics', () => {
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);

    expect(report.metrics.length).toBeGreaterThan(0);
    for (const metric of report.metrics) {
      const value = metric.unit === 'mm' ? metric.valueMm : metric.valueDeg;

      expect(Number.isFinite(value)).toBe(true);
      expect(metric.label.length).toBeGreaterThan(0);
      expect(['ok', 'warn', 'bad']).toContain(metric.status);
    }
  });

  it('emits hints for out-of-range posture geometry', () => {
    const report = createPlannerPostureReport(
      {
        ...DEFAULT_PLANNER_INPUT,
        steeringColumnDistanceMm: 80,
        pedalTrayDistanceMm: 150,
        pedalsHeightMm: 300,
      },
      DEFAULT_PLANNER_POSTURE_SETTINGS
    );

    expect(report.hints.length).toBeGreaterThan(0);
    expect(report.metrics.some((metric) => metric.status !== 'ok' && metric.hint)).toBe(true);
  });

  it('returns eye debug balls spaced 70 mm apart with 25 mm diameter', () => {
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);

    expect(report.eyeDebug.diameterM).toBeCloseTo(0.025, 6);
    expect(report.eyeDebug.left[0]).toBeCloseTo(report.eyeDebug.right[0], 6);
    expect(report.eyeDebug.left[1]).toBeCloseTo(report.eyeDebug.right[1], 6);
    expect(Math.abs(report.eyeDebug.left[2] - report.eyeDebug.right[2])).toBeCloseTo(0.07, 6);
  });
});
