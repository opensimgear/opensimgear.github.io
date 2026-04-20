import { describe, expect, it } from 'vitest';

import {
  getProfileGeometryCacheKey,
  getProfileMeshScale,
} from '../../components/calculator/aluminium-rig-planner/modules/profile-geometry';

describe('aluminium rig planner profile geometry', () => {
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
    expect(getProfileMeshScale([1.35, 0.08, 0.04])).toEqual([1.35, 1, 1]);
    expect(getProfileMeshScale([0.08, 0.81, 0.04])).toEqual([1, 0.81, 1]);
    expect(getProfileMeshScale([0.04, 0.08, 0.42])).toEqual([1, 1, 0.42]);
  });
});
