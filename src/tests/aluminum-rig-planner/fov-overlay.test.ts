import { describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_INPUT } from '~/components/calculator/aluminum-rig-planner/constants/planner';
import { DEFAULT_PLANNER_POSTURE_SETTINGS } from '~/components/calculator/aluminum-rig-planner/constants/posture';
import { createPlannerFovOverlay } from '~/components/calculator/aluminum-rig-planner/posture/fov-overlay';
import { createPlannerPostureReport } from '~/components/calculator/aluminum-rig-planner/posture/posture-report';
import type { PlannerPostureModelMetrics } from '~/components/calculator/aluminum-rig-planner/types';

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
} satisfies PlannerPostureModelMetrics;

describe('aluminum rig planner FOV overlay', () => {
  it('summarizes single monitor FOV and eye distance from overlay geometry', () => {
    const postureSettings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: 'disabled' as const,
      monitorDistanceFromEyesMm: 600,
      monitorTargetFovDeg: 60,
    };
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, postureSettings, postureModel);
    const overlay = createPlannerFovOverlay(DEFAULT_PLANNER_INPUT, postureSettings, report, postureModel);

    expect(overlay).not.toBeNull();
    expect(overlay?.summary.eyeDistanceToPanelMm).toBe(postureSettings.monitorDistanceFromEyesMm);
    expect(overlay?.summary.totalFovDeg).toBeCloseTo(overlay?.summary.fovPerMonitorDeg ?? 0, 6);
    expect(overlay?.fovLabels).toHaveLength(1);
    expect(overlay?.fovLabels[0]?.valueDeg).toBeCloseTo(overlay?.summary.fovPerMonitorDeg ?? 0, 6);
    expect(overlay?.fovLabels[0]?.position[0]).toBeGreaterThan(overlay?.eyeCenter[0] ?? 0);
  });

  it('summarizes wider total FOV for triple monitors', () => {
    const postureSettings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: '1000r' as const,
      monitorDistanceFromEyesMm: 800,
      monitorTargetFovDeg: 55,
      monitorTripleScreen: true,
    };
    const report = createPlannerPostureReport(DEFAULT_PLANNER_INPUT, postureSettings, postureModel);
    const overlay = createPlannerFovOverlay(DEFAULT_PLANNER_INPUT, postureSettings, report, postureModel);

    expect(overlay).not.toBeNull();
    expect(overlay?.summary.eyeDistanceToPanelMm).toBe(postureSettings.monitorDistanceFromEyesMm);
    expect(overlay?.summary.totalFovDeg).toBeGreaterThan(overlay?.summary.fovPerMonitorDeg ?? 0);
    expect(overlay?.fovLabels).toHaveLength(3);
  });
});
