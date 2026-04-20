<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { Gizmo, Grid, OrbitControls } from '@threlte/extras';
  import { T } from '@threlte/core';

  import RigFrame from './RigFrame.svelte';
  import type { PlannerGeometry } from './geometry';
  import type { PlannerVisibleModules } from './types';

  type Props = {
    geometry: PlannerGeometry;
    isNarrowViewport?: boolean;
    profileColor: string;
    visibleModules: PlannerVisibleModules;
  };

  const { geometry, isNarrowViewport = false, profileColor, visibleModules }: Props = $props();

  const cameraPosition = $derived<[number, number, number]>(isNarrowViewport ? [0.98, 0.84, 1] : [0.1, 1, 1]);
  const gizmoSize = $derived(isNarrowViewport ? 48 : 64);
</script>

<div class="aspect-[3/2] w-full touch-none border-zinc-200 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f4f4f5_60%,#e4e4e7_100%)]">
  <Canvas shadows>
    <T.PerspectiveCamera makeDefault position={cameraPosition} up={[0, 1, 0]}>
      <OrbitControls enableDamping dampingFactor={0.08} target={[0.7, 0.1, 0]}>
        <Gizmo size={gizmoSize} />
      </OrbitControls>
    </T.PerspectiveCamera>

    <T.AmbientLight color="#eef2f7" intensity={1.4} />
    <T.DirectionalLight
      castShadow
      color="#fff9f0"
      position={[3.6, 5.4, 2.8]}
      intensity={Math.PI * 0.98}
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-bias={-0.00015}
      shadow-normalBias={0.02}
    />
    <T.DirectionalLight color="#d9e6ff" position={[-3.2, 2.4, 1.5]} intensity={Math.PI * 0.32} />
    <T.DirectionalLight color="#f3f6fb" position={[0.6, 2.1, -3.4]} intensity={Math.PI * 0.2} />

    <Grid
      plane="xz"
      position={[0.7, -0.002, 0]}
      scale={2}
      cellColor="#cbd5e1"
      sectionColor="#94a3b8"
      cellSize={0.1}
      sectionSize={0.5}
      cellThickness={0.5}
      sectionThickness={0.8}
      infiniteGrid={true}
      fadeDistance={5}
      fadeStrength={1.6}
    />

    <RigFrame {geometry} {profileColor} {visibleModules} />
  </Canvas>
</div>
