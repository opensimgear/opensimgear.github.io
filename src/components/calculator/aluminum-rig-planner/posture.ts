import {
  BASE_BEAM_HEIGHT_MM,
  BASE_MODULE_LAYOUT,
  DEFAULT_ANTHROPOMETRY_RATIOS,
  HALF_PROFILE_SHORT_MM,
  PEDAL_TRAY_LAYOUT,
  PLANNER_POSTURE_LIMITS,
  PROFILE_SHORT_MM,
  UPRIGHT_BEAM_DEPTH_MM,
} from './constants';
import type { PlannerAnthropometryRatios, PlannerInput, PlannerPostureSettings } from './types';

export type PostureJointName =
  | 'head'
  | 'neck'
  | 'eye'
  | 'shoulderCenter'
  | 'shoulderLeft'
  | 'shoulderRight'
  | 'elbowLeft'
  | 'elbowRight'
  | 'wristLeft'
  | 'wristRight'
  | 'hipCenter'
  | 'hipLeft'
  | 'hipRight'
  | 'kneeLeft'
  | 'kneeRight'
  | 'ankleLeft'
  | 'ankleRight'
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

const MM_TO_METERS = 0.001;
const EPSILON = 0.000001;
const PEDAL_WIDTH_MM = 60;
const PEDAL_HEIGHT_MM = 180;
const PEDAL_PLATE_THICKNESS_MM = 3;
const WHEEL_TUBE_RADIUS_MM = 16;
const SEAT_BASE_FRONT_ANCHOR_REAR_OFFSET_MM = 38;
const HIP_FORWARD_ON_SEAT_MM = 120;
const HIP_ABOVE_SEAT_MM = 70;
const SHOULDER_ABOVE_HIP_CLEARANCE_MM = 60;

