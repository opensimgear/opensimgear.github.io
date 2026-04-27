import type { PlannerPosturePreset } from './types';

export type PlannerPostureTargetRange = {
  min: number;
  max: number;
};

export const PLANNER_POSTURE_TARGET_RANGES: Record<PlannerPosturePreset, Record<string, PlannerPostureTargetRange>> = {
  gt: {
    wristBend: { min: 0, max: 40 },
    elbowBend: { min: 90, max: 120 },
    kneeBend: { min: 120, max: 135 },
    torsoToThigh: { min: 60, max: 120 },
    ankleBend: { min: 75, max: 86 },
    footToToeBend: { min: 35, max: 65 },
    brakeAlignment: { min: -3, max: 3 },
    eyeToWheelTop: { min: 50, max: 100 },
    eyeToMonitorMidpoint: { min: -50, max: 50 },
  },
  rally: {
    wristBend: { min: 0, max: 40 },
    elbowBend: { min: 95, max: 135 },
    kneeBend: { min: 110, max: 140 },
    torsoToThigh: { min: 60, max: 125 },
    ankleBend: { min: 40, max: 68 },
    footToToeBend: { min: 25, max: 75 },
    brakeAlignment: { min: -3, max: 3 },
    eyeToWheelTop: { min: 50, max: 150 },
    eyeToMonitorMidpoint: { min: -50, max: 50 },
  },
  drift: {
    wristBend: { min: 0, max: 40 },
    elbowBend: { min: 95, max: 135 },
    kneeBend: { min: 110, max: 140 },
    torsoToThigh: { min: 60, max: 125 },
    ankleBend: { min: 75, max: 81 },
    footToToeBend: { min: 25, max: 75 },
    brakeAlignment: { min: -3, max: 3 },
    eyeToWheelTop: { min: 50, max: 100 },
    eyeToMonitorMidpoint: { min: -50, max: 50 },
  },
  road: {
    wristBend: { min: 0, max: 40 },
    elbowBend: { min: 100, max: 135 },
    kneeBend: { min: 118, max: 142 },
    torsoToThigh: { min: 80, max: 130 },
    ankleBend: { min: 45, max: 71 },
    footToToeBend: { min: 20, max: 80 },
    brakeAlignment: { min: -3, max: 3 },
    eyeToWheelTop: { min: 50, max: 100 },
    eyeToMonitorMidpoint: { min: -50, max: 50 },
  },
  custom: {
    wristBend: { min: 0, max: 40 },
    elbowBend: { min: 90, max: 120 },
    kneeBend: { min: 120, max: 135 },
    torsoToThigh: { min: 85, max: 120 },
    ankleBend: { min: 75, max: 86 },
    footToToeBend: { min: 35, max: 65 },
    brakeAlignment: { min: -3, max: 3 },
    eyeToWheelTop: { min: 50, max: 100 },
    eyeToMonitorMidpoint: { min: -50, max: 50 },
  },
};

export function getPlannerPostureTargetRanges(preset: PlannerPosturePreset) {
  return PLANNER_POSTURE_TARGET_RANGES[preset];
}
