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

type HumanDebugBoneName =
  | HumanBoneName
  | 'leftClavicle'
  | 'rightClavicle'
  | 'leftPelvis'
  | 'rightPelvis'
  | 'neckConnector';

type HumanRig = {
  bones: Map<HumanBoneName, Bone>;
  debugOverlay: HumanRigDebugOverlay;
  restBoneLocalPositions: Map<HumanBoneName, Vector3>;
  restBoneLocalQuaternions: Map<HumanBoneName, Quaternion>;
  restBoneLocalScales: Map<HumanBoneName, Vector3>;
  restSegments: Map<HumanBoneName, HumanRestSegment>;
  restBoneWorldMatrices: Map<HumanBoneName, Matrix4>;
  root: Group;
  skinnedMeshes: SkinnedMesh[];
};

export type RiggedHumanModel = {
  object: Group;
  applySkeleton: (skeleton: PlannerPostureSkeleton) => void;
  dispose: () => void;
};

type HumanRigDebugOverlay = {
  boneGeometry: BufferGeometry;
  boneMaterial: MeshBasicMaterial;
  boneMeshes: Map<HumanDebugBoneName, Mesh>;
  group: Group;
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
const HUMAN_DEBUG_BONE_ORDER: HumanDebugBoneName[] = [
  ...HUMAN_BONE_ORDER,
  'leftClavicle',
  'rightClavicle',
  'leftPelvis',
  'rightPelvis',
  'neckConnector',
];
const Y_AXIS = new Vector3(0, 1, 0);
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

    if (
      !bone ||
      !restLocalPosition ||
      !restLocalScale ||
      !restSegment ||
      !restBoneWorldMatrix ||
      !targetSegment
    ) {
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

  updateDebugOverlay(rig.debugOverlay, targetSegments);
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
  const boneMeshes = new Map<HumanDebugBoneName, Mesh>();

  group.name = 'RiggedHumanDebugOverlay';
  group.renderOrder = 1000;

  for (const name of HUMAN_DEBUG_BONE_ORDER) {
    const mesh = new Mesh(boneGeometry, boneMaterial);
    mesh.name = `${name}DebugBone`;
    mesh.frustumCulled = false;
    mesh.renderOrder = 1000;
    boneMeshes.set(name, mesh);
    group.add(mesh);
  }

  return {
    boneGeometry,
    boneMaterial,
    boneMeshes,
    group,
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

function updateDebugOverlay(
  overlay: HumanRigDebugOverlay,
  targetSegments: Map<HumanBoneName, [Vector3, Vector3]>
) {
  const debugSegments = createDebugSegments(targetSegments);
  const joints = new Map<string, Vector3>();

  for (const [name, segment] of debugSegments) {
    const mesh = overlay.boneMeshes.get(name);

    if (!mesh) {
      continue;
    }

    const [start, end] = segment;
    scratchTargetDirection.copy(end).sub(start);
    const length = scratchTargetDirection.length();

    if (length <= 0.0001) {
      mesh.visible = false;
    } else {
      mesh.visible = true;
      scratchTargetDirection.normalize();
      mesh.position.copy(start);
      mesh.quaternion.setFromUnitVectors(Y_AXIS, scratchTargetDirection);
      mesh.scale.set(0.032, length, 0.032);
    }

    joints.set(start.toArray().map((value) => value.toFixed(4)).join(','), start);
    joints.set(end.toArray().map((value) => value.toFixed(4)).join(','), end);
  }

  const jointPositions = [...joints.values()];

  while (overlay.jointMeshes.length < jointPositions.length) {
    const mesh = new Mesh(overlay.jointGeometry, overlay.jointMaterial);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1001;
    overlay.jointMeshes.push(mesh);
    overlay.group.add(mesh);
  }

  overlay.jointMeshes.forEach((mesh, index) => {
    const position = jointPositions[index];
    mesh.visible = Boolean(position);

    if (position) {
      mesh.position.copy(position);
    }
  });
}

function createDebugSegments(targetSegments: Map<HumanBoneName, [Vector3, Vector3]>) {
  const debugSegments = new Map<HumanDebugBoneName, [Vector3, Vector3]>(targetSegments);
  const torso = targetSegments.get('torso');
  const head = targetSegments.get('head');
  const leftUpperArm = targetSegments.get('leftUpperArm');
  const rightUpperArm = targetSegments.get('rightUpperArm');
  const leftThigh = targetSegments.get('leftThigh');
  const rightThigh = targetSegments.get('rightThigh');

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
  const bones = new Map<HumanBoneName, Bone>();
  const debugOverlay = createDebugOverlay();
  const skinnedMeshes: SkinnedMesh[] = [];
  const restBoneLocalPositions = new Map<HumanBoneName, Vector3>();
  const restBoneLocalQuaternions = new Map<HumanBoneName, Quaternion>();
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
  root.add(debugOverlay.group);

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
      rig.debugOverlay.boneGeometry.dispose();
      rig.debugOverlay.jointGeometry.dispose();
      rig.debugOverlay.boneMaterial.dispose();
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
