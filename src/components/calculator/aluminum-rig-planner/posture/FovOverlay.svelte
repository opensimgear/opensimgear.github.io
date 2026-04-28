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
  const FOV_LINE_COLOR = '#2563eb';
  const FOV_LINE_RADIUS = 0.0015;
  const EYE_DOT_RADIUS = 0.018;
  const FOV_LABEL_FONT_SIZE = 0.03;

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
        color: FOV_LINE_COLOR,
        end: overlay.leftScreenEdge,
        id: 'left-fov-line',
        opacity: 0.86,
        radius: FOV_LINE_RADIUS,
        start: overlay.eyeCenter,
      },
      {
        color: FOV_LINE_COLOR,
        end: overlay.rightScreenEdge,
        id: 'right-fov-line',
        opacity: 0.86,
        radius: FOV_LINE_RADIUS,
        start: overlay.eyeCenter,
      },
      ...(overlay.tripleScreen
        ? [
            {
              color: FOV_LINE_COLOR,
              end: overlay.tripleScreen.leftInnerEdge,
              id: 'left-inner-fov-line',
              opacity: 0.72,
              radius: FOV_LINE_RADIUS,
              start: overlay.eyeCenter,
            },
            {
              color: FOV_LINE_COLOR,
              end: overlay.tripleScreen.leftOuterEdge,
              id: 'left-outer-fov-line',
              opacity: 0.72,
              radius: FOV_LINE_RADIUS,
              start: overlay.eyeCenter,
            },
            {
              color: FOV_LINE_COLOR,
              end: overlay.tripleScreen.rightInnerEdge,
              id: 'right-inner-fov-line',
              opacity: 0.72,
              radius: FOV_LINE_RADIUS,
              start: overlay.eyeCenter,
            },
            {
              color: FOV_LINE_COLOR,
              end: overlay.tripleScreen.rightOuterEdge,
              id: 'right-outer-fov-line',
              opacity: 0.72,
              radius: FOV_LINE_RADIUS,
              start: overlay.eyeCenter,
            },
            ...(!overlay.hasCurvedMonitor
              ? [
                  {
                    color: FOV_LINE_COLOR,
                    end: overlay.tripleScreen.leftOuterEdge,
                    id: 'left-side-screen-line',
                    opacity: 0.5,
                    radius: FOV_LINE_RADIUS * 0.6,
                    start: overlay.tripleScreen.leftInnerEdge,
                  },
                  {
                    color: FOV_LINE_COLOR,
                    end: overlay.tripleScreen.rightOuterEdge,
                    id: 'right-side-screen-line',
                    opacity: 0.5,
                    radius: FOV_LINE_RADIUS * 0.6,
                    start: overlay.tripleScreen.rightInnerEdge,
                  },
                ]
              : []),
          ]
        : []),
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

{#each overlay.fovLabels as label (label.id)}
  <Text
    anchorX="center"
    anchorY="middle"
    color="#1d4ed8"
    depthOffset={-1}
    fontSize={FOV_LABEL_FONT_SIZE}
    outlineColor="#ffffff"
    outlineWidth={0.003}
    position={label.position}
    renderOrder={34}
    text={`${label.valueDeg.toFixed(1)}\u00b0`}
  />
{/each}
