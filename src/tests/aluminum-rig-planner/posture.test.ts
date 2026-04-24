import { describe, expect, it } from 'vitest';

import {
  ANTHROPOMETRY_LENGTH_LIMITS_MM,
  BASE_BEAM_HEIGHT_MM,
  DEFAULT_ANTHROPOMETRY_RATIOS,
  DEFAULT_PLANNER_INPUT,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  PEDAL_TRAY_LAYOUT,
} from '../../components/calculator/aluminum-rig-planner/constants';
import {
  createPlannerPostureSkeleton,
  getEffectiveAnthropometryRatios,
} from '../../components/calculator/aluminum-rig-planner/posture';

function expectPointToBeFinite(point: [number, number, number]) {
  expect(point.every((value) => Number.isFinite(value))).toBe(true);
}

function getDistance(start: [number, number, number], end: [number, number, number]) {
  return Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
}

function getDirection(start: [number, number, number], end: [number, number, number]) {
  const distance = getDistance(start, end);

  return distance <= 0.000001
    ? [0, 0, 0]
    : [(end[0] - start[0]) / distance, (end[1] - start[1]) / distance, (end[2] - start[2]) / distance];
}

function getAngleAtJoint(
  start: [number, number, number],
  joint: [number, number, number],
  end: [number, number, number]
) {
  const a = getDirection(joint, start);
  const b = getDirection(joint, end);
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  return Math.acos(Math.max(-1, Math.min(1, dot)));
}

const PEDAL_WIDTH_MM = 60;
const PEDAL_PLATE_THICKNESS_MM = 3;

