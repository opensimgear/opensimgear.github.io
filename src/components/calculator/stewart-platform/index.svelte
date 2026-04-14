<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { Gizmo } from '@threlte/extras';
  import { onMount } from 'svelte';
  import { Button, Monitor, Pane, Point, RotationEuler, Slider } from 'svelte-tweakpane-ui';
  import { Matrix3, Vector3 } from 'three';
  import { decodeQueryState, encodeQueryState } from '../shared/query-state';
  import Scene from './Scene.svelte';
  import { clampPlatformMovement, type PlatformSpec, type Rotation, type Translation } from './state';

  const STATE_KEY = 'sps';

  const DEFAULTS = {
    baseDiameter: 1.0,
    platformDiameter: 0.6,
    alphaP: 15,
    alphaB: 20,
    cor: { x: 0, y: 0, z: 0 },
    actuatorMin: 0.4,
    actuatorMax: 0.6,
    platformRotation: { x: 0, y: 0, z: 0 },
    platformTranslation: { x: 0, y: 0, z: 0 },
  };

  type CenterOfRotation = typeof DEFAULTS.cor;

  type StewartPlatformQueryState = {
    baseDiameter?: number;
    platformDiameter?: number;
    alphaP?: number;
    alphaB?: number;
    cor?: CenterOfRotation;
    actuatorMin?: number;
    actuatorMax?: number;
    platformRotation?: Rotation;
    platformTranslation?: Translation;
  };

  function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function isVectorState(value: unknown): value is Rotation {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const candidate = value as Record<string, unknown>;

    return isFiniteNumber(candidate.x) && isFiniteNumber(candidate.y) && isFiniteNumber(candidate.z);
  }

  function readNumber(value: unknown, fallback: number) {
    return isFiniteNumber(value) ? value : fallback;
  }

  function readVectorState<T extends Rotation | Translation | CenterOfRotation>(value: unknown, fallback: T): T {
    return isVectorState(value) ? ({ x: value.x, y: value.y, z: value.z } as T) : ({ ...fallback } as T);
  }

  function applyQueryState(state: StewartPlatformQueryState) {
    baseDiameter = readNumber(state.baseDiameter, DEFAULTS.baseDiameter);
    platformDiameter = readNumber(state.platformDiameter, DEFAULTS.platformDiameter);
    alphaP = readNumber(state.alphaP, DEFAULTS.alphaP);
    alphaB = readNumber(state.alphaB, DEFAULTS.alphaB);
    cor = readVectorState(state.cor, DEFAULTS.cor);
    actuatorMin = readNumber(state.actuatorMin, DEFAULTS.actuatorMin);
    actuatorMax = readNumber(state.actuatorMax, DEFAULTS.actuatorMax);
    platformRotation = readVectorState(state.platformRotation, DEFAULTS.platformRotation);
    platformTranslation = readVectorState(state.platformTranslation, DEFAULTS.platformTranslation);
  }

  let baseDiameter = $state(DEFAULTS.baseDiameter);
  let platformDiameter = $state(DEFAULTS.platformDiameter);
  let alphaP = $state(DEFAULTS.alphaP);
  let alphaB = $state(DEFAULTS.alphaB);
  let cor = $state<CenterOfRotation>({ ...DEFAULTS.cor });
  let actuatorMin = $state(DEFAULTS.actuatorMin);
  let actuatorMax = $state(DEFAULTS.actuatorMax);
  let platformRotation = $state<Rotation>({ ...DEFAULTS.platformRotation });
  let platformTranslation = $state<Translation>({ ...DEFAULTS.platformTranslation });
  let mounted = $state(false);

  const alphaBGeom = $derived(360 / 3 - alphaB);
  const centerOfRotationRelative = $derived(new Vector3(cor.x, cor.y, cor.z));

  onMount(() => {
    const encoded = new URLSearchParams(window.location.search).get(STATE_KEY);

    if (encoded) {
      const state = decodeQueryState<StewartPlatformQueryState>(encoded);

      if (state) {
        applyQueryState(state);
      }
    }

    mounted = true;
  });

  const platformHeight = $derived.by(() => {
    const alphaPh = alphaP / 2;
    const alphaBh = alphaBGeom / 2;
    const startingAngle = 270;
    const angles = [startingAngle, (startingAngle + 120) % 360, (startingAngle + 240) % 360];
    const anglesP = angles.flatMap((a) => [a - alphaPh, a + alphaPh]);
    const anglesB = angles.flatMap((a) => [a - alphaBh, a + alphaBh]);
    const rP = platformDiameter / 2;
    const rB = baseDiameter / 2;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const avgD2 =
      anglesB.reduce((sum, angleB, i) => {
        const dx = rP * Math.cos(toRad(anglesP[i])) - rB * Math.cos(toRad(angleB));
        const dy = rP * Math.sin(toRad(anglesP[i])) - rB * Math.sin(toRad(angleB));
        return sum + dx * dx + dy * dy;
      }, 0) / anglesB.length;
    const target = (actuatorMin + actuatorMax) / 2;
    return Math.sqrt(Math.max(0, target * target - avgD2));
  });

  // Replicates Scene.svelte's rotation transform to check whether all legs stay within bounds.
  function isRotationValid(
    basePoints: Vector3[],
    platformPoints: Vector3[],
    cor: Vector3,
    rotXdeg: number,
    rotYdeg: number,
    rotZdeg: number,
    minL: number,
    maxL: number
  ): boolean {
    const tx = (rotXdeg * Math.PI) / 180;
    const ty = (rotYdeg * Math.PI) / 180;
    const tz = (rotZdeg * Math.PI) / 180;
    const R = new Matrix3(1, 0, 0, 0, Math.cos(tx), -Math.sin(tx), 0, Math.sin(tx), Math.cos(tx))
      .multiply(new Matrix3(Math.cos(ty), 0, Math.sin(ty), 0, 1, 0, -Math.sin(ty), 0, Math.cos(ty)))
      .multiply(new Matrix3(Math.cos(tz), -Math.sin(tz), 0, Math.sin(tz), Math.cos(tz), 0, 0, 0, 1));
    const a = R.toArray();
    a[0] -= 1;
    a[4] -= 1;
    a[8] -= 1;
    const qX = new Vector3(a[0], a[1], a[2]);
    const qY = new Vector3(a[3], a[4], a[5]);
    const qZ = new Vector3(a[6], a[7], a[8]);
    return basePoints.every((b, i) => {
      const p = platformPoints[i];
      const dM = p.clone().sub(cor);
      const dTheta = new Vector3(dM.dot(qX), dM.dot(qY), dM.dot(qZ));
      const l = b.distanceTo(p.clone().add(dTheta));
      return l >= minL && l <= maxL;
    });
  }

  function maxAngleForAxis(
    axis: 'x' | 'y' | 'z',
    basePoints: Vector3[],
    platformPoints: Vector3[],
    cor: Vector3,
    minL: number,
    maxL: number
  ): number {
    let lo = 0,
      hi = 90;
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2;
      const rot = { x: 0, y: 0, z: 0, [axis]: mid };
      if (isRotationValid(basePoints, platformPoints, cor, rot.x, rot.y, rot.z, minL, maxL)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return lo;
  }

  function isTranslationValid(
    basePoints: Vector3[],
    platformPoints: Vector3[],
    dX: number,
    dY: number,
    dZ: number,
    minL: number,
    maxL: number
  ): boolean {
    const d = new Vector3(dX, dY, dZ);
    return basePoints.every((b, i) => {
      const l = b.distanceTo(platformPoints[i].clone().add(d));
      return l >= minL && l <= maxL;
    });
  }

  function maxTranslation(
    axis: 'x' | 'y' | 'z',
    sign: 1 | -1,
    basePoints: Vector3[],
    platformPoints: Vector3[],
    minL: number,
    maxL: number
  ): number {
    let lo = 0,
      hi = maxL;
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2;
      const d = { x: 0, y: 0, z: 0, [axis]: sign * mid };
      if (isTranslationValid(basePoints, platformPoints, d.x, d.y, d.z, minL, maxL)) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return lo;
  }

  const platformSpec = $derived.by<PlatformSpec>(() => {
    const alphaPh = alphaP / 2;
    const alphaBh = alphaBGeom / 2;
    const startingAngle = 270;
    const angles = [startingAngle, (startingAngle + 120) % 360, (startingAngle + 240) % 360];
    const anglesP = angles.flatMap((a) => [a - alphaPh, a + alphaPh]);
    const anglesB = angles.flatMap((a) => [a - alphaBh, a + alphaBh]);
    const rP = platformDiameter / 2;
    const rB = baseDiameter / 2;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const basePoints = anglesB.map((a) => new Vector3(rB * Math.cos(toRad(a)), rB * Math.sin(toRad(a)), 0));
    const platformPoints = anglesP.map(
      (a) => new Vector3(rP * Math.cos(toRad(a)), rP * Math.sin(toRad(a)), platformHeight)
    );
    const corVec = centerOfRotationRelative.clone().add(new Vector3(0, 0, platformHeight));
    return {
      pitch: maxAngleForAxis('x', basePoints, platformPoints, corVec, actuatorMin, actuatorMax),
      roll: maxAngleForAxis('y', basePoints, platformPoints, corVec, actuatorMin, actuatorMax),
      yaw: maxAngleForAxis('z', basePoints, platformPoints, corVec, actuatorMin, actuatorMax),
      transX: maxTranslation('x', 1, basePoints, platformPoints, actuatorMin, actuatorMax),
      transY: maxTranslation('y', 1, basePoints, platformPoints, actuatorMin, actuatorMax),
      transZUp: maxTranslation('z', 1, basePoints, platformPoints, actuatorMin, actuatorMax),
      transZDown: maxTranslation('z', -1, basePoints, platformPoints, actuatorMin, actuatorMax),
    };
  });

  const resetParams = () => {
    baseDiameter = DEFAULTS.baseDiameter;
    platformDiameter = DEFAULTS.platformDiameter;
    actuatorMin = DEFAULTS.actuatorMin;
    actuatorMax = DEFAULTS.actuatorMax;
    alphaP = DEFAULTS.alphaP;
    alphaB = DEFAULTS.alphaB;
    cor = { ...DEFAULTS.cor };
  };

  const resetActuator = () => {
    actuatorMin = DEFAULTS.actuatorMin;
    actuatorMax = DEFAULTS.actuatorMax;
  };

  const resetPlatform = () => {
    platformRotation = { ...DEFAULTS.platformRotation };
    platformTranslation = { ...DEFAULTS.platformTranslation };
  };

  // let acctuatorInterval: [number, number] = [0.35, 0.6];

  const formatMM = (value: number) => `${(value * 1000).toFixed(0)} mm`;
  const formatAlpha = (value: number) => `${value}°`;

  const configLinear = {
    step: 0.001,
    pointerScale: 0.001,
    format: formatMM,
  };

  const formatDeg = (val: number) => `${val.toFixed(1)}°`;
  const movementAngle = $derived({
    optionsX: { min: -platformSpec.pitch, max: platformSpec.pitch, format: formatDeg },
    optionsY: { min: -platformSpec.roll, max: platformSpec.roll, format: formatDeg },
    optionsZ: { min: -platformSpec.yaw, max: platformSpec.yaw, format: formatDeg },
  });

  $effect(() => {
    const movement = clampPlatformMovement(platformRotation, platformTranslation, platformSpec);

    if (movement.rotation !== platformRotation) {
      platformRotation = movement.rotation;
    }

    if (movement.translation !== platformTranslation) {
      platformTranslation = movement.translation;
    }
  });

  $effect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.searchParams.set(
      STATE_KEY,
      encodeQueryState({
        baseDiameter,
        platformDiameter,
        alphaP,
        alphaB,
        cor,
        actuatorMin,
        actuatorMax,
        platformRotation,
        platformTranslation,
      })
    );
    window.history.replaceState({}, '', url.toString());
  });

  const alphaOptions = { min: 10, max: 360 / 3 - 10, step: 1, format: formatAlpha };
