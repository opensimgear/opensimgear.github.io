<script lang="ts">
  import { type Component, onMount, tick } from 'svelte';
  import {
    Button,
    Checkbox,
    Color,
    Element,
    Folder,
    IntervalSlider,
    type IntervalSliderValue,
    List,
    Pane,
    Slider,
  } from 'svelte-tweakpane-ui';

  import {
    DEFAULT_CURRENCY_LOCALE,
    formatPlannerMoney,
    resolvePlannerCurrency,
    resolvePlannerLocale,
  } from './cut-list/currency';
  import { createDebouncedUrlStateWriter } from '../shared/debounced-url-state';
  import { decodeQueryState, encodeQueryState } from '../shared/query-state';
  import { getMonitorStandLayoutMm } from '~/components/calculator/aluminum-rig-planner/modules/monitor-stand';
  import { createPlannerHardwareSummaryRows } from '~/components/calculator/aluminum-rig-planner/cut-list/hardware';
  import CutOptimizerPanel from './cut-list/CutOptimizerPanel.svelte';
  import { createPlannerCutListEntries } from './cut-list/cut-list';
  import { COLOR_MODE_OPTIONS, DEFAULT_CUSTOM_PROFILE_COLOR } from './constants/scene';
  import {
    DEFAULT_ACTIVE_POSTURE_PRESET,
    DEFAULT_MONITOR_STAND_RUBBER_FEET_HEIGHT_MM,
    DEFAULT_PLANNER_POSTURE_SETTINGS,
    DEFAULT_POSTURE_HEIGHT_CM,
    isMonitorArcCenterAtEyesCurvature,
    MONITOR_ASPECT_RATIO_OPTIONS,
    MONITOR_ARC_CENTER_AT_EYES_CURVATURE_OPTIONS,
    MONITOR_ARC_CENTER_AT_EYES_FALLBACK_CURVATURE,
    MONITOR_CURVATURE_OPTIONS,
    MONITOR_STAND_FEET_TYPE_OPTIONS,
    MONITOR_VESA_OPTIONS,
    PLANNER_POSTURE_LIMITS,
    POSTURE_PRESET_OPTIONS,
  } from './constants/posture';
  import {
    DEFAULT_PLANNER_OPTIMIZATION_SETTINGS,
    getPlannerStockCostDefault,
    getPlannerStockCostMax,
  } from './constants/optimizer';
  import {
    BASE_FEET_TYPE_OPTIONS,
    DEFAULT_BASE_RUBBER_FEET_HEIGHT_MM,
    DEFAULT_PLANNER_INPUT,
    PLANNER_CONTROL_STEP_MM,
    PLANNER_DIMENSION_LIMITS,
    PLANNER_LAYOUT,
    URL_STATE_DEBOUNCE_MS,
  } from './constants/planner';
  import type { PlannerGeometry } from './scene/geometry';
  import {
    clampSteeringColumnHeights,
    derivePlannerGeometry,
    getPedalAcceleratorDeltaMaxMm,
    getPedalBrakeDeltaMaxMm,
    getPedalClutchDeltaMaxMm,
    getPedalTrayDistanceMaxMm,
    getPedalTrayDistanceMinMm,
    getSteeringColumnBaseHeightMaxMm,
    getSteeringColumnDistanceMaxMm,
  } from './scene/geometry';
  import {
    createPlannerMeasurementOverlay,
    type PlannerMeasurementKey,
    type PlannerMeasurementOverlay,
  } from './scene/measurement-overlay';
  import {
    getArcCenterDistanceMm,
    getArcCenterFovDeg,
    getDefaultMonitorBottomVesaHoleDistanceMm,
    getMonitorTargetFovFromDistanceMm,
    getSolvedMonitorDistanceFromEyesMm,
  } from './modules/monitor';
  import { loadPrebuiltProfileGeometries } from './modules/profile-geometry';
  import { createPlannerOptimizationResult } from './cut-list/optimizer';
  import {
    createPlannerPostureReport,
    type PlannerPostureMetric,
    type PlannerPostureReport,
  } from './posture/posture-report';
  import {
    clonePlannerPostureTargetRangesByPreset,
    getPlannerPostureTargetRangeControlLimits,
  } from './posture/posture-targets';
  import {
    applyPresetToPlannerInput,
    applyPresetToPostureSettings,
    createPresetPlannerInput,
    getPresetAfterPlannerInputEdit,
    isPresetSolvablePreset,
    recomputePresetDynamicPlannerInput,
  } from './posture/presets';
  import { mergePlannerQueryState, type PlannerQueryState } from './query-state';
  import {
    type AluminumRigPaneExpandedState,
    getAluminumRigPaneExpandedState,
    getNextAluminumRigPaneExpandedState,
    isNarrowAluminumRigViewport,
  } from './constants/ui';
  import { BLACK_PROFILE_COLOR, SILVER_PROFILE_COLOR } from './modules/shared';
  import { createRiggedHumanModel, type RiggedHumanModel } from './posture/human-model-rig';
  import type {
    CutListProfileType,
    PlannerFeetType,
    PlannerCurrencyCode,
    PlannerHardwareType,
    PlannerInput,
    PlannerMonitorAspectRatio,
    PlannerMonitorCurvature,
    PlannerMonitorStandFeetType,
    PlannerMonitorVesaType,
    PlannerOptimizationSettings,
    PlannerPosturePreset,
    PlannerPostureSettings,
    PlannerPostureTargetKey,
    PlannerPostureTargetRange,
    PlannerVisibleModules,
  } from './types';

  type PlannerSceneComponent = Component<{
    geometry: PlannerGeometry;
    highlightedBeamIds: string[];
    isNarrowViewport?: boolean;
    measurementOverlay?: PlannerMeasurementOverlay | null;
    profileColor: string;
    humanModel: RiggedHumanModel;
    postureReport: PlannerPostureReport;
    postureSettings: PlannerPostureSettings<PlannerPosturePreset>;
    showEndCaps: boolean;
    visibleModules: PlannerVisibleModules;
    onOptimizePosture: () => void;
  }>;

  const STATE_KEY = 'state';
  const MEASUREMENT_OVERLAY_TIMEOUT_MS = 1000;
  const POSTURE_HEIGHT_COMMIT_DEBOUNCE_MS = 180;
  const POSTURE_TRANSITION_DURATION_MS = 320;
  const debouncedUrlStateWriter = createDebouncedUrlStateWriter(URL_STATE_DEBOUNCE_MS);

  const DEFAULT_INPUT: PlannerInput = { ...DEFAULT_PLANNER_INPUT };
  const DEFAULT_OPTIMIZATION_SETTINGS: PlannerOptimizationSettings = {
    ...DEFAULT_PLANNER_OPTIMIZATION_SETTINGS,
    profileWeightsKgPerMeter: { ...DEFAULT_PLANNER_OPTIMIZATION_SETTINGS.profileWeightsKgPerMeter },
    stockOptions: DEFAULT_PLANNER_OPTIMIZATION_SETTINGS.stockOptions.map((option) => ({ ...option })),
  };
  const DEFAULT_POSTURE_SETTINGS: PlannerPostureSettings<PlannerPosturePreset> = {
    ...DEFAULT_PLANNER_POSTURE_SETTINGS,
    targetRangesByPreset: clonePlannerPostureTargetRangesByPreset(
      DEFAULT_PLANNER_POSTURE_SETTINGS.targetRangesByPreset
    ),
  };
  const PLANNER_TEST_ID_TARGETS = [
    {
      text: 'Settings',
      selector: '.tp-rotv_t',
      closest: '.tp-rotv_b',
      testId: 'aluminum-rig-planner-setup-pane',
    },
    {
      text: 'Finish',
      selector: '.tp-lblv_l',
      closest: '.tp-lblv',
      testId: 'aluminum-rig-planner-finish-control',
    },
    {
      text: 'Endcaps',
      selector: '.tp-lblv_l',
      closest: '.tp-lblv',
      testId: 'aluminum-rig-planner-endcaps-control',
    },
    {
      text: 'Base length',
      selector: '.tp-lblv_l',
      closest: '.tp-lblv',
      testId: 'aluminum-rig-planner-base-length-control',
    },
    {
      text: 'Base width',
      selector: '.tp-lblv_l',
      closest: '.tp-lblv',
      testId: 'aluminum-rig-planner-base-width-control',
    },
  ] as const;
  const OPTIMIZER_MODE_OPTIONS = [
    { text: 'Cost', value: 'cost' },
    { text: 'Waste', value: 'waste' },
  ] as const;
  const CURRENCY_MODE_OPTIONS = [
    { text: 'Auto', value: 'auto' },
    { text: 'Euro', value: 'eur' },
    { text: 'Dollar', value: 'usd' },
  ] as const;
  const SHIPPING_MODE_OPTIONS = [
    { text: 'Flat', value: 'flat' },
    { text: 'Per kg', value: 'per-kg' },
  ] as const;
  const PROFILE_TYPES: CutListProfileType[] = ['80x40', '40x40'];
  const BLADE_THICKNESS_MIN_MM = 0.5;
  const BLADE_THICKNESS_MAX_MM = 5;
  const BLADE_THICKNESS_STEP_MM = 0.1;
  const OPTIMIZER_LIMITS = {
    safetyMarginMaxMm: 15,
    flatShippingCostMax: 500,
    shippingRatePerKgMax: 50,
    profileWeightMaxKgPerMeter: 10,
    hardwareUnitCostMax: 100,
    stockLengthMinMm: 100,
    stockLengthMaxMm: 6000,
  } as const;
  const STOCK_LENGTH_STEP_MM = 500;
  let stockOptionIdSequence = 0;

  let plannerRoot = $state<HTMLDivElement | null>(null);

  function createStockOptionId() {
    stockOptionIdSequence += 1;
    return `planner-stock-option-${stockOptionIdSequence}`;
  }

  function cloneOptimizationSettings(settings: PlannerOptimizationSettings): PlannerOptimizationSettings {
    return {
      ...settings,
      profileWeightsKgPerMeter: { ...settings.profileWeightsKgPerMeter },
      hardwareUnitCosts: { ...settings.hardwareUnitCosts },
      stockOptions: settings.stockOptions.map((option) => ({ ...option })),
    };
  }

  function clonePostureSettings(
    settings: PlannerPostureSettings<PlannerPosturePreset>
  ): PlannerPostureSettings<PlannerPosturePreset> {
    return {
      ...settings,
      targetRangesByPreset: clonePlannerPostureTargetRangesByPreset(settings.targetRangesByPreset),
    };
  }

  function applyQueryState(state: PlannerQueryState) {
    const mergedState = mergePlannerQueryState(DEFAULT_INPUT, state);

    Object.assign(plannerInput, mergedState.plannerInput);
    Object.assign(animatedPlannerInput, mergedState.plannerInput);
    Object.assign(optimizationSettings, cloneOptimizationSettings(mergedState.optimizationSettings));
    Object.assign(postureSettings, clonePostureSettings(mergedState.postureSettings));
    Object.assign(visibleModules, mergedState.visibleModules);
    postureHeightControlValue = postureSettings.heightCm;
    animatedPostureHeightCm = postureSettings.heightCm;

    for (const option of optimizationSettings.stockOptions) {
      const numericSuffix = Number(option.id.replace(/\D+/g, ''));

      if (Number.isFinite(numericSuffix)) {
        stockOptionIdSequence = Math.max(stockOptionIdSequence, numericSuffix);
      }
    }
  }

  let plannerInput = $state<PlannerInput>({ ...DEFAULT_INPUT });
  let animatedPlannerInput = $state<PlannerInput>({ ...DEFAULT_INPUT });
  let optimizationSettings = $state<PlannerOptimizationSettings>(
    cloneOptimizationSettings(DEFAULT_OPTIMIZATION_SETTINGS)
  );
  let postureSettings = $state<PlannerPostureSettings<PlannerPosturePreset>>(
    clonePostureSettings(DEFAULT_POSTURE_SETTINGS)
  );
  let postureHeightControlValue = $state(DEFAULT_POSTURE_SETTINGS.heightCm);
  let animatedPostureHeightCm = $state(DEFAULT_POSTURE_SETTINGS.heightCm);
  let visibleModules = $state<PlannerVisibleModules>({
    monitor: true,
    monitorStand: false,
  });
  let profileColorMode = $state<(typeof COLOR_MODE_OPTIONS)[number]['value']>('black');
  let customProfileColor = $state(DEFAULT_CUSTOM_PROFILE_COLOR);
  let showEndCaps = $state(true);
  let isNarrowViewport = $state(false);
  let paneExpanded = $state<AluminumRigPaneExpandedState>(getAluminumRigPaneExpandedState(false));
  let stockConfigurationExpanded = $state(false);
  let mounted = $state(false);
  let PlannerScene = $state<PlannerSceneComponent | null>(null);
  let sceneStatus = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  let humanModel = $state<RiggedHumanModel | null>(null);
  let humanModelStatus = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  let hoveredCutListKey = $state<string | null>(null);
  let activeMeasurementKey = $state<PlannerMeasurementKey | null>(null);
  let controlsReady = $state(false);
  let currencyLocale = $state(DEFAULT_CURRENCY_LOCALE);
  let measurementHideTimeout: ReturnType<typeof setTimeout> | null = null;
  let pendingCustomPresetInput: PlannerInput | null = null;
  let suppressProgrammaticPlannerInputEdit = false;
  let postureHeightControlActive = false;
  let postureHeightCommitTimeout: ReturnType<typeof setTimeout> | null = null;
  let postureHeightReleaseTimeout: ReturnType<typeof setTimeout> | null = null;
  let plannerInputAnimationFrame: number | null = null;
  let postureHeightAnimationFrame: number | null = null;
  let isAnimatingPlannerInput = false;
  let isAnimatingPostureHeight = false;
  let plannerUnmounted = false;

  async function loadScene() {
    if (PlannerScene || sceneStatus === 'loading') return;

    sceneStatus = 'loading';

    try {
      const [module] = await Promise.all([import('./scene/Scene.svelte'), loadPrebuiltProfileGeometries()]);
      PlannerScene = module.default;
      sceneStatus = 'ready';
    } catch {
      sceneStatus = 'error';
    }
  }

  function getPresetSolveOptions() {
    return { includeMonitor: visibleModules.monitor };
  }

  function syncPresetMonitorHeightFromInput(input: PlannerInput, modelMetrics = postureModelMetrics) {
    if (!visibleModules.monitor || !modelMetrics) {
      return;
    }

    postureSettings.monitorHeightFromBaseMm = applyPresetToPostureSettings(
      postureSettings,
      input,
      modelMetrics,
      getPresetSolveOptions()
    ).monitorHeightFromBaseMm;
  }

  async function loadHumanModel() {
    if (humanModel || humanModelStatus === 'loading') return;

    humanModelStatus = 'loading';

    try {
      const model = await createRiggedHumanModel();

      if (plannerUnmounted) {
        model?.dispose();
        return;
      }

      if (!model || !model.postureModelMetrics) {
        humanModelStatus = 'error';
        return;
      }

      humanModel = model;
      humanModelStatus = 'ready';

      if (isPresetSolvablePreset(postureSettings.preset)) {
        const nextInput = applyPresetToPlannerInput(
          plannerInput,
          postureSettings.preset,
          postureSettings.heightCm,
          model.postureModelMetrics,
          postureSettings.targetRangesByPreset,
          getPresetSolveOptions()
        );

        assignProgrammaticPlannerInput(nextInput);
        syncPresetMonitorHeightFromInput(nextInput, model.postureModelMetrics);
      }
    } catch {
      humanModelStatus = 'error';
    }
  }

  function syncViewportState(width: number, resetPanes = false) {
    const nextIsNarrow = isNarrowAluminumRigViewport(width);
    const viewportChanged = nextIsNarrow !== isNarrowViewport;
    const nextPaneExpanded = getNextAluminumRigPaneExpandedState(
      paneExpanded,
      isNarrowViewport,
      nextIsNarrow,
      resetPanes
    );

    if (viewportChanged) {
      isNarrowViewport = nextIsNarrow;
    }

    if (nextPaneExpanded !== paneExpanded) {
      paneExpanded = nextPaneExpanded;
    }
  }

  onMount(() => {
    plannerUnmounted = false;
    currencyLocale = resolvePlannerLocale();

    const encoded = new URLSearchParams(window.location.search).get(STATE_KEY);

    if (encoded) {
      const state = decodeQueryState<PlannerQueryState>(encoded);

      if (state) {
        applyQueryState(state);
      }
    }

    syncViewportState(window.innerWidth, true);

    const handleResize = () => syncViewportState(window.innerWidth);
    window.addEventListener('resize', handleResize);
    mounted = true;
    void loadScene();
    void loadHumanModel();
    void tick().then(() => {
      controlsReady = true;
      syncPlannerTestIds();
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      debouncedUrlStateWriter.cancel();
      plannerUnmounted = true;
      humanModel?.dispose();
      humanModel = null;
      if (measurementHideTimeout) {
        clearTimeout(measurementHideTimeout);
      }
      if (postureHeightCommitTimeout) {
        clearTimeout(postureHeightCommitTimeout);
      }
      if (postureHeightReleaseTimeout) {
        clearTimeout(postureHeightReleaseTimeout);
      }
      cancelPlannerInputAnimation();
      cancelPostureHeightAnimation();
      controlsReady = false;
    };
  });

  const geometry = $derived(derivePlannerGeometry(plannerInput));
  const sceneGeometry = $derived(derivePlannerGeometry(animatedPlannerInput));
  const postureModelMetrics = $derived(humanModel?.postureModelMetrics ?? null);
  const defaultModelInput = $derived(
    postureModelMetrics
      ? createPresetPlannerInput(
          DEFAULT_ACTIVE_POSTURE_PRESET,
          DEFAULT_POSTURE_HEIGHT_CM,
          DEFAULT_PLANNER_INPUT,
          postureModelMetrics,
          getPresetSolveOptions()
        )
      : DEFAULT_INPUT
  );
  const postureReport = $derived(
    postureModelMetrics
      ? createPlannerPostureReport(geometry.input, postureSettings, postureModelMetrics, {
          includeMonitor: visibleModules.monitor,
        })
      : null
  );
  const scenePostureSettings = $derived<PlannerPostureSettings<PlannerPosturePreset>>({
    ...postureSettings,
    heightCm: animatedPostureHeightCm,
  });
  const measurementOverlay = $derived.by(() => {
    if (!activeMeasurementKey) {
      return null;
    }

    return createPlannerMeasurementOverlay(geometry.input, activeMeasurementKey);
  });
  const profileColor = $derived(
    profileColorMode === 'silver'
      ? SILVER_PROFILE_COLOR
      : profileColorMode === 'custom'
        ? customProfileColor
        : BLACK_PROFILE_COLOR
  );
  const cutListEntries = $derived(
    createPlannerCutListEntries(geometry, visibleModules, showEndCaps, postureReport, postureSettings)
  );
  const monitorStandLayout = $derived(
    postureReport?.monitorDebug
      ? getMonitorStandLayoutMm(postureReport.monitorDebug, postureSettings, geometry.input.baseWidthMm)
      : null
  );
  const monitorStandFootLengthLimits = $derived.by(() => ({
    min: monitorStandLayout?.footLengthMinMm ?? PLANNER_POSTURE_LIMITS.monitorStandFootLengthMinMm,
    max: monitorStandLayout?.footLengthMaxMm ?? PLANNER_POSTURE_LIMITS.monitorStandFootLengthMaxMm,
  }));
  const hardwareSummaryRows = $derived(
    createPlannerHardwareSummaryRows(
      geometry.input,
      visibleModules,
      postureSettings,
      monitorStandLayout,
      optimizationSettings
    )
  );
  const enabledHardwareTypes = $derived(hardwareSummaryRows.map((row) => row.key));
  const optimizationResult = $derived(createPlannerOptimizationResult(cutListEntries, optimizationSettings));
  const highlightedBeamIds = $derived(cutListEntries.find((entry) => entry.key === hoveredCutListKey)?.beamIds ?? []);
  const currencyCode = $derived<PlannerCurrencyCode>(
    resolvePlannerCurrency(optimizationSettings.currencyMode, currencyLocale)
  );
  const stockOptionsByProfile = $derived.by(() => ({
    '80x40': optimizationSettings.stockOptions.filter((option) => option.profileType === '80x40'),
    '40x40': optimizationSettings.stockOptions.filter((option) => option.profileType === '40x40'),
  }));
  const steeringColumnDistanceLimits = $derived.by(() => ({
    min: PLANNER_LAYOUT.steeringColumnDistanceMinMm,
    max: getSteeringColumnDistanceMaxMm(plannerInput),
  }));
  const steeringColumnBaseHeightLimits = $derived.by(() => ({
    min: PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMinMm,
    max: getSteeringColumnBaseHeightMaxMm(),
  }));
  const steeringColumnHeightLimits = $derived.by(() => ({
    min: PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm,
    max: PLANNER_DIMENSION_LIMITS.steeringColumnHeightMaxMm,
  }));
  const wheelHeightOffsetLimits = $derived.by(() => ({
    min: PLANNER_DIMENSION_LIMITS.wheelHeightOffsetMinMm,
    max: PLANNER_DIMENSION_LIMITS.wheelHeightOffsetMaxMm,
  }));
  const wheelAngleLimits = $derived.by(() => ({
    min: PLANNER_DIMENSION_LIMITS.wheelAngleDegMin,
    max: PLANNER_DIMENSION_LIMITS.wheelAngleDegMax,
  }));
  const wheelDistanceLimits = $derived.by(() => ({
    min: PLANNER_DIMENSION_LIMITS.wheelDistanceFromSteeringColumnMinMm,
    max: PLANNER_DIMENSION_LIMITS.wheelDistanceFromSteeringColumnMaxMm,
  }));
  const wheelDiameterLimits = $derived.by(() => ({
    min: PLANNER_DIMENSION_LIMITS.wheelDiameterMinMm,
    max: PLANNER_DIMENSION_LIMITS.wheelDiameterMaxMm,
  }));
  const pedalTrayDistanceLimits = $derived.by(() => ({
    min: getPedalTrayDistanceMinMm(plannerInput),
    max: getPedalTrayDistanceMaxMm(plannerInput),
  }));
  const isMonitorArcCenterAtEyesActive = $derived(shouldUseMonitorArcCenterAtEyes());
  const monitorCurvatureOptions = $derived(
    postureSettings.monitorArcCenterAtEyes ? MONITOR_ARC_CENTER_AT_EYES_CURVATURE_OPTIONS : MONITOR_CURVATURE_OPTIONS
  );
  const monitorTargetFovLimits = $derived.by(() => {
    const arcFovDeg = isMonitorArcCenterAtEyesActive ? getArcCenterFovDeg(postureSettings) : null;

    return {
      min: Math.floor(Math.min(PLANNER_POSTURE_LIMITS.monitorTargetFovMinDeg, arcFovDeg ?? Number.POSITIVE_INFINITY)),
      max: Math.ceil(Math.max(PLANNER_POSTURE_LIMITS.monitorTargetFovMaxDeg, arcFovDeg ?? Number.NEGATIVE_INFINITY)),
    };
  });
  const monitorDistanceLimits = $derived.by(() => {
    if (!visibleModules.monitor) {
      return {
        min: PLANNER_POSTURE_LIMITS.monitorDistanceFromEyesMinMm,
        max: PLANNER_POSTURE_LIMITS.monitorDistanceFromEyesMaxMm,
      };
    }

    const arcDistanceMm = isMonitorArcCenterAtEyesActive ? getArcCenterDistanceMm(postureSettings) : null;

    if (arcDistanceMm) {
      return {
        min: Math.floor(Math.min(PLANNER_POSTURE_LIMITS.monitorDistanceFromEyesMinMm, arcDistanceMm)),
        max: Math.ceil(Math.max(PLANNER_POSTURE_LIMITS.monitorDistanceFromEyesMaxMm, arcDistanceMm)),
      };
    }

    const min = Math.round(
      Math.max(
        PLANNER_POSTURE_LIMITS.monitorDistanceFromEyesMinMm,
        getSolvedMonitorDistanceFromEyesMm({
          monitorAspectRatio: postureSettings.monitorAspectRatio,
          monitorCurvature: postureSettings.monitorCurvature,
          monitorSizeIn: postureSettings.monitorSizeIn,
          monitorTargetFovDeg: PLANNER_POSTURE_LIMITS.monitorTargetFovMaxDeg,
        })
      )
    );
    const max = Math.round(
      Math.min(
        PLANNER_POSTURE_LIMITS.monitorDistanceFromEyesMaxMm,
        getSolvedMonitorDistanceFromEyesMm({
          monitorAspectRatio: postureSettings.monitorAspectRatio,
          monitorCurvature: postureSettings.monitorCurvature,
          monitorSizeIn: postureSettings.monitorSizeIn,
          monitorTargetFovDeg: PLANNER_POSTURE_LIMITS.monitorTargetFovMinDeg,
        })
      )
    );

    return {
      min,
      max: Math.max(min, max),
    };
  });
  const pedalsHeightLimits = $derived.by(() => ({
    min: PLANNER_DIMENSION_LIMITS.pedalsHeightMinMm,
    max: PLANNER_DIMENSION_LIMITS.pedalsHeightMaxMm,
  }));
  const pedalsDeltaLimits = $derived.by(() => ({
    min: PLANNER_DIMENSION_LIMITS.pedalsDeltaMinMm,
    max: PLANNER_DIMENSION_LIMITS.pedalsDeltaMaxMm,
  }));
  const pedalAngleLimits = $derived.by(() => ({
    min: PLANNER_DIMENSION_LIMITS.pedalAngleDegMin,
    max: PLANNER_DIMENSION_LIMITS.pedalAngleDegMax,
  }));
  const pedalLengthLimits = $derived.by(() => ({
    min: PLANNER_DIMENSION_LIMITS.pedalLengthMinMm,
    max: PLANNER_DIMENSION_LIMITS.pedalLengthMaxMm,
  }));
  const pedalAcceleratorDeltaLimits = $derived.by(() => ({
    min: 0,
    max: getPedalAcceleratorDeltaMaxMm(plannerInput),
  }));
  const pedalBrakeDeltaLimits = $derived.by(() => ({
    min: 0,
    max: getPedalBrakeDeltaMaxMm(plannerInput),
  }));
  const pedalClutchDeltaLimits = $derived.by(() => ({
    min: 0,
    max: getPedalClutchDeltaMaxMm(plannerInput),
  }));
  const seatBaseDepthMaxMm = $derived(Math.min(PLANNER_DIMENSION_LIMITS.seatBaseDepthMaxMm, plannerInput.baseLengthMm));

  $effect(() => {
    const nextInput = { ...plannerInput };

    if (!isAnimatingPlannerInput) {
      Object.assign(animatedPlannerInput, nextInput);
    }
  });

  $effect(() => {
    const nextHeightCm = postureSettings.heightCm;

    if (!isAnimatingPostureHeight) {
      animatedPostureHeightCm = nextHeightCm;
    }
  });

  function syncPlannerTestIds() {
    if (!plannerRoot) {
      return;
    }

    for (const { text, selector, closest, testId } of PLANNER_TEST_ID_TARGETS) {
      const element = Array.from(plannerRoot.querySelectorAll<HTMLElement>(selector)).find(
        (candidate) => candidate.textContent?.trim() === text
      );
      const target = closest ? element?.closest<HTMLElement>(closest) : element;

      target?.setAttribute('data-testid', testId);
    }
  }

  function capturePlannerRoot(node: HTMLDivElement) {
    plannerRoot = node;

    return () => {
      if (plannerRoot === node) {
        plannerRoot = null;
      }
    };
  }

  function cancelPlannerInputAnimation() {
    if (plannerInputAnimationFrame !== null) {
      cancelAnimationFrame(plannerInputAnimationFrame);
      plannerInputAnimationFrame = null;
    }

    isAnimatingPlannerInput = false;
  }

  function cancelPostureHeightAnimation() {
    if (postureHeightAnimationFrame !== null) {
      cancelAnimationFrame(postureHeightAnimationFrame);
      postureHeightAnimationFrame = null;
    }

    isAnimatingPostureHeight = false;
  }

  function animatePlannerInputTo(targetInput: PlannerInput) {
    cancelPlannerInputAnimation();

    const fromInput = $state.snapshot(animatedPlannerInput);
    const startTime = performance.now();
    isAnimatingPlannerInput = true;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / POSTURE_TRANSITION_DURATION_MS);
      const easedProgress = 1 - (1 - progress) ** 3;

      for (const key of Object.keys(targetInput) as Array<keyof PlannerInput>) {
        const fromValue = fromInput[key];
        const targetValue = targetInput[key];

        animatedPlannerInput[key] =
          typeof fromValue === 'number' && typeof targetValue === 'number'
            ? fromValue + (targetValue - fromValue) * easedProgress
            : targetValue;
      }

      if (progress < 1) {
        plannerInputAnimationFrame = requestAnimationFrame(step);
        return;
      }

      Object.assign(animatedPlannerInput, targetInput);
      plannerInputAnimationFrame = null;
      isAnimatingPlannerInput = false;
    };

    plannerInputAnimationFrame = requestAnimationFrame(step);
  }

  function animatePostureHeightTo(targetHeightCm: number) {
    cancelPostureHeightAnimation();

    const fromHeightCm = animatedPostureHeightCm;
    const startTime = performance.now();
    isAnimatingPostureHeight = true;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / POSTURE_TRANSITION_DURATION_MS);
      const easedProgress = 1 - (1 - progress) ** 3;

      animatedPostureHeightCm = fromHeightCm + (targetHeightCm - fromHeightCm) * easedProgress;

      if (progress < 1) {
        postureHeightAnimationFrame = requestAnimationFrame(step);
        return;
      }

      animatedPostureHeightCm = targetHeightCm;
      postureHeightAnimationFrame = null;
      isAnimatingPostureHeight = false;
    };

    postureHeightAnimationFrame = requestAnimationFrame(step);
  }

  function capturePostureHeightControl(node: HTMLDivElement) {
    const scheduleReleaseCommit = () => {
      if (postureHeightReleaseTimeout) {
        clearTimeout(postureHeightReleaseTimeout);
      }

      postureHeightReleaseTimeout = setTimeout(() => {
        postureHeightReleaseTimeout = null;
        commitPostureHeightCm(postureHeightControlValue, true);
      }, 0);
    };
    const beginInteraction = () => {
      postureHeightControlActive = true;

      if (postureHeightCommitTimeout) {
        clearTimeout(postureHeightCommitTimeout);
        postureHeightCommitTimeout = null;
      }

      if (postureHeightReleaseTimeout) {
        clearTimeout(postureHeightReleaseTimeout);
        postureHeightReleaseTimeout = null;
      }
    };
    const endInteraction = () => {
      if (!postureHeightControlActive && postureHeightControlValue === postureSettings.heightCm) {
        return;
      }

      postureHeightControlActive = false;
      scheduleReleaseCommit();
    };
    const beginKeyInteraction = (event: KeyboardEvent) => {
      if (
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp'
      ) {
        beginInteraction();
      }
    };
    const endKeyInteraction = (event: KeyboardEvent) => {
      if (
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowRight' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp'
      ) {
        endInteraction();
      }
    };

    node.addEventListener('pointerdown', beginInteraction, true);
    node.addEventListener('mousedown', beginInteraction, true);
    node.addEventListener('touchstart', beginInteraction, { capture: true, passive: true });
    node.addEventListener('keydown', beginKeyInteraction, true);
    node.addEventListener('focusout', endInteraction, true);
    node.addEventListener('change', endInteraction, true);
    window.addEventListener('pointerup', endInteraction, true);
    window.addEventListener('pointercancel', endInteraction, true);
    window.addEventListener('mouseup', endInteraction, true);
    window.addEventListener('touchend', endInteraction, true);
    window.addEventListener('touchcancel', endInteraction, true);
    window.addEventListener('keyup', endKeyInteraction, true);

    return () => {
      node.removeEventListener('pointerdown', beginInteraction, true);
      node.removeEventListener('mousedown', beginInteraction, true);
      node.removeEventListener('touchstart', beginInteraction, true);
      node.removeEventListener('keydown', beginKeyInteraction, true);
      node.removeEventListener('focusout', endInteraction, true);
      node.removeEventListener('change', endInteraction, true);
      window.removeEventListener('pointerup', endInteraction, true);
      window.removeEventListener('pointercancel', endInteraction, true);
      window.removeEventListener('mouseup', endInteraction, true);
      window.removeEventListener('touchend', endInteraction, true);
      window.removeEventListener('touchcancel', endInteraction, true);
      window.removeEventListener('keyup', endKeyInteraction, true);
    };
  }

  function clampPedalTrayDistanceMm() {
    plannerInput.pedalTrayDistanceMm = Math.max(
      pedalTrayDistanceLimits.min,
      Math.min(pedalTrayDistanceLimits.max, plannerInput.pedalTrayDistanceMm)
    );
  }

  function clampPedalSettings() {
    plannerInput.pedalLengthMm = Math.max(
      pedalLengthLimits.min,
      Math.min(pedalLengthLimits.max, plannerInput.pedalLengthMm)
    );
    plannerInput.pedalAcceleratorDeltaMm = Math.max(
      pedalAcceleratorDeltaLimits.min,
      Math.min(pedalAcceleratorDeltaLimits.max, plannerInput.pedalAcceleratorDeltaMm)
    );
    plannerInput.pedalBrakeDeltaMm = Math.max(
      pedalBrakeDeltaLimits.min,
      Math.min(pedalBrakeDeltaLimits.max, plannerInput.pedalBrakeDeltaMm)
    );
    plannerInput.pedalClutchDeltaMm = Math.max(
      pedalClutchDeltaLimits.min,
      Math.min(pedalClutchDeltaLimits.max, plannerInput.pedalClutchDeltaMm)
    );
  }

  function scheduleMeasurementOverlay(key: PlannerMeasurementKey) {
    if (!controlsReady) {
      return;
    }

    activeMeasurementKey = key;

    if (measurementHideTimeout) {
      clearTimeout(measurementHideTimeout);
    }

    measurementHideTimeout = setTimeout(() => {
      activeMeasurementKey = null;
      measurementHideTimeout = null;
    }, MEASUREMENT_OVERLAY_TIMEOUT_MS);
  }

  function syncPlannerUrlState() {
    flushPosturePresetCustomMark();

    if (!mounted || typeof window === 'undefined') {
      return;
    }

    const encodedPlannerState = encodeQueryState({
      ...$state.snapshot(plannerInput),
      optimizer: $state.snapshot(optimizationSettings),
      posture: $state.snapshot(postureSettings),
      modules: $state.snapshot(visibleModules),
    });
    const url = new URL(window.location.href);

    if (url.searchParams.get(STATE_KEY) === encodedPlannerState) {
      debouncedUrlStateWriter.cancel();
      return;
    }

    url.searchParams.set(STATE_KEY, encodedPlannerState);
    debouncedUrlStateWriter.schedule(url.toString());
  }

  function markPosturePresetCustom() {
    if (suppressProgrammaticPlannerInputEdit) {
      return;
    }

    pendingCustomPresetInput = { ...$state.snapshot(plannerInput) };
  }

  function assignProgrammaticPlannerInput(input: PlannerInput, options: { animate?: boolean } = {}) {
    suppressProgrammaticPlannerInputEdit = true;
    pendingCustomPresetInput = null;
    Object.assign(plannerInput, input);

    if (options.animate) {
      animatePlannerInputTo(input);
    } else {
      cancelPlannerInputAnimation();
      Object.assign(animatedPlannerInput, input);
    }

    void tick().then(() => {
      suppressProgrammaticPlannerInputEdit = false;
    });
  }

  function flushPosturePresetCustomMark() {
    if (!pendingCustomPresetInput) {
      return;
    }

    const previousInput = pendingCustomPresetInput;
    pendingCustomPresetInput = null;

    const nextPreset = getPresetAfterPlannerInputEdit(postureSettings.preset, previousInput, plannerInput);

    if (nextPreset === postureSettings.preset) {
      return;
    }

    postureSettings.preset = nextPreset;
  }

  function setBaseLengthMm(value: number) {
    markPosturePresetCustom();
    plannerInput.baseLengthMm = value;

    if (plannerInput.seatBaseDepthMm > Math.min(PLANNER_DIMENSION_LIMITS.seatBaseDepthMaxMm, value)) {
      plannerInput.seatBaseDepthMm = Math.min(PLANNER_DIMENSION_LIMITS.seatBaseDepthMaxMm, value);
    }

    if (plannerInput.steeringColumnDistanceMm > getSteeringColumnDistanceMaxMm(plannerInput)) {
      plannerInput.steeringColumnDistanceMm = getSteeringColumnDistanceMaxMm(plannerInput);
    }

    clampPedalTrayDistanceMm();
    syncPlannerUrlState();
    scheduleMeasurementOverlay('baseLengthMm');
  }

  function setBaseWidthMm(value: number) {
    markPosturePresetCustom();
    plannerInput.baseWidthMm = value;
    clampPedalSettings();
    syncPlannerUrlState();
    scheduleMeasurementOverlay('baseWidthMm');
  }

  function setBaseFeetType(value: PlannerFeetType) {
    markPosturePresetCustom();
    plannerInput.baseFeetType = value;
    if (value === 'none') {
      plannerInput.baseFeetHeightMm = 0;
    } else if (
      plannerInput.baseFeetHeightMm < PLANNER_DIMENSION_LIMITS.baseFeetHeightMinMm ||
      plannerInput.baseFeetHeightMm > PLANNER_DIMENSION_LIMITS.baseFeetHeightMaxMm
    ) {
      plannerInput.baseFeetHeightMm = DEFAULT_BASE_RUBBER_FEET_HEIGHT_MM;
    }
    syncPlannerUrlState();
  }

  function setBaseFeetHeightMm(value: number) {
    markPosturePresetCustom();
    if (plannerInput.baseFeetType === 'none') {
      plannerInput.baseFeetHeightMm = 0;
      syncPlannerUrlState();
      return;
    }
    plannerInput.baseFeetHeightMm = Math.max(
      PLANNER_DIMENSION_LIMITS.baseFeetHeightMinMm,
      Math.min(PLANNER_DIMENSION_LIMITS.baseFeetHeightMaxMm, value)
    );
    syncPlannerUrlState();
  }

  function setSeatBaseDepthMm(value: number) {
    markPosturePresetCustom();
    plannerInput.seatBaseDepthMm = Math.max(
      PLANNER_DIMENSION_LIMITS.seatBaseDepthMinMm,
      Math.min(seatBaseDepthMaxMm, value)
    );

    if (plannerInput.steeringColumnDistanceMm > getSteeringColumnDistanceMaxMm(plannerInput)) {
      plannerInput.steeringColumnDistanceMm = getSteeringColumnDistanceMaxMm(plannerInput);
    }

    clampPedalTrayDistanceMm();
    syncPlannerUrlState();
    scheduleMeasurementOverlay('seatBaseDepthMm');
  }

  function setBaseInnerBeamSpacingMm(value: number) {
    markPosturePresetCustom();
    plannerInput.baseInnerBeamSpacingMm = value;
    syncPlannerUrlState();
    scheduleMeasurementOverlay('baseInnerBeamSpacingMm');
  }

  function setSeatLengthMm(value: number) {
    markPosturePresetCustom();
    plannerInput.seatLengthMm = Math.max(
      PLANNER_DIMENSION_LIMITS.seatLengthMinMm,
      Math.min(PLANNER_DIMENSION_LIMITS.seatLengthMaxMm, value)
    );
    syncPlannerUrlState();
  }

  function setSeatDeltaMm(value: number) {
    markPosturePresetCustom();
    plannerInput.seatDeltaMm = Math.max(
      PLANNER_DIMENSION_LIMITS.seatDeltaMinMm,
      Math.min(PLANNER_DIMENSION_LIMITS.seatDeltaMaxMm, value)
    );
    syncPlannerUrlState();
  }

  function setSeatHeightFromBaseInnerBeamsMm(value: number) {
    markPosturePresetCustom();
    plannerInput.seatHeightFromBaseInnerBeamsMm = Math.max(
      PLANNER_DIMENSION_LIMITS.seatHeightFromBaseInnerBeamsMinMm,
      Math.min(PLANNER_DIMENSION_LIMITS.seatHeightFromBaseInnerBeamsMaxMm, value)
    );
    syncPlannerUrlState();
  }

  function setSeatAngleDeg(value: number) {
    markPosturePresetCustom();
    plannerInput.seatAngleDeg = Math.max(
      PLANNER_DIMENSION_LIMITS.seatAngleDegMin,
      Math.min(PLANNER_DIMENSION_LIMITS.seatAngleDegMax, value)
    );
    syncPlannerUrlState();
  }

  function setBackrestAngleDeg(value: number) {
    markPosturePresetCustom();
    plannerInput.backrestAngleDeg = Math.max(
      PLANNER_DIMENSION_LIMITS.backrestAngleDegMin,
      Math.min(PLANNER_DIMENSION_LIMITS.backrestAngleDegMax, value)
    );
    syncPlannerUrlState();
  }

  function setPedalTrayDepthMm(value: number) {
    markPosturePresetCustom();
    plannerInput.pedalTrayDepthMm = Math.max(
      PLANNER_DIMENSION_LIMITS.pedalTrayDepthMinMm,
      Math.min(PLANNER_DIMENSION_LIMITS.pedalTrayDepthMaxMm, value)
    );

    clampPedalTrayDistanceMm();
    syncPlannerUrlState();
    scheduleMeasurementOverlay('pedalTrayDepthMm');
  }

  function setPedalsHeightMm(value: number) {
    markPosturePresetCustom();
    plannerInput.pedalsHeightMm = Math.max(pedalsHeightLimits.min, Math.min(pedalsHeightLimits.max, value));
    syncPlannerUrlState();
  }

  function setPedalsDeltaMm(value: number) {
    markPosturePresetCustom();
    plannerInput.pedalsDeltaMm = Math.max(pedalsDeltaLimits.min, Math.min(pedalsDeltaLimits.max, value));
    syncPlannerUrlState();
  }

  function setPedalAngleDeg(value: number) {
    markPosturePresetCustom();
    plannerInput.pedalAngleDeg = Math.max(pedalAngleLimits.min, Math.min(pedalAngleLimits.max, value));
    syncPlannerUrlState();
  }

  function setPedalLengthMm(value: number) {
    markPosturePresetCustom();
    plannerInput.pedalLengthMm = Math.max(pedalLengthLimits.min, Math.min(pedalLengthLimits.max, value));
    syncPlannerUrlState();
  }

  function setPedalAcceleratorDeltaMm(value: number) {
    markPosturePresetCustom();
    plannerInput.pedalAcceleratorDeltaMm = Math.max(
      pedalAcceleratorDeltaLimits.min,
      Math.min(pedalAcceleratorDeltaLimits.max, value)
    );
    syncPlannerUrlState();
  }

  function setPedalBrakeDeltaMm(value: number) {
    markPosturePresetCustom();
    plannerInput.pedalBrakeDeltaMm = Math.max(pedalBrakeDeltaLimits.min, Math.min(pedalBrakeDeltaLimits.max, value));
    syncPlannerUrlState();
  }

  function setPedalClutchDeltaMm(value: number) {
    markPosturePresetCustom();
    plannerInput.pedalClutchDeltaMm = Math.max(pedalClutchDeltaLimits.min, Math.min(pedalClutchDeltaLimits.max, value));
    syncPlannerUrlState();
  }

  function setPedalTrayDistanceMm(value: number) {
    markPosturePresetCustom();
    plannerInput.pedalTrayDistanceMm = Math.max(
      pedalTrayDistanceLimits.min,
      Math.min(pedalTrayDistanceLimits.max, value)
    );
    syncPlannerUrlState();
    scheduleMeasurementOverlay('pedalTrayDistanceMm');
  }

  function setSteeringColumnBaseHeightMm(value: number) {
    markPosturePresetCustom();
    const heights = clampSteeringColumnHeights(
      {
        steeringColumnBaseHeightMm: value,
        steeringColumnHeightMm: plannerInput.steeringColumnHeightMm,
      },
      'base-height'
    );

    plannerInput.steeringColumnBaseHeightMm = heights.steeringColumnBaseHeightMm;
    plannerInput.steeringColumnHeightMm = heights.steeringColumnHeightMm;

    syncPlannerUrlState();
    scheduleMeasurementOverlay('steeringColumnBaseHeightMm');
  }

  function setSteeringColumnHeightMm(value: number) {
    markPosturePresetCustom();
    const heights = clampSteeringColumnHeights(
      {
        steeringColumnBaseHeightMm: plannerInput.steeringColumnBaseHeightMm,
        steeringColumnHeightMm: value,
      },
      'column-height'
    );

    plannerInput.steeringColumnBaseHeightMm = heights.steeringColumnBaseHeightMm;
    plannerInput.steeringColumnHeightMm = heights.steeringColumnHeightMm;

    syncPlannerUrlState();
    scheduleMeasurementOverlay('steeringColumnHeightMm');
  }

  function setSteeringColumnDistanceMm(value: number) {
    markPosturePresetCustom();
    plannerInput.steeringColumnDistanceMm = Math.max(
      steeringColumnDistanceLimits.min,
      Math.min(steeringColumnDistanceLimits.max, value)
    );
    syncPlannerUrlState();
    scheduleMeasurementOverlay('steeringColumnDistanceMm');
  }

  function setWheelHeightOffsetMm(value: number) {
    markPosturePresetCustom();
    plannerInput.wheelHeightOffsetMm = Math.max(
      wheelHeightOffsetLimits.min,
      Math.min(wheelHeightOffsetLimits.max, value)
    );
    syncPlannerUrlState();
    scheduleMeasurementOverlay('wheelHeightOffsetMm');
  }

  function setWheelAngleDeg(value: number) {
    markPosturePresetCustom();
    plannerInput.wheelAngleDeg = Math.max(wheelAngleLimits.min, Math.min(wheelAngleLimits.max, value));
    syncPlannerUrlState();
  }

  function setWheelDistanceFromSteeringColumnMm(value: number) {
    markPosturePresetCustom();
    plannerInput.wheelDistanceFromSteeringColumnMm = Math.max(
      wheelDistanceLimits.min,
      Math.min(wheelDistanceLimits.max, value)
    );
    syncPlannerUrlState();
    scheduleMeasurementOverlay('wheelDistanceFromSteeringColumnMm');
  }

  function setWheelDiameterMm(value: number) {
    markPosturePresetCustom();
    plannerInput.wheelDiameterMm = Math.max(wheelDiameterLimits.min, Math.min(wheelDiameterLimits.max, value));
    syncPlannerUrlState();
    scheduleMeasurementOverlay('wheelDiameterMm');
  }

  function resetSteeringColumnModule() {
    setSteeringColumnDistanceMm(defaultModelInput.steeringColumnDistanceMm);
    setSteeringColumnBaseHeightMm(defaultModelInput.steeringColumnBaseHeightMm);
    setSteeringColumnHeightMm(defaultModelInput.steeringColumnHeightMm);
  }

  function resetMonitorModule() {
    setMonitorSizeIn(DEFAULT_PLANNER_POSTURE_SETTINGS.monitorSizeIn);
    setMonitorAspectRatio(DEFAULT_PLANNER_POSTURE_SETTINGS.monitorAspectRatio);
    setMonitorCurvature(DEFAULT_PLANNER_POSTURE_SETTINGS.monitorCurvature);
    setMonitorTiltDeg(DEFAULT_PLANNER_POSTURE_SETTINGS.monitorTiltDeg);
    setMonitorTargetFovDeg(DEFAULT_PLANNER_POSTURE_SETTINGS.monitorTargetFovDeg);
    setMonitorHeightFromBaseMm(DEFAULT_PLANNER_POSTURE_SETTINGS.monitorHeightFromBaseMm);
    setMonitorTripleScreen(DEFAULT_PLANNER_POSTURE_SETTINGS.monitorTripleScreen);
    setMonitorArcCenterAtEyes(DEFAULT_PLANNER_POSTURE_SETTINGS.monitorArcCenterAtEyes);
    setMonitorVesaType(DEFAULT_PLANNER_POSTURE_SETTINGS.monitorVesaType);
    syncSolvedMonitorDistanceFromEyesMm();
  }

  function resetMonitorStandModule() {
    setMonitorBottomVesaHolesToCrossBeamTopMm(
      DEFAULT_PLANNER_POSTURE_SETTINGS.monitorBottomVesaHolesToCrossBeamTopMm
    );
    setMonitorStandLegExtraMarginMm(DEFAULT_PLANNER_POSTURE_SETTINGS.monitorStandLegExtraMarginMm);
    setMonitorStandFootLengthMm(DEFAULT_PLANNER_POSTURE_SETTINGS.monitorStandFootLengthMm);
    setMonitorStandFeetType(DEFAULT_PLANNER_POSTURE_SETTINGS.monitorStandFeetType);
    setMonitorStandFeetHeightMm(DEFAULT_PLANNER_POSTURE_SETTINGS.monitorStandFeetHeightMm);
  }

  function resetBaseModule() {
    setBaseLengthMm(defaultModelInput.baseLengthMm);
    setBaseWidthMm(defaultModelInput.baseWidthMm);
    setBaseFeetType(defaultModelInput.baseFeetType);
    setBaseFeetHeightMm(defaultModelInput.baseFeetHeightMm);
    setSeatBaseDepthMm(defaultModelInput.seatBaseDepthMm);
    setBaseInnerBeamSpacingMm(defaultModelInput.baseInnerBeamSpacingMm);
  }

  function resetSeatModule() {
    setSeatLengthMm(defaultModelInput.seatLengthMm);
    setSeatDeltaMm(defaultModelInput.seatDeltaMm);
    setSeatHeightFromBaseInnerBeamsMm(defaultModelInput.seatHeightFromBaseInnerBeamsMm);
    setSeatAngleDeg(defaultModelInput.seatAngleDeg);
    setBackrestAngleDeg(defaultModelInput.backrestAngleDeg);
  }

  function resetWheelModule() {
    setWheelHeightOffsetMm(defaultModelInput.wheelHeightOffsetMm);
    setWheelAngleDeg(defaultModelInput.wheelAngleDeg);
    setWheelDistanceFromSteeringColumnMm(defaultModelInput.wheelDistanceFromSteeringColumnMm);
    setWheelDiameterMm(defaultModelInput.wheelDiameterMm);
  }

  function resetPedalTrayModule() {
    setPedalTrayDepthMm(defaultModelInput.pedalTrayDepthMm);
    setPedalTrayDistanceMm(defaultModelInput.pedalTrayDistanceMm);
  }

  function resetPedalsModule() {
    setPedalsHeightMm(defaultModelInput.pedalsHeightMm);
    setPedalsDeltaMm(defaultModelInput.pedalsDeltaMm);
    setPedalAngleDeg(defaultModelInput.pedalAngleDeg);
    setPedalLengthMm(defaultModelInput.pedalLengthMm);
    setPedalAcceleratorDeltaMm(defaultModelInput.pedalAcceleratorDeltaMm);
    setPedalBrakeDeltaMm(defaultModelInput.pedalBrakeDeltaMm);
    setPedalClutchDeltaMm(defaultModelInput.pedalClutchDeltaMm);
  }

  function setPosturePreset(value: PlannerPosturePreset) {
    postureSettings.preset = value;

    if (isPresetSolvablePreset(value)) {
      if (!postureModelMetrics) {
        humanModelStatus = 'error';
        return;
      }

      const nextInput = applyPresetToPlannerInput(
        plannerInput,
        value,
        postureSettings.heightCm,
        postureModelMetrics,
        postureSettings.targetRangesByPreset,
        getPresetSolveOptions()
      );

      assignProgrammaticPlannerInput(nextInput);
      syncPresetMonitorHeightFromInput(nextInput);
    }

    syncPlannerUrlState();
  }

  function optimizeCurrentPosturePreset() {
    if (postureSettings.preset !== 'custom') {
      return;
    }

    if (!postureModelMetrics) {
      humanModelStatus = 'error';
      return;
    }

    const nextInput = recomputePresetDynamicPlannerInput(
      plannerInput,
      postureSettings.preset,
      postureSettings.heightCm,
      postureModelMetrics,
      postureSettings.targetRangesByPreset,
      getPresetSolveOptions()
    );

    assignProgrammaticPlannerInput(nextInput, { animate: true });
    syncPresetMonitorHeightFromInput(nextInput);
    syncPlannerUrlState();
  }

  function clampPostureHeightCm(value: number) {
    return Math.max(PLANNER_POSTURE_LIMITS.heightMinCm, Math.min(PLANNER_POSTURE_LIMITS.heightMaxCm, value));
  }

  function schedulePostureHeightCommit() {
    if (postureHeightCommitTimeout) {
      clearTimeout(postureHeightCommitTimeout);
    }

    postureHeightCommitTimeout = setTimeout(() => {
      postureHeightCommitTimeout = null;
      commitPostureHeightCm(postureHeightControlValue, true);
    }, POSTURE_HEIGHT_COMMIT_DEBOUNCE_MS);
  }

  function setPostureHeightCm(value: number) {
    postureHeightControlValue = clampPostureHeightCm(value);

    if (!postureHeightControlActive) {
      schedulePostureHeightCommit();
    }
  }

  function commitPostureHeightCm(value: number, animateTransition = false) {
    const nextHeightCm = clampPostureHeightCm(value);

    postureHeightControlValue = nextHeightCm;

    if (postureHeightCommitTimeout) {
      clearTimeout(postureHeightCommitTimeout);
      postureHeightCommitTimeout = null;
    }

    if (nextHeightCm === postureSettings.heightCm) {
      return;
    }

    if (animateTransition) {
      animatePostureHeightTo(nextHeightCm);
    } else {
      cancelPostureHeightAnimation();
      animatedPostureHeightCm = nextHeightCm;
    }

    postureSettings.heightCm = nextHeightCm;

    if (isPresetSolvablePreset(postureSettings.preset)) {
      if (!postureModelMetrics) {
        humanModelStatus = 'error';
        return;
      }

      const nextInput = recomputePresetDynamicPlannerInput(
        plannerInput,
        postureSettings.preset,
        nextHeightCm,
        postureModelMetrics,
        postureSettings.targetRangesByPreset,
        getPresetSolveOptions()
      );

      assignProgrammaticPlannerInput(nextInput, { animate: animateTransition });
      syncPresetMonitorHeightFromInput(nextInput);
    }

    syncPlannerUrlState();
  }

  function syncMonitorBottomVesaHoleDistanceFromMonitor() {
    setMonitorBottomVesaHoleDistanceMm(getDefaultMonitorBottomVesaHoleDistanceMm(postureSettings), {
      syncUrl: false,
    });
  }

  function setMonitorSizeIn(value: number) {
    postureSettings.monitorSizeIn = Math.round(
      Math.max(PLANNER_POSTURE_LIMITS.monitorSizeMinIn, Math.min(PLANNER_POSTURE_LIMITS.monitorSizeMaxIn, value))
    );
    syncMonitorBottomVesaHoleDistanceFromMonitor();
    syncSolvedMonitorDistanceFromEyesMm();
    syncPlannerUrlState();
  }

  function setMonitorAspectRatio(value: PlannerMonitorAspectRatio) {
    postureSettings.monitorAspectRatio = value;
    syncMonitorBottomVesaHoleDistanceFromMonitor();
    syncSolvedMonitorDistanceFromEyesMm();
    syncPlannerUrlState();
  }

  function setMonitorCurvature(value: PlannerMonitorCurvature) {
    const nextValue =
      postureSettings.monitorArcCenterAtEyes && !isMonitorArcCenterAtEyesCurvature(value)
        ? MONITOR_ARC_CENTER_AT_EYES_FALLBACK_CURVATURE
        : value;

    postureSettings.monitorCurvature = nextValue;

    if (nextValue === 'disabled') {
      postureSettings.monitorArcCenterAtEyes = false;
    }

    syncSolvedMonitorDistanceFromEyesMm();
    syncPlannerUrlState();
  }

  function setMonitorTiltDeg(value: number) {
    if (postureSettings.monitorTripleScreen) {
      postureSettings.monitorTiltDeg = 0;
      syncPlannerUrlState();
      return;
    }

    postureSettings.monitorTiltDeg = Math.max(
      PLANNER_POSTURE_LIMITS.monitorTiltMinDeg,
      Math.min(PLANNER_POSTURE_LIMITS.monitorTiltMaxDeg, value)
    );
    syncPlannerUrlState();
  }

  function clampMonitorTargetFovDeg(value: number) {
    return Math.max(
      PLANNER_POSTURE_LIMITS.monitorTargetFovMinDeg,
      Math.min(PLANNER_POSTURE_LIMITS.monitorTargetFovMaxDeg, value)
    );
  }

  function shouldUseMonitorArcCenterAtEyes(
    settings: Pick<
      PlannerPostureSettings<PlannerPosturePreset>,
      'monitorCurvature' | 'monitorArcCenterAtEyes' | 'monitorTripleScreen'
    > = postureSettings
  ) {
    return settings.monitorTripleScreen && settings.monitorCurvature !== 'disabled' && settings.monitorArcCenterAtEyes;
  }

  function setMonitorTargetFovDeg(value: number) {
    postureSettings.monitorTargetFovDeg = clampMonitorTargetFovDeg(value);
    syncSolvedMonitorDistanceFromEyesMm();
    syncPlannerUrlState();
  }

  function syncSolvedMonitorDistanceFromEyesMm() {
    if (!visibleModules.monitor) {
      return;
    }

    if (shouldUseMonitorArcCenterAtEyes()) {
      const arcDistanceMm = getArcCenterDistanceMm(postureSettings);

      if (arcDistanceMm) {
        postureSettings.monitorDistanceFromEyesMm = Math.round(arcDistanceMm);
        const arcFovDeg = getArcCenterFovDeg(postureSettings);

        if (arcFovDeg !== null) {
          postureSettings.monitorTargetFovDeg = arcFovDeg;
        }

        return;
      }
    }

    postureSettings.monitorTargetFovDeg = clampMonitorTargetFovDeg(postureSettings.monitorTargetFovDeg);
    postureSettings.monitorDistanceFromEyesMm = Math.round(getSolvedMonitorDistanceFromEyesMm(postureSettings));
  }

  function setMonitorHeightFromBaseMm(value: number) {
    postureSettings.monitorHeightFromBaseMm = Math.max(
      PLANNER_POSTURE_LIMITS.monitorHeightFromBaseMinMm,
      Math.min(PLANNER_POSTURE_LIMITS.monitorHeightFromBaseMaxMm, value)
    );
    syncPlannerUrlState();
  }

  function setMonitorDistanceFromEyesMm(value: number) {
    if (!visibleModules.monitor) {
      return;
    }

    if (shouldUseMonitorArcCenterAtEyes()) {
      syncSolvedMonitorDistanceFromEyesMm();
      syncPlannerUrlState();
      return;
    }

    const monitorDistanceFromEyesMm = Math.round(
      Math.max(monitorDistanceLimits.min, Math.min(monitorDistanceLimits.max, value))
    );

    postureSettings.monitorDistanceFromEyesMm = monitorDistanceFromEyesMm;
    postureSettings.monitorTargetFovDeg = clampMonitorTargetFovDeg(
      getMonitorTargetFovFromDistanceMm(monitorDistanceFromEyesMm, postureSettings)
    );
    syncSolvedMonitorDistanceFromEyesMm();
    syncPlannerUrlState();
  }

  function setMonitorVisible(value: boolean) {
    visibleModules.monitor = value;

    if (!value) {
      visibleModules.monitorStand = false;
    }

    if (value) {
      syncPresetMonitorHeightFromInput(plannerInput);
      syncSolvedMonitorDistanceFromEyesMm();
    }

    syncPlannerUrlState();
  }

  function setMonitorStandVisible(value: boolean) {
    visibleModules.monitorStand = value && visibleModules.monitor;
    syncPlannerUrlState();
  }

  function setMonitorTripleScreen(value: boolean) {
    postureSettings.monitorTripleScreen = value;

    if (value) {
      postureSettings.monitorTiltDeg = 0;
    } else {
      postureSettings.monitorArcCenterAtEyes = false;
    }

    syncSolvedMonitorDistanceFromEyesMm();
    syncPlannerUrlState();
  }

  function setMonitorArcCenterAtEyes(value: boolean) {
    const nextValue = value && postureSettings.monitorTripleScreen;

    postureSettings.monitorArcCenterAtEyes = nextValue;

    if (nextValue && !isMonitorArcCenterAtEyesCurvature(postureSettings.monitorCurvature)) {
      postureSettings.monitorCurvature = MONITOR_ARC_CENTER_AT_EYES_FALLBACK_CURVATURE;
    }

    syncSolvedMonitorDistanceFromEyesMm();
    syncPlannerUrlState();
  }

  function setMonitorVesaType(value: PlannerMonitorVesaType) {
    postureSettings.monitorVesaType = value;
    syncPlannerUrlState();
  }

  function setMonitorBottomVesaHoleDistanceMm(value: number, options: { syncUrl?: boolean } = {}) {
    postureSettings.monitorBottomVesaHoleDistanceMm = Math.max(
      PLANNER_POSTURE_LIMITS.monitorBottomVesaHoleDistanceMinMm,
      Math.min(PLANNER_POSTURE_LIMITS.monitorBottomVesaHoleDistanceMaxMm, value)
    );

    if (options.syncUrl !== false) {
      syncPlannerUrlState();
    }
  }

  function setMonitorBottomVesaHolesToCrossBeamTopMm(value: number) {
    postureSettings.monitorBottomVesaHolesToCrossBeamTopMm = Math.max(
      PLANNER_POSTURE_LIMITS.monitorBottomVesaHolesToCrossBeamTopMinMm,
      Math.min(PLANNER_POSTURE_LIMITS.monitorBottomVesaHolesToCrossBeamTopMaxMm, value)
    );
    syncPlannerUrlState();
  }

  function setMonitorStandLegExtraMarginMm(value: number) {
    postureSettings.monitorStandLegExtraMarginMm = Math.max(
      PLANNER_POSTURE_LIMITS.monitorStandLegExtraMarginMinMm,
      Math.min(PLANNER_POSTURE_LIMITS.monitorStandLegExtraMarginMaxMm, value)
    );
    syncPlannerUrlState();
  }

  function setMonitorStandFootLengthMm(value: number) {
    postureSettings.monitorStandFootLengthMm = Math.max(
      monitorStandFootLengthLimits.min,
      Math.min(monitorStandFootLengthLimits.max, value)
    );
    syncPlannerUrlState();
  }

  function setMonitorStandFeetType(value: PlannerMonitorStandFeetType) {
    postureSettings.monitorStandFeetType = value;
    if (value === 'none') {
      postureSettings.monitorStandFeetHeightMm = 0;
    } else if (
      postureSettings.monitorStandFeetHeightMm < PLANNER_POSTURE_LIMITS.monitorStandFeetHeightMinMm ||
      postureSettings.monitorStandFeetHeightMm > PLANNER_POSTURE_LIMITS.monitorStandFeetHeightMaxMm
    ) {
      postureSettings.monitorStandFeetHeightMm = DEFAULT_MONITOR_STAND_RUBBER_FEET_HEIGHT_MM;
    }
    syncPlannerUrlState();
  }

  function setMonitorStandFeetHeightMm(value: number) {
    if (postureSettings.monitorStandFeetType === 'none') {
      postureSettings.monitorStandFeetHeightMm = 0;
      syncPlannerUrlState();
      return;
    }
    postureSettings.monitorStandFeetHeightMm = Math.max(
      PLANNER_POSTURE_LIMITS.monitorStandFeetHeightMinMm,
      Math.min(PLANNER_POSTURE_LIMITS.monitorStandFeetHeightMaxMm, value)
    );
    syncPlannerUrlState();
  }

  function setShowPostureModel(value: boolean) {
    postureSettings.showModel = value;
    syncPlannerUrlState();
  }

  function setShowPostureSkeleton(value: boolean) {
    postureSettings.showSkeleton = value;
    syncPlannerUrlState();
  }

  function setPostureAdvanced(value: boolean) {
    postureSettings.advanced = value;
    syncPlannerUrlState();
  }

  function getPostureTargetRange(key: PlannerPostureTargetKey) {
    return postureSettings.targetRangesByPreset[postureSettings.preset][key];
  }

  function normalizePostureTargetRangeValue(value: IntervalSliderValue): PlannerPostureTargetRange {
    return Array.isArray(value) ? { min: value[0], max: value[1] } : value;
  }

  function clampPostureTargetRangeValue(value: number, key: PlannerPostureTargetKey) {
    const limits = getPlannerPostureTargetRangeControlLimits(postureSettings.preset, key);

    return Math.max(limits.min, Math.min(limits.max, value));
  }

  function setPostureTargetRange(key: PlannerPostureTargetKey, value: IntervalSliderValue) {
    const range = getPostureTargetRange(key);
    const nextRange = normalizePostureTargetRangeValue(value);
    const nextMin = clampPostureTargetRangeValue(Math.min(nextRange.min, nextRange.max), key);
    const nextMax = clampPostureTargetRangeValue(Math.max(nextRange.min, nextRange.max), key);

    range.min = nextMin;
    range.max = nextMax;
    syncPlannerUrlState();
  }

  function formatPostureTargetValue(value: number, unit: PlannerPostureMetric['unit']) {
    return unit === 'deg' ? `${value.toFixed(0)}°` : `${value.toFixed(0)} mm`;
  }

  function setOptimizerMode(value: PlannerOptimizationSettings['mode']) {
    optimizationSettings.mode = value;
    syncPlannerUrlState();
  }

  function setCurrencyMode(value: PlannerOptimizationSettings['currencyMode']) {
    optimizationSettings.currencyMode = value;
    syncPlannerUrlState();
  }

  function setBladeThicknessMm(value: number) {
    const roundedValue = Math.round(value / BLADE_THICKNESS_STEP_MM) * BLADE_THICKNESS_STEP_MM;
    optimizationSettings.bladeThicknessMm = Number(
      Math.min(BLADE_THICKNESS_MAX_MM, Math.max(BLADE_THICKNESS_MIN_MM, roundedValue)).toFixed(1)
    );
    syncPlannerUrlState();
  }

  function setSafetyMarginMm(value: number) {
    optimizationSettings.safetyMarginMm = Math.max(0, Math.round(value));
    syncPlannerUrlState();
  }

  function setShippingMode(value: PlannerOptimizationSettings['shippingMode']) {
    optimizationSettings.shippingMode = value;
    syncPlannerUrlState();
  }

  function setFlatShippingCost(value: number) {
    optimizationSettings.flatShippingCost = Math.max(0, value);
    syncPlannerUrlState();
  }

  function setShippingRatePerKg(value: number) {
    optimizationSettings.shippingRatePerKg = Math.max(0, value);
    syncPlannerUrlState();
  }

  function setProfileWeightKgPerMeter(profileType: '40x40' | '80x40', value: number) {
    optimizationSettings.profileWeightsKgPerMeter[profileType] = Math.max(0, value);
    syncPlannerUrlState();
  }

  function setHardwareUnitCost(hardwareType: PlannerHardwareType, value: number) {
    optimizationSettings.hardwareUnitCosts[hardwareType] = Math.max(0, value);
    syncPlannerUrlState();
  }

  function addStockOption(profileType: '40x40' | '80x40') {
    optimizationSettings.stockOptions.push({
      id: createStockOptionId(),
      profileType,
      lengthMm: 1000,
      cost: getPlannerStockCostDefault(profileType, 1000),
    });
    syncPlannerUrlState();
  }

  function updateStockOptionLengthMm(stockOptionId: string, value: number) {
    const stockOption = optimizationSettings.stockOptions.find((option) => option.id === stockOptionId);

    if (!stockOption) {
      return;
    }

    stockOption.lengthMm = Math.max(0, Math.round(value));
    stockOption.cost = Math.min(
      stockOption.cost,
      getPlannerStockCostMax(stockOption.profileType, stockOption.lengthMm)
    );
    syncPlannerUrlState();
  }

  function updateStockOptionCost(stockOptionId: string, value: number) {
    const stockOption = optimizationSettings.stockOptions.find((option) => option.id === stockOptionId);

    if (!stockOption) {
      return;
    }

    stockOption.cost = Math.min(
      Math.max(0, value),
      getPlannerStockCostMax(stockOption.profileType, stockOption.lengthMm)
    );
    syncPlannerUrlState();
  }

  function removeStockOption(stockOptionId: string) {
    const stockOptionIndex = optimizationSettings.stockOptions.findIndex((option) => option.id === stockOptionId);

    if (stockOptionIndex < 0) {
      return;
    }

    optimizationSettings.stockOptions.splice(stockOptionIndex, 1);
    syncPlannerUrlState();
  }

  function formatStockLengthMeters(lengthMm: number) {
    return `${(lengthMm / 1000).toFixed(1)} m`;
  }

  function formatCurrencyValue(value: number) {
    return formatPlannerMoney(value, currencyLocale, currencyCode);
  }

  function formatCurrencyPerKg(value: number) {
    return `${formatCurrencyValue(value)}/kg`;
  }
