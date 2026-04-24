import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ANTHROPOMETRY_RATIOS,
  DEFAULT_PLANNER_INPUT,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
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

function getDistance(start: [number, number, number], end: [number, number, number]) {
  return Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
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

  it('clamps wrists to the reachable model arm length', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);
    const heightM = DEFAULT_PLANNER_POSTURE_SETTINGS.heightCm / 100;
    const upperArmLength = DEFAULT_ANTHROPOMETRY_RATIOS.upperArmLength * heightM;
    const forearmLength = DEFAULT_ANTHROPOMETRY_RATIOS.forearmHandLength * heightM;

    expect(getDistance(skeleton.joints.shoulderLeft, skeleton.joints.elbowLeft)).toBeCloseTo(upperArmLength, 5);
    expect(getDistance(skeleton.joints.elbowLeft, skeleton.joints.wristLeft)).toBeCloseTo(forearmLength, 5);
    expect(getDistance(skeleton.joints.shoulderRight, skeleton.joints.elbowRight)).toBeCloseTo(upperArmLength, 5);
    expect(getDistance(skeleton.joints.elbowRight, skeleton.joints.wristRight)).toBeCloseTo(forearmLength, 5);
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

  it('clamps ankles to the reachable model leg length', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);
    const heightM = DEFAULT_PLANNER_POSTURE_SETTINGS.heightCm / 100;
    const thighLength = DEFAULT_ANTHROPOMETRY_RATIOS.thighLength * heightM;
    const lowerLegLength = DEFAULT_ANTHROPOMETRY_RATIOS.lowerLegLength * heightM;

    expect(getDistance(skeleton.joints.hipLeft, skeleton.joints.kneeLeft)).toBeCloseTo(thighLength, 5);
    expect(getDistance(skeleton.joints.kneeLeft, skeleton.joints.ankleLeft)).toBeCloseTo(lowerLegLength, 5);
    expect(getDistance(skeleton.joints.hipRight, skeleton.joints.kneeRight)).toBeCloseTo(thighLength, 5);
    expect(getDistance(skeleton.joints.kneeRight, skeleton.joints.ankleRight)).toBeCloseTo(lowerLegLength, 5);
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
    expect(Math.abs(skeleton.joints.elbowLeft[2])).toBeLessThan(Math.abs(skeleton.joints.shoulderLeft[2]));
    expect(Math.abs(skeleton.joints.elbowRight[2])).toBeLessThan(Math.abs(skeleton.joints.shoulderRight[2]));
  });
});
