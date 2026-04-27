import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { Bone, Box3, Object3D, Quaternion, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import {
  calculateHumanModelBoneRigRatios,
  calculateHumanModelPostureModel,
  createRiggedHumanModelFromRoot,
  type HumanRigTooltipData,
} from '../../components/calculator/aluminum-rig-planner/human-model-rig';
import {
  DEFAULT_PLANNER_INPUT,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  DEFAULT_POSTURE_HEIGHT_CM,
} from '../../components/calculator/aluminum-rig-planner/constants';
import {
  createPlannerPostureSkeleton,
  POSTURE_SHOULDER_ABOVE_HIP_CLEARANCE_MM,
  type PlannerPostureSkeleton,
  type PosturePoint,
} from '../../components/calculator/aluminum-rig-planner/posture';

const MODEL_PATH = fileURLToPath(
  new URL('../../../public/models/aluminum-rig-planner/human-male-realistic.glb', import.meta.url)
);
const HUMAN_MODEL_RIG_SOURCE = readFileSync(
  new URL('../../components/calculator/aluminum-rig-planner/human-model-rig.ts', import.meta.url),
  'utf8'
);
const MODEL_RATIO_PRECISION = 3;
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
    boneEnd: 'leftTalon',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.kneeLeft, skeleton.joints.ankleLeft],
  },
  {
    label: 'left talon',
    boneStart: 'leftTalon',
    boneEnd: 'leftTalonTip',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.ankleLeft, getTalonPoint(skeleton, 'left')],
  },
  {
    label: 'left foot',
    boneStart: 'leftFoot',
    boneEnd: 'leftToe',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.ankleLeft, getToeStartPoint(skeleton, 'left')],
  },
  {
    label: 'left toe',
    boneStart: 'leftToe',
    boneEnd: 'leftToeTip',
    getTarget: (skeleton: PlannerPostureSkeleton) => [getToeStartPoint(skeleton, 'left'), skeleton.joints.toeLeft],
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
    boneEnd: 'rightTalon',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.kneeRight, skeleton.joints.ankleRight],
  },
  {
    label: 'right talon',
    boneStart: 'rightTalon',
    boneEnd: 'rightTalonTip',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.ankleRight, getTalonPoint(skeleton, 'right')],
  },
  {
    label: 'right foot',
    boneStart: 'rightFoot',
    boneEnd: 'rightToe',
    getTarget: (skeleton: PlannerPostureSkeleton) => [skeleton.joints.ankleRight, getToeStartPoint(skeleton, 'right')],
  },
  {
    label: 'right toe',
    boneStart: 'rightToe',
    boneEnd: 'rightToeTip',
    getTarget: (skeleton: PlannerPostureSkeleton) => [getToeStartPoint(skeleton, 'right'), skeleton.joints.toeRight],
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

function getSkinnedMeshBounds(root: Object3D) {
  const bounds = new Box3();

  root.updateWorldMatrix(true, true);
  root.traverse((object) => {
    if (object instanceof SkinnedMesh) {
      bounds.union(new Box3().setFromObject(object));
    }
  });

  return bounds;
}

function getRequiredBonePosition(bones: Map<string, Bone>, name: string) {
  const bone = bones.get(name);

  if (!bone) {
    throw new Error(`Missing ${name}`);
  }

  return bone.getWorldPosition(new Vector3());
}

function averageDistance(bones: Map<string, Bone>, pairs: Array<[string, string]>) {
  return (
    pairs.reduce((total, [start, end]) => {
      return total + getRequiredBonePosition(bones, start).distanceTo(getRequiredBonePosition(bones, end));
    }, 0) / pairs.length
  );
}

function averageVerticalDistance(bones: Map<string, Bone>, pairs: Array<[string, string]>) {
  return (
    pairs.reduce((total, [start, end]) => {
      return total + Math.abs(getRequiredBonePosition(bones, start).y - getRequiredBonePosition(bones, end).y);
    }, 0) / pairs.length
  );
}

function roundModelRatio(value: number) {
  return Number(value.toFixed(MODEL_RATIO_PRECISION));
}

function deriveExpectedPostureModel(root: Object3D) {
  const bones = collectBones(root);
  const bounds = getSkinnedMeshBounds(root);
  const height = bounds.getSize(new Vector3()).y;
  const hip = getRequiredBonePosition(bones, 'torso');
  const leftShoulder = getRequiredBonePosition(bones, 'leftUpperArm');
  const rightShoulder = getRequiredBonePosition(bones, 'rightUpperArm');
  const eyeCenter = getRequiredBonePosition(bones, 'eyeCenter');
  const heelLength = averageVerticalDistance(bones, [
    ['leftTalon', 'leftTalonTip'],
    ['rightTalon', 'rightTalonTip'],
  ]);
  const toeLength = averageDistance(bones, [
    ['leftTalonTip', 'leftToeTip'],
    ['rightTalonTip', 'rightToeTip'],
  ]);
  const footLength = heelLength + toeLength;
  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;

  return {
    anthropometryRatios: {
      sittingHeight: roundModelRatio((bounds.max.y - hip.y) / height),
      seatedShoulderHeight: roundModelRatio(
        (shoulderY - hip.y + POSTURE_SHOULDER_ABOVE_HIP_CLEARANCE_MM * 0.001) / height
      ),
      hipBreadth: roundModelRatio(averageDistance(bones, [['leftThigh', 'rightThigh']]) / height),
      shoulderBreadth: roundModelRatio(averageDistance(bones, [['leftUpperArm', 'rightUpperArm']]) / height),
      upperArmLength: roundModelRatio(
        averageDistance(bones, [
          ['leftUpperArm', 'leftForearm'],
          ['rightUpperArm', 'rightForearm'],
        ]) / height
      ),
      forearmHandLength: roundModelRatio(
        averageDistance(bones, [
          ['leftForearm', 'leftHandTip'],
          ['rightForearm', 'rightHandTip'],
        ]) / height
      ),
      thighLength: roundModelRatio(
        averageDistance(bones, [
          ['leftThigh', 'leftShin'],
          ['rightThigh', 'rightShin'],
        ]) / height
      ),
      lowerLegLength: roundModelRatio(
        averageDistance(bones, [
          ['leftShin', 'leftTalon'],
          ['rightShin', 'rightTalon'],
        ]) / height
      ),
      footLength: roundModelRatio(footLength / height),
    },
    eyeCenterForwardFromHip: roundModelRatio((eyeCenter.x - hip.x) / height),
    eyeCenterHeightFromHip: roundModelRatio((eyeCenter.y - hip.y) / height),
    eyeCenterSittingHeight: roundModelRatio((eyeCenter.y - hip.y) / height),
    heelLengthShare: roundModelRatio(heelLength / footLength),
  };
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

function getFootJoints(skeleton: PlannerPostureSkeleton, side: 'left' | 'right') {
  return side === 'left'
    ? {
        ankle: skeleton.joints.ankleLeft,
        heel: skeleton.joints.heelLeft,
        toeStart: skeleton.joints.toeStartLeft,
        toe: skeleton.joints.toeLeft,
      }
    : {
        ankle: skeleton.joints.ankleRight,
        heel: skeleton.joints.heelRight,
        toeStart: skeleton.joints.toeStartRight,
        toe: skeleton.joints.toeRight,
      };
}

function getTalonPoint(skeleton: PlannerPostureSkeleton, side: 'left' | 'right'): PosturePoint {
  return [...getFootJoints(skeleton, side).heel];
}

function getToeStartPoint(skeleton: PlannerPostureSkeleton, side: 'left' | 'right'): PosturePoint {
  return [...getFootJoints(skeleton, side).toeStart];
}

function expectPointCloseMm(actual: PosturePoint, expected: PosturePoint) {
  expect(Math.abs(actual[0] - expected[0])).toBeLessThanOrEqual(0.0015);
  expect(Math.abs(actual[1] - expected[1])).toBeLessThanOrEqual(0.0015);
  expect(Math.abs(actual[2] - expected[2])).toBeLessThanOrEqual(0.0015);
}

function expectBoneWorldPositionOnTarget(bone: Bone, target: PosturePoint, label: string) {
  const actual = bone.getWorldPosition(new Vector3());
  const expected = new Vector3(...target);

  expect(actual.distanceTo(expected), label).toBeLessThanOrEqual(0.003);
}

describe('aluminum rig planner human model rig', () => {
  it('calculates bone rig ratios from the GLB model rest pose', async () => {
    const gltf = await loadHumanModel();
    const ratios = calculateHumanModelBoneRigRatios(gltf.scene);

    expect(ratios).toEqual(deriveExpectedPostureModel(gltf.scene).anthropometryRatios);
  });

  it('extracts full posture-model data from the GLB rest pose', async () => {
    const gltf = await loadHumanModel();
    const postureModel = calculateHumanModelPostureModel(gltf.scene);

    expect(postureModel).toEqual(deriveExpectedPostureModel(gltf.scene));
  });

  it('derives rest bone data from the model instead of rig-level precomputed positions', () => {
    expect(HUMAN_MODEL_RIG_SOURCE).toContain('createRestBonePosesFromModel(rig.bones)');
    expect(HUMAN_MODEL_RIG_SOURCE).not.toContain('restBoneLocalPositions');
    expect(HUMAN_MODEL_RIG_SOURCE).not.toContain('restBoneLocalQuaternions');
    expect(HUMAN_MODEL_RIG_SOURCE).not.toContain('restBoneLocalScales');
    expect(HUMAN_MODEL_RIG_SOURCE).not.toContain('restSegments: Map');
    expect(HUMAN_MODEL_RIG_SOURCE).not.toContain('restBoneWorldMatrices');
  });

  it('scales the whole model without changing individual bone scales', async () => {
    const gltf = await loadHumanModel();
    const model = createRiggedHumanModelFromRoot(gltf.scene);
    expect(model).not.toBeNull();

    const postureSettings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      heightCm: 205,
    };
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, postureSettings, model!.postureModelMetrics);
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
    const skeleton = createPlannerPostureSkeleton(DEFAULT_PLANNER_INPUT, postureSettings, model!.postureModelMetrics);
    const modelScale = postureSettings.heightCm / DEFAULT_POSTURE_HEIGHT_CM;

    model!.applySkeleton(skeleton, 1);

    const baselineTooltips = getTooltips(model!);
    const baselineTorsoTooltip = getTooltipByTitle(baselineTooltips, 'Torso', 'Length');
    const baselineHandTooltip = getTooltipByTitle(baselineTooltips, 'Hand Left', 'Position');
    const baselineLeftHeelTooltip = getTooltipByTitle(baselineTooltips, 'Left heel', 'Length');
    const baselineRightHeelTooltip = getTooltipByTitle(baselineTooltips, 'Right heel', 'Length');
    expect(baselineTorsoTooltip).toBeDefined();
    expect(baselineHandTooltip).toBeDefined();
    expect(baselineLeftHeelTooltip).toBeDefined();
    expect(baselineRightHeelTooltip).toBeDefined();
    expect(getTooltipByTitle(baselineTooltips, 'Left Talon', 'Length')).toBeUndefined();
    expect(getTooltipByTitle(baselineTooltips, 'Right Talon', 'Length')).toBeUndefined();

    const baselineTorsoLength = parseMm(getTooltipValue(baselineTorsoTooltip!, 'Length')!);
    const baselineHandPosition = parsePosition(getTooltipValue(baselineHandTooltip!, 'Position')!);

    model!.applySkeleton(skeleton, modelScale);

    const scaledTooltips = getTooltips(model!);
    const scaledTorsoTooltip = getTooltipByTitle(scaledTooltips, 'Torso', 'Length');
    const scaledHandTooltip = getTooltipByTitle(scaledTooltips, 'Hand Left', 'Position');

    expect(scaledTorsoTooltip).toBeDefined();
    expect(scaledHandTooltip).toBeDefined();
    expect(parseMm(getTooltipValue(scaledTorsoTooltip!, 'Length')!)).toBeCloseTo(baselineTorsoLength * modelScale, 3);
    expectPointCloseMm(
      parsePosition(getTooltipValue(scaledHandTooltip!, 'Position')!),
      scaleFromHip(baselineHandPosition, skeleton.joints.hipCenter, modelScale)
    );

    model!.dispose();
  });

  it('ignores the generated eye center bone in the app overlay', async () => {
    const gltf = await loadHumanModel();
    const model = createRiggedHumanModelFromRoot(gltf.scene);
    expect(model).not.toBeNull();

    const skeleton = createPlannerPostureSkeleton(
      DEFAULT_PLANNER_INPUT,
      DEFAULT_PLANNER_POSTURE_SETTINGS,
      model!.postureModelMetrics
    );
    const modelScale = 1.08;

    model!.applySkeleton(skeleton, modelScale);

    const tooltips = getTooltips(model!);

    expect(getTooltipByTitle(tooltips, 'Eye Center', 'Length')).toBeUndefined();
    expect(model!.object.getObjectByName('leftEyeDebugBall')).toBeUndefined();
    expect(model!.object.getObjectByName('rightEyeDebugBall')).toBeUndefined();
    expect('getEyeCenter' in model!).toBe(false);

    model!.dispose();
  });

  it('keeps the same model pose when height stays at the 169 cm baseline', async () => {
    const [basicGltf, advancedGltf] = await Promise.all([loadHumanModel(), loadHumanModel()]);
    const basicModel = createRiggedHumanModelFromRoot(basicGltf.scene);
    const advancedModel = createRiggedHumanModelFromRoot(advancedGltf.scene);
    expect(basicModel).not.toBeNull();
    expect(advancedModel).not.toBeNull();

    const basicSkeleton = createPlannerPostureSkeleton(
      DEFAULT_PLANNER_INPUT,
      DEFAULT_PLANNER_POSTURE_SETTINGS,
      basicModel!.postureModelMetrics
    );
    const advancedSkeleton = createPlannerPostureSkeleton(
      DEFAULT_PLANNER_INPUT,
      DEFAULT_PLANNER_POSTURE_SETTINGS,
      advancedModel!.postureModelMetrics
    );

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

  it('places rigged feet on the solved pedal targets', async () => {
    const gltf = await loadHumanModel();
    const model = createRiggedHumanModelFromRoot(gltf.scene);
    expect(model).not.toBeNull();

    const skeleton = createPlannerPostureSkeleton(
      DEFAULT_PLANNER_INPUT,
      DEFAULT_PLANNER_POSTURE_SETTINGS,
      model!.postureModelMetrics
    );
    const bones = collectBones(model!.object);

    model!.applySkeleton(skeleton, 1);

    expectBoneWorldPositionOnTarget(bones.get('leftTalon')!, skeleton.joints.ankleLeft, 'left talon at ankle target');
    expectBoneWorldPositionOnTarget(
      bones.get('leftTalonTip')!,
      getTalonPoint(skeleton, 'left'),
      'left talon tip at 40-degree floor target'
    );
    expectBoneWorldPositionOnTarget(
      bones.get('leftFoot')!,
      skeleton.joints.ankleLeft,
      'left foot bone at ankle target'
    );
    expectBoneWorldPositionOnTarget(
      bones.get('leftToe')!,
      getToeStartPoint(skeleton, 'left'),
      'left toe at toe-start target'
    );
    expectBoneWorldPositionOnTarget(bones.get('leftToeTip')!, skeleton.joints.toeLeft, 'left toe tip at toe target');
    expectBoneWorldPositionOnTarget(
      bones.get('rightTalon')!,
      skeleton.joints.ankleRight,
      'right talon at ankle target'
    );
    expectBoneWorldPositionOnTarget(
      bones.get('rightTalonTip')!,
      getTalonPoint(skeleton, 'right'),
      'right talon tip at 40-degree floor target'
    );
    expectBoneWorldPositionOnTarget(
      bones.get('rightFoot')!,
      skeleton.joints.ankleRight,
      'right foot bone at ankle target'
    );
    expectBoneWorldPositionOnTarget(
      bones.get('rightToe')!,
      getToeStartPoint(skeleton, 'right'),
      'right toe at toe-start target'
    );
    expectBoneWorldPositionOnTarget(bones.get('rightToeTip')!, skeleton.joints.toeRight, 'right toe tip at toe target');

    model!.dispose();
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
      DEFAULT_PLANNER_POSTURE_SETTINGS,
      model!.postureModelMetrics
    );

    model!.applySkeleton(skeleton, 1);

    const posedHeadQuaternion = getBoneWorldQuaternion(bones, 'head');

    expect(Math.abs(restHeadQuaternion.angleTo(posedHeadQuaternion))).toBeLessThanOrEqual(0.0001);

    model!.dispose();
  });
});
