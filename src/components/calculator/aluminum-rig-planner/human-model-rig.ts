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
  POSTURE_SHOULDER_ABOVE_HIP_CLEARANCE_MM,
  type PlannerPostureSkeleton,
  type PostureJointName,
  type PosturePoint,
} from './posture';
import type { PlannerAnthropometryRatios, PlannerPostureModelMetrics } from './types';

export const HUMAN_MALE_REALISTIC_MODEL_URL = '/models/aluminum-rig-planner/human-male-realistic.glb';
export type HumanModelPostureModel = PlannerPostureModelMetrics;

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
  | 'leftTalon'
  | 'leftFoot'
  | 'leftToe'
  | 'rightThigh'
  | 'rightShin'
  | 'rightTalon'
  | 'rightFoot'
  | 'rightToe';

type HumanTerminalBoneName =
  | 'neck'
  | 'headTip'
  | 'leftHandTip'
  | 'rightHandTip'
  | 'leftTalonTip'
  | 'rightTalonTip'
  | 'leftToeTip'
  | 'rightToeTip';

type HumanModelAuxiliaryBoneName = 'eyeCenter';

type HumanModelBoneName = HumanBoneName | HumanTerminalBoneName | HumanModelAuxiliaryBoneName;

type HumanRestSegment = {
  name: HumanBoneName;
  start: Vector3;
  end: Vector3;
};
type HumanRestBonePose = {
  localPosition: Vector3;
  localScale: Vector3;
  segment: HumanRestSegment;
  worldMatrix: Matrix4;
};

type HumanDebugBoneName =
  | HumanBoneName
  | 'leftClavicle'
  | 'rightClavicle'
  | 'leftPelvis'
  | 'rightPelvis'
  | 'neckConnector';

