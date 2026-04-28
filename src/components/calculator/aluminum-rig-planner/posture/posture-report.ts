import { PLANNER_DIMENSION_LIMITS } from '../constants/planner';
import { BASE_BEAM_HEIGHT_MM, UPRIGHT_BEAM_DEPTH_MM } from '../constants/profile';
import { createPlannerPostureSkeleton, type PosturePoint } from './posture';
import {
  getPlannerPostureTargetRanges as getSharedPlannerPostureTargetRanges,
  type PlannerPostureTargetRange,
} from './posture-targets';
import type {
  PlannerInput,
  PlannerPostureModelMetrics,
  PlannerPosturePreset,
  PlannerPostureSettings,
  PlannerPostureTargetKey,
} from '../types';

export type PlannerPostureMetricStatus = 'ok' | 'warn' | 'bad';
export type PlannerPostureMetricRange = PlannerPostureTargetRange;
export type PlannerPostureMetric = {
  key: PlannerPostureTargetKey;
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
  monitorDebug?: PlannerPostureMonitorDebug;
};
export type PlannerPostureReportOptions = {
  includeMonitor?: boolean;
};

const MM_TO_METERS = 0.001;
const EPSILON = 0.000001;
const MONITOR_DEBUG_BALL_DIAMETER_MM = 10;
const WRIST_ORIGINAL_FOREARM_ANGLE_DEG = 180;
const FOOT_TO_TOE_ORIGINAL_POSTURE_ANGLE_DEG = 180;

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

function angleBetweenSegmentsDeg(aStart: PosturePoint, aEnd: PosturePoint, bStart: PosturePoint, bEnd: PosturePoint) {
  const a = subtract(aEnd, aStart);
  const b = subtract(bEnd, bStart);
  const denominator = length(a) * length(b);

  if (denominator < EPSILON) {
    return 0;
  }

  const cosine = Math.max(-1, Math.min(1, dot(a, b) / denominator));

  return (Math.acos(cosine) * 180) / Math.PI;
}

function angleDecreaseFromOriginalDeg(originalAngleDeg: number, a: PosturePoint, joint: PosturePoint, b: PosturePoint) {
  return Math.max(0, originalAngleDeg - angleDeg(a, joint, b));
}

