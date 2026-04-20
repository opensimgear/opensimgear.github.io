<script lang="ts">
  import type { PlannerGeometry } from './geometry';
  import ProfileMesh from './ProfileMesh.svelte';
  import { createBaseModule } from './modules/base';
  import { createPedalTrayModule } from './modules/pedal-tray';
  import { createSteeringColumnModule } from './modules/steering-column';
  import type { PlannerVisibleModules } from './types';

  type Props = {
    geometry: PlannerGeometry;
    profileColor: string;
    visibleModules: PlannerVisibleModules;
  };

  const { geometry, profileColor, visibleModules }: Props = $props();
  const input = $derived(geometry.input);

  const baseModule = $derived(createBaseModule(input, profileColor));
  const steeringColumnModule = $derived(createSteeringColumnModule(input, geometry, profileColor));
  const pedalAssembly = $derived(createPedalTrayModule(input, profileColor));

  const allMeshes = $derived([
    ...baseModule,
    ...(visibleModules.steeringColumn ? steeringColumnModule : []),
    ...(visibleModules.pedalTray ? pedalAssembly : []),
  ]);
</script>

{#each allMeshes as mesh (mesh.id)}
  <ProfileMesh {mesh} />
{/each}
