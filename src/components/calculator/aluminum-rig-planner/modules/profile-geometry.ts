import { Box3, BufferAttribute, BufferGeometry, Euler, Quaternion, Sphere, Vector3 } from 'three';

import alu40x40BeamAssetUrl from './generated/alu40x40-beam.bin?url';
import alu80x40BeamAssetUrl from './generated/alu80x40-beam.bin?url';
import alu40x40EndcapAssetUrl from './generated/alu40x40-endcap.bin?url';
import alu80x40EndcapAssetUrl from './generated/alu80x40-endcap.bin?url';
import { PROFILE_GEOMETRY_ASSET } from '../constants/profile';
import { getAxisLength, getBeamAxis, type MeshSpec, type BeamAxis, type ProfileType } from './shared';
type Vector3Tuple = [number, number, number];
type RotationTuple = [number, number, number];
type GeometryAssetKey = 'alu40x40-beam' | 'alu80x40-beam' | 'alu40x40-endcap' | 'alu80x40-endcap';
type BinaryGeometryHeader = {
  positionLength: number;
  normalLength: number;
  indexLength: number;
  boundingBox: {
    min: Vector3Tuple;
    max: Vector3Tuple;
  };
  boundingSphere: {
    center: Vector3Tuple;
    radius: number;
  };
};
const AXIS_X_ROTATION = new Quaternion().setFromEuler(new Euler(0, PROFILE_GEOMETRY_ASSET.axisRotationRadians, 0));
const AXIS_Y_ROTATION = new Quaternion().setFromEuler(new Euler(-PROFILE_GEOMETRY_ASSET.axisRotationRadians, 0, 0));
const IDENTITY_ROTATION = new Quaternion();
const PROFILE_ROLL_ROTATION = new Quaternion().setFromEuler(
  new Euler(0, 0, PROFILE_GEOMETRY_ASSET.axisRotationRadians)
);
const GEOMETRY_KEYS: GeometryAssetKey[] = ['alu40x40-beam', 'alu80x40-beam', 'alu40x40-endcap', 'alu80x40-endcap'];
const geometryAssetUrls: Record<GeometryAssetKey, string> = {
  'alu40x40-beam': alu40x40BeamAssetUrl,
  'alu80x40-beam': alu80x40BeamAssetUrl,
  'alu40x40-endcap': alu40x40EndcapAssetUrl,
  'alu80x40-endcap': alu80x40EndcapAssetUrl,
};
const prebuiltGeometries = new Map<GeometryAssetKey, BufferGeometry>();
const prebuiltGeometryLoadPromises = new Map<GeometryAssetKey, Promise<void>>();

function getTargetCrossSectionSize(axis: BeamAxis, size: [number, number, number]) {
  if (axis === 'x') {
    return {
      targetWidth: size[1],
      targetHeight: size[2],
    };
  }

  if (axis === 'y') {
    return {
      targetWidth: size[0],
      targetHeight: size[2],
    };
  }

  return {
    targetWidth: size[0],
    targetHeight: size[1],
  };
}

function getBeamLength(axis: BeamAxis, size: [number, number, number]) {
  return getAxisLength(size, axis);
}

function formatCacheDimension(value: number) {
  return value.toFixed(PROFILE_GEOMETRY_ASSET.cacheDimensionPrecision);
}

export function getProfileGeometryCacheKey(size: Vector3Tuple, cacheKeyPrefix: string) {
  const axis = getBeamAxis(size);
  const { targetWidth, targetHeight } = getTargetCrossSectionSize(axis, size);

  return `${cacheKeyPrefix}:${axis}:${formatCacheDimension(targetWidth)}x${formatCacheDimension(targetHeight)}`;
}

export function getProfileMeshScale(size: Vector3Tuple): Vector3Tuple {
  const axis = getBeamAxis(size);
  const length = getBeamLength(axis, size);

  return [1, 1, length];
}

function restoreGeometry(arrayBuffer: ArrayBuffer, byteOffset: number, geometryHeader: BinaryGeometryHeader) {
  const geometry = new BufferGeometry();
  const positionArray = new Float32Array(arrayBuffer, byteOffset, geometryHeader.positionLength);
  byteOffset += geometryHeader.positionLength * PROFILE_GEOMETRY_ASSET.floatBytes;

  const normalArray = new Float32Array(arrayBuffer, byteOffset, geometryHeader.normalLength);
  byteOffset += geometryHeader.normalLength * PROFILE_GEOMETRY_ASSET.floatBytes;

  geometry.setAttribute('position', new BufferAttribute(positionArray, PROFILE_GEOMETRY_ASSET.vector3ComponentCount));
  geometry.setAttribute('normal', new BufferAttribute(normalArray, PROFILE_GEOMETRY_ASSET.vector3ComponentCount));

  if (geometryHeader.indexLength > 0) {
    const indexArray = new Uint32Array(arrayBuffer, byteOffset, geometryHeader.indexLength);

    geometry.setIndex(new BufferAttribute(indexArray, PROFILE_GEOMETRY_ASSET.indexComponentCount));
    byteOffset += geometryHeader.indexLength * Uint32Array.BYTES_PER_ELEMENT;
  }

  geometry.boundingBox = new Box3(
    new Vector3(...geometryHeader.boundingBox.min),
    new Vector3(...geometryHeader.boundingBox.max)
  );
  geometry.boundingSphere = new Sphere(
    new Vector3(...geometryHeader.boundingSphere.center),
    geometryHeader.boundingSphere.radius
  );

  return { geometry, byteOffset };
}

