import { clampPlannerInput } from './geometry';
import type { PlannerInput } from './types';

export type PlannerQueryState = Partial<PlannerInput> & {};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readNumber(value: unknown, fallback: number) {
  return isFiniteNumber(value) ? value : fallback;
}

export function mergePlannerQueryState(defaultInput: PlannerInput, state: PlannerQueryState) {
  const plannerInput = clampPlannerInput({
    baseLengthMm: readNumber(state.baseLengthMm, defaultInput.baseLengthMm),
    baseWidthMm: readNumber(state.baseWidthMm, defaultInput.baseWidthMm),
    seatBaseDepthMm: readNumber(state.seatBaseDepthMm, defaultInput.seatBaseDepthMm),
    baseInnerBeamSpacingMm: readNumber(state.baseInnerBeamSpacingMm, defaultInput.baseInnerBeamSpacingMm),
    seatHeightFromBaseInnerBeamsMm: readNumber(
      state.seatHeightFromBaseInnerBeamsMm,
      defaultInput.seatHeightFromBaseInnerBeamsMm
    ),
    seatAngleDeg: readNumber(state.seatAngleDeg, defaultInput.seatAngleDeg),
    backrestAngleDeg: readNumber(state.backrestAngleDeg, defaultInput.backrestAngleDeg),
    pedalTrayDepthMm: readNumber(state.pedalTrayDepthMm, defaultInput.pedalTrayDepthMm),
    pedalTrayDistanceMm: readNumber(state.pedalTrayDistanceMm, defaultInput.pedalTrayDistanceMm),
    steeringColumnDistanceMm: readNumber(state.steeringColumnDistanceMm, defaultInput.steeringColumnDistanceMm),
    steeringColumnBaseHeightMm: readNumber(state.steeringColumnBaseHeightMm, defaultInput.steeringColumnBaseHeightMm),
    steeringColumnHeightMm: readNumber(state.steeringColumnHeightMm, defaultInput.steeringColumnHeightMm),
  });

  return {
    plannerInput,
  };
}
