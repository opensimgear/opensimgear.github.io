<script lang="ts">
  import { onMount } from 'svelte';
  import { Monitor, Pane, Slider, Element } from 'svelte-tweakpane-ui';

  import { createDebouncedUrlStateWriter } from '../shared/debounced-url-state';
  import { decodeQueryState, encodeQueryState } from '../shared/query-state';
  import { deriveCutListRows } from './cut-list';
  import { evaluatePostureGuidance } from './ergonomics';
  import { derivePlannerGeometry } from './geometry';
  import { createInitialPlannerInput } from './presets';
  import { mergePlannerQueryState, type PlannerQueryState } from './query-state';
  import {
    getAluminiumRigPaneExpandedState,
    getNextAluminiumRigPaneExpandedState,
    isNarrowAluminiumRigViewport,
    type AluminiumRigPaneExpandedState,
  } from './state';
  import SideView from './SideView.svelte';
  import Scene from './Scene.svelte';
  import type { PlannerInput } from './types';

  const STATE_KEY = 'state';
  const URL_STATE_DEBOUNCE_MS = 300;
  const debouncedUrlStateWriter = createDebouncedUrlStateWriter(URL_STATE_DEBOUNCE_MS);

  const DEFAULT_INPUT = createInitialPlannerInput({
    driverHeightMm: 1750,
    inseamMm: 820,
    seatingBias: 'performance',
    presetType: 'gt',
  });

  function applyQueryState(state: PlannerQueryState) {
    const mergedState = mergePlannerQueryState(DEFAULT_INPUT, state);

    Object.assign(plannerInput, mergedState.plannerInput);
  }

  let plannerInput = $state<PlannerInput>({ ...DEFAULT_INPUT });
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
  const guidance = $derived(evaluatePostureGuidance(plannerInput, geometry));
  const cutListRows = $derived(deriveCutListRows(geometry));
  const wheelReachLimits = $derived.by(() => {
    const verticalDeltaMm = Math.abs(
      plannerInput.wheelYMm + geometry.wheelMountOffsets.wheelCenterOffsetYMm - plannerInput.seatYMm
    );

    return {
      verticalDeltaMm,
      min: Math.max(420, Math.ceil(verticalDeltaMm + 40)),
      max: Math.max(620, Math.min(plannerInput.baseLengthMm - 120, 920)),
    };
  });
  const wheelReachDisplayMm = $derived(
    Math.round(Math.max(wheelReachLimits.min, Math.min(wheelReachLimits.max, geometry.wheelReachMm)))
  );
  const guidanceTone = $derived.by(() => {
    if (guidance.some((item) => item.severity === 'warning')) {
      return 'Needs review';
    }

    if (guidance.some((item) => item.severity === 'review')) {
      return 'Close to target';
    }

    return 'In range';
  });

  function updateWheelReach(targetReachMm: number) {
    const clampedReachMm = Math.max(wheelReachLimits.min, Math.min(wheelReachLimits.max, targetReachMm));
    const wheelCenterDeltaXMm = Math.sqrt(Math.max(0, clampedReachMm ** 2 - wheelReachLimits.verticalDeltaMm ** 2));
    const nextWheelXMm = Math.round(
      plannerInput.seatXMm + wheelCenterDeltaXMm - geometry.wheelMountOffsets.wheelCenterOffsetXMm
    );

    if (nextWheelXMm !== plannerInput.wheelXMm) {
      plannerInput.wheelXMm = nextWheelXMm;
    }
  }

  function handleWheelReachInput(event: Event) {
    updateWheelReach(Number((event.currentTarget as HTMLInputElement).value));
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
    <div class={isNarrowViewport ? 'flex flex-col' : 'grid min-h-[52rem] grid-cols-[minmax(0,1.3fr)_24rem]'}>
      <div
        class="flex min-w-0 flex-col gap-4 border-b border-zinc-300 bg-[linear-gradient(180deg,#fafafa_0%,#f4f4f5_100%)] lg:border-b-0 lg:border-r"
      >
        <section class="min-w-0">
          <Scene input={plannerInput} {geometry} {isNarrowViewport} />
        </section>
      </div>

      <div
        class={isNarrowViewport
          ? 'flex shrink-0 flex-col divide-y divide-zinc-300'
          : 'flex shrink-0 flex-col divide-y divide-zinc-300 bg-white'}
      >
        <Pane title="Setup" position="inline" bind:expanded={paneExpanded.setup}>
          <Slider
            bind:value={plannerInput.driverHeightMm}
            label="Driver height"
            min={1500}
            max={2050}
            step={5}
            format={(value) => `${value} mm`}
          />
          <Slider
            bind:value={plannerInput.inseamMm}
            label="Inseam"
            min={650}
            max={980}
            step={5}
            format={(value) => `${value} mm`}
          />
          <Slider
            bind:value={plannerInput.seatBackAngleDeg}
            label="Seat angle"
            min={10}
            max={45}
            step={1}
            format={(value) => `${value} deg`}
          />
          <Slider
            bind:value={plannerInput.pedalAngleDeg}
            label="Pedal angle"
            min={0}
            max={35}
            step={1}
            format={(value) => `${value} deg`}
          />

          <div class="px-3 pb-3 pt-1 font-sans">
            <div
              class="mb-2 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500"
            >
              <span>Wheel reach</span>
              <span>{wheelReachDisplayMm} mm</span>
            </div>
            <input
              value={wheelReachDisplayMm}
              oninput={handleWheelReachInput}
              type="range"
              min={wheelReachLimits.min}
              max={wheelReachLimits.max}
              step="1"
              class="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200"
            />
            <div class="mt-2 flex justify-between text-[11px] text-zinc-500">
              <span>{wheelReachLimits.min} mm</span>
              <span>{wheelReachLimits.max} mm</span>
            </div>
          </div>

          <Element>
            <SideView input={plannerInput} {geometry} {guidance} />
          </Element>
        </Pane>

        <Pane title="Posture guidance" position="inline" bind:expanded={paneExpanded.posture}>
          <Monitor value={guidanceTone} label="Posture" />
          <Monitor value={`${guidance[0]?.angleDeg ?? 0} deg`} label="Elbow" />
          <Monitor value={`${guidance[1]?.angleDeg ?? 0} deg`} label="Knee" />

          <div class="space-y-2 px-3 pb-3 font-sans text-xs text-zinc-700">
            {#each guidance as item (item.id)}
              <div class="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                <div class="font-semibold text-zinc-900">
                  {item.id === 'elbow-angle' ? 'Elbow angle' : 'Knee angle'}
                </div>
                <div class="mt-1 text-zinc-600">{item.detail}</div>
              </div>
            {/each}
          </div>
        </Pane>

        <Pane title="Cut list" position="inline" bind:expanded={paneExpanded.cutList}>
          <Monitor value={`${cutListRows.length} grouped rows`} label="Rows" />
          <Monitor value={`${geometry.frameMembers.length} members`} label="Members" />

          <div class="px-3 pb-3">
            <div class="overflow-hidden rounded-md border border-zinc-200">
              <table class="w-full border-collapse text-left font-mono text-xs">
                <thead class="bg-zinc-50 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  <tr>
                    <th class="px-3 py-2 font-medium">Profile</th>
                    <th class="px-3 py-2 font-medium">Length</th>
                    <th class="px-3 py-2 font-medium">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {#each cutListRows as row (`${row.profile}-${row.lengthMm}`)}
                    <tr class="border-t border-zinc-200 bg-white text-zinc-700">
                      <td class="px-3 py-2">{row.profile}</td>
                      <td class="px-3 py-2">{row.lengthMm} mm</td>
                      <td class="px-3 py-2">{row.quantity}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
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

  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 0.9rem;
    height: 0.9rem;
    border-radius: 9999px;
    background: rgb(24 24 27);
  }

  input[type='range']::-moz-range-thumb {
    width: 0.9rem;
    height: 0.9rem;
    border: 0;
    border-radius: 9999px;
    background: rgb(24 24 27);
  }
</style>
