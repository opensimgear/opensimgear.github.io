import { describe, expect, it } from 'vitest';

import {
  createEndCapMeshes,
  getAdjustedBeamPosition,
  type MeshSpec,
} from '~/components/calculator/aluminum-rig-planner/modules/shared';

describe('aluminum rig planner endcaps', () => {
  it('places endcaps along rotated beam axes', () => {
    const mesh = {
      id: 'rotated-crossbeam',
      size: [0.04, 1, 0.04],
      position: [2, 3, 4],
      rotation: [0, 0, Math.PI / 2],
      profileType: 'alu40x40',
      openEnds: ['negative', 'positive'],
      color: '#222222',
    } satisfies MeshSpec;
    const endcaps = createEndCapMeshes(mesh);

    expect(endcaps.find((endcap) => endcap.id.endsWith('negative'))?.position).toEqual([
      expect.closeTo(2.498, 6),
      expect.closeTo(3, 6),
      4,
    ]);
    expect(endcaps.find((endcap) => endcap.id.endsWith('positive'))?.position).toEqual([
      expect.closeTo(1.502, 6),
      expect.closeTo(3, 6),
      4,
    ]);
  });

  it('centers shortened one-ended rotated beams along the rotated axis', () => {
    const mesh = {
      id: 'one-ended-crossbeam',
      size: [0.04, 1, 0.04],
      position: [2, 3, 4],
      rotation: [0, 0, Math.PI / 2],
      profileType: 'alu40x40',
      openEnds: ['positive'],
      color: '#222222',
    } satisfies MeshSpec;

    expect(getAdjustedBeamPosition(mesh, true)).toEqual([expect.closeTo(2.002, 6), expect.closeTo(3, 6), 4]);
  });
});
