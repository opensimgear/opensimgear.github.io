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
  const SUMMARY_BORDER_COLOR = '#d1d5db';
  const SUMMARY_BORDER_RADIUS = 0.001;
  const CURVE_CENTER_DOT_RADIUS = 0.012;
  const EYE_DOT_RADIUS = 0.018;
  const SUMMARY_PANEL_HEIGHT = 0.29;
  const SUMMARY_PANEL_WIDTH = 0.72;
  const SUMMARY_HEADER_Y_OFFSET = 0.095;
  const SUMMARY_LABEL_X_OFFSET = 0.3;
  const SUMMARY_ROW_START_Y_OFFSET = 0.035;
  const SUMMARY_ROW_GAP = 0.058;
  const SUMMARY_VALUE_X_OFFSET = 0.3;

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

  const summaryRows = $derived([
    { label: 'Per monitor', value: `${overlay.summary.fovPerMonitorDeg.toFixed(1)}\u00b0` },
    { label: 'Total FOV', value: `${overlay.summary.totalFovDeg.toFixed(1)}\u00b0` },
    { label: 'Distance', value: `${overlay.summary.eyeDistanceToPanelMm} mm` },
  ]);

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

  const summaryBorderSegments = $derived.by<SegmentMesh[]>(() => {
    const [x, y, z] = overlay.summary.position;
    const halfWidth = SUMMARY_PANEL_WIDTH / 2;
    const halfHeight = SUMMARY_PANEL_HEIGHT / 2;
    const left = x - halfWidth;
    const right = x + halfWidth;
    const top = y + halfHeight;
    const bottom = y - halfHeight;
    const borderZ = z + 0.003;

    return [
      {
        start: [left, top, borderZ] as PosturePoint,
        end: [right, top, borderZ] as PosturePoint,
        id: 'summary-border-top',
      },
      {
        start: [right, top, borderZ] as PosturePoint,
        end: [right, bottom, borderZ] as PosturePoint,
        id: 'summary-border-right',
      },
      {
        start: [right, bottom, borderZ] as PosturePoint,
        end: [left, bottom, borderZ] as PosturePoint,
        id: 'summary-border-bottom',
      },
      {
        start: [left, bottom, borderZ] as PosturePoint,
        end: [left, top, borderZ] as PosturePoint,
        id: 'summary-border-left',
      },
    ].flatMap(({ start, end, id }) => {
      const mesh = createSegmentMesh({
        color: SUMMARY_BORDER_COLOR,
        end,
        id,
        opacity: 0.96,
        radius: SUMMARY_BORDER_RADIUS,
        start,
      });

      return mesh ? [mesh] : [];
    });
  });
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

{#if overlay.curveCenters}
  {#each overlay.curveCenters as curveCenter, index (`${curveCenter[0]}-${curveCenter[1]}-${index}`)}
    <T.Mesh position={curveCenter} renderOrder={31}>
      <T.SphereGeometry args={[CURVE_CENTER_DOT_RADIUS, 16, 10]} />
      <T.MeshBasicMaterial color="#f97316" depthTest={false} depthWrite={false} toneMapped={false} />
    </T.Mesh>
  {/each}
{/if}

<T.Mesh position={overlay.summary.position} renderOrder={32}>
  <T.PlaneGeometry args={[SUMMARY_PANEL_WIDTH, SUMMARY_PANEL_HEIGHT]} />
  <T.MeshBasicMaterial
    color="#ffffff"
    depthTest={false}
    depthWrite={false}
    opacity={0.82}
    toneMapped={false}
    transparent
  />
</T.Mesh>

{#each summaryBorderSegments as segment (segment.id)}
  <T.Mesh position={segment.position} renderOrder={33} rotation={segment.rotation}>
    <T.CylinderGeometry args={[segment.radius, segment.radius, segment.length, 8]} />
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

<Text
  anchorX="left"
  anchorY="middle"
  color="#6b7280"
  depthOffset={-1}
  fontSize={0.024}
  outlineColor="#ffffff"
  outlineWidth={0.0015}
  position={[
    overlay.summary.position[0] - SUMMARY_LABEL_X_OFFSET,
    overlay.summary.position[1] + SUMMARY_HEADER_Y_OFFSET,
    overlay.summary.position[2] + 0.006,
  ]}
  renderOrder={34}
  text="FOV"
/>

{#each summaryRows as row, index (`summary-${index}`)}
  <Text
    anchorX="left"
    anchorY="middle"
    color="#6b7280"
    depthOffset={-1}
    fontSize={0.027}
    outlineColor="#ffffff"
    outlineWidth={0.0015}
    position={[
      overlay.summary.position[0] - SUMMARY_LABEL_X_OFFSET,
      overlay.summary.position[1] + SUMMARY_ROW_START_Y_OFFSET - index * SUMMARY_ROW_GAP,
      overlay.summary.position[2] + 0.006,
    ]}
    renderOrder={34}
    text={row.label}
  />
  <Text
    anchorX="right"
    anchorY="middle"
    color="#374151"
    depthOffset={-1}
    fontSize={0.027}
    outlineColor="#ffffff"
    outlineWidth={0.0015}
    position={[
      overlay.summary.position[0] + SUMMARY_VALUE_X_OFFSET,
      overlay.summary.position[1] + SUMMARY_ROW_START_Y_OFFSET - index * SUMMARY_ROW_GAP,
      overlay.summary.position[2] + 0.006,
    ]}
    renderOrder={34}
    text={row.value}
  />
{/each}
