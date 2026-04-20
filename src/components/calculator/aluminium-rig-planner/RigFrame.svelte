<script lang="ts">
  import type { PlannerGeometry } from './geometry';
  import ProfileMesh from './ProfileMesh.svelte';
  import { createBaseModule } from './modules/base';
  import { createPedalTrayModule } from './modules/pedal-tray';
  import { createSteeringColumnModule } from './modules/steering-column';

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
  <ProfileMesh {mesh} />
{/each}
