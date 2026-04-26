import {
  BASE_BEAM_HEIGHT_MM,
  DEFAULT_MONITOR_DISTANCE_FROM_EYES_MM,
  DEFAULT_PLANNER_OPTIMIZATION_SETTINGS,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  LEGACY_DEFAULT_MONITOR_MIDPOINT_X_MM,
  MONITOR_ASPECT_RATIO_OPTIONS,
  MONITOR_CURVATURE_OPTIONS,
  PLANNER_POSTURE_LIMITS,
  getPlannerStockCostMax,
} from './constants';
import { clampPlannerInput } from './geometry';
import { getMonitorTargetFovFromDistanceMm, getSolvedMonitorDistanceFromEyesMm } from './modules/monitor';
import type {
  PlannerInput,
  PlannerMonitorAspectRatio,
  PlannerMonitorCurvature,
  PlannerOptimizationSettings,
  PlannerPosturePreset,
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
  posture?: Partial<
    Omit<PlannerPostureSettings<PlannerPosturePreset>, 'preset' | 'monitorAspectRatio' | 'monitorCurvature'>
  > & {
    monitorAspectRatio?: unknown;
    monitorCurvature?: unknown;
    monitorMidpointXMm?: unknown;
    monitorMidpointYMm?: unknown;
    monitorMidpointZMm?: unknown;
    preset?: unknown;
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
    mode: state?.mode === 'cost' || state?.mode === 'waste' ? state.mode : defaults.mode,
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

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isMonitorAspectRatio(value: unknown): value is PlannerMonitorAspectRatio {
  return MONITOR_ASPECT_RATIO_OPTIONS.some((option) => option.value === value);
}

function isMonitorCurvature(value: unknown): value is PlannerMonitorCurvature {
  return MONITOR_CURVATURE_OPTIONS.some((option) => option.value === value);
}

function sanitizePostureSettings(state: PlannerQueryState['posture']) {
  const defaults = DEFAULT_PLANNER_POSTURE_SETTINGS;
  const preset =
    state?.preset === 'gt' ||
    state?.preset === 'rally' ||
    state?.preset === 'drift' ||
    state?.preset === 'road' ||
    state?.preset === 'custom'
      ? state.preset
      : defaults.preset;
  const monitorSizeIn = Math.round(
    clampNumber(
      readNumber(state?.monitorSizeIn, defaults.monitorSizeIn),
      PLANNER_POSTURE_LIMITS.monitorSizeMinIn,
      PLANNER_POSTURE_LIMITS.monitorSizeMaxIn
    )
  );
  const monitorAspectRatio = isMonitorAspectRatio(state?.monitorAspectRatio)
    ? state.monitorAspectRatio
    : defaults.monitorAspectRatio;
  const monitorCurvature = isMonitorCurvature(state?.monitorCurvature)
    ? state.monitorCurvature
    : defaults.monitorCurvature;
  const legacyViewpointXMm = LEGACY_DEFAULT_MONITOR_MIDPOINT_X_MM - DEFAULT_MONITOR_DISTANCE_FROM_EYES_MM;
  const stateMonitorDistanceFromEyesMm = state?.monitorDistanceFromEyesMm;
  const stateMonitorMidpointXMm = state?.monitorMidpointXMm;
  const hasLegacyMonitorDistance =
    isFiniteNumber(stateMonitorDistanceFromEyesMm) || isFiniteNumber(stateMonitorMidpointXMm);
  const rawMonitorDistanceFromEyesMm = isFiniteNumber(stateMonitorDistanceFromEyesMm)
    ? stateMonitorDistanceFromEyesMm
    : isFiniteNumber(stateMonitorMidpointXMm)
      ? stateMonitorMidpointXMm - legacyViewpointXMm
      : defaults.monitorDistanceFromEyesMm;
  const monitorDistanceFromEyesMm = clampNumber(
    rawMonitorDistanceFromEyesMm,
    PLANNER_POSTURE_LIMITS.monitorDistanceFromEyesMinMm,
    PLANNER_POSTURE_LIMITS.monitorDistanceFromEyesMaxMm
  );
  const rawMonitorTargetFovDeg = isFiniteNumber(state?.monitorTargetFovDeg)
    ? state.monitorTargetFovDeg
    : hasLegacyMonitorDistance
      ? getMonitorTargetFovFromDistanceMm(monitorDistanceFromEyesMm, { monitorAspectRatio, monitorSizeIn })
      : defaults.monitorTargetFovDeg;
  const monitorTargetFovDeg = clampNumber(
    rawMonitorTargetFovDeg,
    PLANNER_POSTURE_LIMITS.monitorTargetFovMinDeg,
    PLANNER_POSTURE_LIMITS.monitorTargetFovMaxDeg
  );
  const solvedMonitorDistanceFromEyesMm = getSolvedMonitorDistanceFromEyesMm({
    monitorAspectRatio,
    monitorCurvature,
    monitorSizeIn,
    monitorTargetFovDeg,
  });
  const legacyMonitorMidpointHeightMm = isFiniteNumber(state?.monitorMidpointZMm)
    ? state.monitorMidpointZMm
    : state?.monitorMidpointYMm;
  const monitorHeightFromBaseMm = isFiniteNumber(state?.monitorHeightFromBaseMm)
    ? state.monitorHeightFromBaseMm
    : isFiniteNumber(legacyMonitorMidpointHeightMm)
      ? legacyMonitorMidpointHeightMm - BASE_BEAM_HEIGHT_MM
      : defaults.monitorHeightFromBaseMm;

  return {
    preset,
    heightCm: clampNumber(
      readNumber(state?.heightCm, defaults.heightCm),
      PLANNER_POSTURE_LIMITS.heightMinCm,
      PLANNER_POSTURE_LIMITS.heightMaxCm
    ),
    showModel: typeof state?.showModel === 'boolean' ? state.showModel : defaults.showModel,
    showSkeleton: typeof state?.showSkeleton === 'boolean' ? state.showSkeleton : defaults.showSkeleton,
    monitorSizeIn,
    monitorAspectRatio,
    monitorCurvature,
    monitorTiltDeg: clampNumber(
      readNumber(state?.monitorTiltDeg, defaults.monitorTiltDeg),
      PLANNER_POSTURE_LIMITS.monitorTiltMinDeg,
      PLANNER_POSTURE_LIMITS.monitorTiltMaxDeg
    ),
    monitorTargetFovDeg,
    monitorDistanceFromEyesMm: clampNumber(
      solvedMonitorDistanceFromEyesMm,
      PLANNER_POSTURE_LIMITS.monitorDistanceFromEyesMinMm,
      PLANNER_POSTURE_LIMITS.monitorDistanceFromEyesMaxMm
    ),
    monitorHeightFromBaseMm: clampNumber(
      monitorHeightFromBaseMm,
      PLANNER_POSTURE_LIMITS.monitorHeightFromBaseMinMm,
      PLANNER_POSTURE_LIMITS.monitorHeightFromBaseMaxMm
    ),
  } satisfies PlannerPostureSettings<PlannerPosturePreset>;
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
    pedalLengthMm: readNumber(state.pedalLengthMm, defaultInput.pedalLengthMm),
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
