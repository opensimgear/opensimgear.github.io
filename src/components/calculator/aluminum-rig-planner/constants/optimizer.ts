/**
 * Cut-list optimizer defaults and cost estimation helpers.
 */

import type { CutListProfileType, PlannerOptimizationSettings, PlannerProfileShipping } from '../types';

/** Reference profile cross-section area used as the cost basis (mm²). */
const COST_REFERENCE_AREA_MM2 = 1600;
/** Maximum cost multiplier per meter of stock. */
const COST_MAX_MULTIPLIER_PER_METER = 30;
/** Default cost multiplier per meter of stock. */
const COST_DEFAULT_MULTIPLIER_PER_METER = 15;

/** Compute the cross-section area of a profile from its "WxH" type string (mm²). */
function getProfileAreaMm2(profileType: CutListProfileType) {
  const [widthMm, heightMm] = profileType.split('x').map(Number);
  return widthMm * heightMm;
}

/** Upper bound for the cost of a stock bar (used to clamp user input). */
export function getPlannerStockCostMax(profileType: CutListProfileType, lengthMm: number) {
  return (getProfileAreaMm2(profileType) / COST_REFERENCE_AREA_MM2) * COST_MAX_MULTIPLIER_PER_METER * (lengthMm / 1000);
}

/** Default estimated cost per stock bar. */
export function getPlannerStockCostDefault(profileType: CutListProfileType, lengthMm: number) {
  return (
    (getProfileAreaMm2(profileType) / COST_REFERENCE_AREA_MM2) * COST_DEFAULT_MULTIPLIER_PER_METER * (lengthMm / 1000)
  );
}

/** Default weight-per-meter for each profile type (used for shipping cost calculation). */
export const DEFAULT_PROFILE_WEIGHTS_KG_PER_METER: PlannerProfileShipping = {
  '40x40': 1.5,
  '80x40': 3.0,
};

/** Default optimization settings applied when no user overrides are present. */
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
