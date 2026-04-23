import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { BASE_BEAM_HEIGHT_MM, PLANNER_DIMENSION_LIMITS, UPRIGHT_BEAM_DEPTH_MM } from '../constants';
import type { PlannerInput } from '../types';
import { mm, type MeshSpec } from './shared';

const WHEEL_RIM_COLOR = '#111318';
const WHEEL_BASE_COLOR = '#17191d';
const WHEEL_HUB_COLOR = '#1c2026';
const WHEEL_SHAFT_COLOR = '#8f98a3';
const WHEEL_PLASTIC_MATERIAL = {
  metalness: 0.08,
  roughness: 0.78,
} as const;
const WHEEL_METAL_MATERIAL = {
  metalness: 0.82,
  roughness: 0.24,
} as const;
const CYLINDER_SEGMENTS = 24;
const TORUS_RADIAL_SEGMENTS = 18;
const TORUS_TUBULAR_SEGMENTS = 36;
const WORLD_Z_AXIS = new Vector3(0, 0, 1);
const WHEEL_TUBE_RADIUS_MM = 16;
const WHEEL_BASE_EDGE_MM = 115;
const WHEEL_BASE_FRONT_FACE_OFFSET_MM = 67;
const WHEEL_CONNECTOR_RADIUS_MM = 14;
const WHEEL_HUB_RADIUS_MM = 24;
const WHEEL_HUB_THICKNESS_MM = 9;
const WHEEL_SPOKE_WIDTH_MM = 6;
const WHEEL_SPOKE_THICKNESS_MM = 20;
const WHEEL_SPOKE_LENGTH_SCALE = 1.05;
const WHEEL_SPOKE_CORNER_RADIUS_MM = 0.75;
const WHEEL_SPOKE_ANGLE_OFFSETS_DEG = [180, -90, 0] as const;
const WHEEL_SPOKE_IDS = ['left', 'center', 'right'] as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function rotateLocalOffset([x, y, z]: [number, number, number], angleRad: number): [number, number, number] {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return [x * cos - y * sin, x * sin + y * cos, z];
}

function createRotationFromBasis(xAxis: Vector3, yAxis: Vector3, zAxis: Vector3): [number, number, number] {
  const rotation = new Euler().setFromQuaternion(
    new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(xAxis.clone().normalize(), yAxis.clone().normalize(), zAxis.clone().normalize())
    )
  );

  return [rotation.x, rotation.y, rotation.z];
}

function createWheelPlaneDirection(wheelSide: Vector3, angleRad: number) {
  return wheelSide
    .clone()
    .multiplyScalar(Math.sin(angleRad))
    .add(WORLD_Z_AXIS.clone().multiplyScalar(-Math.cos(angleRad)))
    .normalize();
}

function createWheelCenter(input: PlannerInput): [number, number, number] {
  const steeringColumnCenterXmm = input.seatBaseDepthMm + input.steeringColumnDistanceMm + UPRIGHT_BEAM_DEPTH_MM;
  const wheelCenterXmm = steeringColumnCenterXmm + input.wheelDistanceFromSteeringColumnMm;
  const wheelCenterYmm = BASE_BEAM_HEIGHT_MM + input.steeringColumnBaseHeightMm + input.wheelHeightOffsetMm;

  return [mm(wheelCenterXmm), mm(wheelCenterYmm), 0];
}

