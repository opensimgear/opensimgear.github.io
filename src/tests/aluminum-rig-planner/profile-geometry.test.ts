import { describe, expect, it } from 'vitest';

import {
  getProfileGeometryCacheKey,
  getProfileMeshRotation,
  getProfileMeshScale,
} from '../../components/calculator/aluminum-rig-planner/modules/profile-geometry';

describe('aluminum rig planner profile geometry', () => {
  it('uses same 40x40 geometry cache key when only beam length changes', () => {
    const shortBeam = getProfileGeometryCacheKey([0.3, 0.04, 0.04], 'alu40x40');
    const longBeam = getProfileGeometryCacheKey([1.2, 0.04, 0.04], 'alu40x40');

    expect(longBeam).toBe(shortBeam);
  });

  it('uses same 80x40 geometry cache key when only beam length changes', () => {
    const shortBeam = getProfileGeometryCacheKey([0.04, 0.08, 0.45], 'alu80x40');
    const longBeam = getProfileGeometryCacheKey([0.04, 0.08, 1.1], 'alu80x40');

    expect(longBeam).toBe(shortBeam);
  });

  it('returns mesh scale only on beam length axis', () => {
    expect(getProfileMeshScale([1.35, 0.08, 0.04])).toEqual([1, 1, 1.35]);
    expect(getProfileMeshScale([0.08, 0.81, 0.04])).toEqual([1, 1, 0.81]);
    expect(getProfileMeshScale([0.04, 0.08, 0.42])).toEqual([1, 1, 0.42]);
  });

  it('rotates canonical z-axis geometry onto the beam axis', () => {
    const xRotation = getProfileMeshRotation({ id: 'x', color: '#000', position: [0, 0, 0], size: [1.35, 0.08, 0.04] });
    const yRotation = getProfileMeshRotation({
      id: 'y',
      color: '#000',
      position: [0, 0, 0],
      size: [0.08, 0.81, 0.04],
      profileType: 'alu80x40',
    });
    const zRotation = getProfileMeshRotation({
      id: 'z',
      color: '#000',
      position: [0, 0, 0],
      size: [0.04, 0.08, 0.42],
      profileType: 'alu80x40',
    });

    expect(xRotation[0]).toBeCloseTo(0);
    expect(xRotation[1]).toBeCloseTo(Math.PI / 2);
    expect(xRotation[2]).toBeCloseTo(0);

    expect(yRotation[0]).toBeCloseTo(-Math.PI / 2);
    expect(yRotation[1]).toBeCloseTo(0);
    expect(yRotation[2]).toBeCloseTo(Math.PI / 2);

    expect(zRotation[0]).toBeCloseTo(0);
    expect(zRotation[1]).toBeCloseTo(0);
    expect(zRotation[2]).toBeCloseTo(0);
  });
});
