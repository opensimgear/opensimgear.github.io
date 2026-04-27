import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { calculateHumanModelPostureModel } from '../../components/calculator/aluminum-rig-planner/human-model-rig';
import type { PlannerPostureModelMetrics } from '../../components/calculator/aluminum-rig-planner/types';

const MODEL_PATH = fileURLToPath(new URL('../../assets/models/human-male.glb', import.meta.url));

let postureModelPromise: Promise<PlannerPostureModelMetrics> | null = null;

export async function loadHumanModelPostureModelFixture() {
  postureModelPromise ??= loadHumanModelPostureModel();

  return postureModelPromise;
}

async function loadHumanModelPostureModel() {
  const buffer = readFileSync(MODEL_PATH);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const gltf = await new GLTFLoader().parseAsync(arrayBuffer, '');
  const postureModel = calculateHumanModelPostureModel(gltf.scene);

  if (!postureModel) {
    throw new Error('Human model fixture is missing required posture bones');
  }

  return postureModel;
}
