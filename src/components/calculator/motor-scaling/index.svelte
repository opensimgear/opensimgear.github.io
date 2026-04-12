<script lang="ts">
  import { onMount } from 'svelte';
  import { Pane, Slider, List, Checkbox, Button, Monitor } from 'svelte-tweakpane-ui';
  import { BUILTIN_MOTORS, loadUserMotors, saveUserMotors } from './motors';
  import type { Motor } from './motors';
  import {
    evaluateMotor,
    findOptimalDriveRatio,
    computeScrewMass,
    computeRequiredRPM,
    computeRequiredTorque,
    computeRequiredPower,
  } from './calculations';
  import type { Requirements, LoadInertia, MotorEvaluation } from './calculations';

  // --- Defaults ---
  const DEFAULTS = {
    axialSpeed: 200,
    axialForce: 800,
    safetyFactor: 20,
    ballscrewKey: '1610',
    customPitch: 10,
    customDiameter: 16,
    efficiency: 90,
    fixedMode: false,
    fixedRatio: 2,
    screwLength: 500,
    loadMass: 2.0,
  };

  function decodeState(encoded: string) {
    try {
      return JSON.parse(atob(encoded));
    } catch {
      return null;
    }
  }

  function getInitialState() {
    if (typeof window === 'undefined') return null;

    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('state') ?? params.get('ms');
    return encoded ? decodeState(encoded) : null;
  }

  const initialState = getInitialState();

  // --- Ballscrew options ---
  const BALLSCREW_OPTIONS: Array<{ text: string; value: string }> = [
    { text: '1605 (5mm)', value: '1605' },
    { text: '1610 (10mm)', value: '1610' },
    { text: '2005 (5mm)', value: '2005' },
    { text: '2010 (10mm)', value: '2010' },
    { text: '2505 (5mm)', value: '2505' },
    { text: '2510 (10mm)', value: '2510' },
    { text: '3205 (5mm)', value: '3205' },
    { text: '3210 (10mm)', value: '3210' },
    { text: 'Custom', value: 'custom' },
  ];

  const BALLSCREW_PITCHES: Record<string, number> = {
    '1605': 5,
    '1610': 10,
    '2005': 5,
    '2010': 10,
    '2505': 5,
    '2510': 10,
    '3205': 5,
    '3210': 10,
  };

  // Diameter is the first two digits of the standard key (mm)
  const BALLSCREW_DIAMETERS: Record<string, number> = {
    '1605': 16,
    '1610': 16,
    '2005': 20,
    '2010': 20,
    '2505': 25,
    '2510': 25,
    '3205': 32,
    '3210': 32,
  };

  // --- State ---
  let axialSpeed = initialState?.axialSpeed ?? DEFAULTS.axialSpeed;
  let axialForce = initialState?.axialForce ?? DEFAULTS.axialForce;
  let safetyFactor = initialState?.safetyFactor ?? DEFAULTS.safetyFactor;
  let ballscrewKey = initialState?.ballscrewKey ?? DEFAULTS.ballscrewKey;
  let customPitch = initialState?.customPitch ?? DEFAULTS.customPitch;
  let customDiameter = initialState?.customDiameter ?? DEFAULTS.customDiameter;
  let efficiency = initialState?.efficiency ?? DEFAULTS.efficiency;
  let autoDriveRatio = !(initialState?.fixedMode ?? DEFAULTS.fixedMode);
  let fixedMode = initialState?.fixedMode ?? DEFAULTS.fixedMode;
  let fixedRatio = initialState?.fixedRatio ?? DEFAULTS.fixedRatio;
  let screwLength = initialState?.screwLength ?? DEFAULTS.screwLength;
  let loadMass = initialState?.loadMass ?? DEFAULTS.loadMass;

  let userMotors: Motor[] = [];

  // Add-motor form state
  let addName = '';
  let addRPM = 3000;
  let addTorque = 1.0;
  let addPeakTorque = 3.0;
  let addPower = 300;
  let addInertia = 0.00003;
  let addFormOpen = false;

  function applyDefaults() {
    resetRequirements();
    resetBallscrew();
    resetLoadInertia();
  }

  function resetRequirements() {
    axialSpeed = DEFAULTS.axialSpeed;
    axialForce = DEFAULTS.axialForce;
    safetyFactor = DEFAULTS.safetyFactor;
    autoDriveRatio = !DEFAULTS.fixedMode;
    fixedMode = DEFAULTS.fixedMode;
    fixedRatio = DEFAULTS.fixedRatio;
  }

  function resetBallscrew() {
    ballscrewKey = DEFAULTS.ballscrewKey;
    customPitch = DEFAULTS.customPitch;
    customDiameter = DEFAULTS.customDiameter;
    efficiency = DEFAULTS.efficiency;
  }

  function resetLoadInertia() {
    screwLength = DEFAULTS.screwLength;
    loadMass = DEFAULTS.loadMass;
  }

  // --- URL state ---
  const STATE_KEY = 'state';
  const LEGACY_STATE_KEY = 'ms';
  let mounted = false;

  function encodeState() {
    return btoa(
      JSON.stringify({
        axialSpeed,
        axialForce,
        safetyFactor,
        ballscrewKey,
        customPitch,
        customDiameter,
        efficiency,
        fixedMode,
        fixedRatio,
        screwLength,
        loadMass,
      })
    );
  }

  function updateUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set(STATE_KEY, encodeState());
    window.history.replaceState({}, '', url.toString());
  }

  onMount(() => {
    userMotors = loadUserMotors();
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get(STATE_KEY) ?? params.get(LEGACY_STATE_KEY);
    if (encoded) {
      const s = decodeState(encoded);
      if (s) {
        axialSpeed = s.axialSpeed ?? DEFAULTS.axialSpeed;
        axialForce = s.axialForce ?? DEFAULTS.axialForce;
        safetyFactor = s.safetyFactor ?? DEFAULTS.safetyFactor;
        ballscrewKey = s.ballscrewKey ?? DEFAULTS.ballscrewKey;
        customPitch = s.customPitch ?? DEFAULTS.customPitch;
        customDiameter = s.customDiameter ?? DEFAULTS.customDiameter;
        efficiency = s.efficiency ?? DEFAULTS.efficiency;
        autoDriveRatio = !(s.fixedMode ?? DEFAULTS.fixedMode);
        fixedRatio = s.fixedRatio ?? DEFAULTS.fixedRatio;
        screwLength = s.screwLength ?? DEFAULTS.screwLength;
        loadMass = s.loadMass ?? DEFAULTS.loadMass;
      } else {
        applyDefaults();
      }
    }
    mounted = true;
  });

  $: fixedMode = !autoDriveRatio;

  $: if (mounted) {
    (axialSpeed,
      axialForce,
      safetyFactor,
      ballscrewKey,
      customPitch,
      customDiameter,
      efficiency,
      fixedMode,
      fixedRatio,
      screwLength,
      loadMass);
    updateUrl();
  }

  // --- Derived ---
  $: pitch_mm = ballscrewKey === 'custom' ? customPitch : (BALLSCREW_PITCHES[ballscrewKey] ?? 10);
  $: screwDiameter_mm = ballscrewKey === 'custom' ? customDiameter : (BALLSCREW_DIAMETERS[ballscrewKey] ?? 16);
  $: screwMass_kg = computeScrewMass(screwDiameter_mm, screwLength);

  $: requirements = {
    axialSpeed_mm_s: axialSpeed,
    axialForce_N: axialForce,
    safetyFactor,
    ballscrewPitch_mm: pitch_mm,
    efficiency: efficiency / 100,
  } satisfies Requirements;

  $: load = {
    screwMass_kg,
    loadMass_kg: loadMass,
  } satisfies LoadInertia;

  // --- Screw-shaft calculated values (drive ratio = 1, safety applied) ---
  $: safeSpeed_mm_s = axialSpeed * (1 + safetyFactor / 100);
  $: safeForce_N = axialForce * (1 + safetyFactor / 100);
  $: screwRPM = computeRequiredRPM(safeSpeed_mm_s, 1, pitch_mm);
  $: screwTorque_Nm = computeRequiredTorque(safeForce_N, pitch_mm, 1, efficiency / 100);
  $: screwPower_W = computeRequiredPower(screwTorque_Nm, screwRPM);
  $: totalLoadMass_kg = screwMass_kg + loadMass;

  $: allMotors = [...BUILTIN_MOTORS, ...userMotors];

  $: motorResults = allMotors.map((motor) => {
    const ratio = fixedMode ? fixedRatio : findOptimalDriveRatio(motor, requirements, load);
    const evaluation = evaluateMotor(motor, requirements, load, ratio);
    return { motor, evaluation };
  });

  $: sortedResults = [...motorResults].sort((a, b) => {
    const order: Record<string, number> = { pass: 0, warn: 1, fail: 2 };
    const statusDiff = order[a.evaluation.status] - order[b.evaluation.status];
    if (statusDiff !== 0) return statusDiff;
    return b.evaluation.torqueMargin - a.evaluation.torqueMargin;
  });

  function deleteUserMotor(id: string) {
    userMotors = userMotors.filter((m) => m.id !== id);
    saveUserMotors(userMotors);
  }

  function addUserMotor() {
    if (!addName.trim()) return;
    const newMotor: Motor = {
      id: `user-${Date.now()}`,
      name: addName.trim(),
      ratedRPM: addRPM,
      ratedTorque_Nm: addTorque,
      peakTorque_Nm: addPeakTorque,
      continuousPower_W: addPower,
      inertia_kgm2: addInertia,
      source: 'user',
    };
    userMotors = [...userMotors, newMotor];
    saveUserMotors(userMotors);
    addName = '';
    addRPM = 3000;
    addTorque = 1.0;
    addPeakTorque = 3.0;
    addPower = 300;
    addInertia = 0.00003;
    addFormOpen = false;
  }

  // --- Hover popup ---
  let hoveredMotor: Motor | null = null;
  let hoveredEval: MotorEvaluation | null = null;
  let popupX = 0;
  let popupY = 0;
  let popupFlipLeft = false;

  function onRowEnter(e: MouseEvent, motor: Motor, evaluation: MotorEvaluation) {
    hoveredMotor = motor;
    hoveredEval = evaluation;
    updatePopupPos(e);
  }

  function updatePopupPos(e: MouseEvent) {
    popupX = e.clientX;
    popupY = e.clientY;
    popupFlipLeft = typeof window !== 'undefined' && e.clientX > window.innerWidth * 0.55;
  }

  function onRowLeave() {
    hoveredMotor = null;
    hoveredEval = null;
  }

  // --- Table helpers ---
  function marginColor(margin: number): string {
    if (margin < 0) return '#ef4444';
    if (margin < 20) return '#f59e0b';
    return '#22c55e';
  }

  function barFill(rated: number, required: number): number {
    if (required <= 0) return 100;
    return Math.min(100, Math.max(0, (rated / (required * 2)) * 100));
  }
