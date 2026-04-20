import { describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_INPUT } from '../../components/calculator/aluminum-rig-planner/constants';
import { mergePlannerQueryState } from '../../components/calculator/aluminum-rig-planner/query-state';

describe('aluminum rig planner query state', () => {
  it('sanitizes out-of-range shared-link values before hydration', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      baseWidthMm: 900,
      pedalTrayDepthMm: 120,
      pedalTrayDistanceMm: -50,
      steeringColumnDistanceMm: 1200,
      steeringColumnBaseHeightMm: 900,
      steeringColumnHeightMm: 120,
    });

    expect(state.plannerInput.baseWidthMm).toBe(600);
    expect(state.plannerInput.pedalTrayDepthMm).toBe(300);
    expect(state.plannerInput.pedalTrayDistanceMm).toBe(150);
    expect(state.plannerInput.steeringColumnDistanceMm).toBe(690);
    expect(state.plannerInput.steeringColumnBaseHeightMm).toBe(500);
    expect(state.plannerInput.steeringColumnHeightMm).toBe(380);
  });
});
