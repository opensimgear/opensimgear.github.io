import {
  Bone,
  Box3,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  SkinnedMesh,
  SphereGeometry,
  Vector3,
} from 'three';

import {
  POSTURE_FOOT_TOE_LENGTH_SHARE,
  POSTURE_HIP_ABOVE_SEAT_MM,
  POSTURE_SHOULDER_ABOVE_HIP_CLEARANCE_MM,
  type PlannerPostureSkeleton,
  type PosturePoint,
} from './posture';
import type { PlannerAnthropometryRatios } from './types';

export const HUMAN_MALE_REALISTIC_MODEL_URL = '/models/aluminum-rig-planner/human-male-realistic.glb';

type HumanBoneName =
  | 'torso'
  | 'head'
  | 'leftUpperArm'
  | 'leftForearm'
  | 'leftHand'
  | 'rightUpperArm'
  | 'rightForearm'
  | 'rightHand'
  | 'leftThigh'
  | 'leftShin'
  | 'leftFoot'
  | 'rightThigh'
  | 'rightShin'
  | 'rightFoot';

type HumanTerminalBoneName = 'torsoTip' | 'headTip' | 'leftHandTip' | 'rightHandTip' | 'leftFootTip' | 'rightFootTip';

type HumanModelBoneName = HumanBoneName | HumanTerminalBoneName;

type HumanRestSegment = {
  name: HumanBoneName;
  start: Vector3;
  end: Vector3;
};

type HumanDebugBoneName =
  | HumanBoneName
  | 'leftClavicle'
  | 'rightClavicle'
  | 'leftPelvis'
  | 'rightPelvis'
  | 'neckConnector';

type HumanRig = {
  boneRigRatios: PlannerAnthropometryRatios | null;
  bones: Map<HumanModelBoneName, Bone>;
  debugOverlay: HumanRigDebugOverlay;
  restBoneLocalPositions: Map<HumanBoneName, Vector3>;
  restBoneLocalQuaternions: Map<HumanBoneName, Quaternion>;
  restBoneLocalScales: Map<HumanBoneName, Vector3>;
  restSegments: Map<HumanBoneName, HumanRestSegment>;
  restBoneWorldMatrices: Map<HumanBoneName, Matrix4>;
  root: Group;
  skinnedMeshes: SkinnedMesh[];
};

export type HumanRigTooltipData = {
  rows: Array<{
    label: string;
    value: string;
  }>;
  title: string;
};

export type HumanRigHoverTooltip = HumanRigTooltipData & {
  screenPosition: [number, number];
};

export type RiggedHumanModel = {
  boneRigRatios: PlannerAnthropometryRatios | null;
  getTooltipTargets: () => Mesh[];
  object: Group;
  applySkeleton: (skeleton: PlannerPostureSkeleton) => void;
  dispose: () => void;
};

type HumanRigDebugOverlay = {
  boneGeometry: BufferGeometry;
  boneHitMeshes: Map<HumanDebugBoneName, Mesh>;
  boneMaterial: MeshBasicMaterial;
  boneMeshes: Map<HumanDebugBoneName, Mesh>;
  group: Group;
  hitMaterial: MeshBasicMaterial;
  jointHitGeometry: SphereGeometry;
  jointHitMeshes: Mesh[];
  jointGeometry: SphereGeometry;
  jointMaterial: MeshBasicMaterial;
  jointMeshes: Mesh[];
};

