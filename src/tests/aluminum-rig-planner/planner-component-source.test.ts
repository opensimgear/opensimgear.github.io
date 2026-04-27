import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const plannerSource = readFileSync(
  new URL('../../components/calculator/aluminum-rig-planner/index.svelte', import.meta.url),
  'utf8'
);
const sceneSource = readFileSync(
  new URL('../../components/calculator/aluminum-rig-planner/Scene.svelte', import.meta.url),
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
      /const nextInput = applyPresetToPlannerInput\(\s*plannerInput,\s*value,\s*postureSettings\.heightCm,\s*postureModelMetrics,\s*postureSettings\.targetRangesByPreset\s*\);/
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
      /const nextInput = recomputePresetDynamicPlannerInput\(\s*plannerInput,\s*postureSettings\.preset,\s*nextHeightCm,\s*postureModelMetrics,\s*postureSettings\.targetRangesByPreset\s*\);/
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

  it('has an explicit preset optimization button', () => {
    expect(plannerSource).toContain('function optimizeCurrentPosturePreset()');
    expect(plannerSource).toMatch(/if \(postureSettings\.preset !== 'custom'\)/);
    expect(plannerSource).toMatch(
      /const nextInput = recomputePresetDynamicPlannerInput\(\s*plannerInput,\s*postureSettings\.preset,\s*postureSettings\.heightCm,\s*postureModelMetrics,\s*postureSettings\.targetRangesByPreset\s*\);/
    );
    expect(plannerSource).toContain('assignProgrammaticPlannerInput(nextInput, { animate: true });');
    expect(plannerSource).toContain('getOptimizedPresetMonitorHeightFromBaseMm');
    expect(plannerSource).toContain('onOptimizePosture={optimizeCurrentPosturePreset}');
    expect(plannerSource).not.toMatch(/<Button\s+on:click=\{optimizeCurrentPosturePreset\}/);
    expect(sceneSource).toContain('onOptimizePosture: () => void;');
    expect(sceneSource).toMatch(/\{#if postureSettings\.preset === 'custom'\}/);
    expect(sceneSource).toContain('class="posture-debug-panel__optimize"');
    expect(sceneSource).toContain('onclick={onOptimizePosture}');
    expect(sceneSource).toContain('bottom: 8px;');
    expect(sceneSource).toContain('.posture-debug-panel:hover .posture-debug-panel__optimize');
    expect(sceneSource).toContain('max-height: min(86vh, 560px);');
    expect(sceneSource).toContain('overflow: visible;');
    expect(sceneSource).not.toContain('overflow: auto;');
    expect(plannerSource).not.toMatch(/disabled=\{!isPresetSolvablePreset\(postureSettings\.preset\)\}/);
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

  it('promotes general controls to a top panel with the advanced toggle', () => {
    const generalPaneIndex = plannerSource.indexOf('<Pane title="General"');
    const posturePaneIndex = plannerSource.indexOf('<Pane title="Posture"');
    const settingsPaneIndex = plannerSource.indexOf('<Pane title="Settings"');
    const generalPaneSource = plannerSource.slice(generalPaneIndex, posturePaneIndex);
    const posturePaneSource = plannerSource.slice(posturePaneIndex, settingsPaneIndex);

    expect(generalPaneIndex).toBeGreaterThan(-1);
    expect(generalPaneIndex).toBeLessThan(posturePaneIndex);
    expect(plannerSource).toContain('bind:expanded={paneExpanded.general}');
    expect(plannerSource).not.toContain('<Folder title="General">');
    expect(generalPaneSource).toContain('label="Finish"');
    expect(generalPaneSource).toContain('label="Endcaps"');
    expect(generalPaneSource).toContain('label="Advanced"');
    expect(posturePaneSource).not.toContain('label="Advanced"');
  });

  it('shows target FOV and distance editing for flat and curved monitors', () => {
    const monitorFolderIndex = plannerSource.indexOf('<Folder title="Monitor">');
    const settingsPaneIndex = plannerSource.indexOf('<Pane title="Settings"', monitorFolderIndex);
    const monitorSource = plannerSource.slice(monitorFolderIndex, settingsPaneIndex);
    const monitorModuleSource = readFileSync(
      new URL('../../components/calculator/aluminum-rig-planner/modules/monitor.ts', import.meta.url),
      'utf8'
    );
    const cameraControlsSource = readFileSync(
      new URL('../../components/calculator/shared/ViewportCameraControls.svelte', import.meta.url),
      'utf8'
    );

    expect(monitorFolderIndex).toBeGreaterThan(-1);
    expect(monitorSource).toContain('label="Target FOV"');
    expect(monitorSource).toContain('label="Distance"');
    expect(monitorSource).not.toContain("postureSettings.monitorCurvature === 'disabled'");
    expect(plannerSource).toContain('getMonitorTargetFovFromDistanceMm');
    expect(plannerSource).toMatch(/function setMonitorDistanceFromEyesMm\(value: number\)/);
    expect(plannerSource).toMatch(
      /bind:value=\{\(\) => postureSettings\.monitorDistanceFromEyesMm, setMonitorDistanceFromEyesMm\}/
    );
    expect(monitorModuleSource).toContain('getMonitorScreenEdgePoints');
    expect(sceneSource).toContain('showTopFovOverlay');
    expect(sceneSource).toContain('fovOverlayVisible');
    expect(cameraControlsSource).toContain('aria-label="Show top FOV overlay"');
    expect(cameraControlsSource).toContain('title="Top FOV"');
  });
});