const PRESET_KNEE_LIFT = {
  formula: 0.18,
  gt: 0.24,
  rally: 0.28,
  road: 0.24,
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

function getSeatPivot(input: PlannerInput): Vector {
  const seatAngleRad = toRad(input.seatAngleDeg);
  const seatFrontAnchorLocalXmm = input.seatLengthMm - SEAT_BASE_FRONT_ANCHOR_REAR_OFFSET_MM;
  const seatCrossMemberCenterXmm = Math.max(
    BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm,
    input.seatBaseDepthMm - BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm
  );
  const seatFrontAnchorXmm = seatCrossMemberCenterXmm + HALF_PROFILE_SHORT_MM + input.seatDeltaMm;
  const seatRearPivotXmm = seatFrontAnchorXmm - Math.cos(seatAngleRad) * seatFrontAnchorLocalXmm;
  const seatRearPivotYmm = BASE_BEAM_HEIGHT_MM + PROFILE_SHORT_MM + input.seatHeightFromBaseInnerBeamsMm;

  return [mm(seatRearPivotXmm), mm(seatRearPivotYmm), 0];
}

function getPedalCentersZmm(input: PlannerInput) {
  const trayHalfWidthMm = Math.max(0, input.baseWidthMm - PEDAL_TRAY_LAYOUT.sideBeamInnerSpanReductionMm) / 2;
  const acceleratorCenterZmm = trayHalfWidthMm - input.pedalAcceleratorDeltaMm - PEDAL_WIDTH_MM / 2;
  const brakeCenterZmm = acceleratorCenterZmm - PEDAL_WIDTH_MM - input.pedalBrakeDeltaMm;
  const clutchCenterZmm = brakeCenterZmm - PEDAL_WIDTH_MM - input.pedalClutchDeltaMm;

  return {
    accelerator: acceleratorCenterZmm,
    brake: brakeCenterZmm,
    clutch: clutchCenterZmm,
  };
}

function getPedalTarget(input: PlannerInput, centerZmm: number, footLengthM: number) {
  const pedalLeanRad = toRad(input.pedalAngleDeg - 90);
  const pedalDirection: Vector = normalize([-Math.sin(pedalLeanRad), Math.cos(pedalLeanRad), 0]);
  const pedalPivot: Vector = [
    mm(input.seatBaseDepthMm + input.pedalTrayDistanceMm + input.pedalsDeltaMm),
    mm(BASE_BEAM_HEIGHT_MM + PEDAL_PLATE_THICKNESS_MM + input.pedalsHeightMm),
    mm(centerZmm),
  ];
  const toe = add(pedalPivot, scale(pedalDirection, mm(PEDAL_HEIGHT_MM * 0.68)));
  const ankle = add(toe, scale(pedalDirection, -Math.min(footLengthM * 0.62, mm(120))));

  return {
    ankle,
    toe,
  };
}

function getWheelTargets(input: PlannerInput, rightSign: number) {
  const steeringColumnCenterXmm = input.seatBaseDepthMm + input.steeringColumnDistanceMm + UPRIGHT_BEAM_DEPTH_MM;
  const wheelCenter: Vector = [
    mm(steeringColumnCenterXmm + input.wheelDistanceFromSteeringColumnMm),
    mm(BASE_BEAM_HEIGHT_MM + input.steeringColumnBaseHeightMm + input.wheelHeightOffsetMm),
    0,
  ];
  const gripRadius = mm(input.wheelDiameterMm / 2 - WHEEL_TUBE_RADIUS_MM);

  return {
    right: add(wheelCenter, [0, 0, rightSign * gripRadius]),
    left: add(wheelCenter, [0, 0, -rightSign * gripRadius]),
  };
}

function solveTwoLink(
  root: Vector,
  target: Vector,
  firstLength: number,
  secondLength: number,
  bendHint: Vector
): Vector {
  const rootToTarget = subtract(target, root);
  const distance = length(rootToTarget);
  const direction = normalize(rootToTarget);
  const reachableDistance = clamp(
    distance,
    Math.abs(firstLength - secondLength) + EPSILON,
    firstLength + secondLength - EPSILON
  );
  const bendDirection = normalize(
    subtract(bendHint, scale(direction, dot(bendHint, direction))),
    Math.abs(direction[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  );
  const rootToJointDistance =
    (firstLength * firstLength - secondLength * secondLength + reachableDistance * reachableDistance) /
    (2 * reachableDistance);
  const bendDistance = Math.sqrt(Math.max(0, firstLength * firstLength - rootToJointDistance * rootToJointDistance));

  return add(add(root, scale(direction, rootToJointDistance)), scale(bendDirection, bendDistance));
}

function solveGravityArm(
  shoulder: Vector,
  wrist: Vector,
  upperArmLength: number,
  forearmHandLength: number,
  sideSign: number
): Vector {
  const hangingElbow = add(shoulder, [0, -upperArmLength, 0]);

  if (length(subtract(wrist, hangingElbow)) <= forearmHandLength) {
    return hangingElbow;
  }

  const elbow = solveTwoLink(shoulder, wrist, upperArmLength, forearmHandLength, [0, -1, sideSign * 0.02]);

  return [elbow[0], elbow[1], shoulder[2]];
}

export function getEffectiveAnthropometryRatios(settings: PlannerPostureSettings): PlannerAnthropometryRatios {
  if (!settings.advancedAnthropometry) {
    return { ...DEFAULT_ANTHROPOMETRY_RATIOS };
  }

  return {
    sittingHeight: clamp(
      settings.ratios.sittingHeight,
      PLANNER_POSTURE_LIMITS.ratioMin,
      PLANNER_POSTURE_LIMITS.ratioMax
    ),
    seatedEyeHeight: clamp(
      settings.ratios.seatedEyeHeight,
      PLANNER_POSTURE_LIMITS.ratioMin,
      PLANNER_POSTURE_LIMITS.ratioMax
    ),
    seatedShoulderHeight: clamp(
      settings.ratios.seatedShoulderHeight,
      PLANNER_POSTURE_LIMITS.ratioMin,
      PLANNER_POSTURE_LIMITS.ratioMax
    ),
    hipBreadth: clamp(settings.ratios.hipBreadth, PLANNER_POSTURE_LIMITS.ratioMin, PLANNER_POSTURE_LIMITS.ratioMax),
    shoulderBreadth: clamp(
      settings.ratios.shoulderBreadth,
      PLANNER_POSTURE_LIMITS.ratioMin,
      PLANNER_POSTURE_LIMITS.ratioMax
    ),
    upperArmLength: clamp(
      settings.ratios.upperArmLength,
      PLANNER_POSTURE_LIMITS.ratioMin,
      PLANNER_POSTURE_LIMITS.ratioMax
    ),
    forearmHandLength: clamp(
      settings.ratios.forearmHandLength,
      PLANNER_POSTURE_LIMITS.ratioMin,
      PLANNER_POSTURE_LIMITS.ratioMax
    ),
    thighLength: clamp(settings.ratios.thighLength, PLANNER_POSTURE_LIMITS.ratioMin, PLANNER_POSTURE_LIMITS.ratioMax),
    lowerLegLength: clamp(
      settings.ratios.lowerLegLength,
      PLANNER_POSTURE_LIMITS.ratioMin,
      PLANNER_POSTURE_LIMITS.ratioMax
    ),
    footLength: clamp(settings.ratios.footLength, PLANNER_POSTURE_LIMITS.ratioMin, PLANNER_POSTURE_LIMITS.ratioMax),
  };
}

export function createPlannerPostureSkeleton(
  input: PlannerInput,
  settings: PlannerPostureSettings
): PlannerPostureSkeleton {
  const heightM =
    clamp(settings.heightCm, PLANNER_POSTURE_LIMITS.heightMinCm, PLANNER_POSTURE_LIMITS.heightMaxCm) / 100;
  const ratios = getEffectiveAnthropometryRatios(settings);
  const seatAngleRad = toRad(input.seatAngleDeg);
  const backrestAngleRad = toRad(input.seatAngleDeg + input.backrestAngleDeg - 90);
  const seatForward: Vector = [Math.cos(seatAngleRad), Math.sin(seatAngleRad), 0];
  const seatNormal: Vector = [-Math.sin(seatAngleRad), Math.cos(seatAngleRad), 0];
  const backrestUp: Vector = [-Math.sin(backrestAngleRad), Math.cos(backrestAngleRad), 0];
  const seatPivot = getSeatPivot(input);
  const hipCenter = add(
    seatPivot,
    add(scale(seatForward, mm(HIP_FORWARD_ON_SEAT_MM)), scale(seatNormal, mm(HIP_ABOVE_SEAT_MM)))
  );
  const shoulderToHipM = Math.max(mm(250), ratios.seatedShoulderHeight * heightM - mm(SHOULDER_ABOVE_HIP_CLEARANCE_MM));
  const shoulderCenter = add(hipCenter, scale(backrestUp, shoulderToHipM));
  const neck = add(hipCenter, scale(backrestUp, Math.max(shoulderToHipM, ratios.sittingHeight * heightM * 0.84)));
  const head = add(hipCenter, scale(backrestUp, ratios.sittingHeight * heightM));
  const eye = add(hipCenter, scale(backrestUp, ratios.seatedEyeHeight * heightM - mm(HIP_ABOVE_SEAT_MM * 0.5)));
  const pedalCentersZmm = getPedalCentersZmm(input);
  const rightSign = Math.sign(pedalCentersZmm.accelerator) || 1;
  const hipHalfWidthM = (ratios.hipBreadth * heightM) / 2;
  const shoulderHalfWidthM = (ratios.shoulderBreadth * heightM) / 2;
  const hipRight = add(hipCenter, [0, 0, rightSign * hipHalfWidthM]);
  const hipLeft = add(hipCenter, [0, 0, -rightSign * hipHalfWidthM]);
  const shoulderRight = add(shoulderCenter, [0, 0, rightSign * shoulderHalfWidthM]);
  const shoulderLeft = add(shoulderCenter, [0, 0, -rightSign * shoulderHalfWidthM]);
  const wheelTargets = getWheelTargets(input, rightSign);
  const rightPedal = getPedalTarget(input, pedalCentersZmm.accelerator, ratios.footLength * heightM);
  const leftPedal = getPedalTarget(input, pedalCentersZmm.brake, ratios.footLength * heightM);
  const upperArmLength = ratios.upperArmLength * heightM;
  const forearmHandLength = ratios.forearmHandLength * heightM;
  const thighLength = ratios.thighLength * heightM;
  const lowerLegLength = ratios.lowerLegLength * heightM;
  const kneeLift = PRESET_KNEE_LIFT[settings.preset];
  const kneeRight = solveTwoLink(hipRight, rightPedal.ankle, thighLength, lowerLegLength, [0, kneeLift, 0]);
  const kneeLeft = solveTwoLink(hipLeft, leftPedal.ankle, thighLength, lowerLegLength, [0, kneeLift, 0]);
  const elbowRight = solveGravityArm(shoulderRight, wheelTargets.right, upperArmLength, forearmHandLength, rightSign);
  const elbowLeft = solveGravityArm(shoulderLeft, wheelTargets.left, upperArmLength, forearmHandLength, -rightSign);
  const joints: Record<PostureJointName, PosturePoint> = {
    head,
    neck,
    eye,
    shoulderCenter,
    shoulderLeft,
    shoulderRight,
    elbowLeft,
    elbowRight,
    wristLeft: wheelTargets.left,
    wristRight: wheelTargets.right,
    hipCenter,
    hipLeft,
    hipRight,
    kneeLeft,
    kneeRight,
    ankleLeft: leftPedal.ankle,
    ankleRight: rightPedal.ankle,
    toeLeft: leftPedal.toe,
    toeRight: rightPedal.toe,
  };

  return {
    joints,
    segments: [
      { start: joints.head, end: joints.neck },
      { start: joints.neck, end: joints.shoulderCenter },
      { start: joints.eye, end: joints.head },
      { start: joints.shoulderLeft, end: joints.shoulderRight },
      { start: joints.shoulderCenter, end: joints.hipCenter },
      { start: joints.hipLeft, end: joints.hipRight },
      { start: joints.shoulderLeft, end: joints.elbowLeft },
      { start: joints.elbowLeft, end: joints.wristLeft },
      { start: joints.shoulderRight, end: joints.elbowRight },
      { start: joints.elbowRight, end: joints.wristRight },
      { start: joints.hipLeft, end: joints.kneeLeft },
      { start: joints.kneeLeft, end: joints.ankleLeft },
      { start: joints.ankleLeft, end: joints.toeLeft },
      { start: joints.hipRight, end: joints.kneeRight },
      { start: joints.kneeRight, end: joints.ankleRight },
      { start: joints.ankleRight, end: joints.toeRight },
    ],
  };
}
