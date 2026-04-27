import type { PlannerPosturePreset } from './types';

export type PlannerPostureTargetRange = {
  min: number;
  max: number;
};

const SHARED_PLANNER_POSTURE_TARGET_RANGES: Record<string, PlannerPostureTargetRange> = {
  wristBend: { min: -10, max: 20 },
  elbowBend: { min: 100, max: 130 },
  kneeBend: { min: 110, max: 140 },
  torsoToThigh: { min: 90, max: 120 },
  ankleBend: { min: 90, max: 115 },
  footToToeBend: { min: 35, max: 65 },
  brakeAlignment: { min: -5, max: 5 },
  eyeToWheelTop: { min: 50, max: 100 },
  eyeToMonitorMidpoint: { min: -50, max: 50 },
};

export const PLANNER_POSTURE_TARGET_RANGES: Record<PlannerPosturePreset, Record<string, PlannerPostureTargetRange>> = {
  gt: SHARED_PLANNER_POSTURE_TARGET_RANGES,
  rally: SHARED_PLANNER_POSTURE_TARGET_RANGES,
  drift: SHARED_PLANNER_POSTURE_TARGET_RANGES,
  road: SHARED_PLANNER_POSTURE_TARGET_RANGES,
  custom: SHARED_PLANNER_POSTURE_TARGET_RANGES,
};

export function getPlannerPostureTargetRanges(preset: PlannerPosturePreset) {
  return PLANNER_POSTURE_TARGET_RANGES[preset];
}
