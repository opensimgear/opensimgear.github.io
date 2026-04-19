import type { PlannerGeometry } from './geometry';
import type { PlannerInput } from './types';

export type GuidanceSeverity = 'good' | 'review' | 'warning';

export type GuidanceItem = {
  id: 'elbow-angle' | 'knee-angle';
  severity: GuidanceSeverity;
  angleDeg: number;
  detail: string;
};

const JOINT_REACH_SATURATION_MARGIN_MM = 1;

function roundAngle(angleDeg: number) {
  return Math.round(angleDeg);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function deriveJointAngleDeg(firstSegmentMm: number, secondSegmentMm: number, reachMm: number) {
  const limitedReachMm = clamp(
    reachMm,
    Math.abs(firstSegmentMm - secondSegmentMm) + JOINT_REACH_SATURATION_MARGIN_MM,
    firstSegmentMm + secondSegmentMm - JOINT_REACH_SATURATION_MARGIN_MM
  );
  const cosine =
    (firstSegmentMm ** 2 + secondSegmentMm ** 2 - limitedReachMm ** 2) / (2 * firstSegmentMm * secondSegmentMm);

  return roundAngle((Math.acos(clamp(cosine, -1, 1)) * 180) / Math.PI);
}

function getAngleSeverity(angleDeg: number, goodMin: number, goodMax: number, reviewMin: number, reviewMax: number) {
  if (angleDeg >= goodMin && angleDeg <= goodMax) {
    return 'good';
  }

  if (angleDeg >= reviewMin && angleDeg <= reviewMax) {
    return 'review';
  }

  return 'warning';
}

export function evaluatePostureGuidance(input: PlannerInput, geometry: PlannerGeometry): GuidanceItem[] {
  const shoulderX = input.seatXMm + clamp(Math.round(input.driverHeightMm * 0.11), 170, 230);
  const shoulderY = input.seatYMm + clamp(Math.round(input.driverHeightMm * 0.16), 250, 320);
  const wheelCenterX = input.wheelXMm + geometry.wheelMountOffsets.wheelCenterOffsetXMm;
  const wheelCenterY = input.wheelYMm + geometry.wheelMountOffsets.wheelCenterOffsetYMm;
  const shoulderToWheelReachMm = Math.hypot(wheelCenterX - shoulderX, wheelCenterY - shoulderY);
  const upperArmMm = Math.round(input.driverHeightMm * 0.19);
  const forearmMm = Math.round(input.driverHeightMm * 0.16);
  const elbowAngleDeg = deriveJointAngleDeg(upperArmMm, forearmMm, shoulderToWheelReachMm);
  const elbowSeverity =
    shoulderToWheelReachMm > upperArmMm + forearmMm - 10
      ? 'warning'
      : getAngleSeverity(elbowAngleDeg, 90, 130, 75, 145);

  const hipX = input.seatXMm + 40;
  const hipY = input.seatYMm + 90;
  const hipToPedalReachMm = Math.hypot(input.pedalXMm - hipX, input.pedalYMm - hipY);
  const thighMm = Math.round(input.inseamMm * 0.53);
  const shinMm = Math.round(input.inseamMm * 0.47);
  const kneeAngleDeg = deriveJointAngleDeg(thighMm, shinMm, hipToPedalReachMm);
  const kneeSeverity = getAngleSeverity(kneeAngleDeg, 100, 135, 90, 145);

  return [
    {
      id: 'elbow-angle',
      severity: elbowSeverity,
      angleDeg: elbowAngleDeg,
      detail:
        elbowSeverity === 'warning' && shoulderToWheelReachMm > upperArmMm + forearmMm - 10
          ? 'Wheel reach is too long for a relaxed elbow bend.'
          : elbowSeverity === 'good'
            ? 'Elbow bend stays in a comfortable range.'
            : 'Wheel position deserves a quick elbow-angle review.',
    },
    {
      id: 'knee-angle',
      severity: kneeSeverity,
      angleDeg: kneeAngleDeg,
      detail:
        kneeSeverity === 'good'
          ? 'Knee bend stays in a comfortable pedal range.'
          : kneeSeverity === 'review'
            ? 'Pedal distance is close to knee-angle limits.'
            : 'Pedal distance pushes knee bend outside preferred range.',
    },
  ];
}
