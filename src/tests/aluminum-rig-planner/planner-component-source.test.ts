import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const plannerSource = readFileSync(
  new URL('../../components/calculator/aluminum-rig-planner/index.svelte', import.meta.url),
  'utf8'
);

describe('aluminum rig planner component wiring', () => {
  it('does not mark presets custom from programmatic solver updates', () => {
    expect(plannerSource).toContain('suppressProgrammaticPlannerInputEdit');
    expect(plannerSource).toMatch(/function assignProgrammaticPlannerInput\(input: PlannerInput\)/);
    expect(plannerSource).toMatch(/if \(suppressProgrammaticPlannerInputEdit\) {\s*return;\s*}/);
    expect(plannerSource).toMatch(/pendingCustomPresetInput = null;/);
    expect(plannerSource).toMatch(
      /const nextInput = applyPresetToPlannerInput\(plannerInput, value, postureSettings\.heightCm, postureModelMetrics\);/
    );
    expect(plannerSource).not.toContain('pendingMonitorHeightEyeSync');
    expect(plannerSource).not.toContain('handleEyeCenterChange');
    expect(plannerSource).toMatch(/assignProgrammaticPlannerInput\(nextInput\);/);
    expect(plannerSource).toMatch(
      /assignProgrammaticPlannerInput\(\s*recomputePresetDynamicPlannerInput\(plannerInput, postureSettings\.preset, nextHeightCm, postureModelMetrics\)\s*\)/
    );
  });

  it('includes eye alignment in rig geometry preset scoring', () => {
    const presetsSource = readFileSync(
      new URL('../../components/calculator/aluminum-rig-planner/presets.ts', import.meta.url),
      'utf8'
    );

    expect(presetsSource).toContain('createPlannerPostureReport');
    expect(presetsSource).not.toContain("metric.key === 'eyeToMonitorMidpoint'");
    expect(presetsSource).not.toContain("metric.key === 'headToMonitor'");
  });

  it('shows target FOV editing only for flat monitors', () => {
    expect(plannerSource).toMatch(/\{#if postureSettings\.monitorCurvature === 'disabled'\}/);
    expect(plannerSource).toMatch(/label="Target FOV"/);
    expect(plannerSource).not.toMatch(/label="Distance"/);
  });
});
