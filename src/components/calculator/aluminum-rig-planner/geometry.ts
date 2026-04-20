import type { PlannerInput, WheelMountType } from './types';

export type FrameMember = {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  lengthMm: number;
};

export type WheelMountOffsets = {
  mountXMm: number;
  mountYMm: number;
  wheelCenterOffsetXMm: number;
  wheelCenterOffsetYMm: number;
};

export type WheelSupportUpright = {
  id: string;
  x: number;
  y: number;
  heightMm: number;
};

export type PlannerGeometry = {
  input: PlannerInput;
  wheelMountOffsets: WheelMountOffsets;
  wheelReachMm: number;
  legExtensionMm: number;
  frameMembers: FrameMember[];
  wheelSupportUprights: WheelSupportUpright[];
};

const MIN_SEAT_BACK_ANGLE_DEG = 10;
const MAX_SEAT_BACK_ANGLE_DEG = 45;
const MIN_PEDAL_ANGLE_DEG = 0;
const MAX_PEDAL_ANGLE_DEG = 35;
const MIN_WHEEL_TILT_DEG = -10;
const MAX_WHEEL_TILT_DEG = 35;
const MIN_BASE_LENGTH_MM = 1000;
const MAX_BASE_LENGTH_MM = 1800;
const MIN_SEAT_BASE_DEPTH_MM = 240;
const MAX_SEAT_BASE_DEPTH_MM = 500;
const MIN_BASE_INNER_BEAM_SPACING_MM = 80;
const MAX_BASE_INNER_BEAM_SPACING_MM = 320;
const MIN_PEDAL_TRAY_DEPTH_MM = 300;
const MAX_PEDAL_TRAY_DEPTH_MM = 500;
const MIN_PEDAL_TRAY_DISTANCE_MM = 0;
const MAX_PEDAL_TRAY_DISTANCE_MM = 700;
const MIN_STEERING_COLUMN_BASE_HEIGHT_MM = 120;
const MAX_STEERING_COLUMN_BASE_HEIGHT_MM = 500;
const MIN_STEERING_COLUMN_HEIGHT_MM = 400;
const MAX_STEERING_COLUMN_HEIGHT_MM = 600;

