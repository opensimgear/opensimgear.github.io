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
  it('keeps the export eye center bone out of app rig overlays', () => {
    const debugOrder = humanModelRigSource.match(/const HUMAN_DEBUG_BONE_ORDER[\s\S]*?\];/)?.[0] ?? '';

    expect(exportScriptSource).not.toContain('EYE_CENTER_FROM_NECK = Vector((');
    expect(exportScriptSource).not.toContain('def eye_center_from_head_vector');
    expect(exportScriptSource).toContain('EYE_CENTER_X_OFFSET_M =');
    expect(exportScriptSource).toContain('EYE_CENTER_Y_OFFSET_M =');
    expect(exportScriptSource).toContain('EYE_CENTER_TAIL_LENGTH_M =');
    expect(exportScriptSource).toMatch(
      /eye_center = neck_base \+ Vector\(\(EYE_CENTER_X_OFFSET_M, EYE_CENTER_Y_OFFSET_M, 0\.0\s*\)\)/
    );
    expect(exportScriptSource).toMatch(
      /remapped_bones\["eyeCenter"\]\s*=\s*\(\s*eye_center,\s*eye_center \+ Vector\(\(EYE_CENTER_TAIL_LENGTH_M, 0\.0, 0\.0\)\),\s*"head",?\s*\)/s
    );
    expect(exportScriptSource).toContain('NON_DEFORM_BONES = {"eyeCenter"}');
    expect(exportScriptSource).toMatch(/use_deform = name not in NON_DEFORM_BONES and "Tip" not in name/);
    expect(debugOrder).not.toContain('eyeCenter');
    expect(humanModelRigSource).not.toContain('EYE_CENTER_BONE_LENGTH_FROM_HEAD_LENGTH_RATIO');
    expect(humanModelRigSource).not.toContain('getEyeCenter');
    expect(humanModelRigSource).not.toContain('leftEyeDebugBall');
  });

  it('rewrites the generated anthropometry defaults file from fitted model metrics', () => {
    expect(exportScriptSource).toContain('TARGET_ANTHROPOMETRY_DEFAULTS =');
    expect(exportScriptSource).toContain('"anthropometry-defaults.ts"');
    expect(exportScriptSource).toContain('DEFAULT_ANTHROPOMETRY_REFERENCE_HEIGHT_CM = 169');
    expect(exportScriptSource).toContain('POSTURE_SHOULDER_ABOVE_HIP_CLEARANCE_M = 0.06');
    expect(exportScriptSource).toMatch(/def calculate_anthropometry_ratios\(bones, min_planner, max_planner\):/);
    expect(exportScriptSource).toMatch(/def calculate_heel_length_share\(bones\):/);
    expect(exportScriptSource).toMatch(/def calculate_average_foot_length\(bones\):/);
    expect(exportScriptSource).toMatch(/def format_generated_anthropometry_defaults\(ratios, heel_length_share\):/);
    expect(exportScriptSource).toMatch(/write_anthropometry_defaults\(bones, min_planner, max_planner\)/);
    expect(exportScriptSource).toContain('export const DEFAULT_ANTHROPOMETRY_HEEL_LENGTH_SHARE = {heel_length_share};');
    expect(exportScriptSource).toContain('heel_length_share = calculate_heel_length_share(bones)');
    expect(exportScriptSource).toContain('satisfies PlannerAnthropometryLengthsMm');
    expect(exportScriptSource).toContain('Record<keyof PlannerAnthropometryRatios');
  });

  it('forks each foot armature from the ankle into talon, foot, and toe bones', () => {
    expect(exportScriptSource).toContain('TOE_BONE_START_SHARE = 0.75');
    expect(exportScriptSource).toContain('TALON_BACKWARD_ANGLE_DEG = 40');
    expect(exportScriptSource).toMatch(/def talon_tail_from_ankle\(ankle, toe, floor_y\):/);
    expect(exportScriptSource).not.toMatch(/talon_tail_from_ankle[\s\S]*?\) \* 1\.2/);
    expect(exportScriptSource).toMatch(/left_talon = talon_tail_from_ankle\(left_ankle, left_foot_tip, floor_y\)/);
    expect(exportScriptSource).toMatch(/right_talon = talon_tail_from_ankle\(right_ankle, right_foot_tip, floor_y\)/);
    expect(exportScriptSource).toMatch(/left_foot = left_talon\.lerp\(left_foot_tip, TOE_BONE_START_SHARE\)/);
    expect(exportScriptSource).toMatch(/right_foot = right_talon\.lerp\(right_foot_tip, TOE_BONE_START_SHARE\)/);
    expect(exportScriptSource).toMatch(/"leftTalon": \(left_ankle, left_talon, "leftShin"\)/);
    expect(exportScriptSource).toMatch(/"leftFoot": \(left_ankle, left_foot, "leftShin"\)/);
    expect(exportScriptSource).toMatch(/"leftToe": \(left_foot, left_foot_tip, "leftFoot"\)/);
    expect(exportScriptSource).toMatch(/remapped_bones\["rightTalon"\] = \(right_ankle, right_talon, "rightShin"\)/);
    expect(exportScriptSource).toMatch(/remapped_bones\["rightFoot"\] = \(right_ankle, right_foot, "rightShin"\)/);
    expect(exportScriptSource).toMatch(/remapped_bones\["rightToe"\] = \(right_foot, right_foot_tip, "rightFoot"\)/);
    expect(exportScriptSource).toContain('add_terminal_bone(remapped_bones, "leftTalonTip", "leftTalon")');
    expect(exportScriptSource).toContain('add_terminal_bone(remapped_bones, "rightTalonTip", "rightTalon")');
    expect(exportScriptSource).toContain('add_terminal_bone(remapped_bones, "leftToeTip", "leftToe")');
    expect(exportScriptSource).toContain('add_terminal_bone(remapped_bones, "rightToeTip", "rightToe")');
  });
});
