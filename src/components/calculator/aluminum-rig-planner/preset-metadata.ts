import type { PlannerInput, PlannerPosturePreset } from './types';

export type SolvablePlannerPosturePreset = Exclude<PlannerPosturePreset, 'custom'>;
export type PlannerPosturePresetValues = Pick<
  PlannerInput,
  | 'seatHeightFromBaseInnerBeamsMm'
  | 'seatAngleDeg'
  | 'backrestAngleDeg'
  | 'pedalAngleDeg'
  | 'wheelDiameterMm'
  | 'wheelAngleDeg'
> & {
  pedalHeightVsHipsMm: number;
};

export const PLANNER_POSTURE_PRESETS: Record<SolvablePlannerPosturePreset, PlannerPosturePresetValues> = {
  gt: {
    seatHeightFromBaseInnerBeamsMm: 100,
    seatAngleDeg: 5,
    backrestAngleDeg: 105,
    pedalHeightVsHipsMm: -50,
    pedalAngleDeg: 60,
    wheelDiameterMm: 320,
    wheelAngleDeg: 10,
  },
  rally: {
    seatHeightFromBaseInnerBeamsMm: 140,
    seatAngleDeg: 2.5,
    backrestAngleDeg: 100,
    pedalHeightVsHipsMm: -300,
    pedalAngleDeg: 70,
    wheelDiameterMm: 330,
    wheelAngleDeg: 10,
  },
  drift: {
    seatHeightFromBaseInnerBeamsMm: 120,
    seatAngleDeg: 2.5,
    backrestAngleDeg: 100,
    pedalHeightVsHipsMm: -75,
    pedalAngleDeg: 68,
    wheelDiameterMm: 330,
    wheelAngleDeg: 10,
  },
  road: {
    seatHeightFromBaseInnerBeamsMm: 100,
    seatAngleDeg: 2.5,
    backrestAngleDeg: 105,
    pedalHeightVsHipsMm: -25,
    pedalAngleDeg: 55,
    wheelDiameterMm: 300,
    wheelAngleDeg: 10,
  },
};
