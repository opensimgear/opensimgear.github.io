import type { PlannerInput } from './types';

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

export const DEFAULT_PLANNER_INPUT: PlannerInput = {
  baseLengthMm: 1350,
  baseWidthMm: 500,
  seatBaseDepthMm: 500,
  baseInnerBeamSpacingMm: 420,
  pedalTrayDepthMm: 300,
  pedalTrayDistanceMm: 550,
  steeringColumnDistanceMm: 190,
  steeringColumnBaseHeightMm: 430,
  steeringColumnHeightMm: 510,
};

export const PLANNER_DIMENSION_LIMITS = {
  baseLengthMinMm: 800,
  baseLengthMaxMm: 1600,
  baseWidthMinMm: 400,
  baseWidthMaxMm: 600,
  seatBaseDepthMinMm: 240,
  seatBaseDepthMaxMm: 500,
  baseInnerBeamSpacingMinMm: 120,
  baseInnerBeamSpacingMaxMm: 460,
  pedalTrayDepthMinMm: 300,
  pedalTrayDepthMaxMm: 500,
  pedalTrayDistanceMinMm: 150,
  pedalTrayDistanceMaxMm: 700,
  steeringColumnBaseHeightMinMm: 300,
  steeringColumnBaseHeightMaxMm: 500,
  steeringColumnHeightMinMm: 380,
  steeringColumnHeightMaxMm: 600,
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
  narrowCameraPosition: [0.98, 0.84, 1] as [number, number, number],
  wideCameraPosition: [0.1, 1, 1] as [number, number, number],
  cameraUp: [0, 1, 0] as [number, number, number],
  controlsTarget: [0.7, 0.1, 0] as [number, number, number],
  narrowGizmoSizePx: 48,
  wideGizmoSizePx: 64,
  orbitDampingFactor: 0.08,
  ambientLightColor: '#eef2f7',
  ambientLightIntensity: 1.4,
  keyLightColor: '#fff9f0',
  keyLightPosition: [3.6, 5.4, 2.8] as [number, number, number],
  keyLightIntensityMultiplier: 0.98,
  shadowMapSizePx: 2048,
  shadowBias: 0.0002,
  shadowNormalBias: 0.04,
  fillLightColor: '#d9e6ff',
  fillLightPosition: [-3.2, 2.4, 1.5] as [number, number, number],
  fillLightIntensityMultiplier: 0.32,
  rimLightColor: '#f3f6fb',
  rimLightPosition: [0.6, 2.1, -3.4] as [number, number, number],
  rimLightIntensityMultiplier: 0.2,
  gridPosition: [0.7, -0.002, 0] as [number, number, number],
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
  setup: true,
  modules: true,
  cutList: true,
} as const;
export const MOBILE_PANE_EXPANDED_STATE = {
  setup: false,
  modules: false,
  cutList: false,
} as const;

export const COLOR_MODE_OPTIONS = [
  { text: 'Black', value: 'black' },
  { text: 'Silver', value: 'silver' },
  { text: 'Custom', value: 'custom' },
] as const;
