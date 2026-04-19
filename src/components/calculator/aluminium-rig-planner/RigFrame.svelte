<script lang="ts">
  import { T } from '@threlte/core';

  import type { PlannerGeometry } from './geometry';
  import type { PlannerInput } from './types';

  type Props = {
    geometry: PlannerGeometry;
    input: PlannerInput;
  };

  const MM_TO_METERS = 0.001;
  const FRAME_THICKNESS = 0.04;
  const FRAME_ELEVATION = FRAME_THICKNESS / 2;
  const SCENE_WIDTH_MM = 400;
  const SEAT_BASE_LENGTH_MM = 420;
  const SEAT_BACK_LENGTH_MM = 420;
  const PEDAL_LENGTH_MM = 170;
  const WHEEL_RADIUS_MM = 135;

  const { geometry, input }: Props = $props();

  const members = $derived.by(() =>
    geometry.frameMembers.map((member) => {
      const deltaX = member.end.x - member.start.x;
      const deltaZ = member.end.y - member.start.y;
      const length = Math.hypot(deltaX, deltaZ) * MM_TO_METERS;

      return {
        id: member.id,
        length,
        position: [
          ((member.start.x + member.end.x) * 0.5) * MM_TO_METERS,
          FRAME_ELEVATION,
          (((member.start.y + member.end.y) * 0.5) - SCENE_WIDTH_MM / 2) * MM_TO_METERS,
        ] as [number, number, number],
        rotation: [0, -Math.atan2(deltaZ, deltaX), 0] as [number, number, number],
      };
    })
  );

  const seatBasePosition = $derived<[number, number, number]>([
    (input.seatXMm + SEAT_BASE_LENGTH_MM * 0.5) * MM_TO_METERS,
    Math.max(0.06, input.seatYMm * MM_TO_METERS),
    0,
  ]);
  const seatBaseRotation = $derived<[number, number, number]>([0, 0, (-6 * Math.PI) / 180]);
  const seatBackPosition = $derived.by<[number, number, number]>(() => {
    const radians = (input.seatBackAngleDeg * Math.PI) / 180;

    return [
      (input.seatXMm - Math.cos(radians) * SEAT_BACK_LENGTH_MM * 0.5) * MM_TO_METERS,
      (input.seatYMm + Math.sin(radians) * SEAT_BACK_LENGTH_MM * 0.5) * MM_TO_METERS,
      0,
    ];
  });
  const seatBackRotation = $derived<[number, number, number]>([0, 0, (180 - input.seatBackAngleDeg) * (Math.PI / 180)]);
  const pedalPosition = $derived.by<[number, number, number]>(() => {
    const radians = (input.pedalAngleDeg * Math.PI) / 180;

    return [
      (input.pedalXMm + Math.cos(radians) * PEDAL_LENGTH_MM * 0.35) * MM_TO_METERS,
      (input.pedalYMm + Math.sin(radians) * PEDAL_LENGTH_MM * 0.35) * MM_TO_METERS,
      0,
    ];
  });
  const pedalRotation = $derived<[number, number, number]>([0, 0, input.pedalAngleDeg * (Math.PI / 180)]);
  const wheelSupportHeight = $derived(Math.max(input.baseHeightMm + 80, input.wheelYMm + geometry.wheelMountOffsets.mountYMm) * MM_TO_METERS);
  const wheelSupportPosition = $derived<[number, number, number]>([
    (input.wheelXMm + geometry.wheelMountOffsets.mountXMm) * MM_TO_METERS,
    wheelSupportHeight / 2,
    0,
  ]);
  const wheelPosition = $derived<[number, number, number]>([
    (input.wheelXMm + geometry.wheelMountOffsets.wheelCenterOffsetXMm) * MM_TO_METERS,
    (input.wheelYMm + geometry.wheelMountOffsets.wheelCenterOffsetYMm) * MM_TO_METERS,
    0,
  ]);
  const wheelRotation = $derived<[number, number, number]>([
    0,
    0,
    (90 - input.wheelTiltDeg) * (Math.PI / 180),
  ]);
</script>

{#each members as member (member.id)}
  <T.Mesh position={member.position} rotation={member.rotation}>
    <T.BoxGeometry args={[member.length, FRAME_THICKNESS, FRAME_THICKNESS]} />
    <T.MeshStandardMaterial color={member.id === 'pedal-brace' ? '#475569' : '#9ca3af'} metalness={0.45} roughness={0.35} />
  </T.Mesh>
{/each}

<T.Mesh position={seatBasePosition} rotation={seatBaseRotation}>
  <T.BoxGeometry args={[SEAT_BASE_LENGTH_MM * MM_TO_METERS, 0.035, 0.42]} />
  <T.MeshStandardMaterial color="#0f766e" metalness={0.1} roughness={0.8} />
</T.Mesh>

<T.Mesh position={seatBackPosition} rotation={seatBackRotation}>
  <T.BoxGeometry args={[SEAT_BACK_LENGTH_MM * MM_TO_METERS, 0.03, 0.4]} />
  <T.MeshStandardMaterial color="#14b8a6" metalness={0.1} roughness={0.78} />
</T.Mesh>

<T.Mesh position={pedalPosition} rotation={pedalRotation}>
  <T.BoxGeometry args={[PEDAL_LENGTH_MM * MM_TO_METERS, 0.02, 0.34]} />
  <T.MeshStandardMaterial color="#2563eb" metalness={0.18} roughness={0.55} />
</T.Mesh>

<T.Mesh position={wheelSupportPosition}>
  <T.BoxGeometry args={[FRAME_THICKNESS, wheelSupportHeight, FRAME_THICKNESS]} />
  <T.MeshStandardMaterial color="#78716c" metalness={0.4} roughness={0.45} />
</T.Mesh>

<T.Mesh position={wheelPosition} rotation={wheelRotation}>
  <T.TorusGeometry args={[WHEEL_RADIUS_MM * MM_TO_METERS, 0.016, 18, 48]} />
  <T.MeshStandardMaterial color="#d97706" metalness={0.15} roughness={0.55} />
</T.Mesh>
