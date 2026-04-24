<script lang="ts">
  import { CUT_LIST_HIGHLIGHT_COLOR, DEFAULT_ANTHROPOMETRY_LENGTHS_MM } from './constants';
  import type { PlannerGeometry } from './geometry';
  import MeasurementArrow from './MeasurementArrow.svelte';
  import type { PlannerMeasurementOverlay } from './measurement-overlay';
  import { createPedalsModule } from './modules/pedals';
  import ProfileMesh from './ProfileMesh.svelte';
  import { createBaseModule } from './modules/base';
  import { createPedalTrayModule } from './modules/pedal-tray';
  import { createSeatModule } from './modules/seat';
  import { createSteeringColumnModule } from './modules/steering-column';
  import { createWheelModule } from './modules/wheel';
  import { createEndCapMeshes, getAdjustedBeamPosition, getAdjustedBeamSize } from './modules/shared';
  import { createPlannerPostureSkeleton } from './posture';
  import RiggedHumanModel from './RiggedHumanModel.svelte';
  import type { HumanRigHoverTooltip } from './human-model-rig';
  import type {
    PlannerAnthropometryRatios,
    PlannerModelScaledBoneName,
    PlannerPostureSettings,
    PlannerVisibleModules,
  } from './types';

  type Props = {
    geometry: PlannerGeometry;
    highlightedBeamIds: string[];
    measurementOverlay?: PlannerMeasurementOverlay | null;
    onHumanRigTooltipChange: (tooltip: HumanRigHoverTooltip | null) => void;
    profileColor: string;
    postureSettings: PlannerPostureSettings;
    showEndCaps: boolean;
    visibleModules: PlannerVisibleModules;
  };

  const {
    geometry,
    highlightedBeamIds,
    measurementOverlay = null,
    onHumanRigTooltipChange,
    profileColor,
    postureSettings,
    showEndCaps,
    visibleModules,
  }: Props = $props();
  const input = $derived(geometry.input);
  const highlightedBeamIdSet = $derived(new Set(highlightedBeamIds));
  const anthropometryModelBones = {
    sittingHeight: ['torso', 'head'],
    seatedEyeHeight: [],
    seatedShoulderHeight: ['torso', 'head', 'leftUpperArm', 'rightUpperArm'],
    hipBreadth: ['leftThigh', 'rightThigh'],
    shoulderBreadth: ['leftUpperArm', 'leftForearm', 'leftHand', 'rightUpperArm', 'rightForearm', 'rightHand'],
    upperArmLength: ['leftUpperArm', 'leftForearm', 'leftHand', 'rightUpperArm', 'rightForearm', 'rightHand'],
    forearmHandLength: ['leftForearm', 'leftHand', 'rightForearm', 'rightHand'],
    thighLength: ['leftThigh', 'leftShin', 'leftHeel', 'leftFoot', 'rightThigh', 'rightShin', 'rightHeel', 'rightFoot'],
    lowerLegLength: ['leftShin', 'leftHeel', 'leftFoot', 'rightShin', 'rightHeel', 'rightFoot'],
    footLength: ['leftFoot', 'rightFoot'],
  } satisfies Record<keyof PlannerAnthropometryRatios, PlannerModelScaledBoneName[]>;

  const baseModule = $derived(createBaseModule(input, profileColor));
  const steeringColumnModule = $derived(createSteeringColumnModule(input, profileColor));
  const pedalAssembly = $derived(createPedalTrayModule(input, profileColor));
  const pedalsModule = $derived(createPedalsModule(input));
  const seatModule = $derived(createSeatModule(input));
  const wheelModule = $derived(createWheelModule(input));
  const postureSkeleton = $derived(createPlannerPostureSkeleton(input, postureSettings));
  const scaledModelBoneNames = $derived.by(() => {
    if (!postureSettings.advancedAnthropometry) {
      return [];
    }

    const scaledBones: PlannerModelScaledBoneName[] = [];

    for (const key of Object.keys(DEFAULT_ANTHROPOMETRY_LENGTHS_MM) as Array<keyof PlannerAnthropometryRatios>) {
      if (Math.abs(postureSettings.ratios[key] - DEFAULT_ANTHROPOMETRY_LENGTHS_MM[key]) <= 0.05) {
        continue;
      }

      for (const boneName of anthropometryModelBones[key]) {
        if (!scaledBones.includes(boneName)) {
          scaledBones.push(boneName);
        }
      }
    }

    return scaledBones;
  });

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
      return [...adjustedBeams, ...(visibleModules.pedalTray ? pedalsModule : []), ...wheelModule, ...seatModule];
    }

    return [
      ...adjustedBeams,
      ...beamMeshes.flatMap((mesh) => createEndCapMeshes(mesh)),
      ...(visibleModules.pedalTray ? pedalsModule : []),
      ...wheelModule,
      ...seatModule,
    ];
  });

</script>

{#each allMeshes as mesh (mesh.id)}
  <ProfileMesh {mesh} />
{/each}

{#if measurementOverlay}
  <MeasurementArrow color={measurementOverlay.color} start={measurementOverlay.start} end={measurementOverlay.end} />
{/if}

{#if postureSettings.showModel || postureSettings.showSkeleton}
  <RiggedHumanModel
    {scaledModelBoneNames}
    showModel={postureSettings.showModel}
    showSkeleton={postureSettings.advancedAnthropometry && postureSettings.showSkeleton}
    skeleton={postureSkeleton}
    onHoverTooltipChange={onHumanRigTooltipChange}
  />
{/if}
