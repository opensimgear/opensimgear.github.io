import { describe, expect, it } from 'vitest';

import {
  BASE_BEAM_HEIGHT_MM,
  DEFAULT_ANTHROPOMETRY_HEEL_LENGTH_SHARE,
  DEFAULT_ANTHROPOMETRY_RATIOS,
  DEFAULT_PLANNER_INPUT,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  DEFAULT_POSTURE_HEIGHT_CM,
  PEDAL_TRAY_LAYOUT,
  UPRIGHT_BEAM_DEPTH_MM,
} from '../../components/calculator/aluminum-rig-planner/constants';
import {
  createPlannerPostureSkeleton,
  getEffectiveAnthropometryRatios,
  getPostureBoosterSeatOffsetMm,
  PEDAL_HEEL_FORWARD_DELTA_MM,
  PEDAL_HEEL_UP_DELTA_MM,
  POSTURE_BOOSTER_BACK_OFFSET_MAX_MM,
  POSTURE_BOOSTER_BOTTOM_OFFSET_MAX_MM,
  POSTURE_BOOSTER_HEIGHT_THRESHOLD_CM,
  POSTURE_HIP_ABOVE_SEAT_MM,
  POSTURE_HIP_FORWARD_ON_SEAT_MM,
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

function getSignedThighAngleRelativeToSeat(
  hip: [number, number, number],
  knee: [number, number, number],
  seatAngleDeg: number
) {
  const thighAngleRad = Math.atan2(knee[2] - hip[2], knee[0] - hip[0]);
  const seatAngleRad = (seatAngleDeg * Math.PI) / 180;

  return thighAngleRad - seatAngleRad;
}

const PEDAL_WIDTH_MM = 60;
const PEDAL_PLATE_THICKNESS_MM = 3;

describe('aluminum rig planner posture solver', () => {
  it('creates finite whole-body joints and segments from default cockpit geometry', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);

    for (const point of Object.values(skeleton.joints)) {
      expectPointToBeFinite(point);
    }

    expect(skeleton.segments).toHaveLength(19);
    expect(skeleton.segments[0].start).toBe(skeleton.joints.head);
  });

  it('uses the default ratios for height-based posture solving', () => {
    const ratios = getEffectiveAnthropometryRatios(DEFAULT_PLANNER_POSTURE_SETTINGS);

    expect(ratios.upperArmLength).toBe(DEFAULT_ANTHROPOMETRY_RATIOS.upperArmLength);
    expect(ratios.lowerLegLength).toBe(DEFAULT_ANTHROPOMETRY_RATIOS.lowerLegLength);
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

  it('places hand anchors on the outside of the wheel torus', () => {
    const wheelDiameterMm = 320;
    const input = {
      ...DEFAULT_PLANNER_INPUT,
      wheelDiameterMm,
    };
    const skeleton = createPlannerPostureSkeleton(input, DEFAULT_PLANNER_POSTURE_SETTINGS);
    const wheelCenterX =
      input.seatBaseDepthMm +
      input.steeringColumnDistanceMm +
      UPRIGHT_BEAM_DEPTH_MM +
      input.wheelDistanceFromSteeringColumnMm;
    const wheelCenterZ = BASE_BEAM_HEIGHT_MM + input.steeringColumnBaseHeightMm + input.wheelHeightOffsetMm;
    const expectedGripRadius = wheelDiameterMm / 2000;

    expect(skeleton.joints.handRight[0]).toBeCloseTo(wheelCenterX / 1000, 5);
    expect(skeleton.joints.handRight[2]).toBeCloseTo(wheelCenterZ / 1000, 5);
    expect(Math.abs(skeleton.joints.handRight[1])).toBeCloseTo(expectedGripRadius, 5);
    expect(skeleton.joints.handLeft[0]).toBeCloseTo(wheelCenterX / 1000, 5);
    expect(skeleton.joints.handLeft[2]).toBeCloseTo(wheelCenterZ / 1000, 5);
    expect(Math.abs(skeleton.joints.handLeft[1])).toBeCloseTo(expectedGripRadius, 5);
  });

  it('adds eye center joint and uses posture-model eye and heel ratios', () => {
    const postureModel = {
      anthropometryRatios: { ...DEFAULT_ANTHROPOMETRY_RATIOS },
      eyeCenterSittingHeight: 0.2,
      eyeCenterForwardFromHip: 0.11,
      eyeCenterHeightFromHip: 0.34,
      heelLengthShare: 0.4,
    };
    const skeleton = createPlannerPostureSkeleton(
      DEFAULT_PLANNER_INPUT,
      DEFAULT_PLANNER_POSTURE_SETTINGS,
      postureModel
    );
    const heightM = DEFAULT_PLANNER_POSTURE_SETTINGS.heightCm / 100;
    const backrestAngleRad =
      ((DEFAULT_PLANNER_INPUT.seatAngleDeg + DEFAULT_PLANNER_INPUT.backrestAngleDeg - 90) * Math.PI) / 180;
    const backrestUp = [-Math.sin(backrestAngleRad), 0, Math.cos(backrestAngleRad)] as const;
    const bodyForward = [backrestUp[2], 0, -backrestUp[0]] as const;
    const expectedEyeCenter = [
      skeleton.joints.hipCenter[0] +
        (backrestUp[0] * postureModel.eyeCenterHeightFromHip + bodyForward[0] * postureModel.eyeCenterForwardFromHip) *
          heightM,
      skeleton.joints.hipCenter[1],
      skeleton.joints.hipCenter[2] +
        (backrestUp[2] * postureModel.eyeCenterHeightFromHip + bodyForward[2] * postureModel.eyeCenterForwardFromHip) *
          heightM,
    ] as const;

    expect(skeleton.joints.eyeCenter[0]).toBeCloseTo(expectedEyeCenter[0], 6);
    expect(skeleton.joints.eyeCenter[1]).toBeCloseTo(expectedEyeCenter[1], 6);
    expect(skeleton.joints.eyeCenter[2]).toBeCloseTo(expectedEyeCenter[2], 6);
    expect(getDistance(skeleton.joints.ankleLeft, skeleton.joints.heelLeft)).toBeCloseTo(
      DEFAULT_ANTHROPOMETRY_RATIOS.footLength * heightM * postureModel.heelLengthShare,
      5
    );
    expect(getDistance(skeleton.joints.heelLeft, skeleton.joints.toeLeft)).toBeCloseTo(
      DEFAULT_ANTHROPOMETRY_RATIOS.footLength * heightM * (1 - postureModel.heelLengthShare),
      5
    );
  });

  it('scales seat-to-hip offsets from the 169 cm baseline', () => {
    const midDriver = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);
    const tallHeightCm = 205;
    const tallDriver = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      heightCm: tallHeightCm,
    });
    const seatAngleRad = (DEFAULT_PLANNER_INPUT.seatAngleDeg * Math.PI) / 180;
    const seatForward = [Math.cos(seatAngleRad), 0, Math.sin(seatAngleRad)] as const;
    const seatNormal = [-Math.sin(seatAngleRad), 0, Math.cos(seatAngleRad)] as const;
    const heightDelta = tallHeightCm / DEFAULT_POSTURE_HEIGHT_CM - 1;
    const expectedHipDelta = [
      (seatForward[0] * POSTURE_HIP_FORWARD_ON_SEAT_MM * heightDelta +
        seatNormal[0] * POSTURE_HIP_ABOVE_SEAT_MM * heightDelta * 0.2) /
        1000,
      (seatForward[1] * POSTURE_HIP_FORWARD_ON_SEAT_MM * heightDelta +
        seatNormal[1] * POSTURE_HIP_ABOVE_SEAT_MM * heightDelta * 0.2) /
        1000,
      (seatForward[2] * POSTURE_HIP_FORWARD_ON_SEAT_MM * heightDelta +
        seatNormal[2] * POSTURE_HIP_ABOVE_SEAT_MM * heightDelta * 0.2) /
        1000,
    ] as const;

    expect(tallDriver.joints.hipCenter[0] - midDriver.joints.hipCenter[0]).toBeCloseTo(expectedHipDelta[0], 6);
    expect(tallDriver.joints.hipCenter[1] - midDriver.joints.hipCenter[1]).toBeCloseTo(expectedHipDelta[1], 6);
    expect(tallDriver.joints.hipCenter[2] - midDriver.joints.hipCenter[2]).toBeCloseTo(expectedHipDelta[2], 6);
  });

  it('adds a static booster bottom and back offset below 120 cm', () => {
    const minHeightOffset = getPostureBoosterSeatOffsetMm(100);
    const belowThresholdOffset = getPostureBoosterSeatOffsetMm(119);
    const thresholdOffset = getPostureBoosterSeatOffsetMm(POSTURE_BOOSTER_HEIGHT_THRESHOLD_CM);
    const belowThresholdSkeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      heightCm: 119,
    });
    const thresholdSkeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      heightCm: POSTURE_BOOSTER_HEIGHT_THRESHOLD_CM,
    });

    expect(minHeightOffset.bottomMm).toBe(POSTURE_BOOSTER_BOTTOM_OFFSET_MAX_MM);
    expect(minHeightOffset.backMm).toBe(POSTURE_BOOSTER_BACK_OFFSET_MAX_MM);
    expect(belowThresholdOffset.bottomMm).toBe(POSTURE_BOOSTER_BOTTOM_OFFSET_MAX_MM);
    expect(belowThresholdOffset.backMm).toBe(POSTURE_BOOSTER_BACK_OFFSET_MAX_MM);
    expect(thresholdOffset.bottomMm).toBe(0);
    expect(thresholdOffset.backMm).toBe(0);
    expect(belowThresholdSkeleton.joints.hipCenter[2]).toBeGreaterThan(thresholdSkeleton.joints.hipCenter[2] - 0.002);
    expect(belowThresholdSkeleton.joints.hipCenter[0]).toBeGreaterThan(thresholdSkeleton.joints.hipCenter[0] - 0.01);
  });

  it('updates the solved skeleton when posture inputs change', () => {
    const midDriver = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);
    const tallDriver = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      heightCm: 205,
    });

    expect(tallDriver.joints.head[2]).toBeGreaterThan(midDriver.joints.head[2]);
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

  it('allows thighs to solve below the seat angle for low pedal targets', () => {
    const input = {
      ...DEFAULT_PLANNER_INPUT,
      seatAngleDeg: 12,
      pedalTrayDistanceMm: 700,
      pedalsDeltaMm: 260,
      pedalsHeightMm: 0,
      pedalAngleDeg: 45,
    };
    const skeleton = createPlannerPostureSkeleton(input, DEFAULT_PLANNER_POSTURE_SETTINGS);

    expect(
      getSignedThighAngleRelativeToSeat(skeleton.joints.hipLeft, skeleton.joints.kneeLeft, input.seatAngleDeg)
    ).toBeLessThan(0);
    expect(
      getSignedThighAngleRelativeToSeat(skeleton.joints.hipRight, skeleton.joints.kneeRight, input.seatAngleDeg)
    ).toBeLessThan(0);
  });

  it('keeps heel pivots on the pedal axis and preserves the foot linkage', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);
    const tallerSkeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      heightCm: 205,
    });
    const heightM = DEFAULT_PLANNER_POSTURE_SETTINGS.heightCm / 100;
    const footLength = DEFAULT_ANTHROPOMETRY_RATIOS.footLength * heightM;
    const tallerFootLength = DEFAULT_ANTHROPOMETRY_RATIOS.footLength * (205 / 100);
    const heelLength = footLength * DEFAULT_ANTHROPOMETRY_HEEL_LENGTH_SHARE;
    const toeLength = footLength - heelLength;
    const tallerHeelLength = tallerFootLength * DEFAULT_ANTHROPOMETRY_HEEL_LENGTH_SHARE;
    const tallerToeLength = tallerFootLength - tallerHeelLength;
    const trayHalfWidthMm =
      Math.max(0, DEFAULT_PLANNER_INPUT.baseWidthMm - PEDAL_TRAY_LAYOUT.sideBeamInnerSpanReductionMm) / 2;
    const acceleratorCenterLegacyZmm =
      trayHalfWidthMm - DEFAULT_PLANNER_INPUT.pedalAcceleratorDeltaMm - PEDAL_WIDTH_MM / 2;
    const acceleratorCenterYmm = -acceleratorCenterLegacyZmm;
    const brakeCenterYmm = -(acceleratorCenterLegacyZmm - PEDAL_WIDTH_MM - DEFAULT_PLANNER_INPUT.pedalBrakeDeltaMm);
    const pedalPivotX =
      DEFAULT_PLANNER_INPUT.seatBaseDepthMm +
      DEFAULT_PLANNER_INPUT.pedalTrayDistanceMm +
      DEFAULT_PLANNER_INPUT.pedalsDeltaMm;
    const pedalPivotZ = BASE_BEAM_HEIGHT_MM + PEDAL_PLATE_THICKNESS_MM + DEFAULT_PLANNER_INPUT.pedalsHeightMm;
    const pedalLeanRad = ((DEFAULT_PLANNER_INPUT.pedalAngleDeg - 90) * Math.PI) / 180;
    const pedalDirection = [-Math.sin(pedalLeanRad), 0, Math.cos(pedalLeanRad)] as const;
    const pedalPlaneNormal = [-pedalDirection[2], 0, pedalDirection[0]] as const;
    const heelExpectedX =
      pedalPivotX / 1000 +
      pedalDirection[0] * (PEDAL_HEEL_FORWARD_DELTA_MM / 1000) +
      pedalPlaneNormal[0] * (PEDAL_HEEL_UP_DELTA_MM / 1000);
    const heelExpectedZ =
      pedalPivotZ / 1000 +
      pedalDirection[2] * (PEDAL_HEEL_FORWARD_DELTA_MM / 1000) +
      pedalPlaneNormal[2] * (PEDAL_HEEL_UP_DELTA_MM / 1000);
    const leftFootDirection = getDirection(skeleton.joints.heelLeft, skeleton.joints.toeLeft);
    const rightFootDirection = getDirection(skeleton.joints.heelRight, skeleton.joints.toeRight);
    const baseHeelAngle = getAngleAtJoint(skeleton.joints.ankleLeft, skeleton.joints.heelLeft, skeleton.joints.toeLeft);
    const tallerHeelAngle = getAngleAtJoint(
      tallerSkeleton.joints.ankleLeft,
      tallerSkeleton.joints.heelLeft,
      tallerSkeleton.joints.toeLeft
    );

    expect(skeleton.joints.heelLeft[0]).toBeCloseTo(heelExpectedX, 5);
    expect(skeleton.joints.heelLeft[1]).toBeCloseTo(brakeCenterYmm / 1000, 5);
    expect(skeleton.joints.heelLeft[2]).toBeCloseTo(heelExpectedZ, 5);
    expect(skeleton.joints.heelRight[0]).toBeCloseTo(heelExpectedX, 5);
    expect(skeleton.joints.heelRight[1]).toBeCloseTo(acceleratorCenterYmm / 1000, 5);
    expect(skeleton.joints.heelRight[2]).toBeCloseTo(heelExpectedZ, 5);
    expect(leftFootDirection[0]).toBeCloseTo(pedalDirection[0], 6);
    expect(leftFootDirection[1]).toBeCloseTo(pedalDirection[1], 6);
    expect(leftFootDirection[2]).toBeCloseTo(pedalDirection[2], 6);
    expect(rightFootDirection[0]).toBeCloseTo(pedalDirection[0], 6);
    expect(rightFootDirection[1]).toBeCloseTo(pedalDirection[1], 6);
    expect(rightFootDirection[2]).toBeCloseTo(pedalDirection[2], 6);
    expect(
      getDistance(skeleton.joints.ankleLeft, skeleton.joints.heelLeft) +
        getDistance(skeleton.joints.heelLeft, skeleton.joints.toeLeft)
    ).toBeCloseTo(footLength, 5);
    expect(
      getDistance(skeleton.joints.ankleRight, skeleton.joints.heelRight) +
        getDistance(skeleton.joints.heelRight, skeleton.joints.toeRight)
    ).toBeCloseTo(footLength, 5);
    expect(getDistance(skeleton.joints.ankleLeft, skeleton.joints.heelLeft)).toBeCloseTo(heelLength, 5);
    expect(getDistance(skeleton.joints.heelLeft, skeleton.joints.toeLeft)).toBeCloseTo(toeLength, 5);
    expect(getDistance(skeleton.joints.ankleRight, skeleton.joints.heelRight)).toBeCloseTo(heelLength, 5);
    expect(getDistance(skeleton.joints.heelRight, skeleton.joints.toeRight)).toBeCloseTo(toeLength, 5);
    expect(getDistance(tallerSkeleton.joints.ankleLeft, tallerSkeleton.joints.heelLeft)).toBeGreaterThan(
      getDistance(skeleton.joints.ankleLeft, skeleton.joints.heelLeft)
    );
    expect(getDistance(tallerSkeleton.joints.ankleRight, tallerSkeleton.joints.heelRight)).toBeGreaterThan(
      getDistance(skeleton.joints.ankleRight, skeleton.joints.heelRight)
    );
    expect(getDistance(tallerSkeleton.joints.heelLeft, tallerSkeleton.joints.toeLeft)).toBeGreaterThan(
      getDistance(skeleton.joints.heelLeft, skeleton.joints.toeLeft)
    );
    expect(getDistance(tallerSkeleton.joints.heelRight, tallerSkeleton.joints.toeRight)).toBeGreaterThan(
      getDistance(skeleton.joints.heelRight, skeleton.joints.toeRight)
    );
    expect(
      getDistance(tallerSkeleton.joints.ankleLeft, tallerSkeleton.joints.heelLeft) +
        getDistance(tallerSkeleton.joints.heelLeft, tallerSkeleton.joints.toeLeft)
    ).toBeCloseTo(tallerFootLength, 5);
    expect(
      getDistance(tallerSkeleton.joints.ankleRight, tallerSkeleton.joints.heelRight) +
        getDistance(tallerSkeleton.joints.heelRight, tallerSkeleton.joints.toeRight)
    ).toBeCloseTo(tallerFootLength, 5);
    expect(getDistance(tallerSkeleton.joints.ankleLeft, tallerSkeleton.joints.heelLeft)).toBeCloseTo(
      tallerHeelLength,
      5
    );
    expect(getDistance(tallerSkeleton.joints.heelLeft, tallerSkeleton.joints.toeLeft)).toBeCloseTo(tallerToeLength, 5);
    expect(getDistance(tallerSkeleton.joints.ankleRight, tallerSkeleton.joints.heelRight)).toBeCloseTo(
      tallerHeelLength,
      5
    );
    expect(getDistance(tallerSkeleton.joints.heelRight, tallerSkeleton.joints.toeRight)).toBeCloseTo(
      tallerToeLength,
      5
    );
    expect(baseHeelAngle).toBeCloseTo(tallerHeelAngle, 6);
    expect(baseHeelAngle).toBeCloseTo(
      getAngleAtJoint(skeleton.joints.ankleRight, skeleton.joints.heelRight, skeleton.joints.toeRight),
      6
    );
  });

  it('keeps the heel-to-pedal-pivot offset fixed in pedal-local space when pedal angle changes', () => {
    const baseSkeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);
    const steeperSkeleton = createPlannerPostureSkeleton(
      {
        ...DEFAULT_PLANNER_INPUT,
        pedalAngleDeg: DEFAULT_PLANNER_INPUT.pedalAngleDeg + 15,
      },
      DEFAULT_PLANNER_POSTURE_SETTINGS
    );

    const pedalPivot = [
      (DEFAULT_PLANNER_INPUT.seatBaseDepthMm +
        DEFAULT_PLANNER_INPUT.pedalTrayDistanceMm +
        DEFAULT_PLANNER_INPUT.pedalsDeltaMm) /
        1000,
      0,
      (BASE_BEAM_HEIGHT_MM + PEDAL_PLATE_THICKNESS_MM + DEFAULT_PLANNER_INPUT.pedalsHeightMm) / 1000,
    ] as const;
    const basePedalLeanRad = ((DEFAULT_PLANNER_INPUT.pedalAngleDeg - 90) * Math.PI) / 180;
    const steeperPedalLeanRad = ((DEFAULT_PLANNER_INPUT.pedalAngleDeg + 15 - 90) * Math.PI) / 180;
    const basePedalDirection = [-Math.sin(basePedalLeanRad), 0, Math.cos(basePedalLeanRad)] as const;
    const steeperPedalDirection = [-Math.sin(steeperPedalLeanRad), 0, Math.cos(steeperPedalLeanRad)] as const;
    const basePedalPlaneNormal = [-basePedalDirection[2], 0, basePedalDirection[0]] as const;
    const steeperPedalPlaneNormal = [-steeperPedalDirection[2], 0, steeperPedalDirection[0]] as const;
    const projectOffset = (
      point: [number, number, number],
      pedalDirection: readonly [number, number, number],
      pedalPlaneNormal: readonly [number, number, number]
    ) => {
      const offset = [point[0] - pedalPivot[0], point[1] - pedalPivot[1], point[2] - pedalPivot[2]] as const;

      return {
        alongPedal: offset[0] * pedalDirection[0] + offset[1] * pedalDirection[1] + offset[2] * pedalDirection[2],
        offPedal: offset[0] * pedalPlaneNormal[0] + offset[1] * pedalPlaneNormal[1] + offset[2] * pedalPlaneNormal[2],
      };
    };
    const baseLeftHeelOffset = projectOffset(baseSkeleton.joints.heelLeft, basePedalDirection, basePedalPlaneNormal);
    const steeperLeftHeelOffset = projectOffset(
      steeperSkeleton.joints.heelLeft,
      steeperPedalDirection,
      steeperPedalPlaneNormal
    );

    expect(baseLeftHeelOffset.alongPedal).toBeCloseTo(PEDAL_HEEL_FORWARD_DELTA_MM / 1000, 6);
    expect(baseLeftHeelOffset.offPedal).toBeCloseTo(PEDAL_HEEL_UP_DELTA_MM / 1000, 6);
    expect(steeperLeftHeelOffset.alongPedal).toBeCloseTo(baseLeftHeelOffset.alongPedal, 6);
    expect(steeperLeftHeelOffset.offPedal).toBeCloseTo(baseLeftHeelOffset.offPedal, 6);
  });

  it('keeps each leg on its assigned pedal side', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);

    expect(skeleton.joints.kneeLeft[1]).toBeGreaterThan(0);
    expect(skeleton.joints.ankleLeft[1]).toBeCloseTo(skeleton.joints.heelLeft[1], 6);
    expect(skeleton.joints.kneeRight[1]).toBeLessThan(0);
    expect(skeleton.joints.ankleRight[1]).toBeCloseTo(skeleton.joints.heelRight[1], 6);
  });

  it('lets upper arms hang downward under gravity before reaching the wheel', () => {
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);

    expect(skeleton.joints.elbowLeft[2]).toBeLessThan(skeleton.joints.shoulderLeft[2]);
    expect(skeleton.joints.elbowRight[2]).toBeLessThan(skeleton.joints.shoulderRight[2]);
    expect(Math.abs(skeleton.joints.elbowLeft[1])).toBeLessThan(Math.abs(skeleton.joints.shoulderLeft[1]));
    expect(Math.abs(skeleton.joints.elbowRight[1])).toBeLessThan(Math.abs(skeleton.joints.shoulderRight[1]));
  });
});
