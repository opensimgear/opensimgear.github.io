<svelte:options runes={false} />

<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Grid, OrbitControls } from '@threlte/extras';
  import { T } from '@threlte/core';
  import Joint from './Joint.svelte';
  import Leg from './Leg.svelte';
  import Platform from './Platform.svelte';
  import { Group, Matrix3, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
  import type { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

  import ViewportGizmo from '../shared/ViewportGizmo.svelte';
  import type { CameraProjectionMode } from '../shared/scene-controls';
  import { buildPlaneEquation, syncOrbitCameraView, ThreeSpaceMouseBridge } from '../shared/space-mouse';

  export let baseDiameter = 0.8;
  export let platformDiameter = 0.4;
  export let platformHeight = 0.5;
  export let alphaP = 10;
  export let alphaB = 110;
  export let platformTranslation = { x: 0, y: 0, z: 0 };
  export let platformRotation = { x: 0, y: 0, z: 0 };
  export let centerOfRotationRelative: Vector3;
  export let actuatorMin = 0.35;
  export let actuatorMax = 0.6;
  export let gizmoSize = 128;
  export let viewportElement: HTMLDivElement | null = null;

  type LegStatus = 'ok' | 'over-extended' | 'over-compressed';
  const ORTHOGRAPHIC_ASPECT_RATIO = 3 / 2;
  const PERSPECTIVE_FOV_RADIANS = (50 * Math.PI) / 180;
  const STEWART_CAMERA_UP = [0, 0, 1] as const;
  const STEWART_CONSTRUCTION_PLANE = buildPlaneEquation([0, 0, -0.01], [0, 0, 1]);

  let lastValidTransformedPointsP: Vector3[] = [];
  let lastValidTransformedCor: Vector3 = new Vector3();
  let legStatuses: LegStatus[] = Array(6).fill('ok');
  let perspectiveCameraRef: PerspectiveCamera | null = null;
  let orthographicCameraRef: OrthographicCamera | null = null;
  let orbitControlsRef: ThreeOrbitControls | null = null;
  let modelRootRef: Group | null = null;
  let spaceMouseBridge: ThreeSpaceMouseBridge | null = null;
  let spaceMouseConnectRequested = false;
  let savedView: {
    position: [number, number, number];
    target: [number, number, number];
  } | null = null;
  let useOrthographicCamera = false;

  let cameraX = baseDiameter * 1.2;
  let cameraY = cameraX;
  let cameraZ = platformHeight * 2;
  $: cameraX = baseDiameter * 1.2;
  $: cameraY = cameraX;
  $: cameraZ = platformHeight * 2;
  $: defaultCameraPosition = [cameraX, cameraY, cameraZ] as [number, number, number];
  $: cameraPosition = savedView?.position ?? defaultCameraPosition;

  let initialPointsP: Vector3[] = [];
  let initialPointsB: Vector3[] = [];
  let transformedPointsP: Vector3[] = [];
  let transformedCor: Vector3;
  $: controlsTarget = savedView?.target ?? ([0, 0, platformHeight] as [number, number, number]);
  let orthographicArgs: [number, number, number, number, number, number] = [-1, 1, 1, -1, 0.1, 20];

  $: centerOfRotation = centerOfRotationRelative.clone().add(new Vector3(0, 0, platformHeight));
  $: {
    const top =
      new Vector3(...cameraPosition).distanceTo(new Vector3(...controlsTarget)) *
      Math.tan(PERSPECTIVE_FOV_RADIANS / 2);
    const right = top * ORTHOGRAPHIC_ASPECT_RATIO;

    orthographicArgs = [-right, right, top, -top, 0.1, 20];
  }

  $: {
    const alphaPh = alphaP / 2;
    const alphaBh = alphaB / 2;

    const startingAngle = 270;
    const angles = [startingAngle, (startingAngle + 120) % 360, (startingAngle + 240) % 360];

    const anglesP = angles.flatMap((angle) => [angle - alphaPh, angle + alphaPh]);
    const anglesB = angles.flatMap((angle) => [angle - alphaBh, angle + alphaBh]);

    const rP = platformDiameter / 2;
    const rB = baseDiameter / 2;

    initialPointsB = anglesB.map((angle) => {
      const x = rB * Math.cos((angle * Math.PI) / 180);
      const y = rB * Math.sin((angle * Math.PI) / 180);
      return new Vector3(x, y, 0);
    });

    initialPointsP = anglesP.map((angle) => {
      const x = rP * Math.cos((angle * Math.PI) / 180);
      const y = rP * Math.sin((angle * Math.PI) / 180);
      return new Vector3(x, y, platformHeight);
    });

    lastValidTransformedPointsP = [];
  }

  $: {
    const thetaX = (platformRotation.x * Math.PI) / 180;
    const thetaY = (platformRotation.y * Math.PI) / 180;
    const thetaZ = (platformRotation.z * Math.PI) / 180;
    const dX = platformTranslation.x;
    const dY = platformTranslation.y;
    const dZ = platformTranslation.z;
    const qTheta = new Matrix3(1, 0, 0, 0, Math.cos(thetaX), -Math.sin(thetaX), 0, Math.sin(thetaX), Math.cos(thetaX))
      .multiply(new Matrix3(Math.cos(thetaY), 0, Math.sin(thetaY), 0, 1, 0, -Math.sin(thetaY), 0, Math.cos(thetaY)))
      .multiply(new Matrix3(Math.cos(thetaZ), -Math.sin(thetaZ), 0, Math.sin(thetaZ), Math.cos(thetaZ), 0, 0, 0, 1));
    // three.js does not have matrix3 subtraction...
    // This is equivalent to qThetha - I
    const a = qTheta.toArray();
    a[0] -= 1;
    a[4] -= 1;
    a[8] -= 1;
    const qThetaX = new Vector3(a[0], a[1], a[2]);
    const qThetaY = new Vector3(a[3], a[4], a[5]);
    const qThetaZ = new Vector3(a[6], a[7], a[8]);

    const candidatePointsP = initialPointsP.map((point) => {
      const pointTranslated = point.clone().add(new Vector3(dX, dY, dZ));
      const dM = point.clone().sub(centerOfRotation);
      const dTheta = new Vector3(dM.dot(qThetaX), dM.dot(qThetaY), dM.dot(qThetaZ));
      return pointTranslated.add(dTheta);
    });
    const candidateCor = centerOfRotation.clone().add(new Vector3(dX, dY, dZ));

    const candidateStatuses: LegStatus[] = initialPointsB.map((b, i) => {
      const l = b.distanceTo(candidatePointsP[i]);
      if (l > actuatorMax) return 'over-extended';
      if (l < actuatorMin) return 'over-compressed';
      return 'ok';
    });

    const valid =
      lastValidTransformedPointsP.length === 0 ||
      candidateStatuses.every((s) => s === 'ok');

    if (valid) {
      transformedPointsP = candidatePointsP;
      transformedCor = candidateCor;
      lastValidTransformedPointsP = candidatePointsP;
      lastValidTransformedCor = candidateCor;
    } else {
      transformedPointsP = lastValidTransformedPointsP;
      transformedCor = lastValidTransformedCor;
    }

    legStatuses = candidateStatuses;
  }

  function getActiveCamera() {
    return useOrthographicCamera ? orthographicCameraRef : perspectiveCameraRef;
  }

  function captureCurrentView() {
    const activeCamera = getActiveCamera();

    if (!activeCamera || !orbitControlsRef) {
      return;
    }

    savedView = {
      position: activeCamera.position.toArray() as [number, number, number],
      target: orbitControlsRef.target.toArray() as [number, number, number],
    };
  }

  function applySavedView() {
    const activeCamera = getActiveCamera();

    if (!activeCamera || !orbitControlsRef) {
      return;
    }

    syncOrbitCameraView({
      camera: activeCamera,
      controls: orbitControlsRef,
      cameraUp: [...STEWART_CAMERA_UP],
      position: cameraPosition,
      target: controlsTarget,
    });
  }

  async function setCameraModeInternal(nextUseOrthographicCamera: boolean) {
    if (useOrthographicCamera === nextUseOrthographicCamera) {
      return;
    }

    captureCurrentView();
    useOrthographicCamera = nextUseOrthographicCamera;
    await tick();
    applySavedView();
  }

  export async function setCameraMode(mode: CameraProjectionMode) {
    await setCameraModeInternal(mode === 'orthographic');
  }

  export async function resetCameraView() {
    savedView = null;
    await tick();
    applySavedView();
  }

  onMount(() => {
    spaceMouseBridge = new ThreeSpaceMouseBridge({
      scene: {
        appName: 'OpenSimGear Stewart Platform',
        cameraUp: [...STEWART_CAMERA_UP],
        constructionPlane: STEWART_CONSTRUCTION_PLANE,
      },
      getViewport: () => viewportElement,
      getControls: () => orbitControlsRef,
      getModelRoot: () => modelRootRef,
      getActiveCamera,
    });

    void tick().then(() => {
      if (!orbitControlsRef) {
        return;
      }

      applySavedView();
    });

    return () => {
      spaceMouseBridge?.destroy();
      spaceMouseBridge = null;
    };
  });

  $: if (!spaceMouseConnectRequested && spaceMouseBridge && viewportElement) {
    spaceMouseConnectRequested = true;
    void spaceMouseBridge.connect();
  }
</script>

{#if useOrthographicCamera}
  <T.OrthographicCamera
    bind:ref={orthographicCameraRef}
    args={orthographicArgs}
    makeDefault
    manual
    position={cameraPosition}
    up={STEWART_CAMERA_UP}
    zoom={1}
  >
    <OrbitControls bind:ref={orbitControlsRef} enableDamping target={controlsTarget}>
      <ViewportGizmo size={gizmoSize} placement="top-right" />
    </OrbitControls>
  </T.OrthographicCamera>
{:else}
  <T.PerspectiveCamera bind:ref={perspectiveCameraRef} makeDefault position={cameraPosition} up={STEWART_CAMERA_UP}>
    <OrbitControls bind:ref={orbitControlsRef} enableDamping target={controlsTarget}>
      <ViewportGizmo size={gizmoSize} placement="top-right" />
    </OrbitControls>
  </T.PerspectiveCamera>
{/if}

<T.DirectionalLight position={[3, 10, 7]} intensity={Math.PI} />
<T.AmbientLight intensity={2} />

<Grid
  plane="xy"
  scale={1}
  cellColor="#66ccff"
  cellSize={0.1}
  cellThickness={0.5}
  sectionColor="#66ccff"
  sectionSize={1}
  sectionThickness={0.7}
  position={[0, 0, -0.01]}
/>

<T.Group bind:ref={modelRootRef}>
  {#each transformedPointsP as point, i (i)}
    <Joint position={point} />
  {/each}

  {#each initialPointsB as point, i (i)}
    <Joint position={point} color="blue" />
  {/each}

  <Joint position={transformedCor} color="purple" />

  <Platform points={transformedPointsP} color="red" />
  <Platform points={initialPointsB} color="blue" />

  {#each initialPointsB as point, i (i)}
    <Leg basePoint={point} platformPoint={transformedPointsP[i]} status={legStatuses[i]} {actuatorMin} />
  {/each}
</T.Group>
