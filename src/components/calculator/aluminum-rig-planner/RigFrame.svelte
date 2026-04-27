<script lang="ts">
  import { CUT_LIST_HIGHLIGHT_COLOR, DEFAULT_POSTURE_HEIGHT_CM } from './constants';
  import FovOverlay from './FovOverlay.svelte';
  import type { PlannerFovOverlay } from './fov-overlay';
  import type { PlannerGeometry } from './geometry';
  import MeasurementArrow from './MeasurementArrow.svelte';
  import type { PlannerMeasurementOverlay } from './measurement-overlay';
  import { createPedalsModule } from './modules/pedals';
  import ProfileMesh from './ProfileMesh.svelte';
  import { createBaseModule } from './modules/base';
  import { createMonitorModule } from './modules/monitor';
  import { createPedalTrayModule } from './modules/pedal-tray';
  import { createSeatModule } from './modules/seat';
  import { createSteeringColumnModule } from './modules/steering-column';
  import { createWheelModule } from './modules/wheel';
  import { createEndCapMeshes, getAdjustedBeamPosition, getAdjustedBeamSize } from './modules/shared';
  import { createPlannerPostureSkeleton } from './posture';
  import type { PlannerPostureReport } from './posture-report';
  import RiggedHumanModel from './RiggedHumanModel.svelte';
  import type { HumanRigHoverTooltip, RiggedHumanModel as RiggedHumanModelData } from './human-model-rig';
  import type { PlannerPosturePreset, PlannerPostureSettings, PlannerVisibleModules } from './types';

  type Props = {
    geometry: PlannerGeometry;
    highlightedBeamIds: string[];
    humanModel: RiggedHumanModelData;
    measurementOverlay?: PlannerMeasurementOverlay | null;
    onHumanRigTooltipChange: (tooltip: HumanRigHoverTooltip | null) => void;
    fovOverlay?: PlannerFovOverlay | null;
    profileColor: string;
    postureReport: PlannerPostureReport;
    postureSettings: PlannerPostureSettings<PlannerPosturePreset>;
    showEndCaps: boolean;
    visibleModules: PlannerVisibleModules;
  };

  const {
    geometry,
    highlightedBeamIds,
    humanModel,
    measurementOverlay = null,
    onHumanRigTooltipChange,
    fovOverlay = null,
    profileColor,
    postureReport,
    postureSettings,
    showEndCaps,
    visibleModules,
  }: Props = $props();
  const input = $derived(geometry.input);
  const highlightedBeamIdSet = $derived(new Set(highlightedBeamIds));

  const baseModule = $derived(createBaseModule(input, profileColor));
  const steeringColumnModule = $derived(createSteeringColumnModule(input, profileColor));
  const pedalAssembly = $derived(createPedalTrayModule(input, profileColor));
  const pedalsModule = $derived(createPedalsModule(input));
  const seatModule = $derived(createSeatModule(input));
  const wheelModule = $derived(createWheelModule(input));
  const monitorModule = $derived(createMonitorModule(postureReport, postureSettings));
  const postureSkeleton = $derived(
    createPlannerPostureSkeleton(
      input,
      {
        ...postureSettings,
        preset: postureSettings.preset === 'custom' ? 'gt' : postureSettings.preset,
      },
      humanModel.postureModelMetrics
    )
  );
  const modelScale = $derived(postureSettings.heightCm / DEFAULT_POSTURE_HEIGHT_CM);

  const beamMeshes = $derived([
    ...baseModule,
    ...(visibleModules.steeringColumn ? steeringColumnModule : []),
    ...(visibleModules.pedalTray ? pedalAssembly : []),
  ]);
  const allMeshes = $derived.by(() => {
    const adjustedBeams = beamMeshes.map((mesh) => ({
      ...mesh,
      color: highlightedBeamIdSet.has(mesh.id) ? CUT_LIST_HIGHLIGHT_COLOR : mesh.color,
      position: getAdjustedBeamPosition(mesh, showEndCaps),
      size: getAdjustedBeamSize(mesh, showEndCaps),
    }));

    if (!showEndCaps) {
      return [
        ...adjustedBeams,
        ...(visibleModules.pedalTray ? pedalsModule : []),
        ...wheelModule,
        ...seatModule,
        ...(visibleModules.monitor ? monitorModule : []),
      ];
    }

    return [
      ...adjustedBeams,
      ...beamMeshes.flatMap((mesh) => createEndCapMeshes(mesh)),
      ...(visibleModules.pedalTray ? pedalsModule : []),
      ...wheelModule,
      ...seatModule,
      ...(visibleModules.monitor ? monitorModule : []),
    ];
  });
</script>

{#each allMeshes as mesh (mesh.id)}
  <ProfileMesh {mesh} />
{/each}

{#if measurementOverlay}
  <MeasurementArrow color={measurementOverlay.color} start={measurementOverlay.start} end={measurementOverlay.end} />
{/if}

{#if fovOverlay}
  <FovOverlay overlay={fovOverlay} />
{/if}

{#if postureSettings.showModel || postureSettings.showSkeleton}
  <RiggedHumanModel
    {humanModel}
    {modelScale}
    showModel={postureSettings.showModel}
    showSkeleton={postureSettings.showSkeleton}
    skeleton={postureSkeleton}
    onHoverTooltipChange={onHumanRigTooltipChange}
  />
{/if}
