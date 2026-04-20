<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { Gizmo, Grid, OrbitControls } from '@threlte/extras';
  import { T } from '@threlte/core';

  import { PI_INTENSITY, SCENE_VIEW } from './constants';
  import RigFrame from './RigFrame.svelte';
  import type { PlannerGeometry } from './geometry';
  import type { PlannerVisibleModules } from './types';

  type Props = {
    geometry: PlannerGeometry;
    isNarrowViewport?: boolean;
    profileColor: string;
    showEndCaps: boolean;
    visibleModules: PlannerVisibleModules;
  };

  const { geometry, isNarrowViewport = false, profileColor, showEndCaps, visibleModules }: Props = $props();

  const cameraPosition = $derived<[number, number, number]>(
    isNarrowViewport ? SCENE_VIEW.narrowCameraPosition : SCENE_VIEW.wideCameraPosition
  );
  const gizmoSize = $derived(isNarrowViewport ? SCENE_VIEW.narrowGizmoSizePx : SCENE_VIEW.wideGizmoSizePx);
</script>

<div class="aspect-[3/2] w-full touch-none border-zinc-200 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f4f4f5_60%,#e4e4e7_100%)]">
  <Canvas shadows>
    <T.PerspectiveCamera makeDefault position={cameraPosition} up={SCENE_VIEW.cameraUp}>
      <OrbitControls
        enableDamping
        dampingFactor={SCENE_VIEW.orbitDampingFactor}
        target={SCENE_VIEW.controlsTarget}
      >
        <Gizmo size={gizmoSize} />
      </OrbitControls>
    </T.PerspectiveCamera>

    <T.AmbientLight color={SCENE_VIEW.ambientLightColor} intensity={SCENE_VIEW.ambientLightIntensity} />
    <T.DirectionalLight
      castShadow
      color={SCENE_VIEW.keyLightColor}
      position={SCENE_VIEW.keyLightPosition}
      intensity={PI_INTENSITY * SCENE_VIEW.keyLightIntensityMultiplier}
      shadow-mapSize-width={SCENE_VIEW.shadowMapSizePx}
      shadow-mapSize-height={SCENE_VIEW.shadowMapSizePx}
      shadow-bias={SCENE_VIEW.shadowBias}
      shadow-normalBias={SCENE_VIEW.shadowNormalBias}
    />
    <T.DirectionalLight
      color={SCENE_VIEW.fillLightColor}
      position={SCENE_VIEW.fillLightPosition}
      intensity={PI_INTENSITY * SCENE_VIEW.fillLightIntensityMultiplier}
    />
    <T.DirectionalLight
      color={SCENE_VIEW.rimLightColor}
      position={SCENE_VIEW.rimLightPosition}
      intensity={PI_INTENSITY * SCENE_VIEW.rimLightIntensityMultiplier}
    />

    <Grid
      plane="xz"
      position={SCENE_VIEW.gridPosition}
      scale={SCENE_VIEW.gridScale}
      cellColor={SCENE_VIEW.gridCellColor}
      sectionColor={SCENE_VIEW.gridSectionColor}
      cellSize={SCENE_VIEW.gridCellSize}
      sectionSize={SCENE_VIEW.gridSectionSize}
      cellThickness={SCENE_VIEW.gridCellThickness}
      sectionThickness={SCENE_VIEW.gridSectionThickness}
      infiniteGrid={true}
      fadeDistance={SCENE_VIEW.gridFadeDistance}
      fadeStrength={SCENE_VIEW.gridFadeStrength}
    />

    <RigFrame {geometry} {profileColor} {showEndCaps} {visibleModules} />
  </Canvas>
</div>
