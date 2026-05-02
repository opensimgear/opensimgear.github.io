import { beforeAll, describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_INPUT } from '~/components/calculator/aluminum-rig-planner/constants/planner';
import { BASE_BEAM_HEIGHT_MM } from '~/components/calculator/aluminum-rig-planner/constants/profile';
import {
  DEFAULT_MONITOR_HEIGHT_FROM_BASE_MM,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  PLANNER_POSTURE_LIMITS,
} from '~/components/calculator/aluminum-rig-planner/constants/posture';
import { createPlannerPostureSkeleton } from '~/components/calculator/aluminum-rig-planner/posture/posture';
import {
  createPlannerPostureReport,
  getPlannerPostureTargetRanges,
} from '~/components/calculator/aluminum-rig-planner/posture/posture-report';
import {
  applyPresetToPlannerInput,
  applyPresetToPostureSettings,
} from '~/components/calculator/aluminum-rig-planner/posture/presets';
import type { PlannerPostureModelMetrics } from '~/components/calculator/aluminum-rig-planner/types';
import { loadHumanModelPostureModelFixture } from './human-model-fixture';

function subtract(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: [number, number, number], b: [number, number, number]) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function length(a: [number, number, number]) {
  return Math.sqrt(dot(a, a));
}

function angleDeg(a: [number, number, number], joint: [number, number, number], b: [number, number, number]) {
  const jointToA = subtract(a, joint);
  const jointToB = subtract(b, joint);
  const denominator = length(jointToA) * length(jointToB);

  if (denominator <= 0) {
    return 0;
  }

  return (Math.acos(Math.max(-1, Math.min(1, dot(jointToA, jointToB) / denominator))) * 180) / Math.PI;
}

function formatMetricValue(metric: ReturnType<typeof createPlannerPostureReport>['metrics'][number]) {
  return metric.unit === 'mm' ? `${metric.valueMm}mm` : `${metric.valueDeg}deg`;
}