export function createWheelModule(input: PlannerInput): MeshSpec[] {
  const wheelCenter = createWheelCenter(input);
  const wheelAngleRad = toRad(-input.wheelAngleDeg);
  const wheelDiameterMm = clamp(
    input.wheelDiameterMm,
    PLANNER_DIMENSION_LIMITS.wheelDiameterMinMm,
    PLANNER_DIMENSION_LIMITS.wheelDiameterMaxMm
  );
  const wheelOuterRadiusMm = wheelDiameterMm / 2;
  const tubeRadiusMm = WHEEL_TUBE_RADIUS_MM;
  const torusRadiusMm = wheelOuterRadiusMm - tubeRadiusMm;
  const baseEdgeMm = WHEEL_BASE_EDGE_MM;
  const baseFrontFaceOffsetMm = WHEEL_BASE_FRONT_FACE_OFFSET_MM;
  const connectorLengthMm = baseFrontFaceOffsetMm;
  const connectorRadiusMm = WHEEL_CONNECTOR_RADIUS_MM;
  const hubRadiusMm = Math.min(WHEEL_HUB_RADIUS_MM, torusRadiusMm - tubeRadiusMm * 1.75);
  const hubThicknessMm = WHEEL_HUB_THICKNESS_MM;
  const rimInnerRadiusMm = torusRadiusMm - tubeRadiusMm;
  const spokeOuterRadiusMm = rimInnerRadiusMm + tubeRadiusMm * 0.4;
  const spokeSpanMm = Math.max(tubeRadiusMm, spokeOuterRadiusMm - hubRadiusMm);
  const spokeLengthMm = spokeSpanMm * WHEEL_SPOKE_LENGTH_SCALE;
  const baseCenterOffset = rotateLocalOffset([mm(baseFrontFaceOffsetMm + baseEdgeMm / 2), 0, 0], wheelAngleRad);
  const connectorCenterOffset = rotateLocalOffset([mm(connectorLengthMm / 2), 0, 0], wheelAngleRad);
  const wheelAxis = new Vector3(Math.cos(wheelAngleRad), Math.sin(wheelAngleRad), 0).normalize();
  const wheelSide = new Vector3(-wheelAxis.y, wheelAxis.x, 0).normalize();
  const torusRotation = createRotationFromBasis(wheelSide, WORLD_Z_AXIS, wheelAxis);
  const hubRotation = [0, 0, wheelAngleRad + Math.PI / 2] as [number, number, number];
  const spokes: MeshSpec[] = WHEEL_SPOKE_ANGLE_OFFSETS_DEG.map((angleDeg, index) => {
    const radialDirection = createWheelPlaneDirection(wheelSide, toRad(angleDeg));
    const spokeCenterDistanceMeters = mm(hubRadiusMm + spokeSpanMm / 2);
    const spokeCenter = new Vector3(...wheelCenter).add(
      radialDirection.clone().multiplyScalar(spokeCenterDistanceMeters)
    );
    const spokeWidthDirection = radialDirection.clone().cross(wheelAxis).normalize();

    return {
      id: `wheel-spoke-${WHEEL_SPOKE_IDS[index]}`,
      position: [spokeCenter.x, spokeCenter.y, spokeCenter.z] as [number, number, number],
      size: [mm(spokeLengthMm), mm(WHEEL_SPOKE_THICKNESS_MM), mm(WHEEL_SPOKE_WIDTH_MM)] as [number, number, number],
      rotation: createRotationFromBasis(radialDirection, spokeWidthDirection.clone().negate(), wheelAxis),
      materialKind: 'plastic',
      color: WHEEL_HUB_COLOR,
      metalness: WHEEL_PLASTIC_MATERIAL.metalness,
      roughness: WHEEL_PLASTIC_MATERIAL.roughness,
      cornerRadius: mm(WHEEL_SPOKE_CORNER_RADIUS_MM),
      cornerSegments: 2,
    };
  });

  return [
    {
      id: 'wheel-rim',
      position: wheelCenter,
      size: [mm(wheelDiameterMm), mm(wheelDiameterMm), mm(tubeRadiusMm * 2)] as [number, number, number],
      rotation: torusRotation,
      shape: 'torus',
      torusRadius: mm(torusRadiusMm),
      torusTubeRadius: mm(tubeRadiusMm),
      torusRadialSegments: TORUS_RADIAL_SEGMENTS,
      torusTubularSegments: TORUS_TUBULAR_SEGMENTS,
      materialKind: 'plastic',
      color: WHEEL_RIM_COLOR,
      metalness: WHEEL_PLASTIC_MATERIAL.metalness,
      roughness: WHEEL_PLASTIC_MATERIAL.roughness,
    },
    {
      id: 'wheel-hub',
      position: wheelCenter,
      size: [mm(hubThicknessMm), mm(hubRadiusMm * 2), mm(hubRadiusMm * 2)] as [number, number, number],
      rotation: hubRotation,
      shape: 'cylinder',
      cylinderRadiusTop: mm(hubRadiusMm),
      cylinderRadiusBottom: mm(hubRadiusMm),
      cylinderRadialSegments: CYLINDER_SEGMENTS,
      materialKind: 'plastic',
      color: WHEEL_HUB_COLOR,
      metalness: WHEEL_PLASTIC_MATERIAL.metalness,
      roughness: 0.58,
    },
    ...spokes,
    {
      id: 'wheel-base',
      position: [
        wheelCenter[0] + baseCenterOffset[0],
        wheelCenter[1] + baseCenterOffset[1],
        wheelCenter[2] + baseCenterOffset[2],
      ] as [number, number, number],
      size: [mm(baseEdgeMm), mm(baseEdgeMm), mm(baseEdgeMm)] as [number, number, number],
      rotation: [0, 0, wheelAngleRad] as [number, number, number],
      materialKind: 'plastic',
      color: WHEEL_BASE_COLOR,
      metalness: WHEEL_PLASTIC_MATERIAL.metalness,
      roughness: 0.5,
      cornerRadius: mm(10),
      cornerSegments: 6,
    },
    {
      id: 'wheel-connector',
      position: [
        wheelCenter[0] + connectorCenterOffset[0],
        wheelCenter[1] + connectorCenterOffset[1],
        wheelCenter[2] + connectorCenterOffset[2],
      ] as [number, number, number],
      size: [mm(connectorLengthMm), mm(connectorRadiusMm * 2), mm(connectorRadiusMm * 2)] as [number, number, number],
      rotation: [0, 0, wheelAngleRad + Math.PI / 2] as [number, number, number],
      shape: 'cylinder',
      cylinderRadiusTop: mm(connectorRadiusMm),
      cylinderRadiusBottom: mm(connectorRadiusMm),
      cylinderRadialSegments: CYLINDER_SEGMENTS,
      materialKind: 'metal',
      color: WHEEL_SHAFT_COLOR,
      metalness: WHEEL_METAL_MATERIAL.metalness,
      roughness: WHEEL_METAL_MATERIAL.roughness,
    },
  ];
}
