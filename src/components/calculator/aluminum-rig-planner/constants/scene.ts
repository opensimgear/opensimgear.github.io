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

export const PI_INTENSITY = Math.PI;

export const COLOR_MODE_OPTIONS = [
  { text: 'Black', value: 'black' },
  { text: 'Silver', value: 'silver' },
  { text: 'Custom', value: 'custom' },
] as const;

export const DEFAULT_CUSTOM_PROFILE_COLOR = '#ff0000';
export const CUT_LIST_HIGHLIGHT_COLOR = '#22c55e';
