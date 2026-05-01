/**
 * Shared beam mesh utilities used by all rig modules.
 * Re-exports unit conversion and profile constants for convenience.
 */

import { Euler, Vector3 } from 'three';
import type { CutListProfileType, CutListRow } from '../types';
import {
  BASE_BEAM_HEIGHT_MM as BASE_BEAM_HEIGHT_MM_VALUE,
  BASE_BEAM_WIDTH_MM,
  BLACK_PROFILE_COLOR as BLACK_PROFILE_COLOR_VALUE,
  ENDCAP_COLOR as ENDCAP_COLOR_VALUE,
  ENDCAP_CORNER_RADIUS_MM as ENDCAP_CORNER_RADIUS_MM_VALUE,
  ENDCAP_MATERIAL,
  ENDCAP_THICKNESS_METERS,
  ENDCAP_THICKNESS_MM as ENDCAP_THICKNESS_MM_VALUE,
  MM_TO_METERS as MM_TO_METERS_VALUE,
  PROFILE_SHORT_METERS,
  PROFILE_TALL_METERS,
  SILVER_PROFILE_COLOR as SILVER_PROFILE_COLOR_VALUE,
  UPRIGHT_BEAM_DEPTH_MM,
  UPRIGHT_BEAM_WIDTH_MM,
} from '../constants/profile';
import { mm as mathMm, metersToRoundedMm as mathMetersToRoundedMm, centeredY as mathCenteredY } from './math';

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
  shape?: 'beam' | 'endcap' | 'torus' | 'cylinder';
  openEnds?: OpenBeamEnd[];
  materialKind?: 'metal' | 'plastic';
  color: string;
  metalness?: number;
  roughness?: number;
  cornerRadius?: number;
  cornerSegments?: number;
  torusRadius?: number;
  torusTubeRadius?: number;
  torusRadialSegments?: number;
  torusTubularSegments?: number;
  cylinderRadiusTop?: number;
  cylinderRadiusBottom?: number;
  cylinderRadialSegments?: number;
};

// Re-export conversion helpers from math module
export const MM_TO_METERS = MM_TO_METERS_VALUE;
export const mm = mathMm;
export const metersToRoundedMm = mathMetersToRoundedMm;
export const centeredY = mathCenteredY;

// Re-export profile dimensions in scene meters
export const PROFILE_SHORT = PROFILE_SHORT_METERS;
export const PROFILE_TALL = PROFILE_TALL_METERS;
export const BASE_BEAM_HEIGHT = BASE_BEAM_HEIGHT_MM_VALUE * MM_TO_METERS;
export const BASE_BEAM_WIDTH = BASE_BEAM_WIDTH_MM * MM_TO_METERS;
export const UPRIGHT_BEAM_WIDTH = UPRIGHT_BEAM_WIDTH_MM * MM_TO_METERS;
export const UPRIGHT_BEAM_DEPTH = UPRIGHT_BEAM_DEPTH_MM * MM_TO_METERS;
export const BASE_BEAM_HEIGHT_MM = BASE_BEAM_HEIGHT_MM_VALUE;
export const ENDCAP_THICKNESS_MM = ENDCAP_THICKNESS_MM_VALUE;
export const ENDCAP_CORNER_RADIUS_MM = ENDCAP_CORNER_RADIUS_MM_VALUE;
export const ENDCAP_THICKNESS = ENDCAP_THICKNESS_METERS;
export const ENDCAP_COLOR = ENDCAP_COLOR_VALUE;
export const BLACK_PROFILE_COLOR = BLACK_PROFILE_COLOR_VALUE;
export const SILVER_PROFILE_COLOR = SILVER_PROFILE_COLOR_VALUE;

/** Determine the longest axis of a beam from its size tuple. */
export function getBeamAxis(size: [number, number, number]): BeamAxis {
  if (size[0] >= size[1] && size[0] >= size[2]) {
    return 'x';
  }

  if (size[1] >= size[0] && size[1] >= size[2]) {
    return 'y';
  }

  return 'z';
}

/** Map an axis label to its tuple index (x=0, y=1, z=2). */
export function getAxisIndex(axis: BeamAxis) {
  return axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
}

function getAxisUnitVector(axis: BeamAxis) {
  if (axis === 'x') {
    return new Vector3(1, 0, 0);
  }

  if (axis === 'y') {
    return new Vector3(0, 1, 0);
  }

  return new Vector3(0, 0, 1);
}

