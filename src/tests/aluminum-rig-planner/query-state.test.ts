import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PLANNER_INPUT,
  PLANNER_DIMENSION_LIMITS,
} from '../../components/calculator/aluminum-rig-planner/constants';
import { getSteeringColumnDistanceMaxMm } from '../../components/calculator/aluminum-rig-planner/geometry';
import { mergePlannerQueryState } from '../../components/calculator/aluminum-rig-planner/query-state';

describe('aluminum rig planner query state', () => {
  it('sanitizes out-of-range shared-link values before hydration', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      baseWidthMm: 900,
      seatLengthMm: 999,
      seatDeltaMm: 999,
      seatHeightFromBaseInnerBeamsMm: -30,
      seatAngleDeg: 80,
      backrestAngleDeg: 20,
      pedalTrayDepthMm: 120,
      pedalTrayDistanceMm: -50,
      steeringColumnDistanceMm: 1200,
      steeringColumnBaseHeightMm: 900,
      steeringColumnHeightMm: 120,
    });

    expect(state.plannerInput.baseWidthMm).toBe(PLANNER_DIMENSION_LIMITS.baseWidthMaxMm);
    expect(state.plannerInput.seatLengthMm).toBe(PLANNER_DIMENSION_LIMITS.seatLengthMaxMm);
    expect(state.plannerInput.seatDeltaMm).toBe(PLANNER_DIMENSION_LIMITS.seatDeltaMaxMm);
    expect(state.plannerInput.seatHeightFromBaseInnerBeamsMm).toBe(0);
    expect(state.plannerInput.seatAngleDeg).toBe(45);
    expect(state.plannerInput.backrestAngleDeg).toBe(45);
    expect(state.plannerInput.pedalTrayDepthMm).toBe(300);
    expect(state.plannerInput.pedalTrayDistanceMm).toBe(150);
    expect(state.plannerInput.steeringColumnDistanceMm).toBe(getSteeringColumnDistanceMaxMm(state.plannerInput));
    expect(state.plannerInput.steeringColumnBaseHeightMm).toBe(500);
    expect(state.plannerInput.steeringColumnHeightMm).toBe(380);
  });
});
