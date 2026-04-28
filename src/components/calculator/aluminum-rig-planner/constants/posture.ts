import type {
  PlannerMonitorAspectRatio,
  PlannerMonitorCurvature,
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
  monitorSizeMaxIn: 100,
  monitorSizeStepIn: 1,
  monitorDistanceFromEyesMinMm: 250,
  monitorDistanceFromEyesMaxMm: 2000,
  monitorHeightFromBaseMinMm: 0,
  monitorHeightFromBaseMaxMm: 1600,
  monitorTiltMinDeg: -10,
  monitorTiltMaxDeg: 10,
  monitorTiltStepDeg: 1,
  monitorTargetFovMinDeg: 45,
  monitorTargetFovMaxDeg: 110,
  monitorTargetFovStepDeg: 1,
  monitorTripleScreenBezelMinMm: 0,
  monitorTripleScreenBezelMaxMm: 40,
  monitorTripleScreenBezelStepMm: 1,
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

export const MONITOR_CONTINUOUS_CURVE_CURVATURE_OPTIONS = [
  { text: 'Flat', value: 'disabled' },
  { text: '1500R', value: '1500r' },
  { text: '1000R', value: '1000r' },
  { text: '800R', value: '800r' },
] as const satisfies ReadonlyArray<{ text: string; value: PlannerMonitorCurvature }>;

export const MONITOR_CONTINUOUS_CURVE_FALLBACK_CURVATURE: PlannerMonitorCurvature = '1500r';

export function isMonitorContinuousCurveCurvature(curvature: PlannerMonitorCurvature) {
  return MONITOR_CONTINUOUS_CURVE_CURVATURE_OPTIONS.some((option) => option.value === curvature);
}

export const DEFAULT_ACTIVE_POSTURE_PRESET: PlannerPosturePreset = 'gt';
export const DEFAULT_MONITOR_SIZE_IN = 32;
export const DEFAULT_MONITOR_ASPECT_RATIO: PlannerMonitorAspectRatio = '16:10';
export const DEFAULT_MONITOR_CURVATURE: PlannerMonitorCurvature = 'disabled';
export const DEFAULT_MONITOR_TILT_DEG = 0;
export const DEFAULT_MONITOR_TARGET_FOV_DEG = 60;
export const DEFAULT_MONITOR_DISTANCE_FROM_EYES_MM = 900;
export const DEFAULT_MONITOR_HEIGHT_FROM_BASE_MM = 770;
export const DEFAULT_MONITOR_TRIPLE_SCREEN = false;
export const DEFAULT_MONITOR_TRIPLE_SCREEN_BEZEL_MM = 5;
export const DEFAULT_MONITOR_CONTINUOUS_CURVE = false;
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
  monitorTripleScreenBezelMm: DEFAULT_MONITOR_TRIPLE_SCREEN_BEZEL_MM,
  monitorContinuousCurve: DEFAULT_MONITOR_CONTINUOUS_CURVE,
};
