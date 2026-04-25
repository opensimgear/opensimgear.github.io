import { describe, expect, it } from 'vitest';

import {
  BASE_BEAM_HEIGHT_MM,
  CURVED_MONITOR_RECOMMENDED_FOV_DEG,
  DEFAULT_MONITOR_HEIGHT_FROM_BASE_MM,
  DEFAULT_PLANNER_INPUT,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
} from '../../components/calculator/aluminum-rig-planner/constants';
import { getMonitorDimensionsMm } from '../../components/calculator/aluminum-rig-planner/modules/monitor';
import { createPlannerPostureSkeleton } from '../../components/calculator/aluminum-rig-planner/posture';
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

  it('reports head-based posture metrics without debug eye payload', () => {
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);

    expect(report.metrics.some((metric) => metric.key === 'headToWheel')).toBe(true);
    expect(report.metrics.some((metric) => metric.key === 'headToMonitor')).toBe(true);
    expect('eyeDebug' in report).toBe(false);
  });

  it('solves flat monitor midpoint distance from target horizontal FOV', () => {
    const postureSettings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: 'disabled' as const,
      monitorDistanceFromEyesMm: 1234,
      monitorTargetFovDeg: 60,
      monitorHeightFromBaseMm: DEFAULT_MONITOR_HEIGHT_FROM_BASE_MM + 50,
    };
    const dimensions = getMonitorDimensionsMm(postureSettings);
    const expectedDistanceMm = dimensions.widthMm / 2 / Math.tan((postureSettings.monitorTargetFovDeg * Math.PI) / 360);
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, postureSettings);
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, postureSettings);

    expect(report.monitorDebug.diameterM).toBeCloseTo(0.01, 6);
    expect(report.monitorDebug.position[0]).toBeCloseTo(skeleton.joints.head[0] + expectedDistanceMm * 0.001, 6);
    expect(report.monitorDebug.position[1]).toBe(0);
    expect(report.monitorDebug.position[2]).toBeCloseTo(
      (BASE_BEAM_HEIGHT_MM + postureSettings.monitorHeightFromBaseMm) * 0.001,
      6
    );
  });

  it('places curved monitor midpoint at the recommended curved viewing distance', () => {
    const postureSettings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: '1000r' as const,
      monitorDistanceFromEyesMm: 333,
      monitorTargetFovDeg: 30,
    };
    const dimensions = getMonitorDimensionsMm(postureSettings);
    const expectedDistanceMm = dimensions.widthMm / 2 / Math.tan((CURVED_MONITOR_RECOMMENDED_FOV_DEG * Math.PI) / 360);
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, postureSettings);
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, postureSettings);

    expect(report.monitorDebug.position[0]).toBeCloseTo(skeleton.joints.head[0] + expectedDistanceMm * 0.001, 6);
  });
});
