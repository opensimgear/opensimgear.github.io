<script lang="ts">
  import { Grid, OrbitControls } from '@threlte/extras';
  import { T } from '@threlte/core';
  import { Matrix3, Vector3 } from 'three';
  import Joint from './Joint.svelte';
  import Leg from './Leg.svelte';
  import Platform from './Platform.svelte';

  type LegStatus = 'ok' | 'over-extended' | 'over-compressed';

  let {
    baseDiameter = 0.8,
    platformDiameter = 0.4,
    platformHeight = 0.5,
    alphaP = 10,
    alphaB = 110,
    platformTranslation = { x: 0, y: 0, z: 0 },
    platformRotation = { x: 0, y: 0, z: 0 },
    centerOfRotationRelative,
    actuatorMin = 0.35,
    actuatorMax = 0.6,
  }: {
    baseDiameter?: number;
    platformDiameter?: number;
    platformHeight?: number;
    alphaP?: number;
    alphaB?: number;
    platformTranslation?: { x: number; y: number; z: number };
    platformRotation?: { x: number; y: number; z: number };
    centerOfRotationRelative: Vector3;
    actuatorMin?: number;
    actuatorMax?: number;
  } = $props();

  let lastValidTransformedPointsP = $state<Vector3[]>([]);
  let lastValidTransformedCor = $state(new Vector3());
  let lastPointSets = $state<{ basePoints: Vector3[]; platformPoints: Vector3[] } | null>(null);
  let legStatuses = $state<LegStatus[]>(Array(6).fill('ok'));
  let transformedPointsP = $state<Vector3[]>([]);
  let transformedCor = $state(new Vector3());

  const cameraX = $derived(baseDiameter * 1.2);
  const cameraY = $derived(baseDiameter * 1.2);
  const cameraZ = $derived(platformHeight * 2);

  const centerOfRotation = $derived(centerOfRotationRelative.clone().add(new Vector3(0, 0, platformHeight)));

  const pointSets = $derived.by(() => {
    const alphaPh = alphaP / 2;
    const alphaBh = alphaB / 2;
    const startingAngle = 270;
    const angles = [startingAngle, (startingAngle + 120) % 360, (startingAngle + 240) % 360];
    const anglesP = angles.flatMap((angle) => [angle - alphaPh, angle + alphaPh]);
    const anglesB = angles.flatMap((angle) => [angle - alphaBh, angle + alphaBh]);
    const rP = platformDiameter / 2;
    const rB = baseDiameter / 2;

    const basePoints = anglesB.map((angle) => {
      const x = rB * Math.cos((angle * Math.PI) / 180);
      const y = rB * Math.sin((angle * Math.PI) / 180);
      return new Vector3(x, y, 0);
    });

    const platformPoints = anglesP.map((angle) => {
      const x = rP * Math.cos((angle * Math.PI) / 180);
      const y = rP * Math.sin((angle * Math.PI) / 180);
      return new Vector3(x, y, platformHeight);
    });

    return { basePoints, platformPoints };
  });

  $effect(() => {
    const thetaX = (platformRotation.x * Math.PI) / 180;
    const thetaY = (platformRotation.y * Math.PI) / 180;
    const thetaZ = (platformRotation.z * Math.PI) / 180;
    const dX = platformTranslation.x;
    const dY = platformTranslation.y;
    const dZ = platformTranslation.z;
    const { basePoints, platformPoints } = pointSets;
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

    const candidatePointsP = platformPoints.map((point) => {
      const pointTranslated = point.clone().add(new Vector3(dX, dY, dZ));
      const dM = point.clone().sub(centerOfRotation);
      const dTheta = new Vector3(dM.dot(qThetaX), dM.dot(qThetaY), dM.dot(qThetaZ));
      return pointTranslated.add(dTheta);
    });
    const candidateCor = centerOfRotation.clone().add(new Vector3(dX, dY, dZ));

    const candidateStatuses: LegStatus[] = basePoints.map((b, i) => {
      const l = b.distanceTo(candidatePointsP[i]);
      if (l > actuatorMax) return 'over-extended';
      if (l < actuatorMin) return 'over-compressed';
      return 'ok';
    });

    const pointSetsChanged = lastPointSets !== pointSets;
    const valid = pointSetsChanged || lastValidTransformedPointsP.length === 0 || candidateStatuses.every((s) => s === 'ok');

    if (valid) {
      transformedPointsP = candidatePointsP;
      transformedCor = candidateCor;
      lastValidTransformedPointsP = candidatePointsP;
      lastValidTransformedCor = candidateCor;
      lastPointSets = pointSets;
    } else {
      transformedPointsP = lastValidTransformedPointsP;
      transformedCor = lastValidTransformedCor;
    }

    legStatuses = candidateStatuses;
  });
</script>

<T.PerspectiveCamera
  makeDefault
  position.x={cameraX}
  position.y={cameraY}
  position.z={cameraZ}
  up={[0, 0, 1]}
  on:create={({ ref }) => {
    ref.lookAt(0, 0, platformHeight);
  }}
>
  <OrbitControls />
</T.PerspectiveCamera>

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

{#each transformedPointsP as point}
  <Joint position={point} />
{/each}

{#each pointSets.basePoints as point}
  <Joint position={point} color="blue" />
{/each}

<Joint position={transformedCor} color="purple" />

<Platform points={transformedPointsP} color="red" />
<Platform points={pointSets.basePoints} color="blue" />

{#each pointSets.basePoints as point, i}
  <Leg basePoint={point} platformPoint={transformedPointsP[i]} status={legStatuses[i]} {actuatorMin} />
{/each}
