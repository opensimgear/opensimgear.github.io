import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const exportScriptSource = readFileSync(
  new URL('../../../scripts/export-human-rigged-model.py', import.meta.url),
  'utf8'
);
const humanModelRigSource = readFileSync(
  new URL('../../components/calculator/aluminum-rig-planner/human-model-rig.ts', import.meta.url),
  'utf8'
);

describe('human rig export script', () => {
  it('derives the hidden eye center bone from the head bone vector', () => {
    const eyeCenterHelper =
      exportScriptSource.match(
        /def eye_center_from_head_vector\(head_vector\):[\s\S]*?(?=\ndef point_at_bone_length)/
      )?.[0] ?? '';
    const debugOrder = humanModelRigSource.match(/const HUMAN_DEBUG_BONE_ORDER[\s\S]*?\];/)?.[0] ?? '';

    expect(exportScriptSource).not.toContain('EYE_CENTER_FROM_NECK = Vector((');
    expect(eyeCenterHelper).toContain('head_vector.length');
    expect(eyeCenterHelper).toContain('head_vector.normalized()');
    expect(exportScriptSource).toMatch(/head_vector = fitted_landmarks\["headTop"\] - neck_base/);
    expect(exportScriptSource).toMatch(
      /remapped_bones\["eyeCenter"\]\s*=\s*\(\s*neck_base,\s*neck_base \+ eye_center_from_head_vector\(head_vector\),\s*"neck",?\s*\)/s
    );
    expect(exportScriptSource).toContain('NON_DEFORM_BONES = {"eyeCenter"}');
    expect(exportScriptSource).toMatch(/use_deform = name not in NON_DEFORM_BONES and "Tip" not in name/);
    expect(debugOrder).not.toContain('eyeCenter');
  });
});
