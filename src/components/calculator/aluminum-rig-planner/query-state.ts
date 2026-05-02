import {
  DEFAULT_HARDWARE_UNIT_COSTS,
  DEFAULT_PLANNER_OPTIMIZATION_SETTINGS,
  getPlannerStockCostMax,
} from './constants/optimizer';
import {
  BASE_FEET_TYPE_OPTIONS,
  DEFAULT_BASE_RUBBER_FEET_HEIGHT_MM,
  PLANNER_DIMENSION_LIMITS,
} from './constants/planner';
import {
  DEFAULT_MONITOR_DISTANCE_FROM_EYES_MM,
  DEFAULT_MONITOR_STAND_RUBBER_FEET_HEIGHT_MM,
  MONITOR_ARC_CENTER_AT_EYES_FALLBACK_CURVATURE,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  isMonitorArcCenterAtEyesCurvature,
  LEGACY_DEFAULT_MONITOR_MIDPOINT_X_MM,
  MONITOR_ASPECT_RATIO_OPTIONS,
  MONITOR_CURVATURE_OPTIONS,
  MONITOR_STAND_FEET_TYPE_OPTIONS,
  MONITOR_STAND_VARIANT_OPTIONS,
  MONITOR_VESA_OPTIONS,
  PLANNER_POSTURE_LIMITS,
} from './constants/posture';
import { BASE_BEAM_HEIGHT_MM } from './constants/profile';
import {
  type AluminumRigFolderExpandedState,
  type AluminumRigPaneExpandedState,
  getAluminumRigFolderExpandedState,
  getAluminumRigPaneExpandedState,
} from './constants/ui';
import {
  getArcCenterDistanceMm,
  getArcCenterFovDeg,
  getDefaultMonitorBottomVesaHoleDistanceMm,
  getMonitorTargetFovFromDistanceMm,
  getSolvedMonitorDistanceFromEyesMm,
} from './modules/monitor';
import { clampPlannerInput } from './scene/geometry';
import {
  clonePlannerPostureTargetRangesByPreset,
  getPlannerPostureTargetRangeControlLimits,
  PLANNER_POSTURE_TARGET_KEYS,
} from './posture/posture-targets';
import type {
  PlannerFeetType,
  PlannerInput,
  PlannerMonitorAspectRatio,
  PlannerMonitorCurvature,
  PlannerMonitorStandFeetType,
  PlannerMonitorStandVariant,
  PlannerMonitorVesaType,
  PlannerOptimizationSettings,
  PlannerPosturePreset,
  PlannerPostureSettings,
  PlannerPostureTargetKey,
  PlannerPostureTargetRange,
  PlannerPostureTargetRanges,
  PlannerPostureTargetRangesByPreset,
  PlannerStockOption,
  PlannerVisibleModules,
} from './types';

export type PlannerQueryState = Partial<Omit<PlannerInput, 'baseFeetType'>> & {
  baseFeetType?: unknown;
  wheelRadiusMm?: unknown;
  optimizer?: Partial<
    Omit<
      PlannerOptimizationSettings,
      'mode' | 'currencyMode' | 'shippingMode' | 'profileWeightsKgPerMeter' | 'hardwareUnitCosts' | 'stockOptions'
    >
  > & {
    mode?: unknown;
    currencyMode?: unknown;
    shippingMode?: unknown;
    profileWeightsKgPerMeter?: {
      '40x40'?: unknown;
      '80x40'?: unknown;
    };
    hardwareUnitCosts?: {
      rubberFeet?: unknown;
    };
    stockOptions?: Array<{
      id?: unknown;
      profileType?: unknown;
      lengthMm?: unknown;
      cost?: unknown;
    }>;
  };
  posture?: Partial<
    Omit<
      PlannerPostureSettings<PlannerPosturePreset>,
      'preset' | 'monitorAspectRatio' | 'monitorCurvature' | 'targetRangesByPreset'
    >
  > & {
    monitorAspectRatio?: unknown;
    monitorCurvature?: unknown;
    monitorStandFeetType?: unknown;
    monitorStandVariant?: unknown;
    monitorStandIntegratedPlateLengthMm?: unknown;
    monitorVesaType?: unknown;
    monitorMidpointXMm?: unknown;
    monitorMidpointYMm?: unknown;
    monitorMidpointZMm?: unknown;
    monitorTripleScreen?: unknown;
    monitorArcCenterAtEyes?: unknown;
    monitorContinuousCurve?: unknown;
    preset?: unknown;
    targetRangesByPreset?: unknown;
  };
  modules?: Partial<Record<keyof PlannerVisibleModules, unknown>>;
  ui?: {
    panes?: Partial<Record<keyof AluminumRigPaneExpandedState, unknown>>;
    folders?: Partial<Record<keyof AluminumRigFolderExpandedState, unknown>>;
    stockOptions?: Record<string, unknown>;
  };
};

