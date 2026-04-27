/**
 * Wheel module – generates 3D mesh specs for the steering wheel (rim, hub, spokes, base, shaft).
 */

import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { PLANNER_DIMENSION_LIMITS } from '../constants/planner';
import { BASE_BEAM_HEIGHT_MM, UPRIGHT_BEAM_DEPTH_MM } from '../constants/profile';
import {
  WHEEL_BASE_COLOR,
  WHEEL_BASE_CORNER_RADIUS_MM,
  WHEEL_BASE_CORNER_SEGMENTS,
  WHEEL_BASE_EDGE_MM,
  WHEEL_BASE_FRONT_FACE_OFFSET_MM,
  WHEEL_BASE_ROUGHNESS,
  WHEEL_CONNECTOR_BBOX_FACTOR,
  WHEEL_CONNECTOR_RADIUS_MM,
  WHEEL_CYLINDER_SEGMENTS,
  WHEEL_HUB_COLOR,
  WHEEL_HUB_RADIUS_INSET_FACTOR,
  WHEEL_HUB_RADIUS_MM,
  WHEEL_HUB_ROUGHNESS,
  WHEEL_HUB_THICKNESS_MM,
  WHEEL_METAL_MATERIAL,
  WHEEL_PLASTIC_MATERIAL,
  WHEEL_RIM_COLOR,
  WHEEL_SHAFT_COLOR,
  WHEEL_SPOKE_ANGLE_OFFSETS_DEG,
  WHEEL_SPOKE_CORNER_RADIUS_MM,
  WHEEL_SPOKE_CORNER_SEGMENTS,
  WHEEL_SPOKE_IDS,
  WHEEL_SPOKE_LENGTH_SCALE,
  WHEEL_SPOKE_OUTER_RADIUS_FACTOR,
  WHEEL_SPOKE_THICKNESS_MM,
  WHEEL_SPOKE_WIDTH_MM,
  WHEEL_TORUS_RADIAL_SEGMENTS,
  WHEEL_TORUS_TUBULAR_SEGMENTS,
  WHEEL_TUBE_RADIUS_MM,
} from '../constants/wheel';
import type { PlannerInput } from '../types';
import { clamp, mm, toRad } from './math';
import type { MeshSpec } from './shared';

const WORLD_Y_AXIS = new Vector3(0, -1, 0);
const CYLINDER_AXIS = new Vector3(0, 1, 0);

/** Rotate a point in the XZ plane (Y unchanged). */
function rotateVerticalOffset([x, y, z]: [number, number, number], angleRad: number): [number, number, number] {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return [x * cos - z * sin, y, x * sin + z * cos];
}

/** Build a rotation from three orthonormal basis vectors using quaternion extraction. */
function createRotationFromBasis(xAxis: Vector3, yAxis: Vector3, zAxis: Vector3): [number, number, number] {
  const rotation = new Euler().setFromQuaternion(
    new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(xAxis.clone().normalize(), yAxis.clone().normalize(), zAxis.clone().normalize())
    )
  );

  return [rotation.x, rotation.y, rotation.z];
}

/** Build a rotation that aligns `from` to `to` direction. */
function createRotationFromDirection(from: Vector3, to: Vector3): [number, number, number] {
  const rotation = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(from, to.clone().normalize()));

  return [rotation.x, rotation.y, rotation.z];
}

/** Get a direction on the wheel plane at a given angle. */
function createWheelPlaneDirection(wheelSide: Vector3, angleRad: number) {
  return wheelSide
    .clone()
    .multiplyScalar(Math.sin(angleRad))
    .add(WORLD_Y_AXIS.clone().multiplyScalar(-Math.cos(angleRad)))
    .normalize();
}

/** Compute the center position of the steering wheel in scene space. */
function createWheelCenter(input: PlannerInput): [number, number, number] {
  const steeringColumnCenterXmm = input.seatBaseDepthMm + input.steeringColumnDistanceMm + UPRIGHT_BEAM_DEPTH_MM;
  const wheelCenterXmm = steeringColumnCenterXmm + input.wheelDistanceFromSteeringColumnMm;
  const wheelCenterZmm = BASE_BEAM_HEIGHT_MM + input.steeringColumnBaseHeightMm + input.wheelHeightOffsetMm;

  return [mm(wheelCenterXmm), 0, mm(wheelCenterZmm)];
}

