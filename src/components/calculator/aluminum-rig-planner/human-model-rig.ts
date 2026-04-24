import {
  Bone,
  Box3,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Quaternion,
  SkinnedMesh,
  Vector3,
} from 'three';

import type { PlannerPostureSkeleton, PosturePoint } from './posture';

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

type HumanRestSegment = {
  name: HumanBoneName;
  start: Vector3;
  end: Vector3;
};

type HumanRig = {
  bones: Map<HumanBoneName, Bone>;
  restBoneLocalPositions: Map<HumanBoneName, Vector3>;
  restBoneLocalScales: Map<HumanBoneName, Vector3>;
  restSegments: Map<HumanBoneName, HumanRestSegment>;
  restBoneWorldMatrices: Map<HumanBoneName, Matrix4>;
  skinnedMeshes: SkinnedMesh[];
};

export type RiggedHumanModel = {
  object: Group;
  applySkeleton: (skeleton: PlannerPostureSkeleton) => void;
  dispose: () => void;
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
const scratchRestDirection = new Vector3();
const scratchTargetDirection = new Vector3();
const scratchQuaternion = new Quaternion();
const scratchWorldMatrix = new Matrix4();
const scratchLocalMatrix = new Matrix4();
const scratchRestRotation = new Matrix4();
const scratchParentRotation = new Matrix4();
const scratchParentInverse = new Matrix4();

function toVector3(point: PosturePoint) {
  return new Vector3(point[0], point[1], point[2]);
}

function getExtendedEnd(start: PosturePoint, end: PosturePoint, extensionM: number) {
  const startVector = toVector3(start);
  const endVector = toVector3(end);
  const direction = endVector.clone().sub(startVector);

  if (direction.lengthSq() < 0.000001) {
    return endVector;
  }

  return endVector.add(direction.normalize().multiplyScalar(extensionM));
}

function createSegment(name: HumanBoneName, start: Vector3, end: Vector3): HumanRestSegment {
  return { name, start, end };
}

function createRestSegmentsFromModel(bounds: Box3) {
  const size = bounds.getSize(new Vector3());
  const height = size.y;
  const width = size.z;
  const shoulderHalfWidth = Math.min(width * 0.26, height * 0.13);
  const hipHalfWidth = Math.min(width * 0.12, height * 0.065);
  const armOuterZ = Math.min(width * 0.39, height * 0.21);
  const hipY = height * 0.535;
  const kneeY = height * 0.29;
  const ankleY = height * 0.055;
  const shoulderY = height * 0.82;
  const elbowY = height * 0.615;
  const wristY = height * 0.45;
  const neckY = height * 0.89;
  const headTopY = height * 0.985;
  const footX = height * 0.1;
  const segments: HumanRestSegment[] = [
    createSegment('torso', new Vector3(0, hipY, 0), new Vector3(0, shoulderY, 0)),
    createSegment('head', new Vector3(0, neckY, 0), new Vector3(0, headTopY, 0)),
    createSegment('leftUpperArm', new Vector3(0, shoulderY, -shoulderHalfWidth), new Vector3(0, elbowY, -armOuterZ)),
    createSegment('leftForearm', new Vector3(0, elbowY, -armOuterZ), new Vector3(0, wristY, -armOuterZ * 0.96)),
    createSegment(
      'leftHand',
      new Vector3(0, wristY, -armOuterZ * 0.96),
      new Vector3(0.02, wristY - height * 0.075, -armOuterZ * 0.96)
    ),
    createSegment('rightUpperArm', new Vector3(0, shoulderY, shoulderHalfWidth), new Vector3(0, elbowY, armOuterZ)),
    createSegment('rightForearm', new Vector3(0, elbowY, armOuterZ), new Vector3(0, wristY, armOuterZ * 0.96)),
    createSegment(
      'rightHand',
      new Vector3(0, wristY, armOuterZ * 0.96),
      new Vector3(0.02, wristY - height * 0.075, armOuterZ * 0.96)
    ),
    createSegment('leftThigh', new Vector3(0, hipY, -hipHalfWidth), new Vector3(0, kneeY, -hipHalfWidth * 0.78)),
    createSegment('leftShin', new Vector3(0, kneeY, -hipHalfWidth * 0.78), new Vector3(0, ankleY, -hipHalfWidth * 0.7)),
    createSegment(
      'leftFoot',
      new Vector3(0, ankleY, -hipHalfWidth * 0.7),
      new Vector3(footX, height * 0.015, -hipHalfWidth * 0.7)
    ),
    createSegment('rightThigh', new Vector3(0, hipY, hipHalfWidth), new Vector3(0, kneeY, hipHalfWidth * 0.78)),
    createSegment('rightShin', new Vector3(0, kneeY, hipHalfWidth * 0.78), new Vector3(0, ankleY, hipHalfWidth * 0.7)),
    createSegment(
      'rightFoot',
      new Vector3(0, ankleY, hipHalfWidth * 0.7),
      new Vector3(footX, height * 0.015, hipHalfWidth * 0.7)
    ),
  ];

  return new Map(segments.map((segment) => [segment.name, segment]));
}

function getBoneWorldPosition(bones: Map<HumanBoneName, Bone>, name: HumanBoneName, fallback: Vector3) {
  const bone = bones.get(name);

  if (!bone) {
    return fallback.clone();
  }

  return bone.getWorldPosition(new Vector3());
}

function createRestSegmentsFromBones(bones: Map<HumanBoneName, Bone>, bounds: Box3) {
  const fallbackSegments = createRestSegmentsFromModel(bounds);
  const getFallback = (name: HumanBoneName) => fallbackSegments.get(name)!;
  const getStart = (name: HumanBoneName) => getBoneWorldPosition(bones, name, getFallback(name).start);

  const segments: HumanRestSegment[] = [
    createSegment('torso', getStart('torso'), getFallback('torso').end.clone()),
    createSegment('head', getStart('head'), getFallback('head').end.clone()),
    createSegment('leftUpperArm', getStart('leftUpperArm'), getStart('leftForearm')),
    createSegment('leftForearm', getStart('leftForearm'), getStart('leftHand')),
    createSegment('leftHand', getStart('leftHand'), getFallback('leftHand').end.clone()),
    createSegment('rightUpperArm', getStart('rightUpperArm'), getStart('rightForearm')),
    createSegment('rightForearm', getStart('rightForearm'), getStart('rightHand')),
    createSegment('rightHand', getStart('rightHand'), getFallback('rightHand').end.clone()),
    createSegment('leftThigh', getStart('leftThigh'), getStart('leftShin')),
    createSegment('leftShin', getStart('leftShin'), getStart('leftFoot')),
    createSegment('leftFoot', getStart('leftFoot'), getFallback('leftFoot').end.clone()),
    createSegment('rightThigh', getStart('rightThigh'), getStart('rightShin')),
    createSegment('rightShin', getStart('rightShin'), getStart('rightFoot')),
    createSegment('rightFoot', getStart('rightFoot'), getFallback('rightFoot').end.clone()),
  ];

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
    ['torso', [toVector3(joints.hipCenter), toVector3(joints.shoulderCenter)]],
    ['head', [toVector3(joints.neck), toVector3(joints.head)]],
    ['leftUpperArm', [toVector3(joints.shoulderLeft), toVector3(joints.elbowLeft)]],
    ['leftForearm', [toVector3(joints.elbowLeft), toVector3(joints.wristLeft)]],
    ['leftHand', [toVector3(joints.wristLeft), getExtendedEnd(joints.elbowLeft, joints.wristLeft, 0.08)]],
    ['rightUpperArm', [toVector3(joints.shoulderRight), toVector3(joints.elbowRight)]],
    ['rightForearm', [toVector3(joints.elbowRight), toVector3(joints.wristRight)]],
    ['rightHand', [toVector3(joints.wristRight), getExtendedEnd(joints.elbowRight, joints.wristRight, 0.08)]],
    ['leftThigh', [toVector3(joints.hipLeft), toVector3(joints.kneeLeft)]],
    ['leftShin', [toVector3(joints.kneeLeft), toVector3(joints.ankleLeft)]],
    ['leftFoot', [toVector3(joints.ankleLeft), toVector3(joints.toeLeft)]],
    ['rightThigh', [toVector3(joints.hipRight), toVector3(joints.kneeRight)]],
    ['rightShin', [toVector3(joints.kneeRight), toVector3(joints.ankleRight)]],
    ['rightFoot', [toVector3(joints.ankleRight), toVector3(joints.toeRight)]],
  ]);
}