function projectedXyAngleDeg(from: PosturePoint, to: PosturePoint) {
  const deltaX = to[0] - from[0];
  const deltaY = to[1] - from[1];

  return (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
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
  key: PlannerPostureTargetKey,
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
  return [
    referencePoint[0] + settings.monitorDistanceFromEyesMm * MM_TO_METERS,
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
  postureSettings: PlannerPostureSettings<PlannerPosturePreset>,
  postureModel: PlannerPostureModelMetrics,
  options: PlannerPostureReportOptions = {}
): PlannerPostureReport {
  const skeleton = createPlannerPostureSkeleton(
    input,
    {
      ...postureSettings,
      preset: postureSettings.preset === 'custom' ? 'gt' : postureSettings.preset,
    },
    postureModel
  );
  const ranges = getSharedPlannerPostureTargetRanges(postureSettings.preset, postureSettings.targetRangesByPreset);
  const eyeCenter = skeleton.joints.eyeCenter;
  const includeMonitor = options.includeMonitor ?? true;
  const wheelTopZ = includeMonitor ? getWheelCenter(input)[2] + (input.wheelDiameterMm * MM_TO_METERS) / 2 : null;
  const monitorMidpoint = includeMonitor ? getMonitorMidpoint(eyeCenter, postureSettings) : null;
  const metrics = [
    createMetric(
      'wristBend',
      'Wrist Bend',
      'deg',
      mean([
        angleDecreaseFromOriginalDeg(
          WRIST_ORIGINAL_FOREARM_ANGLE_DEG,
          skeleton.joints.elbowLeft,
          skeleton.joints.wristLeft,
          skeleton.joints.handLeft
        ),
        angleDecreaseFromOriginalDeg(
          WRIST_ORIGINAL_FOREARM_ANGLE_DEG,
          skeleton.joints.elbowRight,
          skeleton.joints.wristRight,
          skeleton.joints.handRight
        ),
      ]),
      ranges
    ),
    createMetric(
      'elbowBend',
      'Elbow Bend',
      'deg',
      mean([
        angleDeg(skeleton.joints.shoulderLeft, skeleton.joints.elbowLeft, skeleton.joints.wristLeft),
        angleDeg(skeleton.joints.shoulderRight, skeleton.joints.elbowRight, skeleton.joints.wristRight),
      ]),
      ranges
    ),
    createMetric(
      'kneeBend',
      'Knee Bend',
      'deg',
      mean([
        angleDeg(skeleton.joints.hipLeft, skeleton.joints.kneeLeft, skeleton.joints.ankleLeft),
        angleDeg(skeleton.joints.hipRight, skeleton.joints.kneeRight, skeleton.joints.ankleRight),
      ]),
      ranges
    ),
    createMetric(
      'torsoToThigh',
      'Thigh Bend',
      'deg',
      mean([
        angleDeg(skeleton.joints.shoulderCenter, skeleton.joints.hipLeft, skeleton.joints.kneeLeft),
        angleDeg(skeleton.joints.shoulderCenter, skeleton.joints.hipRight, skeleton.joints.kneeRight),
      ]),
      ranges
    ),
    createMetric(
      'ankleBend',
      'Ankle Bend',
      'deg',
      mean([
        angleBetweenSegmentsDeg(
          skeleton.joints.kneeLeft,
          skeleton.joints.ankleLeft,
          skeleton.joints.toeStartLeft,
          skeleton.joints.heelLeft
        ),
        angleBetweenSegmentsDeg(
          skeleton.joints.kneeRight,
          skeleton.joints.ankleRight,
          skeleton.joints.toeStartRight,
          skeleton.joints.heelRight
        ),
      ]),
      ranges
    ),
    createMetric(
      'footToToeBend',
      'Toe Bend',
      'deg',
      mean([
        angleDecreaseFromOriginalDeg(
          FOOT_TO_TOE_ORIGINAL_POSTURE_ANGLE_DEG,
          skeleton.joints.ankleLeft,
          skeleton.joints.toeStartLeft,
          skeleton.joints.toeLeft
        ),
        angleDecreaseFromOriginalDeg(
          FOOT_TO_TOE_ORIGINAL_POSTURE_ANGLE_DEG,
          skeleton.joints.ankleRight,
          skeleton.joints.toeStartRight,
          skeleton.joints.toeRight
        ),
      ]),
      ranges
    ),
    createMetric(
      'brakeAlignment',
      'Brake Alignment',
      'deg',
      projectedXyAngleDeg(skeleton.joints.hipLeft, skeleton.joints.toeLeft),
      ranges
    ),
    ...(wheelTopZ !== null && monitorMidpoint
      ? [
          createMetric('eyeToWheelTop', 'Eye to Wheel Top', 'mm', (eyeCenter[2] - wheelTopZ) / MM_TO_METERS, ranges),
          createMetric(
            'eyeToMonitorMidpoint',
            'Eye to Monitor Mid',
            'mm',
            (eyeCenter[2] - monitorMidpoint[2]) / MM_TO_METERS,
            ranges
          ),
        ]
      : []),
  ];
  const hints = metrics.flatMap((metric) => (metric.hint ? [metric.hint] : [])).concat(getClampHints(input));

  return {
    metrics,
    hints,
    ...(monitorMidpoint ? { monitorDebug: createMonitorDebug(monitorMidpoint) } : {}),
  };
}

export function getPlannerPostureTargetRanges(preset: PlannerPosturePreset) {
  return getSharedPlannerPostureTargetRanges(preset);
}
