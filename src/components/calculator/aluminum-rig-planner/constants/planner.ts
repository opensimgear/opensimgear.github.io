import type { PlannerInput } from '../types';
import { HALF_PROFILE_SHORT_MM, PROFILE_SHORT_MM, PROFILE_TALL_MM } from './profile';

export const PLANNER_CONTROL_STEP_MM = 10;
export const URL_STATE_DEBOUNCE_MS = 300;

export const DEFAULT_PLANNER_INPUT: PlannerInput = {
  baseLengthMm: 1350,
  baseWidthMm: 580,
  seatBaseDepthMm: 400,
  baseInnerBeamSpacingMm: 420,
  seatLengthMm: 440,
  seatDeltaMm: 100,
  seatHeightFromBaseInnerBeamsMm: 100,
  seatAngleDeg: 5,
  backrestAngleDeg: 95,
  pedalTrayDepthMm: 300,
  pedalTrayDistanceMm: 430,
  pedalsHeightMm: 100,
  pedalsDeltaMm: 140,
  pedalAngleDeg: 80,
  pedalLengthMm: 250,
  pedalAcceleratorDeltaMm: 100,
  pedalBrakeDeltaMm: 90,
  pedalClutchDeltaMm: 70,
  steeringColumnDistanceMm: 400,
  steeringColumnBaseHeightMm: 430,
  steeringColumnHeightMm: 510,
  wheelHeightOffsetMm: 180,
  wheelAngleDeg: 14,
  wheelDistanceFromSteeringColumnMm: -250,
  wheelDiameterMm: 320,
};

export const PLANNER_DIMENSION_LIMITS = {
  baseLengthMinMm: 600,
  baseLengthMaxMm: 1400,
  baseWidthMinMm: 400,
  baseWidthMaxMm: 700,
  seatBaseDepthMinMm: 240,
  seatBaseDepthMaxMm: 600,
  baseInnerBeamSpacingMinMm: 120,
  baseInnerBeamSpacingMaxMm: 460,
  seatLengthMinMm: 350,
  seatLengthMaxMm: 500,
  seatDeltaMinMm: -100,
  seatDeltaMaxMm: 100,
  seatHeightFromBaseInnerBeamsMinMm: 0,
  seatHeightFromBaseInnerBeamsMaxMm: 300,
  seatAngleDegMin: -5,
  seatAngleDegMax: 45,
  backrestAngleDegMin: 95,
  backrestAngleDegMax: 135,
  pedalTrayDepthMinMm: 300,
  pedalTrayDepthMaxMm: 500,
  pedalTrayDistanceMinMm: 0,
  pedalTrayDistanceMaxMm: 700,
  pedalsHeightMinMm: 0,
  pedalsHeightMaxMm: 400,
  pedalsDeltaMinMm: 0,
  pedalsDeltaMaxMm: 200,
  pedalAngleDegMin: 30,
  pedalAngleDegMax: 90,
  pedalLengthMinMm: 180,
  pedalLengthMaxMm: 300,
  steeringColumnBaseHeightMinMm: 300,
  steeringColumnBaseHeightMaxMm: 700,
  steeringColumnHeightMinMm: 380,
  steeringColumnHeightMaxMm: 800,
  wheelHeightOffsetMinMm: 0,
  wheelHeightOffsetMaxMm: 200,
  wheelAngleDegMin: 0,
  wheelAngleDegMax: 30,
  wheelDistanceFromSteeringColumnMinMm: -320,
  wheelDistanceFromSteeringColumnMaxMm: -110,
  wheelDiameterMinMm: 250,
  wheelDiameterMaxMm: 350,
} as const;

export const PLANNER_LAYOUT = {
  frontCrossMemberInsetMm: PROFILE_TALL_MM,
  steeringColumnClearanceAboveBaseMm: PROFILE_TALL_MM,
  steeringColumnDistanceMinMm: PROFILE_TALL_MM,
  steeringColumnDistanceFrontInsetMm: 160,
} as const;

export const BASE_MODULE_LAYOUT = {
  railCenterOffsetMm: HALF_PROFILE_SHORT_MM,
  rearCrossMemberCenterXMm: HALF_PROFILE_SHORT_MM,
  seatCrossMemberEndInsetMm: HALF_PROFILE_SHORT_MM,
} as const;

export const PEDAL_TRAY_LAYOUT = {
  sideBeamCenterOffsetMm: 60,
  rearCrossMemberCenterInsetMm: HALF_PROFILE_SHORT_MM,
  crossBeamInsetTotalMm: PROFILE_SHORT_MM,
  sideBeamInnerSpanReductionMm: (60 + HALF_PROFILE_SHORT_MM) * 2,
} as const;