const HUMAN_BONE_ORDER: HumanBoneName[] = [
  'torso',
  'head',
  'leftUpperArm',
  'leftForearm',
  'leftHand',
  'rightUpperArm',
  'rightForearm',
  'rightHand',
  'leftThigh',
  'leftShin',
  'leftFoot',
  'rightThigh',
  'rightShin',
  'rightFoot',
];
const HUMAN_TERMINAL_BONE_ORDER: HumanTerminalBoneName[] = [
  'torsoTip',
  'headTip',
  'leftHandTip',
  'rightHandTip',
  'leftFootTip',
  'rightFootTip',
];
const HUMAN_DEBUG_BONE_ORDER: HumanDebugBoneName[] = [
  ...HUMAN_BONE_ORDER,
  'leftClavicle',
  'rightClavicle',
  'leftPelvis',
  'rightPelvis',
  'neckConnector',
];
const HUMAN_MODEL_BONE_ORDER: HumanModelBoneName[] = [...HUMAN_BONE_ORDER, ...HUMAN_TERMINAL_BONE_ORDER];
const HUMAN_BONE_END_BONES = {
  torso: 'torsoTip',
  head: 'headTip',
  leftUpperArm: 'leftForearm',
  leftForearm: 'leftHand',
  leftHand: 'leftHandTip',
  rightUpperArm: 'rightForearm',
  rightForearm: 'rightHand',
  rightHand: 'rightHandTip',
  leftThigh: 'leftShin',
  leftShin: 'leftFoot',
  leftFoot: 'leftFootTip',
  rightThigh: 'rightShin',
  rightShin: 'rightFoot',
  rightFoot: 'rightFootTip',
} satisfies Record<HumanBoneName, HumanModelBoneName>;
const MODEL_RATIO_PRECISION = 3;
// The GLB has no eye bone, so estimate eye height from the head-weighted mesh bounds.
const MODEL_EYE_FROM_HEAD_TOP_RATIO = 0.42;
const MODEL_HEAD_SKIN_WEIGHT_THRESHOLD = 0.2;
const DEBUG_BONE_HIT_RADIUS = 0.09;
const DEBUG_BONE_RADIUS = 0.032;
const Y_AXIS = new Vector3(0, 1, 0);
const scratchBoundsSize = new Vector3();
const scratchAngleDirectionA = new Vector3();
const scratchAngleDirectionB = new Vector3();
const scratchRestDirection = new Vector3();
const scratchTargetDirection = new Vector3();
const scratchQuaternion = new Quaternion();
const scratchWorldMatrix = new Matrix4();
const scratchLocalMatrix = new Matrix4();
const scratchRestRotation = new Matrix4();
const scratchParentRotation = new Matrix4();
const scratchParentInverse = new Matrix4();
const scratchRootInverse = new Matrix4();
const scratchParentRigMatrix = new Matrix4();

function toVector3(point: PosturePoint) {
  return new Vector3(point[0], point[1], point[2]);
}

function createSegment(name: HumanBoneName, start: Vector3, end: Vector3): HumanRestSegment {
  return { name, start, end };
}

function toDisplayName(name: string) {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
}

function metersToMm(value: number) {
  return `${Math.round(value * 1000)} mm`;
}

function radiansToDegrees(value: number) {
  return `${Math.round((value * 180) / Math.PI)}°`;
}

function createJointKey(position: Vector3) {
  return position
    .toArray()
    .map((value) => value.toFixed(4))
    .join(',');
}

function formatPosition(position: Vector3) {
  return `x ${metersToMm(position.x)}, y ${metersToMm(position.y)}, z ${metersToMm(position.z)}`;
}

function roundModelRatio(value: number) {
  return Number(value.toFixed(MODEL_RATIO_PRECISION));
}

function getModelBonePosition(bones: Map<HumanModelBoneName, Bone>, name: HumanModelBoneName) {
  const bone = bones.get(name);

  return bone ? bone.getWorldPosition(new Vector3()) : null;
}

function getModelBoneLocalPosition(root: Group, bones: Map<HumanModelBoneName, Bone>, name: HumanModelBoneName) {
  const position = getModelBonePosition(bones, name);

  return position ? root.worldToLocal(position) : null;
}

function getAverageDistance(bones: Map<HumanModelBoneName, Bone>, pairs: Array<[HumanModelBoneName, HumanModelBoneName]>) {
  const distances = pairs
    .map(([start, end]) => {
      const startPosition = getModelBonePosition(bones, start);
      const endPosition = getModelBonePosition(bones, end);

      return startPosition && endPosition ? startPosition.distanceTo(endPosition) : null;
    })
    .filter((distance): distance is number => distance !== null);

  if (distances.length === 0) {
    return null;
  }

  return distances.reduce((total, distance) => total + distance, 0) / distances.length;
}

