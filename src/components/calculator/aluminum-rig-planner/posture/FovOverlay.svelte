<script lang="ts">
  import { T } from '@threlte/core';
  import { Text } from '@threlte/extras';
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
  const FOV_LINE_RADIUS = 0.003;
  const EYE_DOT_RADIUS = 0.018;
  const LABEL_HEIGHT_OFFSET = 0.035;

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

  function createTopViewDirection(start: PosturePoint, end: PosturePoint) {
    const direction = new Vector3(end[0] - start[0], end[1] - start[1], 0);

    return direction.lengthSq() > 0 ? direction.normalize() : null;
  }

  const fovAngleLabel = $derived.by(() => {
    const leftDirection = createTopViewDirection(overlay.eyeCenter, overlay.leftScreenEdge);
    const rightDirection = createTopViewDirection(overlay.eyeCenter, overlay.rightScreenEdge);

    if (!leftDirection || !rightDirection) {
      return '0\u00b0';
    }

    return `${Math.round((leftDirection.angleTo(rightDirection) * 180) / Math.PI)}\u00b0`;
  });

  const fovAngleLabelPosition = $derived.by<[number, number, number]>(() => {
    const eye = new Vector3(...overlay.eyeCenter);
    const screenMidpoint = new Vector3(...overlay.leftScreenEdge)
      .add(new Vector3(...overlay.rightScreenEdge))
      .multiplyScalar(0.5);
    const labelPosition = eye.lerp(screenMidpoint, 0.55);
    labelPosition.z =
      Math.max(overlay.eyeCenter[2], overlay.leftScreenEdge[2], overlay.rightScreenEdge[2]) + LABEL_HEIGHT_OFFSET;

    return labelPosition.toArray() as [number, number, number];
  });

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

<Text
  anchorX="center"
  anchorY="middle"
  color="#1d4ed8"
  depthOffset={-1}
  fontSize={0.075}
  outlineColor="#ffffff"
  outlineWidth={0.004}
  position={fovAngleLabelPosition}
  renderOrder={32}
  text={fovAngleLabel}
/>
