import {
  ANTHROPOMETRY_LENGTH_LIMITS_MM,
  DEFAULT_ANTHROPOMETRY_LENGTHS_MM,
  DEFAULT_POSTURE_HEIGHT_CM,
  DEFAULT_PLANNER_OPTIMIZATION_SETTINGS,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  PLANNER_POSTURE_LIMITS,
  getPlannerStockCostMax,
} from './constants';
import { clampPlannerInput } from './geometry';
import type {
  PlannerAnthropometryRatios,
  PlannerInput,
  PlannerOptimizationSettings,
  PlannerPostureSettings,
  PlannerStockOption,
} from './types';

export type PlannerQueryState = Partial<PlannerInput> & {
  wheelRadiusMm?: unknown;
  optimizer?: Partial<
    Omit<
      PlannerOptimizationSettings,
      'mode' | 'currencyMode' | 'shippingMode' | 'profileWeightsKgPerMeter' | 'stockOptions'
    >
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
  posture?: Partial<Omit<PlannerPostureSettings, 'preset' | 'ratios'>> & {
    preset?: unknown;
    ratios?: Partial<Record<keyof PlannerAnthropometryRatios, unknown>>;
  };
};

let stockOptionIdSequence = 0;
const BLADE_THICKNESS_MIN_MM = 0.5;
const BLADE_THICKNESS_MAX_MM = 5;
const BLADE_THICKNESS_STEP_MM = 0.1;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readNumber(value: unknown, fallback: number) {
  return isFiniteNumber(value) ? value : fallback;
}

function readNonNegativeNumber(value: unknown, fallback: number) {
  return Math.max(0, readNumber(value, fallback));
}

function clampBladeThicknessMm(value: number) {
  const roundedValue = Math.round(value / BLADE_THICKNESS_STEP_MM) * BLADE_THICKNESS_STEP_MM;

  return Number(Math.min(BLADE_THICKNESS_MAX_MM, Math.max(BLADE_THICKNESS_MIN_MM, roundedValue)).toFixed(1));
}

function isStockProfileType(value: unknown): value is PlannerStockOption['profileType'] {
  return value === '40x40' || value === '80x40';
}

function createStockOptionId() {
  stockOptionIdSequence += 1;
  return `planner-stock-option-${stockOptionIdSequence}`;
}