function getWeightedBoneBounds(skinnedMeshes: SkinnedMesh[], boneName: HumanBoneName, minWeight: number) {
  const bounds = new Box3();
  const vertex = new Vector3();

  for (const mesh of skinnedMeshes) {
    const boneIndex = mesh.skeleton.bones.findIndex((bone) => bone.name === boneName);
    const positions = mesh.geometry.attributes.position;
    const skinIndices = mesh.geometry.attributes.skinIndex;
    const skinWeights = mesh.geometry.attributes.skinWeight;

    if (boneIndex < 0 || !positions || !skinIndices || !skinWeights) {
      continue;
    }

    for (let vertexIndex = 0; vertexIndex < positions.count; vertexIndex += 1) {
      let isWeightedToBone = false;

      for (let skinSlot = 0; skinSlot < skinIndices.itemSize; skinSlot += 1) {
        if (
          skinIndices.getComponent(vertexIndex, skinSlot) === boneIndex &&
          skinWeights.getComponent(vertexIndex, skinSlot) > minWeight
        ) {
          isWeightedToBone = true;
          break;
        }
      }

      if (isWeightedToBone) {
        vertex.fromBufferAttribute(positions, vertexIndex).applyMatrix4(mesh.matrixWorld);
        bounds.expandByPoint(vertex);
      }
    }
  }

  return bounds;
}

function getModelEyeY(skinnedMeshes: SkinnedMesh[]) {
  const headBounds = getWeightedBoneBounds(skinnedMeshes, 'head', MODEL_HEAD_SKIN_WEIGHT_THRESHOLD);

  if (headBounds.isEmpty()) {
    return null;
  }

  const headHeight = headBounds.getSize(new Vector3()).y;

  return headBounds.max.y - headHeight * MODEL_EYE_FROM_HEAD_TOP_RATIO;
}

export function calculateHumanModelBoneRigRatios(root: Group): PlannerAnthropometryRatios | null {
  const bones = new Map<HumanModelBoneName, Bone>();
  const skinnedMeshes: SkinnedMesh[] = [];
  const bounds = new Box3();

  root.updateWorldMatrix(true, true);
  root.traverse((object) => {
    if (object instanceof Bone && isHumanModelBoneName(object.name)) {
      bones.set(object.name, object);
    }

    if (object instanceof SkinnedMesh) {
      skinnedMeshes.push(object);
      bounds.union(new Box3().setFromObject(object));
    }
  });

  if (bounds.isEmpty()) {
    return null;
  }

  const height = bounds.getSize(scratchBoundsSize).y;
  const hip = getModelBonePosition(bones, 'torso');
  const leftShoulder = getModelBonePosition(bones, 'leftUpperArm');
  const rightShoulder = getModelBonePosition(bones, 'rightUpperArm');
  const eyeY = getModelEyeY(skinnedMeshes);
  const upperArmLength = getAverageDistance(bones, [
    ['leftUpperArm', 'leftForearm'],
    ['rightUpperArm', 'rightForearm'],
  ]);
  const forearmHandLength = getAverageDistance(bones, [
    ['leftForearm', 'leftHandTip'],
    ['rightForearm', 'rightHandTip'],
  ]);
  const thighLength = getAverageDistance(bones, [
    ['leftThigh', 'leftShin'],
    ['rightThigh', 'rightShin'],
  ]);
  const lowerLegLength = getAverageDistance(bones, [
    ['leftShin', 'leftFoot'],
    ['rightShin', 'rightFoot'],
  ]);
  const hipBreadth = getAverageDistance(bones, [['leftThigh', 'rightThigh']]);
  const shoulderBreadth = getAverageDistance(bones, [['leftUpperArm', 'rightUpperArm']]);
  const toeReach = getAverageDistance(bones, [
    ['leftFoot', 'leftFootTip'],
    ['rightFoot', 'rightFootTip'],
  ]);

  if (
    height <= 0 ||
    !hip ||
    !leftShoulder ||
    !rightShoulder ||
    eyeY === null ||
    upperArmLength === null ||
    forearmHandLength === null ||
    thighLength === null ||
    lowerLegLength === null ||
    hipBreadth === null ||
    shoulderBreadth === null ||
    toeReach === null
  ) {
    return null;
  }

  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;

  return {
    sittingHeight: roundModelRatio((bounds.max.y - hip.y) / height),
    seatedEyeHeight: roundModelRatio((eyeY - hip.y + (POSTURE_HIP_ABOVE_SEAT_MM * 0.001) / 2) / height),
    seatedShoulderHeight: roundModelRatio(
      (shoulderY - hip.y + POSTURE_SHOULDER_ABOVE_HIP_CLEARANCE_MM * 0.001) / height
    ),
    hipBreadth: roundModelRatio(hipBreadth / height),
    shoulderBreadth: roundModelRatio(shoulderBreadth / height),
    upperArmLength: roundModelRatio(upperArmLength / height),
    forearmHandLength: roundModelRatio(forearmHandLength / height),
    thighLength: roundModelRatio(thighLength / height),
    lowerLegLength: roundModelRatio(lowerLegLength / height),
    footLength: roundModelRatio(toeReach / POSTURE_FOOT_TOE_LENGTH_SHARE / height),
  };
}

