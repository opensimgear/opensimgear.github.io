<script lang="ts">
  import { Vector3 } from 'three';
  import { Canvas } from '@threlte/core';
  import { Gizmo } from '@threlte/extras';
  import { Pane, Slider, Folder, Point, RotationEuler, IntervalSlider } from 'svelte-tweakpane-ui';
  import Scene from './Scene.svelte';

  let baseDiameter = 0.8;
  let platformDiameter = 0.4;
  let platformHeight = 0.5;
  let alphaP = 10;
  let alphaB = 110;
  // let acctuatorInterval: [number, number] = [0.35, 0.6];
  let platformRotation = { x: 0, y: 0, z: 0 };
  let platformTranslation = { x: 0, y: 0, z: 0 };
  let cor = { x: 0, y: 0, z: 0 };

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

  $: centerOfRotationRelative = new Vector3(cor.x / 1000, cor.y / 1000, cor.z / 1000);
</script>

<div class="w-full not-content border border-black rounded">
  <Pane title="Control Panel" position="inline">
    <Folder title="Params">
      <Slider bind:value={baseDiameter} label="Base Diameter" {...configLinear} min={0} max={5} />
      <Slider bind:value={platformDiameter} label="Platform Diameter" {...configLinear} min={0} max={baseDiameter} />
      <Slider bind:value={platformHeight} label="Platform Height" {...configLinear} min={0} max={1} />
      <Slider bind:value={alphaB} label="Base Alpha" {...alphaOptions} />
      <Slider bind:value={alphaP} label="Platform Alpha" {...alphaOptions} />
      <Point
        bind:value={centerOfRotationRelative}
        label="Center of Rotation"
        {...configLinear}
        min={-platformDiameter}
        max={platformDiameter}
        optionsZ={{ ...configLinear, min: 0, max: platformDiameter }}
      />
    </Folder>
    <!-- 
    <Folder title="Actuator Range">
      <IntervalSlider bind:value={acctuatorInterval} {...configLinear} min={0} max={2} />
    </Folder>
    -->
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
    </Folder>
  </Pane>
  <div class="relative h-[600px] bg-gray-50">
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
</div>

<style>
</style>
