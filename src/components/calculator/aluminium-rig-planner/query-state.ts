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
    driverHeightMm: readNumber(state.driverHeightMm, defaultInput.driverHeightMm),
    inseamMm: readNumber(state.inseamMm, defaultInput.inseamMm),
    seatingBias:
      state.seatingBias === 'comfort' || state.seatingBias === 'performance'
        ? state.seatingBias
        : defaultInput.seatingBias,
    presetType:
      state.presetType === 'formula' || state.presetType === 'gt' ? state.presetType : defaultInput.presetType,
    wheelMountType:
      state.wheelMountType === 'front' || state.wheelMountType === 'bottom' || state.wheelMountType === 'deck'
        ? state.wheelMountType
        : defaultInput.wheelMountType,
    baseLengthMm: readNumber(state.baseLengthMm, defaultInput.baseLengthMm),
    baseHeightMm: readNumber(state.baseHeightMm, defaultInput.baseHeightMm),
    seatXMm: readNumber(state.seatXMm, defaultInput.seatXMm),
    seatYMm: readNumber(state.seatYMm, defaultInput.seatYMm),
    seatBackAngleDeg: readNumber(state.seatBackAngleDeg, defaultInput.seatBackAngleDeg),
    pedalXMm: readNumber(state.pedalXMm, defaultInput.pedalXMm),
    pedalYMm: readNumber(state.pedalYMm, defaultInput.pedalYMm),
    pedalAngleDeg: readNumber(state.pedalAngleDeg, defaultInput.pedalAngleDeg),
    wheelXMm: readNumber(state.wheelXMm, defaultInput.wheelXMm),
    wheelYMm: readNumber(state.wheelYMm, defaultInput.wheelYMm),
    wheelTiltDeg: readNumber(state.wheelTiltDeg, defaultInput.wheelTiltDeg),
  });

  return {
    plannerInput,
  };
}
