<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { OrbitControls } from '@threlte/extras';
  import { T } from '@threlte/core';
  import { onMount, tick } from 'svelte';
  import { Group, OrthographicCamera, PerspectiveCamera, Vector3, WebGLRenderer } from 'three';
  import type { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

  import { PI_INTENSITY, SCENE_VIEW } from './constants';
  import ViewportCameraControls from '../shared/ViewportCameraControls.svelte';
  import ViewportGizmo from '../shared/ViewportGizmo.svelte';
  import SceneGrid from '../shared/SceneGrid.svelte';
  import { buildPlaneEquation, syncOrbitCameraView, ThreeSpaceMouseBridge } from '../shared/space-mouse';
  import { getSceneControlsTopOffsetPx } from '../shared/scene-controls';
  import RigFrame from './RigFrame.svelte';
  import type { PlannerGeometry } from './geometry';
  import type { PlannerMeasurementOverlay } from './measurement-overlay';
  import type { PlannerVisibleModules } from './types';

  type Props = {
    geometry: PlannerGeometry;
    highlightedBeamIds: string[];
    isNarrowViewport?: boolean;
    measurementOverlay?: PlannerMeasurementOverlay | null;
    profileColor: string;
    showEndCaps: boolean;
    visibleModules: PlannerVisibleModules;
  };

  const { geometry, highlightedBeamIds, isNarrowViewport = false, measurementOverlay = null, profileColor, showEndCaps, visibleModules }: Props = $props();
  const ORTHOGRAPHIC_ASPECT_RATIO = 3 / 2;
  const PERSPECTIVE_FOV_RADIANS = (50 * Math.PI) / 180;

  const defaultCameraPosition = $derived<[number, number, number]>(
    isNarrowViewport ? SCENE_VIEW.narrowCameraPosition : SCENE_VIEW.wideCameraPosition
  );
  let savedView = $state<{
    position: [number, number, number];
    target: [number, number, number];
  } | null>(null);
  let perspectiveCameraRef = $state<PerspectiveCamera | null>(null);
  let orthographicCameraRef = $state<OrthographicCamera | null>(null);
  let orbitControlsRef = $state<ThreeOrbitControls | null>(null);
  let rigRootRef = $state<Group | null>(null);
  let viewportElement = $state<HTMLDivElement | null>(null);
  let spaceMouseBridge = $state<ThreeSpaceMouseBridge | null>(null);
  const createPlannerRenderer = (canvas: HTMLCanvasElement) =>
    new WebGLRenderer({
      canvas,
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });

  const cameraPosition = $derived<[number, number, number]>(savedView?.position ?? defaultCameraPosition);
  const controlsTarget = $derived<[number, number, number]>(savedView?.target ?? SCENE_VIEW.controlsTarget);
  const gizmoSize = $derived(isNarrowViewport ? SCENE_VIEW.narrowGizmoSizePx : SCENE_VIEW.wideGizmoSizePx);
  const orthographicViewHeight = $derived(
    2 *
      new Vector3(...cameraPosition).distanceTo(new Vector3(...controlsTarget)) *
      Math.tan(PERSPECTIVE_FOV_RADIANS / 2)
  );
  const orthographicArgs = $derived.by<[number, number, number, number, number, number]>(() => {
    const top = orthographicViewHeight / 2;
    const right = top * ORTHOGRAPHIC_ASPECT_RATIO;

    return [-right, right, top, -top, 0.1, 20];
  });
  let useOrthographicCamera = $state(false);

  function captureCurrentView() {
    const activeCamera = useOrthographicCamera ? orthographicCameraRef : perspectiveCameraRef;

    if (!activeCamera || !orbitControlsRef) {
      return;
    }

    savedView = {
      position: activeCamera.position.toArray() as [number, number, number],
      target: orbitControlsRef.target.toArray() as [number, number, number],
    };
  }

  function applySavedView() {
    const activeCamera = useOrthographicCamera ? orthographicCameraRef : perspectiveCameraRef;
    const controls = orbitControlsRef;

    if (!activeCamera || !controls) {
      return;
    }

    syncOrbitCameraView({
      camera: activeCamera,
      controls,
      cameraUp: SCENE_VIEW.cameraUp,
      position: cameraPosition,
      target: controlsTarget,
    });
  }

  async function setCameraMode(nextUseOrthographicCamera: boolean) {
    if (useOrthographicCamera === nextUseOrthographicCamera) {
      return;
    }

    captureCurrentView();
    useOrthographicCamera = nextUseOrthographicCamera;
    await tick();
    applySavedView();
  }

  function focusViewport() {
    viewportElement?.focus({ preventScroll: true });
  }

  async function resetCameraView() {
    savedView = null;
    await tick();
    applySavedView();
  }

  function captureViewport(node: HTMLDivElement) {
    viewportElement = node;

    return {
      destroy() {
        if (viewportElement === node) {
          viewportElement = null;
        }
      },
    };
  }

  onMount(() => {
    spaceMouseBridge = new ThreeSpaceMouseBridge({
      scene: {
        appName: 'OpenSimGear Rig Planner',
        cameraUp: SCENE_VIEW.cameraUp,
        constructionPlane: buildPlaneEquation([0, 0, SCENE_VIEW.gridPosition[2]], SCENE_VIEW.cameraUp),
      },
      getViewport: () => viewportElement,
      getControls: () => orbitControlsRef,
      getModelRoot: () => rigRootRef,
      getActiveCamera: () => (useOrthographicCamera ? orthographicCameraRef : perspectiveCameraRef),
    });
    void spaceMouseBridge.connect();
    void tick().then(() => {
      viewportElement?.querySelector('canvas')?.setAttribute('data-testid', 'aluminum-rig-planner-preview-canvas');
      applySavedView();
    });

    return () => {
      spaceMouseBridge?.destroy();
      spaceMouseBridge = null;
    };
  });
</script>

<div
  {@attach captureViewport}
  data-testid="aluminum-rig-planner-preview-viewport"
  class="relative aspect-[3/2] w-full border-zinc-200 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f4f4f5_60%,#e4e4e7_100%)] outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2"
  tabindex="-1"
  role="application"
  aria-label="3D aluminum rig planner viewport"
>
  <ViewportCameraControls
    activeCameraMode={useOrthographicCamera ? 'orthographic' : 'perspective'}
    topOffsetPx={getSceneControlsTopOffsetPx(gizmoSize)}
    onResetView={async () => {
      await resetCameraView();
      focusViewport();
    }}
    onSetCameraMode={async (mode) => {
      await setCameraMode(mode === 'orthographic');
      focusViewport();
    }}
  />

  <Canvas shadows createRenderer={createPlannerRenderer}>
    {#if useOrthographicCamera}
      <T.OrthographicCamera
        args={orthographicArgs}
        makeDefault
        manual
        position={cameraPosition}
        up={SCENE_VIEW.cameraUp}
        zoom={1}
        bind:ref={orthographicCameraRef}
      >
        <OrbitControls
          bind:ref={orbitControlsRef}
          enableDamping
          dampingFactor={SCENE_VIEW.orbitDampingFactor}
          target={controlsTarget}
        >
          <ViewportGizmo size={gizmoSize} placement="top-right" />
        </OrbitControls>
      </T.OrthographicCamera>
    {:else}
      <T.PerspectiveCamera
        makeDefault
        position={cameraPosition}
        up={SCENE_VIEW.cameraUp}
        bind:ref={perspectiveCameraRef}
      >
        <OrbitControls
          bind:ref={orbitControlsRef}
          enableDamping
          dampingFactor={SCENE_VIEW.orbitDampingFactor}
          target={controlsTarget}
        >
          <ViewportGizmo size={gizmoSize} placement="top-right" />
        </OrbitControls>
      </T.PerspectiveCamera>
    {/if}

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

    <SceneGrid plane={SCENE_VIEW.gridPlane} position={SCENE_VIEW.gridPosition} scale={SCENE_VIEW.gridScale} />

    <T.Group rotation={SCENE_VIEW.sceneRotation} bind:ref={rigRootRef}>
      <RigFrame {geometry} {highlightedBeamIds} {measurementOverlay} {profileColor} {showEndCaps} {visibleModules} />
    </T.Group>
  </Canvas>
</div>
