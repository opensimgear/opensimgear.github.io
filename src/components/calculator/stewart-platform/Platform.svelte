<script lang="ts">
  import { T } from '@threlte/core';
  import { BufferGeometry, DoubleSide, type Vector3 } from 'three';

  export let points: Vector3[] = [];
  export let color = 'green';

  $: geometry = new BufferGeometry().setFromPoints(points).setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5]);
</script>

<T.Mesh {geometry}>
  <T.MeshBasicMaterial {color} transparent={true} opacity={0.6} side={DoubleSide} />
</T.Mesh>
