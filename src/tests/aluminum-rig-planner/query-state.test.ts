import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PLANNER_OPTIMIZATION_SETTINGS,
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

  it('sanitizes optimizer settings and malformed stock rows', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      optimizer: {
        mode: 'waste',
        currencyMode: 'eur',
        bladeThicknessMm: -3,
        safetyMarginMm: -5,
        shippingMode: 'per-kg',
        flatShippingCost: -10,
        shippingRatePerKg: -2,
        profileWeightsKgPerMeter: {
          '40x40': -1,
          '80x40': 3.4,
        },
        stockOptions: [
          {
            id: 'stock-1',
            profileType: '40x40',
            lengthMm: 1500,
            cost: 49.95,
          },
          {
            profileType: '80x40',
            lengthMm: -2000,
            cost: 80,
          },
          {
            profileType: 'bogus',
            lengthMm: 1000,
            cost: 30,
          },
          {
            profileType: '80x40',
            lengthMm: 3000,
            cost: 95,
          },
        ],
      },
    });

    expect(state.optimizationSettings.mode).toBe('waste');
    expect(state.optimizationSettings.currencyMode).toBe('eur');
    expect(state.optimizationSettings.bladeThicknessMm).toBe(0.5);
    expect(state.optimizationSettings.safetyMarginMm).toBe(0);
    expect(state.optimizationSettings.shippingMode).toBe('per-kg');
    expect(state.optimizationSettings.flatShippingCost).toBe(0);
    expect(state.optimizationSettings.shippingRatePerKg).toBe(0);
    expect(state.optimizationSettings.profileWeightsKgPerMeter['40x40']).toBe(0);
    expect(state.optimizationSettings.profileWeightsKgPerMeter['80x40']).toBe(3.4);
    expect(state.optimizationSettings.stockOptions).toHaveLength(2);
    expect(state.optimizationSettings.stockOptions[0]).toEqual({
      id: 'stock-1',
      profileType: '40x40',
      lengthMm: 1500,
      cost: 45,
    });
    expect(state.optimizationSettings.stockOptions[1]).toMatchObject({
      profileType: '80x40',
      lengthMm: 3000,
      cost: 95,
    });
    expect(state.optimizationSettings.stockOptions[1].id).toMatch(/^planner-stock-option-/);
  });

  it('preserves decimal blade thickness values within allowed range', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      optimizer: {
        bladeThicknessMm: 2.74,
      },
    });

    expect(state.optimizationSettings.bladeThicknessMm).toBe(2.7);
  });

  it('caps blade thickness at 5 mm from shared-link state', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      optimizer: {
        bladeThicknessMm: 8,
      },
    });

    expect(state.optimizationSettings.bladeThicknessMm).toBe(5);
  });

  it('uses optimizer defaults when optimizer state is absent', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {});

    expect(state.optimizationSettings).toEqual({
      ...DEFAULT_PLANNER_OPTIMIZATION_SETTINGS,
      profileWeightsKgPerMeter: { ...DEFAULT_PLANNER_OPTIMIZATION_SETTINGS.profileWeightsKgPerMeter },
      stockOptions: DEFAULT_PLANNER_OPTIMIZATION_SETTINGS.stockOptions.map((option) => ({ ...option })),
    });
  });
});
