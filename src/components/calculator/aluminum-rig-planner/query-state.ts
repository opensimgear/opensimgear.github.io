import { DEFAULT_PLANNER_OPTIMIZATION_SETTINGS, getPlannerStockCostMax } from './constants';
import { clampPlannerInput } from './geometry';
import type { PlannerInput, PlannerOptimizationSettings, PlannerStockOption } from './types';

export type PlannerQueryState = Partial<PlannerInput> & {
  optimizer?: Partial<
    Omit<PlannerOptimizationSettings, 'mode' | 'currencyMode' | 'shippingMode' | 'profileWeightsKgPerMeter' | 'stockOptions'>
  > & {
    mode?: unknown;
    currencyMode?: unknown;
    shippingMode?: unknown;
    profileWeightsKgPerMeter?: {
      '40x40'?: unknown;
      '80x40'?: unknown;
    };
    stockOptions?: Array<{
      id?: unknown;
      profileType?: unknown;
      lengthMm?: unknown;
      cost?: unknown;
    }>;
  };
};

let stockOptionIdSequence = 0;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readNumber(value: unknown, fallback: number) {
  return isFiniteNumber(value) ? value : fallback;
}

function readNonNegativeNumber(value: unknown, fallback: number) {
  return Math.max(0, readNumber(value, fallback));
}

function isStockProfileType(value: unknown): value is PlannerStockOption['profileType'] {
  return value === '40x40' || value === '80x40';
}

function createStockOptionId() {
  stockOptionIdSequence += 1;
  return `planner-stock-option-${stockOptionIdSequence}`;
}

function sanitizeStockOptions(state: PlannerQueryState['optimizer'], defaults: PlannerOptimizationSettings['stockOptions']) {
  const stockOptions = state?.stockOptions;

  if (!Array.isArray(stockOptions)) {
    return defaults.map((option) => ({ ...option }));
  }

  return stockOptions.flatMap((option) => {
    if (!option || !isStockProfileType(option.profileType)) {
      return [];
    }

    const lengthMm = readNonNegativeNumber(option.lengthMm, 0);
    const cost = Math.min(
      readNonNegativeNumber(option.cost, 0),
      getPlannerStockCostMax(option.profileType, lengthMm)
    );

    if (lengthMm <= 0 || cost < 0) {
      return [];
    }

    return [
      {
        id: typeof option.id === 'string' && option.id.length > 0 ? option.id : createStockOptionId(),
        profileType: option.profileType,
        lengthMm,
        cost,
      },
    ];
  });
}

function sanitizeOptimizationSettings(state: PlannerQueryState['optimizer']) {
  const defaults = DEFAULT_PLANNER_OPTIMIZATION_SETTINGS;

  return {
    mode: state?.mode === 'waste' ? 'waste' : defaults.mode,
    currencyMode: state?.currencyMode === 'eur' || state?.currencyMode === 'usd' ? state.currencyMode : defaults.currencyMode,
    bladeThicknessMm: Math.max(1, Math.round(readNumber(state?.bladeThicknessMm, defaults.bladeThicknessMm))),
    safetyMarginMm: Math.max(0, Math.round(readNumber(state?.safetyMarginMm, defaults.safetyMarginMm))),
    shippingMode: state?.shippingMode === 'per-kg' ? 'per-kg' : defaults.shippingMode,
    flatShippingCost: readNonNegativeNumber(state?.flatShippingCost, defaults.flatShippingCost),
    shippingRatePerKg: readNonNegativeNumber(state?.shippingRatePerKg, defaults.shippingRatePerKg),
    profileWeightsKgPerMeter: {
      '40x40': readNonNegativeNumber(
        state?.profileWeightsKgPerMeter?.['40x40'],
        defaults.profileWeightsKgPerMeter['40x40']
      ),
      '80x40': readNonNegativeNumber(
        state?.profileWeightsKgPerMeter?.['80x40'],
        defaults.profileWeightsKgPerMeter['80x40']
      ),
    },
    stockOptions: sanitizeStockOptions(state, defaults.stockOptions),
  } satisfies PlannerOptimizationSettings;
}

export function mergePlannerQueryState(defaultInput: PlannerInput, state: PlannerQueryState) {
  const plannerInput = clampPlannerInput({
    baseLengthMm: readNumber(state.baseLengthMm, defaultInput.baseLengthMm),
    baseWidthMm: readNumber(state.baseWidthMm, defaultInput.baseWidthMm),
    seatBaseDepthMm: readNumber(state.seatBaseDepthMm, defaultInput.seatBaseDepthMm),
    baseInnerBeamSpacingMm: readNumber(state.baseInnerBeamSpacingMm, defaultInput.baseInnerBeamSpacingMm),
    seatLengthMm: readNumber(state.seatLengthMm, defaultInput.seatLengthMm),
    seatDeltaMm: readNumber(state.seatDeltaMm, defaultInput.seatDeltaMm),
    seatHeightFromBaseInnerBeamsMm: readNumber(
      state.seatHeightFromBaseInnerBeamsMm,
      defaultInput.seatHeightFromBaseInnerBeamsMm
    ),
    seatAngleDeg: readNumber(state.seatAngleDeg, defaultInput.seatAngleDeg),
    backrestAngleDeg: readNumber(state.backrestAngleDeg, defaultInput.backrestAngleDeg),
    pedalTrayDepthMm: readNumber(state.pedalTrayDepthMm, defaultInput.pedalTrayDepthMm),
    pedalTrayDistanceMm: readNumber(state.pedalTrayDistanceMm, defaultInput.pedalTrayDistanceMm),
    steeringColumnDistanceMm: readNumber(state.steeringColumnDistanceMm, defaultInput.steeringColumnDistanceMm),
    steeringColumnBaseHeightMm: readNumber(state.steeringColumnBaseHeightMm, defaultInput.steeringColumnBaseHeightMm),
    steeringColumnHeightMm: readNumber(state.steeringColumnHeightMm, defaultInput.steeringColumnHeightMm),
  });

  return {
    plannerInput,
    optimizationSettings: sanitizeOptimizationSettings(state.optimizer),
  };
}