function createRestSegmentsFromBones(bones: Map<HumanModelBoneName, Bone>) {
  const segments: HumanRestSegment[] = [];

  for (const name of HUMAN_BONE_ORDER) {
    const start = getModelBonePosition(bones, name);
    const end = getModelBonePosition(bones, HUMAN_BONE_END_BONES[name]);

    if (start && end) {
      segments.push(createSegment(name, start, end));
    }
  }

  return new Map(segments.map((segment) => [segment.name, segment]));
}

function getSegmentDirection(start: Vector3, end: Vector3, target: Vector3) {
  target.copy(end).sub(start);

  if (target.lengthSq() <= 0.000001) {
    target.set(0, 1, 0);
  } else {
    target.normalize();
  }

  return target;
}

function createTargetSegments(skeleton: PlannerPostureSkeleton) {
  const { joints } = skeleton;

  return new Map<HumanBoneName, [Vector3, Vector3]>([
    ['torso', [toVector3(joints.hipCenter), toVector3(joints.neck)]],
    ['head', [toVector3(joints.neck), toVector3(joints.head)]],
    ['leftUpperArm', [toVector3(joints.shoulderLeft), toVector3(joints.elbowLeft)]],
    ['leftForearm', [toVector3(joints.elbowLeft), toVector3(joints.wristLeft)]],
    ['leftHand', [toVector3(joints.wristLeft), toVector3(joints.handLeft)]],
    ['rightUpperArm', [toVector3(joints.shoulderRight), toVector3(joints.elbowRight)]],
    ['rightForearm', [toVector3(joints.elbowRight), toVector3(joints.wristRight)]],
    ['rightHand', [toVector3(joints.wristRight), toVector3(joints.handRight)]],
    ['leftThigh', [toVector3(joints.hipLeft), toVector3(joints.kneeLeft)]],
    ['leftShin', [toVector3(joints.kneeLeft), toVector3(joints.ankleLeft)]],
    ['leftFoot', [toVector3(joints.ankleLeft), toVector3(joints.toeLeft)]],
    ['rightThigh', [toVector3(joints.hipRight), toVector3(joints.kneeRight)]],
    ['rightShin', [toVector3(joints.kneeRight), toVector3(joints.ankleRight)]],
    ['rightFoot', [toVector3(joints.ankleRight), toVector3(joints.toeRight)]],
  ]);
}

function poseBone(
  root: Group,
  bone: Bone,
  restSegment: HumanRestSegment,
  restLocalPosition: Vector3,
  restLocalScale: Vector3,
  restBoneWorldMatrix: Matrix4,
  start: Vector3,
  end: Vector3
) {
  getSegmentDirection(restSegment.start, restSegment.end, scratchRestDirection);
  getSegmentDirection(start, end, scratchTargetDirection);
  scratchQuaternion.setFromUnitVectors(scratchRestDirection, scratchTargetDirection);
  scratchRestRotation.extractRotation(restBoneWorldMatrix);
  scratchWorldMatrix.makeRotationFromQuaternion(scratchQuaternion).multiply(scratchRestRotation);
  scratchRootInverse.copy(root.matrixWorld).invert();

  if (bone.parent instanceof Bone) {
    bone.parent.updateMatrixWorld(true);
    scratchParentRigMatrix.multiplyMatrices(scratchRootInverse, bone.parent.matrixWorld);
    scratchParentRotation.extractRotation(scratchParentRigMatrix);
    scratchParentInverse.copy(scratchParentRotation).invert();
    scratchLocalMatrix.extractRotation(scratchWorldMatrix).premultiply(scratchParentInverse);
    bone.position.copy(restLocalPosition);
    bone.quaternion.setFromRotationMatrix(scratchLocalMatrix);
    bone.scale.copy(restLocalScale);
  } else {
    scratchWorldMatrix.setPosition(start);

    if (bone.parent) {
      scratchParentRigMatrix.multiplyMatrices(scratchRootInverse, bone.parent.matrixWorld);
      scratchParentInverse.copy(scratchParentRigMatrix).invert();
      scratchLocalMatrix.multiplyMatrices(scratchParentInverse, scratchWorldMatrix);
    } else {
      scratchLocalMatrix.copy(scratchWorldMatrix);
    }

    scratchLocalMatrix.decompose(bone.position, bone.quaternion, bone.scale);
    bone.scale.copy(restLocalScale);
  }

  bone.updateMatrixWorld(true);
}

