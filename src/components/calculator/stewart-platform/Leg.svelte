<script lang="ts">
  import { T } from '@threlte/core';
  import { Euler, Quaternion, Vector3, type EulerOrder } from 'three';

  export let basePoint = new Vector3(0, 0, 0);
  export let platformPoint = new Vector3(0, 0, 0);
  export let status: 'ok' | 'over-extended' | 'over-compressed' = 'ok';
  export let actuatorMin = 0.35;

  let rotation: [x: number, y: number, z: number, order: EulerOrder] = [0, 0, 0, 'XYZ'];
  let positionBase: [number, number, number] = [0, 0, 0];
  let positionPiston: [number, number, number] = [0, 0, 0];

  $: length = basePoint.distanceTo(platformPoint) * 0.95;
  $: rodColor = status === 'over-extended' ? 'red' : status === 'over-compressed' ? 'orange' : 'grey';
  $: {
    const direction = new Vector3().subVectors(platformPoint, basePoint).normalize();
    const euler = new Euler();
    euler.setFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction));
    rotation = [euler.x, euler.y, euler.z, 'XYZ'] as [x: number, y: number, z: number, order: EulerOrder];
  }
  $: {
    const direction = new Vector3().subVectors(platformPoint, basePoint).normalize();
    positionBase = basePoint.clone().add(direction.multiplyScalar(actuatorMin / 2)).toArray();
  }
  $: {
    positionPiston = basePoint.clone().add(platformPoint).divideScalar(2).toArray();
  }
</script>

<T.Mesh position={positionBase} {rotation}>
  <T.CylinderGeometry args={[0.02, 0.02, actuatorMin]} />
  <T.MeshBasicMaterial color="black" />
</T.Mesh>

<T.Mesh position={positionPiston} {rotation}>
  <T.CylinderGeometry args={[0.01, 0.01, length]} />
  <T.MeshBasicMaterial color={rodColor} />
</T.Mesh>
