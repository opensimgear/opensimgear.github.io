import type { CutListProfileType, PlannerOptimizationSettings, PlannerProfileShipping } from '../types';

function getProfileAreaMm2(profileType: CutListProfileType) {
  const [widthMm, heightMm] = profileType.split('x').map(Number);
  return widthMm * heightMm;
}

export function getPlannerStockCostMax(profileType: CutListProfileType, lengthMm: number) {
  return (getProfileAreaMm2(profileType) / 1600) * 30 * (lengthMm / 1000);
}

export function getPlannerStockCostDefault(profileType: CutListProfileType, lengthMm: number) {
  return (getProfileAreaMm2(profileType) / 1600) * 15 * (lengthMm / 1000);
}

export const DEFAULT_PROFILE_WEIGHTS_KG_PER_METER: PlannerProfileShipping = {
  '40x40': 1.5,
  '80x40': 3.0,
};

export const DEFAULT_PLANNER_OPTIMIZATION_SETTINGS: PlannerOptimizationSettings = {
  mode: 'waste',
  currencyMode: 'auto',
  bladeThicknessMm: 2.5,
  safetyMarginMm: 1,
  shippingMode: 'flat',
  flatShippingCost: 0,
  shippingRatePerKg: 0,
  profileWeightsKgPerMeter: {
    ...DEFAULT_PROFILE_WEIGHTS_KG_PER_METER,
  },
  stockOptions: [
    {
      id: 'default-stock-80x40-1000',
      profileType: '80x40',
      lengthMm: 1000,
      cost: getPlannerStockCostDefault('80x40', 1000),
    },
    {
      id: 'default-stock-80x40-2000',
      profileType: '80x40',
      lengthMm: 2000,
      cost: getPlannerStockCostDefault('80x40', 2000),
    },
    {
      id: 'default-stock-40x40-1000',
      profileType: '40x40',
      lengthMm: 1000,
      cost: getPlannerStockCostDefault('40x40', 1000),
    },
    {
      id: 'default-stock-40x40-2000',
      profileType: '40x40',
      lengthMm: 2000,
      cost: getPlannerStockCostDefault('40x40', 2000),
    },
  ],
};
