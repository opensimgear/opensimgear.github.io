<script lang="ts">
  import { T, useThrelte } from '@threlte/core';
  import { onMount } from 'svelte';
  import type { Group } from 'three';

  import type { PlannerPostureSkeleton } from './posture';
  import {
    createRiggedHumanModel,
    HUMAN_MALE_REALISTIC_MODEL_URL,
    type RiggedHumanModel,
  } from './human-model-rig';

  type Props = {
    skeleton: PlannerPostureSkeleton;
  };

  const { skeleton }: Props = $props();
  const { invalidate } = useThrelte();
  let groupRef = $state<Group | null>(null);
  let riggedHuman = $state<RiggedHumanModel | null>(null);

  onMount(() => {
    let disposed = false;

    void createRiggedHumanModel(HUMAN_MALE_REALISTIC_MODEL_URL)
      .then((model) => {
        if (disposed || !model) {
          model?.dispose();
          return;
        }

        riggedHuman = model;
        model.applySkeleton(skeleton);
        invalidate();
      })
      .catch((error: unknown) => {
        console.warn('Unable to load rigged human model', error);
      });

    return () => {
      disposed = true;

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

    model.applySkeleton(skeleton);
    invalidate();
  });
</script>

<T.Group bind:ref={groupRef} />