function applyPlannerPose(rig: HumanRig, skeleton: PlannerPostureSkeleton) {
  resetBonesToRestPose(rig);
  rig.root.updateWorldMatrix(true, true);

  const targetSegments = createTargetSegments(skeleton);

  for (const name of HUMAN_BONE_ORDER) {
    const bone = rig.bones.get(name);
    const restLocalPosition = rig.restBoneLocalPositions.get(name);
    const restLocalScale = rig.restBoneLocalScales.get(name);
    const restSegment = rig.restSegments.get(name);
    const restBoneWorldMatrix = rig.restBoneWorldMatrices.get(name);
    const targetSegment = targetSegments.get(name);

    if (!bone || !restLocalPosition || !restLocalScale || !restSegment || !restBoneWorldMatrix || !targetSegment) {
      continue;
    }

    poseBone(
      rig.root,
      bone,
      restSegment,
      restLocalPosition,
      restLocalScale,
      restBoneWorldMatrix,
      targetSegment[0],
      targetSegment[1]
    );
  }

  for (const mesh of rig.skinnedMeshes) {
    mesh.skeleton.update();
    mesh.geometry.computeBoundingSphere();
  }

  rig.root.updateWorldMatrix(true, true);
  updateDebugOverlay(rig.debugOverlay, createDebugSegmentsFromModelBones(rig.root, rig.bones));
}

function resetBonesToRestPose(rig: HumanRig) {
  for (const name of HUMAN_BONE_ORDER) {
    const bone = rig.bones.get(name);
    const position = rig.restBoneLocalPositions.get(name);
    const quaternion = rig.restBoneLocalQuaternions.get(name);
    const scale = rig.restBoneLocalScales.get(name);

    if (!bone || !position || !quaternion || !scale) {
      continue;
    }

    bone.position.copy(position);
    bone.quaternion.copy(quaternion);
    bone.scale.copy(scale);
    bone.updateMatrixWorld(true);
  }
}

function configureObject(object: Object3D) {
  object.frustumCulled = false;

  for (const child of object.children) {
    configureObject(child);
  }
}

function configureMesh(mesh: Mesh) {
  mesh.frustumCulled = false;
  mesh.renderOrder = 0;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.material = new MeshBasicMaterial({
    color: 0xcaa489,
    depthTest: true,
    depthWrite: false,
    opacity: 0.34,
    side: DoubleSide,
    transparent: true,
  });
}

function createDebugOverlay() {
  const group = new Group();
  const boneGeometry = createStartWeightedOctahedronGeometry();
  const jointGeometry = new SphereGeometry(0.018, 16, 10);
  const jointHitGeometry = new SphereGeometry(0.05, 16, 10);
  const boneMaterial = new MeshBasicMaterial({
    color: 0x2563eb,
    depthTest: false,
    depthWrite: false,
    opacity: 0.72,
    transparent: true,
  });
  const jointMaterial = new MeshBasicMaterial({
    color: 0xf97316,
    depthTest: false,
    depthWrite: false,
  });
  const hitMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    depthTest: false,
    depthWrite: false,
    opacity: 0,
    transparent: true,
  });
  const boneMeshes = new Map<HumanDebugBoneName, Mesh>();
  const boneHitMeshes = new Map<HumanDebugBoneName, Mesh>();

  group.name = 'RiggedHumanDebugOverlay';
  group.renderOrder = 1000;

  for (const name of HUMAN_DEBUG_BONE_ORDER) {
    const mesh = new Mesh(boneGeometry, boneMaterial);
    const hitMesh = new Mesh(boneGeometry, hitMaterial);
    mesh.name = `${name}DebugBone`;
    hitMesh.name = `${name}DebugBoneHitTarget`;
    mesh.frustumCulled = false;
    hitMesh.frustumCulled = false;
    mesh.renderOrder = 1000;
    hitMesh.renderOrder = 1002;
    boneMeshes.set(name, mesh);
    boneHitMeshes.set(name, hitMesh);
    group.add(mesh);
    group.add(hitMesh);
  }

  return {
    boneGeometry,
    boneHitMeshes,
    boneMaterial,
    boneMeshes,
    group,
    hitMaterial,
    jointHitGeometry,
    jointHitMeshes: [],
    jointGeometry,
    jointMaterial,
    jointMeshes: [],
  } satisfies HumanRigDebugOverlay;
}

