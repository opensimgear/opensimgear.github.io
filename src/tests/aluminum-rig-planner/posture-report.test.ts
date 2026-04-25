import { describe, expect, it } from 'vitest';

import {
  BASE_BEAM_HEIGHT_MM,
  DEFAULT_MONITOR_DISTANCE_FROM_EYES_MM,
  DEFAULT_MONITOR_HEIGHT_FROM_BASE_MM,
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

  it('returns a 10 mm monitor midpoint debug ball relative to eye center and base height', () => {
    const postureSettings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorDistanceFromEyesMm: DEFAULT_MONITOR_DISTANCE_FROM_EYES_MM + 100,
      monitorHeightFromBaseMm: DEFAULT_MONITOR_HEIGHT_FROM_BASE_MM + 50,
    };
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, postureSettings);

    expect(report.monitorDebug.diameterM).toBeCloseTo(0.01, 6);
    expect(report.monitorDebug.position[0]).toBeCloseTo(
      report.eyeDebug.center[0] + postureSettings.monitorDistanceFromEyesMm * 0.001,
      6
    );
    expect(report.monitorDebug.position[1]).toBeCloseTo(
      (BASE_BEAM_HEIGHT_MM + postureSettings.monitorHeightFromBaseMm) * 0.001,
      6
    );
    expect(report.monitorDebug.position[2]).toBe(0);
  });
});
