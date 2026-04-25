<script lang="ts">
  import { onMount, tick, type Component } from 'svelte';
  import { Button, Checkbox, Color, Element, Folder, List, Pane, Slider } from 'svelte-tweakpane-ui';

  import {
    DEFAULT_CURRENCY_LOCALE,
    formatPlannerMoney,
    resolvePlannerCurrency,
    resolvePlannerLocale,
  } from './currency';
  import { createDebouncedUrlStateWriter } from '../shared/debounced-url-state';
  import { decodeQueryState, encodeQueryState } from '../shared/query-state';
  import CutOptimizerPanel from './CutOptimizerPanel.svelte';
  import { createPlannerCutListEntries } from './cut-list';
  import {
    COLOR_MODE_OPTIONS,
    DEFAULT_CUSTOM_PROFILE_COLOR,
    DEFAULT_PLANNER_POSTURE_SETTINGS,
    DEFAULT_PLANNER_OPTIMIZATION_SETTINGS,
    DEFAULT_PLANNER_INPUT,
    DEFAULT_ACTIVE_POSTURE_PRESET,
    DEFAULT_POSTURE_HEIGHT_CM,
    getPlannerStockCostDefault,
    getPlannerStockCostMax,
    PLANNER_POSTURE_LIMITS,
    PLANNER_CONTROL_STEP_MM,
    PLANNER_DIMENSION_LIMITS,
    PLANNER_LAYOUT,
    POSTURE_PRESET_OPTIONS,
    URL_STATE_DEBOUNCE_MS,
  } from './constants';
  import {
    derivePlannerGeometry,
    getPedalAcceleratorDeltaMaxMm,
    getPedalBrakeDeltaMaxMm,
    getPedalClutchDeltaMaxMm,
    getPedalTrayDistanceMaxMm,
    getPedalTrayDistanceMinMm,
    getSteeringColumnBaseHeightMaxMm,
    getSteeringColumnDistanceMaxMm,
  } from './geometry';
  import {
    createPlannerMeasurementOverlay,
    type PlannerMeasurementKey,
    type PlannerMeasurementOverlay,
  } from './measurement-overlay';
  import { loadPrebuiltProfileGeometries } from './modules/profile-geometry';
  import { createPlannerOptimizationResult } from './optimizer';
  import { createPlannerPostureReport, type PlannerPostureReport } from './posture-report';
  import {
    applyPresetToPlannerInput,
    createPresetPlannerInput,
    getPresetAfterPlannerInputEdit,
    isPresetSolvablePreset,
    recomputePresetDynamicPlannerInput,
  } from './presets';
  import { mergePlannerQueryState, type PlannerQueryState } from './query-state';
  import {
    getAluminumRigPaneExpandedState,
    getNextAluminumRigPaneExpandedState,
    isNarrowAluminumRigViewport,
    type AluminumRigPaneExpandedState,
  } from './state';
  import { BLACK_PROFILE_COLOR, SILVER_PROFILE_COLOR } from './modules/shared';
  import type { PlannerGeometry } from './geometry';
  import type {
    CutListProfileType,
    PlannerCurrencyCode,
    PlannerInput,
    PlannerOptimizationSettings,
    PlannerPosturePreset,
    PlannerPostureSettings,
    PlannerVisibleModules,
  } from './types';

  type PlannerSceneComponent = Component<{
    geometry: PlannerGeometry;
    highlightedBeamIds: string[];
    isNarrowViewport?: boolean;
    measurementOverlay?: PlannerMeasurementOverlay | null;
    profileColor: string;
    postureReport: PlannerPostureReport;
    postureSettings: PlannerPostureSettings<PlannerPosturePreset>;
    showEndCaps: boolean;
    visibleModules: PlannerVisibleModules;
  }>;

  const STATE_KEY = 'state';
  const MEASUREMENT_OVERLAY_TIMEOUT_MS = 1000;
  const debouncedUrlStateWriter = createDebouncedUrlStateWriter(URL_STATE_DEBOUNCE_MS);

  const DEFAULT_INPUT: PlannerInput = createPresetPlannerInput(
    DEFAULT_ACTIVE_POSTURE_PRESET,
    DEFAULT_POSTURE_HEIGHT_CM,
    DEFAULT_PLANNER_INPUT
  );
  const DEFAULT_OPTIMIZATION_SETTINGS: PlannerOptimizationSettings = {
    ...DEFAULT_PLANNER_OPTIMIZATION_SETTINGS,
    profileWeightsKgPerMeter: { ...DEFAULT_PLANNER_OPTIMIZATION_SETTINGS.profileWeightsKgPerMeter },
    stockOptions: DEFAULT_PLANNER_OPTIMIZATION_SETTINGS.stockOptions.map((option) => ({ ...option })),
  };
  const DEFAULT_POSTURE_SETTINGS: PlannerPostureSettings<PlannerPosturePreset> = {
    ...DEFAULT_PLANNER_POSTURE_SETTINGS,
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
      stockOptions: settings.stockOptions.map((option) => ({ ...option })),
    };
  }

  function clonePostureSettings(
    settings: PlannerPostureSettings<PlannerPosturePreset>
  ): PlannerPostureSettings<PlannerPosturePreset> {
    return { ...settings };
  }

  function applyQueryState(state: PlannerQueryState) {
    const mergedState = mergePlannerQueryState(DEFAULT_INPUT, state);

    Object.assign(plannerInput, mergedState.plannerInput);
    Object.assign(optimizationSettings, cloneOptimizationSettings(mergedState.optimizationSettings));
    Object.assign(postureSettings, clonePostureSettings(mergedState.postureSettings));

    for (const option of optimizationSettings.stockOptions) {
      const numericSuffix = Number(option.id.replace(/\D+/g, ''));

      if (Number.isFinite(numericSuffix)) {
        stockOptionIdSequence = Math.max(stockOptionIdSequence, numericSuffix);
      }
    }
  }

  let plannerInput = $state<PlannerInput>({ ...DEFAULT_INPUT });
  let optimizationSettings = $state<PlannerOptimizationSettings>(
    cloneOptimizationSettings(DEFAULT_OPTIMIZATION_SETTINGS)
  );
  let postureSettings = $state<PlannerPostureSettings<PlannerPosturePreset>>(
    clonePostureSettings(DEFAULT_POSTURE_SETTINGS)
  );
  let visibleModules = $state<PlannerVisibleModules>({
    pedalTray: true,
    steeringColumn: true,
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
  let hoveredCutListKey = $state<string | null>(null);
  let activeMeasurementKey = $state<PlannerMeasurementKey | null>(null);
  let controlsReady = $state(false);
  let currencyLocale = $state(DEFAULT_CURRENCY_LOCALE);
  let measurementHideTimeout: ReturnType<typeof setTimeout> | null = null;
  let pendingCustomPresetInput: PlannerInput | null = null;

  async function loadScene() {
    if (PlannerScene || sceneStatus === 'loading') return;

    sceneStatus = 'loading';

    try {
      const [module] = await Promise.all([import('./Scene.svelte'), loadPrebuiltProfileGeometries()]);
      PlannerScene = module.default;
      sceneStatus = 'ready';
    } catch {
      sceneStatus = 'error';
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
    void tick().then(() => {
      controlsReady = true;
      syncPlannerTestIds();
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      debouncedUrlStateWriter.cancel();
      if (measurementHideTimeout) {
        clearTimeout(measurementHideTimeout);
      }
      controlsReady = false;
    };
  });

  const geometry = $derived(derivePlannerGeometry(plannerInput));
  const postureReport = $derived(createPlannerPostureReport(geometry.input, postureSettings));
  const measurementOverlay = $derived.by(() => {
    if (!activeMeasurementKey) {
      return null;
    }

    if (activeMeasurementKey.startsWith('pedalTray') && !visibleModules.pedalTray) {
      return null;
    }

    if (activeMeasurementKey.startsWith('steeringColumn') && !visibleModules.steeringColumn) {
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
  const cutListEntries = $derived(createPlannerCutListEntries(geometry, visibleModules, showEndCaps));
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
    max: getSteeringColumnBaseHeightMaxMm(plannerInput.steeringColumnHeightMm),
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

    return {
      destroy() {
        if (plannerRoot === node) {
          plannerRoot = null;
        }
      },
    };
  }

  function clampPedalTrayDistanceMm() {
    plannerInput.pedalTrayDistanceMm = Math.max(
      pedalTrayDistanceLimits.min,
      Math.min(pedalTrayDistanceLimits.max, plannerInput.pedalTrayDistanceMm)
    );
  }

  function clampPedalSettings() {
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
    pendingCustomPresetInput = { ...$state.snapshot(plannerInput) };
  }

  function flushPosturePresetCustomMark() {
    if (!pendingCustomPresetInput) {
      return;
    }

    const previousInput = pendingCustomPresetInput;
    const nextPreset = getPresetAfterPlannerInputEdit(postureSettings.preset, previousInput, plannerInput);

    pendingCustomPresetInput = null;

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
    plannerInput.steeringColumnBaseHeightMm = Math.max(
      steeringColumnBaseHeightLimits.min,
      Math.min(steeringColumnBaseHeightLimits.max, value)
    );

    syncPlannerUrlState();
    scheduleMeasurementOverlay('steeringColumnBaseHeightMm');
  }

  function setSteeringColumnHeightMm(value: number) {
    markPosturePresetCustom();
    plannerInput.steeringColumnHeightMm = Math.max(
      steeringColumnHeightLimits.min,
      Math.min(steeringColumnHeightLimits.max, value)
    );

    if (
      plannerInput.steeringColumnBaseHeightMm > getSteeringColumnBaseHeightMaxMm(plannerInput.steeringColumnHeightMm)
    ) {
      plannerInput.steeringColumnBaseHeightMm = getSteeringColumnBaseHeightMaxMm(plannerInput.steeringColumnHeightMm);
    }

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

  function resetSetup() {
    Object.assign(plannerInput, DEFAULT_INPUT);
    Object.assign(postureSettings, clonePostureSettings(DEFAULT_POSTURE_SETTINGS));
    profileColorMode = 'black';
    customProfileColor = DEFAULT_CUSTOM_PROFILE_COLOR;
    showEndCaps = true;
    syncPlannerUrlState();
  }

  function resetSteeringColumnModule() {
    setSteeringColumnDistanceMm(DEFAULT_INPUT.steeringColumnDistanceMm);
    setSteeringColumnBaseHeightMm(DEFAULT_INPUT.steeringColumnBaseHeightMm);
    setSteeringColumnHeightMm(DEFAULT_INPUT.steeringColumnHeightMm);
  }

  function resetPedalTrayModule() {
    setPedalTrayDepthMm(DEFAULT_INPUT.pedalTrayDepthMm);
    setPedalTrayDistanceMm(DEFAULT_INPUT.pedalTrayDistanceMm);
  }

  function resetPedalsModule() {
    setPedalsHeightMm(DEFAULT_INPUT.pedalsHeightMm);
    setPedalsDeltaMm(DEFAULT_INPUT.pedalsDeltaMm);
    setPedalAngleDeg(DEFAULT_INPUT.pedalAngleDeg);
    setPedalAcceleratorDeltaMm(DEFAULT_INPUT.pedalAcceleratorDeltaMm);
    setPedalBrakeDeltaMm(DEFAULT_INPUT.pedalBrakeDeltaMm);
    setPedalClutchDeltaMm(DEFAULT_INPUT.pedalClutchDeltaMm);
  }

  function setPosturePreset(value: PlannerPosturePreset) {
    postureSettings.preset = value;

    if (isPresetSolvablePreset(value)) {
      Object.assign(plannerInput, applyPresetToPlannerInput(plannerInput, value, postureSettings.heightCm));
    }

    syncPlannerUrlState();
  }

  function setPostureHeightCm(value: number) {
    const nextHeightCm = Math.max(
      PLANNER_POSTURE_LIMITS.heightMinCm,
      Math.min(PLANNER_POSTURE_LIMITS.heightMaxCm, value)
    );

    postureSettings.heightCm = nextHeightCm;

    if (isPresetSolvablePreset(postureSettings.preset)) {
      Object.assign(
        plannerInput,
        recomputePresetDynamicPlannerInput(plannerInput, postureSettings.preset, nextHeightCm)
      );
    }

    syncPlannerUrlState();
  }

  function setMonitorMidpointXMm(value: number) {
    postureSettings.monitorMidpointXMm = Math.max(
      PLANNER_POSTURE_LIMITS.monitorMidpointXMinMm,
      Math.min(PLANNER_POSTURE_LIMITS.monitorMidpointXMaxMm, value)
    );
    syncPlannerUrlState();
  }

  function setMonitorMidpointYMm(value: number) {
    postureSettings.monitorMidpointYMm = Math.max(
      PLANNER_POSTURE_LIMITS.monitorMidpointYMinMm,
      Math.min(PLANNER_POSTURE_LIMITS.monitorMidpointYMaxMm, value)
    );
    syncPlannerUrlState();
  }

  function setMonitorMidpointZMm(value: number) {
    postureSettings.monitorMidpointZMm = Math.max(
      PLANNER_POSTURE_LIMITS.monitorMidpointZMinMm,
      Math.min(PLANNER_POSTURE_LIMITS.monitorMidpointZMaxMm, value)
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
        {#if PlannerScene}
          <div class={isNarrowViewport ? 'mx-auto w-[clamp(18rem,84vw,42rem)] max-w-full' : 'w-full'}>
            <PlannerScene
              {geometry}
              {highlightedBeamIds}
              {isNarrowViewport}
              {measurementOverlay}
              {profileColor}
              {postureReport}
              {postureSettings}
              {showEndCaps}
              {visibleModules}
            />
          </div>
        {:else}
          <div class={isNarrowViewport ? 'mx-auto w-[clamp(18rem,84vw,42rem)] max-w-full' : 'w-full'}>
            <div class="grid aspect-[3/2] w-full place-items-center border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
              {#if sceneStatus === 'error'}
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
        <Pane title="Posture" position="inline" bind:expanded={paneExpanded.posture}>
          <Folder title="Driver">
            <List
              bind:value={() => postureSettings.preset, setPosturePreset}
              options={POSTURE_PRESET_OPTIONS}
              label="Preset"
            />
            <Slider
              bind:value={() => postureSettings.heightCm, setPostureHeightCm}
              label="Height"
              min={PLANNER_POSTURE_LIMITS.heightMinCm}
              max={PLANNER_POSTURE_LIMITS.heightMaxCm}
              step={1}
              format={(value) => `${value.toFixed(0)} cm`}
            />
            <Checkbox bind:value={() => postureSettings.showModel, setShowPostureModel} label="Model" />
            <Checkbox bind:value={() => postureSettings.showSkeleton, setShowPostureSkeleton} label="Skeleton" />
          </Folder>
          <Folder title="Monitor">
            <Slider
              bind:value={() => postureSettings.monitorMidpointXMm, setMonitorMidpointXMm}
              label="Midpoint X"
              min={PLANNER_POSTURE_LIMITS.monitorMidpointXMinMm}
              max={PLANNER_POSTURE_LIMITS.monitorMidpointXMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => postureSettings.monitorMidpointYMm, setMonitorMidpointYMm}
              label="Midpoint Y"
              min={PLANNER_POSTURE_LIMITS.monitorMidpointYMinMm}
              max={PLANNER_POSTURE_LIMITS.monitorMidpointYMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => postureSettings.monitorMidpointZMm, setMonitorMidpointZMm}
              label="Midpoint Z"
              min={PLANNER_POSTURE_LIMITS.monitorMidpointZMinMm}
              max={PLANNER_POSTURE_LIMITS.monitorMidpointZMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
          </Folder>
        </Pane>
        <Pane title="Settings" position="inline" bind:expanded={paneExpanded.setup}>
          <Folder title="General">
            <List bind:value={profileColorMode} options={COLOR_MODE_OPTIONS} label="Finish" />
            {#if profileColorMode === 'custom'}
              <Color bind:value={customProfileColor} label="Custom" />
            {/if}
            <Checkbox bind:value={showEndCaps} label="Endcaps" />
          </Folder>
          <Folder title="Base">
            <Slider
              bind:value={() => plannerInput.baseLengthMm, setBaseLengthMm}
              label="Base length"
              min={PLANNER_DIMENSION_LIMITS.baseLengthMinMm}
              max={PLANNER_DIMENSION_LIMITS.baseLengthMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.baseWidthMm, setBaseWidthMm}
              label="Base width"
              min={PLANNER_DIMENSION_LIMITS.baseWidthMinMm}
              max={PLANNER_DIMENSION_LIMITS.baseWidthMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.seatBaseDepthMm, setSeatBaseDepthMm}
              label="Seat base depth"
              min={PLANNER_DIMENSION_LIMITS.seatBaseDepthMinMm}
              max={seatBaseDepthMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.baseInnerBeamSpacingMm, setBaseInnerBeamSpacingMm}
              label="Inner beam spacing"
              min={PLANNER_DIMENSION_LIMITS.baseInnerBeamSpacingMinMm}
              max={PLANNER_DIMENSION_LIMITS.baseInnerBeamSpacingMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
          </Folder>
          <Folder title="Seat">
            <Slider
              bind:value={() => plannerInput.seatLengthMm, setSeatLengthMm}
              label="Seat Length"
              min={PLANNER_DIMENSION_LIMITS.seatLengthMinMm}
              max={PLANNER_DIMENSION_LIMITS.seatLengthMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.seatDeltaMm, setSeatDeltaMm}
              label="Seat delta"
              min={PLANNER_DIMENSION_LIMITS.seatDeltaMinMm}
              max={PLANNER_DIMENSION_LIMITS.seatDeltaMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
              wide={true}
            />
            <Slider
              bind:value={() => plannerInput.seatHeightFromBaseInnerBeamsMm, setSeatHeightFromBaseInnerBeamsMm}
              label="Seat height"
              min={PLANNER_DIMENSION_LIMITS.seatHeightFromBaseInnerBeamsMinMm}
              max={PLANNER_DIMENSION_LIMITS.seatHeightFromBaseInnerBeamsMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.seatAngleDeg, setSeatAngleDeg}
              label="Seat angle"
              min={PLANNER_DIMENSION_LIMITS.seatAngleDegMin}
              max={PLANNER_DIMENSION_LIMITS.seatAngleDegMax}
              step={1}
              format={(value) => `${value}°`}
            />
            <Slider
              bind:value={() => plannerInput.backrestAngleDeg, setBackrestAngleDeg}
              label="Backrest angle"
              min={PLANNER_DIMENSION_LIMITS.backrestAngleDegMin}
              max={PLANNER_DIMENSION_LIMITS.backrestAngleDegMax}
              step={1}
              format={(value) => `${value}°`}
            />
          </Folder>
          <Folder title="Wheel">
            <Slider
              bind:value={() => plannerInput.wheelHeightOffsetMm, setWheelHeightOffsetMm}
              label="Height vs column base"
              min={wheelHeightOffsetLimits.min}
              max={wheelHeightOffsetLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.wheelAngleDeg, setWheelAngleDeg}
              label="Wheel angle"
              min={wheelAngleLimits.min}
              max={wheelAngleLimits.max}
              step={1}
              format={(value) => `${value}°`}
            />
            <Slider
              bind:value={() => plannerInput.wheelDistanceFromSteeringColumnMm, setWheelDistanceFromSteeringColumnMm}
              label="Wheel X vs column"
              min={wheelDistanceLimits.min}
              max={wheelDistanceLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.wheelDiameterMm, setWheelDiameterMm}
              label="Wheel diameter"
              min={wheelDiameterLimits.min}
              max={wheelDiameterLimits.max}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
          </Folder>
          {#if visibleModules.pedalTray}
            <Folder title="Pedals">
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
                label="Delta X"
                min={pedalsDeltaLimits.min}
                max={pedalsDeltaLimits.max}
                step={PLANNER_CONTROL_STEP_MM}
                format={(value) => `${value} mm`}
              />
              <Slider
                bind:value={() => plannerInput.pedalAngleDeg, setPedalAngleDeg}
                label="Pedal angle"
                min={pedalAngleLimits.min}
                max={pedalAngleLimits.max}
                step={1}
                format={(value) => `${value}°`}
              />
              <Slider
                bind:value={() => plannerInput.pedalAcceleratorDeltaMm, setPedalAcceleratorDeltaMm}
                label="Accelerator delta"
                min={pedalAcceleratorDeltaLimits.min}
                max={pedalAcceleratorDeltaLimits.max}
                step={PLANNER_CONTROL_STEP_MM}
                format={(value) => `${value} mm`}
              />
              <Slider
                bind:value={() => plannerInput.pedalBrakeDeltaMm, setPedalBrakeDeltaMm}
                label="Brake delta"
                min={pedalBrakeDeltaLimits.min}
                max={pedalBrakeDeltaLimits.max}
                step={PLANNER_CONTROL_STEP_MM}
                format={(value) => `${value} mm`}
              />
              <Slider
                bind:value={() => plannerInput.pedalClutchDeltaMm, setPedalClutchDeltaMm}
                label="Clutch delta"
                min={pedalClutchDeltaLimits.min}
                max={pedalClutchDeltaLimits.max}
                step={PLANNER_CONTROL_STEP_MM}
                format={(value) => `${value} mm`}
              />
              <Button on:click={resetPedalsModule} label="Reset" title="Reset" />
            </Folder>
          {/if}
          <Button on:click={resetSetup} label="Reset" title="Reset" />
          <Folder title="Enabled Modules">
            <Checkbox bind:value={visibleModules.steeringColumn} label="Steering column" />
            <Checkbox bind:value={visibleModules.pedalTray} label="Pedal tray" />
          </Folder>
        </Pane>
        <Pane title="Module Settings" position="inline" bind:expanded={paneExpanded.modules}>
          {#if visibleModules.steeringColumn}
            <Folder title="Steering column">
              <Slider
                bind:value={() => plannerInput.steeringColumnBaseHeightMm, setSteeringColumnBaseHeightMm}
                label="Base height"
                min={steeringColumnBaseHeightLimits.min}
                max={steeringColumnBaseHeightLimits.max}
                step={PLANNER_CONTROL_STEP_MM}
                format={(value) => `${value} mm`}
              />
              <Slider
                bind:value={() => plannerInput.steeringColumnHeightMm, setSteeringColumnHeightMm}
                label="Column Height"
                min={steeringColumnHeightLimits.min}
                max={steeringColumnHeightLimits.max}
                step={PLANNER_CONTROL_STEP_MM}
                format={(value) => `${value} mm`}
              />
              <Slider
                bind:value={() => plannerInput.steeringColumnDistanceMm, setSteeringColumnDistanceMm}
                label="Column distance"
                min={steeringColumnDistanceLimits.min}
                max={steeringColumnDistanceLimits.max}
                step={PLANNER_CONTROL_STEP_MM}
                format={(value) => `${value} mm`}
              />
              <Button on:click={resetSteeringColumnModule} label="Reset" title="Reset" />
            </Folder>
          {/if}
          {#if visibleModules.pedalTray}
            <Folder title="Pedal tray">
              <Slider
                bind:value={() => plannerInput.pedalTrayDepthMm, setPedalTrayDepthMm}
                label="Tray depth"
                min={PLANNER_DIMENSION_LIMITS.pedalTrayDepthMinMm}
                max={PLANNER_DIMENSION_LIMITS.pedalTrayDepthMaxMm}
                step={PLANNER_CONTROL_STEP_MM}
                format={(value) => `${value} mm`}
              />
              <Slider
                bind:value={() => plannerInput.pedalTrayDistanceMm, setPedalTrayDistanceMm}
                label="Tray distance"
                min={pedalTrayDistanceLimits.min}
                max={pedalTrayDistanceLimits.max}
                step={PLANNER_CONTROL_STEP_MM}
                format={(value) => `${value} mm`}
              />
              <Button on:click={resetPedalTrayModule} label="Reset" title="Reset" />
            </Folder>
          {/if}
        </Pane>
        <Pane title="Cut optimizer" position="inline" bind:expanded={paneExpanded.optimizer}>
          <Folder title="Settings">
            <List
              bind:value={() => optimizationSettings.mode, setOptimizerMode}
              options={OPTIMIZER_MODE_OPTIONS}
              label="Optimize"
            />
            <List
              bind:value={() => optimizationSettings.currencyMode, setCurrencyMode}
              options={CURRENCY_MODE_OPTIONS}
              label="Currency"
            />
            <Slider
              bind:value={() => optimizationSettings.bladeThicknessMm, setBladeThicknessMm}
              label="Kerf"
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
                label="Ship cost"
                min={0}
                max={OPTIMIZER_LIMITS.flatShippingCostMax}
                step={1}
                format={formatCurrencyValue}
              />
            {:else}
              <Slider
                bind:value={() => optimizationSettings.shippingRatePerKg, setShippingRatePerKg}
                label="Ship rate"
                min={0}
                max={OPTIMIZER_LIMITS.shippingRatePerKgMax}
                step={0.1}
                format={formatCurrencyPerKg}
              />
            {/if}
          </Folder>
          <Folder title="Stock configuration" bind:expanded={stockConfigurationExpanded}>
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
                      <Button on:click={() => removeStockOption(stockOption.id)} label="Remove" title="Remove" />
                    </Folder>
                  {/each}
                {:else}
                  <Element>
                    <div class="px-1 py-1 text-xs text-zinc-500">No stock lengths added yet.</div>
                  </Element>
                {/if}
                <Button
                  on:click={() => addStockOption(profileType)}
                  label="Add stock length"
                  title="Add stock length"
                />
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
