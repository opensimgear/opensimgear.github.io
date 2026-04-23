import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { BASE_BEAM_HEIGHT_MM, PLANNER_DIMENSION_LIMITS, UPRIGHT_BEAM_DEPTH_MM } from '../constants';
import type { PlannerInput } from '../types';
import { mm, type MeshSpec } from './shared';

const WHEEL_RIM_COLOR = '#111318';
const WHEEL_BASE_COLOR = '#17191d';
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
  const baseCenterOffset = rotateLocalOffset([mm(baseFrontFaceOffsetMm + baseEdgeMm / 2), 0, 0], wheelAngleRad);
  const connectorCenterOffset = rotateLocalOffset([mm(connectorLengthMm / 2), 0, 0], wheelAngleRad);
  const wheelAxis = new Vector3(Math.cos(wheelAngleRad), Math.sin(wheelAngleRad), 0).normalize();
  const wheelSide = new Vector3(-wheelAxis.y, wheelAxis.x, 0).normalize();
  const torusRotation = new Euler().setFromQuaternion(
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(wheelSide, WORLD_Z_AXIS, wheelAxis))
  );

  return [
    {
      id: 'wheel-rim',
      position: wheelCenter,
      size: [mm(wheelDiameterMm), mm(wheelDiameterMm), mm(tubeRadiusMm * 2)] as [number, number, number],
      rotation: [torusRotation.x, torusRotation.y, torusRotation.z] as [number, number, number],
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
