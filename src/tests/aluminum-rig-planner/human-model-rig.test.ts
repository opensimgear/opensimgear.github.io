import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { Bone, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import {
  calculateHumanModelBoneRigRatios,
  createRiggedHumanModelFromRoot,
} from '../../components/calculator/aluminum-rig-planner/human-model-rig';
import {
  DEFAULT_PLANNER_INPUT,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
} from '../../components/calculator/aluminum-rig-planner/constants';
import { createPlannerPostureSkeleton } from '../../components/calculator/aluminum-rig-planner/posture';
import type { PlannerPostureSkeleton, PosturePoint } from '../../components/calculator/aluminum-rig-planner/posture';
import type { PlannerModelScaledBoneName } from '../../components/calculator/aluminum-rig-planner/types';

const MODEL_PATH = fileURLToPath(
  new URL('../../../public/models/aluminum-rig-planner/human-male-realistic.glb', import.meta.url)
);
const MODEL_SEGMENTS = [
  {
    label: 'torso',
    boneStart: 'torso',
    boneEnd: 'neck',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.hipCenter, skeleton.joints.shoulderCenter],
  },
  {
    label: 'head',
    boneStart: 'head',
    boneEnd: 'headTip',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.neck, skeleton.joints.head],
  },
  {
    label: 'left upper arm',
    boneStart: 'leftUpperArm',
    boneEnd: 'leftForearm',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.shoulderLeft, skeleton.joints.elbowLeft],
  },
  {
    label: 'left forearm',
    boneStart: 'leftForearm',
    boneEnd: 'leftHand',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.elbowLeft, skeleton.joints.wristLeft],
  },
  {
    label: 'left hand',
    boneStart: 'leftHand',
    boneEnd: 'leftHandTip',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.wristLeft, skeleton.joints.handLeft],
  },
  {
    label: 'right upper arm',
    boneStart: 'rightUpperArm',
    boneEnd: 'rightForearm',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.shoulderRight, skeleton.joints.elbowRight],
  },
  {
    label: 'right forearm',
    boneStart: 'rightForearm',
    boneEnd: 'rightHand',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.elbowRight, skeleton.joints.wristRight],
  },
  {
    label: 'right hand',
    boneStart: 'rightHand',
    boneEnd: 'rightHandTip',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.wristRight, skeleton.joints.handRight],
  },
  {
    label: 'left thigh',
    boneStart: 'leftThigh',
    boneEnd: 'leftShin',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.hipLeft, skeleton.joints.kneeLeft],
  },
  {
    label: 'left shin',
    boneStart: 'leftShin',
    boneEnd: 'leftHeel',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.kneeLeft, skeleton.joints.ankleLeft],
  },
  {
    label: 'left heel',
    boneStart: 'leftHeel',
    boneEnd: 'leftFoot',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.ankleLeft, skeleton.joints.heelLeft],
  },
  {
    label: 'left foot',
    boneStart: 'leftFoot',
    boneEnd: 'leftFootTip',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.heelLeft, skeleton.joints.toeLeft],
  },
  {
    label: 'right thigh',
    boneStart: 'rightThigh',
    boneEnd: 'rightShin',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.hipRight, skeleton.joints.kneeRight],
  },
  {
    label: 'right shin',
    boneStart: 'rightShin',
    boneEnd: 'rightHeel',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.kneeRight, skeleton.joints.ankleRight],
  },
  {
    label: 'right heel',
    boneStart: 'rightHeel',
    boneEnd: 'rightFoot',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.ankleRight, skeleton.joints.heelRight],
  },
  {
    label: 'right foot',
    boneStart: 'rightFoot',
    boneEnd: 'rightFootTip',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.heelRight, skeleton.joints.toeRight],
  },
] satisfies Array<{
  boneEnd: string;
  boneStart: string;
  getTarget: (skeleton: PlannerPostureSkeleton) => [PosturePoint, PosturePoint];
  label: string;
}>;

async function loadHumanModel() {
  const buffer = readFileSync(MODEL_PATH);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  return new GLTFLoader().parseAsync(arrayBuffer, '');
}

function collectBones(root: { traverse: (callback: (object: unknown) => void) => void }) {
  const bones = new Map<string, Bone>();

  root.traverse((object) => {
    if (object instanceof Bone) {
      bones.set(object.name, object);
    }
  });

  return bones;
}

function getBoneDistance(bones: Map<string, Bone>, startName: string, endName: string) {
  const start = bones.get(startName);
  const end = bones.get(endName);

  if (!start || !end) {
    throw new Error(`Missing ${startName} or ${endName}`);
  }

  const startPosition = new Vector3();
  const endPosition = new Vector3();
  start.getWorldPosition(startPosition);
  end.getWorldPosition(endPosition);

  return startPosition.distanceTo(endPosition);
}

function getPointDistance(start: PosturePoint, end: PosturePoint) {
  return new Vector3(...start).distanceTo(new Vector3(...end));
}