</script>

<div
  {@attach capturePlannerRoot}
  data-testid="aluminum-rig-planner-root"
  class="not-content overflow-hidden rounded border border-zinc-300 bg-white shadow-sm"
>
  {#if mounted}
    <div class={isNarrowViewport ? 'flex flex-col' : 'grid grid-cols-[minmax(0,1.3fr)_19.2rem]'}>
      <div
        class="flex min-w-0 flex-col border-b border-zinc-300 bg-[linear-gradient(180deg,#fafafa_0%,#f4f4f5_100%)] lg:border-b-0 lg:border-r"
      >
        {#if PlannerScene && humanModel && postureReport}
          <div class={isNarrowViewport ? 'mx-auto w-[clamp(18rem,84vw,42rem)] max-w-full' : 'w-full'}>
            <PlannerScene
              geometry={sceneGeometry}
              {highlightedBeamIds}
              {isNarrowViewport}
              {measurementOverlay}
              {profileColor}
              {humanModel}
              {postureReport}
              postureSettings={scenePostureSettings}
              {showEndCaps}
              {visibleModules}
              onOptimizePosture={optimizeCurrentPosturePreset}
            />
          </div>
        {:else}
          <div class={isNarrowViewport ? 'mx-auto w-[clamp(18rem,84vw,42rem)] max-w-full' : 'w-full'}>
            <div class="grid aspect-[3/2] w-full place-items-center border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
              {#if sceneStatus === 'error' || humanModelStatus === 'error'}
                <span data-testid="aluminum-rig-planner-preview-error">3D scene failed to load. Refresh to retry.</span>
              {:else}
                <span>Loading 3D scene...</span>
              {/if}
            </div>
          </div>
        {/if}

        <CutOptimizerPanel
          {cutListEntries}
          {currencyCode}
          {currencyLocale}
          {hoveredCutListKey}
          {isNarrowViewport}
          {optimizationResult}
          {optimizationSettings}
          {hardwareSummaryRows}
          {profileColor}
          onHoveredCutListKeyChange={(key) => {
            hoveredCutListKey = key;
          }}
        />
      </div>

      <div
        class={isNarrowViewport
          ? 'flex shrink-0 flex-col divide-y divide-zinc-300'
          : 'flex shrink-0 flex-col divide-y divide-zinc-300 bg-white'}
      >
        <Pane title="General" position="inline" bind:expanded={paneExpanded.general}>
          <List bind:value={profileColorMode} options={COLOR_MODE_OPTIONS} label="Finish" />
          {#if profileColorMode === 'custom'}
            <Color bind:value={customProfileColor} label="Custom" />
          {/if}
          <Checkbox bind:value={showEndCaps} label="Endcaps" />
          <Checkbox bind:value={() => postureSettings.advanced, setPostureAdvanced} label="Advanced" />
        </Pane>
        <Pane title="Posture" position="inline" bind:expanded={paneExpanded.posture}>
          <Folder title="Driver">
            <List
              bind:value={() => postureSettings.preset, setPosturePreset}
              options={POSTURE_PRESET_OPTIONS}
              label="Preset"
            />
            <div {@attach capturePostureHeightControl}>
              <Slider
                bind:value={() => postureHeightControlValue, setPostureHeightCm}
                label="Height"
                min={PLANNER_POSTURE_LIMITS.heightMinCm}
                max={PLANNER_POSTURE_LIMITS.heightMaxCm}
                step={1}
                format={(value) => `${value.toFixed(0)} cm`}
              />
            </div>
            <Checkbox bind:value={() => postureSettings.showModel, setShowPostureModel} label="Show Model" />
            <Checkbox bind:value={() => postureSettings.showSkeleton, setShowPostureSkeleton} label="Show Skeleton" />
          </Folder>
          {#if postureSettings.advanced}
            <Folder title="Posture Target">
              {#if postureReport}
                {#each postureReport.metrics as metric (metric.key)}
                  {@const sliderLimits = getPlannerPostureTargetRangeControlLimits(postureSettings.preset, metric.key)}
                  <IntervalSlider
                    bind:value={
                      () => getPostureTargetRange(metric.key), (value) => setPostureTargetRange(metric.key, value)
                    }
                    label={metric.label}
                    min={sliderLimits.min}
                    max={sliderLimits.max}
                    step={1}
                    format={(value) => formatPostureTargetValue(value, metric.unit)}
                  />
                {/each}
              {/if}
            </Folder>
          {/if}
        </Pane>
        <Pane title="Rig Settings" position="inline" bind:expanded={paneExpanded.setup}>
          <Folder title="Enabled Modules">
            <Checkbox bind:value={() => visibleModules.monitor, setMonitorVisible} label="Monitor" />
            {#if visibleModules.monitor}
              <Checkbox bind:value={() => visibleModules.monitorStand, setMonitorStandVisible} label="Monitor Stand" />
            {/if}
          </Folder>
          {#if visibleModules.monitor}
            <Folder title="Monitor" expanded={false}>
              <Slider
                bind:value={() => postureSettings.monitorSizeIn, setMonitorSizeIn}
                label="Size"
                min={PLANNER_POSTURE_LIMITS.monitorSizeMinIn}
                max={PLANNER_POSTURE_LIMITS.monitorSizeMaxIn}
                step={PLANNER_POSTURE_LIMITS.monitorSizeStepIn}
                format={(value) => `${value.toFixed(0)} in`}
              />
              <List
                bind:value={() => postureSettings.monitorAspectRatio, setMonitorAspectRatio}
                options={MONITOR_ASPECT_RATIO_OPTIONS}
                label="Aspect Ratio"
              />
              <List
                bind:value={() => postureSettings.monitorCurvature, setMonitorCurvature}
                options={monitorCurvatureOptions}
                label="Curvature"
              />
              <Slider
                bind:value={() => postureSettings.monitorTiltDeg, setMonitorTiltDeg}
                label="Tilt"
                disabled={postureSettings.monitorTripleScreen}
                min={PLANNER_POSTURE_LIMITS.monitorTiltMinDeg}
                max={PLANNER_POSTURE_LIMITS.monitorTiltMaxDeg}
                step={PLANNER_POSTURE_LIMITS.monitorTiltStepDeg}
                format={(value) => `${value}°`}
              />
              <Slider
                bind:value={() => postureSettings.monitorTargetFovDeg, setMonitorTargetFovDeg}
                label="FOV"
                disabled={isMonitorArcCenterAtEyesActive}
                min={monitorTargetFovLimits.min}
                max={monitorTargetFovLimits.max}
                step={PLANNER_POSTURE_LIMITS.monitorTargetFovStepDeg}
                format={(value) => `${value.toFixed(1)}°`}
              />
              <Slider
                bind:value={() => postureSettings.monitorHeightFromBaseMm, setMonitorHeightFromBaseMm}
                label="Height from Base"
                min={PLANNER_POSTURE_LIMITS.monitorHeightFromBaseMinMm}
                max={PLANNER_POSTURE_LIMITS.monitorHeightFromBaseMaxMm}
                step={1}
                format={(value) => `${value} mm`}
              />
              <Slider
                bind:value={() => postureSettings.monitorDistanceFromEyesMm, setMonitorDistanceFromEyesMm}
                label="Distance from Eyes"
                disabled={isMonitorArcCenterAtEyesActive}
                min={monitorDistanceLimits.min}
                max={monitorDistanceLimits.max}
                step={1}
                format={(value) => `${value} mm`}
              />
              <List
                bind:value={() => postureSettings.monitorVesaType, setMonitorVesaType}
                options={MONITOR_VESA_OPTIONS}
                label="VESA"
              />
              <Slider
                bind:value={() => postureSettings.monitorBottomVesaHoleDistanceMm, setMonitorBottomVesaHoleDistanceMm}
                label="Vesa Height"
                min={PLANNER_POSTURE_LIMITS.monitorBottomVesaHoleDistanceMinMm}
                max={PLANNER_POSTURE_LIMITS.monitorBottomVesaHoleDistanceMaxMm}
                step={1}
                format={(value) => `${value} mm`}
              />
              <Checkbox
                bind:value={() => postureSettings.monitorTripleScreen, setMonitorTripleScreen}
                label="Triple Screen"
              />
              {#if postureSettings.monitorTripleScreen && postureSettings.monitorCurvature !== 'disabled'}
                <Checkbox
                  bind:value={() => postureSettings.monitorArcCenterAtEyes, setMonitorArcCenterAtEyes}
                  label="Arc Center at Eyes"
                />
              {/if}
              <Button on:click={resetMonitorModule} label="" title="Reset" />
            </Folder>
          {/if}
          {#if visibleModules.monitor && visibleModules.monitorStand}
            <Folder title="Monitor Stand" expanded={false}>
              <Slider
                bind:value={
                  () => postureSettings.monitorBottomVesaHolesToCrossBeamTopMm,
                  setMonitorBottomVesaHolesToCrossBeamTopMm
                }
                label="Holes to Beam Top"
                min={PLANNER_POSTURE_LIMITS.monitorBottomVesaHolesToCrossBeamTopMinMm}
                max={PLANNER_POSTURE_LIMITS.monitorBottomVesaHolesToCrossBeamTopMaxMm}
                step={1}
                format={(value) => `${value} mm`}
              />
              <Slider
                bind:value={() => postureSettings.monitorStandLegExtraMarginMm, setMonitorStandLegExtraMarginMm}
                label="Leg Margin"
                min={PLANNER_POSTURE_LIMITS.monitorStandLegExtraMarginMinMm}
                max={PLANNER_POSTURE_LIMITS.monitorStandLegExtraMarginMaxMm}
                step={PLANNER_CONTROL_STEP_MM}
                format={(value) => `${value} mm`}
              />
              <Slider
                bind:value={() => postureSettings.monitorStandFootLengthMm, setMonitorStandFootLengthMm}
                label="Foot Length"
                min={monitorStandFootLengthLimits.min}
                max={monitorStandFootLengthLimits.max}
                step={PLANNER_CONTROL_STEP_MM}
                format={(value) => `${value} mm`}
              />
              <List
                bind:value={() => postureSettings.monitorStandFeetType, setMonitorStandFeetType}
                options={MONITOR_STAND_FEET_TYPE_OPTIONS}
                label="Feet Type"
              />
              {#if postureSettings.monitorStandFeetType !== 'none'}
                <Slider
                  bind:value={() => postureSettings.monitorStandFeetHeightMm, setMonitorStandFeetHeightMm}
                  label="Feet Height"
                  min={PLANNER_POSTURE_LIMITS.monitorStandFeetHeightMinMm}
                  max={PLANNER_POSTURE_LIMITS.monitorStandFeetHeightMaxMm}
                  step={PLANNER_CONTROL_STEP_MM}
                  format={(value) => `${value} mm`}
                />
              {/if}
              <Button on:click={resetMonitorStandModule} label="" title="Reset" />
            </Folder>
          {/if}
          <Folder title="Base" expanded={false}>
            <Slider
              bind:value={() => plannerInput.baseLengthMm, setBaseLengthMm}
              label="Length"
              min={PLANNER_DIMENSION_LIMITS.baseLengthMinMm}
              max={PLANNER_DIMENSION_LIMITS.baseLengthMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.baseWidthMm, setBaseWidthMm}
              label="Width"
              min={PLANNER_DIMENSION_LIMITS.baseWidthMinMm}
              max={PLANNER_DIMENSION_LIMITS.baseWidthMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <List
              bind:value={() => plannerInput.baseFeetType, setBaseFeetType}
              options={BASE_FEET_TYPE_OPTIONS}
              label="Feet Type"
            />
            {#if plannerInput.baseFeetType !== 'none'}
              <Slider
                bind:value={() => plannerInput.baseFeetHeightMm, setBaseFeetHeightMm}
                label="Feet Height"
                min={PLANNER_DIMENSION_LIMITS.baseFeetHeightMinMm}
                max={PLANNER_DIMENSION_LIMITS.baseFeetHeightMaxMm}
                step={PLANNER_CONTROL_STEP_MM}
                format={(value) => `${value} mm`}
              />
            {/if}
            <Slider
              bind:value={() => plannerInput.seatBaseDepthMm, setSeatBaseDepthMm}
              label="Seat Base Depth"
              min={PLANNER_DIMENSION_LIMITS.seatBaseDepthMinMm}
              max={seatBaseDepthMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.baseInnerBeamSpacingMm, setBaseInnerBeamSpacingMm}
              label="Seat Beam Spacing"
              min={PLANNER_DIMENSION_LIMITS.baseInnerBeamSpacingMinMm}
              max={PLANNER_DIMENSION_LIMITS.baseInnerBeamSpacingMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Button on:click={resetBaseModule} label="" title="Reset" />
          </Folder>
          <Folder title="Seat" expanded={false}>
            <Slider
              bind:value={() => plannerInput.seatHeightFromBaseInnerBeamsMm, setSeatHeightFromBaseInnerBeamsMm}
              label="Height"
              min={PLANNER_DIMENSION_LIMITS.seatHeightFromBaseInnerBeamsMinMm}
              max={PLANNER_DIMENSION_LIMITS.seatHeightFromBaseInnerBeamsMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.seatDeltaMm, setSeatDeltaMm}
              label="Position"
              min={PLANNER_DIMENSION_LIMITS.seatDeltaMinMm}
              max={PLANNER_DIMENSION_LIMITS.seatDeltaMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
              wide={true}
            />
            <Slider
              bind:value={() => plannerInput.seatLengthMm, setSeatLengthMm}
              label="Seat Pan Length"
              min={PLANNER_DIMENSION_LIMITS.seatLengthMinMm}
              max={PLANNER_DIMENSION_LIMITS.seatLengthMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.seatAngleDeg, setSeatAngleDeg}
              label="Seat Pan Angle"
              min={PLANNER_DIMENSION_LIMITS.seatAngleDegMin}
              max={PLANNER_DIMENSION_LIMITS.seatAngleDegMax}
              step={1}
              format={(value) => `${value}°`}
            />
            <Slider
              bind:value={() => plannerInput.backrestAngleDeg, setBackrestAngleDeg}
              label="Backrest Angle"
              min={PLANNER_DIMENSION_LIMITS.backrestAngleDegMin}
              max={PLANNER_DIMENSION_LIMITS.backrestAngleDegMax}
              step={1}
              format={(value) => `${value}°`}
            />
            <Button on:click={resetSeatModule} label="" title="Reset" />
          </Folder>
          <Folder title="Wheel" expanded={false}>
            <Slider
              bind:value={() => plannerInput.wheelDiameterMm, setWheelDiameterMm}
              label="Diameter"
              min={wheelDiameterLimits.min}
              max={wheelDiameterLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.wheelAngleDeg, setWheelAngleDeg}
              label="Angle"
              min={wheelAngleLimits.min}
              max={wheelAngleLimits.max}
              step={1}
              format={(value) => `${value}°`}
            />
            <Slider
              bind:value={() => plannerInput.wheelHeightOffsetMm, setWheelHeightOffsetMm}
              label="V Offset"
              min={wheelHeightOffsetLimits.min}
              max={wheelHeightOffsetLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.wheelDistanceFromSteeringColumnMm, setWheelDistanceFromSteeringColumnMm}
              label="H Offset"
              min={wheelDistanceLimits.min}
              max={wheelDistanceLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Button on:click={resetWheelModule} label="" title="Reset" />
          </Folder>
          <Folder title="Steering Column" expanded={false}>
            <Slider
              bind:value={() => plannerInput.steeringColumnHeightMm, setSteeringColumnHeightMm}
              label="Height"
              min={steeringColumnHeightLimits.min}
              max={steeringColumnHeightLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.steeringColumnDistanceMm, setSteeringColumnDistanceMm}
              label="Distance"
              min={steeringColumnDistanceLimits.min}
              max={steeringColumnDistanceLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.steeringColumnBaseHeightMm, setSteeringColumnBaseHeightMm}
              label="Base Height"
              min={steeringColumnBaseHeightLimits.min}
              max={steeringColumnBaseHeightLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Button on:click={resetSteeringColumnModule} label="" title="Reset" />
          </Folder>
          <Folder title="Pedal Tray" expanded={false}>
            <Slider
              bind:value={() => plannerInput.pedalTrayDepthMm, setPedalTrayDepthMm}
              label="Depth"
              min={PLANNER_DIMENSION_LIMITS.pedalTrayDepthMinMm}
              max={PLANNER_DIMENSION_LIMITS.pedalTrayDepthMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.pedalTrayDistanceMm, setPedalTrayDistanceMm}
              label="Distance"
              min={pedalTrayDistanceLimits.min}
              max={pedalTrayDistanceLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Button on:click={resetPedalTrayModule} label="Reset" title="Reset" />
          </Folder>
          <Folder title="Pedals" expanded={false}>
            <Slider
              bind:value={() => plannerInput.pedalLengthMm, setPedalLengthMm}
              label="Length"
              min={pedalLengthLimits.min}
              max={pedalLengthLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.pedalAngleDeg, setPedalAngleDeg}
              label="Angle"
              min={pedalAngleLimits.min}
              max={pedalAngleLimits.max}
              step={1}
              format={(value) => `${value}°`}
            />
            <Slider
              bind:value={() => plannerInput.pedalsHeightMm, setPedalsHeightMm}
              label="Height"
              min={pedalsHeightLimits.min}
              max={pedalsHeightLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.pedalsDeltaMm, setPedalsDeltaMm}
              label="H Offset"
              min={pedalsDeltaLimits.min}
              max={pedalsDeltaLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.pedalAcceleratorDeltaMm, setPedalAcceleratorDeltaMm}
              label="Accel Side Offset"
              min={pedalAcceleratorDeltaLimits.min}
              max={pedalAcceleratorDeltaLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.pedalBrakeDeltaMm, setPedalBrakeDeltaMm}
              label="Brake Side Offset"
              min={pedalBrakeDeltaLimits.min}
              max={pedalBrakeDeltaLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.pedalClutchDeltaMm, setPedalClutchDeltaMm}
              label="Clutch Side Offset"
              min={pedalClutchDeltaLimits.min}
              max={pedalClutchDeltaLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Button on:click={resetPedalsModule} label="" title="Reset" />
          </Folder>
        </Pane>
        <Pane title="Cutlist Optimizer" position="inline" bind:expanded={paneExpanded.optimizer}>
          <Folder title="Settings">
            <List
              bind:value={() => optimizationSettings.mode, setOptimizerMode}
              options={OPTIMIZER_MODE_OPTIONS}
              label="Optimize Mode"
            />
            <List
              bind:value={() => optimizationSettings.currencyMode, setCurrencyMode}
              options={CURRENCY_MODE_OPTIONS}
              label="Currency"
            />
            <Slider
              bind:value={() => optimizationSettings.bladeThicknessMm, setBladeThicknessMm}
              label="Blade Kerf"
              min={BLADE_THICKNESS_MIN_MM}
              max={BLADE_THICKNESS_MAX_MM}
              step={BLADE_THICKNESS_STEP_MM}
              format={(value) => `${value.toFixed(1)} mm`}
            />
            <Slider
              bind:value={() => optimizationSettings.safetyMarginMm, setSafetyMarginMm}
              label="Safety Margin"
              min={0}
              max={OPTIMIZER_LIMITS.safetyMarginMaxMm}
              step={1}
              format={(value) => `${value.toFixed(0)} mm`}
            />
            <List
              bind:value={() => optimizationSettings.shippingMode, setShippingMode}
              options={SHIPPING_MODE_OPTIONS}
              label="Shipping"
            />
            {#if optimizationSettings.shippingMode === 'flat'}
              <Slider
                bind:value={() => optimizationSettings.flatShippingCost, setFlatShippingCost}
                label="Shiping Cost"
                min={0}
                max={OPTIMIZER_LIMITS.flatShippingCostMax}
                step={1}
                format={formatCurrencyValue}
              />
            {:else}
              <Slider
                bind:value={() => optimizationSettings.shippingRatePerKg, setShippingRatePerKg}
                label="Shiping Rate"
                min={0}
                max={OPTIMIZER_LIMITS.shippingRatePerKgMax}
                step={0.1}
                format={formatCurrencyPerKg}
              />
            {/if}
          </Folder>
          {#if enabledHardwareTypes.length > 0}
            <Folder title="Hardware">
              {#if enabledHardwareTypes.includes('rubberFeet')}
                <Folder title="Rubber Feet">
                  <Slider
                    bind:value={
                      () => optimizationSettings.hardwareUnitCosts.rubberFeet,
                      (value) => setHardwareUnitCost('rubberFeet', value)
                    }
                    label="Cost / Unit"
                    min={0}
                    max={OPTIMIZER_LIMITS.hardwareUnitCostMax}
                    step={1}
                    format={formatCurrencyValue}
                  />
                </Folder>
              {/if}
            </Folder>
          {/if}
          <Folder title="Stock Configuration" bind:expanded={stockConfigurationExpanded}>
            {#each PROFILE_TYPES as profileType (profileType)}
              <Folder title={profileType}>
                <Slider
                  bind:value={
                    () => optimizationSettings.profileWeightsKgPerMeter[profileType],
                    (value) => setProfileWeightKgPerMeter(profileType, value)
                  }
                  label="Weight"
                  min={0}
                  max={OPTIMIZER_LIMITS.profileWeightMaxKgPerMeter}
                  step={0.01}
                  format={(value) => `${value.toFixed(2)} kg/m`}
                />
                {#if stockOptionsByProfile[profileType].length > 0}
                  {#each stockOptionsByProfile[profileType] as stockOption (stockOption.id)}
                    <Folder title={formatStockLengthMeters(stockOption.lengthMm)}>
                      <Slider
                        bind:value={
                          () => stockOption.lengthMm, (value) => updateStockOptionLengthMm(stockOption.id, value)
                        }
                        label="Length"
                        min={OPTIMIZER_LIMITS.stockLengthMinMm}
                        max={OPTIMIZER_LIMITS.stockLengthMaxMm}
                        step={STOCK_LENGTH_STEP_MM}
                        format={formatStockLengthMeters}
                      />
                      <Slider
                        bind:value={() => stockOption.cost, (value) => updateStockOptionCost(stockOption.id, value)}
                        label="Cost"
                        min={0}
                        max={getPlannerStockCostMax(stockOption.profileType, stockOption.lengthMm)}
                        step={1}
                        format={formatCurrencyValue}
                      />
                      <Button on:click={() => removeStockOption(stockOption.id)} label="" title="Remove" />
                    </Folder>
                  {/each}
                {:else}
                  <Element>
                    <div class="px-1 py-1 text-xs text-zinc-500">No stock lengths added yet.</div>
                  </Element>
                {/if}
                <Button on:click={() => addStockOption(profileType)} label="" title="Add stock length" />
              </Folder>
            {/each}
          </Folder>
        </Pane>
      </div>
    </div>
  {:else}
    <div class="grid h-[420px] place-items-center bg-zinc-50 text-sm text-zinc-500">Loading planner...</div>
  {/if}
</div>

<style>
  :global(.not-content .tp-dfwv) {
    width: 100% !important;
  }
</style>
