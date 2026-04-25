import {
  BASE_BEAM_HEIGHT_MM,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  PLANNER_DIMENSION_LIMITS,
  UPRIGHT_BEAM_DEPTH_MM,
} from './constants';
import { getSolvedMonitorDistanceFromEyesMm } from './modules/monitor';
import { createPlannerPostureSkeleton, type PosturePoint } from './posture';
import type { PlannerInput, PlannerPosturePreset, PlannerPostureSettings } from './types';

export type PlannerPostureMetricStatus = 'ok' | 'warn' | 'bad';
export type PlannerPostureMetricRange = {
  min: number;
  max: number;
};
export type PlannerPostureMetric = {
  key: string;
  label: string;
  unit: 'deg' | 'mm';
  range: PlannerPostureMetricRange;
  status: PlannerPostureMetricStatus;
  valueDeg?: number;
  valueMm?: number;
  hint?: string;
};
export type PlannerPostureMonitorDebug = {
  position: PosturePoint;
  diameterM: number;
  constants: {
    ballDiameterMm: number;
  };
};
export type PlannerPostureReport = {
  metrics: PlannerPostureMetric[];
  hints: string[];
  monitorDebug: PlannerPostureMonitorDebug;
};

const MM_TO_METERS = 0.001;
const EPSILON = 0.000001;
const MONITOR_DEBUG_BALL_DIAMETER_MM = 10;

const TARGET_RANGES: Record<PlannerPosturePreset, Record<string, PlannerPostureMetricRange>> = {
  formula: {
    wristBend: { min: 170, max: 195 },
    elbowBend: { min: 85, max: 110 },
    kneeBend: { min: 100, max: 130 },
    torsoToThigh: { min: 70, max: 105 },
    ankleRange: { min: 85, max: 100 },
    brakeHipToThighProjectedAngle: { min: 0, max: 35 },
    headToWheel: { min: -50, max: 180 },
    headToMonitor: { min: -50, max: 50 },
  },
  gt: {
    wristBend: { min: 170, max: 195 },
    elbowBend: { min: 90, max: 120 },
    kneeBend: { min: 120, max: 135 },
    torsoToThigh: { min: 85, max: 120 },
    ankleRange: { min: 85, max: 105 },
    brakeHipToThighProjectedAngle: { min: 5, max: 45 },
    headToWheel: { min: 75, max: 250 },
    headToMonitor: { min: -50, max: 50 },
  },
  rally: {
    wristBend: { min: 170, max: 190 },
    elbowBend: { min: 95, max: 135 },
    kneeBend: { min: 110, max: 140 },
    torsoToThigh: { min: 80, max: 125 },
    ankleRange: { min: 75, max: 110 },
    brakeHipToThighProjectedAngle: { min: 5, max: 50 },
    headToWheel: { min: 75, max: 250 },
    headToMonitor: { min: -50, max: 50 },
  },
  road: {
    wristBend: { min: 173, max: 195 },
    elbowBend: { min: 100, max: 135 },
    kneeBend: { min: 118, max: 142 },
    torsoToThigh: { min: 90, max: 130 },
    ankleRange: { min: 68, max: 113 },
    brakeHipToThighProjectedAngle: { min: 10, max: 55 },
    headToWheel: { min: 75, max: 260 },
    headToMonitor: { min: -50, max: 50 },
  },
  custom: {
    wristBend: { min: 170, max: 195 },
    elbowBend: { min: 90, max: 120 },
    kneeBend: { min: 120, max: 135 },
    torsoToThigh: { min: 85, max: 120 },
    ankleRange: { min: 85, max: 105 },
    brakeHipToThighProjectedAngle: { min: 5, max: 45 },
    headToWheel: { min: 75, max: 250 },
    headToMonitor: { min: -50, max: 50 },
  },
};

function subtract(a: PosturePoint, b: PosturePoint): PosturePoint {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: PosturePoint, b: PosturePoint) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function length(a: PosturePoint) {
  return Math.sqrt(dot(a, a));
}

