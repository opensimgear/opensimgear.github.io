<script lang="ts">
  import { T } from '@threlte/core';
  import { Euler, Quaternion, Vector3, type EulerOrder } from 'three';

  type Props = {
    color?: string;
    end: [number, number, number];
    start: [number, number, number];
  };

  const { color = '#2563eb', end, start }: Props = $props();

  const ARROW_AXIS = new Vector3(0, 1, 0);
  const MIN_SHAFT_LENGTH = 0.002;
  const SHAFT_RADIUS = 0.004;

  const startVector = $derived.by(() => new Vector3(...start));
  const endVector = $derived.by(() => new Vector3(...end));
  const direction = $derived.by(() => new Vector3().subVectors(endVector, startVector));
  const length = $derived(direction.length());
  const headLength = $derived(Math.min(0.035, Math.max(length * 0.18, 0.016)));
  const headRadius = $derived(Math.max(SHAFT_RADIUS * 2.25, headLength * 0.38));
  const shaftLength = $derived(Math.max(MIN_SHAFT_LENGTH, length - headLength * 2));
  const normalizedDirection = $derived.by(() => (length > 0 ? direction.clone().normalize() : ARROW_AXIS.clone()));
  const startHeadRotation = $derived.by<[x: number, y: number, z: number, order: EulerOrder]>(() => {
    const euler = new Euler();
    euler.setFromQuaternion(new Quaternion().setFromUnitVectors(ARROW_AXIS, normalizedDirection.clone().negate()));
    return [euler.x, euler.y, euler.z, 'XYZ'];
  });
  const shaftRotation = $derived.by<[x: number, y: number, z: number, order: EulerOrder]>(() => {
    const euler = new Euler();
    euler.setFromQuaternion(new Quaternion().setFromUnitVectors(ARROW_AXIS, normalizedDirection));
    return [euler.x, euler.y, euler.z, 'XYZ'];
  });
  const shaftPosition = $derived(startVector.clone().add(endVector).multiplyScalar(0.5).toArray() as [number, number, number]);
  const startHeadPosition = $derived(
    startVector.clone().add(normalizedDirection.clone().multiplyScalar(headLength / 2)).toArray() as [
      number,
      number,
      number,
    ]
  );
  const endHeadPosition = $derived(
    endVector.clone().add(normalizedDirection.clone().multiplyScalar(-headLength / 2)).toArray() as [
      number,
      number,
      number,
    ]
  );
</script>

{#if length > 0}
  <T.Mesh position={shaftPosition} rotation={shaftRotation}>
    <T.CylinderGeometry args={[SHAFT_RADIUS, SHAFT_RADIUS, shaftLength]} />
    <T.MeshBasicMaterial color={color} toneMapped={false} />
  </T.Mesh>

  <T.Mesh position={startHeadPosition} rotation={startHeadRotation}>
    <T.ConeGeometry args={[headRadius, headLength, 16]} />
    <T.MeshBasicMaterial color={color} toneMapped={false} />
  </T.Mesh>

  <T.Mesh position={endHeadPosition} rotation={shaftRotation}>
    <T.ConeGeometry args={[headRadius, headLength, 16]} />
    <T.MeshBasicMaterial color={color} toneMapped={false} />
  </T.Mesh>
{/if}
