<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Checkbox, Color, Element, Folder, List, Pane, Slider } from 'svelte-tweakpane-ui';

  import { createDebouncedUrlStateWriter } from '../shared/debounced-url-state';
  import { decodeQueryState, encodeQueryState } from '../shared/query-state';
  import { createPlannerCutList } from './cut-list';
  import { derivePlannerGeometry } from './geometry';
  import { createInitialPlannerInput } from './presets';
  import { mergePlannerQueryState, type PlannerQueryState } from './query-state';
  import {
    getAluminiumRigPaneExpandedState,
    getNextAluminiumRigPaneExpandedState,
    isNarrowAluminiumRigViewport,
    type AluminiumRigPaneExpandedState,
  } from './state';
  import { BLACK_PROFILE_COLOR, SILVER_PROFILE_COLOR } from './modules/shared';
  import Scene from './Scene.svelte';
  import type { PlannerInput, PlannerVisibleModules } from './types';

  const STATE_KEY = 'state';
  const URL_STATE_DEBOUNCE_MS = 300;
  const debouncedUrlStateWriter = createDebouncedUrlStateWriter(URL_STATE_DEBOUNCE_MS);
  const COLOR_MODE_OPTIONS = [
    { text: 'Black', value: 'black' },
    { text: 'Silver', value: 'silver' },
    { text: 'Custom', value: 'custom' },
  ] as const;

  const DEFAULT_INPUT: PlannerInput = {
    ...createInitialPlannerInput({
      driverHeightMm: 1750,
      inseamMm: 655,
      seatingBias: 'performance',
      presetType: 'gt',
    }),
    driverHeightMm: 1750,
    inseamMm: 655,
    seatingBias: 'performance',
    presetType: 'gt',
    wheelMountType: 'deck',
    baseLengthMm: 1350,
    seatBaseDepthMm: 390,
    baseInnerBeamSpacingMm: 280,
    pedalTrayDepthMm: 300,
    pedalTrayDistanceMm: 580,
    steeringColumnBaseHeightMm: 430,
    steeringColumnHeightMm: 510,
    baseHeightMm: 40,
    seatXMm: 320,
    seatYMm: 230,
    seatBackAngleDeg: 30,
    pedalXMm: 980,
    pedalYMm: 120,
    pedalAngleDeg: 8,
    wheelXMm: 659,
    wheelYMm: 620,
    wheelTiltDeg: 18,
  };
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
  let customProfileColor = $state(BLACK_PROFILE_COLOR);
  let isNarrowViewport = $state(false);
  let paneExpanded = $state<AluminiumRigPaneExpandedState>(getAluminiumRigPaneExpandedState(false));
  let mounted = $state(false);

  function syncViewportState(width: number, resetPanes = false) {
    const nextIsNarrow = isNarrowAluminiumRigViewport(width);
    const viewportChanged = nextIsNarrow !== isNarrowViewport;
    const nextPaneExpanded = getNextAluminiumRigPaneExpandedState(
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

    return () => {
      window.removeEventListener('resize', handleResize);
      debouncedUrlStateWriter.cancel();
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
  const cutListRows = $derived(createPlannerCutList(geometry, visibleModules));
  const columnDistanceLimits = $derived.by(() => ({
    min: 80,
    max: Math.max(80, plannerInput.baseLengthMm - plannerInput.seatBaseDepthMm - 160),
  }));
  const columnDistanceDisplayMm = $derived.by(() => {
    const currentDistanceMm =
      plannerInput.wheelXMm + geometry.wheelMountOffsets.mountXMm - 40 - plannerInput.seatBaseDepthMm;

    return Math.round(Math.max(columnDistanceLimits.min, Math.min(columnDistanceLimits.max, currentDistanceMm)));
  });
  const seatBaseDepthMaxMm = $derived(Math.min(500, plannerInput.baseLengthMm));
  const baseInnerBeamSpacingMaxMm = 320;
  const steeringColumnBaseHeightMaxMm = 500;
  const steeringColumnHeightMinMm = $derived(Math.max(400, plannerInput.steeringColumnBaseHeightMm + 80));
  const steeringColumnHeightMaxMm = 600;
  const pedalTrayDepthMaxMm = 500;
  const pedalTrayDistanceMaxMm = 700;

  function updateColumnDistance(targetDistanceMm: number) {
    const clampedDistanceMm = Math.max(columnDistanceLimits.min, Math.min(columnDistanceLimits.max, targetDistanceMm));
    const nextWheelXMm = Math.round(
      plannerInput.seatBaseDepthMm + clampedDistanceMm + 40 - geometry.wheelMountOffsets.mountXMm
    );

    if (nextWheelXMm !== plannerInput.wheelXMm) {
      plannerInput.wheelXMm = nextWheelXMm;
    }
  }

  function setBaseLengthMm(value: number) {
    plannerInput.baseLengthMm = value;

    if (plannerInput.seatBaseDepthMm > Math.min(500, value)) {
      plannerInput.seatBaseDepthMm = Math.min(500, value);
    }
  }

  function setSeatBaseDepthMm(value: number) {
    plannerInput.seatBaseDepthMm = Math.max(240, Math.min(seatBaseDepthMaxMm, value));
  }

  function setSteeringColumnBaseHeightMm(value: number) {
    plannerInput.steeringColumnBaseHeightMm = value;

    if (plannerInput.steeringColumnHeightMm < Math.max(400, value + 80)) {
      plannerInput.steeringColumnHeightMm = Math.max(400, value + 80);
    }
  }

  function setSteeringColumnHeightMm(value: number) {
    plannerInput.steeringColumnHeightMm = Math.max(
      steeringColumnHeightMinMm,
      Math.min(steeringColumnHeightMaxMm, value)
    );
  }

  function resetSetup() {
    Object.assign(plannerInput, DEFAULT_INPUT);
    profileColorMode = 'black';
    customProfileColor = BLACK_PROFILE_COLOR;
  }

  function resetSteeringColumnModule() {
    setSteeringColumnBaseHeightMm(DEFAULT_INPUT.steeringColumnBaseHeightMm);
    setSteeringColumnHeightMm(DEFAULT_INPUT.steeringColumnHeightMm);
    plannerInput.wheelXMm = DEFAULT_INPUT.wheelXMm;
  }

  function resetPedalTrayModule() {
    plannerInput.pedalTrayDepthMm = DEFAULT_INPUT.pedalTrayDepthMm;
    plannerInput.pedalTrayDistanceMm = DEFAULT_INPUT.pedalTrayDistanceMm;
  }

  $effect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const encodedState = encodeQueryState({
      ...$state.snapshot(plannerInput),
    });

    if (url.searchParams.get(STATE_KEY) === encodedState) {
      debouncedUrlStateWriter.cancel();
      return;
    }

    url.searchParams.set(STATE_KEY, encodedState);
    debouncedUrlStateWriter.schedule(url.toString());
  });
</script>

<div class="not-content overflow-hidden rounded border border-zinc-300 bg-white shadow-sm">
  {#if mounted}
    <div class={isNarrowViewport ? 'flex flex-col' : 'grid grid-cols-[minmax(0,1.3fr)_24rem]'}>
      <div
        class="flex min-w-0 flex-col gap-4 border-b border-zinc-300 bg-[linear-gradient(180deg,#fafafa_0%,#f4f4f5_100%)] lg:border-b-0 lg:border-r"
      >
        <Scene {geometry} {isNarrowViewport} {profileColor} {visibleModules} />
      </div>

      <div
        class={isNarrowViewport
          ? 'flex shrink-0 flex-col divide-y divide-zinc-300'
          : 'flex shrink-0 flex-col divide-y divide-zinc-300 bg-white'}
      >
        <Pane title="Setup" position="inline" bind:expanded={paneExpanded.setup}>
          <Folder title="Color">
            <List bind:value={profileColorMode} options={COLOR_MODE_OPTIONS} label="Finish" />
            {#if profileColorMode === 'custom'}
              <Color bind:value={customProfileColor} label="Custom" />
            {/if}
          </Folder>
          <Folder title="Base">
            <Slider
              bind:value={() => plannerInput.baseLengthMm, setBaseLengthMm}
              label="Base length"
              min={1000}
              max={1800}
              step={10}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={() => plannerInput.seatBaseDepthMm, setSeatBaseDepthMm}
              label="Seat base depth"
              min={240}
              max={seatBaseDepthMaxMm}
              step={10}
              format={(value) => `${value} mm`}
            />
            <Slider
              bind:value={plannerInput.baseInnerBeamSpacingMm}
              label="Inner beam spacing"
              min={80}
              max={baseInnerBeamSpacingMaxMm}
              step={10}
              format={(value) => `${value} mm`}
            />
          </Folder>
          <Button on:click={resetSetup} label="Reset" title="Reset" />
          <Folder title="Modules">
            <Checkbox bind:value={visibleModules.steeringColumn} label="Steering column" />
            <Checkbox bind:value={visibleModules.pedalTray} label="Pedal tray" />
          </Folder>
        </Pane>
        <Pane title="Modules" position="inline" bind:expanded={paneExpanded.modules}>
          {#if visibleModules.steeringColumn}
            <Folder title="Steering column">
              <Slider
                bind:value={() => plannerInput.steeringColumnBaseHeightMm, setSteeringColumnBaseHeightMm}
                label="Base height"
                min={80}
                max={steeringColumnBaseHeightMaxMm}
                step={10}
                format={(value) => `${value} mm`}
              />
              <Slider
                bind:value={() => plannerInput.steeringColumnHeightMm, setSteeringColumnHeightMm}
                label="Column Height"
                min={steeringColumnHeightMinMm}
                max={steeringColumnHeightMaxMm}
                step={10}
                format={(value) => `${value} mm`}
              />
              <Slider
                bind:value={() => columnDistanceDisplayMm, updateColumnDistance}
                label="Column distance"
                min={columnDistanceLimits.min}
                max={columnDistanceLimits.max}
                step={10}
                format={(value) => `${value} mm`}
              />
              <Button on:click={resetSteeringColumnModule} label="Reset" title="Reset" />
            </Folder>
          {/if}
          {#if visibleModules.pedalTray}
            <Folder title="Pedal tray">
              <Slider
                bind:value={plannerInput.pedalTrayDepthMm}
                label="Tray depth"
                min={300}
                max={pedalTrayDepthMaxMm}
                step={10}
                format={(value) => `${value} mm`}
              />
              <Slider
                bind:value={plannerInput.pedalTrayDistanceMm}
                label="Tray distance"
                min={0}
                max={pedalTrayDistanceMaxMm}
                step={10}
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
