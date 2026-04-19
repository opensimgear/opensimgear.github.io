<script lang="ts">
  import { T } from '@threlte/core';

  import type { PlannerGeometry } from './geometry';

  type Props = {
    geometry: PlannerGeometry;
  };

  type MeshSpec = {
    id: string;
    position: [number, number, number];
    size: [number, number, number];
    rotation?: [number, number, number];
    color: string;
    metalness?: number;
    roughness?: number;
  };

  const MM_TO_METERS = 0.001;
  const FRAME_THICKNESS = 0.04;
  const FRAME_ELEVATION = FRAME_THICKNESS / 2;
  const SCENE_WIDTH_MM = 400;
  const WHEEL_RADIUS_MM = 0.135;

  const PROFILE_COLOR = '#242628';
  const PROFILE_SHADE = '#17181a';
  const HARDWARE_COLOR = '#3a3d42';
  const PANEL_COLOR = '#d7dce2';
  const PANEL_EDGE_COLOR = '#8b929d';
  const RUBBER_COLOR = '#1f2937';

  const { geometry }: Props = $props();
  const input = $derived(geometry.input);

  function mm(value: number) {
    return value * MM_TO_METERS;
  }

  function centeredZ(zMm: number) {
    return (zMm - SCENE_WIDTH_MM / 2) * MM_TO_METERS;
  }

  const baseMembers = $derived.by<MeshSpec[]>(() =>
    geometry.frameMembers.map((member) => {
      const deltaX = member.end.x - member.start.x;
      const deltaZ = member.end.y - member.start.y;

      return {
        id: member.id,
        size: [Math.hypot(deltaX, deltaZ) * MM_TO_METERS, FRAME_THICKNESS, FRAME_THICKNESS],
        position: [
          ((member.start.x + member.end.x) * 0.5) * MM_TO_METERS,
          FRAME_ELEVATION,
          (((member.start.y + member.end.y) * 0.5) - SCENE_WIDTH_MM / 2) * MM_TO_METERS,
        ],
        rotation: [0, -Math.atan2(deltaZ, deltaX), 0],
        color: PROFILE_COLOR,
        metalness: 0.6,
        roughness: 0.32,
      };
    })
  );

  const wheelSupportUprights = $derived.by<MeshSpec[]>(() =>
    geometry.wheelSupportUprights.map((upright) => ({
      id: upright.id,
      size: [FRAME_THICKNESS, mm(upright.heightMm), FRAME_THICKNESS],
      position: [mm(upright.x), mm(upright.heightMm) / 2, centeredZ(upright.y)],
      color: PROFILE_COLOR,
      metalness: 0.62,
      roughness: 0.3,
    }))
  );

  const pedalAssembly = $derived.by<MeshSpec[]>(() => {
    const uprightHeightMm = Math.max(150, input.pedalYMm - input.baseHeightMm + 80);
    const uprightBaseXMm = Math.max(90, input.pedalXMm - 165);
    const pedalLength = 0.25;
    const pedalWidth = 0.27;
    const pedalAngle = input.pedalAngleDeg * (Math.PI / 180);
    const pedalCenterXMm = input.pedalXMm - 45;
    const pedalCenterYMm = input.pedalYMm + 28;

    return [
      {
        id: 'pedal-upright-left',
        size: [FRAME_THICKNESS, mm(uprightHeightMm), FRAME_THICKNESS],
        position: [mm(uprightBaseXMm), mm(input.baseHeightMm + uprightHeightMm / 2), centeredZ(92)],
        color: PROFILE_COLOR,
        metalness: 0.62,
        roughness: 0.3,
      },
      {
        id: 'pedal-upright-right',
        size: [FRAME_THICKNESS, mm(uprightHeightMm - 20), FRAME_THICKNESS],
        position: [mm(uprightBaseXMm + 75), mm(input.baseHeightMm + (uprightHeightMm - 20) / 2), centeredZ(148)],
        color: PROFILE_COLOR,
        metalness: 0.62,
        roughness: 0.3,
      },
      {
        id: 'pedal-cross-member',
        size: [0.11, FRAME_THICKNESS, FRAME_THICKNESS],
        position: [mm(uprightBaseXMm + 38), mm(input.baseHeightMm + uprightHeightMm - 30), centeredZ(120)],
        rotation: [0, 0, -0.1],
        color: PROFILE_SHADE,
        metalness: 0.58,
        roughness: 0.35,
      },
      {
        id: 'pedal-tray',
        size: [pedalLength, 0.016, pedalWidth],
        position: [mm(pedalCenterXMm), mm(pedalCenterYMm), centeredZ(120)],
        rotation: [0, 0, pedalAngle],
        color: PANEL_COLOR,
        metalness: 0.24,
        roughness: 0.5,
      },
      {
        id: 'pedal-tray-side',
        size: [pedalLength - 0.01, 0.008, pedalWidth - 0.035],
        position: [mm(pedalCenterXMm), mm(pedalCenterYMm + 4), centeredZ(120)],
        rotation: [0, 0, pedalAngle],
        color: PANEL_EDGE_COLOR,
        metalness: 0.18,
        roughness: 0.52,
      },
    ];
  });

  const wheelDeck = $derived.by<MeshSpec[]>(() => {
    const supportX = input.wheelXMm + geometry.wheelMountOffsets.mountXMm;
    const supportHeightMm = Math.max(input.baseHeightMm + 80, input.wheelYMm + geometry.wheelMountOffsets.mountYMm);
    const deckLength = 0.24;
    const armLength = 0.24;

    return [
      {
        id: 'wheel-arm',
        size: [armLength, FRAME_THICKNESS, FRAME_THICKNESS],
        position: [mm(supportX + 118), mm(supportHeightMm - 178), 0],
        color: PROFILE_COLOR,
        metalness: 0.62,
        roughness: 0.3,
      },
      {
        id: 'wheel-deck',
        size: [deckLength, FRAME_THICKNESS * 0.9, FRAME_THICKNESS],
        position: [mm(supportX + 108), mm(supportHeightMm - 24), centeredZ(120)],
        rotation: [0, 0, -0.34],
        color: PROFILE_SHADE,
        metalness: 0.58,
        roughness: 0.34,
      },
      {
        id: 'wheel-deck-brace-left',
        size: [0.12, 0.012, FRAME_THICKNESS * 0.7],
        position: [mm(supportX + 56), mm(supportHeightMm - 108), centeredZ(108)],
        rotation: [0, 0, -0.98],
        color: HARDWARE_COLOR,
        metalness: 0.4,
        roughness: 0.46,
      },
      {
        id: 'wheel-deck-brace-right',
        size: [0.12, 0.012, FRAME_THICKNESS * 0.7],
        position: [mm(supportX + 56), mm(supportHeightMm - 108), centeredZ(132)],
        rotation: [0, 0, -0.98],
        color: HARDWARE_COLOR,
        metalness: 0.4,
        roughness: 0.46,
      },
      {
        id: 'wheel-column-link',
        size: [0.2, FRAME_THICKNESS * 0.78, FRAME_THICKNESS * 0.82],
        position: [mm(supportX - 84), mm(input.baseHeightMm + 30), 0],
        color: PROFILE_SHADE,
        metalness: 0.58,
        roughness: 0.35,
      },
    ];
  });

  const seatTray = $derived.by<MeshSpec[]>(() => {
    const supportX = input.wheelXMm + geometry.wheelMountOffsets.mountXMm;
    const trayStartXMm = Math.min(input.baseLengthMm - 260, supportX + 170);
    const trayEndXMm = Math.min(input.baseLengthMm - 70, trayStartXMm + 240);
    const trayCenterXMm = (trayStartXMm + trayEndXMm) / 2;
    const trayLength = mm(trayEndXMm - trayStartXMm);
    const outerZ = 118;
    const innerZ = 150;
    const trayWidth = mm(SCENE_WIDTH_MM - outerZ * 2);
    const trayHeight = mm(input.baseHeightMm + 54);

    return [
      {
        id: 'seat-tray-left',
        size: [trayLength, FRAME_THICKNESS, FRAME_THICKNESS],
        position: [mm(trayCenterXMm), trayHeight, centeredZ(outerZ)],
        color: PROFILE_COLOR,
        metalness: 0.62,
        roughness: 0.3,
      },
      {
        id: 'seat-tray-right',
        size: [trayLength, FRAME_THICKNESS, FRAME_THICKNESS],
        position: [mm(trayCenterXMm), trayHeight, centeredZ(SCENE_WIDTH_MM - outerZ)],
        color: PROFILE_COLOR,
        metalness: 0.62,
        roughness: 0.3,
      },
      {
        id: 'seat-tray-front',
        size: [FRAME_THICKNESS, FRAME_THICKNESS, trayWidth],
        position: [mm(trayStartXMm), trayHeight, 0],
        color: PROFILE_SHADE,
        metalness: 0.58,
        roughness: 0.35,
      },
      {
        id: 'seat-tray-rear',
        size: [FRAME_THICKNESS, FRAME_THICKNESS, trayWidth],
        position: [mm(trayEndXMm), trayHeight, 0],
        color: PROFILE_SHADE,
        metalness: 0.58,
        roughness: 0.35,
      },
      {
        id: 'seat-slider-left',
        size: [trayLength - 0.05, FRAME_THICKNESS * 0.58, FRAME_THICKNESS * 0.65],
        position: [mm(trayCenterXMm), trayHeight + 0.012, centeredZ(innerZ)],
        color: HARDWARE_COLOR,
        metalness: 0.38,
        roughness: 0.44,
      },
      {
        id: 'seat-slider-right',
        size: [trayLength - 0.05, FRAME_THICKNESS * 0.58, FRAME_THICKNESS * 0.65],
        position: [mm(trayCenterXMm), trayHeight + 0.012, centeredZ(SCENE_WIDTH_MM - innerZ)],
        color: HARDWARE_COLOR,
        metalness: 0.38,
        roughness: 0.44,
      },
    ];
  });

  const floorFeet = $derived.by<MeshSpec[]>(() => {
    const footY = -0.012;
    const frontX = mm(input.baseLengthMm - 180);
    const rearX = mm(180);

    return [
      {
        id: 'rear-foot-left',
        size: [0.055, 0.018, 0.028],
        position: [rearX, footY, centeredZ(88)],
        color: RUBBER_COLOR,
        roughness: 0.82,
      },
      {
        id: 'rear-foot-right',
        size: [0.055, 0.018, 0.028],
        position: [rearX, footY, centeredZ(312)],
        color: RUBBER_COLOR,
        roughness: 0.82,
      },
      {
        id: 'front-foot-left',
        size: [0.055, 0.018, 0.028],
        position: [frontX, footY, centeredZ(88)],
        color: RUBBER_COLOR,
        roughness: 0.82,
      },
      {
        id: 'front-foot-right',
        size: [0.055, 0.018, 0.028],
        position: [frontX, footY, centeredZ(312)],
        color: RUBBER_COLOR,
        roughness: 0.82,
      },
    ];
  });

  const wheelPosition = $derived<[number, number, number]>([
    mm(input.wheelXMm + geometry.wheelMountOffsets.wheelCenterOffsetXMm),
    mm(input.wheelYMm + geometry.wheelMountOffsets.wheelCenterOffsetYMm),
    0,
  ]);

  const wheelRotation = $derived<[number, number, number]>([
    0,
    Math.PI / 2,
    input.wheelTiltDeg * (Math.PI / 180),
  ]);

  const allMeshes = $derived([...baseMembers, ...wheelSupportUprights, ...pedalAssembly, ...wheelDeck, ...seatTray, ...floorFeet]);
</script>

{#each allMeshes as mesh (mesh.id)}
  <T.Mesh position={mesh.position} rotation={mesh.rotation ?? [0, 0, 0]}>
    <T.BoxGeometry args={mesh.size} />
    <T.MeshStandardMaterial
      color={mesh.color}
      metalness={mesh.metalness ?? 0.08}
      roughness={mesh.roughness ?? 0.6}
    />
  </T.Mesh>
{/each}

<T.Mesh position={wheelPosition} rotation={wheelRotation}>
  <T.TorusGeometry args={[WHEEL_RADIUS_MM, 0.016, 18, 48]} />
  <T.MeshStandardMaterial color="#0f1113" metalness={0.18} roughness={0.56} />
</T.Mesh>

<T.Mesh position={wheelPosition} rotation={wheelRotation}>
  <T.TorusGeometry args={[0.02, 0.005, 14, 24]} />
  <T.MeshStandardMaterial color="#373c42" metalness={0.42} roughness={0.48} />
</T.Mesh>
