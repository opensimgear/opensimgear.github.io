<script lang="ts">
  import { T } from '@threlte/core';
  import { Vector3 } from 'three';

  let { position, scale = 0.01, color = 'red' }: { position: Vector3; scale?: number; color?: string } = $props();
</script>

<T.Mesh position={position.toArray()} {scale}>
  <T.SphereGeometry />
  <T.MeshBasicMaterial {color} />
</T.Mesh>
