<script lang="ts">
  import { Canvas } from '@threlte/core';
  import { OrbitControls } from '@threlte/extras';
  import { T } from '@threlte/core';
  import { onMount, tick } from 'svelte';
  import { Group, OrthographicCamera, PerspectiveCamera, Vector3, WebGLRenderer } from 'three';
  import type { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

  import { PI_INTENSITY, SCENE_VIEW } from '../constants/scene';
  import { createPlannerFovOverlay, type PlannerFovOverlay } from '../posture/fov-overlay';
  import ViewportCameraControls from '../../shared/ViewportCameraControls.svelte';
  import ViewportGizmo from '../../shared/ViewportGizmo.svelte';
  import SceneGrid from '../../shared/SceneGrid.svelte';
  import { buildPlaneEquation, syncOrbitCameraView, ThreeSpaceMouseBridge } from '../../shared/space-mouse';
  import { getSceneControlsTopOffsetPx } from '../../shared/scene-controls';
  import RigFrame from './RigFrame.svelte';
  import type { PlannerGeometry } from './geometry';
  import type { HumanRigHoverTooltip, RiggedHumanModel } from '../posture/human-model-rig';
  import type { PlannerMeasurementOverlay } from './measurement-overlay';
  import type { PlannerPostureReport } from '../posture/posture-report';
  import type { PlannerPosturePreset, PlannerPostureSettings, PlannerVisibleModules } from '../types';

  type Props = {
    geometry: PlannerGeometry;
    highlightedBeamIds: string[];
    humanModel: RiggedHumanModel;
    isNarrowViewport?: boolean;
    measurementOverlay?: PlannerMeasurementOverlay | null;
    profileColor: string;
    postureReport: PlannerPostureReport;
    postureSettings: PlannerPostureSettings<PlannerPosturePreset>;
    showEndCaps: boolean;
    visibleModules: PlannerVisibleModules;
    onOptimizePosture: () => void;
  };

  const {
    geometry,
    highlightedBeamIds,
    humanModel,
    isNarrowViewport = false,
    measurementOverlay = null,
    profileColor,
    postureReport,
    postureSettings,
    showEndCaps,
    visibleModules,
    onOptimizePosture,
  }: Props = $props();
  let posturePanelOpen = $state(false);
  const ORTHOGRAPHIC_ASPECT_RATIO = 3 / 2;
  const PERSPECTIVE_FOV_RADIANS = (50 * Math.PI) / 180;
  const TOP_FOV_CAMERA_UP: [number, number, number] = [0, 1, 0];
  const TOP_FOV_DIRECTION = new Vector3(0, 0, -1);
  const TOP_FOV_VIEW_PADDING = 1.35;
  const TOP_FOV_MIN_VIEW_HEIGHT = 1.4;

  const defaultCameraPosition = $derived<[number, number, number]>(
    isNarrowViewport ? SCENE_VIEW.narrowCameraPosition : SCENE_VIEW.wideCameraPosition
  );
  let savedView = $state<{
    cameraUp?: [number, number, number];
    position: [number, number, number];
    target: [number, number, number];
  } | null>(null);
  let fovOverlayVisible = $state(false);
  let perspectiveCameraRef = $state<PerspectiveCamera | null>(null);
  let orthographicCameraRef = $state<OrthographicCamera | null>(null);
  let orbitControlsRef = $state<ThreeOrbitControls | null>(null);
  let rigRootRef = $state<Group | null>(null);
  let viewportElement = $state<HTMLDivElement | null>(null);
  let tooltipElement = $state<HTMLDivElement | null>(null);
  let humanRigTooltip = $state<HumanRigHoverTooltip | null>(null);
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
  const cameraUp = $derived<[number, number, number]>(savedView?.cameraUp ?? SCENE_VIEW.cameraUp);
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
  const fovOverlay = $derived.by<PlannerFovOverlay | null>(() =>
    visibleModules.monitor
      ? createPlannerFovOverlay(geometry.input, postureSettings, postureReport, humanModel.postureModelMetrics)
      : null
  );
  const canShowTopFovOverlay = $derived(Boolean(visibleModules.monitor && fovOverlay));
  const activeFovOverlay = $derived(canShowTopFovOverlay && fovOverlayVisible ? fovOverlay : null);
  const humanRigTooltipStyle = $derived.by(() => {
    if (!humanRigTooltip || !tooltipElement || !viewportElement) {
      return 'visibility: hidden;';
    }

    const offset = 6;
    const viewportRect = viewportElement.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();
    const maxX = Math.max(offset, viewportRect.width - tooltipRect.width - offset);
    const maxY = Math.max(offset, viewportRect.height - tooltipRect.height - offset);
    const nextX = Math.min(Math.max(offset, humanRigTooltip.screenPosition[0] + offset), maxX);
    const nextY = Math.min(Math.max(offset, humanRigTooltip.screenPosition[1] + offset), maxY);

    return `left: ${nextX}px; top: ${nextY}px;`;
  });
  const postureMetricsWithIssues = $derived(postureReport.metrics.filter((metric) => metric.status !== 'ok').length);
  const postureMetricsWithWarnings = $derived(
    postureReport.metrics.filter((metric) => metric.status === 'warn').length
  );
  const postureMetricsWithErrors = $derived(postureReport.metrics.filter((metric) => metric.status === 'bad').length);
  const posturePanelLabel = $derived(
    `Posture metrics: ${postureMetricsWithWarnings} warning${postureMetricsWithWarnings === 1 ? '' : 's'}, ${postureMetricsWithErrors} error${postureMetricsWithErrors === 1 ? '' : 's'}`
  );

  function formatPostureMetricValue(metric: PlannerPostureReport['metrics'][number]) {
    const value = metric.unit === 'mm' ? metric.valueMm : metric.valueDeg;

    return `${(value ?? 0).toFixed(metric.unit === 'mm' ? 0 : 1)} ${metric.unit}`;
  }

  function formatPostureMetricRange(metric: PlannerPostureReport['metrics'][number]) {
    return `${metric.range.min}-${metric.range.max} ${metric.unit}`;
  }

  function captureCurrentView() {
    const activeCamera = useOrthographicCamera ? orthographicCameraRef : perspectiveCameraRef;

    if (!activeCamera || !orbitControlsRef) {
      return;
    }

    savedView = {
      cameraUp: activeCamera.up.toArray() as [number, number, number],
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
      cameraUp,
      position: cameraPosition,
      target: controlsTarget,
    });
  }

  function isTopFovCameraUp() {
    const activeCamera = useOrthographicCamera ? orthographicCameraRef : perspectiveCameraRef;

    if (!activeCamera) {
      return false;
    }

    return activeCamera.up.angleTo(new Vector3(...TOP_FOV_CAMERA_UP)) < 0.001;
  }

  async function setCameraMode(nextUseOrthographicCamera: boolean) {
    const shouldResetFovView = useOrthographicCamera && !nextUseOrthographicCamera && isTopFovCameraUp();
    fovOverlayVisible = false;

    if (useOrthographicCamera === nextUseOrthographicCamera) {
      return;
    }

    if (shouldResetFovView) {
      savedView = null;
    } else {
      captureCurrentView();
    }

    useOrthographicCamera = nextUseOrthographicCamera;
    await tick();
    applySavedView();
  }

  function focusViewport() {
    viewportElement?.focus({ preventScroll: true });
  }

  async function resetCameraView() {
    fovOverlayVisible = false;
    useOrthographicCamera = false;
    savedView = null;
    await tick();
    applySavedView();
  }

  function getTopFovCameraView(): {
    position: [number, number, number];
    target: [number, number, number];
  } | null {
    if (!fovOverlay) {
      return null;
    }

    const centerX = (fovOverlay.bounds.minX + fovOverlay.bounds.maxX) / 2;
    const centerY = (fovOverlay.bounds.minY + fovOverlay.bounds.maxY) / 2;
    const width = Math.max(0.1, fovOverlay.bounds.maxX - fovOverlay.bounds.minX);
    const height = Math.max(0.1, fovOverlay.bounds.maxY - fovOverlay.bounds.minY);
    const viewHeight =
      Math.max(TOP_FOV_MIN_VIEW_HEIGHT, height, width / ORTHOGRAPHIC_ASPECT_RATIO) * TOP_FOV_VIEW_PADDING;
    const cameraDistance = viewHeight / (2 * Math.tan(PERSPECTIVE_FOV_RADIANS / 2));
    const target: [number, number, number] = [centerX, centerY, SCENE_VIEW.controlsTarget[2]];

    return {
      position: [centerX, centerY, target[2] + cameraDistance],
      target,
    };
  }

  function isTopFovCameraOrientation() {
    const activeCamera = useOrthographicCamera ? orthographicCameraRef : perspectiveCameraRef;

    if (!activeCamera) {
      return false;
    }

    const direction = new Vector3();
    activeCamera.getWorldDirection(direction);

    return direction.angleTo(TOP_FOV_DIRECTION) < 0.035;
  }

  function hideFovOverlayIfOrientationChanged() {
    if (!fovOverlayVisible || isTopFovCameraOrientation()) {
      return;
    }

    fovOverlayVisible = false;
  }

  async function showTopFovOverlay() {
    const nextView = getTopFovCameraView();

    if (!nextView) {
      fovOverlayVisible = false;
      return;
    }

    useOrthographicCamera = true;
    savedView = {
      cameraUp: TOP_FOV_CAMERA_UP,
      position: nextView.position,
      target: nextView.target,
    };
    fovOverlayVisible = true;
    await tick();
    applySavedView();
  }

  function captureViewport(node: HTMLDivElement) {
    viewportElement = node;

    return () => {
      if (viewportElement === node) {
        viewportElement = null;
      }
    };
  }

  function captureTooltip(node: HTMLDivElement) {
    tooltipElement = node;

    return () => {
      if (tooltipElement === node) {
        tooltipElement = null;
      }
    };
  }

  function togglePosturePanel() {
    posturePanelOpen = !posturePanelOpen;
  }

  function handleViewportClick(event: MouseEvent) {
    if (!posturePanelOpen || !isNarrowViewport) {
      return;
    }

    const target = event.target as HTMLElement;

    if (target.closest('.posture-debug-panel')) {
      return;
    }

    posturePanelOpen = false;
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
  onclick={handleViewportClick}
>
  <ViewportCameraControls
    activeCameraMode={useOrthographicCamera ? 'orthographic' : 'perspective'}
    topFovOverlayActive={canShowTopFovOverlay && fovOverlayVisible}
    topOffsetPx={getSceneControlsTopOffsetPx(gizmoSize)}
    onResetView={async () => {
      await resetCameraView();
      focusViewport();
    }}
    onShowTopFovOverlay={canShowTopFovOverlay
      ? async () => {
          await showTopFovOverlay();
          focusViewport();
        }
      : null}
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
        up={cameraUp}
        zoom={1}
        bind:ref={orthographicCameraRef}
      >
        <OrbitControls
          bind:ref={orbitControlsRef}
          enableDamping
          dampingFactor={SCENE_VIEW.orbitDampingFactor}
          onchange={hideFovOverlayIfOrientationChanged}
          target={controlsTarget}
        >
          <ViewportGizmo size={gizmoSize} placement="top-right" />
        </OrbitControls>
      </T.OrthographicCamera>
    {:else}
      <T.PerspectiveCamera makeDefault position={cameraPosition} up={cameraUp} bind:ref={perspectiveCameraRef}>
        <OrbitControls
          bind:ref={orbitControlsRef}
          enableDamping
          dampingFactor={SCENE_VIEW.orbitDampingFactor}
          onchange={hideFovOverlayIfOrientationChanged}
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

    <T.Group bind:ref={rigRootRef}>
      <RigFrame
        {geometry}
        {highlightedBeamIds}
        {humanModel}
        {measurementOverlay}
        fovOverlay={activeFovOverlay}
        onHumanRigTooltipChange={(tooltip) => {
          humanRigTooltip = tooltip;
        }}
        {profileColor}
        {postureReport}
        {postureSettings}
        {showEndCaps}
        {visibleModules}
      />
    </T.Group>
  </Canvas>

  {#if (postureSettings.showModel || postureSettings.showSkeleton) && humanRigTooltip}
    <div {@attach captureTooltip} class="rig-tooltip" role="tooltip" style={humanRigTooltipStyle}>
      <div class="rig-tooltip__title">{humanRigTooltip.title}</div>
      {#each humanRigTooltip.rows as row (row.label)}
        <div class="rig-tooltip__row">
          <span>{row.label}</span>
          <strong>{row.value}</strong>
        </div>
      {/each}
    </div>
  {/if}

  <div class="posture-debug-panel" class:is-open={posturePanelOpen} aria-label="Posture metrics">
    <div class="posture-debug-panel__surface">
      <button
        class="posture-debug-panel__trigger"
        type="button"
        aria-label={posturePanelLabel}
        aria-expanded={posturePanelOpen}
        onclick={togglePosturePanel}
      >
        <svg class="posture-debug-panel__driver-icon" viewBox="0 0 42 42" aria-hidden="true">
          <circle class="posture-debug-panel__driver-head" cx="12.5" cy="7.2" r="3.8" />
          <path class="posture-debug-panel__driver-bone" d="M12.5 10.8 12.5 14" />
          <path class="posture-debug-panel__driver-bone" d="M12.5 14 18.7 30" />
          <path class="posture-debug-panel__driver-bone" d="M18.7 30 29.2 26.6" />
          <path class="posture-debug-panel__driver-bone" d="M29.2 26.6 36 33.5" />
          <path class="posture-debug-panel__driver-bone" d="M36 33.5 40 34" />
          <path class="posture-debug-panel__driver-bone" d="M15.2 17.6 22.2 22.6" />
          <path class="posture-debug-panel__driver-bone" d="M22.2 22.6 32 18.4" />
        </svg>
      </button>
      {#if postureMetricsWithErrors > 0}
        <span class="posture-debug-panel__badge" data-status="bad" aria-hidden="true">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle class="posture-debug-panel__badge-shape" cx="12" cy="12" r="9" />
            <path
              class="posture-debug-panel__badge-mark"
              d="m8.5 9.9 2.1 2.1-2.1 2.1 1.4 1.4 2.1-2.1 2.1 2.1 1.4-1.4-2.1-2.1 2.1-2.1-1.4-1.4-2.1 2.1-2.1-2.1-1.4 1.4Z"
            />
          </svg>
        </span>
      {/if}
      {#if postureMetricsWithWarnings > 0}
        <span
          class="posture-debug-panel__badge"
          class:posture-debug-panel__badge--offset={postureMetricsWithErrors > 0}
          data-status="warn"
          aria-hidden="true"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M8 1.7c.7 0 1.2.3 1.5.9l5.1 8.9c.3.6.3 1.3 0 1.9s-.9.9-1.6.9H3c-.7 0-1.3-.3-1.6-.9s-.3-1.3 0-1.9l5.1-8.9c.3-.6.8-.9 1.5-.9Z"
              class="posture-debug-panel__badge-shape"
            />
            <path
              d="M7.2 5.3h1.6l-.2 4.5H7.4l-.2-4.5Zm.1 6h1.4v1.4H7.3v-1.4Z"
              class="posture-debug-panel__badge-mark"
            />
          </svg>
        </span>
      {/if}

      <div class="posture-debug-panel__content">
        <div class="posture-debug-panel__header">
          <span>Posture</span>
          <strong>{postureMetricsWithIssues} issue{postureMetricsWithIssues === 1 ? '' : 's'}</strong>
        </div>
        <div class="posture-debug-panel__metrics">
          {#each postureReport.metrics as metric (metric.key)}
            <div class="posture-debug-panel__metric" data-status={metric.status}>
              <span class="posture-debug-panel__label">{metric.label}</span>
              <span class="posture-debug-panel__value">{formatPostureMetricValue(metric)}</span>
              <span class="posture-debug-panel__range">{formatPostureMetricRange(metric)}</span>
              <span class="posture-debug-panel__status">{metric.status}</span>
            </div>
          {/each}
        </div>
        {#if postureReport.hints.length > 0}
          <div class="posture-debug-panel__hints">
            {#each postureReport.hints as hint (hint)}
              <p>{hint}</p>
            {/each}
          </div>
        {/if}
      </div>
      {#if postureSettings.preset === 'custom'}
        <button class="posture-debug-panel__optimize" type="button" onclick={onOptimizePosture}>Optimize</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .rig-tooltip {
    min-width: 168px;
    max-width: 260px;
    border: 1px solid rgb(39 39 42 / 0.12);
    border-radius: 6px;
    background: rgb(24 24 27 / 0.92);
    box-shadow: 0 14px 30px rgb(24 24 27 / 0.18);
    color: white;
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      sans-serif;
    font-size: 11px;
    line-height: 1.35;
    padding: 8px 10px;
    pointer-events: none;
    position: absolute;
    white-space: nowrap;
    z-index: 20;
  }

  .rig-tooltip__title {
    font-weight: 700;
    margin-bottom: 5px;
  }

  .rig-tooltip__row {
    display: flex;
    gap: 12px;
    justify-content: space-between;
  }

  .rig-tooltip__row span {
    color: rgb(212 212 216);
  }

  .rig-tooltip__row strong {
    font-weight: 600;
    text-align: right;
  }

  .posture-debug-panel {
    bottom: 6px;
    color: white;
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      sans-serif;
    font-size: 10px;
    line-height: 1.25;
    pointer-events: auto;
    position: absolute;
    right: 6px;
    height: 42px;
    width: 42px;
    z-index: 10;
  }

  .posture-debug-panel__surface {
    background: rgb(24 24 27 / 0.9);
    border: 1px solid rgb(255 255 255 / 0.14);
    border-radius: 6px;
    box-shadow: 0 14px 30px rgb(24 24 27 / 0.18);
    bottom: 0;
    height: auto;
    max-height: 42px;
    min-height: 42px;
    overflow: visible;
    position: absolute;
    right: 0;
    transform-origin: bottom right;
    transition:
      max-height 220ms cubic-bezier(0.16, 1, 0.3, 1),
      width 220ms cubic-bezier(0.16, 1, 0.3, 1);
    width: 42px;
  }

  .posture-debug-panel:hover .posture-debug-panel__surface,
  .posture-debug-panel:focus-within .posture-debug-panel__surface,
  .posture-debug-panel.is-open .posture-debug-panel__surface {
    max-height: min(86vh, 560px);
    width: min(420px, calc(100vw - 24px));
  }

  .posture-debug-panel__trigger {
    align-items: center;
    background: transparent;
    border: 0;
    color: white;
    cursor: pointer;
    display: grid;
    font: inherit;
    height: 42px;
    justify-items: center;
    padding: 0;
    position: absolute;
    right: 0;
    top: 0;
    transition: opacity 160ms cubic-bezier(0.16, 1, 0.3, 1);
    width: 42px;
    z-index: 2;
  }

  .posture-debug-panel:hover .posture-debug-panel__trigger,
  .posture-debug-panel:focus-within .posture-debug-panel__trigger,
  .posture-debug-panel.is-open .posture-debug-panel__trigger {
    opacity: 0;
    pointer-events: none;
  }

  .posture-debug-panel__driver-icon {
    fill: none;
    height: 30px;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 3;
    width: 30px;
  }

  .posture-debug-panel__driver-bone {
    stroke-width: 3.2;
  }

  .posture-debug-panel__driver-head {
    fill: currentColor;
    stroke: none;
  }

  .posture-debug-panel__badge {
    align-items: center;
    box-sizing: border-box;
    display: grid;
    height: 28px;
    justify-items: center;
    position: absolute;
    top: -20px;
    right: -8px;
    width: 28px;
    z-index: 4;
  }

  .posture-debug-panel__badge[data-status='bad'] {
    color: rgb(248 113 113);
  }

  .posture-debug-panel__badge[data-status='warn'] {
    color: rgb(250 204 21);
  }

  .posture-debug-panel__badge--offset[data-status='warn'] {
    right: 22px;
    top: -20px;
  }

  .posture-debug-panel__badge svg {
    height: 28px;
    inset: 0;
    position: absolute;
    width: 28px;
  }

  .posture-debug-panel__badge-shape {
    fill: currentColor;
  }

  .posture-debug-panel__badge-mark {
    fill: black;
  }

  .posture-debug-panel__content {
    opacity: 0;
    overflow: visible;
    padding: 22px 10px 46px;
    pointer-events: none;
    position: relative;
    transform: scale(0.98);
    transform-origin: bottom right;
    transition:
      opacity 180ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 1;
  }

  .posture-debug-panel:hover .posture-debug-panel__content,
  .posture-debug-panel:focus-within .posture-debug-panel__content,
  .posture-debug-panel.is-open .posture-debug-panel__content {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  .posture-debug-panel__header,
  .posture-debug-panel__metric {
    align-items: center;
    display: grid;
    gap: 6px;
  }

  .posture-debug-panel__header {
    grid-template-columns: minmax(0, 1fr) auto;
    margin-bottom: 5px;
  }

  .posture-debug-panel__header span {
    font-weight: 700;
  }

  .posture-debug-panel__header strong {
    color: rgb(212 212 216);
    font-weight: 600;
  }

  .posture-debug-panel__optimize {
    background: rgb(255 255 255 / 0.1);
    border: 1px solid rgb(255 255 255 / 0.18);
    border-radius: 4px;
    color: white;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    line-height: 1;
    padding: 5px 7px;
    opacity: 0;
    pointer-events: none;
    position: absolute;
    right: 8px;
    bottom: 8px;
    transform: translateY(4px);
    transition:
      background 160ms cubic-bezier(0.16, 1, 0.3, 1),
      opacity 180ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 3;
  }

  .posture-debug-panel:hover .posture-debug-panel__optimize,
  .posture-debug-panel:focus-within .posture-debug-panel__optimize,
  .posture-debug-panel.is-open .posture-debug-panel__optimize {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  .posture-debug-panel__optimize:hover,
  .posture-debug-panel__optimize:focus-visible {
    background: rgb(255 255 255 / 0.18);
  }

  .posture-debug-panel__metrics {
    display: grid;
    gap: 3px;
  }

  .posture-debug-panel__metric {
    grid-template-columns: minmax(7rem, 1fr) 4.5rem 5.5rem 2.2rem;
  }

  .posture-debug-panel__label {
    color: rgb(244 244 245);
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .posture-debug-panel__value,
  .posture-debug-panel__range,
  .posture-debug-panel__status {
    color: rgb(212 212 216);
    min-width: 0;
    overflow-wrap: anywhere;
    text-align: right;
  }

  .posture-debug-panel__metric[data-status='ok'] .posture-debug-panel__status {
    color: rgb(134 239 172);
  }

  .posture-debug-panel__metric[data-status='warn'] .posture-debug-panel__status {
    color: rgb(253 224 71);
  }

  .posture-debug-panel__metric[data-status='bad'] .posture-debug-panel__status {
    color: rgb(252 165 165);
  }

  .posture-debug-panel__hints {
    border-top: 1px solid rgb(255 255 255 / 0.12);
    color: rgb(212 212 216);
    display: grid;
    gap: 3px;
    margin-top: 6px;
    padding-top: 5px;
  }

  .posture-debug-panel__hints p {
    margin: 0;
    overflow-wrap: anywhere;
  }

  @media (max-width: 1023px) {
    .posture-debug-panel__metric {
      grid-template-columns: minmax(0, 1fr) auto auto auto;
      font-size: 9px;
    }

    .posture-debug-panel__content {
      padding: 14px 8px 40px;
    }

    .posture-debug-panel__header {
      margin-bottom: 4px;
    }
  }

  @media (max-width: 480px) {
    .posture-debug-panel__metric {
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 4px;
    }

    .posture-debug-panel__range {
      display: none;
    }

    .posture-debug-panel:hover .posture-debug-panel__surface,
    .posture-debug-panel:focus-within .posture-debug-panel__surface,
    .posture-debug-panel.is-open .posture-debug-panel__surface {
      width: min(280px, calc(100vw - 24px));
    }
  }
</style>
