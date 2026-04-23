<script lang="ts">
  import { Euler, Quaternion, Vector3 } from 'three';

  import type { PlannerPostureSkeleton, PosturePoint, PostureSegment } from './posture';
  import PostureBone from './PostureBone.svelte';

  type Props = {
    skeleton: PlannerPostureSkeleton;
  };

  type SkeletonBone = {
    id: string;
    length: number;
    position: PosturePoint;
    rotation: PosturePoint;
  };

  const SKELETON_COLOR = '#14b8a6';
  const SKELETON_BONE_RADIUS_M = 0.012;
  const SKELETON_RENDER_ORDER = 1000;
  const CYLINDER_SEGMENTS = 10;
  const Y_AXIS = new Vector3(0, 1, 0);

  const { skeleton }: Props = $props();
  const bones = $derived.by(() => skeleton.segments.flatMap(createBone));

  function formatKeyValue(value: number) {
    return value.toFixed(4);
  }

  function createBone(segment: PostureSegment, index: number): SkeletonBone[] {
    const start = new Vector3(...segment.start);
    const end = new Vector3(...segment.end);
    const delta = end.clone().sub(start);
    const length = delta.length();

    if (length <= 0.0001) {
      return [];
    }

    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    const rotation = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(Y_AXIS, delta.normalize()));

    return [
      {
        id: [
          'posture-bone',
          index,
          ...segment.start.map(formatKeyValue),
          ...segment.end.map(formatKeyValue),
        ].join('-'),
        length,
        position: [midpoint.x, midpoint.y, midpoint.z],
        rotation: [rotation.x, rotation.y, rotation.z],
      },
    ];
  }

</script>

{#each bones as bone (bone.id)}
  <PostureBone
    color={SKELETON_COLOR}
    length={bone.length}
    position={bone.position}
    radius={SKELETON_BONE_RADIUS_M}
    renderOrder={SKELETON_RENDER_ORDER}
    rotation={bone.rotation}
    segments={CYLINDER_SEGMENTS}
  />
{/each}
