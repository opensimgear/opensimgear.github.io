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
      /const nextInput = applyPresetToPlannerInput\(\s*plannerInput,\s*value,\s*postureSettings\.heightCm,\s*postureModelMetrics,\s*postureSettings\.targetRangesByPreset,\s*getPresetSolveOptions\(\)\s*\);/
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
      /const nextInput = recomputePresetDynamicPlannerInput\(\s*plannerInput,\s*postureSettings\.preset,\s*nextHeightCm,\s*postureModelMetrics,\s*postureSettings\.targetRangesByPreset,\s*getPresetSolveOptions\(\)\s*\);/
    );
    expect(plannerSource).toMatch(/function commitPostureHeightCm\(value: number, animateTransition = false\)/);
    expect(plannerSource).toContain('assignProgrammaticPlannerInput(nextInput, {animate: animateTransition});');
    expect(plannerSource).toContain('syncPresetMonitorHeightFromInput(nextInput);');
    expect(plannerSource).toContain(
      'createPlannerPostureReport(geometry.input, postureSettings, postureModelMetrics, {'
    );
    expect(plannerSource).toContain('includeMonitor: visibleModules.monitor');
    expect(plannerSource).toContain('if (!model || !model.postureModelMetrics)');
    expect(plannerSource).toContain('geometry={sceneGeometry}');
    expect(plannerSource).toContain('postureSettings={scenePostureSettings}');
  });

  it('has an explicit preset optimization button', () => {
    expect(plannerSource).toContain('function optimizeCurrentPosturePreset()');
    expect(plannerSource).toMatch(/if \(postureSettings\.preset !== 'custom'\)/);
    expect(plannerSource).toMatch(
      /const nextInput = recomputePresetDynamicPlannerInput\(\s*plannerInput,\s*postureSettings\.preset,\s*postureSettings\.heightCm,\s*postureModelMetrics,\s*postureSettings\.targetRangesByPreset,\s*getPresetSolveOptions\(\)\s*\);/
    );
    expect(plannerSource).toContain('assignProgrammaticPlannerInput(nextInput, {animate: true});');
    expect(plannerSource).toContain('syncPresetMonitorHeightFromInput(nextInput);');
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
    expect(presetsSource).toContain('const includeMonitor = shouldIncludeMonitor(options);');
    expect(presetsSource).toContain('if (includeMonitor) {');
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
    const settingsPaneIndex = plannerSource.indexOf('<Pane title="Rig Settings"');
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
    const posturePaneIndex = plannerSource.indexOf('<Pane title="Posture"');
    const settingsPaneIndex = plannerSource.indexOf('<Pane title="Rig Settings"');
    const monitorFolderIndex = plannerSource.indexOf('<Folder title="Monitor" expanded={false}>');
    const baseFolderIndex = plannerSource.indexOf('<Folder title="Base"', settingsPaneIndex);
    const monitorSource = plannerSource.slice(monitorFolderIndex, baseFolderIndex);
    const monitorModuleSource = readFileSync(
      new URL('../../components/calculator/aluminum-rig-planner/modules/monitor.ts', import.meta.url),
      'utf8'
    );
    const cameraControlsSource = readFileSync(
      new URL('../../components/calculator/shared/ViewportCameraControls.svelte', import.meta.url),
      'utf8'
    );

    expect(monitorFolderIndex).toBeGreaterThan(-1);
    expect(monitorFolderIndex).toBeGreaterThan(settingsPaneIndex);
    expect(plannerSource.slice(posturePaneIndex, settingsPaneIndex)).not.toContain('<Folder title="Monitor"');
    expect(monitorSource).toContain('label="FOV"');
    expect(monitorSource).toContain('label="Distance from Eyes"');
    expect(monitorSource).not.toContain("postureSettings.monitorCurvature === 'disabled'");
    expect(plannerSource).toContain('getMonitorTargetFovFromDistanceMm');
    expect(plannerSource).toMatch(/function setMonitorDistanceFromEyesMm\(value: number\)/);
    expect(plannerSource).toMatch(
      /bind:value=\{\(\) => postureSettings\.monitorDistanceFromEyesMm, setMonitorDistanceFromEyesMm\}/
    );
    expect(monitorModuleSource).toContain('getMonitorScreenEdgePoints');
    expect(sceneSource).toContain('showTopFovOverlay');
    expect(sceneSource).toContain('fovOverlayVisible');
    expect(sceneSource).toContain(
      'const canShowTopFovOverlay = $derived(Boolean(visibleModules.monitor && fovOverlay));'
    );
    expect(sceneSource).toContain('onShowTopFovOverlay={canShowTopFovOverlay');
    expect(cameraControlsSource).toContain('aria-label="Show top FOV overlay"');
    expect(cameraControlsSource).toContain('title="Top FOV"');
    expect(cameraControlsSource.indexOf('aria-label="Use orthographic camera"')).toBeLessThan(
      cameraControlsSource.indexOf('aria-label="Show top FOV overlay"')
    );
  });

  it('keeps module toggles and module folders in the settings pane', () => {
    const settingsPaneIndex = plannerSource.indexOf('<Pane title="Rig Settings"');
    const optimizerPaneIndex = plannerSource.indexOf('<Pane title="Cutlist Optimizer"', settingsPaneIndex);
    const settingsPaneSource = plannerSource.slice(settingsPaneIndex, optimizerPaneIndex);
    const enabledModulesIndex = settingsPaneSource.indexOf('<Folder title="Enabled Modules">');
    const monitorIndex = settingsPaneSource.indexOf('<Folder title="Monitor" expanded={false}>');
    const baseIndex = settingsPaneSource.indexOf('<Folder title="Base" expanded={false}>');
    const enabledModulesSource = settingsPaneSource.slice(
      enabledModulesIndex,
      settingsPaneSource.indexOf('{#if visibleModules.monitor}')
    );

    expect(settingsPaneIndex).toBeGreaterThan(-1);
    expect(plannerSource).not.toContain('<Pane title="Module Settings"');
    expect(enabledModulesIndex).toBeGreaterThan(-1);
    expect(enabledModulesIndex).toBeLessThan(monitorIndex);
    expect(enabledModulesSource).toContain('label="Monitor"');
    expect(enabledModulesSource).not.toContain('label="Steering column"');
    expect(enabledModulesSource).not.toContain('label="Pedal tray"');
    expect(monitorIndex).toBeLessThan(baseIndex);
    expect(settingsPaneSource).toContain('<Folder title="Steering Column" expanded={false}>');
    expect(settingsPaneSource).toContain('<Folder title="Pedal Tray" expanded={false}>');
    expect(settingsPaneSource).toContain('<Folder title="Pedals" expanded={false}>');
  });

  it('resets the scene camera back to perspective mode', () => {
    expect(sceneSource).toMatch(
      /async function resetCameraView\(\) \{\s*fovOverlayVisible = false;\s*useOrthographicCamera = false;\s*savedView = null;\s*await tick\(\);\s*applySavedView\(\);\s*\}/
    );
  });

  it('does not carry top FOV camera up into perspective mode', () => {
    expect(sceneSource).toContain('function isTopFovCameraUp()');
    expect(sceneSource).toContain(
      'const shouldResetFovView = useOrthographicCamera && !nextUseOrthographicCamera && isTopFovCameraUp();'
    );
    expect(sceneSource).toMatch(
      /if \(shouldResetFovView\) \{\s*savedView = null;\s*\} else \{\s*captureCurrentView\(\);/
    );
  });
});
