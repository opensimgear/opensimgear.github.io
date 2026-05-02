import type {
  PlannerMonitorAspectRatio,
  PlannerMonitorCurvature,
  PlannerMonitorStandFeetType,
  PlannerMonitorStandVariant,
  PlannerMonitorVesaType,
  PlannerPosturePreset,
  PlannerPostureSettings,
} from '../types';
import { createDefaultPlannerPostureTargetRangesByPreset } from '../posture/posture-targets';

export const DEFAULT_POSTURE_HEIGHT_CM = 169;

export const PLANNER_POSTURE_LIMITS = {
  heightMinCm: 100,
  heightMaxCm: 220,
  ratioMin: 0.05,
  ratioMax: 0.7,
  ratioStep: 0.001,
  lengthStepMm: 1,
  monitorSizeMinIn: 24,
  monitorSizeMaxIn: 75,
  monitorSizeStepIn: 1,
  monitorDistanceFromEyesMinMm: 250,
  monitorDistanceFromEyesMaxMm: 2000,
  monitorHeightFromBaseMinMm: 0,
  monitorHeightFromBaseMaxMm: 1600,
  monitorTiltMinDeg: -10,
  monitorTiltMaxDeg: 10,
  monitorTiltStepDeg: 1,
  monitorTargetFovMinDeg: 45,
  monitorTargetFovMaxDeg: 75,
  monitorTargetFovStepDeg: 0.1,
  monitorBottomVesaHoleDistanceMinMm: 0,
  monitorBottomVesaHoleDistanceMaxMm: 500,
  monitorBottomVesaHolesToCrossBeamTopMinMm: -100,
  monitorBottomVesaHolesToCrossBeamTopMaxMm: 200,
  monitorStandLegExtraMarginMinMm: 40,
  monitorStandLegExtraMarginMaxMm: 300,
  monitorStandFootLengthMinMm: 0,
  monitorStandFootLengthMaxMm: 2000,
  monitorStandFeetHeightMinMm: 10,
  monitorStandFeetHeightMaxMm: 40,
  monitorStandIntegratedPlateLengthMinMm: 120,
  monitorStandIntegratedPlateLengthMaxMm: 400,
} as const;

export const POSTURE_PRESET_OPTIONS = [
  { text: 'GT / GT3 / Touring', value: 'gt' },
  { text: 'Rally', value: 'rally' },
  { text: 'Drift', value: 'drift' },
  { text: 'Sports car / road', value: 'road' },
  { text: 'Custom', value: 'custom' },
] as const;

export const MONITOR_ASPECT_RATIO_OPTIONS = [
  { text: '16:10', value: '16:10' },
  { text: '16:9', value: '16:9' },
  { text: '21:9', value: '21:9' },
  { text: '32:9', value: '32:9' },
  { text: '3:2', value: '3:2' },
  { text: '4:3', value: '4:3' },
  { text: '5:4', value: '5:4' },
] as const satisfies ReadonlyArray<{ text: string; value: PlannerMonitorAspectRatio }>;

export const MONITOR_CURVATURE_OPTIONS = [
  { text: 'Flat', value: 'disabled' },
  { text: '5000R', value: '5000r' },
  { text: '4000R', value: '4000r' },
  { text: '3000R', value: '3000r' },
  { text: '2500R', value: '2500r' },
  { text: '2300R', value: '2300r' },
  { text: '1800R', value: '1800r' },
  { text: '1500R', value: '1500r' },
  { text: '1000R', value: '1000r' },
  { text: '800R', value: '800r' },
] as const satisfies ReadonlyArray<{ text: string; value: PlannerMonitorCurvature }>;

export const MONITOR_ARC_CENTER_AT_EYES_CURVATURE_OPTIONS = [
  { text: 'Flat', value: 'disabled' },
  { text: '1500R', value: '1500r' },
  { text: '1000R', value: '1000r' },
  { text: '800R', value: '800r' },
] as const satisfies ReadonlyArray<{ text: string; value: PlannerMonitorCurvature }>;

export const MONITOR_ARC_CENTER_AT_EYES_FALLBACK_CURVATURE: PlannerMonitorCurvature = '1500r';

export const MONITOR_VESA_OPTIONS = [
  { text: '75 x 75', value: '75x75' },
  { text: '100 x 100', value: '100x100' },
  { text: '200 x 100', value: '200x100' },
  { text: '200 x 200', value: '200x200' },
  { text: '300 x 200', value: '300x200' },
  { text: '400 x 200', value: '400x200' },
  { text: '400 x 400', value: '400x400' },
] as const satisfies ReadonlyArray<{ text: string; value: PlannerMonitorVesaType }>;

export const MONITOR_STAND_FEET_TYPE_OPTIONS = [
  { text: 'None', value: 'none' },
  { text: 'Rubber', value: 'rubber' },
] as const satisfies ReadonlyArray<{ text: string; value: PlannerMonitorStandFeetType }>;