</script>

<div class="w-full not-content border border-black rounded">
  <div class="flex flex-row">
    <div class="relative h-[600px] bg-gray-50 flex-1">
      <Canvas>
        <Scene
          {baseDiameter}
          {platformDiameter}
          {platformHeight}
          alphaB={alphaBGeom}
          {alphaP}
          {platformTranslation}
          {platformRotation}
          {centerOfRotationRelative}
          {actuatorMin}
          {actuatorMax}
        />
        <Gizmo size={128} />
      </Canvas>
      <div
        class="absolute top-3 right-3 bg-white/80 backdrop-blur-sm border border-gray-300 rounded px-3 py-2 text-xs font-mono pointer-events-none select-none"
      >
        <div class="text-[10px] font-sans font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Platform</div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <span class="text-gray-500">Pitch</span><span>{platformRotation.x.toFixed(1)}°</span>
          <span class="text-gray-500">Roll</span><span>{platformRotation.y.toFixed(1)}°</span>
          <span class="text-gray-500">Yaw</span><span>{platformRotation.z.toFixed(1)}°</span>
          <span class="text-gray-500">X</span><span>{(platformTranslation.x * 1000).toFixed(0)} mm</span>
          <span class="text-gray-500">Y</span><span>{(platformTranslation.y * 1000).toFixed(0)} mm</span>
          <span class="text-gray-500">Z</span><span
            >{((platformHeight + platformTranslation.z) * 1000).toFixed(0)} mm</span
          >
        </div>
      </div>
    </div>
    <div class="border-l border-black flex flex-col divide-y divide-black shrink-0">
      <Pane title="Parameters" position="inline">
        <Slider bind:value={baseDiameter} label="Base Diameter" {...configLinear} min={0} max={3} />
        <Slider bind:value={platformDiameter} label="Platform Diameter" {...configLinear} min={0} max={baseDiameter} />
        <Slider bind:value={alphaB} label="Base Alpha" {...alphaOptions} />
        <Slider bind:value={alphaP} label="Platform Alpha" {...alphaOptions} />
        <Point
          bind:value={cor}
          label="Center of Rotation"
          {...configLinear}
          min={-platformDiameter}
          max={platformDiameter}
          optionsZ={{ ...configLinear, min: 0, max: platformDiameter }}
        />
        <Button on:click={resetParams} label="Reset Params" title="Reset" />
      </Pane>
      <Pane title="Actuator Range" position="inline">
        <Slider bind:value={actuatorMin} label="Min Extension" {...configLinear} min={0.1} max={actuatorMax} />
        <Slider bind:value={actuatorMax} label="Max Extension" {...configLinear} min={actuatorMin} max={2} />
        <Button on:click={resetActuator} label="Reset Actuator" title="Reset" />
      </Pane>
      <Pane title="Movement" position="inline">
        <RotationEuler
          bind:value={platformRotation}
          expanded={false}
          label="Platform rotation"
          picker={'inline'}
          unit="deg"
          {...movementAngle}
        />
        <Point
          bind:value={platformTranslation}
          label="Platform Translation"
          {...configLinear}
          min={-platformDiameter}
          max={platformDiameter}
        />
        <Button on:click={resetPlatform} label="Reset Platform" title="Reset" />
      </Pane>
      <section aria-label="Constraints">
        <h2 class="sr-only">Constraints</h2>
        <Pane title="Constraints" position="inline">
          <Monitor value={`±${platformSpec.pitch.toFixed(1)}°`} label="Pitch" />
          <Monitor value={`±${platformSpec.roll.toFixed(1)}°`} label="Roll" />
          <Monitor value={`±${platformSpec.yaw.toFixed(1)}°`} label="Yaw" />
          <Monitor value={`±${(platformSpec.transX * 1000).toFixed(0)} mm`} label="Surge" />
          <Monitor value={`±${(platformSpec.transY * 1000).toFixed(0)} mm`} label="Sway" />
          <Monitor
            value={`${((platformHeight - platformSpec.transZDown) * 1000).toFixed(0)} / ${((platformHeight + platformSpec.transZUp) * 1000).toFixed(0)} mm`}
            label="Heave"
          />
        </Pane>
      </section>
    </div>
  </div>
</div>

<style>
  :global(.not-content .tp-rotv_t) {
    text-align: left;
  }
</style>