/** Generate the full set of steering wheel mesh specs. */
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
  const connectorLengthMm = baseFrontFaceOffsetMm * 2;
  const connectorRadiusMm = WHEEL_CONNECTOR_RADIUS_MM;
  const hubRadiusMm = Math.min(WHEEL_HUB_RADIUS_MM, torusRadiusMm - tubeRadiusMm * WHEEL_HUB_RADIUS_INSET_FACTOR);
  const hubThicknessMm = WHEEL_HUB_THICKNESS_MM;
  const rimInnerRadiusMm = torusRadiusMm - tubeRadiusMm;
  const spokeOuterRadiusMm = rimInnerRadiusMm + tubeRadiusMm * WHEEL_SPOKE_OUTER_RADIUS_FACTOR;
  const spokeSpanMm = Math.max(tubeRadiusMm, spokeOuterRadiusMm - hubRadiusMm);
  const spokeLengthMm = spokeSpanMm * WHEEL_SPOKE_LENGTH_SCALE;
  const connectorCenterOffset = rotateVerticalOffset([mm(connectorLengthMm / 2), 0, 0], wheelAngleRad);
  const baseCenterOffset = rotateVerticalOffset([mm(connectorLengthMm + baseEdgeMm / 2), 0, 0], wheelAngleRad);
  const wheelAxis = new Vector3(Math.cos(wheelAngleRad), 0, Math.sin(wheelAngleRad)).normalize();
  const wheelSide = new Vector3(-wheelAxis.z, 0, wheelAxis.x).normalize();
  const torusRotation = createRotationFromBasis(wheelSide, WORLD_Y_AXIS, wheelAxis);
  const hubRotation = createRotationFromDirection(CYLINDER_AXIS, wheelAxis);
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
      materialKind: 'plastic' as const,
      color: WHEEL_HUB_COLOR,
      metalness: WHEEL_PLASTIC_MATERIAL.metalness,
      roughness: WHEEL_PLASTIC_MATERIAL.roughness,
      cornerRadius: mm(WHEEL_SPOKE_CORNER_RADIUS_MM),
      cornerSegments: WHEEL_SPOKE_CORNER_SEGMENTS,
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
      torusRadialSegments: WHEEL_TORUS_RADIAL_SEGMENTS,
      torusTubularSegments: WHEEL_TORUS_TUBULAR_SEGMENTS,
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
      cylinderRadialSegments: WHEEL_CYLINDER_SEGMENTS,
      materialKind: 'plastic',
      color: WHEEL_HUB_COLOR,
      metalness: WHEEL_PLASTIC_MATERIAL.metalness,
      roughness: WHEEL_HUB_ROUGHNESS,
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
      rotation: [0, -wheelAngleRad, 0] as [number, number, number],
      materialKind: 'plastic',
      color: WHEEL_BASE_COLOR,
      metalness: WHEEL_PLASTIC_MATERIAL.metalness,
      roughness: WHEEL_BASE_ROUGHNESS,
      cornerRadius: mm(WHEEL_BASE_CORNER_RADIUS_MM),
      cornerSegments: WHEEL_BASE_CORNER_SEGMENTS,
    },
    {
      id: 'wheel-connector',
      position: [
        wheelCenter[0] + connectorCenterOffset[0],
        wheelCenter[1] + connectorCenterOffset[1],
        wheelCenter[2] + connectorCenterOffset[2],
      ] as [number, number, number],
      size: [
        mm(connectorLengthMm),
        mm(connectorRadiusMm * WHEEL_CONNECTOR_BBOX_FACTOR),
        mm(connectorRadiusMm * WHEEL_CONNECTOR_BBOX_FACTOR),
      ] as [number, number, number],
      rotation: hubRotation,
      shape: 'cylinder',
      cylinderRadiusTop: mm(connectorRadiusMm),
      cylinderRadiusBottom: mm(connectorRadiusMm),
      cylinderRadialSegments: WHEEL_CYLINDER_SEGMENTS,
      materialKind: 'metal',
      color: WHEEL_SHAFT_COLOR,
      metalness: WHEEL_METAL_MATERIAL.metalness,
      roughness: WHEEL_METAL_MATERIAL.roughness,
    },
  ];
}
