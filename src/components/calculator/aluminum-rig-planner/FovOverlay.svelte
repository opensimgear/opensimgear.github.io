<script lang="ts">
  import { T } from '@threlte/core';
  import { Euler, Quaternion, Vector3, type EulerOrder } from 'three';

  import type { PlannerFovOverlay } from './fov-overlay';
  import type { PosturePoint } from './posture';

  type Props = {
    overlay: PlannerFovOverlay;
  };
  type Segment = {
    color: string;
    end: PosturePoint;
    id: string;
    opacity: number;
    radius: number;
    start: PosturePoint;
  };
  type SegmentMesh = {
    color: string;
    id: string;
    length: number;
    opacity: number;
    position: [number, number, number];
    radius: number;
    rotation: [number, number, number, EulerOrder];
  };

  const { overlay }: Props = $props();
  const LINE_AXIS = new Vector3(0, 1, 0);
  const FOV_LINE_RADIUS = 0.006;
  const SCREEN_EDGE_RADIUS = 0.004;
  const EYE_DOT_RADIUS = 0.018;

  function createSegmentMesh(segment: Segment): SegmentMesh | null {
    const start = new Vector3(...segment.start);
    const end = new Vector3(...segment.end);
    const direction = new Vector3().subVectors(end, start);
    const length = direction.length();

    if (length <= 0) {
      return null;
    }

    const rotation = new Euler();
    rotation.setFromQuaternion(new Quaternion().setFromUnitVectors(LINE_AXIS, direction.clone().normalize()));

    return {
      color: segment.color,
      id: segment.id,
      length,
      opacity: segment.opacity,
      position: start.add(end).multiplyScalar(0.5).toArray() as [number, number, number],
      radius: segment.radius,
      rotation: [rotation.x, rotation.y, rotation.z, 'XYZ'],
    };
  }

  const segments = $derived.by<SegmentMesh[]>(() =>
    [
      {
        color: '#2563eb',
        end: overlay.leftScreenEdge,
        id: 'left-fov-line',
        opacity: 0.86,
        radius: FOV_LINE_RADIUS,
        start: overlay.eyeCenter,
      },
      {
        color: '#2563eb',
        end: overlay.rightScreenEdge,
        id: 'right-fov-line',
        opacity: 0.86,
        radius: FOV_LINE_RADIUS,
        start: overlay.eyeCenter,
      },
      {
        color: '#0f172a',
        end: overlay.rightScreenEdge,
        id: 'screen-edge-line',
        opacity: 0.65,
        radius: SCREEN_EDGE_RADIUS,
        start: overlay.leftScreenEdge,
      },
    ].flatMap((segment) => {
      const mesh = createSegmentMesh(segment);

      return mesh ? [mesh] : [];
    })
  );
</script>

{#each segments as segment (segment.id)}
  <T.Mesh position={segment.position} renderOrder={30} rotation={segment.rotation}>
    <T.CylinderGeometry args={[segment.radius, segment.radius, segment.length, 16]} />
    <T.MeshBasicMaterial
      color={segment.color}
      depthTest={false}
      depthWrite={false}
      opacity={segment.opacity}
      toneMapped={false}
      transparent
    />
  </T.Mesh>
{/each}

<T.Mesh position={overlay.eyeCenter} renderOrder={31}>
  <T.SphereGeometry args={[EYE_DOT_RADIUS, 18, 12]} />
  <T.MeshBasicMaterial color="#1d4ed8" depthTest={false} depthWrite={false} toneMapped={false} />
</T.Mesh>
