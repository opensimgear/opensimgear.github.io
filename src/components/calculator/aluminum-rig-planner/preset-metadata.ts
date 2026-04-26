import type { PlannerInput, PlannerPosturePreset } from './types';

export type SolvablePlannerPosturePreset = Exclude<PlannerPosturePreset, 'custom'>;
export type PlannerPosturePresetValues = Pick<
  PlannerInput,
  'seatAngleDeg' | 'backrestAngleDeg' | 'pedalAngleDeg' | 'wheelDiameterMm' | 'wheelAngleDeg'
> & {
  pedalHeightVsHipsMm: number;
};

export const PLANNER_POSTURE_PRESETS: Record<SolvablePlannerPosturePreset, PlannerPosturePresetValues> = {
  gt: {
    seatAngleDeg: 5,
    backrestAngleDeg: 105,
    pedalHeightVsHipsMm: -50,
    pedalAngleDeg: 60,
    wheelDiameterMm: 320,
    wheelAngleDeg: 10,
  },
  formula: {
    seatAngleDeg: 35,
    backrestAngleDeg: 105,
    pedalHeightVsHipsMm: 175,
    pedalAngleDeg: 58,
    wheelDiameterMm: 280,
    wheelAngleDeg: 0,
  },
  prototype: {
    seatAngleDeg: -10,
    backrestAngleDeg: 112.5,
    pedalHeightVsHipsMm: 100,
    pedalAngleDeg: 58,
    wheelDiameterMm: 285,
    wheelAngleDeg: 0,
  },
  rally: {
    seatAngleDeg: 2.5,
    backrestAngleDeg: 100,
    pedalHeightVsHipsMm: -100,
    pedalAngleDeg: 70,
    wheelDiameterMm: 330,
    wheelAngleDeg: 10,
  },
  drift: {
    seatAngleDeg: 2.5,
    backrestAngleDeg: 100,
    pedalHeightVsHipsMm: -75,
    pedalAngleDeg: 68,
    wheelDiameterMm: 330,
    wheelAngleDeg: 10,
  },
  road: {
    seatAngleDeg: 2.5,
    backrestAngleDeg: 105,
    pedalHeightVsHipsMm: -25,
    pedalAngleDeg: 55,
    wheelDiameterMm: 300,
    wheelAngleDeg: 10,
  },
  oval: {
    seatAngleDeg: 2.5,
    backrestAngleDeg: 105,
    pedalHeightVsHipsMm: -75,
    pedalAngleDeg: 58,
    wheelDiameterMm: 330,
    wheelAngleDeg: 10,
  },
  karting: {
    seatAngleDeg: -10,
    backrestAngleDeg: 110,
    pedalHeightVsHipsMm: 100,
    pedalAngleDeg: 58,
    wheelDiameterMm: 280,
    wheelAngleDeg: 0,
  },
};
