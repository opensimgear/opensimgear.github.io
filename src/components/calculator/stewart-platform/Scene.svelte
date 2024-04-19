<script lang="ts">
  import { Grid, OrbitControls } from '@threlte/extras';
  import { T } from '@threlte/core';
  import Joint from './Joint.svelte';
  import Leg from './Leg.svelte';
  import Platform from './Platform.svelte';
  import { Matrix3, Vector3 } from 'three';

  export let baseDiameter = 0.8;
  export let platformDiameter = 0.4;
  export let platformHeight = 0.5;
  export let alphaP = 10;
  export let alphaB = 110;
  export let centerOfRotationRelative: Vector3;
  export let dX = 0;
  export let dY = 0;
  export let dZ = 0;
  export let thetaX = 0;
  export let thetaY = 0;
  export let thetaZ = 0;

  let cameraX = baseDiameter * 1.2;

  let initialPointsP: Vector3[] = [];
  let initialPointsB: Vector3[] = [];
  let transformedPointsP: Vector3[] = [];
  let transformedCor: Vector3;

  $: centerOfRotation = centerOfRotationRelative.clone().add(new Vector3(0, 0, platformHeight));

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
  }

  $: {
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

    transformedPointsP = initialPointsP.map((point) => {
      const pointTranslated = point.clone().add(new Vector3(dX, dY, dZ));
      const dM = point.clone().sub(centerOfRotation);
      const dTheta = new Vector3(dM.dot(qThetaX), dM.dot(qThetaY), dM.dot(qThetaZ));
      return pointTranslated.add(dTheta);
    });

    transformedCor = centerOfRotation.clone().add(new Vector3(dX, dY, dZ));
  }
</script>

<T.PerspectiveCamera
  makeDefault
  position={[cameraX, cameraX, platformHeight * 2]}
  up={[0, 0, 1]}
  on:create={({ ref }) => {
    ref.lookAt(0, 0, platformHeight);
  }}
>
  <OrbitControls />
</T.PerspectiveCamera>

<T.DirectionalLight position={[3, 10, 7]} intensity={Math.PI} />
<T.AmbientLight intensity={2} />

<!--<Grid plane="xy" scale={0.1} type="polar" />-->

{#each transformedPointsP as point}
  <Joint position={point} />
{/each}

{#each initialPointsB as point}
  <Joint position={point} color="blue" />
{/each}

<Joint position={transformedCor} color="purple" />

<Platform points={transformedPointsP} color="red" />
<Platform points={initialPointsB} color="blue" />

{#each initialPointsB as point, i}
  <Leg basePoint={point} platformPoint={transformedPointsP[i]} />
{/each}
