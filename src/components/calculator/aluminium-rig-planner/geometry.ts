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

export type PlannerGeometry = {
  input: PlannerInput;
  wheelMountOffsets: WheelMountOffsets;
  wheelReachMm: number;
  legExtensionMm: number;
  frameMembers: FrameMember[];
};

const MIN_SEAT_BACK_ANGLE_DEG = 10;
const MAX_SEAT_BACK_ANGLE_DEG = 45;
const MIN_PEDAL_ANGLE_DEG = 0;
const MAX_PEDAL_ANGLE_DEG = 35;
const MIN_WHEEL_TILT_DEG = -10;
const MAX_WHEEL_TILT_DEG = 35;

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

export function clampPlannerInput(input: PlannerInput): PlannerInput {
  return {
    ...input,
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
  const seatCrossMemberX = clamp(input.seatXMm + 40, 140, input.baseLengthMm - 260);
  const wheelCrossMemberX = clamp(
    input.wheelXMm + wheelMountOffsets.mountXMm,
    seatCrossMemberX + 120,
    input.baseLengthMm - 120
  );
  const pedalCrossMemberX = clamp(input.pedalXMm - 80, wheelCrossMemberX + 80, input.baseLengthMm - 40);
  const baseTopY = input.baseHeightMm;

  const frameMembers = [
    createFrameMember('left-rail', { x: 0, y: 0 }, { x: input.baseLengthMm, y: 0 }),
    createFrameMember('right-rail', { x: 0, y: 400 }, { x: input.baseLengthMm, y: 400 }),
    createFrameMember('rear-cross-member', { x: 0, y: 0 }, { x: 0, y: 400 }),
    createFrameMember('seat-cross-member', { x: seatCrossMemberX, y: 0 }, { x: seatCrossMemberX, y: 400 }),
    createFrameMember('wheel-cross-member', { x: wheelCrossMemberX, y: 0 }, { x: wheelCrossMemberX, y: 400 }),
    createFrameMember('front-cross-member', { x: frontCrossMemberX, y: 0 }, { x: frontCrossMemberX, y: 400 }),
    createFrameMember('pedal-brace', { x: seatCrossMemberX, y: baseTopY }, { x: pedalCrossMemberX, y: input.pedalYMm }),
  ];

  return {
    input,
    wheelMountOffsets,
    wheelReachMm,
    legExtensionMm,
    frameMembers,
  };
}
