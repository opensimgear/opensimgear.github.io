import {
  BASE_BEAM_HEIGHT_MM,
  BASE_MODULE_LAYOUT,
  DEFAULT_ANTHROPOMETRY_HEEL_LENGTH_SHARE,
  DEFAULT_ANTHROPOMETRY_RATIOS,
  DEFAULT_POSTURE_HEIGHT_CM,
  HALF_PROFILE_SHORT_MM,
  PEDAL_TRAY_LAYOUT,
  PLANNER_DIMENSION_LIMITS,
  PLANNER_POSTURE_LIMITS,
  PROFILE_SHORT_MM,
  UPRIGHT_BEAM_DEPTH_MM,
} from './constants';
import type {
  PlannerAnthropometryRatios,
  PlannerInput,
  PlannerPostureModelMetrics,
  PlannerPosturePreset,
  PlannerPostureSettings,
} from './types';

export type PostureJointName =
  | 'head'
  | 'eyeCenter'
  | 'neck'
  | 'shoulderCenter'
  | 'shoulderLeft'
  | 'shoulderRight'
  | 'elbowLeft'
  | 'elbowRight'
  | 'wristLeft'
  | 'wristRight'
  | 'handLeft'
  | 'handRight'
  | 'hipCenter'
  | 'hipLeft'
  | 'hipRight'
  | 'kneeLeft'
  | 'kneeRight'
  | 'ankleLeft'
  | 'ankleRight'
  | 'heelLeft'
  | 'heelRight'
  | 'toeStartLeft'
  | 'toeStartRight'
  | 'toeLeft'
  | 'toeRight';

export type PosturePoint = [number, number, number];

export type PostureSegment = {
  start: PosturePoint;
  end: PosturePoint;
};

export type PlannerPostureSkeleton = {
  joints: Record<PostureJointName, PosturePoint>;
  segments: PostureSegment[];
};

type Vector = PosturePoint;

type TwoLinkPose = {
  joint: Vector;
  end: Vector;
};

type PedalFootTarget = {
  ankle: Vector;
  direction: Vector;
  footBoneLength: number;
  heel: Vector;
  heelLength: number;
  pedalPivot: Vector;
  talonSlideMaxX: number;
  talonSlideMinX: number;
  toeStart: Vector;
  toe: Vector;
  toeBoneLength: number;
};

const MM_TO_METERS = 0.001;
const EPSILON = 0.000001;
const PEDAL_WIDTH_MM = 60;
const PEDAL_PLATE_THICKNESS_MM = 3;
export const POSTURE_TOE_BONE_START_SHARE = 0.6;
export const HAND_BONE_TORUS_PLANE_ANGLE_DEG = 60;
export const POSTURE_TALON_BACKWARD_ANGLE_DEG = 40;
export const POSTURE_TALON_PEDAL_PLANE_OFFSET_MM = 30;
const POSTURE_ANKLE_TARGET_ANGLE_DEG = 90;
const POSTURE_TALON_SLIDE_STEP_MM = 5;
const SEAT_BASE_FRONT_ANCHOR_REAR_OFFSET_MM = 38;
export const POSTURE_HIP_FORWARD_ON_SEAT_MM = 125;
export const POSTURE_HIP_ABOVE_SEAT_MM = 130;
export const POSTURE_SHOULDER_ABOVE_HIP_CLEARANCE_MM = 60;
export const POSTURE_BOOSTER_HEIGHT_THRESHOLD_CM = 120;
export const POSTURE_BOOSTER_BOTTOM_OFFSET_MAX_MM = 10;
export const POSTURE_BOOSTER_BACK_OFFSET_MAX_MM = 90;
const POSTURE_TALON_BACKWARD_ANGLE_RAD = toRad(POSTURE_TALON_BACKWARD_ANGLE_DEG);
const HAND_GRIP_LENGTH_MIN_MM = 55;
const HAND_GRIP_LENGTH_MAX_MM = 140;
const HAND_GRIP_HEIGHT_RATIO = 0.076;
const HAND_MAX_FOREARM_HAND_SHARE = 0.45;
const DEFAULT_EYE_CENTER_FORWARD_FROM_HIP = 0.064;
const DEFAULT_EYE_CENTER_HEIGHT_FROM_HIP = 0.407;

