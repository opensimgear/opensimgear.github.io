import { describe, expect, it } from 'vitest';

import {
  BASE_BEAM_HEIGHT_MM,
  CURVED_MONITOR_RECOMMENDED_FOV_DEG,
  DEFAULT_MONITOR_HEIGHT_FROM_BASE_MM,
  DEFAULT_PLANNER_INPUT,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  PLANNER_POSTURE_LIMITS,
} from '../../components/calculator/aluminum-rig-planner/constants';
import { getMonitorDimensionsMm } from '../../components/calculator/aluminum-rig-planner/modules/monitor';
import { createPlannerPostureSkeleton } from '../../components/calculator/aluminum-rig-planner/posture';
import { createPlannerPostureReport } from '../../components/calculator/aluminum-rig-planner/posture-report';
import {
  applyPresetToPlannerInput,
  applyPresetToPostureSettings,
} from '../../components/calculator/aluminum-rig-planner/presets';
import type { PlannerPosturePreset } from '../../components/calculator/aluminum-rig-planner/types';

const SOLVABLE_PRESETS = ['formula', 'gt', 'rally', 'road'] satisfies PlannerPosturePreset[];

function formatMetricValue(metric: ReturnType<typeof createPlannerPostureReport>['metrics'][number]) {
  return metric.unit === 'mm' ? `${metric.valueMm}mm` : `${metric.valueDeg}deg`;
}

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

  it('reports eye-based posture metrics without extra eye debug payload', () => {
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);

    expect(report.metrics.some((metric) => metric.key === 'eyeToWheelTop' && metric.label === 'Eye to wheel top')).toBe(
      true
    );
    expect(
      report.metrics.some(
        (metric) => metric.key === 'eyeToMonitorMidpoint' && metric.label === 'Eye to monitor midpoint'
      )
    ).toBe(true);
    expect('eyeDebug' in report).toBe(false);
  });

  it('keeps preset posture reports out of bad status for every supported height', () => {
    const failures: string[] = [];

    for (const preset of SOLVABLE_PRESETS) {
      for (
        let heightCm = PLANNER_POSTURE_LIMITS.heightMinCm;
        heightCm <= PLANNER_POSTURE_LIMITS.heightMaxCm;
        heightCm += 1
      ) {
        const input = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, preset, heightCm);
        const settings = applyPresetToPostureSettings(
          {
            ...DEFAULT_PLANNER_POSTURE_SETTINGS,
            preset,
            heightCm,
          },
          input
        );
        const report = createPlannerPostureReport(input, settings);

        for (const metric of report.metrics) {
          const value = metric.unit === 'mm' ? metric.valueMm : metric.valueDeg;

          if (!Number.isFinite(value) || metric.status === 'bad') {
            failures.push(
              `${preset} ${heightCm}cm ${metric.key}: ${formatMetricValue(metric)} failed ${metric.range.min}-${metric.range.max}${metric.unit}; status ${metric.status}${metric.hint ? `; ${metric.hint}` : ''}`
            );
          }
        }
      }
    }

    expect(failures, failures.slice(0, 30).join('\n')).toEqual([]);
  });

  it('solves flat monitor midpoint distance from target horizontal FOV using eye center anchor', () => {
    const postureSettings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: 'disabled' as const,
      monitorDistanceFromEyesMm: 1234,
      monitorTargetFovDeg: 60,
      monitorHeightFromBaseMm: DEFAULT_MONITOR_HEIGHT_FROM_BASE_MM + 50,
    };
    const postureModel = {
      anthropometryRatios: {
        sittingHeight: 0.477,
        seatedShoulderHeight: 0.292,
        hipBreadth: 0.123,
        shoulderBreadth: 0.205,
        upperArmLength: 0.141,
        forearmHandLength: 0.195,
        thighLength: 0.248,
        lowerLegLength: 0.231,
        footLength: 0.143,
      },
      eyeCenterSittingHeight: 0.33,
      eyeCenterForwardFromHip: 0.11,
      eyeCenterHeightFromHip: 0.36,
      heelLengthShare: 0.3,
    };
    const dimensions = getMonitorDimensionsMm(postureSettings);
    const expectedDistanceMm = dimensions.widthMm / 2 / Math.tan((postureSettings.monitorTargetFovDeg * Math.PI) / 360);
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, postureSettings, postureModel);
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, postureSettings, postureModel);

    expect(report.monitorDebug.diameterM).toBeCloseTo(0.01, 6);
    expect(report.monitorDebug.position[0]).toBeCloseTo(skeleton.joints.eyeCenter[0] + expectedDistanceMm * 0.001, 6);
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

    expect(report.monitorDebug.position[0]).toBeCloseTo(skeleton.joints.eyeCenter[0] + expectedDistanceMm * 0.001, 6);
  });
});