const WHEEL_MOUNT_OFFSETS: Record<WheelMountType, WheelMountOffsets> = {
  front: {
    mountXMm: 0,
    mountYMm: 150,
    wheelCenterOffsetXMm: 60,
    wheelCenterOffsetYMm: 90,
  },
  bottom: {
    mountXMm: 30,
    mountYMm: 80,
    wheelCenterOffsetXMm: 105,
    wheelCenterOffsetYMm: 125,
  },
  deck: {
    mountXMm: 70,
    mountYMm: 190,
    wheelCenterOffsetXMm: 145,
    wheelCenterOffsetYMm: 130,
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundLength(lengthMm: number) {
  return Math.round(lengthMm);
}

function createFrameMember(id: string, start: { x: number; y: number }, end: { x: number; y: number }): FrameMember {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;

  return {
    id,
    start,
    end,
    lengthMm: roundLength(Math.hypot(deltaX, deltaY)),
  };
}

function createWheelSupportUprights(input: PlannerInput, wheelMountOffsets: WheelMountOffsets): WheelSupportUpright[] {
  const supportX = input.wheelXMm + wheelMountOffsets.mountXMm;
  const supportHeightMm = Math.max(input.baseHeightMm + 80, input.wheelYMm + wheelMountOffsets.mountYMm);
  const supportCenterY = 200;
  const supportHalfSpanMm = 80;

  return [
    {
      id: 'wheel-support-left',
      x: supportX,
      y: supportCenterY - supportHalfSpanMm,
      heightMm: supportHeightMm,
    },
    {
      id: 'wheel-support-right',
      x: supportX,
      y: supportCenterY + supportHalfSpanMm,
      heightMm: supportHeightMm,
    },
  ];
}

export function clampPlannerInput(input: PlannerInput): PlannerInput {
  const baseLengthMm = clamp(input.baseLengthMm, MIN_BASE_LENGTH_MM, MAX_BASE_LENGTH_MM);
  const seatBaseDepthMm = clamp(input.seatBaseDepthMm, MIN_SEAT_BASE_DEPTH_MM, Math.min(MAX_SEAT_BASE_DEPTH_MM, baseLengthMm));
  const baseInnerBeamSpacingMm = clamp(
    input.baseInnerBeamSpacingMm,
    MIN_BASE_INNER_BEAM_SPACING_MM,
    MAX_BASE_INNER_BEAM_SPACING_MM
  );
  const pedalTrayDepthMm = clamp(input.pedalTrayDepthMm, MIN_PEDAL_TRAY_DEPTH_MM, MAX_PEDAL_TRAY_DEPTH_MM);
  const pedalTrayDistanceMm = clamp(input.pedalTrayDistanceMm, MIN_PEDAL_TRAY_DISTANCE_MM, MAX_PEDAL_TRAY_DISTANCE_MM);
  const steeringColumnBaseHeightMm = clamp(
    input.steeringColumnBaseHeightMm,
    MIN_STEERING_COLUMN_BASE_HEIGHT_MM,
    MAX_STEERING_COLUMN_BASE_HEIGHT_MM
  );
  const steeringColumnHeightMm = clamp(
    input.steeringColumnHeightMm,
    Math.max(MIN_STEERING_COLUMN_HEIGHT_MM, steeringColumnBaseHeightMm + 80),
    MAX_STEERING_COLUMN_HEIGHT_MM
  );

  return {
    ...input,
    baseLengthMm,
    seatBaseDepthMm,
    baseInnerBeamSpacingMm,
    pedalTrayDepthMm,
    pedalTrayDistanceMm,
    steeringColumnBaseHeightMm,
    steeringColumnHeightMm,
    seatBackAngleDeg: clamp(input.seatBackAngleDeg, MIN_SEAT_BACK_ANGLE_DEG, MAX_SEAT_BACK_ANGLE_DEG),
    pedalAngleDeg: clamp(input.pedalAngleDeg, MIN_PEDAL_ANGLE_DEG, MAX_PEDAL_ANGLE_DEG),
    wheelTiltDeg: clamp(input.wheelTiltDeg, MIN_WHEEL_TILT_DEG, MAX_WHEEL_TILT_DEG),
  };
}

export function getWheelMountOffsets(wheelMountType: WheelMountType): WheelMountOffsets {
  return { ...WHEEL_MOUNT_OFFSETS[wheelMountType] };
}

export function derivePlannerGeometry(rawInput: PlannerInput): PlannerGeometry {
  const input = clampPlannerInput(rawInput);
  const wheelMountOffsets = getWheelMountOffsets(input.wheelMountType);
  const wheelCenterX = input.wheelXMm + wheelMountOffsets.wheelCenterOffsetXMm;
  const wheelCenterY = input.wheelYMm + wheelMountOffsets.wheelCenterOffsetYMm;
  const wheelReachMm = roundLength(Math.hypot(wheelCenterX - input.seatXMm, wheelCenterY - input.seatYMm));
  const legExtensionMm = roundLength(Math.hypot(input.pedalXMm - input.seatXMm, input.pedalYMm - input.seatYMm));
  const frontCrossMemberX = input.baseLengthMm - 80;
  const seatCrossMemberX = input.seatBaseDepthMm;
  const wheelCrossMemberX = clamp(
    input.wheelXMm + wheelMountOffsets.mountXMm,
    seatCrossMemberX + 120,
    input.baseLengthMm - 120
  );

  const frameMembers = [
    createFrameMember('left-rail', { x: 0, y: 0 }, { x: input.baseLengthMm, y: 0 }),
    createFrameMember('right-rail', { x: 0, y: 400 }, { x: input.baseLengthMm, y: 400 }),
    createFrameMember('rear-cross-member', { x: 0, y: 0 }, { x: 0, y: 400 }),
    createFrameMember('seat-cross-member', { x: seatCrossMemberX, y: 0 }, { x: seatCrossMemberX, y: 400 }),
    createFrameMember('wheel-cross-member', { x: wheelCrossMemberX, y: 0 }, { x: wheelCrossMemberX, y: 400 }),
    createFrameMember('front-cross-member', { x: frontCrossMemberX, y: 0 }, { x: frontCrossMemberX, y: 400 }),
  ];
  const wheelSupportUprights = createWheelSupportUprights(input, wheelMountOffsets);

  return {
    input,
    wheelMountOffsets,
    wheelReachMm,
    legExtensionMm,
    frameMembers,
    wheelSupportUprights,
  };
}
