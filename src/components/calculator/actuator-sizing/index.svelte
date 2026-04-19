<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Checkbox, Element, Folder, List, Monitor, Pane, Slider, WaveformMonitor } from 'svelte-tweakpane-ui';
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
  import { createDebouncedUrlStateWriter } from '../shared/debounced-url-state';
  import { decodeQueryState, encodeQueryState } from '../shared/query-state';
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
    frictionForce: 30,
    ballscrewKey: '1610',
    customPitch: 10,
    customDiameter: 16,
    screwLength: 300,
    screwEfficiency: 90,
    autoGearRatio: true,
    gearRatio: 1,
    gearEfficiency: 100,
    gearInertia: 0,
    safetyFactor: 20,
    holdingRequired: true,
    advancedMode: false,
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
  const URL_STATE_DEBOUNCE_MS = 300;

  type ActuatorSizingQueryState = {
    strokeLength?: number;
    maxVelocity?: number;
    acceleration?: number;
    deceleration?: number;
    dwellTime?: number;
    systemType?: SystemType;
    actuatorAngle?: number;
    totalMass?: number;
    imbalanceFactor?: number;
    frictionForce?: number;
    ballscrewKey?: string;
    customPitch?: number;
    customDiameter?: number;
    screwLength?: number;
    screwEfficiency?: number;
    autoGearRatio?: boolean;
    gearRatio?: number;
    gearEfficiency?: number;
    gearInertia?: number;
    safetyFactor?: number;
    holdingRequired?: boolean;
    advancedMode?: boolean;
  };

  function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function readNumber(value: unknown, fallback: number) {
    return isFiniteNumber(value) ? value : fallback;
  }

  function readBoolean(value: unknown, fallback: boolean) {
    return typeof value === 'boolean' ? value : fallback;
  }

  function readString(value: unknown, fallback: string) {
    return typeof value === 'string' ? value : fallback;
  }

  function readSystemType(value: unknown, fallback: SystemType) {
    return value === 'single' || value === '4actuator' || value === 'stewart' ? value : fallback;
  }

  function applyQueryState(state: ActuatorSizingQueryState) {
    strokeLength = readNumber(state.strokeLength, DEFAULTS.strokeLength);
    maxVelocity = readNumber(state.maxVelocity, DEFAULTS.maxVelocity);
    acceleration = readNumber(state.acceleration, DEFAULTS.acceleration);
    deceleration = readNumber(state.deceleration, DEFAULTS.deceleration);
    dwellTime = readNumber(state.dwellTime, DEFAULTS.dwellTime);
    systemType = readSystemType(state.systemType, DEFAULTS.systemType);
    actuatorAngle = readNumber(state.actuatorAngle, DEFAULTS.actuatorAngle);
    totalMass = readNumber(state.totalMass, DEFAULTS.totalMass);
    imbalanceFactor = readNumber(state.imbalanceFactor, DEFAULTS.imbalanceFactor);
    frictionForce = readNumber(state.frictionForce, DEFAULTS.frictionForce);
    ballscrewKey = readString(state.ballscrewKey, DEFAULTS.ballscrewKey);
    customPitch = readNumber(state.customPitch, DEFAULTS.customPitch);
    customDiameter = readNumber(state.customDiameter, DEFAULTS.customDiameter);
    screwLength = readNumber(state.screwLength, DEFAULTS.screwLength);
    screwEfficiency = readNumber(state.screwEfficiency, DEFAULTS.screwEfficiency);
    autoGearRatio = readBoolean(state.autoGearRatio, DEFAULTS.autoGearRatio);
    gearRatio = readNumber(state.gearRatio, DEFAULTS.gearRatio);
    gearEfficiency = readNumber(state.gearEfficiency, DEFAULTS.gearEfficiency);
    gearInertia = readNumber(state.gearInertia, DEFAULTS.gearInertia);
    safetyFactor = readNumber(state.safetyFactor, DEFAULTS.safetyFactor);
    holdingRequired = readBoolean(state.holdingRequired, DEFAULTS.holdingRequired);
    advancedMode = readBoolean(state.advancedMode, DEFAULTS.advancedMode);
  }

  let strokeLength = $state(DEFAULTS.strokeLength);
  let maxVelocity = $state(DEFAULTS.maxVelocity);
  let acceleration = $state(DEFAULTS.acceleration);
  let deceleration = $state(DEFAULTS.deceleration);
  let dwellTime = $state(DEFAULTS.dwellTime);
  let systemType = $state<SystemType>(DEFAULTS.systemType);
  let actuatorAngle = $state(DEFAULTS.actuatorAngle);
  let totalMass = $state(DEFAULTS.totalMass);
  let imbalanceFactor = $state(DEFAULTS.imbalanceFactor);
  let frictionForce = $state(DEFAULTS.frictionForce);
  let ballscrewKey = $state(DEFAULTS.ballscrewKey);
  let customPitch = $state(DEFAULTS.customPitch);
  let customDiameter = $state(DEFAULTS.customDiameter);
  let screwLength = $state(DEFAULTS.screwLength);
  let screwEfficiency = $state(DEFAULTS.screwEfficiency);
  let autoGearRatio = $state(DEFAULTS.autoGearRatio);
  let gearRatio = $state(DEFAULTS.gearRatio);
  let gearEfficiency = $state(DEFAULTS.gearEfficiency);
  let gearInertia = $state(DEFAULTS.gearInertia);
  let safetyFactor = $state(DEFAULTS.safetyFactor);
  let holdingRequired = $state(DEFAULTS.holdingRequired);
  let advancedMode = $state(DEFAULTS.advancedMode);

  let userMotors = $state<ServoMotor[]>([]);
  let mounted = $state(false);
  let sortKey = $state<SortKey>(DEFAULT_SORT_STATE.key);
  let sortDescending = $state(DEFAULT_SORT_STATE.descending);

  let addFormOpen = $state(false);
  let addName = $state('');
  let addManufacturer = $state('');
  let addRatedRPM = $state(3000);
  let addMaxRPM = $state(4500);
  let addRatedTorque = $state(1.0);
  let addPeakTorque = $state(3.0);
  let addPower = $state(400);
  let addInertia = $state(0.00003);
  const debouncedUrlStateWriter = createDebouncedUrlStateWriter(URL_STATE_DEBOUNCE_MS);

  onMount(() => {
    const encoded = new URLSearchParams(window.location.search).get(STATE_KEY);

    if (encoded) {
      const state = decodeQueryState<ActuatorSizingQueryState>(encoded);

      if (state) {
        applyQueryState(state);
      }
    }

    userMotors = loadUserServoMotors();
    mounted = true;

    return () => {
      debouncedUrlStateWriter.cancel();
    };
  });

  $effect(() => {
    if (!advancedMode) {
      if (frictionForce !== DEFAULTS.frictionForce) frictionForce = DEFAULTS.frictionForce;
      if (imbalanceFactor !== DEFAULTS.imbalanceFactor) imbalanceFactor = DEFAULTS.imbalanceFactor;
      if (screwEfficiency !== DEFAULTS.screwEfficiency) screwEfficiency = DEFAULTS.screwEfficiency;
      if (gearEfficiency !== DEFAULTS.gearEfficiency) gearEfficiency = DEFAULTS.gearEfficiency;
      if (gearInertia !== DEFAULTS.gearInertia) gearInertia = DEFAULTS.gearInertia;
    }
  });

  $effect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.searchParams.set(
      STATE_KEY,
      encodeQueryState({
        strokeLength,
        maxVelocity,
        acceleration,
        deceleration,
        dwellTime,
        systemType,
        actuatorAngle,
        totalMass,
        imbalanceFactor,
        frictionForce,
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
        advancedMode,
      })
    );
    debouncedUrlStateWriter.schedule(url.toString());
  });

  const lead_mm = $derived(
    ballscrewKey === 'custom' ? customPitch : (BALLSCREW_PITCHES[ballscrewKey] ?? DEFAULTS.customPitch)
  );
  const screwDiameter_mm = $derived(
    ballscrewKey === 'custom' ? customDiameter : (BALLSCREW_DIAMETERS[ballscrewKey] ?? DEFAULTS.customDiameter)
  );
  const lead_m = $derived(lead_mm / 1000);
  const screwMass_kg = $derived(computeScrewMass(screwDiameter_mm, screwLength));
  const J_screw_rot = $derived(computeScrewRotationalInertia(screwMass_kg, screwDiameter_mm / 2 / 1000));

  const profile = $derived(
    computeTrapezoidalProfile(strokeLength / 1000, maxVelocity / 1000, acceleration / 1000, deceleration / 1000)
  );
  const profileDiagram = $derived(
    buildMotionProfileDiagram({
      t_accel_s: profile.t_accel_s,
      t_const_s: profile.t_const_s,
      t_decel_s: profile.t_decel_s,
      dwellTime_s: dwellTime,
    })
  );
  const equivalentMassPerActuator_kg = $derived(
    computeForcePerActuator(totalMass, systemType, imbalanceFactor, actuatorAngle)
  );
  const F_static_total = $derived(computeStaticForce(totalMass, frictionForce));
  const F_hold_total = $derived(computeHoldingForce(totalMass));
  const F_static_per = $derived(computeForcePerActuator(F_static_total, systemType, imbalanceFactor, actuatorAngle));
  const F_hold_per = $derived(
    holdingRequired ? computeForcePerActuator(F_hold_total, systemType, imbalanceFactor, actuatorAngle) : 0
  );
  const allMotors = $derived([...BUILTIN_SERVO_MOTORS, ...userMotors]);
  const maxG = $derived(Math.max(acceleration, deceleration) / 1000 / 9.81);
  const motionBasis = $derived(systemType === 'stewart' ? 'Actuator values' : 'Axis values');
  const unsortedMotorResults = $derived.by(() =>
    allMotors.map((motor) => {
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
            motor
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
    })
  );
  const motorResults = $derived(sortMotorResults(unsortedMotorResults, { key: sortKey, descending: sortDescending }));

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
    imbalanceFactor = DEFAULTS.imbalanceFactor;
  }

  function resetBallScrew() {
    ballscrewKey = DEFAULTS.ballscrewKey;
    customPitch = DEFAULTS.customPitch;
    customDiameter = DEFAULTS.customDiameter;
    screwLength = DEFAULTS.screwLength;
    screwEfficiency = DEFAULTS.screwEfficiency;
  }

  function resetTransmission() {
    autoGearRatio = DEFAULTS.autoGearRatio;
    gearRatio = DEFAULTS.gearRatio;
    gearEfficiency = DEFAULTS.gearEfficiency;
    gearInertia = DEFAULTS.gearInertia;
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

  let hoveredResult = $state<MotorEvaluationV2 | null>(null);
  let popupX = $state(0);
  let popupY = $state(0);
  let popupFlipLeft = $state(false);

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

  function formatMotorType(motorType: ServoMotor['motorType']): string | null {
    if (!motorType) {
      return null;
    }

    return motorType
      .split('-')
      .map((part) => part.toUpperCase())
      .join(' ');
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
                onclick={() => onSortHeaderClick('status')}
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
                onclick={() => onSortHeaderClick('score')}
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
                onclick={() => onSortHeaderClick('peak')}
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
                onclick={() => onSortHeaderClick('rms')}
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
                onclick={() => onSortHeaderClick('speed')}
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
                onclick={() => onSortHeaderClick('inertia')}
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
              onmouseenter={(event) => onRowEnter(event, result)}
              onmousemove={updatePopupPos}
              onmouseleave={onRowLeave}
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
                    onclick={() => deleteUserMotor(result.motor.id)}
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
                  onclick={() => (addFormOpen = true)}
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
                  <button onclick={addUserMotor} class="btn-primary text-xs py-1.5 px-3 rounded font-sans">Save</button>
                  <button
                    onclick={() => (addFormOpen = false)}
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
      <Pane title="Setting mode" position="inline">
        <Checkbox bind:value={advancedMode} label="Advanced" />
      </Pane>
      <section aria-label="Motion Profile">
        <h2 class="sr-only">Motion Profile</h2>
        <Pane title="Motion Profile" position="inline">
          <Element>
            <MotionProfileDiagram diagram={profileDiagram} />
          </Element>
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
          <Button on:click={resetMotionProfile} label="Reset" title="Reset" />
        </Pane>
      </section>

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
        <Slider
          bind:value={safetyFactor}
          label="Safety Factor"
          min={0}
          max={100}
          step={5}
          format={(value) => `${value}%`}
        />
        <Folder title="Load">
          <Slider
            bind:value={totalMass}
            label="Total Mass"
            min={1}
            max={500}
            step={1}
            format={(value) => `${value} kg`}
          />
          {#if advancedMode}
            <Slider
              bind:value={frictionForce}
              label="Friction"
              min={0}
              max={500}
              step={5}
              format={(value) => `${value} N`}
            />
          {/if}
          {#if advancedMode}
            <Slider
              bind:value={imbalanceFactor}
              label="Imbalance"
              min={1}
              max={2}
              step={0.05}
              format={(value) => `×${value.toFixed(2)}`}
            />
          {/if}
          <Button on:click={resetLoad} label="Reset" title="Reset" />
        </Folder>
        <Folder title="Ball Screw">
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
          {#if advancedMode}
            <Slider
              bind:value={screwEfficiency}
              label="Efficiency"
              min={50}
              max={100}
              step={1}
              format={(value) => `${value}%`}
            />
          {/if}
          <Button on:click={resetBallScrew} label="Reset" title="Reset" />
        </Folder>
        <Folder title="Transmission">
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
          {#if advancedMode}
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
          {/if}
          <Button on:click={resetTransmission} label="Reset" title="Reset" />
        </Folder>
      </Pane>

      <section aria-label="Calculated">
        <h2 class="sr-only">Calculated</h2>
        <Pane title="Calculated" position="inline">
          <Monitor value={`${screwMass_kg.toFixed(3)} kg`} label="Screw mass" />
          <Monitor value={`${equivalentMassPerActuator_kg.toFixed(2)} kg`} label="Mass / act" />
          <Monitor value={`${F_static_per.toFixed(1)} N`} label="F_static / act" />
          <Monitor value={`${F_hold_per.toFixed(1)} N`} label="F_hold / act" />
          <Monitor value={`${(profile.v_peak_m_s * 1000).toFixed(1)} mm/s`} label="v_peak" />
          <Monitor value={`${maxG.toFixed(2)} g`} label="Max accel" />
          <Monitor
            value={`${(profile.t_accel_s + profile.t_const_s + profile.t_decel_s).toFixed(3)} s`}
            label="Cycle time"
          />
          <Monitor value={profile.isTriangular ? 'triangular' : 'trapezoidal'} label="Profile" />
        </Pane>
      </section>
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
          score {hoveredResult.score.toFixed(0)} · inertia {hoveredResult.inertiaRatio.toFixed(1)}:1 · ratio {hoveredResult.gearRatio.toFixed(
            1
          )}:1
        </div>
        {#if hoveredResult.motor.manufacturer || hoveredResult.motor.series || hoveredResult.motor.model || hoveredResult.motor.motorType}
          <div class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[10px]">
            {#if hoveredResult.motor.manufacturer}
              <span class="text-gray-400 font-sans uppercase tracking-wide">Maker</span>
              <span>{hoveredResult.motor.manufacturer}</span>
            {/if}
            {#if hoveredResult.motor.series}
              <span class="text-gray-400 font-sans uppercase tracking-wide">Series</span>
              <span>{hoveredResult.motor.series}</span>
            {/if}
            {#if hoveredResult.motor.model}
              <span class="text-gray-400 font-sans uppercase tracking-wide">Model</span>
              <span>{hoveredResult.motor.model}</span>
            {/if}
            {#if formatMotorType(hoveredResult.motor.motorType)}
              <span class="text-gray-400 font-sans uppercase tracking-wide">Type</span>
              <span>{formatMotorType(hoveredResult.motor.motorType)}</span>
            {/if}
          </div>
        {/if}
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
      {#if hoveredResult.motor.voltage_V || hoveredResult.motor.encoder || hoveredResult.motor.hasBrake !== undefined || hoveredResult.motor.protectionRating}
        <div class="px-3 py-2 border-t border-gray-100 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[10px]">
          {#if hoveredResult.motor.voltage_V}
            <span class="text-gray-500">Voltage</span>
            <span>{hoveredResult.motor.voltage_V} V</span>
          {/if}
          {#if hoveredResult.motor.encoder}
            <span class="text-gray-500">Encoder</span>
            <span>{hoveredResult.motor.encoder}</span>
          {/if}
          {#if hoveredResult.motor.hasBrake !== undefined}
            <span class="text-gray-500">Brake</span>
            <span>{hoveredResult.motor.hasBrake ? 'Yes' : 'No'}</span>
          {/if}
          {#if hoveredResult.motor.protectionRating}
            <span class="text-gray-500">IP</span>
            <span>{hoveredResult.motor.protectionRating}</span>
          {/if}
        </div>
      {/if}
      {#if hoveredResult.motor.frameSize_mm || hoveredResult.motor.flange_mm || hoveredResult.motor.shaftDiameter_mm || hoveredResult.motor.mass_kg}
        <div class="px-3 py-2 border-t border-gray-100 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[10px]">
          {#if hoveredResult.motor.frameSize_mm}
            <span class="text-gray-500">Frame</span>
            <span>{hoveredResult.motor.frameSize_mm} mm</span>
          {/if}
          {#if hoveredResult.motor.flange_mm}
            <span class="text-gray-500">Flange</span>
            <span>{hoveredResult.motor.flange_mm} mm</span>
          {/if}
          {#if hoveredResult.motor.shaftDiameter_mm}
            <span class="text-gray-500">Shaft</span>
            <span>{hoveredResult.motor.shaftDiameter_mm} mm</span>
          {/if}
          {#if hoveredResult.motor.mass_kg}
            <span class="text-gray-500">Mass</span>
            <span>{hoveredResult.motor.mass_kg.toFixed(2)} kg</span>
          {/if}
        </div>
      {/if}
      {#if hoveredResult.motor.notes || hoveredResult.motor.sourceNote}
        <div class="px-3 py-2 border-t border-gray-100 text-[10px] text-gray-500 leading-snug">
          {#if hoveredResult.motor.notes}
            <div>{hoveredResult.motor.notes}</div>
          {/if}
          {#if hoveredResult.motor.sourceNote}
            <div class="mt-1">Source: {hoveredResult.motor.sourceNote}</div>
          {/if}
        </div>
      {/if}
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
