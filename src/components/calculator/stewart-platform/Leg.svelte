<script lang="ts">
  import { T } from '@threlte/core';
  import { Euler, Quaternion, Vector3, type EulerOrder } from 'three';

  type LegStatus = 'ok' | 'over-extended' | 'over-compressed';

  let {
    basePoint = new Vector3(0, 0, 0),
    platformPoint = new Vector3(0, 0, 0),
    status = 'ok',
    actuatorMin = 0.35,
  }: {
    basePoint?: Vector3;
    platformPoint?: Vector3;
    status?: LegStatus;
    actuatorMin?: number;
  } = $props();

  const length = $derived(basePoint.distanceTo(platformPoint) * 0.95);
  const rodColor = $derived(status === 'over-extended' ? 'red' : status === 'over-compressed' ? 'orange' : 'grey');
  const rotation = $derived.by<[x: number, y: number, z: number, order: EulerOrder]>(() => {
    const direction = new Vector3().subVectors(platformPoint, basePoint).normalize();
    const euler = new Euler();
    euler.setFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction));
    return [euler.x, euler.y, euler.z, 'XYZ'];
  });
  const positionBase = $derived.by<[number, number, number]>(() => {
    const direction = new Vector3().subVectors(platformPoint, basePoint).normalize();
    return basePoint.clone().add(direction.multiplyScalar(actuatorMin / 2)).toArray() as [number, number, number];
  });
  const positionPiston = $derived(basePoint.clone().add(platformPoint).divideScalar(2).toArray() as [number, number, number]);
</script>

<T.Mesh position={positionBase} {rotation}>
  <T.CylinderGeometry args={[0.02, 0.02, actuatorMin]} />
  <T.MeshBasicMaterial color="black" />
</T.Mesh>

<T.Mesh position={positionPiston} {rotation}>
  <T.CylinderGeometry args={[0.01, 0.01, length]} />
  <T.MeshBasicMaterial color={rodColor} />
</T.Mesh>
