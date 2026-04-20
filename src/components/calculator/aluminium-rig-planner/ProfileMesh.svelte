<script lang="ts">
  import { T } from '@threlte/core';

  import { createAluminium40x40Geometry, createAluminium80x40Geometry } from './modules/profile-geometry';
  import type { MeshSpec } from './modules/shared';

  type Props = {
    mesh: MeshSpec;
  };

  const { mesh }: Props = $props();
  const profileGeometry = $derived.by(() => {
    if (mesh.profileType === 'alu40x40') {
      return createAluminium40x40Geometry(mesh.size);
    }

    if (mesh.profileType === 'alu80x40') {
      return createAluminium80x40Geometry(mesh.size);
    }

    return null;
  });
</script>

{#if profileGeometry}
  <T.Mesh geometry={profileGeometry} position={mesh.position} rotation={mesh.rotation ?? [0, 0, 0]}>
    <T.MeshStandardMaterial
      color={mesh.color}
      metalness={mesh.metalness ?? 0.08}
      roughness={mesh.roughness ?? 0.6}
    />
  </T.Mesh>
{:else}
  <T.Mesh position={mesh.position} rotation={mesh.rotation ?? [0, 0, 0]}>
    <T.BoxGeometry args={mesh.size} />
    <T.MeshStandardMaterial
      color={mesh.color}
      metalness={mesh.metalness ?? 0.08}
      roughness={mesh.roughness ?? 0.6}
    />
  </T.Mesh>
{/if}
