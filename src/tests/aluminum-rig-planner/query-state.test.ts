import { describe, expect, it } from 'vitest';

import { createInitialPlannerInput } from '../../components/calculator/aluminum-rig-planner/presets';
import { mergePlannerQueryState } from '../../components/calculator/aluminum-rig-planner/query-state';

describe('aluminum rig planner query state', () => {
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
      pedalTrayDepthMm: 120,
      pedalTrayDistanceMm: -50,
      steeringColumnBaseHeightMm: 900,
      steeringColumnHeightMm: 120,
    });

    expect(state.plannerInput.seatBackAngleDeg).toBe(10);
    expect(state.plannerInput.pedalAngleDeg).toBe(35);
    expect(state.plannerInput.wheelTiltDeg).toBe(35);
    expect(state.plannerInput.pedalTrayDepthMm).toBe(300);
    expect(state.plannerInput.pedalTrayDistanceMm).toBe(0);
    expect(state.plannerInput.steeringColumnBaseHeightMm).toBe(500);
    expect(state.plannerInput.steeringColumnHeightMm).toBe(580);
  });
});
