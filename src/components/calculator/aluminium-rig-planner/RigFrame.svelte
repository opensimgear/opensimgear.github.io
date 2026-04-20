<script lang="ts">
  import type { PlannerGeometry } from './geometry';
  import ProfileMesh from './ProfileMesh.svelte';
  import { createBaseModule } from './modules/base';
  import { createPedalTrayModule } from './modules/pedal-tray';
  import { createSteeringColumnModule } from './modules/steering-column';
  import { createEndCapMeshes, getAdjustedBeamPosition, getAdjustedBeamSize } from './modules/shared';
  import type { PlannerVisibleModules } from './types';

  type Props = {
    geometry: PlannerGeometry;
    profileColor: string;
    showEndCaps: boolean;
    visibleModules: PlannerVisibleModules;
  };

  const { geometry, profileColor, showEndCaps, visibleModules }: Props = $props();
  const input = $derived(geometry.input);

  const baseModule = $derived(createBaseModule(input, profileColor));
  const steeringColumnModule = $derived(createSteeringColumnModule(input, geometry, profileColor));
  const pedalAssembly = $derived(createPedalTrayModule(input, profileColor));

  const beamMeshes = $derived([
    ...baseModule,
    ...(visibleModules.steeringColumn ? steeringColumnModule : []),
    ...(visibleModules.pedalTray ? pedalAssembly : []),
  ]);
  const allMeshes = $derived.by(() => {
    const adjustedBeams = beamMeshes.map((mesh) => ({
      ...mesh,
      position: getAdjustedBeamPosition(mesh, showEndCaps),
      size: getAdjustedBeamSize(mesh, showEndCaps),
    }));

    if (!showEndCaps) {
      return adjustedBeams;
    }

    return [...adjustedBeams, ...beamMeshes.flatMap((mesh) => createEndCapMeshes(mesh))];
  });
</script>

{#each allMeshes as mesh (mesh.id)}
  <ProfileMesh {mesh} />
{/each}
