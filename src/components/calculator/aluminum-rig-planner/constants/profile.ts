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