function createStartWeightedOctahedronGeometry() {
  const waistY = 0.22;
  const radius = 0.42;
  const vertices = new Float32Array([
    0,
    0,
    0,
    radius,
    waistY,
    0,
    0,
    waistY,
    radius,
    0,
    0,
    0,
    0,
    waistY,
    radius,
    -radius,
    waistY,
    0,
    0,
    0,
    0,
    -radius,
    waistY,
    0,
    0,
    waistY,
    -radius,
    0,
    0,
    0,
    0,
    waistY,
    -radius,
    radius,
    waistY,
    0,
    0,
    1,
    0,
    0,
    waistY,
    radius,
    radius,
    waistY,
    0,
    0,
    1,
    0,
    -radius,
    waistY,
    0,
    0,
    waistY,
    radius,
    0,
    1,
    0,
    0,
    waistY,
    -radius,
    -radius,
    waistY,
    0,
    0,
    1,
    0,
    radius,
    waistY,
    0,
    0,
    waistY,
    -radius,
  ]);
  const geometry = new BufferGeometry();

  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  return geometry;
}

function getJointAngle(jointPosition: Vector3, connectedSegments: Array<[Vector3, Vector3]>) {
  if (connectedSegments.length < 2) {
    return null;
  }

  let smallestAngle = Number.POSITIVE_INFINITY;

  for (let index = 0; index < connectedSegments.length - 1; index += 1) {
    for (let nextIndex = index + 1; nextIndex < connectedSegments.length; nextIndex += 1) {
      const [startA, endA] = connectedSegments[index];
      const [startB, endB] = connectedSegments[nextIndex];

      scratchAngleDirectionA
        .copy(startA.distanceToSquared(jointPosition) <= endA.distanceToSquared(jointPosition) ? endA : startA)
        .sub(jointPosition)
        .normalize();
      scratchAngleDirectionB
        .copy(startB.distanceToSquared(jointPosition) <= endB.distanceToSquared(jointPosition) ? endB : startB)
        .sub(jointPosition)
        .normalize();

      smallestAngle = Math.min(smallestAngle, scratchAngleDirectionA.angleTo(scratchAngleDirectionB));
    }
  }

  return Number.isFinite(smallestAngle) ? smallestAngle : null;
}

function setTooltip(mesh: Mesh, tooltip: HumanRigTooltipData | null) {
  if (tooltip) {
    mesh.userData.rigTooltip = tooltip;
  } else {
    delete mesh.userData.rigTooltip;
  }
}

function getDebugSegmentJointNames(name: HumanDebugBoneName): [string, string] {
  switch (name) {
    case 'torso':
      return ['hipCenter', 'neck'];
    case 'head':
      return ['neck', 'head'];
    case 'leftUpperArm':
      return ['shoulderLeft', 'elbowLeft'];
    case 'leftForearm':
      return ['elbowLeft', 'wristLeft'];
    case 'leftHand':
      return ['wristLeft', 'handLeft'];
    case 'rightUpperArm':
      return ['shoulderRight', 'elbowRight'];
    case 'rightForearm':
      return ['elbowRight', 'wristRight'];
    case 'rightHand':
      return ['wristRight', 'handRight'];
    case 'leftThigh':
      return ['hipLeft', 'kneeLeft'];
    case 'leftShin':
      return ['kneeLeft', 'ankleLeft'];
    case 'leftFoot':
      return ['ankleLeft', 'toeLeft'];
    case 'rightThigh':
      return ['hipRight', 'kneeRight'];
    case 'rightShin':
      return ['kneeRight', 'ankleRight'];
    case 'rightFoot':
      return ['ankleRight', 'toeRight'];
    case 'neckConnector':
      return ['neck', 'neck'];
    case 'leftClavicle':
      return ['neck', 'shoulderLeft'];
    case 'rightClavicle':
      return ['neck', 'shoulderRight'];
    case 'leftPelvis':
      return ['hipCenter', 'hipLeft'];
    case 'rightPelvis':
      return ['hipCenter', 'hipRight'];
  }
}

