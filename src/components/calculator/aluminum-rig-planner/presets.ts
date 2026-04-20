import type { PlannerInput, PlannerPreset, PlannerProfile, RigPresetType } from './types';
import {
  DRIVER_DIMENSION_BASELINES,
  FORMULA_PRESET_VALUES,
  GT_PRESET_VALUES,
  PRESET_FIT_ADJUSTMENTS,
} from './constants';

export const GT_PRESET: PlannerPreset = GT_PRESET_VALUES;

export const FORMULA_PRESET: PlannerPreset = FORMULA_PRESET_VALUES;

const PRESET_LABELS: Record<RigPresetType, string> = {
  gt: 'GT',
  formula: 'Formula',
};

const PRESETS: Record<RigPresetType, PlannerPreset> = {
  gt: GT_PRESET,
  formula: FORMULA_PRESET,
};

export function getPresetLabel(presetType: RigPresetType): string {
  return PRESET_LABELS[presetType];
}

export function createInitialPlannerInput(profile: PlannerProfile): PlannerInput {
  const presetType = profile.presetType ?? 'formula';
  const preset = PRESETS[presetType];
  const heightOffsetMm = profile.driverHeightMm - DRIVER_DIMENSION_BASELINES.heightMm;
  const inseamOffsetMm = profile.inseamMm - DRIVER_DIMENSION_BASELINES.inseamMm;
  const comfortSeatDeltaDeg =
    profile.seatingBias === 'comfort' ? PRESET_FIT_ADJUSTMENTS.comfortSeatBackDeltaDeg : 0;
  const comfortWheelDeltaMm =
    profile.seatingBias === 'comfort' ? PRESET_FIT_ADJUSTMENTS.comfortWheelDeltaMm : 0;

  return {
    ...profile,
    presetType,
    wheelMountType: preset.wheelMountType,
    baseLengthMm: preset.baseLengthMm + Math.round(inseamOffsetMm * PRESET_FIT_ADJUSTMENTS.baseLengthPerInseamRatio),
    baseWidthMm: preset.baseWidthMm,
    seatBaseDepthMm: preset.seatBaseDepthMm,
    baseInnerBeamSpacingMm: preset.baseInnerBeamSpacingMm,
    pedalTrayDepthMm: preset.pedalTrayDepthMm,
    pedalTrayDistanceMm: preset.pedalTrayDistanceMm,
    steeringColumnBaseHeightMm: preset.steeringColumnBaseHeightMm,
    steeringColumnHeightMm: preset.steeringColumnHeightMm,
    baseHeightMm: preset.baseHeightMm,
    seatXMm: preset.seatXMm,
    seatYMm: preset.seatYMm + Math.round(heightOffsetMm * PRESET_FIT_ADJUSTMENTS.seatHeightPerDriverHeightRatio),
    seatBackAngleDeg: preset.seatBackAngleDeg + comfortSeatDeltaDeg,
    pedalXMm: preset.pedalXMm + Math.round(inseamOffsetMm * PRESET_FIT_ADJUSTMENTS.pedalReachPerInseamRatio),
    pedalYMm: preset.pedalYMm + Math.round(heightOffsetMm * PRESET_FIT_ADJUSTMENTS.pedalHeightPerDriverHeightRatio),
    pedalAngleDeg: preset.pedalAngleDeg,
    wheelXMm: preset.wheelXMm + Math.round(inseamOffsetMm * PRESET_FIT_ADJUSTMENTS.wheelReachPerInseamRatio) + comfortWheelDeltaMm,
    wheelYMm: preset.wheelYMm + Math.round(heightOffsetMm * PRESET_FIT_ADJUSTMENTS.wheelHeightPerDriverHeightRatio),
    wheelTiltDeg: preset.wheelTiltDeg,
  };
}
