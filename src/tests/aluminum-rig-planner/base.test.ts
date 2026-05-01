import { describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_INPUT } from '~/components/calculator/aluminum-rig-planner/constants/planner';
import { createBaseModule } from '~/components/calculator/aluminum-rig-planner/modules/base';

describe('aluminum rig planner base module', () => {
  it('keeps base mesh geometry relative to the rig root when feet height changes', () => {
    const defaultMeshes = createBaseModule(DEFAULT_PLANNER_INPUT, '#222222');
    const raisedMeshes = createBaseModule(
      {
        ...DEFAULT_PLANNER_INPUT,
        baseFeetHeightMm: 50,
      },
      '#222222'
    );

    for (const defaultMesh of defaultMeshes) {
      const raisedMesh = raisedMeshes.find((mesh) => mesh.id === defaultMesh.id);

      expect(raisedMesh?.position[2]).toBeCloseTo(defaultMesh.position[2]);
    }
  });
});