function sanitizeStockOptions(
  state: PlannerQueryState['optimizer'],
  defaults: PlannerOptimizationSettings['stockOptions']
) {
  const stockOptions = state?.stockOptions;

  if (!Array.isArray(stockOptions)) {
    return defaults.map((option) => ({ ...option }));
  }

  return stockOptions.flatMap((option) => {
    if (!option || !isStockProfileType(option.profileType)) {
      return [];
    }

    const lengthMm = readNonNegativeNumber(option.lengthMm, 0);
    const cost = Math.min(readNonNegativeNumber(option.cost, 0), getPlannerStockCostMax(option.profileType, lengthMm));

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
    currencyMode:
      state?.currencyMode === 'eur' || state?.currencyMode === 'usd' ? state.currencyMode : defaults.currencyMode,
    bladeThicknessMm: clampBladeThicknessMm(readNumber(state?.bladeThicknessMm, defaults.bladeThicknessMm)),
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

function sanitizeAnthropometryLength(key: keyof PlannerAnthropometryRatios, value: unknown) {
  const fallback = DEFAULT_ANTHROPOMETRY_LENGTHS_MM[key];
  const nextValue = readNumber(value, fallback);
  const migratedValue =
    nextValue <= PLANNER_POSTURE_LIMITS.ratioMax ? nextValue * DEFAULT_POSTURE_HEIGHT_CM * 10 : nextValue;
  const limits = ANTHROPOMETRY_LENGTH_LIMITS_MM[key];

  return Number(clampNumber(migratedValue, limits.min, limits.max).toFixed(1));
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sanitizePostureSettings(state: PlannerQueryState['posture']) {
  const defaults = DEFAULT_PLANNER_POSTURE_SETTINGS;

  return {
    preset:
      state?.preset === 'formula' || state?.preset === 'gt' || state?.preset === 'rally' || state?.preset === 'road'
        ? state.preset
        : defaults.preset,
    heightCm: clampNumber(
      readNumber(state?.heightCm, defaults.heightCm),
      PLANNER_POSTURE_LIMITS.heightMinCm,
      PLANNER_POSTURE_LIMITS.heightMaxCm
    ),
    showModel: typeof state?.showModel === 'boolean' ? state.showModel : defaults.showModel,
    showSkeleton: typeof state?.showSkeleton === 'boolean' ? state.showSkeleton : defaults.showSkeleton,
    advancedAnthropometry:
      typeof state?.advancedAnthropometry === 'boolean' ? state.advancedAnthropometry : defaults.advancedAnthropometry,
    ratios: {
      sittingHeight: sanitizeAnthropometryLength('sittingHeight', state?.ratios?.sittingHeight),
      seatedEyeHeight: sanitizeAnthropometryLength('seatedEyeHeight', state?.ratios?.seatedEyeHeight),
      seatedShoulderHeight: sanitizeAnthropometryLength('seatedShoulderHeight', state?.ratios?.seatedShoulderHeight),
      hipBreadth: sanitizeAnthropometryLength('hipBreadth', state?.ratios?.hipBreadth),
      shoulderBreadth: sanitizeAnthropometryLength('shoulderBreadth', state?.ratios?.shoulderBreadth),
      upperArmLength: sanitizeAnthropometryLength('upperArmLength', state?.ratios?.upperArmLength),
      forearmHandLength: sanitizeAnthropometryLength('forearmHandLength', state?.ratios?.forearmHandLength),
      thighLength: sanitizeAnthropometryLength('thighLength', state?.ratios?.thighLength),
      lowerLegLength: sanitizeAnthropometryLength('lowerLegLength', state?.ratios?.lowerLegLength),
      footLength: sanitizeAnthropometryLength('footLength', state?.ratios?.footLength),
    },
  } satisfies PlannerPostureSettings;
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
    pedalsHeightMm: readNumber(state.pedalsHeightMm, defaultInput.pedalsHeightMm),
    pedalsDeltaMm: readNumber(state.pedalsDeltaMm, defaultInput.pedalsDeltaMm),
    pedalAngleDeg: readNumber(state.pedalAngleDeg, defaultInput.pedalAngleDeg),
    pedalAcceleratorDeltaMm: readNumber(state.pedalAcceleratorDeltaMm, defaultInput.pedalAcceleratorDeltaMm),
    pedalBrakeDeltaMm: readNumber(state.pedalBrakeDeltaMm, defaultInput.pedalBrakeDeltaMm),
    pedalClutchDeltaMm: readNumber(state.pedalClutchDeltaMm, defaultInput.pedalClutchDeltaMm),
    steeringColumnDistanceMm: readNumber(state.steeringColumnDistanceMm, defaultInput.steeringColumnDistanceMm),
    steeringColumnBaseHeightMm: readNumber(state.steeringColumnBaseHeightMm, defaultInput.steeringColumnBaseHeightMm),
    steeringColumnHeightMm: readNumber(state.steeringColumnHeightMm, defaultInput.steeringColumnHeightMm),
    wheelHeightOffsetMm: readNumber(state.wheelHeightOffsetMm, defaultInput.wheelHeightOffsetMm),
    wheelAngleDeg: readNumber(state.wheelAngleDeg, defaultInput.wheelAngleDeg),
    wheelDistanceFromSteeringColumnMm: readNumber(
      state.wheelDistanceFromSteeringColumnMm,
      defaultInput.wheelDistanceFromSteeringColumnMm
    ),
    wheelDiameterMm: readNumber(
      state.wheelDiameterMm,
      isFiniteNumber(state.wheelRadiusMm) ? state.wheelRadiusMm * 2 : defaultInput.wheelDiameterMm
    ),
  });

  return {
    plannerInput,
    optimizationSettings: sanitizeOptimizationSettings(state.optimizer),
    postureSettings: sanitizePostureSettings(state.posture),
  };
}
