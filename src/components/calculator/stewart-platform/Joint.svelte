<script lang="ts">
  import { T } from '@threlte/core';
  import { Vector3 } from 'three';

  export let position: Vector3;
  export let scale = 0.01;
  export let color = 'red';
</script>

<T.Mesh position={position.toArray()} {scale}>
  <T.SphereGeometry />
  <T.MeshBasicMaterial {color} />
</T.Mesh>