function updateDebugOverlay(overlay: HumanRigDebugOverlay, debugSegments: Map<HumanDebugBoneName, [Vector3, Vector3]>) {
  const joints = new Map<string, Vector3>();
  const connectedSegmentsByJoint = new Map<string, Array<[Vector3, Vector3]>>();
  const jointNamesByJoint = new Map<string, Set<string>>();

  for (const [name, segment] of debugSegments) {
    const mesh = overlay.boneMeshes.get(name);
    const hitMesh = overlay.boneHitMeshes.get(name);

    if (!mesh || !hitMesh) {
      continue;
    }

    const [start, end] = segment;
    scratchTargetDirection.copy(end).sub(start);
    const length = scratchTargetDirection.length();

    if (length <= 0.0001) {
      mesh.visible = false;
      hitMesh.visible = false;
      setTooltip(mesh, null);
      setTooltip(hitMesh, null);
    } else {
      const tooltip: HumanRigTooltipData = {
        title: toDisplayName(name),
        rows: [{ label: 'Length', value: metersToMm(length) }],
      };

      mesh.visible = true;
      hitMesh.visible = true;
      scratchTargetDirection.normalize();
      mesh.position.copy(start);
      hitMesh.position.copy(start);
      mesh.quaternion.setFromUnitVectors(Y_AXIS, scratchTargetDirection);
      hitMesh.quaternion.copy(mesh.quaternion);
      mesh.scale.set(DEBUG_BONE_RADIUS, length, DEBUG_BONE_RADIUS);
      hitMesh.scale.set(DEBUG_BONE_HIT_RADIUS, length, DEBUG_BONE_HIT_RADIUS);
      setTooltip(mesh, tooltip);
      setTooltip(hitMesh, tooltip);
    }

    const startKey = createJointKey(start);
    const endKey = createJointKey(end);
    const [startName, endName] = getDebugSegmentJointNames(name);
    joints.set(startKey, start);
    joints.set(endKey, end);
    connectedSegmentsByJoint.set(startKey, [...(connectedSegmentsByJoint.get(startKey) ?? []), segment]);
    connectedSegmentsByJoint.set(endKey, [...(connectedSegmentsByJoint.get(endKey) ?? []), segment]);
    jointNamesByJoint.set(startKey, new Set([...(jointNamesByJoint.get(startKey) ?? []), startName]));
    jointNamesByJoint.set(endKey, new Set([...(jointNamesByJoint.get(endKey) ?? []), endName]));
  }

  const jointPositions = [...joints.values()];

  while (overlay.jointMeshes.length < jointPositions.length) {
    const mesh = new Mesh(overlay.jointGeometry, overlay.jointMaterial);
    const hitMesh = new Mesh(overlay.jointHitGeometry, overlay.hitMaterial);
    mesh.frustumCulled = false;
    hitMesh.frustumCulled = false;
    mesh.renderOrder = 1001;
    hitMesh.renderOrder = 1002;
    overlay.jointMeshes.push(mesh);
    overlay.jointHitMeshes.push(hitMesh);
    overlay.group.add(mesh);
    overlay.group.add(hitMesh);
  }

  overlay.jointMeshes.forEach((mesh, index) => {
    const hitMesh = overlay.jointHitMeshes[index];
    const position = jointPositions[index];
    mesh.visible = Boolean(position);
    hitMesh.visible = Boolean(position);

    if (position) {
      const jointKey = createJointKey(position);
      const jointName = [...(jointNamesByJoint.get(jointKey) ?? [])].map(toDisplayName).join(' / ') || 'Joint';
      const tooltip: HumanRigTooltipData = {
        title: jointName,
        rows: [
          {
            label: 'Angle',
            value: (() => {
              const angle = getJointAngle(position, connectedSegmentsByJoint.get(jointKey) ?? []);
              return angle === null ? 'n/a' : radiansToDegrees(angle);
            })(),
          },
          { label: 'Position', value: formatPosition(position) },
        ],
      };

      mesh.position.copy(position);
      hitMesh.position.copy(position);
      setTooltip(mesh, tooltip);
      setTooltip(hitMesh, tooltip);
    } else {
      setTooltip(mesh, null);
      setTooltip(hitMesh, null);
    }
  });
}

