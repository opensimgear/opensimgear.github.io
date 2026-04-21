<script lang="ts">
  import { onMount, type Component } from 'svelte';
  import { Button, Checkbox, Color, Element, Folder, List, Pane, Slider } from 'svelte-tweakpane-ui';

  import { createDebouncedUrlStateWriter } from '../shared/debounced-url-state';
  import { decodeQueryState, encodeQueryState } from '../shared/query-state';
  import { createPlannerCutList } from './cut-list';
  import {
    COLOR_MODE_OPTIONS,
    DEFAULT_CUSTOM_PROFILE_COLOR,
    DEFAULT_PLANNER_INPUT,
    IMMEDIATE_SCENE_LOAD_TIMEOUT_MS,
    PLANNER_CONTROL_STEP_MM,
    PLANNER_DIMENSION_LIMITS,
    PLANNER_LAYOUT,
    SCENE_IDLE_LOAD_TIMEOUT_MS,
    URL_STATE_DEBOUNCE_MS,
  } from './constants';
  import {
    derivePlannerGeometry,
    getPedalTrayDistanceMaxMm,
    getPedalTrayDistanceMinMm,
    getSteeringColumnDistanceMaxMm,
  } from './geometry';
  import { loadPrebuiltProfileGeometries } from './modules/profile-geometry';
  import { mergePlannerQueryState, type PlannerQueryState } from './query-state';
  import {
    getAluminumRigPaneExpandedState,
    getNextAluminumRigPaneExpandedState,
    isNarrowAluminumRigViewport,
    type AluminumRigPaneExpandedState,
  } from './state';
  import { BLACK_PROFILE_COLOR, SILVER_PROFILE_COLOR } from './modules/shared';
  import type { PlannerGeometry } from './geometry';
  import type { PlannerInput, PlannerVisibleModules } from './types';

  type PlannerSceneComponent = Component<{
    geometry: PlannerGeometry;
    isNarrowViewport?: boolean;
    profileColor: string;
    showEndCaps: boolean;
    visibleModules: PlannerVisibleModules;
  }>;

  const STATE_KEY = 'state';
  const debouncedUrlStateWriter = createDebouncedUrlStateWriter(URL_STATE_DEBOUNCE_MS);

  const DEFAULT_INPUT: PlannerInput = { ...DEFAULT_PLANNER_INPUT };
  function applyQueryState(state: PlannerQueryState) {
    const mergedState = mergePlannerQueryState(DEFAULT_INPUT, state);

    Object.assign(plannerInput, mergedState.plannerInput);
  }

  let plannerInput = $state<PlannerInput>({ ...DEFAULT_INPUT });
  let visibleModules = $state<PlannerVisibleModules>({
    pedalTray: true,
    steeringColumn: true,
  });
  let profileColorMode = $state<(typeof COLOR_MODE_OPTIONS)[number]['value']>('black');
  let customProfileColor = $state(DEFAULT_CUSTOM_PROFILE_COLOR);
  let showEndCaps = $state(true);
  let isNarrowViewport = $state(false);
  let paneExpanded = $state<AluminumRigPaneExpandedState>(getAluminumRigPaneExpandedState(false));
  let mounted = $state(false);
  let PlannerScene = $state<PlannerSceneComponent | null>(null);
  let sceneStatus = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');

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
    let cancelSceneLoad = () => {};
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

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(
        () => {
          void loadScene();
        },
        { timeout: SCENE_IDLE_LOAD_TIMEOUT_MS }
      );

      cancelSceneLoad = () => window.cancelIdleCallback(idleId);
    } else {
      const timeoutId = window.setTimeout(() => {
        void loadScene();
      }, IMMEDIATE_SCENE_LOAD_TIMEOUT_MS);

      cancelSceneLoad = () => window.clearTimeout(timeoutId);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      debouncedUrlStateWriter.cancel();
      cancelSceneLoad();
    };
  });

  const geometry = $derived(derivePlannerGeometry(plannerInput));
  const profileColor = $derived(
    profileColorMode === 'silver'
      ? SILVER_PROFILE_COLOR
      : profileColorMode === 'custom'
        ? customProfileColor
        : BLACK_PROFILE_COLOR
  );
  const cutListRows = $derived(createPlannerCutList(geometry, visibleModules, showEndCaps));
  const encodedPlannerState = $derived(
    encodeQueryState({
      ...$state.snapshot(plannerInput),
    })
  );
  const steeringColumnDistanceLimits = $derived.by(() => ({
    min: PLANNER_LAYOUT.steeringColumnDistanceMinMm,
    max: getSteeringColumnDistanceMaxMm(plannerInput),
  }));
  const pedalTrayDistanceLimits = $derived.by(() => ({
    min: getPedalTrayDistanceMinMm(plannerInput),
    max: getPedalTrayDistanceMaxMm(plannerInput),
  }));
  const seatBaseDepthMaxMm = $derived(Math.min(PLANNER_DIMENSION_LIMITS.seatBaseDepthMaxMm, plannerInput.baseLengthMm));

  function clampPedalTrayDistanceMm() {
    plannerInput.pedalTrayDistanceMm = Math.max(
      pedalTrayDistanceLimits.min,
      Math.min(pedalTrayDistanceLimits.max, plannerInput.pedalTrayDistanceMm)
    );
  }

  function setBaseLengthMm(value: number) {
    plannerInput.baseLengthMm = value;

    if (plannerInput.seatBaseDepthMm > Math.min(PLANNER_DIMENSION_LIMITS.seatBaseDepthMaxMm, value)) {
      plannerInput.seatBaseDepthMm = Math.min(PLANNER_DIMENSION_LIMITS.seatBaseDepthMaxMm, value);
    }

    if (plannerInput.steeringColumnDistanceMm > getSteeringColumnDistanceMaxMm(plannerInput)) {
      plannerInput.steeringColumnDistanceMm = getSteeringColumnDistanceMaxMm(plannerInput);
    }

    clampPedalTrayDistanceMm();
  }

  function setSeatBaseDepthMm(value: number) {
    plannerInput.seatBaseDepthMm = Math.max(
      PLANNER_DIMENSION_LIMITS.seatBaseDepthMinMm,
      Math.min(seatBaseDepthMaxMm, value)
    );

    if (plannerInput.steeringColumnDistanceMm > getSteeringColumnDistanceMaxMm(plannerInput)) {
      plannerInput.steeringColumnDistanceMm = getSteeringColumnDistanceMaxMm(plannerInput);
    }

    clampPedalTrayDistanceMm();
  }

  function setPedalTrayDepthMm(value: number) {
    plannerInput.pedalTrayDepthMm = Math.max(
      PLANNER_DIMENSION_LIMITS.pedalTrayDepthMinMm,
      Math.min(PLANNER_DIMENSION_LIMITS.pedalTrayDepthMaxMm, value)
    );

    clampPedalTrayDistanceMm();
  }

  function setPedalTrayDistanceMm(value: number) {
    plannerInput.pedalTrayDistanceMm = Math.max(pedalTrayDistanceLimits.min, Math.min(pedalTrayDistanceLimits.max, value));
  }

  function setSteeringColumnBaseHeightMm(value: number) {
    plannerInput.steeringColumnBaseHeightMm = value;

    if (
      plannerInput.steeringColumnHeightMm <
      Math.max(PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm, value + PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm)
    ) {
      plannerInput.steeringColumnHeightMm = Math.max(
        PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm,
        value + PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm
      );
    }
  }

  function setSteeringColumnHeightMm(value: number) {
    plannerInput.steeringColumnHeightMm = Math.max(PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm, Math.min(PLANNER_DIMENSION_LIMITS.steeringColumnHeightMaxMm, value));
  }

  function resetSetup() {
    Object.assign(plannerInput, DEFAULT_INPUT);
    profileColorMode = 'black';
    customProfileColor = DEFAULT_CUSTOM_PROFILE_COLOR;
    showEndCaps = true;
  }

  function resetSteeringColumnModule() {
    plannerInput.steeringColumnDistanceMm = DEFAULT_INPUT.steeringColumnDistanceMm;
    setSteeringColumnBaseHeightMm(DEFAULT_INPUT.steeringColumnBaseHeightMm);
    setSteeringColumnHeightMm(DEFAULT_INPUT.steeringColumnHeightMm);
  }

  function resetPedalTrayModule() {
    setPedalTrayDepthMm(DEFAULT_INPUT.pedalTrayDepthMm);
    setPedalTrayDistanceMm(DEFAULT_INPUT.pedalTrayDistanceMm);
  }

  $effect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const url = new URL(window.location.href);

    if (url.searchParams.get(STATE_KEY) === encodedPlannerState) {
      debouncedUrlStateWriter.cancel();
      return;
    }

    url.searchParams.set(STATE_KEY, encodedPlannerState);
    debouncedUrlStateWriter.schedule(url.toString());
  });
