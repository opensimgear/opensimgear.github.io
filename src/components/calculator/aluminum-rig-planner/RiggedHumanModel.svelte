<script lang="ts">
  import { T, useThrelte } from '@threlte/core';
  import { onMount } from 'svelte';
  import { Raycaster, Vector2 } from 'three';
  import type { Group, Mesh } from 'three';

  import type { PlannerPostureSkeleton } from './posture';
  import {
    type HumanRigHoverTooltip,
    type HumanRigTooltipData,
    type RiggedHumanModel,
  } from './human-model-rig';

  type Props = {
    humanModel: RiggedHumanModel;
    modelScale: number;
    onHoverTooltipChange: (tooltip: HumanRigHoverTooltip | null) => void;
    showModel: boolean;
    showSkeleton: boolean;
    skeleton: PlannerPostureSkeleton;
  };

  const { humanModel, modelScale, onHoverTooltipChange, showModel, showSkeleton, skeleton }: Props = $props();
  const { camera, canvas, invalidate } = useThrelte();
  const pointer = new Vector2();
  const raycaster = new Raycaster();
  let groupRef = $state<Group | null>(null);

  function isTooltipTargetVisible(target: Mesh) {
    let object: Group | Mesh | null = target;

    while (object) {
      if (!object.visible) {
        return false;
      }

      object = object.parent;
    }

    return true;
  }

  function clearHoverTooltip() {
    onHoverTooltipChange(null);
    canvas.style.cursor = '';
  }

  function updateHoverTooltip(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera.current);

    const intersection = raycaster
      .intersectObjects(
        humanModel.getTooltipTargets().filter((target) => isTooltipTargetVisible(target)),
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
    canvas.addEventListener('pointermove', updateHoverTooltip);
    canvas.addEventListener('pointerleave', clearHoverTooltip);

    return () => {
      canvas.removeEventListener('pointermove', updateHoverTooltip);
      canvas.removeEventListener('pointerleave', clearHoverTooltip);
      clearHoverTooltip();
      groupRef?.remove(humanModel.object);
    };
  });

  $effect(() => {
    const group = groupRef;

    if (!group) {
      return;
    }

    if (humanModel.object.parent !== group) {
      group.add(humanModel.object);
    }

    humanModel.applySkeleton(skeleton, modelScale);
    humanModel.setDisplayOptions(showModel, showSkeleton);
    invalidate();
  });
</script>

<T.Group bind:ref={groupRef} />