let stockOptionIdSequence = 0;
const BLADE_THICKNESS_MIN_MM = 0.5;
const BLADE_THICKNESS_MAX_MM = 5;
const BLADE_THICKNESS_STEP_MM = 0.1;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
    hardwareUnitCosts: {
      rubberFeet: readNonNegativeNumber(
        state?.hardwareUnitCosts?.rubberFeet,
        defaults.hardwareUnitCosts.rubberFeet ?? DEFAULT_HARDWARE_UNIT_COSTS.rubberFeet
      ),
    },
    stockOptions: sanitizeStockOptions(state, defaults.stockOptions),
  } satisfies PlannerOptimizationSettings;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sanitizePostureTargetRange(
  value: unknown,
  fallback: PlannerPostureTargetRange,
  preset: PlannerPosturePreset,
  key: PlannerPostureTargetKey
): PlannerPostureTargetRange {
  const sourceMin = Array.isArray(value) ? value[0] : isRecord(value) ? value.min : undefined;
  const sourceMax = Array.isArray(value) ? value[1] : isRecord(value) ? value.max : undefined;
  const limits = getPlannerPostureTargetRangeControlLimits(preset, key);
  const rawMin = readNumber(sourceMin, fallback.min);
  const rawMax = readNumber(sourceMax, fallback.max);

  return {
    min: clampNumber(Math.min(rawMin, rawMax), limits.min, limits.max),
    max: clampNumber(Math.max(rawMin, rawMax), limits.min, limits.max),
  };
}

function sanitizePostureTargetRanges(
  value: unknown,
  fallback: PlannerPostureTargetRanges,
  preset: PlannerPosturePreset
): PlannerPostureTargetRanges {
  const source = isRecord(value) ? value : {};

  return Object.fromEntries(
    PLANNER_POSTURE_TARGET_KEYS.map((key) => [key, sanitizePostureTargetRange(source[key], fallback[key], preset, key)])
  ) as PlannerPostureTargetRanges;
}

function sanitizePostureTargetRangesByPreset(value: unknown): PlannerPostureTargetRangesByPreset {
  const defaults = DEFAULT_PLANNER_POSTURE_SETTINGS.targetRangesByPreset;
  const source = isRecord(value) ? value : {};
  const presets = ['gt', 'rally', 'drift', 'road', 'custom'] as const satisfies PlannerPosturePreset[];

  return Object.fromEntries(
    presets.map((preset) => [preset, sanitizePostureTargetRanges(source[preset], defaults[preset], preset)])
  ) as PlannerPostureTargetRangesByPreset;
}

function isMonitorAspectRatio(value: unknown): value is PlannerMonitorAspectRatio {
  return MONITOR_ASPECT_RATIO_OPTIONS.some((option) => option.value === value);
}

function isMonitorCurvature(value: unknown): value is PlannerMonitorCurvature {
  return MONITOR_CURVATURE_OPTIONS.some((option) => option.value === value);
}

function isMonitorVesaType(value: unknown): value is PlannerMonitorVesaType {
  return MONITOR_VESA_OPTIONS.some((option) => option.value === value);
}

function isMonitorStandFeetType(value: unknown): value is PlannerMonitorStandFeetType {
  return MONITOR_STAND_FEET_TYPE_OPTIONS.some((option) => option.value === value);
}

function isMonitorStandVariant(value: unknown): value is PlannerMonitorStandVariant {
  return MONITOR_STAND_VARIANT_OPTIONS.some((option) => option.value === value);
}

