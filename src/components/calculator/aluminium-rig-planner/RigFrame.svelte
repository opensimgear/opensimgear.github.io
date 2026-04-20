<script lang="ts">
  import { T } from '@threlte/core';

  import type { PlannerGeometry } from './geometry';
  import { createBaseModule } from './modules/base';
  import { createPedalTrayModule } from './modules/pedal-tray';
  import { createSteeringColumnModule } from './modules/steering-column';
  import { mm } from './modules/shared';

  type Props = {
    geometry: PlannerGeometry;
  };

  const { geometry }: Props = $props();
  const input = $derived(geometry.input);

  const baseModule = $derived(createBaseModule(input));
  const steeringColumnModule = $derived(createSteeringColumnModule(input, geometry));
  const pedalAssembly = $derived(createPedalTrayModule(input));

  const allMeshes = $derived([...baseModule, ...steeringColumnModule, ...pedalAssembly]);
</script>

{#each allMeshes as mesh (mesh.id)}
  <T.Mesh position={mesh.position} rotation={mesh.rotation ?? [0, 0, 0]}>
    <T.BoxGeometry args={mesh.size} />
    <T.MeshStandardMaterial
      color={mesh.color}
      metalness={mesh.metalness ?? 0.08}
      roughness={mesh.roughness ?? 0.6}
    />
  </T.Mesh>
{/each}
