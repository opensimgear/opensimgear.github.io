<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { Gizmo, Grid, OrbitControls } from '@threlte/extras';
  import { T } from '@threlte/core';

  import RigFrame from './RigFrame.svelte';
  import type { PlannerGeometry } from './geometry';

  type Props = {
    geometry: PlannerGeometry;
    isNarrowViewport?: boolean;
  };

  const { geometry, isNarrowViewport = false }: Props = $props();

  const cameraPosition = $derived<[number, number, number]>(isNarrowViewport ? [0.98, 0.84, 2.45] : [0.84, 0.92, 2.9]);
  const gizmoSize = $derived(isNarrowViewport ? 48 : 64);
</script>

<div class="w-full touch-none border-zinc-200 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f4f4f5_60%,#e4e4e7_100%)]">
  <Canvas>
    <T.PerspectiveCamera
      makeDefault
      position={cameraPosition}
      up={[0, 1, 0]}
      on:create={({ ref }) => {
        ref.lookAt(0.72, 0.28, 0);
      }}
    >
      <OrbitControls enableDamping dampingFactor={0.08} target={[0.72, 0.24, 0]}>
        <Gizmo size={gizmoSize} />
      </OrbitControls>
    </T.PerspectiveCamera>

    <T.AmbientLight intensity={1.6} />
    <T.DirectionalLight position={[3, 4, 2]} intensity={Math.PI * 0.9} />
    <T.DirectionalLight position={[-2, 2, -3]} intensity={Math.PI * 0.35} />

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

    <RigFrame {geometry} />
  </Canvas>
</div>