function expectVectorClose(actual: Vector3, expected: Vector3, label = 'vector', precision = 6) {
  expect(actual.x, `${label}.x`).toBeCloseTo(expected.x, precision);
  expect(actual.y, `${label}.y`).toBeCloseTo(expected.y, precision);
  expect(actual.z, `${label}.z`).toBeCloseTo(expected.z, precision);
}

function getBonePositions(bones: Map<string, Bone>) {
  return new Map([...bones.entries()].map(([name, bone]) => [name, bone.getWorldPosition(new Vector3())]));
}

function getBoneWorldQuaternion(bones: Map<string, Bone>, name: string) {
  const bone = bones.get(name);

  if (!bone) {
    throw new Error(`Missing ${name}`);
  }

  return bone.getWorldQuaternion(new Quaternion());
}

describe('aluminum rig planner human model rig', () => {
  it('calculates bone rig ratios from the GLB model rest pose', async () => {
    const gltf = await loadHumanModel();
    const ratios = calculateHumanModelBoneRigRatios(gltf.scene);

    expect(ratios).toEqual({
      sittingHeight: 0.477,
      seatedEyeHeight: 0.456,
      seatedShoulderHeight: 0.292,
      hipBreadth: 0.123,
      shoulderBreadth: 0.205,
      upperArmLength: 0.141,
      forearmHandLength: 0.195,
      thighLength: 0.248,
      lowerLegLength: 0.213,
      footLength: 0.162,
    });
  });

  it('does not compound parent scales on any bone when advanced defaults match the rest model', async () => {
    const gltf = await loadHumanModel();
    const model = createRiggedHumanModelFromRoot(gltf.scene);
    expect(model).not.toBeNull();

    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      advancedAnthropometry: true,
    });

    const bones = collectBones(model!.object);
    const restScales = new Map([...bones.entries()].map(([name, bone]) => [name, bone.scale.clone()]));

    model!.applySkeleton(
      skeleton,
      MODEL_SEGMENTS.map((segment) => segment.boneStart as PlannerModelScaledBoneName)
    );

    for (const segment of MODEL_SEGMENTS) {
      const boneLength = getBoneDistance(bones, segment.boneStart, segment.boneEnd);
      const [targetStart, targetEnd] = segment.getTarget(skeleton);
      const targetLength = getPointDistance(targetStart, targetEnd);

      expect(Math.abs(Math.round(boneLength * 1000) - Math.round(targetLength * 1000)), segment.label).toBeLessThanOrEqual(1);
      expect(Math.abs(boneLength - targetLength), segment.label).toBeLessThanOrEqual(0.001);

      if (segment.boneStart === 'leftFoot' || segment.boneStart === 'rightFoot') {
        expect(bones.get(segment.boneStart)!.scale.y).toBeGreaterThan(restScales.get(segment.boneStart)!.y);
      } else {
        expectVectorClose(bones.get(segment.boneStart)!.scale, restScales.get(segment.boneStart)!, segment.label);
      }
    }

    model!.dispose();
  });

  it('keeps the same model pose when toggling advanced defaults on', async () => {
    const [basicGltf, advancedGltf] = await Promise.all([loadHumanModel(), loadHumanModel()]);
    const basicModel = createRiggedHumanModelFromRoot(basicGltf.scene);
    const advancedModel = createRiggedHumanModelFromRoot(advancedGltf.scene);
    expect(basicModel).not.toBeNull();
    expect(advancedModel).not.toBeNull();

    const basicSkeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);
    const advancedSkeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      advancedAnthropometry: true,
    });

    basicModel!.applySkeleton(basicSkeleton, []);
    advancedModel!.applySkeleton(advancedSkeleton, []);

    const basicPositions = getBonePositions(collectBones(basicModel!.object));
    const advancedPositions = getBonePositions(collectBones(advancedModel!.object));

    for (const [name, basicPosition] of basicPositions) {
      expectVectorClose(advancedPositions.get(name)!, basicPosition, name, 4);
    }

    basicModel!.dispose();
    advancedModel!.dispose();
  });

  it('keeps head world rotation fixed when posture changes', async () => {
    const gltf = await loadHumanModel();
    const model = createRiggedHumanModelFromRoot(gltf.scene);
    expect(model).not.toBeNull();

    const bones = collectBones(model!.object);
    const restHeadQuaternion = getBoneWorldQuaternion(bones, 'head');
    const skeleton = createPlannerPostureSkeleton(
      {
        ...DEFAULT_PLANNER_INPUT,
        seatAngleDeg: 16,
        backrestAngleDeg: 42,
      },
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        advancedAnthropometry: true,
      }
    );

    model!.applySkeleton(skeleton, ['torso', 'head']);

    const posedHeadQuaternion = getBoneWorldQuaternion(bones, 'head');

    expect(Math.abs(restHeadQuaternion.angleTo(posedHeadQuaternion))).toBeLessThanOrEqual(0.0001);

    model!.dispose();
  });
});