function isFeetType(value: unknown): value is PlannerFeetType {
  return BASE_FEET_TYPE_OPTIONS.some((option) => option.value === value);
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
  const defaultMonitorBottomVesaHoleDistanceMm = getDefaultMonitorBottomVesaHoleDistanceMm({
    monitorAspectRatio,
    monitorSizeIn,
  });
  const rawMonitorCurvature = isMonitorCurvature(state?.monitorCurvature)
    ? state.monitorCurvature
    : defaults.monitorCurvature;
  const monitorTripleScreen =
    typeof state?.monitorTripleScreen === 'boolean' ? state.monitorTripleScreen : defaults.monitorTripleScreen;
  const legacyMonitorContinuousCurve = state?.monitorContinuousCurve;
  const rawMonitorArcCenterAtEyes =
    typeof state?.monitorArcCenterAtEyes === 'boolean'
      ? state.monitorArcCenterAtEyes
      : typeof legacyMonitorContinuousCurve === 'boolean'
        ? legacyMonitorContinuousCurve
        : defaults.monitorArcCenterAtEyes;
  const canUseArcCenterAtEyes = monitorTripleScreen && rawMonitorArcCenterAtEyes;
  const monitorCurvature =
    canUseArcCenterAtEyes && !isMonitorArcCenterAtEyesCurvature(rawMonitorCurvature)
      ? MONITOR_ARC_CENTER_AT_EYES_FALLBACK_CURVATURE
      : rawMonitorCurvature;
  const monitorArcCenterAtEyes = canUseArcCenterAtEyes && monitorCurvature !== 'disabled';
  const shouldArcCenterAtEyes = monitorArcCenterAtEyes;
  const monitorVesaType = isMonitorVesaType(state?.monitorVesaType) ? state.monitorVesaType : defaults.monitorVesaType;
  const monitorTiltDeg = monitorTripleScreen
    ? 0
    : clampNumber(
        readNumber(state?.monitorTiltDeg, defaults.monitorTiltDeg),
        PLANNER_POSTURE_LIMITS.monitorTiltMinDeg,
        PLANNER_POSTURE_LIMITS.monitorTiltMaxDeg
      );
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
      ? getMonitorTargetFovFromDistanceMm(monitorDistanceFromEyesMm, {
          monitorAspectRatio,
          monitorCurvature,
          monitorSizeIn,
        })
      : defaults.monitorTargetFovDeg;
  const arcCenterFovDeg = shouldArcCenterAtEyes
    ? getArcCenterFovDeg({
        monitorAspectRatio,
        monitorCurvature,
        monitorSizeIn,
      })
    : null;
  const monitorTargetFovDeg =
    arcCenterFovDeg ??
    clampNumber(
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
  const arcCenterDistanceMm = shouldArcCenterAtEyes
    ? getArcCenterDistanceMm({
        monitorAspectRatio,
        monitorCurvature,
        monitorSizeIn,
      })
    : null;
  const legacyMonitorMidpointHeightMm = isFiniteNumber(state?.monitorMidpointZMm)
    ? state.monitorMidpointZMm
    : state?.monitorMidpointYMm;
  const monitorHeightFromBaseMm = isFiniteNumber(state?.monitorHeightFromBaseMm)
    ? state.monitorHeightFromBaseMm
    : isFiniteNumber(legacyMonitorMidpointHeightMm)
      ? legacyMonitorMidpointHeightMm - BASE_BEAM_HEIGHT_MM
      : defaults.monitorHeightFromBaseMm;
  const monitorStandFeetType = isMonitorStandFeetType(state?.monitorStandFeetType)
    ? state.monitorStandFeetType
    : defaults.monitorStandFeetType;
  const monitorStandFeetHeightMm =
    monitorStandFeetType === 'none'
      ? 0
      : clampNumber(
          readNumber(state?.monitorStandFeetHeightMm, DEFAULT_MONITOR_STAND_RUBBER_FEET_HEIGHT_MM),
          PLANNER_POSTURE_LIMITS.monitorStandFeetHeightMinMm,
          PLANNER_POSTURE_LIMITS.monitorStandFeetHeightMaxMm
        );
  const rawMonitorStandVariant = isMonitorStandVariant(state?.monitorStandVariant)
    ? state.monitorStandVariant
    : defaults.monitorStandVariant;
  const monitorStandVariant =
    rawMonitorStandVariant === 'integrated' && monitorSizeIn > 32 ? 'freestand' : rawMonitorStandVariant;

  return {
    preset,
    advanced: typeof state?.advanced === 'boolean' ? state.advanced : defaults.advanced,
    heightCm: clampNumber(
      readNumber(state?.heightCm, defaults.heightCm),
      PLANNER_POSTURE_LIMITS.heightMinCm,
      PLANNER_POSTURE_LIMITS.heightMaxCm
    ),
    showModel: typeof state?.showModel === 'boolean' ? state.showModel : defaults.showModel,
    showSkeleton: typeof state?.showSkeleton === 'boolean' ? state.showSkeleton : defaults.showSkeleton,
    targetRangesByPreset: isRecord(state)
      ? sanitizePostureTargetRangesByPreset(state.targetRangesByPreset)
      : clonePlannerPostureTargetRangesByPreset(defaults.targetRangesByPreset),
    monitorSizeIn,
    monitorAspectRatio,
    monitorCurvature,
    monitorTiltDeg,
    monitorTargetFovDeg,
    monitorDistanceFromEyesMm: clampNumber(
      arcCenterDistanceMm ?? solvedMonitorDistanceFromEyesMm,
      PLANNER_POSTURE_LIMITS.monitorDistanceFromEyesMinMm,
      Math.max(PLANNER_POSTURE_LIMITS.monitorDistanceFromEyesMaxMm, arcCenterDistanceMm ?? 0)
    ),
    monitorHeightFromBaseMm: clampNumber(
      monitorHeightFromBaseMm,
      PLANNER_POSTURE_LIMITS.monitorHeightFromBaseMinMm,
      PLANNER_POSTURE_LIMITS.monitorHeightFromBaseMaxMm
    ),
    monitorTripleScreen,
    monitorArcCenterAtEyes,
    monitorVesaType,
    monitorStandVariant,
    monitorStandIntegratedPlateLengthMm: clampNumber(
      readNumber(state?.monitorStandIntegratedPlateLengthMm, defaults.monitorStandIntegratedPlateLengthMm),
      PLANNER_POSTURE_LIMITS.monitorStandIntegratedPlateLengthMinMm,
      PLANNER_POSTURE_LIMITS.monitorStandIntegratedPlateLengthMaxMm
    ),
    monitorBottomVesaHoleDistanceMm: clampNumber(
      readNumber(state?.monitorBottomVesaHoleDistanceMm, defaultMonitorBottomVesaHoleDistanceMm),
      PLANNER_POSTURE_LIMITS.monitorBottomVesaHoleDistanceMinMm,
      PLANNER_POSTURE_LIMITS.monitorBottomVesaHoleDistanceMaxMm
    ),
    monitorBottomVesaHolesToCrossBeamTopMm: clampNumber(
      readNumber(state?.monitorBottomVesaHolesToCrossBeamTopMm, defaults.monitorBottomVesaHolesToCrossBeamTopMm),
      PLANNER_POSTURE_LIMITS.monitorBottomVesaHolesToCrossBeamTopMinMm,
      PLANNER_POSTURE_LIMITS.monitorBottomVesaHolesToCrossBeamTopMaxMm
    ),
    monitorStandLegExtraMarginMm: clampNumber(
      readNumber(state?.monitorStandLegExtraMarginMm, defaults.monitorStandLegExtraMarginMm),
      PLANNER_POSTURE_LIMITS.monitorStandLegExtraMarginMinMm,
      PLANNER_POSTURE_LIMITS.monitorStandLegExtraMarginMaxMm
    ),
    monitorStandFootLengthMm: clampNumber(
      readNumber(state?.monitorStandFootLengthMm, defaults.monitorStandFootLengthMm),
      PLANNER_POSTURE_LIMITS.monitorStandFootLengthMinMm,
      PLANNER_POSTURE_LIMITS.monitorStandFootLengthMaxMm
    ),
    monitorStandFeetType,
    monitorStandFeetHeightMm,
  } satisfies PlannerPostureSettings<PlannerPosturePreset>;
}

function sanitizeVisibleModules(state: PlannerQueryState['modules']): PlannerVisibleModules {
  const monitor = typeof state?.monitor === 'boolean' ? state.monitor : true;
  const monitorStand = monitor && typeof state?.monitorStand === 'boolean' ? state.monitorStand : false;

  return {
    monitor,
    monitorStand,
  };
}

function sanitizeBooleanState<TState extends Record<string, boolean>>(state: unknown, defaults: TState): TState {
  const source = isRecord(state) ? state : {};

  return Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [key, typeof source[key] === 'boolean' ? source[key] : fallback])
  ) as TState;
}

