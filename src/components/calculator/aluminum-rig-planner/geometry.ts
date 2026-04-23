import type { PlannerInput } from './types';
import { PLANNER_DIMENSION_LIMITS, PLANNER_LAYOUT } from './constants';

export type PlannerGeometry = {
  input: PlannerInput;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getSteeringColumnBaseHeightMaxMm(columnHeightMm: number) {
  return Math.max(
    PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMinMm,
    Math.min(
      PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMaxMm,
      columnHeightMm - PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm
    )
  );
}

export function getSteeringColumnDistanceMaxMm(input: Pick<PlannerInput, 'baseLengthMm' | 'seatBaseDepthMm'>) {
  return Math.max(
    PLANNER_LAYOUT.steeringColumnDistanceMinMm,
    input.baseLengthMm - input.seatBaseDepthMm - PLANNER_LAYOUT.steeringColumnDistanceFrontInsetMm
  );
}

export function getPedalTrayDistanceMaxMm(
  input: Pick<PlannerInput, 'baseLengthMm' | 'seatBaseDepthMm' | 'pedalTrayDepthMm'>
) {
  return Math.max(0, input.baseLengthMm - input.seatBaseDepthMm - input.pedalTrayDepthMm / 2);
}

export function getPedalTrayDistanceMinMm(
  input: Pick<PlannerInput, 'baseLengthMm' | 'seatBaseDepthMm' | 'pedalTrayDepthMm'>
) {
  return getPedalTrayDistanceMaxMm(input) < PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMinMm
    ? 0
    : PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMinMm;
}

export function clampPlannerInput(input: PlannerInput): PlannerInput {
  const baseLengthMm = clamp(
    input.baseLengthMm,
    PLANNER_DIMENSION_LIMITS.baseLengthMinMm,
    PLANNER_DIMENSION_LIMITS.baseLengthMaxMm
  );
  const baseWidthMm = clamp(
    input.baseWidthMm,
    PLANNER_DIMENSION_LIMITS.baseWidthMinMm,
    PLANNER_DIMENSION_LIMITS.baseWidthMaxMm
  );
  const seatBaseDepthMm = clamp(
    input.seatBaseDepthMm,
    PLANNER_DIMENSION_LIMITS.seatBaseDepthMinMm,
    Math.min(PLANNER_DIMENSION_LIMITS.seatBaseDepthMaxMm, baseLengthMm)
  );
  const steeringColumnDistanceMm = clamp(
    input.steeringColumnDistanceMm,
    PLANNER_LAYOUT.steeringColumnDistanceMinMm,
    getSteeringColumnDistanceMaxMm({
      baseLengthMm,
      seatBaseDepthMm,
    })
  );
  const pedalTrayDepthMm = clamp(
    input.pedalTrayDepthMm,
    PLANNER_DIMENSION_LIMITS.pedalTrayDepthMinMm,
    PLANNER_DIMENSION_LIMITS.pedalTrayDepthMaxMm
  );
  const pedalTrayDistanceMm = clamp(
    input.pedalTrayDistanceMm,
    getPedalTrayDistanceMinMm({
      baseLengthMm,
      seatBaseDepthMm,
      pedalTrayDepthMm,
    }),
    getPedalTrayDistanceMaxMm({
      baseLengthMm,
      seatBaseDepthMm,
      pedalTrayDepthMm,
    })
  );
  const steeringColumnHeightMm = clamp(
    input.steeringColumnHeightMm,
    PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm,
    PLANNER_DIMENSION_LIMITS.steeringColumnHeightMaxMm
  );
  const steeringColumnBaseHeightMm = clamp(
    input.steeringColumnBaseHeightMm,
    PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMinMm,
    getSteeringColumnBaseHeightMaxMm(steeringColumnHeightMm)
  );

  return {
    ...input,
    baseLengthMm,
    baseWidthMm,
    seatBaseDepthMm,
    baseInnerBeamSpacingMm: clamp(
      input.baseInnerBeamSpacingMm,
      PLANNER_DIMENSION_LIMITS.baseInnerBeamSpacingMinMm,
      PLANNER_DIMENSION_LIMITS.baseInnerBeamSpacingMaxMm
    ),
    seatLengthMm: clamp(
      input.seatLengthMm,
      PLANNER_DIMENSION_LIMITS.seatLengthMinMm,
      PLANNER_DIMENSION_LIMITS.seatLengthMaxMm
    ),
    seatDeltaMm: clamp(
      input.seatDeltaMm,
      PLANNER_DIMENSION_LIMITS.seatDeltaMinMm,
      PLANNER_DIMENSION_LIMITS.seatDeltaMaxMm
    ),
    seatHeightFromBaseInnerBeamsMm: clamp(
      input.seatHeightFromBaseInnerBeamsMm,
      PLANNER_DIMENSION_LIMITS.seatHeightFromBaseInnerBeamsMinMm,
      PLANNER_DIMENSION_LIMITS.seatHeightFromBaseInnerBeamsMaxMm
    ),
    seatAngleDeg: clamp(
      input.seatAngleDeg,
      PLANNER_DIMENSION_LIMITS.seatAngleDegMin,
      PLANNER_DIMENSION_LIMITS.seatAngleDegMax
    ),
    backrestAngleDeg: clamp(
      input.backrestAngleDeg,
      PLANNER_DIMENSION_LIMITS.backrestAngleDegMin,
      PLANNER_DIMENSION_LIMITS.backrestAngleDegMax
    ),
    pedalTrayDepthMm,
    pedalTrayDistanceMm,
    steeringColumnDistanceMm,
    steeringColumnBaseHeightMm,
    steeringColumnHeightMm,
  };
}

export function derivePlannerGeometry(rawInput: PlannerInput): PlannerGeometry {
  return {
    input: clampPlannerInput(rawInput),
  };
}