</script>

<div class="w-full not-content border border-black rounded overflow-hidden">
  <div class="flex flex-row">
    <!-- Left: results table -->
    <div class="overflow-x-auto bg-white flex-1 min-w-0">
      <table class="w-full text-xs font-mono border-collapse">
        <thead>
          <tr
            class="border-b border-gray-200 bg-gray-50 text-left text-[10px] font-sans font-semibold uppercase tracking-wider text-gray-500"
          >
            <th class="px-3 py-2 font-sans sticky left-0 bg-gray-50 z-10">Motor</th>
            <th class="px-3 py-2 font-sans text-center">Status</th>
            <th class="px-3 py-2 font-sans">Ratio</th>
            <th class="px-2 py-2 font-sans min-w-[4.5rem]">RPM</th>
            <th class="px-2 py-2 font-sans min-w-[4.5rem]">Torque</th>
            <th class="px-2 py-2 font-sans min-w-[4.5rem]">Power</th>
            <th class="px-3 py-2 font-sans">Inertia</th>
            <th class="px-3 py-2 font-sans">Peak&nbsp;Torque</th>
            <th class="px-3 py-2 font-sans w-6"></th>
          </tr>
        </thead>
        <tbody>
          {#each sortedResults as { motor, evaluation } (motor.id)}
            {@const statusColor =
              evaluation.status === 'fail'
                ? 'border-red-400'
                : evaluation.status === 'warn'
                  ? 'border-amber-400'
                  : 'border-green-400'}
            {@const badgeClass =
              evaluation.status === 'fail'
                ? 'bg-red-100 text-red-700'
                : evaluation.status === 'warn'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'}
            {@const badgeLabel =
              evaluation.status === 'fail' ? '✗ Fail' : evaluation.status === 'warn' ? '⚠ Warn' : '✓ Pass'}
            <tr
              class="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-default"
              on:mouseenter={(e) => onRowEnter(e, motor, evaluation)}
              on:mousemove={updatePopupPos}
              on:mouseleave={onRowLeave}
            >
              <!-- Motor name -->
              <td class="px-3 py-2 font-sans font-medium text-gray-800 whitespace-nowrap sticky left-0 bg-white">
                {motor.name}
              </td>
              <!-- Status badge -->
              <td class="px-3 py-2 text-center">
                <span class="font-sans font-semibold px-1.5 py-0.5 rounded text-[10px] {badgeClass}">{badgeLabel}</span>
              </td>
              <!-- Drive ratio -->
              <td class="px-3 py-2 text-gray-700 whitespace-nowrap">
                {evaluation.driveRatio.toFixed(2)}:1
              </td>
              <!-- RPM bar -->
              <td class="px-2 py-2">
                <div class="flex flex-row items-center gap-1.5 text-[11px] leading-none">
                  <div class="relative h-1.5 w-10 bg-gray-200 rounded overflow-visible shrink-0">
                    <div
                      class="absolute inset-y-0 left-0 rounded"
                      style="width:{barFill(motor.ratedRPM, evaluation.requiredRPM)}%; background-color:{marginColor(
                        evaluation.rpmMargin
                      )}"
                    ></div>
                    <div class="absolute inset-y-[-2px] w-px bg-gray-500" style="left:50%"></div>
                  </div>
                  <span style="color:{marginColor(evaluation.rpmMargin)}" class="whitespace-nowrap">
                    {evaluation.rpmMargin >= 0 ? '+' : ''}{evaluation.rpmMargin.toFixed(0)}%
                  </span>
                </div>
              </td>
              <!-- Torque bar -->
              <td class="px-2 py-2">
                <div class="flex flex-row items-center gap-1.5 text-[11px] leading-none">
                  <div class="relative h-1.5 w-10 bg-gray-200 rounded overflow-visible shrink-0">
                    <div
                      class="absolute inset-y-0 left-0 rounded"
                      style="width:{barFill(
                        motor.ratedTorque_Nm,
                        evaluation.requiredTorque_Nm
                      )}%; background-color:{marginColor(evaluation.torqueMargin)}"
                    ></div>
                    <div class="absolute inset-y-[-2px] w-px bg-gray-500" style="left:50%"></div>
                  </div>
                  <span style="color:{marginColor(evaluation.torqueMargin)}" class="whitespace-nowrap">
                    {evaluation.torqueMargin >= 0 ? '+' : ''}{evaluation.torqueMargin.toFixed(0)}%
                  </span>
                </div>
              </td>
              <!-- Power bar -->
              <td class="px-2 py-2">
                <div class="flex flex-row items-center gap-1.5 text-[11px] leading-none">
                  <div class="relative h-1.5 w-10 bg-gray-200 rounded overflow-visible shrink-0">
                    <div
                      class="absolute inset-y-0 left-0 rounded"
                      style="width:{barFill(
                        motor.continuousPower_W,
                        evaluation.requiredPower_W
                      )}%; background-color:{marginColor(evaluation.powerMargin)}"
                    ></div>
                    <div class="absolute inset-y-[-2px] w-px bg-gray-500" style="left:50%"></div>
                  </div>
                  <span style="color:{marginColor(evaluation.powerMargin)}" class="whitespace-nowrap">
                    {evaluation.powerMargin >= 0 ? '+' : ''}{evaluation.powerMargin.toFixed(0)}%
                  </span>
                </div>
              </td>
              <!-- Inertia ratio -->
              <td class="px-3 py-2 whitespace-nowrap" class:text-amber-600={evaluation.inertiaRatio > 10}>
                {evaluation.inertiaRatio.toFixed(1)}:1
              </td>
              <!-- Peak torque -->
              <td class="px-3 py-2 text-gray-600 whitespace-nowrap">
                {motor.peakTorque_Nm.toFixed(2)} Nm
              </td>
              <!-- Delete (user motors only) -->
              <td class="px-2 py-2">
                {#if motor.source === 'user'}
                  <button
                    on:click={() => deleteUserMotor(motor.id)}
                    class="text-gray-300 hover:text-red-500 transition-colors leading-none"
                    title="Remove motor">✕</button
                  >
                {/if}
              </td>
            </tr>
          {/each}

          <!-- Add custom motor row -->
          {#if !addFormOpen}
            <tr>
              <td colspan="9" class="px-3 py-2">
                <button
                  on:click={() => (addFormOpen = true)}
                  class="text-[10px] font-sans font-semibold uppercase tracking-wide px-2.5 py-1 rounded border border-dashed border-gray-400 bg-gray-800 text-white hover:bg-gray-700 hover:border-gray-300 transition-colors"
                  >+ Add custom motor</button
                >
              </td>
            </tr>
          {:else}
            <tr class="bg-gray-50">
              <td colspan="9" class="px-3 py-3">
                <div class="font-sans text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Add Motor
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
                  <label class="col-span-2 sm:col-span-3 lg:col-span-2 flex flex-col gap-0.5">
                    <span class="text-gray-500 font-sans">Name</span>
                    <input
                      bind:value={addName}
                      type="text"
                      placeholder="e.g. Delta ECMA-C207"
                      class="border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                  </label>
                  <label class="flex flex-col gap-0.5">
                    <span class="text-gray-500 font-sans">Rated RPM</span>
                    <input
                      bind:value={addRPM}
                      type="number"
                      min="1"
                      class="border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                  </label>
                  <label class="flex flex-col gap-0.5">
                    <span class="text-gray-500 font-sans">Rated Torque (Nm)</span>
                    <input
                      bind:value={addTorque}
                      type="number"
                      min="0"
                      step="0.01"
                      class="border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                  </label>
                  <label class="flex flex-col gap-0.5">
                    <span class="text-gray-500 font-sans">Peak Torque (Nm)</span>
                    <input
                      bind:value={addPeakTorque}
                      type="number"
                      min="0"
                      step="0.01"
                      class="border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                  </label>
                  <label class="flex flex-col gap-0.5">
                    <span class="text-gray-500 font-sans">Cont. Power (W)</span>
                    <input
                      bind:value={addPower}
                      type="number"
                      min="1"
                      class="border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                  </label>
                  <label class="flex flex-col gap-0.5">
                    <span class="text-gray-500 font-sans">Inertia (kg·m²)</span>
                    <input
                      bind:value={addInertia}
                      type="number"
                      min="0"
                      step="0.000001"
                      class="border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                  </label>
                </div>
                <div class="flex gap-2 mt-2">
                  <button on:click={addUserMotor} class="btn-primary text-xs py-1.5 px-3 rounded font-sans">Save</button
                  >
                  <button
                    on:click={() => (addFormOpen = false)}
                    class="text-xs text-gray-500 hover:text-gray-700 py-1.5 px-3 font-sans">Cancel</button
                  >
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>

    <!-- Right: settings panels stacked vertically -->
    <div class="border-l border-black flex flex-col divide-y divide-black shrink-0">
      <!-- Requirements -->
      <Pane title="Requirements" position="inline">
        <Slider bind:value={axialSpeed} label="Axial Speed" min={1} max={1000} step={1} format={(v) => `${v} mm/s`} />
        <Slider bind:value={axialForce} label="Axial Force" min={1} max={5000} step={10} format={(v) => `${v} N`} />
        <Slider bind:value={safetyFactor} label="Safety Factor" min={0} max={100} step={1} format={(v) => `${v}%`} />
        <Checkbox bind:value={autoDriveRatio} label="Auto Drive Ratio" />
        {#if fixedMode}
          <Slider
            bind:value={fixedRatio}
            label="Ratio"
            min={0.5}
            max={10}
            step={0.1}
            format={(v) => `${v.toFixed(1)}:1`}
          />
        {/if}
        <Button on:click={resetRequirements} label="Reset Params" title="Reset" />
      </Pane>

      <!-- Ballscrew -->
      <Pane title="Ballscrew" position="inline">
        <List bind:value={ballscrewKey} options={BALLSCREW_OPTIONS} label="Type" />
        {#if ballscrewKey === 'custom'}
          <Slider bind:value={customPitch} label="Pitch" min={1} max={50} step={0.5} format={(v) => `${v} mm`} />
          <Slider bind:value={customDiameter} label="Diameter" min={8} max={50} step={1} format={(v) => `${v} mm`} />
        {/if}
        <Slider bind:value={efficiency} label="Efficiency" min={50} max={100} step={1} format={(v) => `${v}%`} />
        <Button on:click={resetBallscrew} label="Reset Params" title="Reset" />
      </Pane>

      <!-- Load Inertia -->
      <Pane title="Load Inertia" position="inline">
        <Slider bind:value={screwLength} label="Screw length" min={50} max={2000} step={10} format={(v) => `${v} mm`} />
        <Slider
          bind:value={loadMass}
          label="Load mass"
          min={0}
          max={50}
          step={0.5}
          format={(v) => `${v.toFixed(1)} kg`}
        />
        <Button on:click={resetLoadInertia} label="Reset Params" title="Reset" />
      </Pane>

      <!-- Calculated -->
      <Pane title="Calculated" position="inline">
        <Monitor value={`${pitch_mm} mm`} label="Pitch" />
        <Monitor value={`${screwDiameter_mm} mm`} label="Screw ⌀" />
        <Monitor value={`${screwMass_kg.toFixed(3)} kg`} label="Screw mass" />
        <Monitor value={`${totalLoadMass_kg.toFixed(3)} kg`} label="Total load" />
        <Monitor value={`${screwRPM.toFixed(0)} rpm`} label="Screw RPM" />
        <Monitor value={`${screwTorque_Nm.toFixed(3)} Nm`} label="Screw torque" />
        <Monitor value={`${screwPower_W.toFixed(1)} W`} label="Screw power" />
      </Pane>
    </div>
  </div>

  {#if hoveredMotor && hoveredEval}
    <div
      class="fixed z-50 pointer-events-none bg-white border border-gray-200 rounded shadow-xl text-xs font-mono"
      style="left:{popupFlipLeft ? popupX - 16 : popupX + 16}px; top:{popupY}px; transform:{popupFlipLeft ? 'translate(-100%, -50%)' : 'translateY(-50%)'}; min-width:240px;"
    >
      <div class="px-3 py-2 border-b border-gray-100">
        <div class="font-sans font-semibold text-gray-800 text-[11px]">{hoveredMotor.name}</div>
        <div class="text-[10px] text-gray-400 font-sans mt-0.5">{hoveredMotor.source} · ratio {hoveredEval.driveRatio.toFixed(2)}:1</div>
      </div>
      <div class="px-3 py-2 grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-0.5">
        <span></span>
        <span class="text-gray-400 font-sans text-[10px] uppercase tracking-wide">Rated</span>
        <span class="text-gray-400 font-sans text-[10px] uppercase tracking-wide">Required</span>

        <span class="text-gray-500">RPM</span>
        <span>{hoveredMotor.ratedRPM.toLocaleString()}</span>
        <span
          class:text-red-500={hoveredEval.rpmMargin < 0}
          class:text-amber-500={hoveredEval.rpmMargin >= 0 && hoveredEval.rpmMargin < 20}
        >{hoveredEval.requiredRPM.toFixed(0)}</span>

        <span class="text-gray-500">Torque</span>
        <span>{hoveredMotor.ratedTorque_Nm.toFixed(2)} Nm</span>
        <span
          class:text-red-500={hoveredEval.torqueMargin < 0}
          class:text-amber-500={hoveredEval.torqueMargin >= 0 && hoveredEval.torqueMargin < 20}
        >{hoveredEval.requiredTorque_Nm.toFixed(2)} Nm</span>

        <span class="text-gray-500">Peak</span>
        <span>{hoveredMotor.peakTorque_Nm.toFixed(2)} Nm</span>
        <span class="text-gray-400">—</span>

        <span class="text-gray-500">Power</span>
        <span>{hoveredMotor.continuousPower_W} W</span>
        <span
          class:text-red-500={hoveredEval.powerMargin < 0}
          class:text-amber-500={hoveredEval.powerMargin >= 0 && hoveredEval.powerMargin < 20}
        >{hoveredEval.requiredPower_W.toFixed(1)} W</span>
      </div>
      <div class="px-3 py-2 border-t border-gray-100 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <span class="text-gray-500">Rotor inertia</span>
        <span>{hoveredMotor.inertia_kgm2.toExponential(2)} kg·m²</span>
        <span class="text-gray-500">Reflected inertia</span>
        <span>{hoveredEval.reflectedInertia_kgm2.toExponential(2)} kg·m²</span>
        <span class="text-gray-500">Inertia ratio</span>
        <span class:text-amber-500={hoveredEval.inertiaRatio > 10}>{hoveredEval.inertiaRatio.toFixed(1)}:1</span>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Force each inline Tweakpane to fill its grid cell width */
  :global(.not-content .tp-dfwv) {
    width: 100% !important;
  }

  :global(.not-content .tp-rotv_t) {
    text-align: left;
  }

  :global(.not-content .tp-lblv:has(.tp-ckbv) .tp-lblv_v) {
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }
</style>
