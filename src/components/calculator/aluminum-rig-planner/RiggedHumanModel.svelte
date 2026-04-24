<script lang="ts">
  import { T, useThrelte } from '@threlte/core';
  import { onMount } from 'svelte';
  import { Raycaster, Vector2 } from 'three';
  import type { Group } from 'three';

  import type { PlannerPostureSkeleton } from './posture';
  import type { PlannerModelScaledBoneName } from './types';
  import {
    createRiggedHumanModel,
    type HumanRigHoverTooltip,
    HUMAN_MALE_REALISTIC_MODEL_URL,
    type HumanRigTooltipData,
    type RiggedHumanModel,
  } from './human-model-rig';

  type Props = {
    onHoverTooltipChange: (tooltip: HumanRigHoverTooltip | null) => void;
    scaledModelBoneNames: PlannerModelScaledBoneName[];
    skeleton: PlannerPostureSkeleton;
  };

  const { onHoverTooltipChange, scaledModelBoneNames, skeleton }: Props = $props();
  const { camera, canvas, invalidate } = useThrelte();
  const pointer = new Vector2();
  const raycaster = new Raycaster();
  let groupRef = $state<Group | null>(null);
  let riggedHuman = $state<RiggedHumanModel | null>(null);

  function clearHoverTooltip() {
    onHoverTooltipChange(null);
    canvas.style.cursor = '';
  }

  function updateHoverTooltip(event: PointerEvent) {
    const model = riggedHuman;

    if (!model) {
      clearHoverTooltip();
      return;
    }

    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera.current);

    const intersection = raycaster
      .intersectObjects(
        model.getTooltipTargets().filter((target) => target.visible),
        false
      )
      .find((hit) => Boolean(hit.object.userData.rigTooltip));
    const tooltip = intersection?.object.userData.rigTooltip as HumanRigTooltipData | undefined;

    if (!intersection || !tooltip) {
      clearHoverTooltip();
      return;
    }

    onHoverTooltipChange({
      ...tooltip,
      screenPosition: [event.clientX - rect.left, event.clientY - rect.top],
    });
    canvas.style.cursor = 'help';
  }

  onMount(() => {
    let disposed = false;
    canvas.addEventListener('pointermove', updateHoverTooltip);
    canvas.addEventListener('pointerleave', clearHoverTooltip);

    void createRiggedHumanModel(HUMAN_MALE_REALISTIC_MODEL_URL)
      .then((model) => {
        if (disposed || !model) {
          model?.dispose();
          return;
        }

        riggedHuman = model;
        model.applySkeleton(skeleton, scaledModelBoneNames);
        invalidate();
      })
      .catch((error: unknown) => {
        console.warn('Unable to load rigged human model', error);
      });

    return () => {
      disposed = true;
      canvas.removeEventListener('pointermove', updateHoverTooltip);
      canvas.removeEventListener('pointerleave', clearHoverTooltip);
      clearHoverTooltip();

      if (riggedHuman) {
        groupRef?.remove(riggedHuman.object);
        riggedHuman.dispose();
        riggedHuman = null;
      }
    };
  });

  $effect(() => {
    const group = groupRef;
    const model = riggedHuman;

    if (!group || !model) {
      return;
    }

    if (model.object.parent !== group) {
      group.add(model.object);
    }

    model.applySkeleton(skeleton, scaledModelBoneNames);
    invalidate();
  });
</script>

<T.Group bind:ref={groupRef} />
