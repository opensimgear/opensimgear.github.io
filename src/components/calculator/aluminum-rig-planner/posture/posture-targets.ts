import type {
  PlannerPosturePreset,
  PlannerPostureTargetKey,
  PlannerPostureTargetRange,
  PlannerPostureTargetRanges,
  PlannerPostureTargetRangesByPreset,
} from '../types';

export type {
  PlannerPostureTargetKey,
  PlannerPostureTargetRange,
  PlannerPostureTargetRanges,
  PlannerPostureTargetRangesByPreset,
};

export const PLANNER_POSTURE_TARGET_KEYS = [
  'wristBend',
  'elbowBend',
  'kneeBend',
  'torsoToThigh',
  'ankleBend',
  'footToToeBend',
  'brakeAlignment',
  'eyeToWheelTop',
  'eyeToMonitorMidpoint',
] as const satisfies PlannerPostureTargetKey[];

const CURRENT_PLANNER_POSTURE_TARGET_RANGES: PlannerPostureTargetRanges = {
  wristBend: { min: -10, max: 20 },
  elbowBend: { min: 100, max: 130 },
  kneeBend: { min: 110, max: 140 },
  torsoToThigh: { min: 80, max: 120 },
  ankleBend: { min: 75, max: 90 },
  footToToeBend: { min: 35, max: 65 },
  brakeAlignment: { min: -5, max: 5 },
  eyeToWheelTop: { min: 50, max: 100 },
  eyeToMonitorMidpoint: { min: -50, max: 50 },
};

const POSTURE_PRESETS = ['gt', 'rally', 'drift', 'road', 'custom'] as const satisfies PlannerPosturePreset[];

export function clonePlannerPostureTargetRanges(ranges: PlannerPostureTargetRanges): PlannerPostureTargetRanges {
  return Object.fromEntries(
    PLANNER_POSTURE_TARGET_KEYS.map((key) => [key, { ...ranges[key] }])
  ) as PlannerPostureTargetRanges;
}

export function clonePlannerPostureTargetRangesByPreset(
  rangesByPreset: PlannerPostureTargetRangesByPreset
): PlannerPostureTargetRangesByPreset {
  return Object.fromEntries(
    POSTURE_PRESETS.map((preset) => [preset, clonePlannerPostureTargetRanges(rangesByPreset[preset])])
  ) as PlannerPostureTargetRangesByPreset;
}

export function createDefaultPlannerPostureTargetRangesByPreset(): PlannerPostureTargetRangesByPreset {
  return Object.fromEntries(
    POSTURE_PRESETS.map((preset) => [preset, clonePlannerPostureTargetRanges(CURRENT_PLANNER_POSTURE_TARGET_RANGES)])
  ) as PlannerPostureTargetRangesByPreset;
}

export const PLANNER_POSTURE_TARGET_RANGES: PlannerPostureTargetRangesByPreset =
  createDefaultPlannerPostureTargetRangesByPreset();

export function getPlannerPostureTargetRanges(
  preset: PlannerPosturePreset,
  rangesByPreset: PlannerPostureTargetRangesByPreset = PLANNER_POSTURE_TARGET_RANGES
) {
  return rangesByPreset[preset];
}

export function getPlannerPostureTargetRangeControlLimits(preset: PlannerPosturePreset, key: PlannerPostureTargetKey) {
  const range = PLANNER_POSTURE_TARGET_RANGES[preset][key];
  const padding = (range.max - range.min) * 0.5;

  return {
    min: range.min - padding,
    max: range.max + padding,
  };
}
