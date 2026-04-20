import type { PlannerInput, PlannerPreset, PlannerProfile, RigPresetType } from './types';

export const GT_PRESET: PlannerPreset = {
  presetType: 'gt',
  wheelMountType: 'deck',
  baseLengthMm: 1400,
  seatBaseDepthMm: 360,
  baseInnerBeamSpacingMm: 280,
  pedalTrayDepthMm: 320,
  pedalTrayDistanceMm: 550,
  steeringColumnBaseHeightMm: 260,
  steeringColumnHeightMm: 620,
  baseHeightMm: 40,
  seatXMm: 320,
  seatYMm: 230,
  seatBackAngleDeg: 24,
  pedalXMm: 980,
  pedalYMm: 120,
  pedalAngleDeg: 12,
  wheelXMm: 630,
  wheelYMm: 620,
  wheelTiltDeg: 18,
};

export const FORMULA_PRESET: PlannerPreset = {
  presetType: 'formula',
  wheelMountType: 'front',
  baseLengthMm: 1500,
  seatBaseDepthMm: 340,
  baseInnerBeamSpacingMm: 280,
  pedalTrayDepthMm: 320,
  pedalTrayDistanceMm: 550,
  steeringColumnBaseHeightMm: 240,
  steeringColumnHeightMm: 560,
  baseHeightMm: 40,
  seatXMm: 300,
  seatYMm: 120,
  seatBackAngleDeg: 16,
  pedalXMm: 1080,
  pedalYMm: 260,
  pedalAngleDeg: 22,
  wheelXMm: 680,
  wheelYMm: 540,
  wheelTiltDeg: 8,
};

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
  const heightOffsetMm = profile.driverHeightMm - 1750;
  const inseamOffsetMm = profile.inseamMm - 820;
  const comfortSeatDeltaDeg = profile.seatingBias === 'comfort' ? 2 : 0;
  const comfortWheelDeltaMm = profile.seatingBias === 'comfort' ? -15 : 0;

  return {
    ...profile,
    presetType,
    wheelMountType: preset.wheelMountType,
    baseLengthMm: preset.baseLengthMm + Math.round(inseamOffsetMm * 0.35),
    seatBaseDepthMm: preset.seatBaseDepthMm,
    baseInnerBeamSpacingMm: preset.baseInnerBeamSpacingMm,
    pedalTrayDepthMm: preset.pedalTrayDepthMm,
    pedalTrayDistanceMm: preset.pedalTrayDistanceMm,
    steeringColumnBaseHeightMm: preset.steeringColumnBaseHeightMm,
    steeringColumnHeightMm: preset.steeringColumnHeightMm,
    baseHeightMm: preset.baseHeightMm,
    seatXMm: preset.seatXMm,
    seatYMm: preset.seatYMm + Math.round(heightOffsetMm * 0.08),
    seatBackAngleDeg: preset.seatBackAngleDeg + comfortSeatDeltaDeg,
    pedalXMm: preset.pedalXMm + Math.round(inseamOffsetMm * 0.45),
    pedalYMm: preset.pedalYMm + Math.round(heightOffsetMm * 0.04),
    pedalAngleDeg: preset.pedalAngleDeg,
    wheelXMm: preset.wheelXMm + Math.round(inseamOffsetMm * 0.3) + comfortWheelDeltaMm,
    wheelYMm: preset.wheelYMm + Math.round(heightOffsetMm * 0.06),
    wheelTiltDeg: preset.wheelTiltDeg,
  };
}
