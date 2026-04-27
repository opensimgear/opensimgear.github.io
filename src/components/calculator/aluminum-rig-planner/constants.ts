import type {
  CutListProfileType,
  PlannerInput,
  PlannerMonitorAspectRatio,
  PlannerMonitorCurvature,
  PlannerOptimizationSettings,
  PlannerPostureSettings,
  PlannerPosturePreset,
  PlannerProfileShipping,
} from './types';
import { createDefaultPlannerPostureTargetRangesByPreset } from './posture-targets';

export const MM_TO_METERS = 0.001;
export const PROFILE_SHORT_MM = 40;
export const PROFILE_TALL_MM = 80;
export const HALF_PROFILE_SHORT_MM = PROFILE_SHORT_MM / 2;
export const PROFILE_SHORT_METERS = PROFILE_SHORT_MM * MM_TO_METERS;
export const PROFILE_TALL_METERS = PROFILE_TALL_MM * MM_TO_METERS;
export const BASE_BEAM_HEIGHT_MM = PROFILE_TALL_MM;
export const BASE_BEAM_WIDTH_MM = PROFILE_SHORT_MM;
export const UPRIGHT_BEAM_WIDTH_MM = PROFILE_TALL_MM;
export const UPRIGHT_BEAM_DEPTH_MM = PROFILE_SHORT_MM;

export const ENDCAP_THICKNESS_MM = 4;
export const ENDCAP_CORNER_RADIUS_MM = 2;
export const ENDCAP_THICKNESS_METERS = ENDCAP_THICKNESS_MM * MM_TO_METERS;

export const BLACK_PROFILE_COLOR = '#2b2b2b';
export const SILVER_PROFILE_COLOR = '#b7b9b3';
export const ENDCAP_COLOR = '#141414';

export const BASE_PROFILE_MATERIAL = {
  metalness: 0.6,
  roughness: 0.32,
} as const;

export const MODULE_PROFILE_MATERIAL = {
  metalness: 0.62,
  roughness: 0.3,
} as const;

export const ENDCAP_MATERIAL = {
  metalness: 0.04,
  roughness: 0.9,
} as const;

export const PROFILE_APPEARANCE = {
  invalidHexLuminanceFallback: 0.5,
  hexColorLength: 6,
  hexChannelRadix: 16,
  colorChannelMax: 255,
  darkFinishThreshold: 0.3,
  darkFinishColorLift: 0.08,
  darkFinishMetalness: 0.28,
  lightFinishMetalness: 0.58,
  darkFinishRoughness: 0.62,
  lightFinishRoughness: 0.34,
  luminanceWeights: {
    red: 0.2126,
    green: 0.7152,
    blue: 0.0722,
  },
  identityScale: [1, 1, 1] as [number, number, number],
  zeroRotation: [0, 0, 0] as [number, number, number],
} as const;

export const PLANNER_CONTROL_STEP_MM = 10;
export const URL_STATE_DEBOUNCE_MS = 300;
export const SCENE_IDLE_LOAD_TIMEOUT_MS = 180;
export const IMMEDIATE_SCENE_LOAD_TIMEOUT_MS = 0;
export const DEFAULT_CUSTOM_PROFILE_COLOR = '#ff0000';
export const CUT_LIST_HIGHLIGHT_COLOR = '#22c55e';
export const DEFAULT_POSTURE_HEIGHT_CM = 169;

