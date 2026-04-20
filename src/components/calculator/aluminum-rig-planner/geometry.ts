import type { PlannerInput, WheelMountType } from './types';
import {
  PLANNER_ANGLE_LIMITS,
  PLANNER_DIMENSION_LIMITS,
  PLANNER_LAYOUT,
  WHEEL_MOUNT_OFFSETS,
} from './constants';

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
  const supportHeightMm = Math.max(
    input.baseHeightMm + PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm,
    input.wheelYMm + wheelMountOffsets.mountYMm
  );
  const supportCenterY = input.baseWidthMm / 2;
  const supportHalfSpanMm = PLANNER_LAYOUT.wheelSupportHalfSpanMm;

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
  const baseLengthMm = clamp(input.baseLengthMm, PLANNER_DIMENSION_LIMITS.baseLengthMinMm, PLANNER_DIMENSION_LIMITS.baseLengthMaxMm);
  const baseWidthMm = clamp(input.baseWidthMm, PLANNER_DIMENSION_LIMITS.baseWidthMinMm, PLANNER_DIMENSION_LIMITS.baseWidthMaxMm);
  const seatBaseDepthMm = clamp(
    input.seatBaseDepthMm,
    PLANNER_DIMENSION_LIMITS.seatBaseDepthMinMm,
    Math.min(PLANNER_DIMENSION_LIMITS.seatBaseDepthMaxMm, baseLengthMm)
  );
  const baseInnerBeamSpacingMm = clamp(
    input.baseInnerBeamSpacingMm,
    PLANNER_DIMENSION_LIMITS.baseInnerBeamSpacingMinMm,
    PLANNER_DIMENSION_LIMITS.baseInnerBeamSpacingMaxMm
  );
  const pedalTrayDepthMm = clamp(
    input.pedalTrayDepthMm,
    PLANNER_DIMENSION_LIMITS.pedalTrayDepthMinMm,
    PLANNER_DIMENSION_LIMITS.pedalTrayDepthMaxMm
  );
  const pedalTrayDistanceMm = clamp(
    input.pedalTrayDistanceMm,
    PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMinMm,
    PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMaxMm
  );
  const steeringColumnBaseHeightMm = clamp(
    input.steeringColumnBaseHeightMm,
    PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMinMm,
    PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMaxMm
  );
  const steeringColumnHeightMm = clamp(
    input.steeringColumnHeightMm,
    Math.max(
      PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm,
      steeringColumnBaseHeightMm + PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm
    ),
    PLANNER_DIMENSION_LIMITS.steeringColumnHeightMaxMm
  );

  return {
    ...input,
    baseLengthMm,
    baseWidthMm,
    seatBaseDepthMm,
    baseInnerBeamSpacingMm,
    pedalTrayDepthMm,
    pedalTrayDistanceMm,
    steeringColumnBaseHeightMm,
    steeringColumnHeightMm,
    seatBackAngleDeg: clamp(input.seatBackAngleDeg, PLANNER_ANGLE_LIMITS.seatBackMinDeg, PLANNER_ANGLE_LIMITS.seatBackMaxDeg),
    pedalAngleDeg: clamp(input.pedalAngleDeg, PLANNER_ANGLE_LIMITS.pedalMinDeg, PLANNER_ANGLE_LIMITS.pedalMaxDeg),
    wheelTiltDeg: clamp(input.wheelTiltDeg, PLANNER_ANGLE_LIMITS.wheelTiltMinDeg, PLANNER_ANGLE_LIMITS.wheelTiltMaxDeg),
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
  const frontCrossMemberX = input.baseLengthMm - PLANNER_LAYOUT.frontCrossMemberInsetMm;
  const seatCrossMemberX = input.seatBaseDepthMm;
  const wheelCrossMemberX = clamp(
    input.wheelXMm + wheelMountOffsets.mountXMm,
    seatCrossMemberX + PLANNER_LAYOUT.wheelCrossMemberMinGapMm,
    input.baseLengthMm - PLANNER_LAYOUT.wheelCrossMemberMaxInsetMm
  );

  const frameMembers = [
    createFrameMember('left-rail', { x: 0, y: 0 }, { x: input.baseLengthMm, y: 0 }),
    createFrameMember('right-rail', { x: 0, y: input.baseWidthMm }, { x: input.baseLengthMm, y: input.baseWidthMm }),
    createFrameMember('rear-cross-member', { x: 0, y: 0 }, { x: 0, y: input.baseWidthMm }),
    createFrameMember('seat-cross-member', { x: seatCrossMemberX, y: 0 }, { x: seatCrossMemberX, y: input.baseWidthMm }),
    createFrameMember('wheel-cross-member', { x: wheelCrossMemberX, y: 0 }, { x: wheelCrossMemberX, y: input.baseWidthMm }),
    createFrameMember('front-cross-member', { x: frontCrossMemberX, y: 0 }, { x: frontCrossMemberX, y: input.baseWidthMm }),
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
