import type { CutListProfileType, CutListRow } from '../types';

export type ProfileType = 'box' | 'alu40x40' | 'alu80x40';
export type BeamAxis = 'x' | 'y' | 'z';
export type OpenBeamEnd = 'negative' | 'positive';

export type MeshSpec = {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  rotation?: [number, number, number];
  axis?: BeamAxis;
  profileType?: ProfileType;
  shape?: 'beam' | 'endcap';
  openEnds?: OpenBeamEnd[];
  materialKind?: 'metal' | 'plastic';
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
export const ENDCAP_THICKNESS_MM = 4;
export const ENDCAP_CORNER_RADIUS_MM = 2;
export const ENDCAP_THICKNESS = mm(ENDCAP_THICKNESS_MM);
export const ENDCAP_COLOR = '#141414';

export const BLACK_PROFILE_COLOR = '#2b2b2b';
export const SILVER_PROFILE_COLOR = '#b7b9b3';

export function mm(value: number) {
  return value * MM_TO_METERS;
}

export function metersToRoundedMm(value: number) {
  return Math.round(value / MM_TO_METERS);
}

export function getBeamAxis(size: [number, number, number]): BeamAxis {
  if (size[0] >= size[1] && size[0] >= size[2]) {
    return 'x';
  }

  if (size[1] >= size[0] && size[1] >= size[2]) {
    return 'y';
  }

  return 'z';
}

export function getAxisIndex(axis: BeamAxis) {
  return axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
}

export function getMeshAxis(mesh: MeshSpec): BeamAxis {
  return mesh.axis ?? getBeamAxis(mesh.size);
}

export function getAxisLength(size: [number, number, number], axis: BeamAxis) {
  return size[getAxisIndex(axis)];
}

function getOpenEndOffset(openEnds: OpenBeamEnd[] | undefined, end: OpenBeamEnd) {
  return openEnds?.includes(end) ? ENDCAP_THICKNESS : 0;
}

export function getAdjustedBeamSize(mesh: MeshSpec, includeEndCaps: boolean): [number, number, number] {
  if (!includeEndCaps || !mesh.openEnds?.length) {
    return [...mesh.size] as [number, number, number];
  }

  const axis = getMeshAxis(mesh);
  const axisIndex = getAxisIndex(axis);
  const nextSize = [...mesh.size] as [number, number, number];
  const shortenedLength =
    nextSize[axisIndex] - getOpenEndOffset(mesh.openEnds, 'negative') - getOpenEndOffset(mesh.openEnds, 'positive');

  nextSize[axisIndex] = Math.max(ENDCAP_THICKNESS, shortenedLength);
  return nextSize;
}

export function getAdjustedBeamPosition(mesh: MeshSpec, includeEndCaps: boolean): [number, number, number] {
  if (!includeEndCaps || !mesh.openEnds?.length) {
    return [...mesh.position] as [number, number, number];
  }

  const axis = getMeshAxis(mesh);
  const axisIndex = getAxisIndex(axis);
  const nextPosition = [...mesh.position] as [number, number, number];
  const negativeOffset = mesh.openEnds.includes('negative') ? ENDCAP_THICKNESS / 2 : 0;
  const positiveOffset = mesh.openEnds.includes('positive') ? ENDCAP_THICKNESS / 2 : 0;

  nextPosition[axisIndex] += negativeOffset - positiveOffset;
  return nextPosition;
}

function getCutListProfileType(profileType: ProfileType | undefined): CutListProfileType | null {
  if (profileType === 'alu40x40') {
    return '40x40';
  }

  if (profileType === 'alu80x40') {
    return '80x40';
  }

  return null;
}

export function getMeshCutLengthMm(mesh: MeshSpec, includeEndCaps: boolean) {
  const profileType = getCutListProfileType(mesh.profileType);

  if (!profileType) {
    return null;
  }

  const adjustedSize = getAdjustedBeamSize(mesh, includeEndCaps);
  return metersToRoundedMm(getAxisLength(adjustedSize, getMeshAxis(mesh)));
}

export function getMeshCutListRow(mesh: MeshSpec, includeEndCaps: boolean): CutListRow | null {
  const profileType = getCutListProfileType(mesh.profileType);
  const cutLengthMm = getMeshCutLengthMm(mesh, includeEndCaps);

  if (!profileType || cutLengthMm === null) {
    return null;
  }

  return createCutListRow(profileType, cutLengthMm, 1);
}

export function createEndCapMeshes(mesh: MeshSpec): MeshSpec[] {
  if (!mesh.openEnds?.length || !mesh.profileType?.startsWith('alu')) {
    return [];
  }

  const axis = getMeshAxis(mesh);
  const axisIndex = getAxisIndex(axis);
  const halfLength = getAxisLength(mesh.size, axis) / 2;

  return mesh.openEnds.map((end) => {
    const sign = end === 'positive' ? 1 : -1;
    const position = [...mesh.position] as [number, number, number];
    const size = [...mesh.size] as [number, number, number];

    size[axisIndex] = ENDCAP_THICKNESS;
    position[axisIndex] += sign * (halfLength - ENDCAP_THICKNESS / 2);

    return {
      id: `${mesh.id}-endcap-${end}`,
      axis,
      profileType: mesh.profileType,
      shape: 'endcap',
      materialKind: 'plastic',
      position,
      size,
      rotation: mesh.rotation,
      color: ENDCAP_COLOR,
      metalness: 0.04,
      roughness: 0.9,
    };
  });
}

export function createCutListRow(profileType: CutListProfileType, lengthMm: number, quantity: number): CutListRow {
  return {
    profileType,
    lengthMm: Math.round(lengthMm),
    quantity,
  };
}

export function renderFrameZ(valueMm: number) {
  return valueMm * (RENDERED_RAIL_SPACING_MM / SCENE_WIDTH_MM);
}

export function centeredZ(zMm: number) {
  return (renderFrameZ(zMm) - RENDERED_RAIL_SPACING_MM / 2) * MM_TO_METERS;
}
