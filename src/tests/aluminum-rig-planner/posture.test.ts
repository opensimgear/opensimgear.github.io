import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ANTHROPOMETRY_RATIOS,
  DEFAULT_PLANNER_INPUT,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  PEDAL_TRAY_LAYOUT,
  PLANNER_POSTURE_LIMITS,
} from '../../components/calculator/aluminum-rig-planner/constants';
import {
  createPlannerPostureSkeleton,
  getEffectiveAnthropometryRatios,
} from '../../components/calculator/aluminum-rig-planner/posture';

function expectPointToBeFinite(point: [number, number, number]) {
  expect(point.every((value) => Number.isFinite(value))).toBe(true);
}

function expectPointInVerticalPlane(
  planeStart: [number, number, number],
  planeEnd: [number, number, number],
  point: [number, number, number]
) {
  const planeDx = planeEnd[0] - planeStart[0];
  const planeDz = planeEnd[2] - planeStart[2];
  const pointDx = point[0] - planeStart[0];
  const pointDz = point[2] - planeStart[2];

  expect(pointDx * planeDz - pointDz * planeDx).toBeCloseTo(0, 6);
}

describe('aluminum rig planner posture solver', () => {
  it('creates finite whole-body joints and segments from default cockpit geometry', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);

    for (const point of Object.values(skeleton.joints)) {
      expectPointToBeFinite(point);
    }

    expect(skeleton.segments).toHaveLength(16);
    expect(skeleton.segments[0].start).toBe(skeleton.joints.head);
  });

  it('uses table ratios when advanced anthropometry is disabled', () => {
    const ratios = getEffectiveAnthropometryRatios({
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      advancedAnthropometry: false,
      ratios: {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS.ratios,
        upperArmLength: 0.5,
      },
    });

    expect(ratios.upperArmLength).toBe(DEFAULT_ANTHROPOMETRY_RATIOS.upperArmLength);
  });

  it('clamps edited ratios when advanced anthropometry is enabled', () => {
    const ratios = getEffectiveAnthropometryRatios({
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      advancedAnthropometry: true,
      ratios: {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS.ratios,
        lowerLegLength: 2,
      },
    });

    expect(ratios.lowerLegLength).toBe(PLANNER_POSTURE_LIMITS.ratioMax);
  });

  it('anchors wrists at the two external spoke-to-rim reference points', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);
    const gripRadiusM = (DEFAULT_PLANNER_INPUT.wheelDiameterMm / 2 - 16) / 1000;

    expect(Math.abs(skeleton.joints.wristRight[2])).toBeCloseTo(gripRadiusM, 6);
    expect(skeleton.joints.wristLeft[2]).toBeCloseTo(-skeleton.joints.wristRight[2], 6);
    expect(skeleton.joints.wristLeft[0]).toBeCloseTo(skeleton.joints.wristRight[0], 6);
    expect(skeleton.joints.wristLeft[1]).toBeCloseTo(skeleton.joints.wristRight[1], 6);
  });

  it('updates the solved skeleton when posture inputs change', () => {
    const midDriver = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);
    const tallDriver = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      heightCm: 205,
    });

    expect(tallDriver.joints.head[1]).toBeGreaterThan(midDriver.joints.head[1]);
    expect(tallDriver.joints.elbowLeft).not.toEqual(midDriver.joints.elbowLeft);
    expect(tallDriver.segments).not.toEqual(midDriver.segments);
  });

  it('keeps feet on the accelerator and brake pedal centers', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);
    const pedalWidthMm = 60;
    const trayHalfWidthMm =
      Math.max(0, DEFAULT_PLANNER_INPUT.baseWidthMm - PEDAL_TRAY_LAYOUT.sideBeamInnerSpanReductionMm) / 2;
    const acceleratorCenterM =
      (trayHalfWidthMm - DEFAULT_PLANNER_INPUT.pedalAcceleratorDeltaMm - pedalWidthMm / 2) / 1000;
    const brakeCenterM = acceleratorCenterM - (pedalWidthMm + DEFAULT_PLANNER_INPUT.pedalBrakeDeltaMm) / 1000;

    expect(skeleton.joints.ankleRight[2]).toBeCloseTo(acceleratorCenterM, 6);
    expect(skeleton.joints.toeRight[2]).toBeCloseTo(acceleratorCenterM, 6);
    expect(skeleton.joints.ankleLeft[2]).toBeCloseTo(brakeCenterM, 6);
    expect(skeleton.joints.toeLeft[2]).toBeCloseTo(brakeCenterM, 6);
  });

  it('keeps each leg in the vertical plane through its hip and heel', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);

    expectPointInVerticalPlane(skeleton.joints.hipLeft, skeleton.joints.ankleLeft, skeleton.joints.kneeLeft);
    expectPointInVerticalPlane(skeleton.joints.hipRight, skeleton.joints.ankleRight, skeleton.joints.kneeRight);
  });

  it('lets upper arms hang downward under gravity before reaching the wheel', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);

    expect(skeleton.joints.elbowLeft[1]).toBeLessThan(skeleton.joints.shoulderLeft[1]);
    expect(skeleton.joints.elbowRight[1]).toBeLessThan(skeleton.joints.shoulderRight[1]);
    expect(skeleton.joints.elbowLeft[2]).toBeCloseTo(skeleton.joints.shoulderLeft[2], 6);
    expect(skeleton.joints.elbowRight[2]).toBeCloseTo(skeleton.joints.shoulderRight[2], 6);
  });
});
