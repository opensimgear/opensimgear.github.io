<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Checkbox, Element, List, Monitor, Pane, Slider, WaveformMonitor } from 'svelte-tweakpane-ui';
  import MotionProfileDiagram from './MotionProfileDiagram.svelte';
  import {
    computePhaseTorques,
    computeLoadInertia,
    computeScrewMass,
    computeScrewRotationalInertia,
    computeTotalInertia,
  } from './dynamics';
  import { evaluateMotorForActuator } from './evaluation';
  import { computeForcePerActuator, computeHoldingForce, computeStaticForce } from './forces';
  import { BUILTIN_SERVO_MOTORS, loadUserServoMotors, saveUserServoMotors } from './motors';
  import { findOptimalGearRatio, type GearOptimizationContext } from './gear-optimization';
  import { buildMotionProfileDiagram } from './motion-profile-diagram';
  import { computeTrapezoidalProfile } from './profile';
  import { DEFAULT_SORT_STATE, getAriaSort, sortMotorResults, toggleSortState, type SortKey } from './sorting';
  import type { MotorEvaluationV2, ServoMotor, SystemType } from './types';

  const DEFAULTS = {
    strokeLength: 100,
    maxVelocity: 300,
    acceleration: 5000,
    deceleration: 5000,
    dwellTime: 0.1,
    systemType: 'stewart' as SystemType,
    actuatorAngle: 70,
    totalMass: 150,
    imbalanceFactor: 1.2,
    externalForce: 0,
    frictionForce: 50,
    guidePreloadForce: 0,
    ballscrewKey: '1610',
    customPitch: 10,
    customDiameter: 16,
    screwLength: 300,
    screwEfficiency: 90,
    autoGearRatio: true,
    gearRatio: 1,
    gearEfficiency: 95,
    gearInertia: 0,
    safetyFactor: 20,
    holdingRequired: true,
  };

  const BALLSCREW_OPTIONS = [
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

  const SYSTEM_OPTIONS = [
    { text: 'Single Axis', value: 'single' },
    { text: '4-Actuator Platform', value: '4actuator' },
    { text: '6-Actuator Stewart', value: 'stewart' },
  ];

  const STATE_KEY = 'state';

  function decodeState(encoded: string): Record<string, unknown> | null {
    try {
      return JSON.parse(atob(encoded));
    } catch {
      return null;
    }
  }

  function getInitialState(): Record<string, unknown> | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const encoded = new URLSearchParams(window.location.search).get(STATE_KEY);
    return encoded ? decodeState(encoded) : null;
  }

  const initialState = getInitialState();

  function initialValue<T>(key: string, fallback: T): T {
    return (initialState?.[key] as T) ?? fallback;
  }

  let strokeLength = initialValue('strokeLength', DEFAULTS.strokeLength);
  let maxVelocity = initialValue('maxVelocity', DEFAULTS.maxVelocity);
  let acceleration = initialValue('acceleration', DEFAULTS.acceleration);
  let deceleration = initialValue('deceleration', DEFAULTS.deceleration);
  let dwellTime = initialValue('dwellTime', DEFAULTS.dwellTime);
  let systemType = initialValue<SystemType>('systemType', DEFAULTS.systemType);
  let actuatorAngle = initialValue('actuatorAngle', DEFAULTS.actuatorAngle);
  let totalMass = initialValue('totalMass', DEFAULTS.totalMass);
  let imbalanceFactor = initialValue('imbalanceFactor', DEFAULTS.imbalanceFactor);
  let externalForce = initialValue('externalForce', DEFAULTS.externalForce);
  let frictionForce = initialValue('frictionForce', DEFAULTS.frictionForce);
  let guidePreloadForce = initialValue('guidePreloadForce', DEFAULTS.guidePreloadForce);
  let ballscrewKey = initialValue('ballscrewKey', DEFAULTS.ballscrewKey);
  let customPitch = initialValue('customPitch', DEFAULTS.customPitch);
  let customDiameter = initialValue('customDiameter', DEFAULTS.customDiameter);
  let screwLength = initialValue('screwLength', DEFAULTS.screwLength);
  let screwEfficiency = initialValue('screwEfficiency', DEFAULTS.screwEfficiency);
  let autoGearRatio = initialValue('autoGearRatio', DEFAULTS.autoGearRatio);
  let gearRatio = initialValue('gearRatio', DEFAULTS.gearRatio);
  let gearEfficiency = initialValue('gearEfficiency', DEFAULTS.gearEfficiency);
  let gearInertia = initialValue('gearInertia', DEFAULTS.gearInertia);
  let safetyFactor = initialValue('safetyFactor', DEFAULTS.safetyFactor);
  let holdingRequired = initialValue('holdingRequired', DEFAULTS.holdingRequired);

  let userMotors: ServoMotor[] = [];
  let mounted = false;
  let sortKey: SortKey = DEFAULT_SORT_STATE.key;
  let sortDescending = DEFAULT_SORT_STATE.descending;

  let addFormOpen = false;
  let addName = '';
  let addManufacturer = '';
  let addRatedRPM = 3000;
  let addMaxRPM = 4500;
  let addRatedTorque = 1.0;
  let addPeakTorque = 3.0;
  let addPower = 400;
  let addInertia = 0.00003;

  onMount(() => {
    userMotors = loadUserServoMotors();
    mounted = true;
  });

  function encodeState(): string {
    return btoa(
      JSON.stringify({
        strokeLength,
        maxVelocity,
        acceleration,
        deceleration,
        dwellTime,
        systemType,
        actuatorAngle,
        totalMass,
        imbalanceFactor,
        externalForce,
        frictionForce,
        guidePreloadForce,
        ballscrewKey,
        customPitch,
        customDiameter,
        screwLength,
        screwEfficiency,
        autoGearRatio,
        gearRatio,
        gearEfficiency,
        gearInertia,
        safetyFactor,
        holdingRequired,
      })
    );
  }

  function updateUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.set(STATE_KEY, encodeState());
    window.history.replaceState({}, '', url.toString());
  }

  $: if (mounted) {
    (strokeLength,
      maxVelocity,
      acceleration,
      deceleration,
      dwellTime,
      systemType,
      actuatorAngle,
      totalMass,
      imbalanceFactor,
      externalForce,
      frictionForce,
      guidePreloadForce,
      ballscrewKey,
      customPitch,
      customDiameter,
      screwLength,
      screwEfficiency,
      gearRatio,
      gearEfficiency,
      gearInertia,
      safetyFactor,
      holdingRequired);
    updateUrl();
  }

  $: lead_mm = ballscrewKey === 'custom' ? customPitch : (BALLSCREW_PITCHES[ballscrewKey] ?? DEFAULTS.customPitch);
  $: screwDiameter_mm =
    ballscrewKey === 'custom' ? customDiameter : (BALLSCREW_DIAMETERS[ballscrewKey] ?? DEFAULTS.customDiameter);
  $: lead_m = lead_mm / 1000;
  $: screwMass_kg = computeScrewMass(screwDiameter_mm, screwLength);
  $: J_screw_rot = computeScrewRotationalInertia(screwMass_kg, screwDiameter_mm / 2 / 1000);

  $: profile = computeTrapezoidalProfile(
    strokeLength / 1000,
    maxVelocity / 1000,
    acceleration / 1000,
    deceleration / 1000
  );
  $: profileDiagram = buildMotionProfileDiagram({
    t_accel_s: profile.t_accel_s,
    t_const_s: profile.t_const_s,
    t_decel_s: profile.t_decel_s,
    dwellTime_s: dwellTime,
  });
  $: equivalentMassPerActuator_kg = computeForcePerActuator(totalMass, systemType, imbalanceFactor, actuatorAngle);
  $: F_static_total = computeStaticForce(totalMass, frictionForce, externalForce, guidePreloadForce);
  $: F_hold_total = computeHoldingForce(totalMass, guidePreloadForce);
  $: F_static_per = computeForcePerActuator(F_static_total, systemType, imbalanceFactor, actuatorAngle);
  $: F_hold_per = holdingRequired
    ? computeForcePerActuator(F_hold_total, systemType, imbalanceFactor, actuatorAngle)
    : 0;
  $: allMotors = [...BUILTIN_SERVO_MOTORS, ...userMotors];
  $: motionBasis = systemType === 'stewart' ? 'Actuator values' : 'Axis values';
  $: unsortedMotorResults = allMotors.map((motor) => {
    const effectiveGearRatio = autoGearRatio
      ? findOptimalGearRatio(
          {
            mass_kg: equivalentMassPerActuator_kg,
            lead_m,
            F_static_N: F_static_per,
            F_hold_N: F_hold_per,
            acceleration_m_s2: acceleration / 1000,
            deceleration_m_s2: deceleration / 1000,
            v_peak_m_s: profile.v_peak_m_s,
            t_accel_s: profile.t_accel_s,
            t_const_s: profile.t_const_s,
            t_decel_s: profile.t_decel_s,
            dwellTime_s: dwellTime,
            J_screw_rot_kgm2: J_screw_rot,
            J_gear_kgm2: gearInertia,
            gearEfficiency: gearEfficiency / 100,
            screwEfficiency: screwEfficiency / 100,
            safetyFactor_pct: safetyFactor,
          } satisfies GearOptimizationContext,
          motor,
        )
      : gearRatio;
    const J_load = computeLoadInertia(equivalentMassPerActuator_kg, lead_m, effectiveGearRatio);
    const J_total = computeTotalInertia(motor.inertia_kgm2, gearInertia, J_screw_rot, J_load, effectiveGearRatio);
    const phaseTorques = computePhaseTorques(
      F_static_per,
      F_hold_per,
      J_total,
      acceleration / 1000,
      deceleration / 1000,
      profile.v_peak_m_s,
      lead_m,
      effectiveGearRatio,
      gearEfficiency / 100,
      screwEfficiency / 100,
      profile.t_accel_s,
      profile.t_const_s,
      profile.t_decel_s,
      dwellTime
    );

    return evaluateMotorForActuator(
      motor,
      phaseTorques.T_peak_Nm,
      phaseTorques.T_rms_Nm,
      phaseTorques.n_motor_rpm,
      phaseTorques.P_peak_W,
      J_load,
      J_total,
      safetyFactor,
      effectiveGearRatio
    );
  });
  $: motorResults = sortMotorResults(unsortedMotorResults, { key: sortKey, descending: sortDescending });

  function onSortHeaderClick(key: SortKey) {
    const next = toggleSortState({ key: sortKey, descending: sortDescending }, key);
    sortKey = next.key;
    sortDescending = next.descending;
  }

  function resetMotionProfile() {
    strokeLength = DEFAULTS.strokeLength;
    maxVelocity = DEFAULTS.maxVelocity;
    acceleration = DEFAULTS.acceleration;
    deceleration = DEFAULTS.deceleration;
    dwellTime = DEFAULTS.dwellTime;
  }

  function resetLoad() {
    totalMass = DEFAULTS.totalMass;
    frictionForce = DEFAULTS.frictionForce;
    externalForce = DEFAULTS.externalForce;
    guidePreloadForce = DEFAULTS.guidePreloadForce;
    imbalanceFactor = DEFAULTS.imbalanceFactor;
  }

  function deleteUserMotor(id: string) {
    userMotors = userMotors.filter((motor) => motor.id !== id);
    saveUserServoMotors(userMotors);
  }

  function addUserMotor() {
    if (!addName.trim()) {
      return;
    }

    const newMotor: ServoMotor = {
      id: `user-${Date.now()}`,
      name: addName.trim(),
      manufacturer: addManufacturer.trim() || undefined,
      ratedRPM: addRatedRPM,
      maxRPM: addMaxRPM,
      ratedTorque_Nm: addRatedTorque,
      peakTorque_Nm: addPeakTorque,
      continuousPower_W: addPower,
      inertia_kgm2: addInertia,
      source: 'user',
    };

    userMotors = [...userMotors, newMotor];
    saveUserServoMotors(userMotors);
    addFormOpen = false;
    addName = '';
    addManufacturer = '';
    addRatedRPM = 3000;
    addMaxRPM = 4500;
    addRatedTorque = 1;
    addPeakTorque = 3;
    addPower = 400;
    addInertia = 0.00003;
  }

  let hoveredResult: MotorEvaluationV2 | null = null;
  let popupX = 0;
  let popupY = 0;
  let popupFlipLeft = false;

  function onRowEnter(event: MouseEvent, result: MotorEvaluationV2) {
    hoveredResult = result;
    updatePopupPos(event);
  }

  function updatePopupPos(event: MouseEvent) {
    popupX = event.clientX;
    popupY = event.clientY;
    popupFlipLeft = typeof window !== 'undefined' && event.clientX > window.innerWidth * 0.55;
  }

  function onRowLeave() {
    hoveredResult = null;
  }

  function marginColor(margin: number): string {
    if (margin < 0) return '#ef4444';
    if (margin < 20) return '#f59e0b';
    return '#22c55e';
  }

  function marginBar(margin: number): string {
    const fill = Math.min(100, Math.max(0, ((margin + 100) / 200) * 100));
    const color = marginColor(margin);
    const label = `${margin >= 0 ? '+' : ''}${margin.toFixed(0)}%`;
    return `<div class="flex flex-row items-center gap-1.5 text-[11px] leading-none">
      <div class="relative h-1.5 w-10 bg-gray-200 rounded overflow-visible shrink-0">
        <div class="absolute inset-y-0 left-0 rounded" style="width:${fill}%;background-color:${color}"></div>
        <div class="absolute inset-y-[-2px] w-px bg-gray-500" style="left:50%"></div>
      </div>
      <span style="color:${color}" class="whitespace-nowrap">${label}</span>
    </div>`;
  }