const PRESET_KNEE_LIFT = {
  gt: 0.24,
  rally: 0.28,
  drift: 0.28,
  road: 0.24,
  custom: 0.24,
} as const;

function mm(value: number) {
  return value * MM_TO_METERS;
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function add(a: Vector, b: Vector): Vector {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtract(a: Vector, b: Vector): Vector {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(a: Vector, value: number): Vector {
  return [a[0] * value, a[1] * value, a[2] * value];
}

function rotateXZ(a: Vector, angleRad: number): Vector {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return [a[0] * cos - a[2] * sin, a[1], a[0] * sin + a[2] * cos];
}

function dot(a: Vector, b: Vector) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function length(a: Vector) {
  return Math.sqrt(dot(a, a));
}

function normalize(a: Vector, fallback: Vector = [1, 0, 0]): Vector {
  const distance = length(a);

  if (distance < EPSILON) {
    return fallback;
  }

  return scale(a, 1 / distance);
}

function angleDeg(start: Vector, joint: Vector, end: Vector) {
  const a = normalize(subtract(start, joint));
  const b = normalize(subtract(end, joint));
  const cosine = clamp(dot(a, b), -1, 1);

  return (Math.acos(cosine) * 180) / Math.PI;
}

function getSeatPivot(input: PlannerInput): Vector {
  const seatAngleRad = toRad(input.seatAngleDeg);
  const seatFrontAnchorLocalXmm = input.seatLengthMm - SEAT_BASE_FRONT_ANCHOR_REAR_OFFSET_MM;
  const seatCrossMemberCenterXmm = Math.max(
    BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm,
    input.seatBaseDepthMm - BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm
  );
  const seatFrontAnchorXmm = seatCrossMemberCenterXmm + HALF_PROFILE_SHORT_MM + input.seatDeltaMm;
  const seatRearPivotXmm = seatFrontAnchorXmm - Math.cos(seatAngleRad) * seatFrontAnchorLocalXmm;
  const seatRearPivotZmm = BASE_BEAM_HEIGHT_MM + PROFILE_SHORT_MM + input.seatHeightFromBaseInnerBeamsMm;

  return [mm(seatRearPivotXmm), 0, mm(seatRearPivotZmm)];
}

function getPedalCentersYmm(input: PlannerInput) {
  const trayHalfWidthMm = Math.max(0, input.baseWidthMm - PEDAL_TRAY_LAYOUT.sideBeamInnerSpanReductionMm) / 2;
  const acceleratorCenterZmm = trayHalfWidthMm - input.pedalAcceleratorDeltaMm - PEDAL_WIDTH_MM / 2;
  const brakeCenterZmm = acceleratorCenterZmm - PEDAL_WIDTH_MM - input.pedalBrakeDeltaMm;
  const clutchCenterZmm = brakeCenterZmm - PEDAL_WIDTH_MM - input.pedalClutchDeltaMm;

  return {
    accelerator: -acceleratorCenterZmm,
    brake: -brakeCenterZmm,
    clutch: -clutchCenterZmm,
  };
}

function getTalonTailToAnkleDirection(pedalDirection: Vector) {
  const pedalNormal = getPedalPlaneNormal(pedalDirection);

  return normalize(
    add(
      scale(pedalDirection, Math.sin(POSTURE_TALON_BACKWARD_ANGLE_RAD)),
      scale(pedalNormal, Math.cos(POSTURE_TALON_BACKWARD_ANGLE_RAD))
    ),
    [0, 0, 1]
  );
}

function getPedalDirection(input: PlannerInput) {
  const pedalLeanRad = toRad(input.pedalAngleDeg - 90);

  return normalize([-Math.sin(pedalLeanRad), 0, Math.cos(pedalLeanRad)] satisfies Vector);
}

function getPedalPivot(input: PlannerInput, centerYmm: number): Vector {
  return [
    mm(input.seatBaseDepthMm + input.pedalTrayDistanceMm + input.pedalsDeltaMm),
    mm(centerYmm),
    mm(BASE_BEAM_HEIGHT_MM + PEDAL_PLATE_THICKNESS_MM + input.pedalsHeightMm),
  ];
}

function getPedalPlaneNormal(pedalDirection: Vector): Vector {
  return [-pedalDirection[2], 0, pedalDirection[0]];
}

function getClosestValue(values: number[], target: number) {
  return values.reduce((best, value) => (Math.abs(value - target) < Math.abs(best - target) ? value : best));
}

function getPointOnPedalLineAtDistance(
  anchor: Vector,
  lineOrigin: Vector,
  lineDirection: Vector,
  targetDistanceAlongLine: number,
  distance: number,
  fallbackTarget: Vector
): Vector {
  const originToAnchor = subtract(lineOrigin, anchor);
  const b = 2 * dot(originToAnchor, lineDirection);
  const c = dot(originToAnchor, originToAnchor) - distance * distance;
  const discriminant = b * b - 4 * c;

  if (discriminant >= -EPSILON) {
    const root = Math.sqrt(Math.max(0, discriminant));
    const candidates = [(-b - root) / 2, (-b + root) / 2];
    const distanceAlongLine = getClosestValue(candidates, targetDistanceAlongLine);

    return add(lineOrigin, scale(lineDirection, distanceAlongLine));
  }

  return add(anchor, scale(normalize(subtract(fallbackTarget, anchor), lineDirection), distance));
}

function getPointOnPlateLineAtDistance(
  anchor: Vector,
  target: Vector,
  distance: number,
  minX: number,
  maxX: number
): Vector {
  const dy = target[1] - anchor[1];
  const dz = target[2] - anchor[2];
  const remainingDistanceSq = distance * distance - dy * dy - dz * dz;

  if (remainingDistanceSq >= -EPSILON) {
    const remainingDistance = Math.sqrt(Math.max(0, remainingDistanceSq));
    const exactCandidates = [anchor[0] - remainingDistance, anchor[0] + remainingDistance];
    const candidatesInRange = exactCandidates.filter((value) => value >= minX - EPSILON && value <= maxX + EPSILON);
    const x = candidatesInRange.length > 0 ? getClosestValue(candidatesInRange, target[0]) : null;

    if (x !== null) {
      return [x, target[1], target[2]];
    }
  }

  const clampedTarget: Vector = [clamp(target[0], minX, maxX), target[1], target[2]];

  return add(anchor, scale(normalize(subtract(clampedTarget, anchor), [1, 0, 0]), distance));
}

function getPedalTarget(
  input: PlannerInput,
  centerYmm: number,
  footLengthM: number,
  heelLengthM: number,
  hip: Vector,
  thighLength: number,
  lowerLegLength: number,
  kneeLift: number
): PedalFootTarget {
  const pedalDirection = getPedalDirection(input);
  const talonTailToAnkleDirection = getTalonTailToAnkleDirection(pedalDirection);
  const pedalPivot = getPedalPivot(input, centerYmm);
  const heelLength = Math.min(heelLengthM, footLengthM - mm(20));
  const footBoneLength = Math.max(mm(20), footLengthM - heelLength);
  const footStartLength = footBoneLength * POSTURE_TOE_BONE_START_SHARE;
  const toeBoneLength = footBoneLength * (1 - POSTURE_TOE_BONE_START_SHARE);
  const toeStart = add(pedalPivot, scale(pedalDirection, footStartLength));
  const toe = add(toeStart, scale(pedalDirection, toeBoneLength));
  const slideMinM = mm(input.seatBaseDepthMm + input.pedalTrayDistanceMm);
  const pivotXM = pedalPivot[0];
  const pedalPlaneNormal = getPedalPlaneNormal(pedalDirection);
  const talonPedalPlaneOffsetXM =
    mm(POSTURE_TALON_PEDAL_PLANE_OFFSET_MM) / Math.max(EPSILON, Math.abs(pedalPlaneNormal[0]));
  const slideMaxM = Math.max(
    slideMinM,
    Math.min(slideMinM + mm(input.pedalTrayDepthMm), pivotXM - talonPedalPlaneOffsetXM)
  );
  let bestScore = Infinity;
  let heel = pedalPivot;

  for (let slideXM = slideMinM; slideXM <= slideMaxM + EPSILON; slideXM += mm(POSTURE_TALON_SLIDE_STEP_MM)) {
    const candidateSlideXM = Math.min(slideXM, slideMaxM);
    const candidateHeel: Vector = [candidateSlideXM, pedalPivot[1], pedalPivot[2]];
    const candidateAnkle = add(candidateHeel, scale(talonTailToAnkleDirection, heelLength));
    const candidateToeStart = getPointOnPedalLineAtDistance(
      candidateAnkle,
      pedalPivot,
      pedalDirection,
      footStartLength,
      footStartLength,
      toeStart
    );
    const candidateLeg = solveTwoLinkPose(hip, candidateAnkle, thighLength, lowerLegLength, [0, 0, kneeLift]);
    const reachErrorMm = length(subtract(candidateLeg.end, candidateAnkle)) / MM_TO_METERS;
    const ankleAngleErrorDeg = Math.abs(
      angleDeg(candidateLeg.joint, candidateLeg.end, candidateToeStart) - POSTURE_ANKLE_TARGET_ANGLE_DEG
    );
    const toeStartPedalPlaneErrorMm =
      Math.abs(dot(subtract(candidateToeStart, pedalPivot), pedalPlaneNormal)) / MM_TO_METERS;
    const pivotPreferenceMm = Math.abs(candidateSlideXM - pivotXM) / MM_TO_METERS;
    const toeStartPreferenceMm =
      Math.abs(length(subtract(candidateToeStart, pedalPivot)) - footStartLength) / MM_TO_METERS;
    const score =
      toeStartPedalPlaneErrorMm * 1_000_000 +
      reachErrorMm * 1000 +
      ankleAngleErrorDeg +
      toeStartPreferenceMm * 0.1 +
      pivotPreferenceMm * 0.001;

    if (score < bestScore) {
      bestScore = score;
      heel = candidateHeel;
    }
  }

  const ankle = add(heel, scale(talonTailToAnkleDirection, heelLength));

  return {
    ankle,
    direction: pedalDirection,
    footBoneLength: footStartLength,
    heel,
    heelLength,
    pedalPivot,
    talonSlideMaxX: slideMaxM,
    talonSlideMinX: slideMinM,
    toeStart,
    toe,
    toeBoneLength,
  };
}

function solvePedalFootPose(target: PedalFootTarget, ankle: Vector): PedalFootTarget {
  const heel = getPointOnPlateLineAtDistance(
    ankle,
    target.heel,
    target.heelLength,
    target.talonSlideMinX,
    target.talonSlideMaxX
  );
  const toeStart = getPointOnPedalLineAtDistance(
    ankle,
    target.pedalPivot,
    target.direction,
    target.footBoneLength,
    target.footBoneLength,
    target.toeStart
  );

  return {
    ...target,
    ankle,
    heel,
    toeStart,
    toe: add(toeStart, scale(target.direction, target.toeBoneLength)),
  };
}

function getHeelLength(heightM: number, footLengthRatio: number, postureModel: PlannerPostureModelMetrics | null) {
  return footLengthRatio * heightM * (postureModel?.heelLengthShare ?? DEFAULT_ANTHROPOMETRY_HEEL_LENGTH_SHARE);
}

function getWheelTargets(input: PlannerInput, rightSign: number) {
  const steeringColumnCenterXmm = input.seatBaseDepthMm + input.steeringColumnDistanceMm + UPRIGHT_BEAM_DEPTH_MM;
  const wheelCenter: Vector = [
    mm(steeringColumnCenterXmm + input.wheelDistanceFromSteeringColumnMm),
    0,
    mm(BASE_BEAM_HEIGHT_MM + input.steeringColumnBaseHeightMm + input.wheelHeightOffsetMm),
  ];
  const wheelDiameterMm = clamp(
    input.wheelDiameterMm,
    PLANNER_DIMENSION_LIMITS.wheelDiameterMinMm,
    PLANNER_DIMENSION_LIMITS.wheelDiameterMaxMm
  );
  const gripRadius = mm(wheelDiameterMm / 2);

  return {
    right: add(wheelCenter, [0, rightSign * gripRadius, 0]),
    left: add(wheelCenter, [0, -rightSign * gripRadius, 0]),
  };
}

function getWheelTorusPlaneDirectionZx(input: PlannerInput): Vector {
  const wheelAngleRad = toRad(-input.wheelAngleDeg);

  return normalize([-Math.sin(wheelAngleRad), 0, Math.cos(wheelAngleRad)]);
}

function getHandBoneDirection(input: PlannerInput): Vector {
  return normalize(rotateXZ(getWheelTorusPlaneDirectionZx(input), -toRad(HAND_BONE_TORUS_PLANE_ANGLE_DEG)));
}

function solveTwoLinkPose(
  root: Vector,
  target: Vector,
  firstLength: number,
  secondLength: number,
  bendHint: Vector
): TwoLinkPose {
  const rootToTarget = subtract(target, root);
  const distance = length(rootToTarget);
  const direction = normalize(rootToTarget);
  const maxReach = firstLength + secondLength;
  const reachableDistance =
    distance > maxReach ? maxReach : clamp(distance, Math.abs(firstLength - secondLength) + EPSILON, maxReach);
  const end = add(root, scale(direction, reachableDistance));
  const bendDirection = normalize(
    subtract(bendHint, scale(direction, dot(bendHint, direction))),
    Math.abs(direction[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]
  );
  const rootToJointDistance =
    (firstLength * firstLength - secondLength * secondLength + reachableDistance * reachableDistance) /
    (2 * reachableDistance);
  const bendDistance = Math.sqrt(Math.max(0, firstLength * firstLength - rootToJointDistance * rootToJointDistance));
  const joint = add(add(root, scale(direction, rootToJointDistance)), scale(bendDirection, bendDistance));

  return { end, joint };
}

function canReachTwoLinkTarget(root: Vector, target: Vector, firstLength: number, secondLength: number) {
  const distance = length(subtract(target, root));

  return distance <= firstLength + secondLength + EPSILON && distance >= Math.abs(firstLength - secondLength) - EPSILON;
}

function solveArmPose(
  shoulder: Vector,
  handTarget: Vector,
  upperArmLength: number,
  forearmLength: number,
  sideSign: number,
  handGripLength: number,
  handBoneDirection: Vector
): TwoLinkPose & { hand: Vector } {
  const wristTarget = getWristFromHand(handTarget, handGripLength, handBoneDirection);
  const arm = solveTwoLinkPose(shoulder, wristTarget, upperArmLength, forearmLength, [0, sideSign * 0.02, -1]);
  const hand = canReachTwoLinkTarget(shoulder, wristTarget, upperArmLength, forearmLength)
    ? handTarget
    : add(arm.end, scale(handBoneDirection, handGripLength));

  return { ...arm, hand };
}

function getHandGripLength(heightM: number, forearmHandLength: number) {
  return Math.min(
    clamp(heightM * HAND_GRIP_HEIGHT_RATIO, mm(HAND_GRIP_LENGTH_MIN_MM), mm(HAND_GRIP_LENGTH_MAX_MM)),
    forearmHandLength * HAND_MAX_FOREARM_HAND_SHARE
  );
}

function getWristFromHand(hand: Vector, handGripLength: number, handBoneDirection: Vector) {
  return add(hand, scale(handBoneDirection, -handGripLength));
}

export function getEffectiveAnthropometryRatios(
  settings: PlannerPostureSettings<PlannerPosturePreset>,
  postureModel: PlannerPostureModelMetrics | null = null
): PlannerAnthropometryRatios {
  void settings;

  return { ...(postureModel?.anthropometryRatios ?? DEFAULT_ANTHROPOMETRY_RATIOS) };
}

function getEffectiveEyeCenterRatios(postureModel: PlannerPostureModelMetrics | null) {
  return {
    forwardFromHip: postureModel?.eyeCenterForwardFromHip ?? DEFAULT_EYE_CENTER_FORWARD_FROM_HIP,
    heightFromHip:
      postureModel?.eyeCenterHeightFromHip ??
      postureModel?.eyeCenterSittingHeight ??
      DEFAULT_EYE_CENTER_HEIGHT_FROM_HIP,
  };
}

export function getPostureBoosterSeatOffsetMm(heightCm: number) {
  const clampedHeightCm = clamp(heightCm, PLANNER_POSTURE_LIMITS.heightMinCm, PLANNER_POSTURE_LIMITS.heightMaxCm);

  return {
    backMm: clampedHeightCm < POSTURE_BOOSTER_HEIGHT_THRESHOLD_CM ? POSTURE_BOOSTER_BACK_OFFSET_MAX_MM : 0,
    bottomMm: clampedHeightCm < POSTURE_BOOSTER_HEIGHT_THRESHOLD_CM ? POSTURE_BOOSTER_BOTTOM_OFFSET_MAX_MM : 0,
  };
}

function getBoosterSeatOffset(settings: PlannerPostureSettings<PlannerPosturePreset>) {
  const offset = getPostureBoosterSeatOffsetMm(settings.heightCm);

  return {
    backM: mm(offset.backMm),
    bottomM: mm(offset.bottomMm),
  };
}

export function getPlannerPostureFootContactErrorMm(
  input: PlannerInput,
  settings: PlannerPostureSettings<PlannerPosturePreset>,
  postureModel: PlannerPostureModelMetrics | null = null
) {
  const heightM =
    clamp(settings.heightCm, PLANNER_POSTURE_LIMITS.heightMinCm, PLANNER_POSTURE_LIMITS.heightMaxCm) / 100;
  const ratios = getEffectiveAnthropometryRatios(settings, postureModel);
  const heelLength = getHeelLength(heightM, ratios.footLength, postureModel);
  const footLength = ratios.footLength * heightM;
  const footBoneLength = Math.max(mm(20), Math.max(heelLength + mm(20), footLength) - heelLength);
  const footStartLength = footBoneLength * POSTURE_TOE_BONE_START_SHARE;
  const toeBoneLength = footBoneLength * (1 - POSTURE_TOE_BONE_START_SHARE);
  const skeleton = createPlannerPostureSkeleton(input, settings, postureModel);
  const pedalDirection = getPedalDirection(input);
  const pedalPlaneNormal = getPedalPlaneNormal(pedalDirection);
  const pedalCentersYmm = getPedalCentersYmm(input);
  const talonPlaneOffsetM = mm(POSTURE_TALON_PEDAL_PLANE_OFFSET_MM);
  const getFootError = (pivot: Vector, ankle: Vector, heel: Vector, toeStart: Vector, toe: Vector) => {
    const getPedalPlaneOffset = (point: Vector) => dot(subtract(point, pivot), pedalPlaneNormal);

    return Math.max(
      Math.abs(heel[1] - pivot[1]),
      Math.abs(heel[2] - pivot[2]),
      Math.max(0, talonPlaneOffsetM - getPedalPlaneOffset(heel)),
      Math.abs(toeStart[1] - pivot[1]),
      Math.abs(getPedalPlaneOffset(toeStart)),
      Math.abs(toe[1] - pivot[1]),
      Math.abs(getPedalPlaneOffset(toe)),
      Math.abs(length(subtract(heel, ankle)) - heelLength),
      Math.abs(length(subtract(toeStart, ankle)) - footStartLength),
      Math.abs(length(subtract(toe, toeStart)) - toeBoneLength)
    );
  };

  return (
    Math.max(
      getFootError(
        getPedalPivot(input, pedalCentersYmm.brake),
        skeleton.joints.ankleLeft,
        skeleton.joints.heelLeft,
        skeleton.joints.toeStartLeft,
        skeleton.joints.toeLeft
      ),
      getFootError(
        getPedalPivot(input, pedalCentersYmm.accelerator),
        skeleton.joints.ankleRight,
        skeleton.joints.heelRight,
        skeleton.joints.toeStartRight,
        skeleton.joints.toeRight
      )
    ) / MM_TO_METERS
  );
}

export function createPlannerPostureSkeleton(
  input: PlannerInput,
  settings: PlannerPostureSettings<PlannerPosturePreset>,
  postureModel: PlannerPostureModelMetrics | null = null
): PlannerPostureSkeleton {
  const heightM =
    clamp(settings.heightCm, PLANNER_POSTURE_LIMITS.heightMinCm, PLANNER_POSTURE_LIMITS.heightMaxCm) / 100;
  const ratios = getEffectiveAnthropometryRatios(settings, postureModel);
  const seatAngleRad = toRad(input.seatAngleDeg);
  const backrestAngleRad = toRad(input.seatAngleDeg + input.backrestAngleDeg - 90);
  const seatForward: Vector = [Math.cos(seatAngleRad), 0, Math.sin(seatAngleRad)];
  const seatNormal: Vector = [-Math.sin(seatAngleRad), 0, Math.cos(seatAngleRad)];
  const backrestUp: Vector = [-Math.sin(backrestAngleRad), 0, Math.cos(backrestAngleRad)];
  const bodyForward: Vector = normalize(rotateXZ(backrestUp, -Math.PI / 2), seatForward);
  const seatPivot = getSeatPivot(input);
  const heightScale = heightM / (DEFAULT_POSTURE_HEIGHT_CM / 100);
  const postureScale = 1 + (heightScale - 1);
  const postureScaleAbove = 1 + (heightScale - 1) * 0.2;
  const hipForwardOnSeatM = mm(POSTURE_HIP_FORWARD_ON_SEAT_MM * postureScale);
  const hipAboveSeatM = mm(POSTURE_HIP_ABOVE_SEAT_MM * postureScaleAbove);
  const shoulderHipClearanceM = mm(POSTURE_SHOULDER_ABOVE_HIP_CLEARANCE_MM * postureScale);
  const boosterSeatOffset = getBoosterSeatOffset(settings);
  const hipCenter = add(
    seatPivot,
    add(
      add(scale(seatForward, hipForwardOnSeatM), scale(seatNormal, hipAboveSeatM + boosterSeatOffset.bottomM)),
      scale(bodyForward, boosterSeatOffset.backM)
    )
  );
  const shoulderToHipM = Math.max(mm(250), ratios.seatedShoulderHeight * heightM - shoulderHipClearanceM);
  const shoulderCenter = add(hipCenter, scale(backrestUp, shoulderToHipM));
  const neck = add(hipCenter, scale(backrestUp, Math.max(shoulderToHipM, ratios.sittingHeight * heightM * 0.84)));
  const head = add(hipCenter, scale(backrestUp, ratios.sittingHeight * heightM));
  const eyeCenterRatios = getEffectiveEyeCenterRatios(postureModel);
  const eyeCenter = add(
    hipCenter,
    add(
      scale(backrestUp, eyeCenterRatios.heightFromHip * heightM),
      scale(bodyForward, eyeCenterRatios.forwardFromHip * heightM)
    )
  );
  const pedalCentersYmm = getPedalCentersYmm(input);
  const rightSign = Math.sign(pedalCentersYmm.accelerator) || -1;
  const hipHalfWidthM = (ratios.hipBreadth * heightM) / 2;
  const shoulderHalfWidthM = (ratios.shoulderBreadth * heightM) / 2;
  const hipRight = add(hipCenter, [0, rightSign * hipHalfWidthM, 0]);
  const hipLeft = add(hipCenter, [0, -rightSign * hipHalfWidthM, 0]);
  const shoulderRight = add(shoulderCenter, [0, rightSign * shoulderHalfWidthM, 0]);
  const shoulderLeft = add(shoulderCenter, [0, -rightSign * shoulderHalfWidthM, 0]);
  const wheelTargets = getWheelTargets(input, rightSign);
  const footLength = ratios.footLength * heightM;
  const heelLength = getHeelLength(heightM, ratios.footLength, postureModel);
  const pedalFootLength = Math.max(heelLength + mm(20), footLength);
  const thighLength = ratios.thighLength * heightM;
  const lowerLegLength = ratios.lowerLegLength * heightM;
  const kneeLift = PRESET_KNEE_LIFT[settings.preset];
  const rightPedal = getPedalTarget(
    input,
    pedalCentersYmm.accelerator,
    pedalFootLength,
    heelLength,
    hipRight,
    thighLength,
    lowerLegLength,
    kneeLift
  );
  const leftPedal = getPedalTarget(
    input,
    pedalCentersYmm.brake,
    pedalFootLength,
    heelLength,
    hipLeft,
    thighLength,
    lowerLegLength,
    kneeLift
  );
  const upperArmLength = ratios.upperArmLength * heightM;
  const forearmHandLength = ratios.forearmHandLength * heightM;
  const handGripLength = getHandGripLength(heightM, forearmHandLength);
  const forearmLength = Math.max(mm(20), forearmHandLength - handGripLength);
  const handBoneDirection = getHandBoneDirection(input);
  const rightLeg = solveTwoLinkPose(hipRight, rightPedal.ankle, thighLength, lowerLegLength, [0, 0, kneeLift]);
  const leftLeg = solveTwoLinkPose(hipLeft, leftPedal.ankle, thighLength, lowerLegLength, [0, 0, kneeLift]);
  const solvedRightPedal = solvePedalFootPose(rightPedal, rightLeg.end);
  const solvedLeftPedal = solvePedalFootPose(leftPedal, leftLeg.end);
  const rightArm = solveArmPose(
    shoulderRight,
    wheelTargets.right,
    upperArmLength,
    forearmLength,
    rightSign,
    handGripLength,
    handBoneDirection
  );
  const leftArm = solveArmPose(
    shoulderLeft,
    wheelTargets.left,
    upperArmLength,
    forearmLength,
    -rightSign,
    handGripLength,
    handBoneDirection
  );
  const rightHeel = solvedRightPedal.heel;
  const leftHeel = solvedLeftPedal.heel;
  const rightToeStart = solvedRightPedal.toeStart;
  const leftToeStart = solvedLeftPedal.toeStart;
  const rightToe = solvedRightPedal.toe;
  const leftToe = solvedLeftPedal.toe;
  const joints: Record<PostureJointName, PosturePoint> = {
    head,
    eyeCenter,
    neck,
    shoulderCenter,
    shoulderLeft,
    shoulderRight,
    elbowLeft: leftArm.joint,
    elbowRight: rightArm.joint,
    wristLeft: leftArm.end,
    wristRight: rightArm.end,
    handLeft: leftArm.hand,
    handRight: rightArm.hand,
    hipCenter,
    hipLeft,
    hipRight,
    kneeLeft: leftLeg.joint,
    kneeRight: rightLeg.joint,
    ankleLeft: leftLeg.end,
    ankleRight: rightLeg.end,
    heelLeft: leftHeel,
    heelRight: rightHeel,
    toeStartLeft: leftToeStart,
    toeStartRight: rightToeStart,
    toeLeft: leftToe,
    toeRight: rightToe,
  };

  return {
    joints,
    segments: [
      { start: joints.head, end: joints.neck },
      { start: joints.neck, end: joints.shoulderCenter },
      { start: joints.shoulderLeft, end: joints.shoulderRight },
      { start: joints.shoulderCenter, end: joints.hipCenter },
      { start: joints.hipLeft, end: joints.hipRight },
      { start: joints.shoulderLeft, end: joints.elbowLeft },
      { start: joints.elbowLeft, end: joints.wristLeft },
      { start: joints.wristLeft, end: joints.handLeft },
      { start: joints.shoulderRight, end: joints.elbowRight },
      { start: joints.elbowRight, end: joints.wristRight },
      { start: joints.wristRight, end: joints.handRight },
      { start: joints.hipLeft, end: joints.kneeLeft },
      { start: joints.kneeLeft, end: joints.ankleLeft },
      { start: joints.ankleLeft, end: joints.heelLeft },
      { start: joints.ankleLeft, end: joints.toeStartLeft },
      { start: joints.toeStartLeft, end: joints.toeLeft },
      { start: joints.hipRight, end: joints.kneeRight },
      { start: joints.kneeRight, end: joints.ankleRight },
      { start: joints.ankleRight, end: joints.heelRight },
      { start: joints.ankleRight, end: joints.toeStartRight },
      { start: joints.toeStartRight, end: joints.toeRight },
    ],
  };
}
