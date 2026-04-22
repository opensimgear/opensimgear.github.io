import { describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_OPTIMIZATION_SETTINGS } from '../../components/calculator/aluminum-rig-planner/constants';
import { createPlannerOptimizationResult } from '../../components/calculator/aluminum-rig-planner/optimizer';
import type { CutListEntry, PlannerOptimizationSettings } from '../../components/calculator/aluminum-rig-planner/types';

function createEntry(
  profileType: CutListEntry['profileType'],
  lengthMm: number,
  beamIds: string[]
): CutListEntry {
  return {
    key: `${profileType}:${lengthMm}`,
    profileType,
    lengthMm,
    quantity: beamIds.length,
    beamIds,
  };
}

function createSettings(overrides: Partial<PlannerOptimizationSettings> = {}): PlannerOptimizationSettings {
  return {
    ...DEFAULT_PLANNER_OPTIMIZATION_SETTINGS,
    profileWeightsKgPerMeter: { ...DEFAULT_PLANNER_OPTIMIZATION_SETTINGS.profileWeightsKgPerMeter },
    stockOptions: [],
    ...overrides,
  };
}

describe('aluminum rig planner optimizer', () => {
  it('chooses cheaper higher-waste layout in cost mode', () => {
    const result = createPlannerOptimizationResult(
      [createEntry('40x40', 400, ['a', 'b'])],
      createSettings({
        mode: 'cost',
        bladeThicknessMm: 0,
        safetyMarginMm: 0,
        stockOptions: [
          { id: 'short', profileType: '40x40', lengthMm: 800, cost: 12 },
          { id: 'long', profileType: '40x40', lengthMm: 1200, cost: 10 },
        ],
      })
    );

    expect(result.status).toBe('ready');
    expect(result.totalCost).toBe(10);
    expect(result.totalWasteMm).toBe(400);
    expect(result.barCount).toBe(1);
    expect(result.profiles[0]?.purchasedBars[0]?.stockOptionId).toBe('long');
  });

  it('chooses lower-waste higher-cost layout in waste mode', () => {
    const result = createPlannerOptimizationResult(
      [createEntry('40x40', 400, ['a', 'b'])],
      createSettings({
        mode: 'waste',
        bladeThicknessMm: 0,
        safetyMarginMm: 0,
        stockOptions: [
          { id: 'short', profileType: '40x40', lengthMm: 800, cost: 12 },
          { id: 'long', profileType: '40x40', lengthMm: 1200, cost: 10 },
        ],
      })
    );

    expect(result.status).toBe('ready');
    expect(result.totalWasteMm).toBe(0);
    expect(result.totalCost).toBe(12);
    expect(result.profiles[0]?.purchasedBars[0]?.stockOptionId).toBe('short');
  });

  it('accounts for blade thickness when packing pieces into bars', () => {
    const cutListEntries = [createEntry('40x40', 500, ['a', 'b'])];
    const stockOptions = [{ id: 'stock', profileType: '40x40' as const, lengthMm: 1000, cost: 20 }];

    const withoutKerf = createPlannerOptimizationResult(
      cutListEntries,
      createSettings({
        bladeThicknessMm: 0,
        safetyMarginMm: 0,
        stockOptions,
      })
    );
    const withKerf = createPlannerOptimizationResult(
      cutListEntries,
      createSettings({
        bladeThicknessMm: 5,
        safetyMarginMm: 0,
        stockOptions,
      })
    );

    expect(withoutKerf.barCount).toBe(1);
    expect(withKerf.barCount).toBe(2);
    expect(withKerf.totalWasteMm).toBe(1000);
  });

  it('adds safety margin to every cut piece before optimization', () => {
    const result = createPlannerOptimizationResult(
      [createEntry('40x40', 400, ['a', 'b'])],
      createSettings({
        safetyMarginMm: 10,
        stockOptions: [{ id: 'stock', profileType: '40x40', lengthMm: 800, cost: 12 }],
      })
    );

    expect(result.status).toBe('ready');
    expect(result.totalAdjustedCutLengthMm).toBe(820);
    expect(result.barCount).toBe(2);
    expect(result.pieces.every((piece) => piece.adjustedLengthMm === 410)).toBe(true);
  });

  it('applies flat shipping once per order', () => {
    const result = createPlannerOptimizationResult(
      [createEntry('40x40', 100, ['a']), createEntry('80x40', 100, ['b'])],
      createSettings({
        shippingMode: 'flat',
        safetyMarginMm: 0,
        flatShippingCost: 25,
        stockOptions: [
          { id: '40', profileType: '40x40', lengthMm: 100, cost: 10 },
          { id: '80', profileType: '80x40', lengthMm: 100, cost: 20 },
        ],
      })
    );

    expect(result.status).toBe('ready');
    expect(result.materialCost).toBe(30);
    expect(result.shippingCost).toBe(25);
    expect(result.totalCost).toBe(55);
  });

  it('uses purchased stock mass for per-kg shipping', () => {
    const result = createPlannerOptimizationResult(
      [createEntry('40x40', 500, ['a'])],
      createSettings({
        shippingMode: 'per-kg',
        shippingRatePerKg: 4,
        profileWeightsKgPerMeter: {
          '40x40': 2,
          '80x40': DEFAULT_PLANNER_OPTIMIZATION_SETTINGS.profileWeightsKgPerMeter['80x40'],
        },
        stockOptions: [{ id: 'stock', profileType: '40x40', lengthMm: 1000, cost: 10 }],
      })
    );

    expect(result.status).toBe('ready');
    expect(result.totalMassKg).toBe(2);
    expect(result.shippingCost).toBe(8);
    expect(result.totalCost).toBe(18);
  });

  it('reports infeasible pieces that exceed every stock length', () => {
    const result = createPlannerOptimizationResult(
      [createEntry('80x40', 1200, ['a'])],
      createSettings({
        safetyMarginMm: 50,
        stockOptions: [{ id: 'stock', profileType: '80x40', lengthMm: 1200, cost: 40 }],
      })
    );

    expect(result.status).toBe('infeasible');
    expect(result.infeasibleProfiles).toEqual(['80x40']);
    expect(result.barCount).toBe(0);
  });
});