</script>

<div class="w-full not-content border border-black rounded overflow-hidden">
  <div class="flex flex-row">
    <div class="overflow-x-auto bg-white flex-1 min-w-0">
      <table class="w-full text-xs font-mono border-collapse">
        <thead>
          <tr
            class="border-b border-gray-200 bg-gray-50 text-left text-[10px] font-sans font-semibold uppercase tracking-wider text-gray-500"
          >
            <th class="px-3 py-2 font-sans sticky left-0 bg-gray-50 z-10">Motor</th>
            <th
              class="px-3 py-2 font-sans text-center"
              aria-sort={getAriaSort({ key: sortKey, descending: sortDescending }, 'status')}
            >
              <button
                type="button"
                class="flex w-full items-center justify-between bg-transparent p-0 text-center font-inherit text-inherit shadow-none outline-none cursor-pointer"
                on:click={() => onSortHeaderClick('status')}
              >
                <span>Status</span>
              </button>
            </th>
            <th
              class="px-3 py-2 font-sans"
              aria-sort={getAriaSort({ key: sortKey, descending: sortDescending }, 'score')}
            >
              <button
                type="button"
                class="flex w-full items-center justify-between bg-transparent p-0 text-left font-inherit text-inherit shadow-none outline-none cursor-pointer"
                on:click={() => onSortHeaderClick('score')}
              >
                <span>Score</span>
              </button>
            </th>
            <th
              class="px-2 py-2 font-sans min-w-[4.5rem]"
              aria-sort={getAriaSort({ key: sortKey, descending: sortDescending }, 'peak')}
            >
              <button
                type="button"
                class="flex w-full items-center justify-between bg-transparent p-0 text-left font-inherit text-inherit shadow-none outline-none cursor-pointer"
                on:click={() => onSortHeaderClick('peak')}
              >
                <span>Peak Tq</span>
              </button>
            </th>
            <th
              class="px-2 py-2 font-sans min-w-[4.5rem]"
              aria-sort={getAriaSort({ key: sortKey, descending: sortDescending }, 'rms')}
            >
              <button
                type="button"
                class="flex w-full items-center justify-between bg-transparent p-0 text-left font-inherit text-inherit shadow-none outline-none cursor-pointer"
                on:click={() => onSortHeaderClick('rms')}
              >
                <span>RMS Tq</span>
              </button>
            </th>
            <th
              class="px-2 py-2 font-sans min-w-[4.5rem]"
              aria-sort={getAriaSort({ key: sortKey, descending: sortDescending }, 'speed')}
            >
              <button
                type="button"
                class="flex w-full items-center justify-between bg-transparent p-0 text-left font-inherit text-inherit shadow-none outline-none cursor-pointer"
                on:click={() => onSortHeaderClick('speed')}
              >
                <span>Speed</span>
              </button>
            </th>
            <th
              class="px-3 py-2 font-sans"
              aria-sort={getAriaSort({ key: sortKey, descending: sortDescending }, 'inertia')}
            >
              <button
                type="button"
                class="flex w-full items-center justify-between bg-transparent p-0 text-left font-inherit text-inherit shadow-none outline-none cursor-pointer"
                on:click={() => onSortHeaderClick('inertia')}
              >
                <span>Inertia</span>
              </button>
            </th>
            <th class="px-3 py-2 font-sans">Ratio</th>
            <th class="px-3 py-2 font-sans w-6"></th>
          </tr>
        </thead>
        <tbody>
          {#each motorResults as result (result.motor.id)}
            {@const badgeClass =
              result.status === 'fail'
                ? 'bg-red-100 text-red-700'
                : result.status === 'warn'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'}
            {@const badgeLabel = result.status === 'fail' ? '✗ Fail' : result.status === 'warn' ? '⚠ Warn' : '✓ Pass'}
            <tr
              class="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-default"
              on:mouseenter={(event) => onRowEnter(event, result)}
              on:mousemove={updatePopupPos}
              on:mouseleave={onRowLeave}
            >
              <td class="px-3 py-2 font-sans font-medium text-gray-800 whitespace-nowrap sticky left-0 bg-white">
                {result.motor.name}
              </td>
              <td class="px-3 py-2 text-center">
                <span class="font-sans font-semibold px-1.5 py-0.5 rounded text-[10px] {badgeClass}">{badgeLabel}</span>
              </td>
              <td class="px-3 py-2 text-gray-600">{result.score.toFixed(0)}</td>
              <td class="px-2 py-2">{@html marginBar(result.peakTorqueMargin_pct)}</td>
              <td class="px-2 py-2">{@html marginBar(result.rmsTorqueMargin_pct)}</td>
              <td class="px-2 py-2">{@html marginBar(result.speedMargin_pct)}</td>
              <td class="px-3 py-2 whitespace-nowrap" class:text-amber-600={result.inertiaRatio > 10}>
                {result.inertiaRatio.toFixed(1)}:1
              </td>
              <td class="px-3 py-2 whitespace-nowrap text-gray-500">{result.gearRatio.toFixed(1)}:1</td>
              <td class="px-2 py-2">
                {#if result.motor.source === 'user'}
                  <button
                    on:click={() => deleteUserMotor(result.motor.id)}
                    class="text-gray-300 hover:text-red-500 transition-colors leading-none"
                    title="Remove motor">✕</button
                  >
                {/if}
              </td>
            </tr>
          {/each}

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
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs font-mono">
                  <label class="col-span-2 flex flex-col gap-0.5">
                    <span class="text-gray-500 font-sans">Name</span>
                    <input bind:value={addName} type="text" class="border border-gray-300 rounded px-2 py-1 text-xs" />
                  </label>
                  <label class="flex flex-col gap-0.5">
                    <span class="text-gray-500 font-sans">Manufacturer</span>
                    <input
                      bind:value={addManufacturer}
                      type="text"
                      class="border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                  </label>
                  <label class="flex flex-col gap-0.5">
                    <span class="text-gray-500 font-sans">Rated RPM</span>
                    <input
                      bind:value={addRatedRPM}
                      type="number"
                      min="1"
                      class="border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                  </label>
                  <label class="flex flex-col gap-0.5">
                    <span class="text-gray-500 font-sans">Max RPM</span>
                    <input
                      bind:value={addMaxRPM}
                      type="number"
                      min="1"
                      class="border border-gray-300 rounded px-2 py-1 text-xs"
                    />
                  </label>
                  <label class="flex flex-col gap-0.5">
                    <span class="text-gray-500 font-sans">Rated Torque (Nm)</span>
                    <input
                      bind:value={addRatedTorque}
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
                    class="text-xs text-gray-500 hover:text-gray-700 py-1.5 px-3 font-sans"
                  >
                    Cancel
                  </button>
                </div>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>

    <div class="border-l border-black flex flex-col divide-y divide-black shrink-0">
      <Pane title="Motion Profile" position="inline">
        <Slider
          bind:value={strokeLength}
          label="Stroke"
          min={10}
          max={2000}
          step={10}
          format={(value) => `${value} mm`}
        />
        <Slider
          bind:value={maxVelocity}
          label="Max Velocity"
          min={1}
          max={1000}
          step={1}
          format={(value) => `${value} mm/s`}
        />
        <Slider
          bind:value={acceleration}
          label="Acceleration"
          min={100}
          max={20000}
          step={100}
          format={(value) => `${value} mm/s²`}
        />
        <Slider
          bind:value={deceleration}
          label="Deceleration"
          min={100}
          max={20000}
          step={100}
          format={(value) => `${value} mm/s²`}
        />
        <Slider
          bind:value={dwellTime}
          label="Dwell Time"
          min={0}
          max={5}
          step={0.1}
          format={(value) => `${value.toFixed(1)} s`}
        />
        <Element>
          <MotionProfileDiagram diagram={profileDiagram} />
        </Element>
        <Button on:click={resetMotionProfile} label="Reset" title="Reset" />
      </Pane>

      <Pane title="System" position="inline">
        <List bind:value={systemType} options={SYSTEM_OPTIONS} label="Type" />
        {#if systemType === 'stewart'}
          <Slider
            bind:value={actuatorAngle}
            label="Actuator Angle"
            min={10}
            max={80}
            step={1}
            format={(value) => `${value}°`}
          />
        {/if}
        <Checkbox bind:value={holdingRequired} label="Holding Required" />
      </Pane>

      <Pane title="Load" position="inline">
        <Slider
          bind:value={totalMass}
          label="Total Mass"
          min={1}
          max={500}
          step={1}
          format={(value) => `${value} kg`}
        />
        <Slider
          bind:value={frictionForce}
          label="Friction"
          min={0}
          max={500}
          step={5}
          format={(value) => `${value} N`}
        />
        <Slider
          bind:value={externalForce}
          label="External Force"
          min={0}
          max={2000}
          step={10}
          format={(value) => `${value} N`}
        />
        <Slider
          bind:value={guidePreloadForce}
          label="Guide Preload"
          min={0}
          max={500}
          step={5}
          format={(value) => `${value} N`}
        />
        <Slider
          bind:value={imbalanceFactor}
          label="Imbalance"
          min={1}
          max={2}
          step={0.05}
          format={(value) => `×${value.toFixed(2)}`}
        />
        <Button on:click={resetLoad} label="Reset" title="Reset" />
      </Pane>

      <Pane title="Ball Screw" position="inline">
        <List bind:value={ballscrewKey} options={BALLSCREW_OPTIONS} label="Type" />
        {#if ballscrewKey === 'custom'}
          <Slider
            bind:value={customPitch}
            label="Pitch"
            min={1}
            max={50}
            step={0.5}
            format={(value) => `${value} mm`}
          />
          <Slider
            bind:value={customDiameter}
            label="Diameter"
            min={8}
            max={63}
            step={1}
            format={(value) => `${value} mm`}
          />
        {/if}
        <Slider
          bind:value={screwLength}
          label="Screw Length"
          min={50}
          max={3000}
          step={10}
          format={(value) => `${value} mm`}
        />
        <Slider
          bind:value={screwEfficiency}
          label="Efficiency"
          min={50}
          max={100}
          step={1}
          format={(value) => `${value}%`}
        />
      </Pane>

      <Pane title="Transmission" position="inline">
        <Checkbox bind:value={autoGearRatio} label="Auto Gear Ratio" />
        {#if !autoGearRatio}
          <Slider
            bind:value={gearRatio}
            label="Gear Ratio"
            min={0.5}
            max={5}
            step={0.1}
            format={(value) => `${value.toFixed(1)}:1`}
          />
        {/if}
        <Slider
          bind:value={gearEfficiency}
          label="Gear Efficiency"
          min={70}
          max={100}
          step={1}
          format={(value) => `${value}%`}
        />
        <Slider
          bind:value={gearInertia}
          label="Gear Inertia"
          min={0}
          max={0.001}
          step={0.00001}
          format={(value) => `${value.toExponential(1)} kg·m²`}
        />
      </Pane>

      <Pane title="Safety" position="inline">
        <Slider
          bind:value={safetyFactor}
          label="Safety Factor"
          min={0}
          max={100}
          step={5}
          format={(value) => `${value}%`}
        />
      </Pane>

      <Pane title="Calculated" position="inline">
        <Monitor value={`${lead_mm} mm`} label="Lead" />
        <Monitor value={`${screwMass_kg.toFixed(3)} kg`} label="Screw mass" />
        <Monitor value={`${equivalentMassPerActuator_kg.toFixed(2)} kg`} label="Eq. mass/actuator" />
        <Monitor value={`${F_static_per.toFixed(1)} N`} label="F/actuator" />
        <Monitor value={`${profile.t_accel_s.toFixed(3)} s`} label="t_accel" />
        <Monitor value={`${profile.t_const_s.toFixed(3)} s`} label="t_const" />
        <Monitor value={`${profile.isTriangular ? 'triangular' : 'trapezoidal'}`} label="Profile" />
        <Monitor value={motionBasis} label="Motion basis" />
      </Pane>
    </div>
  </div>

  {#if hoveredResult}
    <div
      class="fixed z-50 pointer-events-none bg-white border border-gray-200 rounded shadow-xl text-xs font-mono"
      style="left:{popupFlipLeft ? popupX - 16 : popupX + 16}px; top:{popupY}px; transform:{popupFlipLeft
        ? 'translate(-100%,-50%)'
        : 'translateY(-50%)'}; min-width:260px;"
    >
      <div class="px-3 py-2 border-b border-gray-100">
        <div class="font-sans font-semibold text-gray-800 text-[11px]">{hoveredResult.motor.name}</div>
        <div class="text-[10px] text-gray-400 font-sans mt-0.5">
          score {hoveredResult.score.toFixed(0)} · inertia {hoveredResult.inertiaRatio.toFixed(1)}:1 · ratio {hoveredResult.gearRatio.toFixed(1)}:1
        </div>
      </div>
      <div class="px-3 py-2 grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-0.5">
        <span></span>
        <span class="text-gray-400 font-sans text-[10px] uppercase tracking-wide">Motor</span>
        <span class="text-gray-400 font-sans text-[10px] uppercase tracking-wide">Required</span>

        <span class="text-gray-500">Peak Tq</span>
        <span>{hoveredResult.motor.peakTorque_Nm.toFixed(2)} Nm</span>
        <span
          class:text-red-500={hoveredResult.peakTorqueMargin_pct < 0}
          class:text-amber-500={hoveredResult.peakTorqueMargin_pct >= 0 && hoveredResult.peakTorqueMargin_pct < 20}
        >
          {hoveredResult.T_peak_required_Nm.toFixed(2)} Nm
        </span>

        <span class="text-gray-500">RMS Tq</span>
        <span>{hoveredResult.motor.ratedTorque_Nm.toFixed(2)} Nm</span>
        <span
          class:text-red-500={hoveredResult.rmsTorqueMargin_pct < 0}
          class:text-amber-500={hoveredResult.rmsTorqueMargin_pct >= 0 && hoveredResult.rmsTorqueMargin_pct < 20}
        >
          {hoveredResult.T_rms_required_Nm.toFixed(2)} Nm
        </span>

        <span class="text-gray-500">Speed</span>
        <span>{hoveredResult.motor.maxRPM.toLocaleString()} rpm</span>
        <span
          class:text-red-500={hoveredResult.speedMargin_pct < 0}
          class:text-amber-500={hoveredResult.speedMargin_pct >= 0 && hoveredResult.speedMargin_pct < 20}
        >
          {hoveredResult.n_required_rpm.toFixed(0)} rpm
        </span>
      </div>
      <div class="px-3 py-2 border-t border-gray-100 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <span class="text-gray-500">J load</span>
        <span>{hoveredResult.J_load_kgm2.toExponential(2)} kg·m²</span>
        <span class="text-gray-500">J total</span>
        <span>{hoveredResult.J_total_kgm2.toExponential(2)} kg·m²</span>
        <span class="text-gray-500">Peak power</span>
        <span>{hoveredResult.P_peak_required_W.toFixed(0)} W</span>
      </div>
    </div>
  {/if}
</div>

<style>
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

  th[aria-sort='ascending'] > button::after,
  th[aria-sort='descending'] > button::after,
  th[aria-sort='none'] > button::after {
    display: inline-flex;
    justify-content: flex-end;
    min-width: 0.75rem;
    margin-left: 0.5rem;
    font-size: 9px;
    color: rgb(55 65 81);
  }

  th[aria-sort='ascending'] > button::after {
    content: '▲';
  }

  th[aria-sort='descending'] > button::after {
    content: '▼';
  }

  th[aria-sort='none'] > button::after {
    content: '';
  }
</style>
