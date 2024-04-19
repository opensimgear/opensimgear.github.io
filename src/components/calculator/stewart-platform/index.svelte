<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { Gizmo } from '@threlte/extras';
  import Scene from './Scene.svelte';
  import PlatformParam from './PlatformParam.svelte';
  import { Vector3 } from 'three';

  let pitch = 0;
  let roll = 0;
  let yaw = 0;
  let sway = 0;
  let surge = 0;
  let heave = 0;

  let corX = 0;
  let corY = 0;
  let corZ = 0;

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  $: centerOfRotationRelative = new Vector3(corX / 1000, corY / 1000, corZ / 1000);
</script>

<div class="w-full not-content">
  <form>
    <div class="flex flex-row my-4 gap-5">
      <PlatformParam label="X" bind:value={corX} unit="mm" step={10} />
      <PlatformParam label="y" bind:value={corY} unit="mm" step={10} />
      <PlatformParam label="Z" bind:value={corZ} unit="mm" step={10} />
    </div>
    <div class="flex flex-row my-4 gap-5">
      <div class="flex flex-col gap-3">
        <PlatformParam label="Pitch" bind:value={pitch} unit="deg" />
        <PlatformParam label="Roll" bind:value={roll} unit="deg" />
        <PlatformParam label="Yaw" bind:value={yaw} unit="deg" />
      </div>
      <div class="flex flex-col gap-3">
        <PlatformParam label="Sway" bind:value={sway} step={10} unit="mm" />
        <PlatformParam label="Surge" bind:value={surge} step={10} unit="mm" />
        <PlatformParam label="Heave" bind:value={heave} step={10} unit="mm" />
      </div>
    </div>
  </form>
  <div class="h-[600px] border border-black rounded">
    <Canvas>
      <Scene
        thetaX={toRadians(pitch)}
        thetaY={toRadians(roll)}
        thetaZ={toRadians(yaw)}
        dX={sway / 1000}
        dY={surge / 1000}
        dZ={heave / 1000}
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
