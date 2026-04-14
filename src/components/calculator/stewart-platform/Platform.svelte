<script lang="ts">
  import { T } from '@threlte/core';
  import { BufferGeometry, DoubleSide, type Vector3 } from 'three';

  let { points = [], color = 'green' }: { points?: Vector3[]; color?: string } = $props();

  const geometry = $derived(
    new BufferGeometry().setFromPoints(points).setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5])
  );
</script>

<T.Mesh {geometry}>
  <T.MeshBasicMaterial {color} transparent={true} opacity={0.6} side={DoubleSide} />
</T.Mesh>