export const DEFAULT_PLANNER_INPUT: PlannerInput = {
  baseLengthMm: 1350,
  baseWidthMm: 580,
  seatBaseDepthMm: 400,
  baseInnerBeamSpacingMm: 420,
  seatLengthMm: 440,
  seatDeltaMm: 100,
  seatHeightFromBaseInnerBeamsMm: 100,
  seatAngleDeg: 5,
  backrestAngleDeg: 90,
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

export const DEFAULT_PROFILE_WEIGHTS_KG_PER_METER: PlannerProfileShipping = {
  '40x40': 1.5,
  '80x40': 3.0,
};

function getProfileAreaMm2(profileType: CutListProfileType) {
  const [widthMm, heightMm] = profileType.split('x').map(Number);
  return widthMm * heightMm;
}

export function getPlannerStockCostMax(profileType: CutListProfileType, lengthMm: number) {
  return (getProfileAreaMm2(profileType) / 1600) * 30 * (lengthMm / 1000);
}

export function getPlannerStockCostDefault(profileType: CutListProfileType, lengthMm: number) {
  return (getProfileAreaMm2(profileType) / 1600) * 15 * (lengthMm / 1000);
}

export const DEFAULT_PLANNER_OPTIMIZATION_SETTINGS: PlannerOptimizationSettings = {
  mode: 'waste',
  currencyMode: 'auto',
  bladeThicknessMm: 2.5,
  safetyMarginMm: 1,
  shippingMode: 'flat',
  flatShippingCost: 0,
  shippingRatePerKg: 0,
  profileWeightsKgPerMeter: {
    ...DEFAULT_PROFILE_WEIGHTS_KG_PER_METER,
  },
  stockOptions: [
    {
      id: 'default-stock-80x40-1000',
      profileType: '80x40',
      lengthMm: 1000,
      cost: getPlannerStockCostDefault('80x40', 1000),
    },
    {
      id: 'default-stock-80x40-2000',
      profileType: '80x40',
      lengthMm: 2000,
      cost: getPlannerStockCostDefault('80x40', 2000),
    },
    {
      id: 'default-stock-40x40-1000',
      profileType: '40x40',
      lengthMm: 1000,
      cost: getPlannerStockCostDefault('40x40', 1000),
    },
    {
      id: 'default-stock-40x40-2000',
      profileType: '40x40',
      lengthMm: 2000,
      cost: getPlannerStockCostDefault('40x40', 2000),
    },
  ],
};

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

export const DEFAULT_ACTIVE_POSTURE_PRESET: PlannerPosturePreset = 'gt';
export const DEFAULT_MONITOR_SIZE_IN = 32;
export const DEFAULT_MONITOR_ASPECT_RATIO: PlannerMonitorAspectRatio = '16:10';
export const DEFAULT_MONITOR_CURVATURE: PlannerMonitorCurvature = 'disabled';
export const DEFAULT_MONITOR_TILT_DEG = 0;
export const DEFAULT_MONITOR_TARGET_FOV_DEG = 60;
export const DEFAULT_MONITOR_DISTANCE_FROM_EYES_MM = 900;
export const DEFAULT_MONITOR_HEIGHT_FROM_BASE_MM = 770;
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
};

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
} as const;

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

export const SCENE_VIEW = {
  narrowCameraPosition: [0.8, -1.6, 1] as [number, number, number],
  wideCameraPosition: [1.7, -1.7, 1.5] as [number, number, number],
  cameraUp: [0, 0, 1] as [number, number, number],
  controlsTarget: [0.7, 0, 0.5] as [number, number, number],
  narrowGizmoSizePx: 48,
  wideGizmoSizePx: 64,
  orbitDampingFactor: 0.08,
  ambientLightColor: '#eef2f7',
  ambientLightIntensity: 1.4,
  keyLightColor: '#fff9f0',
  keyLightPosition: [3.6, -2.8, 5.4] as [number, number, number],
  keyLightIntensityMultiplier: 0.98,
  shadowMapSizePx: 2048,
  shadowBias: 0.0002,
  shadowNormalBias: 0.04,
  fillLightColor: '#d9e6ff',
  fillLightPosition: [-3.2, -1.5, 2.4] as [number, number, number],
  fillLightIntensityMultiplier: 0.32,
  rimLightColor: '#f3f6fb',
  rimLightPosition: [0.6, 3.4, 2.1] as [number, number, number],
  rimLightIntensityMultiplier: 0.2,
  gridPlane: 'xy' as const,
  gridPosition: [0.7, 0, -0.002] as [number, number, number],
  gridScale: 2,
  gridCellColor: '#cbd5e1',
  gridSectionColor: '#94a3b8',
  gridCellSize: 0.1,
  gridSectionSize: 0.5,
  gridCellThickness: 0.5,
  gridSectionThickness: 0.8,
  gridFadeDistance: 5,
  gridFadeStrength: 1.6,
} as const;

export const PROFILE_GEOMETRY_ASSET = {
  axisRotationRadians: Math.PI / 2,
  fileMagic: 0x5247534f,
  fileVersion: 1,
  fileHeaderBytes: 60,
  floatBytes: 4,
  cacheDimensionPrecision: 6,
  largeProfileThresholdMeters: 0.05,
  vector3ComponentCount: 3,
  indexComponentCount: 1,
} as const;

export const PI_INTENSITY = Math.PI;

export const ALUMINUM_RIG_MOBILE_BREAKPOINT = 1024;
export const DESKTOP_PANE_EXPANDED_STATE = {
  general: true,
  setup: true,
  modules: true,
  posture: true,
  optimizer: true,
} as const;
export const MOBILE_PANE_EXPANDED_STATE = {
  general: false,
  setup: false,
  modules: false,
  posture: false,
  optimizer: false,
} as const;

export const COLOR_MODE_OPTIONS = [
  { text: 'Black', value: 'black' },
  { text: 'Silver', value: 'silver' },
  { text: 'Custom', value: 'custom' },
] as const;