function sanitizeUiState(state: PlannerQueryState['ui']) {
  const stockOptions = isRecord(state?.stockOptions)
    ? Object.fromEntries(
        Object.entries(state.stockOptions).flatMap(([key, value]) =>
          typeof value === 'boolean' && key.length > 0 ? [[key, value]] : []
        )
      )
    : {};

  return {
    paneExpanded: sanitizeBooleanState(state?.panes, getAluminumRigPaneExpandedState(false)),
    folderExpanded: sanitizeBooleanState(state?.folders, getAluminumRigFolderExpandedState()),
    stockOptionFolderExpanded: stockOptions,
  };
}

export function mergePlannerQueryState(defaultInput: PlannerInput, state: PlannerQueryState) {
  const rawBaseFeetHeightMm = readNumber(state.baseFeetHeightMm, defaultInput.baseFeetHeightMm);
  const baseFeetType = isFeetType(state.baseFeetType)
    ? state.baseFeetType
    : rawBaseFeetHeightMm > 0
      ? 'rubber'
      : defaultInput.baseFeetType;
  const plannerInput = clampPlannerInput({
    baseLengthMm: readNumber(state.baseLengthMm, defaultInput.baseLengthMm),
    baseWidthMm: readNumber(state.baseWidthMm, defaultInput.baseWidthMm),
    baseFeetType,
    baseFeetHeightMm:
      baseFeetType === 'none'
        ? 0
        : clampNumber(
            readNumber(state.baseFeetHeightMm, DEFAULT_BASE_RUBBER_FEET_HEIGHT_MM),
            PLANNER_DIMENSION_LIMITS.baseFeetHeightMinMm,
            PLANNER_DIMENSION_LIMITS.baseFeetHeightMaxMm
          ),
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
    visibleModules: sanitizeVisibleModules(state.modules),
    uiState: sanitizeUiState(state.ui),
  };
}
