<script lang="ts">
  import type { PlannerGeometry } from './geometry';
  import ProfileMesh from './ProfileMesh.svelte';
  import { createBaseModule } from './modules/base';
  import { createPedalTrayModule } from './modules/pedal-tray';
  import { createSteeringColumnModule } from './modules/steering-column';
  import type { PlannerVisibleModules } from './types';

  type Props = {
    geometry: PlannerGeometry;
    visibleModules: PlannerVisibleModules;
  };

  const { geometry, visibleModules }: Props = $props();
  const input = $derived(geometry.input);

  const baseModule = $derived(createBaseModule(input));
  const steeringColumnModule = $derived(createSteeringColumnModule(input, geometry));
  const pedalAssembly = $derived(createPedalTrayModule(input));

  const allMeshes = $derived([
    ...baseModule,
    ...(visibleModules.steeringColumn ? steeringColumnModule : []),
    ...(visibleModules.pedalTray ? pedalAssembly : []),
  ]);
</script>

{#each allMeshes as mesh (mesh.id)}
  <ProfileMesh {mesh} />
{/each}
