<script lang="ts">
  import { Vector3, Matrix3 } from 'three';
  import { Canvas } from '@threlte/core';
  import { Gizmo } from '@threlte/extras';
  import { Pane, Button, Slider, Folder, Point, RotationEuler, IntervalSlider } from 'svelte-tweakpane-ui';
  import Scene from './Scene.svelte';

  let baseDiameter = 0.8;
  let platformDiameter = 0.4;
  let alphaP = 10;
  let alphaB = 110;
  let cor = { x: 0, y: 0, z: 0 };
  let actuatorMin = 0.35;
  let actuatorMax = 0.6;

  // Optimal height: neutral leg length = midpoint of actuator range → max symmetric range of motion.
  // For each leg: L0 = sqrt(d_horiz² + h²), so h = sqrt(target² - avg(d_horiz²))
  $: platformHeight = (() => {
    const alphaPh = alphaP / 2;
    const alphaBh = alphaB / 2;
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
  })();

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
    a[0] -= 1; a[4] -= 1; a[8] -= 1;
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
    let lo = 0, hi = 90;
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
    let lo = 0, hi = maxL;
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

  $: platformSpec = (() => {
    const alphaPh = alphaP / 2;
    const alphaBh = alphaB / 2;
    const startingAngle = 270;
    const angles = [startingAngle, (startingAngle + 120) % 360, (startingAngle + 240) % 360];
    const anglesP = angles.flatMap((a) => [a - alphaPh, a + alphaPh]);
    const anglesB = angles.flatMap((a) => [a - alphaBh, a + alphaBh]);
    const rP = platformDiameter / 2;
    const rB = baseDiameter / 2;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const basePoints = anglesB.map((a) => new Vector3(rB * Math.cos(toRad(a)), rB * Math.sin(toRad(a)), 0));
    const platformPoints = anglesP.map((a) => new Vector3(rP * Math.cos(toRad(a)), rP * Math.sin(toRad(a)), platformHeight));
    const corVec = centerOfRotationRelative.clone().add(new Vector3(0, 0, platformHeight));
    return {
      pitch: maxAngleForAxis('x', basePoints, platformPoints, corVec, actuatorMin, actuatorMax),
      roll:  maxAngleForAxis('y', basePoints, platformPoints, corVec, actuatorMin, actuatorMax),
      yaw:   maxAngleForAxis('z', basePoints, platformPoints, corVec, actuatorMin, actuatorMax),
      transX:    maxTranslation('x',  1, basePoints, platformPoints, actuatorMin, actuatorMax),
      transY:    maxTranslation('y',  1, basePoints, platformPoints, actuatorMin, actuatorMax),
      transZUp:  maxTranslation('z',  1, basePoints, platformPoints, actuatorMin, actuatorMax),
      transZDown: maxTranslation('z', -1, basePoints, platformPoints, actuatorMin, actuatorMax),
    };
  })();

  const resetParams = () => {
    baseDiameter = 0.8;
    platformDiameter = 0.4;
    actuatorMin = 0.35;
    actuatorMax = 0.6;
    alphaP = 10;
    alphaB = 110;
    cor = { x: 0, y: 0, z: 0 };
  };

  const resetActuator = () => {
    actuatorMin = 0.35;
    actuatorMax = 0.6;
  };

  let platformRotation = { x: 0, y: 0, z: 0 };
  let platformTranslation = { x: 0, y: 0, z: 0 };

  const resetPlatform = () => {
    platformRotation = { x: 0, y: 0, z: 0 };
    platformTranslation = { x: 0, y: 0, z: 0 };
  };

  // let acctuatorInterval: [number, number] = [0.35, 0.6];

  const formatMM = (value: number) => `${(value * 1000).toFixed(0)} mm`;
  const formatAlpha = (value: number) => `${value}°`;

  const configLinear = {
    step: 0.001,
    pointerScale: 0.001,
    format: formatMM,
  };

  const angleOption = { min: -90, max: 90, format: (val: any) => `${val}°` };
  const configAngle = {
    optionsX: angleOption,
    optionsY: angleOption,
    optionsZ: angleOption,
  };

  const alphaOptions = { min: 10, max: 360 / 3 - 10, step: 1, format: formatAlpha };

  $: centerOfRotationRelative = new Vector3(cor.x, cor.y, cor.z);
</script>

<div class="w-full not-content border border-black rounded">
  <Pane title="Control Panel" position="inline">
    <Folder title="Params">
      <Slider bind:value={baseDiameter} label="Base Diameter" {...configLinear} min={0} max={3} />
      <Slider bind:value={platformDiameter} label="Platform Diameter" {...configLinear} min={0} max={baseDiameter} />
      <Slider value={platformHeight} label="Platform Height" {...configLinear} min={0} max={1} disabled />
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
      <Button on:click={resetParams} label="Reset Params" title="Reset All" />
    </Folder>
    <Folder title="Actuator Range">
      <Slider bind:value={actuatorMin} label="Min Extension" {...configLinear} min={0.1} max={actuatorMax} />
      <Slider bind:value={actuatorMax} label="Max Extension" {...configLinear} min={actuatorMin} max={2} />
      <Button on:click={resetActuator} label="Reset Actuator" title="Reset" />
    </Folder>
    <Folder title="Movement">
      <RotationEuler
        bind:value={platformRotation}
        expanded={false}
        label="Platform rotation"
        picker={'inline'}
        unit="deg"
        {...configAngle}
      />
      <Point
        bind:value={platformTranslation}
        label="Platform Translation"
        {...configLinear}
        min={-platformDiameter}
        max={platformDiameter}
      />
      <Button on:click={resetPlatform} label="Reset Platform" title="Reset All" />
    </Folder>
  </Pane>
  <div class="relative h-[600px] bg-gray-50 flex-1">
    <Canvas>
      <Scene
        {baseDiameter}
        {platformDiameter}
        {platformHeight}
        {alphaB}
        {alphaP}
        {platformTranslation}
        {platformRotation}
        {centerOfRotationRelative}
        {actuatorMin}
        {actuatorMax}
      />
      <Gizmo
        verticalPlacement="top"
        horizontalPlacement="right"
        xColor="#ff0000"
        yColor="#00ff00"
        zColor="#0000ff"
        size={128}
        paddingX={20}
        paddingY={20}
      />
    </Canvas>
  </div>
  <div class="border-t border-black grid grid-cols-2 divide-x divide-black text-sm font-mono">
    <div class="p-3">
      <div class="text-xs font-sans font-semibold uppercase tracking-wider text-gray-500 mb-2">Rotation</div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-1">
        <span class="text-gray-500">Pitch</span><span>±{platformSpec.pitch.toFixed(1)}°</span>
        <span class="text-gray-500">Roll</span><span>±{platformSpec.roll.toFixed(1)}°</span>
        <span class="text-gray-500">Yaw</span><span>±{platformSpec.yaw.toFixed(1)}°</span>
      </div>
    </div>
    <div class="p-3">
      <div class="text-xs font-sans font-semibold uppercase tracking-wider text-gray-500 mb-2">Translation</div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-1">
        <span class="text-gray-500">X</span><span>±{(platformSpec.transX * 1000).toFixed(0)} mm</span>
        <span class="text-gray-500">Y</span><span>±{(platformSpec.transY * 1000).toFixed(0)} mm</span>
        <span class="text-gray-500">Z</span><span>{((platformHeight - platformSpec.transZDown) * 1000).toFixed(0)} / {((platformHeight + platformSpec.transZUp) * 1000).toFixed(0)} mm</span>
      </div>
    </div>
  </div>
</div>

<style>
</style>