</script>

<div class="not-content overflow-hidden rounded border border-zinc-300 bg-white shadow-sm">
  {#if mounted}
    <div class={isNarrowViewport ? 'flex flex-col' : 'grid grid-cols-[minmax(0,1.3fr)_24rem]'}>
      <div
        class="flex min-w-0 flex-col gap-4 border-b border-zinc-300 bg-[linear-gradient(180deg,#fafafa_0%,#f4f4f5_100%)] lg:border-b-0 lg:border-r"
      >
        {#if PlannerScene}
          <PlannerScene {geometry} {isNarrowViewport} {profileColor} {showEndCaps} {visibleModules} />
        {:else}
          <div class="grid aspect-[3/2] w-full place-items-center border-zinc-200 bg-zinc-50 text-sm text-zinc-500">
            {#if sceneStatus === 'error'}
              <span>3D scene failed to load. Refresh to retry.</span>
            {:else}
              <span>Loading 3D scene...</span>
            {/if}
          </div>
        {/if}
      </div>

      <div
        class={isNarrowViewport
          ? 'flex shrink-0 flex-col divide-y divide-zinc-300'
          : 'flex shrink-0 flex-col divide-y divide-zinc-300 bg-white'}
      >
        <Pane title="Setup" position="inline" bind:expanded={paneExpanded.setup}>
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
              bind:value={plannerInput.baseWidthMm}
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
              bind:value={plannerInput.baseInnerBeamSpacingMm}
              label="Inner beam spacing"
              min={PLANNER_DIMENSION_LIMITS.baseInnerBeamSpacingMinMm}
              max={PLANNER_DIMENSION_LIMITS.baseInnerBeamSpacingMaxMm}
              step={PLANNER_CONTROL_STEP_MM}
              format={(value) => `${value} mm`}
            />
          </Folder>
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
                min={PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMinMm}
                max={PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMaxMm}
                step={PLANNER_CONTROL_STEP_MM}
                format={(value) => `${value} mm`}
              />
              <Slider
                bind:value={() => plannerInput.steeringColumnHeightMm, setSteeringColumnHeightMm}
                label="Column Height"
                min={PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm}
                max={PLANNER_DIMENSION_LIMITS.steeringColumnHeightMaxMm}
                step={PLANNER_CONTROL_STEP_MM}
                format={(value) => `${value} mm`}
              />
              <Slider
                bind:value={plannerInput.steeringColumnDistanceMm}
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
        <Pane title="Cut list" position="inline" bind:expanded={paneExpanded.cutList}>
          <Element>
            <div class="overflow-x-auto bg-white px-2 py-1 font-['Roboto_Mono',monospace] text-zinc-900">
              <table class="min-w-full border-collapse bg-white text-left text-[12px] leading-tight">
                <thead>
                  <tr class="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                    <th class="px-1.5 py-1 font-medium">Profile</th>
                    <th class="px-1.5 py-1 font-medium">Length</th>
                    <th class="px-1.5 py-1 font-medium">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {#each cutListRows as row (`${row.profileType}-${row.lengthMm}`)}
                    <tr class="border-b border-zinc-100 bg-white last:border-b-0">
                      <td class="px-1.5 py-1 font-medium text-zinc-800">{row.profileType}</td>
                      <td class="px-1.5 py-1 text-zinc-600">{row.lengthMm} mm</td>
                      <td class="px-1.5 py-1 text-zinc-600">{row.quantity}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </Element>
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