describe('aluminum rig planner posture report', () => {
  let modelMetrics: PlannerPostureModelMetrics;

  beforeAll(async () => {
    modelMetrics = await loadHumanModelPostureModelFixture();
  });

  it('creates finite default posture metrics', () => {
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS, modelMetrics);

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
      DEFAULT_PLANNER_POSTURE_SETTINGS,
      modelMetrics
    );

    expect(report.hints.length).toBeGreaterThan(0);
    expect(report.metrics.some((metric) => metric.status !== 'ok' && metric.hint)).toBe(true);
  });

  it('reports eye-based posture metrics without extra eye debug payload', () => {
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS, modelMetrics);

    expect(report.metrics.some((metric) => metric.key === 'eyeToWheelTop' && metric.label === 'Eye to Wheel Top')).toBe(
      true
    );
    expect(
      report.metrics.some((metric) => metric.key === 'eyeToMonitorMidpoint' && metric.label === 'Eye to Monitor Mid')
    ).toBe(true);
    expect('eyeDebug' in report).toBe(false);
  });

  it('omits eye-based metrics and monitor debug when monitor is disabled', () => {
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS, modelMetrics, {
      includeMonitor: false,
    });

    expect(report.metrics.some((metric) => metric.key === 'eyeToWheelTop')).toBe(false);
    expect(report.metrics.some((metric) => metric.key === 'eyeToMonitorMidpoint')).toBe(false);
    expect(report.monitorDebug).toBeUndefined();
  });

  it('does not report fixed preset pedal height versus hips', () => {
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS, modelMetrics);

    expect(
      report.metrics.some(
        (metric) => (metric.key as string) === 'pedalHeightVsHips' || metric.label === 'Pedals vs hips'
      )
    ).toBe(false);
  });

  it('reports brake alignment from left hip to toe on the XY plane', () => {
    const skeleton = createPlannerPostureSkeleton(
      DEFAULT_PLANNER_INPUT,
      DEFAULT_PLANNER_POSTURE_SETTINGS,
      modelMetrics
    );
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS, modelMetrics);
    const metric = report.metrics.find((candidate) => candidate.key === 'brakeAlignment');
    const deltaX = skeleton.joints.toeLeft[0] - skeleton.joints.hipLeft[0];
    const deltaY = skeleton.joints.toeLeft[1] - skeleton.joints.hipLeft[1];
    const expectedAngleDeg = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

    expect(metric?.label).toBe('Brake Alignment');
    expect(metric?.valueDeg).toBeCloseTo(Number(expectedAngleDeg.toFixed(1)), 6);
  });

  it('reports wrist bend as deviation from the forearm direction', () => {
    const skeleton = createPlannerPostureSkeleton(
      DEFAULT_PLANNER_INPUT,
      DEFAULT_PLANNER_POSTURE_SETTINGS,
      modelMetrics
    );
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS, modelMetrics);
    const metric = report.metrics.find((candidate) => candidate.key === 'wristBend');
    const leftWristBend =
      180 - angleDeg(skeleton.joints.elbowLeft, skeleton.joints.wristLeft, skeleton.joints.handLeft);
    const rightWristBend =
      180 - angleDeg(skeleton.joints.elbowRight, skeleton.joints.wristRight, skeleton.joints.handRight);
    const expectedWristBend = Number(((leftWristBend + rightWristBend) / 2).toFixed(1));

    expect(metric?.label).toBe('Wrist Bend');
    expect(metric?.range).toEqual(getPlannerPostureTargetRanges('gt').wristBend);
    expect(metric?.valueDeg).toBeCloseTo(expectedWristBend, 6);
  });

  it('keeps GT posture reports out of bad status for every supported height', () => {
    const failures: string[] = [];

    for (
      let heightCm = PLANNER_POSTURE_LIMITS.heightMinCm;
      heightCm <= PLANNER_POSTURE_LIMITS.heightMaxCm;
      heightCm += 1
    ) {
      const input = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, 'gt', heightCm, modelMetrics);
      const settings = applyPresetToPostureSettings(
        {
          ...DEFAULT_PLANNER_POSTURE_SETTINGS,
          preset: 'gt',
          heightCm,
        },
        input,
        modelMetrics
      );
      const report = createPlannerPostureReport(input, settings, modelMetrics);

      for (const metric of report.metrics) {
        const value = metric.unit === 'mm' ? metric.valueMm : metric.valueDeg;

        if (!Number.isFinite(value) || metric.status === 'bad') {
          failures.push(
            `gt ${heightCm}cm ${metric.key}: ${formatMetricValue(metric)} failed ${metric.range.min}-${metric.range.max}${metric.unit}; status ${metric.status}${metric.hint ? `; ${metric.hint}` : ''}`
          );
        }
      }
    }

    expect(failures, failures.slice(0, 30).join('\n')).toEqual([]);
  }, 20000);

  it('places flat monitor midpoint at the configured eye distance', () => {
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
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, postureSettings, postureModel);
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, postureSettings, postureModel);
    const monitorDebug = report.monitorDebug!;

    expect(monitorDebug.diameterM).toBeCloseTo(0.01, 6);
    expect(monitorDebug.position[0]).toBeCloseTo(
      skeleton.joints.eyeCenter[0] + postureSettings.monitorDistanceFromEyesMm * 0.001,
      6
    );
    expect(monitorDebug.position[1]).toBe(0);
    expect(monitorDebug.position[2]).toBeCloseTo(
      (DEFAULT_PLANNER_INPUT.baseFeetHeightMm + BASE_BEAM_HEIGHT_MM + postureSettings.monitorHeightFromBaseMm) * 0.001,
      6
    );
  });

  it('keeps eye-to-monitor math aligned when base feet raise the cockpit', () => {
    const input = {
      ...DEFAULT_PLANNER_INPUT,
      baseFeetType: 'rubber' as const,
      baseFeetHeightMm: 40,
    };
    const skeleton = createPlannerPostureSkeleton(input, DEFAULT_PLANNER_POSTURE_SETTINGS, modelMetrics);
    const monitorHeightFromBaseMm = skeleton.joints.eyeCenter[2] * 1000 - BASE_BEAM_HEIGHT_MM;
    const postureSettings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorHeightFromBaseMm,
    };
    const report = createPlannerPostureReport(input, postureSettings, modelMetrics);
    const monitorMetric = report.metrics.find((metric) => metric.key === 'eyeToMonitorMidpoint');

    expect(report.monitorDebug?.position[2]).toBeCloseTo(
      (input.baseFeetHeightMm + BASE_BEAM_HEIGHT_MM + monitorHeightFromBaseMm) * 0.001,
      6
    );
    expect(monitorMetric?.valueMm).toBeCloseTo(0, 6);
  });

  it('places curved monitor apex at the configured eye distance', () => {
    const postureSettings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: '1000r' as const,
      monitorDistanceFromEyesMm: 333,
      monitorTargetFovDeg: 30,
    };
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, postureSettings, modelMetrics);
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, postureSettings, modelMetrics);
    const monitorDebug = report.monitorDebug!;

    expect(monitorDebug.position[0]).toBeCloseTo(
      skeleton.joints.eyeCenter[0] + postureSettings.monitorDistanceFromEyesMm * 0.001,
      6
    );
  });

  it('keeps arc-center-at-eyes triple-screen center monitor arc centered on the eye point', () => {
    const postureSettings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: '1000r' as const,
      monitorDistanceFromEyesMm: 1000,
      monitorArcCenterAtEyes: true,
      monitorTargetFovDeg: 45,
      monitorTripleScreen: true,
    };
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, postureSettings, modelMetrics);
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, postureSettings, modelMetrics);
    const monitorDebug = report.monitorDebug!;

    expect(monitorDebug.position[0] - skeleton.joints.eyeCenter[0]).toBeCloseTo(1, 6);
    expect(monitorDebug.position[1]).toBe(skeleton.joints.eyeCenter[1]);
  });
});
