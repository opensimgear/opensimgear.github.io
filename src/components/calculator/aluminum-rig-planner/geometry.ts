import type { PlannerInput } from './types';
import { PLANNER_DIMENSION_LIMITS, PLANNER_LAYOUT } from './constants';

export type PlannerGeometry = {
  input: PlannerInput;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getSteeringColumnDistanceMaxMm(input: Pick<PlannerInput, 'baseLengthMm' | 'seatBaseDepthMm'>) {
  return Math.max(
    PLANNER_LAYOUT.steeringColumnDistanceMinMm,
    input.baseLengthMm - input.seatBaseDepthMm - PLANNER_LAYOUT.steeringColumnDistanceFrontInsetMm
  );
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
    pedalTrayDepthMm: clamp(
      input.pedalTrayDepthMm,
      PLANNER_DIMENSION_LIMITS.pedalTrayDepthMinMm,
      PLANNER_DIMENSION_LIMITS.pedalTrayDepthMaxMm
    ),
    pedalTrayDistanceMm: clamp(
      input.pedalTrayDistanceMm,
      PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMinMm,
      PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMaxMm
    ),
    steeringColumnDistanceMm,
    steeringColumnBaseHeightMm: clamp(
      input.steeringColumnBaseHeightMm,
      PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMinMm,
      PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMaxMm
    ),
    steeringColumnHeightMm: clamp(
      input.steeringColumnHeightMm,
      PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm,
      PLANNER_DIMENSION_LIMITS.steeringColumnHeightMaxMm
    ),
  };
}

export function derivePlannerGeometry(rawInput: PlannerInput): PlannerGeometry {
  return {
    input: clampPlannerInput(rawInput),
  };
}
