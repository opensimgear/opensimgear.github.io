import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { Bone, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import {
  calculateHumanModelBoneRigRatios,
  createRiggedHumanModelFromRoot,
  type HumanRigTooltipData,
} from '../../components/calculator/aluminum-rig-planner/human-model-rig';
import {
  DEFAULT_PLANNER_INPUT,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  DEFAULT_POSTURE_HEIGHT_CM,
} from '../../components/calculator/aluminum-rig-planner/constants';
import { createPlannerPostureSkeleton } from '../../components/calculator/aluminum-rig-planner/posture';
import type { PlannerPostureSkeleton, PosturePoint } from '../../components/calculator/aluminum-rig-planner/posture';

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

function getTooltipByTitle(tooltips: HumanRigTooltipData[], title: string, rowLabel: string) {
  return tooltips.find((tooltip) => tooltip.title === title && tooltip.rows.some((row) => row.label === rowLabel));
}

function getTooltipValue(tooltip: HumanRigTooltipData, label: string) {
  return tooltip.rows.find((row) => row.label === label)?.value;
}

function getTooltips(model: NonNullable<ReturnType<typeof createRiggedHumanModelFromRoot>>) {
  return model
    .getTooltipTargets()
    .map((target) => target.userData.rigTooltip as HumanRigTooltipData | undefined)
    .filter((tooltip): tooltip is HumanRigTooltipData => Boolean(tooltip));
}

function parseMm(value: string) {
  return Number(value.replace(' mm', '')) / 1000;
}

function parsePosition(value: string): PosturePoint {
  const match = value.match(/^x (-?\d+) mm, y (-?\d+) mm, z (-?\d+) mm$/);

  if (!match) {
    throw new Error(`Invalid position: ${value}`);
  }

  return [Number(match[1]) / 1000, Number(match[2]) / 1000, Number(match[3]) / 1000];
}

function scaleFromHip(point: PosturePoint, hipCenter: PosturePoint, modelScale: number): PosturePoint {
  return [
    hipCenter[0] + (point[0] - hipCenter[0]) * modelScale,
    hipCenter[1] + (point[1] - hipCenter[1]) * modelScale,
    hipCenter[2] + (point[2] - hipCenter[2]) * modelScale,
  ];
}

function expectPointCloseMm(actual: PosturePoint, expected: PosturePoint) {
  expect(Math.abs(actual[0] - expected[0])).toBeLessThanOrEqual(0.001);
  expect(Math.abs(actual[1] - expected[1])).toBeLessThanOrEqual(0.001);
  expect(Math.abs(actual[2] - expected[2])).toBeLessThanOrEqual(0.001);
}

describe('aluminum rig planner human model rig', () => {
  it('calculates bone rig ratios from the GLB model rest pose', async () => {
    const gltf = await loadHumanModel();
    const ratios = calculateHumanModelBoneRigRatios(gltf.scene);

    expect(ratios).toEqual({
      sittingHeight: 0.477,
      seatedEyeHeight: 0.468,
      seatedShoulderHeight: 0.292,
      hipBreadth: 0.123,
      shoulderBreadth: 0.205,
      upperArmLength: 0.141,
      forearmHandLength: 0.195,
      thighLength: 0.248,
      lowerLegLength: 0.231,
      footLength: 0.143,
    });
  });

  it('scales the whole model without changing individual bone scales', async () => {
    const gltf = await loadHumanModel();
    const model = createRiggedHumanModelFromRoot(gltf.scene);
    expect(model).not.toBeNull();

    const postureSettings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      heightCm: 205,
    };
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, postureSettings);
    const modelScale = postureSettings.heightCm / DEFAULT_POSTURE_HEIGHT_CM;

    const bones = collectBones(model!.object);
    const restScales = new Map([...bones.entries()].map(([name, bone]) => [name, bone.scale.clone()]));

    model!.applySkeleton(skeleton, modelScale);

    expectVectorClose(model!.object.scale, new Vector3(modelScale, modelScale, modelScale), 'model scale');

    for (const segment of MODEL_SEGMENTS) {
      expectVectorClose(bones.get(segment.boneStart)!.scale, restScales.get(segment.boneStart)!, segment.label);
    }

    model!.dispose();
  });

  it('scales skeleton tooltip values with the whole model scale', async () => {
    const gltf = await loadHumanModel();
    const model = createRiggedHumanModelFromRoot(gltf.scene);
    expect(model).not.toBeNull();

    const postureSettings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      heightCm: 205,
    };
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, postureSettings);
    const modelScale = postureSettings.heightCm / DEFAULT_POSTURE_HEIGHT_CM;

    model!.applySkeleton(skeleton, 1);

    const baselineTooltips = getTooltips(model!);
    const baselineTorsoTooltip = getTooltipByTitle(baselineTooltips, 'Torso', 'Length');
    const baselineHeadTooltip = getTooltipByTitle(baselineTooltips, 'Head', 'Position');
    expect(baselineTorsoTooltip).toBeDefined();
    expect(baselineHeadTooltip).toBeDefined();

    const baselineTorsoLength = parseMm(getTooltipValue(baselineTorsoTooltip!, 'Length')!);
    const baselineHeadPosition = parsePosition(getTooltipValue(baselineHeadTooltip!, 'Position')!);

    model!.applySkeleton(skeleton, modelScale);

    const scaledTooltips = getTooltips(model!);
    const scaledTorsoTooltip = getTooltipByTitle(scaledTooltips, 'Torso', 'Length');
    const scaledHeadTooltip = getTooltipByTitle(scaledTooltips, 'Head', 'Position');

    expect(scaledTorsoTooltip).toBeDefined();
    expect(scaledHeadTooltip).toBeDefined();
    expect(parseMm(getTooltipValue(scaledTorsoTooltip!, 'Length')!)).toBeCloseTo(baselineTorsoLength * modelScale, 3);
    expectPointCloseMm(
      parsePosition(getTooltipValue(scaledHeadTooltip!, 'Position')!),
      scaleFromHip(baselineHeadPosition, skeleton.joints.hipCenter, modelScale)
    );

    model!.dispose();
  });

  it('keeps the same model pose when height stays at the 169 cm baseline', async () => {
    const [basicGltf, advancedGltf] = await Promise.all([loadHumanModel(), loadHumanModel()]);
    const basicModel = createRiggedHumanModelFromRoot(basicGltf.scene);
    const advancedModel = createRiggedHumanModelFromRoot(advancedGltf.scene);
    expect(basicModel).not.toBeNull();
    expect(advancedModel).not.toBeNull();

    const basicSkeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);
    const advancedSkeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, DEFAULT_PLANNER_POSTURE_SETTINGS);

    basicModel!.applySkeleton(basicSkeleton, 1);
    advancedModel!.applySkeleton(advancedSkeleton, 1);

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
      DEFAULT_PLANNER_POSTURE_SETTINGS
    );

    model!.applySkeleton(skeleton, 1);

    const posedHeadQuaternion = getBoneWorldQuaternion(bones, 'head');

    expect(Math.abs(restHeadQuaternion.angleTo(posedHeadQuaternion))).toBeLessThanOrEqual(0.0001);

    model!.dispose();
  });
});