function readVector3(view: DataView, byteOffset: number): { value: Vector3Tuple; byteOffset: number } {
  const value: Vector3Tuple = [
    view.getFloat32(byteOffset, true),
    view.getFloat32(byteOffset + PROFILE_GEOMETRY_ASSET.floatBytes, true),
    view.getFloat32(byteOffset + PROFILE_GEOMETRY_ASSET.floatBytes * 2, true),
  ];

  return {
    value,
    byteOffset: byteOffset + PROFILE_GEOMETRY_ASSET.floatBytes * PROFILE_GEOMETRY_ASSET.vector3ComponentCount,
  };
}

function parseGeometryHeader(view: DataView) {
  const fileMagic = view.getUint32(0, true);
  const fileVersion = view.getUint32(4, true);

  if (fileMagic !== PROFILE_GEOMETRY_ASSET.fileMagic) {
    throw new Error('Invalid profile geometry asset magic');
  }

  if (fileVersion !== PROFILE_GEOMETRY_ASSET.fileVersion) {
    throw new Error(`Unsupported profile geometry asset version: ${fileVersion}`);
  }

  let byteOffset = 8;
  const positionLength = view.getUint32(byteOffset, true);
  byteOffset += 4;
  const normalLength = view.getUint32(byteOffset, true);
  byteOffset += 4;
  const indexLength = view.getUint32(byteOffset, true);
  byteOffset += 4;
  const min = readVector3(view, byteOffset);
  byteOffset = min.byteOffset;
  const max = readVector3(view, byteOffset);
  byteOffset = max.byteOffset;
  const center = readVector3(view, byteOffset);
  byteOffset = center.byteOffset;
  const radius = view.getFloat32(byteOffset, true);

  return {
    header: {
      positionLength,
      normalLength,
      indexLength,
      boundingBox: {
        min: min.value,
        max: max.value,
      },
      boundingSphere: {
        center: center.value,
        radius,
      },
    },
    byteOffset: PROFILE_GEOMETRY_ASSET.fileHeaderBytes,
  };
}

async function loadPrebuiltProfileGeometry(key: GeometryAssetKey) {
  if (prebuiltGeometries.has(key)) {
    return;
  }

  const existingPromise = prebuiltGeometryLoadPromises.get(key);

  if (existingPromise) {
    return existingPromise;
  }

  const loadPromise = (async () => {
    const response = await fetch(geometryAssetUrls[key]);

    if (!response.ok) {
      throw new Error(`Failed to load profile geometry "${key}": ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const view = new DataView(arrayBuffer);
    const parsedHeader = parseGeometryHeader(view);
    const restoredGeometry = restoreGeometry(arrayBuffer, parsedHeader.byteOffset, parsedHeader.header);

    prebuiltGeometries.set(key, restoredGeometry.geometry);
  })();

  prebuiltGeometryLoadPromises.set(key, loadPromise);

  try {
    await loadPromise;
  } finally {
    prebuiltGeometryLoadPromises.delete(key);
  }
}

export async function loadPrebuiltProfileGeometries(keys: GeometryAssetKey[] = GEOMETRY_KEYS) {
  await Promise.all(keys.map((key) => loadPrebuiltProfileGeometry(key)));
}

function getGeometryAssetKey(
  profileType: ProfileType | undefined,
  shape: MeshSpec['shape'],
  size: Vector3Tuple,
  axis: BeamAxis
) {
  const resolvedProfileType = profileType ?? inferProfileTypeFromSize(size, axis);

  if (resolvedProfileType === 'alu40x40') {
    return shape === 'endcap' ? 'alu40x40-endcap' : 'alu40x40-beam';
  }

  return shape === 'endcap' ? 'alu80x40-endcap' : 'alu80x40-beam';
}

function inferProfileTypeFromSize(size: Vector3Tuple, axis: BeamAxis): ProfileType {
  const { targetWidth, targetHeight } = getTargetCrossSectionSize(axis, size);
  return Math.max(targetWidth, targetHeight) > PROFILE_GEOMETRY_ASSET.largeProfileThresholdMeters
    ? 'alu80x40'
    : 'alu40x40';
}

function getAxisRotation(axis: BeamAxis) {
  if (axis === 'x') {
    return AXIS_X_ROTATION;
  }

  if (axis === 'y') {
    return AXIS_Y_ROTATION;
  }

  return IDENTITY_ROTATION;
}

function needsProfileRoll(profileType: ProfileType | undefined, axis: BeamAxis) {
  return profileType === 'alu80x40' && axis !== 'y';
}

export function getProfileMeshRotation(mesh: MeshSpec): RotationTuple {
  const axis = mesh.axis ?? getBeamAxis(mesh.size);
  const profileType = mesh.profileType ?? inferProfileTypeFromSize(mesh.size, axis);
  const rotation = new Quaternion();

  if (mesh.rotation) {
    rotation.copy(new Quaternion().setFromEuler(new Euler(...mesh.rotation)));
  } else {
    rotation.copy(IDENTITY_ROTATION);
  }

  rotation.multiply(getAxisRotation(axis));

  if (needsProfileRoll(profileType, axis)) {
    rotation.multiply(PROFILE_ROLL_ROTATION);
  }

  const euler = new Euler().setFromQuaternion(rotation, 'XYZ');
  return [euler.x, euler.y, euler.z];
}

export function getProfileGeometry(mesh: MeshSpec) {
  if (!mesh.profileType && mesh.shape !== 'endcap') {
    return null;
  }

  const axis = mesh.axis ?? getBeamAxis(mesh.size);
  const assetKey = getGeometryAssetKey(mesh.profileType, mesh.shape, mesh.size, axis);
  return prebuiltGeometries.get(assetKey) ?? null;
}
