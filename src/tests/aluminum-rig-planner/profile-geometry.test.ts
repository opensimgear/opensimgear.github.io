import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';

import {
  getProfileGeometryCacheKey,
  getProfileMeshRotation,
  getProfileMeshScale,
} from '~/components/calculator/aluminum-rig-planner/modules/profile-geometry';

function getProfileMeshQuaternion(size: [number, number, number], profileType: 'alu40x40' | 'alu80x40' = 'alu80x40') {
  return new Quaternion().setFromEuler(
    new Euler(
      ...getProfileMeshRotation({
        id: 'beam',
        color: '#000',
        position: [0, 0, 0],
        size,
        profileType,
      })
    )
  );
}

function expectMappedAxis(
  rotation: Quaternion,
  localAxis: Vector3,
  worldAxis: Vector3,
  options: { signInsensitive?: boolean } = {}
) {
  const mappedAxis = localAxis.clone().applyQuaternion(rotation).normalize();
  const dot = mappedAxis.dot(worldAxis);

  expect(options.signInsensitive ? Math.abs(dot) : dot).toBeCloseTo(1);
}

describe('aluminum rig planner profile geometry', () => {
  it('uses same 40x40 geometry cache key when only beam length changes', () => {
    const shortBeam = getProfileGeometryCacheKey([0.3, 0.04, 0.04], 'alu40x40');
    const longBeam = getProfileGeometryCacheKey([1.2, 0.04, 0.04], 'alu40x40');

    expect(longBeam).toBe(shortBeam);
    expect(shortBeam).toBe('alu40x40:x:0.040000x0.040000');
  });

  it('uses same 80x40 geometry cache key when only beam length changes', () => {
    const xShortBeam = getProfileGeometryCacheKey([0.45, 0.04, 0.08], 'alu80x40');
    const xLongBeam = getProfileGeometryCacheKey([1.1, 0.04, 0.08], 'alu80x40');
    const yBeam = getProfileGeometryCacheKey([0.04, 1.1, 0.08], 'alu80x40');
    const zBeam = getProfileGeometryCacheKey([0.08, 0.04, 1.1], 'alu80x40');

    expect(xLongBeam).toBe(xShortBeam);
    expect(xShortBeam).toBe('alu80x40:x:0.040000x0.080000');
    expect(yBeam).toBe('alu80x40:y:0.040000x0.080000');
    expect(zBeam).toBe('alu80x40:z:0.080000x0.040000');
  });

  it('returns mesh scale only on beam length axis', () => {
    expect(getProfileMeshScale([1.35, 0.04, 0.08])).toEqual([1, 1, 1.35]);
    expect(getProfileMeshScale([0.04, 0.81, 0.08])).toEqual([1, 1, 0.81]);
    expect(getProfileMeshScale([0.08, 0.04, 0.42])).toEqual([1, 1, 0.42]);
  });

  it('orients 80x40 profiles from canonical axes into native z-up world axes', () => {
    const localWidthAxis = new Vector3(1, 0, 0);
    const localTallAxis = new Vector3(0, 1, 0);
    const localLengthAxis = new Vector3(0, 0, 1);
    const worldX = new Vector3(1, 0, 0);
    const worldY = new Vector3(0, 1, 0);
    const worldZ = new Vector3(0, 0, 1);

    const xRotation = getProfileMeshQuaternion([1.35, 0.04, 0.08]);
    const yRotation = getProfileMeshQuaternion([0.04, 0.81, 0.08]);
    const zRotation = getProfileMeshQuaternion([0.08, 0.04, 0.42]);

    expectMappedAxis(xRotation, localLengthAxis, worldX);
    expectMappedAxis(xRotation, localWidthAxis, worldY);
    expectMappedAxis(xRotation, localTallAxis, worldZ);

    expectMappedAxis(yRotation, localLengthAxis, worldY);
    expectMappedAxis(yRotation, localWidthAxis, worldX, { signInsensitive: true });
    expectMappedAxis(yRotation, localTallAxis, worldZ, { signInsensitive: true });

    expectMappedAxis(zRotation, localLengthAxis, worldZ);
    expectMappedAxis(zRotation, localWidthAxis, worldY);
    expectMappedAxis(zRotation, localTallAxis, worldX, { signInsensitive: true });
  });
});