function angleDeg(a: PosturePoint, joint: PosturePoint, b: PosturePoint) {
  const jointToA = subtract(a, joint);
  const jointToB = subtract(b, joint);
  const denominator = length(jointToA) * length(jointToB);

  if (denominator < EPSILON) {
    return 0;
  }

  const cosine = Math.max(-1, Math.min(1, dot(jointToA, jointToB) / denominator));

  return (Math.acos(cosine) * 180) / Math.PI;
}

function projectedAngleDeg(from: PosturePoint, to: PosturePoint) {
  const deltaX = to[0] - from[0];
  const deltaZ = to[2] - from[2];

  return Math.abs((Math.atan2(deltaZ, deltaX) * 180) / Math.PI);
}

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function roundMetric(value: number) {
  return Number(value.toFixed(1));
}

function getStatus(value: number, range: PlannerPostureMetricRange, unit: PlannerPostureMetric['unit']) {
  if (value >= range.min && value <= range.max) {
    return 'ok';
  }

  const tolerance = unit === 'mm' ? 100 : 10;

  return value >= range.min - tolerance && value <= range.max + tolerance ? 'warn' : 'bad';
}

function getHint(label: string, value: number, range: PlannerPostureMetricRange, status: PlannerPostureMetricStatus) {
  if (status === 'ok') {
    return undefined;
  }

  const direction = value < range.min ? 'low' : 'high';

  return `${label} ${direction}; target ${range.min}-${range.max}.`;
}

function createMetric(
  key: string,
  label: string,
  unit: PlannerPostureMetric['unit'],
  rawValue: number,
  ranges: Record<string, PlannerPostureMetricRange>
): PlannerPostureMetric {
  const value = roundMetric(rawValue);
  const range = ranges[key];
  const status = getStatus(value, range, unit);

  return {
    key,
    label,
    unit,
    range,
    status,
    ...(unit === 'mm' ? { valueMm: value } : { valueDeg: value }),
    hint: getHint(label, value, range, status),
  };
}

function getWheelCenter(input: PlannerInput): PosturePoint {
  return [
    (input.seatBaseDepthMm +
      input.steeringColumnDistanceMm +
      UPRIGHT_BEAM_DEPTH_MM +
      input.wheelDistanceFromSteeringColumnMm) *
      MM_TO_METERS,
    0,
    (BASE_BEAM_HEIGHT_MM + input.steeringColumnBaseHeightMm + input.wheelHeightOffsetMm) * MM_TO_METERS,
  ];
}

function getMonitorMidpoint(
  referencePoint: PosturePoint,
  settings: PlannerPostureSettings<PlannerPosturePreset>
): PosturePoint {
  const distanceFromEyesMm = getSolvedMonitorDistanceFromEyesMm(settings);

  return [
    referencePoint[0] + distanceFromEyesMm * MM_TO_METERS,
    0,
    (BASE_BEAM_HEIGHT_MM + settings.monitorHeightFromBaseMm) * MM_TO_METERS,
  ];
}

function createMonitorDebug(position: PosturePoint): PlannerPostureMonitorDebug {
  return {
    position,
    diameterM: MONITOR_DEBUG_BALL_DIAMETER_MM * MM_TO_METERS,
    constants: {
      ballDiameterMm: MONITOR_DEBUG_BALL_DIAMETER_MM,
    },
  };
}

function getClampHints(input: PlannerInput) {
  const hints: string[] = [];

  if (
    input.baseLengthMm === PLANNER_DIMENSION_LIMITS.baseLengthMinMm ||
    input.baseLengthMm === PLANNER_DIMENSION_LIMITS.baseLengthMaxMm
  ) {
    hints.push('Base length at planner limit; preset solver may need manual cockpit compromise.');
  }

  if (
    input.pedalTrayDistanceMm === PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMinMm ||
    input.pedalTrayDistanceMm === PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMaxMm
  ) {
    hints.push('Pedal tray at planner limit; adjust base length or seat placement.');
  }

  return hints;
}

