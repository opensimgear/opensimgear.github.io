/**
 * Planner dimension defaults, limits, and structural layout constants.
 */

import type { PlannerInput } from '../types';
import { HALF_PROFILE_SHORT_MM, PROFILE_SHORT_MM, PROFILE_TALL_MM } from './profile';

/** Step size for planner dimension sliders (mm). */
export const PLANNER_CONTROL_STEP_MM = 10;
/** Debounce delay before syncing planner state to URL (ms). */
export const URL_STATE_DEBOUNCE_MS = 300;

/** Default planner input values representing a typical GT rig. */
export const DEFAULT_PLANNER_INPUT: PlannerInput = {
  baseLengthMm: 1350,
  baseWidthMm: 580,
  baseFeetHeightMm: 0,
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

/** Hard min/max limits for every planner dimension slider. */
export const PLANNER_DIMENSION_LIMITS = {
  baseLengthMinMm: 600,
  baseLengthMaxMm: 1400,
  baseWidthMinMm: 400,
  baseWidthMaxMm: 700,
  baseFeetHeightMinMm: 0,
  baseFeetHeightMaxMm: 120,
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

/** Derived layout constants for the overall rig frame. */
export const PLANNER_LAYOUT = {
  /** Inset from base front for the front cross member (mm). */
  frontCrossMemberInsetMm: PROFILE_TALL_MM,
  /** Minimum clearance above the base for the steering column crossbeam (mm). */
  steeringColumnClearanceAboveBaseMm: PROFILE_TALL_MM,
  /** Minimum steering column distance from seat base (mm). */
  steeringColumnDistanceMinMm: PROFILE_TALL_MM,
  /** Front inset distance for the steering column limit (mm). */
  steeringColumnDistanceFrontInsetMm: 160,
} as const;

/** Layout offsets for the base module beams. */
export const BASE_MODULE_LAYOUT = {
  /** Center offset of each base rail from the outer edge (mm). */
  railCenterOffsetMm: HALF_PROFILE_SHORT_MM,
  /** X position of the rear cross member center (mm). */
  rearCrossMemberCenterXMm: HALF_PROFILE_SHORT_MM,
  /** Inset from each end for the seat cross member (mm). */
  seatCrossMemberEndInsetMm: HALF_PROFILE_SHORT_MM,
} as const;

/** Layout constants for the pedal tray sub-frame. */
export const PEDAL_TRAY_LAYOUT = {
  /** Side beam center offset from the outer edge (mm). */
  sideBeamCenterOffsetMm: 60,
  /** Rear cross member inset from tray edges (mm). */
  rearCrossMemberCenterInsetMm: HALF_PROFILE_SHORT_MM,
  /** Total inset of cross beams from the tray depth (mm). */
  crossBeamInsetTotalMm: PROFILE_SHORT_MM,
  /** Total reduction of usable inner span of the tray (mm). */
  sideBeamInnerSpanReductionMm: (60 + HALF_PROFILE_SHORT_MM) * 2,
} as const;
