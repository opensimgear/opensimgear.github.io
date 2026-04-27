/**
 * 3D scene view configuration: camera, lights, grid, and color options.
 */

/** Camera, orbit controls, lighting, and grid settings for the 3D viewport. */
export const SCENE_VIEW = {
  /** Camera position for narrow view. */
  narrowCameraPosition: [0.8, -1.6, 1] as [number, number, number],
  /** Camera position for wide view. */
  wideCameraPosition: [1.7, -1.7, 1.5] as [number, number, number],
  /** Camera up direction. */
  cameraUp: [0, 0, 1] as [number, number, number],
  /** Target point for camera controls. */
  controlsTarget: [0.7, 0, 0.5] as [number, number, number],
  /** Gizmo size in pixels for narrow view. */
  narrowGizmoSizePx: 48,
  /** Gizmo size in pixels for wide view. */
  wideGizmoSizePx: 64,
  /** Damping factor for orbit controls. */
  orbitDampingFactor: 0.08,
  /** Ambient light color. */
  ambientLightColor: '#eef2f7',
  /** Ambient light intensity. */
  ambientLightIntensity: 1.4,
  /** Key light color. */
  keyLightColor: '#fff9f0',
  /** Key light position. */
  keyLightPosition: [3.6, -2.8, 5.4] as [number, number, number],
  /** Multiplier for key light intensity. */
  keyLightIntensityMultiplier: 0.98,
  /** Size of the shadow map in pixels. */
  shadowMapSizePx: 2048,
  /** Bias for shadow mapping. */
  shadowBias: 0.0002,
  /** Normal bias for shadow mapping. */
  shadowNormalBias: 0.04,
  /** Fill light color. */
  fillLightColor: '#d9e6ff',
  /** Fill light position. */
  fillLightPosition: [-3.2, -1.5, 2.4] as [number, number, number],
  /** Multiplier for fill light intensity. */
  fillLightIntensityMultiplier: 0.32,
  /** Rim light color. */
  rimLightColor: '#f3f6fb',
  /** Rim light position. */
  rimLightPosition: [0.6, 3.4, 2.1] as [number, number, number],
  /** Multiplier for rim light intensity. */
  rimLightIntensityMultiplier: 0.2,
  /** Grid plane orientation. */
  gridPlane: 'xy' as const,
  /** Grid position in 3D space. */
  gridPosition: [0.7, 0, -0.002] as [number, number, number],
  /** Grid scale factor. */
  gridScale: 2,
  /** Color of the grid cells. */
  gridCellColor: '#cbd5e1',
  /** Color of the grid sections. */
  gridSectionColor: '#94a3b8',
  /** Size of each grid cell. */
  gridCellSize: 0.1,
  /** Size of each grid section. */
  gridSectionSize: 0.5,
  /** Thickness of the grid cell lines. */
  gridCellThickness: 0.5,
  /** Thickness of the grid section lines. */
  gridSectionThickness: 0.8,
  /** Distance over which the grid fades out. */
  gridFadeDistance: 5,
  /** Strength of the grid fade effect. */
  gridFadeStrength: 1.6,
} as const;

/** Directional light intensities are scaled by π to match Three.js physically-correct lighting. */
export const PI_INTENSITY = Math.PI;

/** Profile color mode options shown in the UI. */
export const COLOR_MODE_OPTIONS = [
  { text: 'Black', value: 'black' },
  { text: 'Silver', value: 'silver' },
  { text: 'Custom', value: 'custom' },
] as const;

/** Default custom profile hex color when user picks "Custom" mode. */
export const DEFAULT_CUSTOM_PROFILE_COLOR = '#ff0000';
/** Highlight color used to flash a beam in the cut list. */
export const CUT_LIST_HIGHLIGHT_COLOR = '#22c55e';