export const MONITOR_STAND_VARIANT_OPTIONS = [
  { text: 'Freestand', value: 'freestand' },
  { text: 'Integrated', value: 'integrated' },
] as const satisfies ReadonlyArray<{ text: string; value: PlannerMonitorStandVariant }>;

export function isMonitorArcCenterAtEyesCurvature(curvature: PlannerMonitorCurvature) {
  return MONITOR_ARC_CENTER_AT_EYES_CURVATURE_OPTIONS.some((option) => option.value === curvature);
}

export const DEFAULT_ACTIVE_POSTURE_PRESET: PlannerPosturePreset = 'gt';
export const DEFAULT_MONITOR_SIZE_IN = 32;
export const DEFAULT_MONITOR_ASPECT_RATIO: PlannerMonitorAspectRatio = '16:10';
export const DEFAULT_MONITOR_CURVATURE: PlannerMonitorCurvature = 'disabled';
export const DEFAULT_MONITOR_TILT_DEG = 0;
export const DEFAULT_MONITOR_TARGET_FOV_DEG = 60;
export const DEFAULT_MONITOR_DISTANCE_FROM_EYES_MM = 900;
export const DEFAULT_MONITOR_HEIGHT_FROM_BASE_MM = 950;
export const DEFAULT_MONITOR_TRIPLE_SCREEN = false;
export const DEFAULT_MONITOR_ARC_CENTER_AT_EYES = false;
export const DEFAULT_MONITOR_VESA_TYPE: PlannerMonitorVesaType = '100x100';
export const DEFAULT_MONITOR_STAND_VARIANT: PlannerMonitorStandVariant = 'freestand';
export const DEFAULT_MONITOR_BOTTOM_VESA_HOLE_DISTANCE_MM = 86;
export const DEFAULT_MONITOR_BOTTOM_VESA_HOLES_TO_CROSS_BEAM_TOP_MM = 100;
export const DEFAULT_MONITOR_STAND_LEG_EXTRA_MARGIN_MM = 80;
export const DEFAULT_MONITOR_STAND_FOOT_LENGTH_MM = 500;
export const DEFAULT_MONITOR_STAND_INTEGRATED_PLATE_LENGTH_MM = 250;
export const DEFAULT_MONITOR_STAND_FEET_TYPE: PlannerMonitorStandFeetType = 'rubber';
export const DEFAULT_MONITOR_STAND_RUBBER_FEET_HEIGHT_MM = 20;
export const DEFAULT_MONITOR_STAND_FEET_HEIGHT_MM = DEFAULT_MONITOR_STAND_RUBBER_FEET_HEIGHT_MM;
export const LEGACY_DEFAULT_MONITOR_MIDPOINT_X_MM = 1200;

export const DEFAULT_PLANNER_POSTURE_SETTINGS: PlannerPostureSettings = {
  preset: DEFAULT_ACTIVE_POSTURE_PRESET,
  advanced: false,
  heightCm: DEFAULT_POSTURE_HEIGHT_CM,
  showModel: true,
  showSkeleton: false,
  targetRangesByPreset: createDefaultPlannerPostureTargetRangesByPreset(),
  monitorSizeIn: DEFAULT_MONITOR_SIZE_IN,
  monitorAspectRatio: DEFAULT_MONITOR_ASPECT_RATIO,
  monitorCurvature: DEFAULT_MONITOR_CURVATURE,
  monitorTiltDeg: DEFAULT_MONITOR_TILT_DEG,
  monitorTargetFovDeg: DEFAULT_MONITOR_TARGET_FOV_DEG,
  monitorDistanceFromEyesMm: DEFAULT_MONITOR_DISTANCE_FROM_EYES_MM,
  monitorHeightFromBaseMm: DEFAULT_MONITOR_HEIGHT_FROM_BASE_MM,
  monitorTripleScreen: DEFAULT_MONITOR_TRIPLE_SCREEN,
  monitorArcCenterAtEyes: DEFAULT_MONITOR_ARC_CENTER_AT_EYES,
  monitorVesaType: DEFAULT_MONITOR_VESA_TYPE,
  monitorStandVariant: DEFAULT_MONITOR_STAND_VARIANT,
  monitorStandIntegratedPlateLengthMm: DEFAULT_MONITOR_STAND_INTEGRATED_PLATE_LENGTH_MM,
  monitorBottomVesaHoleDistanceMm: DEFAULT_MONITOR_BOTTOM_VESA_HOLE_DISTANCE_MM,
  monitorBottomVesaHolesToCrossBeamTopMm: DEFAULT_MONITOR_BOTTOM_VESA_HOLES_TO_CROSS_BEAM_TOP_MM,
  monitorStandLegExtraMarginMm: DEFAULT_MONITOR_STAND_LEG_EXTRA_MARGIN_MM,
  monitorStandFootLengthMm: DEFAULT_MONITOR_STAND_FOOT_LENGTH_MM,
  monitorStandFeetType: DEFAULT_MONITOR_STAND_FEET_TYPE,
  monitorStandFeetHeightMm: DEFAULT_MONITOR_STAND_FEET_HEIGHT_MM,
};