describe('aluminum rig planner posture solver', () => {
  it('creates finite whole-body joints and segments from default cockpit geometry', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);

    for (const point of Object.values(skeleton.joints)) {
      expectPointToBeFinite(point);
    }

    expect(skeleton.segments).toHaveLength(20);
    expect(skeleton.segments[0].start).toBe(skeleton.joints.head);
  });

  it('uses table ratios when advanced anthropometry is disabled', () => {
    const ratios = getEffectiveAnthropometryRatios({
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      advancedAnthropometry: false,
      ratios: {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS.ratios,
        upperArmLength: ANTHROPOMETRY_LENGTH_LIMITS_MM.upperArmLength.max,
      },
    });

    expect(ratios.upperArmLength).toBe(DEFAULT_ANTHROPOMETRY_RATIOS.upperArmLength);
  });

  it('clamps edited lengths when advanced anthropometry is enabled', () => {
    const ratios = getEffectiveAnthropometryRatios({
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      advancedAnthropometry: true,
      ratios: {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS.ratios,
        lowerLegLength: ANTHROPOMETRY_LENGTH_LIMITS_MM.lowerLegLength.max + 100,
      },
    });

    expect(ratios.lowerLegLength).toBe(
      ANTHROPOMETRY_LENGTH_LIMITS_MM.lowerLegLength.max / (DEFAULT_PLANNER_POSTURE_SETTINGS.heightCm * 10)
    );
  });

  it('clamps hands to the reachable model arm length', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);
    const heightM = DEFAULT_PLANNER_POSTURE_SETTINGS.heightCm / 100;
    const upperArmLength = DEFAULT_ANTHROPOMETRY_RATIOS.upperArmLength * heightM;
    const forearmHandLength = DEFAULT_ANTHROPOMETRY_RATIOS.forearmHandLength * heightM;

    expect(getDistance(skeleton.joints.shoulderLeft, skeleton.joints.elbowLeft)).toBeCloseTo(upperArmLength, 5);
    expect(getDistance(skeleton.joints.elbowLeft, skeleton.joints.handLeft)).toBeCloseTo(forearmHandLength, 5);
    expect(getDistance(skeleton.joints.shoulderRight, skeleton.joints.elbowRight)).toBeCloseTo(upperArmLength, 5);
    expect(getDistance(skeleton.joints.elbowRight, skeleton.joints.handRight)).toBeCloseTo(forearmHandLength, 5);
    expect(getDistance(skeleton.joints.elbowLeft, skeleton.joints.wristLeft)).toBeLessThan(forearmHandLength);
    expect(getDistance(skeleton.joints.elbowRight, skeleton.joints.wristRight)).toBeLessThan(forearmHandLength);
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

  it('keeps heel pivots on the pedal axis and preserves the foot linkage', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);
    const tallFootSkeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      advancedAnthropometry: true,
      ratios: {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS.ratios,
        footLength: ANTHROPOMETRY_LENGTH_LIMITS_MM.footLength.max,
      },
    });
    const heightM = DEFAULT_PLANNER_POSTURE_SETTINGS.heightCm / 100;
    const footLength = DEFAULT_ANTHROPOMETRY_RATIOS.footLength * heightM;
    const trayHalfWidthMm =
      Math.max(0, DEFAULT_PLANNER_INPUT.baseWidthMm - PEDAL_TRAY_LAYOUT.sideBeamInnerSpanReductionMm) / 2;
    const acceleratorCenterZmm =
      trayHalfWidthMm - DEFAULT_PLANNER_INPUT.pedalAcceleratorDeltaMm - PEDAL_WIDTH_MM / 2;
    const brakeCenterZmm = acceleratorCenterZmm - PEDAL_WIDTH_MM - DEFAULT_PLANNER_INPUT.pedalBrakeDeltaMm;
    const pedalPivotX = DEFAULT_PLANNER_INPUT.seatBaseDepthMm + DEFAULT_PLANNER_INPUT.pedalTrayDistanceMm + DEFAULT_PLANNER_INPUT.pedalsDeltaMm;
    const pedalPivotY = BASE_BEAM_HEIGHT_MM + PEDAL_PLATE_THICKNESS_MM + DEFAULT_PLANNER_INPUT.pedalsHeightMm;
    const pedalLeanRad = ((DEFAULT_PLANNER_INPUT.pedalAngleDeg - 90) * Math.PI) / 180;
    const pedalDirection = [-Math.sin(pedalLeanRad), Math.cos(pedalLeanRad), 0] as const;
    const leftFootDirection = getDirection(skeleton.joints.heelLeft, skeleton.joints.toeLeft);
    const rightFootDirection = getDirection(skeleton.joints.heelRight, skeleton.joints.toeRight);
    const baseHeelAngle = getAngleAtJoint(skeleton.joints.ankleLeft, skeleton.joints.heelLeft, skeleton.joints.toeLeft);
    const tallHeelAngle = getAngleAtJoint(
      tallFootSkeleton.joints.ankleLeft,
      tallFootSkeleton.joints.heelLeft,
      tallFootSkeleton.joints.toeLeft
    );

    expect(skeleton.joints.heelLeft[0]).toBeCloseTo(pedalPivotX / 1000, 5);
    expect(skeleton.joints.heelLeft[1]).toBeCloseTo(pedalPivotY / 1000, 5);
    expect(skeleton.joints.heelLeft[2]).toBeCloseTo(brakeCenterZmm / 1000, 5);
    expect(skeleton.joints.heelRight[0]).toBeCloseTo(pedalPivotX / 1000, 5);
    expect(skeleton.joints.heelRight[1]).toBeCloseTo(pedalPivotY / 1000, 5);
    expect(skeleton.joints.heelRight[2]).toBeCloseTo(acceleratorCenterZmm / 1000, 5);
    expect(leftFootDirection[0]).toBeCloseTo(pedalDirection[0], 6);
    expect(leftFootDirection[1]).toBeCloseTo(pedalDirection[1], 6);
    expect(leftFootDirection[2]).toBeCloseTo(pedalDirection[2], 6);
    expect(rightFootDirection[0]).toBeCloseTo(pedalDirection[0], 6);
    expect(rightFootDirection[1]).toBeCloseTo(pedalDirection[1], 6);
    expect(rightFootDirection[2]).toBeCloseTo(pedalDirection[2], 6);
    expect(getDistance(skeleton.joints.ankleLeft, skeleton.joints.heelLeft) + getDistance(skeleton.joints.heelLeft, skeleton.joints.toeLeft)).toBeCloseTo(footLength, 5);
    expect(getDistance(skeleton.joints.ankleRight, skeleton.joints.heelRight) + getDistance(skeleton.joints.heelRight, skeleton.joints.toeRight)).toBeCloseTo(footLength, 5);
    expect(baseHeelAngle).toBeCloseTo(tallHeelAngle, 6);
    expect(baseHeelAngle).toBeCloseTo(
      getAngleAtJoint(skeleton.joints.ankleRight, skeleton.joints.heelRight, skeleton.joints.toeRight),
      6
    );
  });

  it('keeps each leg on its assigned pedal side', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);

    expect(skeleton.joints.kneeLeft[2]).toBeLessThan(0);
    expect(skeleton.joints.ankleLeft[2]).toBeCloseTo(skeleton.joints.heelLeft[2], 6);
    expect(skeleton.joints.kneeRight[2]).toBeGreaterThan(0);
    expect(skeleton.joints.ankleRight[2]).toBeCloseTo(skeleton.joints.heelRight[2], 6);
  });

  it('lets upper arms hang downward under gravity before reaching the wheel', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);

    expect(skeleton.joints.elbowLeft[1]).toBeLessThan(skeleton.joints.shoulderLeft[1]);
    expect(skeleton.joints.elbowRight[1]).toBeLessThan(skeleton.joints.shoulderRight[1]);
    expect(Math.abs(skeleton.joints.elbowLeft[2])).toBeLessThan(Math.abs(skeleton.joints.shoulderLeft[2]));
    expect(Math.abs(skeleton.joints.elbowRight[2])).toBeLessThan(Math.abs(skeleton.joints.shoulderRight[2]));
  });
});
