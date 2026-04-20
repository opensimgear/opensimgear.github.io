export type MeshSpec = {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  metalness?: number;
  roughness?: number;
};

export const MM_TO_METERS = 0.001;
export const PROFILE_SHORT = 0.04;
export const PROFILE_TALL = 0.08;
export const BASE_BEAM_HEIGHT = PROFILE_TALL;
export const BASE_BEAM_WIDTH = PROFILE_SHORT;
export const UPRIGHT_BEAM_WIDTH = PROFILE_TALL;
export const UPRIGHT_BEAM_DEPTH = PROFILE_SHORT;
export const SCENE_WIDTH_MM = 400;
export const RENDERED_RAIL_SPACING_MM = 460;
export const CROSS_BEAM_LENGTH_MM = 500;
export const WHEEL_RADIUS_MM = 0.135;
export const BASE_BEAM_HEIGHT_MM = BASE_BEAM_HEIGHT / MM_TO_METERS;

export const PROFILE_COLOR = '#aeb4ba';

export function mm(value: number) {
  return value * MM_TO_METERS;
}

export function renderFrameZ(valueMm: number) {
  return valueMm * (RENDERED_RAIL_SPACING_MM / SCENE_WIDTH_MM);
}

export function centeredZ(zMm: number) {
  return (renderFrameZ(zMm) - RENDERED_RAIL_SPACING_MM / 2) * MM_TO_METERS;
}