function poseBone(
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

  if (bone.parent instanceof Bone) {
    bone.parent.updateMatrixWorld(true);
    scratchParentRotation.extractRotation(bone.parent.matrixWorld);
    scratchParentInverse.copy(scratchParentRotation).invert();
    scratchLocalMatrix.extractRotation(scratchWorldMatrix).premultiply(scratchParentInverse);
    bone.position.copy(restLocalPosition);
    bone.quaternion.setFromRotationMatrix(scratchLocalMatrix);
    bone.scale.copy(restLocalScale);
  } else {
    scratchWorldMatrix.setPosition(start);

    if (bone.parent) {
      scratchParentInverse.copy(bone.parent.matrixWorld).invert();
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
    depthWrite: true,
    side: DoubleSide,
    transparent: false,
  });
}

function collectRig(root: Group) {
  const bones = new Map<HumanBoneName, Bone>();
  const skinnedMeshes: SkinnedMesh[] = [];
  const restBoneLocalPositions = new Map<HumanBoneName, Vector3>();
  const restBoneLocalScales = new Map<HumanBoneName, Vector3>();
  const restBoneWorldMatrices = new Map<HumanBoneName, Matrix4>();
  const bounds = new Box3();

  root.updateWorldMatrix(true, true);
  root.traverse((object) => {
    configureObject(object);

    if (object instanceof Bone && isHumanBoneName(object.name)) {
      bones.set(object.name, object);
    }

    if (object instanceof SkinnedMesh) {
      configureMesh(object);
      skinnedMeshes.push(object);
      bounds.union(new Box3().setFromObject(object));
    }
  });

  root.updateWorldMatrix(true, true);

  const restSegments = createRestSegmentsFromBones(bones, bounds);

  for (const name of HUMAN_BONE_ORDER) {
    const bone = bones.get(name);

    if (bone) {
      restBoneLocalPositions.set(name, bone.position.clone());
      restBoneLocalScales.set(name, bone.scale.clone());
      restBoneWorldMatrices.set(name, bone.matrixWorld.clone());
    }
  }

  return {
    bones,
    restBoneLocalPositions,
    restBoneLocalScales,
    restSegments,
    restBoneWorldMatrices,
    skinnedMeshes,
  };
}

function isHumanBoneName(name: string): name is HumanBoneName {
  return [
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
  ].includes(name);
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
    object: root,
    applySkeleton(plannerSkeleton) {
      applyPlannerPose(rig, plannerSkeleton);
    },
    dispose() {
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
