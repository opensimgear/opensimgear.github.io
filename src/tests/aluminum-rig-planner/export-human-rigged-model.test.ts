import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const exportScriptSource = readFileSync(
  new URL('../../../scripts/export-human-rigged-model.py', import.meta.url),
  'utf8'
);
const postureReportSource = readFileSync(
  new URL('../../components/calculator/aluminum-rig-planner/posture-report.ts', import.meta.url),
  'utf8'
);
const humanModelRigSource = readFileSync(
  new URL('../../components/calculator/aluminum-rig-planner/human-model-rig.ts', import.meta.url),
  'utf8'
);

function readSourceNumber(source: string, pattern: RegExp) {
  const match = source.match(pattern);

  if (!match) {
    throw new Error(`Missing source number for ${pattern}`);
  }

  return Number(match[1]);
}

describe('human rig export script', () => {
  it('adds a hidden eye center bone from the same neck vector used by app eye debug', () => {
    const neckOffsetXMm = readSourceNumber(postureReportSource, /const EYE_DEBUG_NECK_OFFSET_X_MM = ([\d.]+);/);
    const neckOffsetYMm = readSourceNumber(postureReportSource, /const EYE_DEBUG_NECK_OFFSET_Y_MM = ([\d.]+);/);
    const neckOffsetZMm = readSourceNumber(postureReportSource, /const EYE_DEBUG_NECK_OFFSET_Z_MM = ([\d.]+);/);
    const expectedVector = [neckOffsetXMm, neckOffsetYMm, neckOffsetZMm]
      .map((offsetMm) => (offsetMm * 0.001).toFixed(3))
      .join(', ');
    const debugOrder = humanModelRigSource.match(/const HUMAN_DEBUG_BONE_ORDER[\s\S]*?\];/)?.[0] ?? '';

    expect(exportScriptSource).toContain(`EYE_CENTER_FROM_NECK = Vector((${expectedVector}))`);
    expect(exportScriptSource).toMatch(
      /remapped_bones\["eyeCenter"\]\s*=\s*\(neck_base,\s*neck_base \+ EYE_CENTER_FROM_NECK,\s*"neck"\)/
    );
    expect(exportScriptSource).toContain('NON_DEFORM_BONES = {"eyeCenter"}');
    expect(exportScriptSource).toMatch(/use_deform = name not in NON_DEFORM_BONES and "Tip" not in name/);
    expect(debugOrder).not.toContain('eyeCenter');
  });
});