function getRotatedAxisUnitVector(axis: BeamAxis, rotation: MeshSpec['rotation']) {
  const vector = getAxisUnitVector(axis);

  if (!rotation) {
    return vector;
  }

  return vector.applyEuler(new Euler(...rotation));
}

/** Get the dominant axis of a mesh (uses explicit axis if set). */
export function getMeshAxis(mesh: MeshSpec): BeamAxis {
  return mesh.axis ?? getBeamAxis(mesh.size);
}

/** Read the component of size along the given axis. */
export function getAxisLength(size: [number, number, number], axis: BeamAxis) {
  return size[getAxisIndex(axis)];
}

/** Return the end-cap offset if the given end is open, else 0. */
function getOpenEndOffset(openEnds: OpenBeamEnd[] | undefined, end: OpenBeamEnd) {
  return openEnds?.includes(end) ? ENDCAP_THICKNESS : 0;
}

/** Shorten a beam's size along its axis to account for attached end caps. */
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

/** Shift a beam's position along its axis to center after end-cap shortening. */
export function getAdjustedBeamPosition(mesh: MeshSpec, includeEndCaps: boolean): [number, number, number] {
  if (!includeEndCaps || !mesh.openEnds?.length) {
    return [...mesh.position] as [number, number, number];
  }

  const axis = getMeshAxis(mesh);
  const axisVector = getRotatedAxisUnitVector(axis, mesh.rotation);
  const nextPosition = [...mesh.position] as [number, number, number];
  const negativeOffset = mesh.openEnds.includes('negative') ? ENDCAP_THICKNESS / 2 : 0;
  const positiveOffset = mesh.openEnds.includes('positive') ? ENDCAP_THICKNESS / 2 : 0;
  const offset = negativeOffset - positiveOffset;

  nextPosition[0] += axisVector.x * offset;
  nextPosition[1] += axisVector.y * offset;
  nextPosition[2] += axisVector.z * offset;
  return nextPosition;
}

/** Map a profile-type enum to its cut-list profile string, or null for non-profile meshes. */
function getCutListProfileType(profileType: ProfileType | undefined): CutListProfileType | null {
  if (profileType === 'alu40x40') {
    return '40x40';
  }

  if (profileType === 'alu80x40') {
    return '80x40';
  }

  return null;
}

/** Get the cut length in mm for a profile mesh, accounting for end caps. */
export function getMeshCutLengthMm(mesh: MeshSpec, includeEndCaps: boolean) {
  const profileType = getCutListProfileType(mesh.profileType);

  if (!profileType) {
    return null;
  }

  const adjustedSize = getAdjustedBeamSize(mesh, includeEndCaps);
  return metersToRoundedMm(getAxisLength(adjustedSize, getMeshAxis(mesh)));
}

/** Create a CutListRow from a mesh spec, or null if not a profile. */
export function getMeshCutListRow(mesh: MeshSpec, includeEndCaps: boolean): CutListRow | null {
  const profileType = getCutListProfileType(mesh.profileType);
  const cutLengthMm = getMeshCutLengthMm(mesh, includeEndCaps);

  if (!profileType || cutLengthMm === null) {
    return null;
  }

  return createCutListRow(profileType, cutLengthMm, 1);
}

/** Generate end-cap mesh specs for each open end of a profile beam. */
export function createEndCapMeshes(mesh: MeshSpec): MeshSpec[] {
  if (!mesh.openEnds?.length || !mesh.profileType?.startsWith('alu')) {
    return [];
  }

  const axis = getMeshAxis(mesh);
  const axisIndex = getAxisIndex(axis);
  const axisVector = getRotatedAxisUnitVector(axis, mesh.rotation);
  const halfLength = getAxisLength(mesh.size, axis) / 2;

  return mesh.openEnds.map((end) => {
    const sign = end === 'positive' ? 1 : -1;
    const position = [...mesh.position] as [number, number, number];
    const size = [...mesh.size] as [number, number, number];
    const offset = sign * (halfLength - ENDCAP_THICKNESS / 2);

    size[axisIndex] = ENDCAP_THICKNESS;
    position[0] += axisVector.x * offset;
    position[1] += axisVector.y * offset;
    position[2] += axisVector.z * offset;

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
      metalness: ENDCAP_MATERIAL.metalness,
      roughness: ENDCAP_MATERIAL.roughness,
    };
  });
}

/** Create a CutListRow with the given values, rounding length to whole mm. */
export function createCutListRow(profileType: CutListProfileType, lengthMm: number, quantity: number): CutListRow {
  return {
    profileType,
    lengthMm: Math.round(lengthMm),
    quantity,
  };
}