function createDebugSegmentsFromModelBones(root: Group, bones: Map<HumanModelBoneName, Bone>) {
  const debugSegments = new Map<HumanDebugBoneName, [Vector3, Vector3]>();

  for (const name of HUMAN_BONE_ORDER) {
    const start = getModelBoneLocalPosition(root, bones, name);
    const end = getModelBoneLocalPosition(root, bones, HUMAN_BONE_END_BONES[name]);

    if (start && end) {
      debugSegments.set(name, [start, end]);
    }
  }

  const torso = debugSegments.get('torso');
  const head = debugSegments.get('head');
  const leftUpperArm = debugSegments.get('leftUpperArm');
  const rightUpperArm = debugSegments.get('rightUpperArm');
  const leftThigh = debugSegments.get('leftThigh');
  const rightThigh = debugSegments.get('rightThigh');

  if (torso && head) {
    debugSegments.set('neckConnector', [torso[1], head[0]]);
  }

  if (torso && leftUpperArm) {
    debugSegments.set('leftClavicle', [torso[1], leftUpperArm[0]]);
  }

  if (torso && rightUpperArm) {
    debugSegments.set('rightClavicle', [torso[1], rightUpperArm[0]]);
  }

  if (torso && leftThigh) {
    debugSegments.set('leftPelvis', [torso[0], leftThigh[0]]);
  }

  if (torso && rightThigh) {
    debugSegments.set('rightPelvis', [torso[0], rightThigh[0]]);
  }

  return debugSegments;
}

function collectRig(root: Group) {
  const bones = new Map<HumanModelBoneName, Bone>();
  const debugOverlay = createDebugOverlay();
  const skinnedMeshes: SkinnedMesh[] = [];
  const restBoneLocalPositions = new Map<HumanBoneName, Vector3>();
  const restBoneLocalQuaternions = new Map<HumanBoneName, Quaternion>();
  const restBoneLocalScales = new Map<HumanBoneName, Vector3>();
  const restBoneWorldMatrices = new Map<HumanBoneName, Matrix4>();

  root.updateWorldMatrix(true, true);
  root.traverse((object) => {
    configureObject(object);

    if (object instanceof Bone && isHumanModelBoneName(object.name)) {
      bones.set(object.name, object);
    }

    if (object instanceof SkinnedMesh) {
      configureMesh(object);
      skinnedMeshes.push(object);
    }
  });

  root.updateWorldMatrix(true, true);

  const boneRigRatios = calculateHumanModelBoneRigRatios(root);
  const restSegments = createRestSegmentsFromBones(bones);
  root.add(debugOverlay.group);
  updateDebugOverlay(debugOverlay, createDebugSegmentsFromModelBones(root, bones));

  for (const name of HUMAN_BONE_ORDER) {
    const bone = bones.get(name);

    if (bone) {
      restBoneLocalPositions.set(name, bone.position.clone());
      restBoneLocalQuaternions.set(name, bone.quaternion.clone());
      restBoneLocalScales.set(name, bone.scale.clone());
      restBoneWorldMatrices.set(name, bone.matrixWorld.clone());
    }
  }

  return {
    boneRigRatios,
    bones,
    debugOverlay,
    restBoneLocalPositions,
    restBoneLocalQuaternions,
    restBoneLocalScales,
    restSegments,
    restBoneWorldMatrices,
    root,
    skinnedMeshes,
  };
}

function isHumanModelBoneName(name: string): name is HumanModelBoneName {
  return (HUMAN_MODEL_BONE_ORDER as string[]).includes(name);
}

export async function createRiggedHumanModel(
  modelUrl = HUMAN_MALE_REALISTIC_MODEL_URL
): Promise<RiggedHumanModel | null> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync(modelUrl);
  const root = gltf.scene;
  const rig = collectRig(root);

  if (rig.bones.size === 0 || rig.skinnedMeshes.length === 0) {
    return null;
  }

  root.name = 'RiggedHumanMaleRealistic';

  return {
    boneRigRatios: rig.boneRigRatios,
    getTooltipTargets() {
      return [...rig.debugOverlay.boneHitMeshes.values(), ...rig.debugOverlay.jointHitMeshes];
    },
    object: root,
    applySkeleton(plannerSkeleton) {
      applyPlannerPose(rig, plannerSkeleton);
    },
    dispose() {
      rig.debugOverlay.boneGeometry.dispose();
      rig.debugOverlay.jointHitGeometry.dispose();
      rig.debugOverlay.jointGeometry.dispose();
      rig.debugOverlay.boneMaterial.dispose();
      rig.debugOverlay.hitMaterial.dispose();
      rig.debugOverlay.jointMaterial.dispose();

      for (const mesh of rig.skinnedMeshes) {
        mesh.geometry.dispose();

        if (Array.isArray(mesh.material)) {
          for (const material of mesh.material) {
            material.dispose();
          }
        } else {
          mesh.material.dispose();
        }
      }
    },
  };
}