type HumanRig = {
  bones: Map<HumanModelBoneName, Bone>;
  debugOverlay: HumanRigDebugOverlay;
  postureModelMetrics: PlannerPostureModelMetrics | null;
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
  getTooltipTargets: () => Mesh[];
  object: Group;
  postureModelMetrics: PlannerPostureModelMetrics;
  applySkeleton: (skeleton: PlannerPostureSkeleton, modelScale: number) => void;
  setDisplayOptions: (showModel: boolean, showSkeleton: boolean) => void;
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
  'leftTalon',
  'leftFoot',
  'leftToe',
  'rightThigh',
  'rightShin',
  'rightTalon',
  'rightFoot',
  'rightToe',
];
const HUMAN_TERMINAL_BONE_ORDER: HumanTerminalBoneName[] = [
  'neck',
  'headTip',
  'leftHandTip',
  'rightHandTip',
  'leftTalonTip',
  'rightTalonTip',
  'leftToeTip',
  'rightToeTip',
];
const HUMAN_MODEL_AUXILIARY_BONE_ORDER: HumanModelAuxiliaryBoneName[] = ['eyeCenter'];
const HUMAN_DEBUG_BONE_ORDER: HumanDebugBoneName[] = [
  ...HUMAN_BONE_ORDER,
  'leftClavicle',
  'rightClavicle',
  'leftPelvis',
  'rightPelvis',
  'neckConnector',
];
const HUMAN_MODEL_BONE_ORDER: HumanModelBoneName[] = [
  ...HUMAN_BONE_ORDER,
  ...HUMAN_TERMINAL_BONE_ORDER,
  ...HUMAN_MODEL_AUXILIARY_BONE_ORDER,
];
const HUMAN_TARGET_START_BONE_NAMES = new Set<HumanBoneName>([
  'leftTalon',
  'leftFoot',
  'leftToe',
  'rightTalon',
  'rightFoot',
  'rightToe',
]);
const HUMAN_BONE_END_BONES = {
  torso: 'neck',
  head: 'headTip',
  leftUpperArm: 'leftForearm',
  leftForearm: 'leftHand',
  leftHand: 'leftHandTip',
  rightUpperArm: 'rightForearm',
  rightForearm: 'rightHand',
  rightHand: 'rightHandTip',
  leftThigh: 'leftShin',
  leftShin: 'leftTalon',
  leftTalon: 'leftTalonTip',
  leftFoot: 'leftToe',
  leftToe: 'leftToeTip',
  rightThigh: 'rightShin',
  rightShin: 'rightTalon',
  rightTalon: 'rightTalonTip',
  rightFoot: 'rightToe',
  rightToe: 'rightToeTip',
} satisfies Record<HumanBoneName, HumanModelBoneName>;
const MODEL_RATIO_PRECISION = 3;
const BONE_LENGTH_EPSILON = 0.000001;
const DEBUG_BONE_HIT_RADIUS = 0.09;
const DEBUG_BONE_RADIUS = 0.032;
const ZERO_VECTOR = new Vector3(0, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
const scratchBoundsSize = new Vector3();
const scratchAngleDirectionA = new Vector3();
const scratchAngleDirectionB = new Vector3();
const scratchRestDirection = new Vector3();
const scratchTargetDirection = new Vector3();
const scratchWorldPosition = new Vector3();
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

function plannerZUpToModelYUp(point: PosturePoint): PosturePoint {
  return [point[0], point[2], -point[1]];
}

function modelYUpToPlannerZUp(point: Vector3): PosturePoint {
  return [point.x, -point.z, point.y];
}

function toModelVector3(point: PosturePoint) {
  return toVector3(plannerZUpToModelYUp(point));
}

function createSegment(name: HumanBoneName, start: Vector3, end: Vector3): HumanRestSegment {
  return { name, start, end };
}

function toDisplayName(name: string) {
  if (name === 'leftTalon') {
    return 'Left heel';
  }

  if (name === 'rightTalon') {
    return 'Right heel';
  }

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

function formatPosition(position: Vector3, modelScale = 1, scaleOrigin: Vector3 = ZERO_VECTOR) {
  const x = scaleOrigin.x + (position.x - scaleOrigin.x) * modelScale;
  const y = scaleOrigin.y + (position.y - scaleOrigin.y) * modelScale;
  const z = scaleOrigin.z + (position.z - scaleOrigin.z) * modelScale;
  const plannerPosition = modelYUpToPlannerZUp(new Vector3(x, y, z));

  return `x ${metersToMm(plannerPosition[0])}, y ${metersToMm(plannerPosition[1])}, z ${metersToMm(plannerPosition[2])}`;
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

function getAverageDistance(
  bones: Map<HumanModelBoneName, Bone>,
  pairs: Array<[HumanModelBoneName, HumanModelBoneName]>
) {
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

function getAverageVerticalDistance(
  bones: Map<HumanModelBoneName, Bone>,
  pairs: Array<[HumanModelBoneName, HumanModelBoneName]>
) {
  const distances = pairs
    .map(([start, end]) => {
      const startPosition = getModelBonePosition(bones, start);
      const endPosition = getModelBonePosition(bones, end);

      return startPosition && endPosition ? Math.abs(startPosition.y - endPosition.y) : null;
    })
    .filter((distance): distance is number => distance !== null);

  if (distances.length === 0) {
    return null;
  }

  return distances.reduce((total, distance) => total + distance, 0) / distances.length;
}

function getTalonPoint(_ankle: PosturePoint, heel: PosturePoint, _toe: PosturePoint) {
  return [...heel] satisfies PosturePoint;
}

function collectHumanModelBonesAndBounds(root: Group) {
  const bones = new Map<HumanModelBoneName, Bone>();
  const bounds = new Box3();

  root.updateWorldMatrix(true, true);
  root.traverse((object) => {
    if (object instanceof Bone && isHumanModelBoneName(object.name)) {
      bones.set(object.name, object);
    }

    if (object instanceof SkinnedMesh) {
      bounds.union(new Box3().setFromObject(object));
    }
  });

  return { bones, bounds };
}

export function calculateHumanModelPostureModel(root: Group): HumanModelPostureModel | null {
  const { bones, bounds } = collectHumanModelBonesAndBounds(root);

  if (bounds.isEmpty()) {
    return null;
  }

  const height = bounds.getSize(scratchBoundsSize).y;
  const hip = getModelBonePosition(bones, 'torso');
  const leftShoulder = getModelBonePosition(bones, 'leftUpperArm');
  const rightShoulder = getModelBonePosition(bones, 'rightUpperArm');
  const eyeCenter = getModelBonePosition(bones, 'eyeCenter');
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
    ['leftShin', 'leftTalon'],
    ['rightShin', 'rightTalon'],
  ]);
  const heelLength = getAverageVerticalDistance(bones, [
    ['leftTalon', 'leftTalonTip'],
    ['rightTalon', 'rightTalonTip'],
  ]);
  const hipBreadth = getAverageDistance(bones, [['leftThigh', 'rightThigh']]);
  const shoulderBreadth = getAverageDistance(bones, [['leftUpperArm', 'rightUpperArm']]);
  const toeLength = getAverageDistance(bones, [
    ['leftTalonTip', 'leftToeTip'],
    ['rightTalonTip', 'rightToeTip'],
  ]);

  if (
    height <= 0 ||
    !hip ||
    !leftShoulder ||
    !rightShoulder ||
    !eyeCenter ||
    upperArmLength === null ||
    forearmHandLength === null ||
    thighLength === null ||
    lowerLegLength === null ||
    heelLength === null ||
    hipBreadth === null ||
    shoulderBreadth === null ||
    toeLength === null
  ) {
    return null;
  }

  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const footLength = heelLength + toeLength;
  const anthropometryRatios = {
    sittingHeight: roundModelRatio((bounds.max.y - hip.y) / height),
    seatedShoulderHeight: roundModelRatio(
      (shoulderY - hip.y + POSTURE_SHOULDER_ABOVE_HIP_CLEARANCE_MM * 0.001) / height
    ),
    hipBreadth: roundModelRatio(hipBreadth / height),
    shoulderBreadth: roundModelRatio(shoulderBreadth / height),
    upperArmLength: roundModelRatio(upperArmLength / height),
    forearmHandLength: roundModelRatio(forearmHandLength / height),
    thighLength: roundModelRatio(thighLength / height),
    lowerLegLength: roundModelRatio(lowerLegLength / height),
    footLength: roundModelRatio(footLength / height),
  };

  return {
    anthropometryRatios,
    eyeCenterForwardFromHip: roundModelRatio((eyeCenter.x - hip.x) / height),
    eyeCenterHeightFromHip: roundModelRatio((eyeCenter.y - hip.y) / height),
    eyeCenterSittingHeight: roundModelRatio((eyeCenter.y - hip.y) / height),
    heelLengthShare: roundModelRatio(heelLength / footLength),
  };
}

export function calculateHumanModelBoneRigRatios(root: Group): PlannerAnthropometryRatios | null {
  return calculateHumanModelPostureModel(root)?.anthropometryRatios ?? null;
}

function createRestBonePosesFromModel(bones: Map<HumanModelBoneName, Bone>) {
  const poses: Array<[HumanBoneName, HumanRestBonePose]> = [];

  for (const name of HUMAN_BONE_ORDER) {
    const bone = bones.get(name);
    const start = getModelBonePosition(bones, name);
    const end = getModelBonePosition(bones, HUMAN_BONE_END_BONES[name]);

    if (bone && start && end) {
      poses.push([
        name,
        {
          localPosition: bone.position.clone(),
          localScale: bone.scale.clone(),
          segment: createSegment(name, start, end),
          worldMatrix: bone.matrixWorld.clone(),
        },
      ]);
    }
  }

  return new Map(poses);
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
  const leftTalon = getTalonPoint(joints.ankleLeft, joints.heelLeft, joints.toeLeft);
  const rightTalon = getTalonPoint(joints.ankleRight, joints.heelRight, joints.toeRight);

  return new Map<HumanBoneName, [Vector3, Vector3]>([
    ['torso', [toModelVector3(joints.hipCenter), toModelVector3(joints.shoulderCenter)]],
    ['head', [toModelVector3(joints.neck), toModelVector3(joints.head)]],
    ['leftUpperArm', [toModelVector3(joints.shoulderLeft), toModelVector3(joints.elbowLeft)]],
    ['leftForearm', [toModelVector3(joints.elbowLeft), toModelVector3(joints.wristLeft)]],
    ['leftHand', [toModelVector3(joints.wristLeft), toModelVector3(joints.handLeft)]],
    ['rightUpperArm', [toModelVector3(joints.shoulderRight), toModelVector3(joints.elbowRight)]],
    ['rightForearm', [toModelVector3(joints.elbowRight), toModelVector3(joints.wristRight)]],
    ['rightHand', [toModelVector3(joints.wristRight), toModelVector3(joints.handRight)]],
    ['leftThigh', [toModelVector3(joints.hipLeft), toModelVector3(joints.kneeLeft)]],
    ['leftShin', [toModelVector3(joints.kneeLeft), toModelVector3(joints.ankleLeft)]],
    ['leftTalon', [toModelVector3(joints.ankleLeft), toModelVector3(leftTalon)]],
    ['leftFoot', [toModelVector3(joints.ankleLeft), toModelVector3(joints.toeStartLeft)]],
    ['leftToe', [toModelVector3(joints.toeStartLeft), toModelVector3(joints.toeLeft)]],
    ['rightThigh', [toModelVector3(joints.hipRight), toModelVector3(joints.kneeRight)]],
    ['rightShin', [toModelVector3(joints.kneeRight), toModelVector3(joints.ankleRight)]],
    ['rightTalon', [toModelVector3(joints.ankleRight), toModelVector3(rightTalon)]],
    ['rightFoot', [toModelVector3(joints.ankleRight), toModelVector3(joints.toeStartRight)]],
    ['rightToe', [toModelVector3(joints.toeStartRight), toModelVector3(joints.toeRight)]],
  ]);
}

function inverseScalePosturePoint(point: PosturePoint, origin: PosturePoint, modelScale: number): PosturePoint {
  return [
    origin[0] + (point[0] - origin[0]) / modelScale,
    origin[1] + (point[1] - origin[1]) / modelScale,
    origin[2] + (point[2] - origin[2]) / modelScale,
  ];
}

export function createHumanModelPoseSkeleton(
  skeleton: PlannerPostureSkeleton,
  modelScale: number
): PlannerPostureSkeleton {
  const safeModelScale = Math.max(BONE_LENGTH_EPSILON, modelScale);

  if (Math.abs(safeModelScale - 1) <= BONE_LENGTH_EPSILON) {
    return skeleton;
  }

  const origin = skeleton.joints.hipCenter;
  const joints = Object.fromEntries(
    Object.entries(skeleton.joints).map(([name, point]) => [
      name,
      inverseScalePosturePoint(point, origin, safeModelScale),
    ])
  ) as Record<PostureJointName, PosturePoint>;
  const segments = skeleton.segments.map((segment) => ({
    start: inverseScalePosturePoint(segment.start, origin, safeModelScale),
    end: inverseScalePosturePoint(segment.end, origin, safeModelScale),
  }));

  return { joints, segments };
}

function poseBone(
  root: Group,
  bone: Bone,
  restSegment: HumanRestSegment,
  restLocalPosition: Vector3,
  restLocalScale: Vector3,
  restBoneWorldMatrix: Matrix4,
  start: Vector3,
  end: Vector3,
  scaleToTargetLength: boolean,
  preserveWorldRotation = false
) {
  if (preserveWorldRotation) {
    scratchWorldMatrix.extractRotation(restBoneWorldMatrix);
  } else {
    getSegmentDirection(restSegment.start, restSegment.end, scratchRestDirection);
    getSegmentDirection(start, end, scratchTargetDirection);
    scratchQuaternion.setFromUnitVectors(scratchRestDirection, scratchTargetDirection);
    scratchRestRotation.extractRotation(restBoneWorldMatrix);
    scratchWorldMatrix.makeRotationFromQuaternion(scratchQuaternion).multiply(scratchRestRotation);
  }
  scratchRootInverse.copy(root.matrixWorld).invert();

  if (bone.parent instanceof Bone) {
    bone.parent.updateMatrixWorld(true);
    scratchParentRigMatrix.multiplyMatrices(scratchRootInverse, bone.parent.matrixWorld);
    scratchParentRotation.extractRotation(scratchParentRigMatrix);
    scratchParentInverse.copy(scratchParentRotation).invert();
    scratchLocalMatrix.extractRotation(scratchWorldMatrix).premultiply(scratchParentInverse);
    if (scaleToTargetLength) {
      scratchWorldPosition.copy(start).applyMatrix4(root.matrixWorld);
      bone.parent.worldToLocal(scratchWorldPosition);
      bone.position.copy(scratchWorldPosition);
    } else {
      bone.position.copy(restLocalPosition);
    }
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

function placeBoneAtTarget(root: Group, bone: Bone, target: Vector3) {
  if (!(bone.parent instanceof Bone)) {
    return;
  }

  scratchWorldPosition.copy(target).applyMatrix4(root.matrixWorld);
  bone.parent.worldToLocal(scratchWorldPosition);
  bone.position.copy(scratchWorldPosition);
  bone.updateMatrixWorld(true);
}

function applyPlannerPose(rig: HumanRig, skeleton: PlannerPostureSkeleton, modelScale: number) {
  const safeModelScale = Math.max(BONE_LENGTH_EPSILON, modelScale);
  const poseSkeleton = createHumanModelPoseSkeleton(skeleton, safeModelScale);

  rig.root.position.set(0, 0, 0);
  rig.root.scale.setScalar(1);
  rig.root.updateWorldMatrix(true, true);
  resetBonesToRestPose(rig);

  const targetSegments = createTargetSegments(poseSkeleton);
  const restBonePoses = withNeutralRootRotation(rig.root, () => createRestBonePosesFromModel(rig.bones));

  for (const name of HUMAN_BONE_ORDER) {
    const bone = rig.bones.get(name);
    const restBonePose = restBonePoses.get(name);
    const targetSegment = targetSegments.get(name);

    if (!bone || !restBonePose || !targetSegment) {
      continue;
    }

    poseBone(
      rig.root,
      bone,
      restBonePose.segment,
      restBonePose.localPosition,
      restBonePose.localScale,
      restBonePose.worldMatrix,
      targetSegment[0],
      targetSegment[1],
      HUMAN_TARGET_START_BONE_NAMES.has(name),
      name === 'head'
    );
  }

  const { joints } = poseSkeleton;
  const leftTalon = getTalonPoint(joints.ankleLeft, joints.heelLeft, joints.toeLeft);
  const rightTalon = getTalonPoint(joints.ankleRight, joints.heelRight, joints.toeRight);
  const pointTargets: Array<[HumanModelBoneName, Vector3]> = [
    ['eyeCenter', toModelVector3(joints.eyeCenter)],
    ['leftTalonTip', toModelVector3(leftTalon)],
    ['rightTalonTip', toModelVector3(rightTalon)],
    ['leftToeTip', toModelVector3(joints.toeLeft)],
    ['rightToeTip', toModelVector3(joints.toeRight)],
  ];

  for (const [name, target] of pointTargets) {
    const bone = rig.bones.get(name);

    if (bone) {
      placeBoneAtTarget(rig.root, bone, target);
    }
  }

  for (const mesh of rig.skinnedMeshes) {
    mesh.skeleton.update();
    mesh.geometry.computeBoundingSphere();
  }

  const modelHipCenter = plannerZUpToModelYUp(skeleton.joints.hipCenter);
  const scaleOrigin = new Vector3(modelHipCenter[0], modelHipCenter[1], modelHipCenter[2]);
  rig.root.updateWorldMatrix(true, true);
  const debugSegments = createDebugSegmentsFromModelBones(rig.root, rig.bones);

  updateDebugOverlay(rig.debugOverlay, debugSegments, safeModelScale, scaleOrigin);

  rig.root.scale.setScalar(safeModelScale);
  rig.root.position.set(
    skeleton.joints.hipCenter[0] * (1 - safeModelScale),
    skeleton.joints.hipCenter[1] * (1 - safeModelScale),
    skeleton.joints.hipCenter[2] * (1 - safeModelScale)
  );
  rig.root.updateWorldMatrix(true, true);
}

function resetBonesToRestPose(rig: HumanRig) {
  withNeutralRootRotation(rig.root, () => {
    for (const mesh of rig.skinnedMeshes) {
      mesh.skeleton.pose();
    }
  });
}

function withNeutralRootRotation<T>(root: Group, callback: () => T) {
  const rootQuaternion = root.quaternion.clone();

  root.quaternion.identity();
  root.updateWorldMatrix(true, true);

  const result = callback();

  root.quaternion.copy(rootQuaternion);
  root.updateWorldMatrix(true, true);

  return result;
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
  const jointHitGeometry = new SphereGeometry(0.025, 16, 10);
  const boneMaterial = new MeshBasicMaterial({
    color: 0x2563eb,
    depthTest: true,
    depthWrite: false,
    opacity: 0.72,
    transparent: true,
  });
  const jointMaterial = new MeshBasicMaterial({
    color: 0xf97316,
    depthTest: true,
    depthWrite: true,
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

function setSkinnedMeshesVisible(skinnedMeshes: SkinnedMesh[], visible: boolean) {
  for (const mesh of skinnedMeshes) {
    mesh.visible = visible;
  }
}

function setDebugOverlayVisible(overlay: HumanRigDebugOverlay, visible: boolean) {
  overlay.group.visible = visible;
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
      return ['hipCenter', 'shoulderCenter'];
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
    case 'leftTalon':
      return ['ankleLeft', 'talonLeft'];
    case 'leftFoot':
      return ['ankleLeft', 'toeStartLeft'];
    case 'leftToe':
      return ['toeStartLeft', 'toeLeft'];
    case 'rightThigh':
      return ['hipRight', 'kneeRight'];
    case 'rightShin':
      return ['kneeRight', 'ankleRight'];
    case 'rightTalon':
      return ['ankleRight', 'talonRight'];
    case 'rightFoot':
      return ['ankleRight', 'toeStartRight'];
    case 'rightToe':
      return ['toeStartRight', 'toeRight'];
    case 'neckConnector':
      return ['shoulderCenter', 'neck'];
    case 'leftClavicle':
      return ['shoulderCenter', 'shoulderLeft'];
    case 'rightClavicle':
      return ['shoulderCenter', 'shoulderRight'];
    case 'leftPelvis':
      return ['hipCenter', 'hipLeft'];
    case 'rightPelvis':
      return ['hipCenter', 'hipRight'];
  }
}

function updateDebugOverlay(
  overlay: HumanRigDebugOverlay,
  debugSegments: Map<HumanDebugBoneName, [Vector3, Vector3]>,
  modelScale = 1,
  scaleOrigin: Vector3 = ZERO_VECTOR
) {
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
        rows: [{ label: 'Length', value: metersToMm(length * modelScale) }],
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
          { label: 'Position', value: formatPosition(position, modelScale, scaleOrigin) },
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

function collectRig(root: Group): HumanRig {
  const bones = new Map<HumanModelBoneName, Bone>();
  const debugOverlay = createDebugOverlay();
  const skinnedMeshes: SkinnedMesh[] = [];

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

  const postureModelMetrics = calculateHumanModelPostureModel(root);
  root.add(debugOverlay.group);
  updateDebugOverlay(debugOverlay, createDebugSegmentsFromModelBones(root, bones));

  return {
    bones,
    debugOverlay,
    postureModelMetrics,
    root,
    skinnedMeshes,
  };
}

function isHumanModelBoneName(name: string): name is HumanModelBoneName {
  return (HUMAN_MODEL_BONE_ORDER as string[]).includes(name);
}

export function createRiggedHumanModelFromRoot(root: Group): RiggedHumanModel | null {
  const rig = collectRig(root);

  if (rig.bones.size === 0 || rig.skinnedMeshes.length === 0 || !rig.postureModelMetrics) {
    return null;
  }

  root.name = 'RiggedHumanMaleRealistic';
  root.rotation.x = Math.PI / 2;

  return {
    getTooltipTargets() {
      return [...rig.debugOverlay.boneHitMeshes.values(), ...rig.debugOverlay.jointHitMeshes];
    },
    object: root,
    postureModelMetrics: rig.postureModelMetrics,
    applySkeleton(plannerSkeleton, modelScale) {
      applyPlannerPose(rig, plannerSkeleton, modelScale);
    },
    setDisplayOptions(showModel, showSkeleton) {
      setSkinnedMeshesVisible(rig.skinnedMeshes, showModel);
      setDebugOverlayVisible(rig.debugOverlay, showSkeleton);
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

export async function createRiggedHumanModel(
  modelUrl = HUMAN_MALE_REALISTIC_MODEL_URL
): Promise<RiggedHumanModel | null> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync(modelUrl);

  return createRiggedHumanModelFromRoot(gltf.scene);
}
