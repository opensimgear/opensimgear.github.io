import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const plannerSource = readFileSync(
  new URL('../../components/calculator/aluminum-rig-planner/index.svelte', import.meta.url),
  'utf8'
);

describe('aluminum rig planner component wiring', () => {
  it('does not mark presets custom from programmatic solver updates', () => {
    expect(plannerSource).toContain('suppressProgrammaticPlannerInputEdit');
    expect(plannerSource).toMatch(
      /function assignProgrammaticPlannerInput\(input: PlannerInput, options: \{ animate\?: boolean \} = \{\}\)/
    );
    expect(plannerSource).toMatch(/if \(suppressProgrammaticPlannerInputEdit\) {\s*return;\s*}/);
    expect(plannerSource).toMatch(/pendingCustomPresetInput = null;/);
    expect(plannerSource).toMatch(
      /const nextInput = applyPresetToPlannerInput\(plannerInput, value, postureSettings\.heightCm, postureModelMetrics\);/
    );
    expect(plannerSource).not.toContain('pendingMonitorHeightEyeSync');
    expect(plannerSource).not.toContain('handleEyeCenterChange');
    expect(plannerSource).toMatch(/assignProgrammaticPlannerInput\(nextInput\);/);
  });

  it('defers height preset optimization and posture report updates until release', () => {
    expect(plannerSource).toContain('postureHeightControlValue');
    expect(plannerSource).toContain('capturePostureHeightControl');
    expect(plannerSource).toContain("node.addEventListener('change', endInteraction, true);");
    expect(plannerSource).toContain("window.addEventListener('mouseup', endInteraction, true);");
    expect(plannerSource).toContain("window.addEventListener('touchend', endInteraction, true);");
    expect(plannerSource).toMatch(
      /if \(!postureHeightControlActive && postureHeightControlValue === postureSettings\.heightCm\)/
    );
    expect(plannerSource).toMatch(/bind:value=\{\(\) => postureHeightControlValue, setPostureHeightCm\}/);
    expect(plannerSource).toMatch(
      /function setPostureHeightCm\(value: number\) \{\s*postureHeightControlValue = clampPostureHeightCm\(value\);/
    );
    expect(plannerSource).toMatch(
      /const nextInput = recomputePresetDynamicPlannerInput\(\s*plannerInput,\s*postureSettings\.preset,\s*nextHeightCm,\s*postureModelMetrics\s*\);/
    );
    expect(plannerSource).toMatch(/function commitPostureHeightCm\(value: number, animateTransition = false\)/);
    expect(plannerSource).toContain('assignProgrammaticPlannerInput(nextInput, { animate: animateTransition });');
    expect(plannerSource).toMatch(
      /postureSettings\.monitorHeightFromBaseMm = applyPresetToPostureSettings\(\s*postureSettings,\s*nextInput,\s*postureModelMetrics\s*\)\.monitorHeightFromBaseMm;/
    );
    expect(plannerSource).toContain(
      'const postureReport = $derived(createPlannerPostureReport(geometry.input, postureSettings, postureModelMetrics));'
    );
    expect(plannerSource).toContain('geometry={sceneGeometry}');
    expect(plannerSource).toContain('postureSettings={scenePostureSettings}');
  });

  it('includes eye alignment in rig geometry preset scoring', () => {
    const presetsSource = readFileSync(
      new URL('../../components/calculator/aluminum-rig-planner/presets.ts', import.meta.url),
      'utf8'
    );

    expect(presetsSource).toContain('createPlannerPostureReport');
    expect(presetsSource).toContain('(metric.range.min + metric.range.max) / 2');
    expect(presetsSource).not.toContain("metric.key === 'eyeToWheelTop' ? metric.range.min");
    expect(presetsSource).not.toContain("metric.key === 'eyeToMonitorMidpoint'");
    expect(presetsSource).not.toContain("metric.key === 'headToMonitor'");
  });

  it('weights elbow bend and uses decreasing-step preset search', () => {
    const presetsSource = readFileSync(
      new URL('../../components/calculator/aluminum-rig-planner/presets.ts', import.meta.url),
      'utf8'
    );

    expect(presetsSource).toContain('elbowBend: 4');
    expect(presetsSource).toContain('PRESET_SEARCH_STEP_LEVELS');
    expect(presetsSource).toContain('SCORE_EPSILON');
    expect(presetsSource).not.toContain('getCandidateRangeValues');
    expect(presetsSource).not.toContain('DYNAMIC_SEARCH_STEPS.steeringColumnDistanceMm');
  });

  it('keeps steering column base height in decreasing-step preset search', () => {
    const presetsSource = readFileSync(
      new URL('../../components/calculator/aluminum-rig-planner/presets.ts', import.meta.url),
      'utf8'
    );

    expect(presetsSource).toContain('steeringColumnBaseHeightMm: 160');
    expect(presetsSource).toContain('steeringColumnBaseHeightMm: 10');
    expect(presetsSource).toContain('getSteeringColumnBaseHeightMaxMm()');
    expect(presetsSource).not.toContain('DYNAMIC_SEARCH_STEPS.steeringColumnBaseHeightMm');
  });

  it('shows target FOV editing only for flat monitors', () => {
    expect(plannerSource).toMatch(/\{#if postureSettings\.monitorCurvature === 'disabled'\}/);
    expect(plannerSource).toMatch(/label="Target FOV"/);
    expect(plannerSource).not.toMatch(/label="Distance"/);
  });
});
