<script lang="ts">
  import { T } from '@threlte/core';

  import { CUT_LIST_HIGHLIGHT_COLOR } from '../constants/scene';
  import { DEFAULT_POSTURE_HEIGHT_CM } from '../constants/posture';
  import FovOverlay from '../posture/FovOverlay.svelte';
  import type { PlannerFovOverlay } from '../posture/fov-overlay';
  import type { PlannerGeometry } from './geometry';
  import MeasurementArrow from './MeasurementArrow.svelte';
  import type { PlannerMeasurementOverlay } from './measurement-overlay';
  import { createPedalsModule } from '../modules/pedals';
  import ProfileMesh from './ProfileMesh.svelte';
  import { createBaseModule } from '../modules/base';
  import { createMonitorStandModule } from '~/components/calculator/aluminum-rig-planner/modules/monitor-stand';
  import { createMonitorModule } from '../modules/monitor';
  import { createPedalTrayModule } from '../modules/pedal-tray';
  import { createSeatModule } from '../modules/seat';
  import { createSteeringColumnModule } from '../modules/steering-column';
  import { createWheelModule } from '../modules/wheel';
  import { createEndCapMeshes, getAdjustedBeamPosition, getAdjustedBeamSize } from '../modules/shared';
  import { createPlannerPostureSkeleton } from '../posture/posture';
  import type { PlannerPostureReport } from '../posture/posture-report';
  import RiggedHumanModel from '../posture/RiggedHumanModel.svelte';
  import type { HumanRigHoverTooltip, RiggedHumanModel as RiggedHumanModelData } from '../posture/human-model-rig';
  import type { PlannerPosturePreset, PlannerPostureSettings, PlannerVisibleModules } from '../types';

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
  const monitorModule = $derived(visibleModules.monitor ? createMonitorModule(postureReport, postureSettings) : []);
  const monitorStandModule = $derived(
    visibleModules.monitor && visibleModules.monitorStand && postureReport.monitorDebug
      ? createMonitorStandModule(postureReport.monitorDebug, postureSettings, profileColor, input)
      : []
  );
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
  const baseFeetHeightPosition = $derived([0, 0, input.baseFeetHeightMm / 1000] as [number, number, number]);

  const beamMeshes = $derived([...baseModule, ...steeringColumnModule, ...pedalAssembly]);
  const adjustedBeamMeshes = $derived.by(() =>
    beamMeshes.map((mesh) => ({
      ...mesh,
      color: highlightedBeamIdSet.has(mesh.id) ? CUT_LIST_HIGHLIGHT_COLOR : mesh.color,
      position: getAdjustedBeamPosition(mesh, showEndCaps),
      size: getAdjustedBeamSize(mesh, showEndCaps),
    }))
  );
  const adjustedMonitorStandMeshes = $derived.by(() =>
    monitorStandModule.map((mesh) => ({
      ...mesh,
      color: highlightedBeamIdSet.has(mesh.id) ? CUT_LIST_HIGHLIGHT_COLOR : mesh.color,
      position: getAdjustedBeamPosition(mesh, showEndCaps),
      size: getAdjustedBeamSize(mesh, showEndCaps),
    }))
  );
  const baseMountedMeshes = $derived.by(() => {
    if (!showEndCaps) {
      return [...adjustedBeamMeshes, ...pedalsModule, ...wheelModule, ...seatModule];
    }

    return [
      ...adjustedBeamMeshes,
      ...beamMeshes.flatMap((mesh) => createEndCapMeshes(mesh)),
      ...pedalsModule,
      ...wheelModule,
      ...seatModule,
    ];
  });
  const floorMountedMeshes = $derived.by(() => {
    if (!showEndCaps) {
      return [...adjustedMonitorStandMeshes, ...monitorModule];
    }

    return [
      ...adjustedMonitorStandMeshes,
      ...monitorStandModule.flatMap((mesh) => createEndCapMeshes(mesh)),
      ...monitorModule,
    ];
  });
</script>

<T.Group position={baseFeetHeightPosition}>
  {#each baseMountedMeshes as mesh (mesh.id)}
    <ProfileMesh {mesh} />
  {/each}

  {#if measurementOverlay}
    <MeasurementArrow color={measurementOverlay.color} start={measurementOverlay.start} end={measurementOverlay.end} />
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
</T.Group>

{#each floorMountedMeshes as mesh (mesh.id)}
  <ProfileMesh {mesh} />
{/each}

{#if fovOverlay}
  <FovOverlay overlay={fovOverlay} />
{/if}
