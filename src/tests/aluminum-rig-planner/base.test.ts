import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PLANNER_INPUT,
  PLANNER_DIMENSION_LIMITS,
} from '~/components/calculator/aluminum-rig-planner/constants/planner';
import { createBaseModule } from '~/components/calculator/aluminum-rig-planner/modules/base';
import { clampPlannerInput } from '~/components/calculator/aluminum-rig-planner/scene/geometry';

describe('aluminum rig planner base module', () => {
  it('keeps base mesh geometry relative to the rig root when feet height changes', () => {
    const defaultMeshes = createBaseModule(DEFAULT_PLANNER_INPUT, '#222222');
    const raisedMeshes = createBaseModule(
      {
        ...DEFAULT_PLANNER_INPUT,
        baseFeetType: 'rubber',
        baseFeetHeightMm: 40,
      },
      '#222222'
    );

    for (const defaultMesh of defaultMeshes) {
      if (defaultMesh.id.includes('-rubber-')) {
        continue;
      }
      const raisedMesh = raisedMeshes.find((mesh) => mesh.id === defaultMesh.id);

      expect(raisedMesh?.position[2]).toBeCloseTo(defaultMesh.position[2]);
    }
  });

  it('renders rubber pads under both ends of each base rail when rubber feet are selected', () => {
    const meshes = createBaseModule(
      {
        ...DEFAULT_PLANNER_INPUT,
        baseFeetType: 'rubber',
        baseFeetHeightMm: 20,
      },
      '#222222'
    );
    const rubberPads = meshes.filter((mesh) => mesh.id.includes('-rubber-'));

    expect(rubberPads.map((mesh) => mesh.id)).toEqual(
      expect.arrayContaining([
        'base-left-rail-rubber-rear',
        'base-left-rail-rubber-front',
        'base-right-rail-rubber-rear',
        'base-right-rail-rubber-front',
      ])
    );
    expect(rubberPads).toHaveLength(4);
    expect(rubberPads.every((mesh) => mesh.shape === 'truncated-box')).toBe(true);
    expect(rubberPads[0]?.size).toEqual([0.08, 0.04, 0.02]);
    expect(rubberPads[0]?.truncatedBoxBottomSize).toEqual([0.07, 0.035]);
    expect(rubberPads[0]?.position[2]).toBeCloseTo(-0.01);
  });

  it('does not render rubber pads when base feet type is none', () => {
    const meshes = createBaseModule(
      {
        ...DEFAULT_PLANNER_INPUT,
        baseFeetType: 'none',
        baseFeetHeightMm: 40,
      },
      '#222222'
    );

    expect(meshes.some((mesh) => mesh.id.includes('-rubber-'))).toBe(false);
  });

  it('clamps rubber base feet height to the allowed range', () => {
    const lowInput = clampPlannerInput({
      ...DEFAULT_PLANNER_INPUT,
      baseFeetType: 'rubber',
      baseFeetHeightMm: 1,
    });
    const highInput = clampPlannerInput({
      ...DEFAULT_PLANNER_INPUT,
      baseFeetType: 'rubber',
      baseFeetHeightMm: 999,
    });

    expect(lowInput.baseFeetHeightMm).toBe(PLANNER_DIMENSION_LIMITS.baseFeetHeightMinMm);
    expect(highInput.baseFeetHeightMm).toBe(PLANNER_DIMENSION_LIMITS.baseFeetHeightMaxMm);
  });
});
