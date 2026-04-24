import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { calculateHumanModelBoneRigRatios } from '../../components/calculator/aluminum-rig-planner/human-model-rig';

const MODEL_PATH = fileURLToPath(
  new URL('../../../public/models/aluminum-rig-planner/human-male-realistic.glb', import.meta.url)
);

async function loadHumanModel() {
  const buffer = readFileSync(MODEL_PATH);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  return new GLTFLoader().parseAsync(arrayBuffer, '');
}

describe('aluminum rig planner human model rig', () => {
  it('calculates bone rig ratios from the GLB model rest pose', async () => {
    const gltf = await loadHumanModel();
    const ratios = calculateHumanModelBoneRigRatios(gltf.scene);

    expect(ratios).toEqual({
      sittingHeight: 0.465,
      seatedEyeHeight: 0.437,
      seatedShoulderHeight: 0.321,
      hipBreadth: 0.125,
      shoulderBreadth: 0.26,
      upperArmLength: 0.218,
      forearmHandLength: 0.251,
      thighLength: 0.245,
      lowerLegLength: 0.235,
      footLength: 0.095,
    });
  });
});
