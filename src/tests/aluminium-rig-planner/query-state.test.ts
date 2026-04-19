import { describe, expect, it } from 'vitest';

import { createInitialPlannerInput } from '../../components/calculator/aluminium-rig-planner/presets';
import { mergePlannerQueryState } from '../../components/calculator/aluminium-rig-planner/query-state';

describe('aluminium rig planner query state', () => {
  it('sanitizes out-of-range shared-link values before hydration', () => {
    const defaults = createInitialPlannerInput({
      driverHeightMm: 1750,
      inseamMm: 820,
      seatingBias: 'performance',
      presetType: 'gt',
    });

    const state = mergePlannerQueryState(defaults, {
      seatBackAngleDeg: -20,
      pedalAngleDeg: 65,
      wheelTiltDeg: 80,
      showPreview3d: true,
    });

    expect(state.plannerInput.seatBackAngleDeg).toBe(10);
    expect(state.plannerInput.pedalAngleDeg).toBe(35);
    expect(state.plannerInput.wheelTiltDeg).toBe(35);
    expect(state.showPreview3d).toBe(true);
  });
});
