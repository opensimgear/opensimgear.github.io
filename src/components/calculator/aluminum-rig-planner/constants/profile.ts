/**
 * Aluminum extrusion profile dimensions, colors, and 3D material constants.
 */

/** Conversion factor from millimeters to scene-unit meters. */
export const MM_TO_METERS = 0.001;
/** Short side of the 40×40 or 80×40 profile cross-section (mm). */
export const PROFILE_SHORT_MM = 40;
/** Tall side of the 80×40 profile cross-section (mm). */
export const PROFILE_TALL_MM = 80;
/** Half of the short profile dimension, used for centering offsets (mm). */
export const HALF_PROFILE_SHORT_MM = PROFILE_SHORT_MM / 2;
/** Short profile dimension in scene meters. */
export const PROFILE_SHORT_METERS = PROFILE_SHORT_MM * MM_TO_METERS;
/** Tall profile dimension in scene meters. */
export const PROFILE_TALL_METERS = PROFILE_TALL_MM * MM_TO_METERS;
/** Height of a base rail beam (same as the tall profile, mm). */
export const BASE_BEAM_HEIGHT_MM = PROFILE_TALL_MM;
/** Width of a base rail beam (same as the short profile, mm). */
export const BASE_BEAM_WIDTH_MM = PROFILE_SHORT_MM;
/** Width of a vertical upright beam (rotated 80×40, mm). */
export const UPRIGHT_BEAM_WIDTH_MM = PROFILE_TALL_MM;
/** Depth of a vertical upright beam (rotated 80×40, mm). */
export const UPRIGHT_BEAM_DEPTH_MM = PROFILE_SHORT_MM;

/** Thickness of the plastic end cap plug (mm). */
export const ENDCAP_THICKNESS_MM = 4;
/** Corner rounding radius of the end cap (mm). */
export const ENDCAP_CORNER_RADIUS_MM = 2;
/** End cap thickness in scene meters. */
export const ENDCAP_THICKNESS_METERS = ENDCAP_THICKNESS_MM * MM_TO_METERS;

/** Hex color for the black anodized finish. */
export const BLACK_PROFILE_COLOR = '#2b2b2b';
/** Hex color for the silver / natural finish. */
export const SILVER_PROFILE_COLOR = '#b7b9b3';
/** Hex color for the dark plastic end cap. */
export const ENDCAP_COLOR = '#141414';

/** PBR material for the base-frame profiles. */
export const BASE_PROFILE_MATERIAL = {
  metalness: 0.6,
  roughness: 0.32,
} as const;

/** PBR material for module (non-base) profiles. */
export const MODULE_PROFILE_MATERIAL = {
  metalness: 0.62,
  roughness: 0.3,
} as const;

/** PBR material for end caps. */
export const ENDCAP_MATERIAL = {
  metalness: 0.04,
  roughness: 0.9,
} as const;

/** Tuning values for the dynamic profile color → material pipeline. */
export const PROFILE_APPEARANCE = {
  /** Luminance returned when hex parsing fails. */
  invalidHexLuminanceFallback: 0.5,
  /** Expected length of a hex color string (without #). */
  hexColorLength: 6,
  /** Radix used when parsing hex color channels. */
  hexChannelRadix: 16,
  /** Maximum value of a single 8-bit color channel. */
  colorChannelMax: 255,
  /** Luminance threshold to distinguish dark from light finishes. */
  darkFinishThreshold: 0.3,
  /** Small color lift applied to dark finishes to improve readability. */
  darkFinishColorLift: 0.08,
  /** Metalness for dark finishes. */
  darkFinishMetalness: 0.28,
  /** Metalness for light finishes. */
  lightFinishMetalness: 0.58,
  /** Roughness for dark finishes. */
  darkFinishRoughness: 0.62,
  /** Roughness for light finishes. */
  lightFinishRoughness: 0.34,
  /** sRGB luminance coefficients (ITU BT.709). */
  luminanceWeights: {
    red: 0.2126,
    green: 0.7152,
    blue: 0.0722,
  },
  /** Identity scale vector. */
  identityScale: [1, 1, 1] as [number, number, number],
  /** Zero rotation vector. */
  zeroRotation: [0, 0, 0] as [number, number, number],
} as const;

/** Constants for reading / caching binary profile geometry assets. */
export const PROFILE_GEOMETRY_ASSET = {
  /** Rotation applied to align the asset mesh axis (π/2). */
  axisRotationRadians: Math.PI / 2,
  /** Magic bytes identifying a valid profile geometry file. */
  fileMagic: 0x5247534f,
  /** Expected file format version. */
  fileVersion: 1,
  /** Size of the binary header in bytes. */
  fileHeaderBytes: 60,
  /** Byte size of one IEEE-754 float. */
  floatBytes: 4,
  /** Decimal places used when caching dimension keys. */
  cacheDimensionPrecision: 6,
  /** Cross-section size above which a profile is 80×40 rather than 40×40 (m). */
  largeProfileThresholdMeters: 0.05,
  /** Number of floats per vertex position / normal. */
  vector3ComponentCount: 3,
  /** Number of values per index entry. */
  indexComponentCount: 1,
} as const;