export function createPlannerPostureReport(
  input: PlannerInput,
  postureSettings: PlannerPostureSettings<PlannerPosturePreset> = DEFAULT_PLANNER_POSTURE_SETTINGS
): PlannerPostureReport {
  const skeleton = createPlannerPostureSkeleton(input, {
    ...postureSettings,
    preset: postureSettings.preset === 'custom' ? 'gt' : postureSettings.preset,
  });
  const ranges = TARGET_RANGES[postureSettings.preset];
  const wheelCenter = getWheelCenter(input);
  const wheelTopZ = wheelCenter[2] + (input.wheelDiameterMm * MM_TO_METERS) / 2;
  const postureReferencePoint = skeleton.joints.head;
  const monitorMidpoint = getMonitorMidpoint(postureReferencePoint, postureSettings);
  const metrics = [
    createMetric(
      'wristBend',
      'Wrist bend',
      'deg',
      mean([
        angleDeg(skeleton.joints.elbowLeft, skeleton.joints.wristLeft, skeleton.joints.handLeft),
        angleDeg(skeleton.joints.elbowRight, skeleton.joints.wristRight, skeleton.joints.handRight),
      ]),
      ranges
    ),
    createMetric(
      'elbowBend',
      'Elbow bend',
      'deg',
      mean([
        angleDeg(skeleton.joints.shoulderLeft, skeleton.joints.elbowLeft, skeleton.joints.wristLeft),
        angleDeg(skeleton.joints.shoulderRight, skeleton.joints.elbowRight, skeleton.joints.wristRight),
      ]),
      ranges
    ),
    createMetric(
      'kneeBend',
      'Knee bend',
      'deg',
      mean([
        angleDeg(skeleton.joints.hipLeft, skeleton.joints.kneeLeft, skeleton.joints.ankleLeft),
        angleDeg(skeleton.joints.hipRight, skeleton.joints.kneeRight, skeleton.joints.ankleRight),
      ]),
      ranges
    ),
    createMetric(
      'torsoToThigh',
      'Torso to thigh',
      'deg',
      mean([
        angleDeg(skeleton.joints.shoulderCenter, skeleton.joints.hipLeft, skeleton.joints.kneeLeft),
        angleDeg(skeleton.joints.shoulderCenter, skeleton.joints.hipRight, skeleton.joints.kneeRight),
      ]),
      ranges
    ),
    createMetric(
      'ankleRange',
      'Ankle range',
      'deg',
      mean([
        angleDeg(skeleton.joints.kneeLeft, skeleton.joints.ankleLeft, skeleton.joints.toeLeft),
        angleDeg(skeleton.joints.kneeRight, skeleton.joints.ankleRight, skeleton.joints.toeRight),
      ]),
      ranges
    ),
    createMetric(
      'brakeHipToThighProjectedAngle',
      'Brake hip-to-thigh projected angle',
      'deg',
      projectedAngleDeg(skeleton.joints.hipLeft, skeleton.joints.kneeLeft),
      ranges
    ),
    createMetric('headToWheel', 'Head over wheel', 'mm', (postureReferencePoint[2] - wheelTopZ) / MM_TO_METERS, ranges),
    createMetric(
      'headToMonitor',
      'Head vs monitor midpoint',
      'mm',
      (postureReferencePoint[2] - monitorMidpoint[2]) / MM_TO_METERS,
      ranges
    ),
  ];
  const hints = metrics.flatMap((metric) => (metric.hint ? [metric.hint] : [])).concat(getClampHints(input));

  return {
    metrics,
    hints,
    monitorDebug: createMonitorDebug(monitorMidpoint),
  };
}

export function getPlannerPostureTargetRanges(preset: PlannerPosturePreset) {
  return TARGET_RANGES[preset];
}
