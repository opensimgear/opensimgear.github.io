import { describe, expect, it } from 'vitest';

import {
  BASE_BEAM_HEIGHT_MM,
  DEFAULT_ACTIVE_POSTURE_PRESET,
  DEFAULT_PLANNER_INPUT,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  PLANNER_CONTROL_STEP_MM,
  PLANNER_DIMENSION_LIMITS,
  PLANNER_LAYOUT,
  PLANNER_POSTURE_LIMITS,
} from '../../components/calculator/aluminum-rig-planner/constants';
import { clampPlannerInput, getPedalBrakeDeltaMaxMm } from '../../components/calculator/aluminum-rig-planner/geometry';
import {
  createPlannerPostureSkeleton,
  getPlannerPostureFootContactErrorMm,
} from '../../components/calculator/aluminum-rig-planner/posture';
import { createPlannerPostureReport } from '../../components/calculator/aluminum-rig-planner/posture-report';
import {
  applyPresetToPlannerInput,
  applyPresetToPostureSettings,
  getOptimizedPresetMonitorHeightFromBaseMm,
  getPresetAfterPlannerInputEdit,
  PLANNER_POSTURE_PRESETS,
  recomputePresetDynamicPlannerInput,
} from '../../components/calculator/aluminum-rig-planner/presets';
import type { PlannerInput, PlannerPosturePreset } from '../../components/calculator/aluminum-rig-planner/types';

const NON_CUSTOM_PRESETS = ['gt', 'rally', 'drift', 'road'] satisfies PlannerPosturePreset[];
const DYNAMIC_KEYS = [
  'steeringColumnBaseHeightMm',
  'steeringColumnHeightMm',
  'steeringColumnDistanceMm',
  'pedalTrayDistanceMm',
  'pedalsHeightMm',
  'pedalBrakeDeltaMm',
  'baseLengthMm',
] as const;
const FIXED_FINAL_PRESET_KEYS = [
  'seatHeightFromBaseInnerBeamsMm',
  'seatAngleDeg',
  'backrestAngleDeg',
  'wheelDiameterMm',
  'wheelAngleDeg',
] as const;
const DYNAMIC_KEY_SET = new Set<keyof PlannerInput>(DYNAMIC_KEYS);

function expectOnlyDynamicFieldsToChange(before: PlannerInput, after: PlannerInput) {
  for (const key of Object.keys(before) as Array<keyof PlannerInput>) {
    if (DYNAMIC_KEY_SET.has(key)) {
      continue;
    }

    expect(after[key]).toBe(before[key]);
  }
}

function getPedalPostureAngleScore(input: PlannerInput, preset: PlannerPosturePreset, heightCm: number) {
  const report = createPlannerPostureReport(input, {
    ...DEFAULT_PLANNER_POSTURE_SETTINGS,
    preset,
    heightCm,
    monitorHeightFromBaseMm: getOptimizedPresetMonitorHeightFromBaseMm(input, preset, heightCm),
  });

  return report.metrics
    .filter((metric) => ['kneeBend', 'ankleBend', 'footToToeBend', 'brakeAlignment'].includes(metric.key))
    .reduce((total, metric) => {
      const value = metric.valueDeg ?? 0;
      const target = (metric.range.min + metric.range.max) / 2;
      const width = Math.max(1, metric.range.max - metric.range.min);

      return total + Math.abs(value - target) / width;
    }, 0);
}

function getMetricTargetScore(input: PlannerInput, preset: PlannerPosturePreset, heightCm: number, metricKey: string) {
  const report = createPlannerPostureReport(input, {
    ...DEFAULT_PLANNER_POSTURE_SETTINGS,
    preset,
    heightCm,
    monitorHeightFromBaseMm: getOptimizedPresetMonitorHeightFromBaseMm(input, preset, heightCm),
  });
  const metric = report.metrics.find((candidate) => candidate.key === metricKey);

  if (!metric) {
    throw new Error(`Missing posture metric ${metricKey}`);
  }

  const value = metric.valueDeg ?? metric.valueMm ?? 0;
  const target = (metric.range.min + metric.range.max) / 2;
  const width = Math.max(1, metric.range.max - metric.range.min);

  return Math.abs(value - target) / width;
}

function getPresetFixedInputValues(preset: (typeof NON_CUSTOM_PRESETS)[number]) {
  const { seatHeightFromBaseInnerBeamsMm, seatAngleDeg, backrestAngleDeg, wheelDiameterMm, wheelAngleDeg } =
    PLANNER_POSTURE_PRESETS[preset];

  return {
    seatHeightFromBaseInnerBeamsMm,
    seatAngleDeg,
    backrestAngleDeg,
    wheelDiameterMm,
    wheelAngleDeg,
  };
}

describe('aluminum rig planner posture presets', () => {
  it('uses GT as the default active preset', () => {
    expect(DEFAULT_ACTIVE_POSTURE_PRESET).toBe('gt');
    expect(DEFAULT_PLANNER_POSTURE_SETTINGS.preset).toBe(DEFAULT_ACTIVE_POSTURE_PRESET);
  });

  it.each(NON_CUSTOM_PRESETS)('applies every fixed-final preset value for %s', (preset) => {
    const result = applyPresetToPlannerInput(
      {
        ...DEFAULT_PLANNER_INPUT,
        seatHeightFromBaseInnerBeamsMm: 222,
        seatAngleDeg: 42,
        backrestAngleDeg: 135,
        pedalsHeightMm: 13,
        pedalAngleDeg: 33,
        wheelDiameterMm: 350,
        wheelAngleDeg: 1,
        wheelHeightOffsetMm: 13,
        wheelDistanceFromSteeringColumnMm: -250,
      },
      preset,
      DEFAULT_PLANNER_POSTURE_SETTINGS.heightCm
    );

    for (const key of FIXED_FINAL_PRESET_KEYS) {
      expect(result[key]).toBe(PLANNER_POSTURE_PRESETS[preset][key]);
    }
  });

  it.each(NON_CUSTOM_PRESETS)('preserves current wheel offset and distance when applying %s preset', (preset) => {
    const current = {
      ...DEFAULT_PLANNER_INPUT,
      wheelHeightOffsetMm: 13,
      wheelDistanceFromSteeringColumnMm: -250,
    };
    const result = applyPresetToPlannerInput(current, preset, DEFAULT_PLANNER_POSTURE_SETTINGS.heightCm);

    expect('wheelHeightOffsetMm' in PLANNER_POSTURE_PRESETS[preset]).toBe(false);
    expect('wheelDistanceFromSteeringColumnMm' in PLANNER_POSTURE_PRESETS[preset]).toBe(false);
    expect(result.wheelHeightOffsetMm).toBe(current.wheelHeightOffsetMm);
    expect(result.wheelDistanceFromSteeringColumnMm).toBe(current.wheelDistanceFromSteeringColumnMm);
  });

  it.each(NON_CUSTOM_PRESETS)('stores %s pedal height as a hip-relative preset value', (preset) => {
    expect('pedalsHeightMm' in PLANNER_POSTURE_PRESETS[preset]).toBe(false);
    expect(Number.isFinite(PLANNER_POSTURE_PRESETS[preset].pedalHeightVsHipsMm)).toBe(true);
  });

  it.each(NON_CUSTOM_PRESETS)('stores %s seat height as a preset fixed value', (preset) => {
    expect(Number.isFinite(PLANNER_POSTURE_PRESETS[preset].seatHeightFromBaseInnerBeamsMm)).toBe(true);
  });

  it.each(NON_CUSTOM_PRESETS)('preserves current pedal angle when applying %s preset', (preset) => {
    const input = {
      ...DEFAULT_PLANNER_INPUT,
      pedalAngleDeg: 42,
    };
    const result = applyPresetToPlannerInput(input, preset, DEFAULT_PLANNER_POSTURE_SETTINGS.heightCm);

    expect('pedalAngleDeg' in PLANNER_POSTURE_PRESETS[preset]).toBe(false);
    expect(result.pedalAngleDeg).toBe(input.pedalAngleDeg);
  });

  it.each(NON_CUSTOM_PRESETS)('preserves current pedal delta X when applying %s preset', (preset) => {
    const input = {
      ...DEFAULT_PLANNER_INPUT,
      pedalsDeltaMm: 120,
    };
    const result = applyPresetToPlannerInput(input, preset, DEFAULT_PLANNER_POSTURE_SETTINGS.heightCm);

    expect(result.pedalsDeltaMm).toBe(input.pedalsDeltaMm);
  });

  it.each(NON_CUSTOM_PRESETS)('keeps solved pedal values after applying %s preset', (preset) => {
    const heightCm = 182;
    const seededInput = clampPlannerInput({ ...DEFAULT_PLANNER_INPUT, ...getPresetFixedInputValues(preset) });
    const solvedInput = recomputePresetDynamicPlannerInput(seededInput, preset, heightCm);
    const result = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, preset, heightCm);

    expect(result.pedalsHeightMm).toBe(solvedInput.pedalsHeightMm);
    expect(result.pedalsDeltaMm).toBe(DEFAULT_PLANNER_INPUT.pedalsDeltaMm);
    expect(result.pedalBrakeDeltaMm).toBe(solvedInput.pedalBrakeDeltaMm);
  });

  it.each(NON_CUSTOM_PRESETS)('recomputes dynamic fields when activating %s from stale geometry', (preset) => {
    const heightCm = 182;
    const staleInput = {
      ...DEFAULT_PLANNER_INPUT,
      steeringColumnBaseHeightMm: PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMaxMm,
      steeringColumnHeightMm: PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm,
      steeringColumnDistanceMm: 80,
      pedalTrayDistanceMm: PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMinMm,
      pedalsHeightMm: PLANNER_DIMENSION_LIMITS.pedalsHeightMaxMm,
      pedalAngleDeg: PLANNER_DIMENSION_LIMITS.pedalAngleDegMax,
    };
    const seededInput = clampPlannerInput({ ...staleInput, ...getPresetFixedInputValues(preset) });
    const solvedInput = recomputePresetDynamicPlannerInput(seededInput, preset, heightCm);
    const result = applyPresetToPlannerInput(staleInput, preset, heightCm);

    for (const key of DYNAMIC_KEYS) {
      expect(result[key]).toBe(solvedInput[key]);
    }
    expect(DYNAMIC_KEYS.some((key) => result[key] !== staleInput[key])).toBe(true);
  });

  it('recomputes dynamic geometry for height while preserving fixed wheel preset intent', () => {
    const base = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, 'gt', 169);
    const tall = recomputePresetDynamicPlannerInput(base, 'gt', 205);

    expect(DYNAMIC_KEYS.some((key) => tall[key] !== base[key])).toBe(true);
    expect(tall.seatAngleDeg).toBe(PLANNER_POSTURE_PRESETS.gt.seatAngleDeg);
    expect(tall.backrestAngleDeg).toBe(PLANNER_POSTURE_PRESETS.gt.backrestAngleDeg);
    expect(tall.wheelHeightOffsetMm).toBe(base.wheelHeightOffsetMm);
    expect(tall.wheelDistanceFromSteeringColumnMm).toBe(base.wheelDistanceFromSteeringColumnMm);
  });

  it.each(NON_CUSTOM_PRESETS)('recompute changes only allowed dynamic fields for %s', (preset) => {
    const current = {
      ...DEFAULT_PLANNER_INPUT,
      baseWidthMm: 999,
      seatBaseDepthMm: 777,
      baseInnerBeamSpacingMm: 999,
      seatLengthMm: 999,
      seatDeltaMm: 999,
      seatHeightFromBaseInnerBeamsMm: -100,
      seatAngleDeg: 42,
      backrestAngleDeg: 88,
      pedalTrayDepthMm: 777,
      pedalsDeltaMm: 120,
      pedalAcceleratorDeltaMm: 999,
      pedalBrakeDeltaMm: 999,
      pedalClutchDeltaMm: 999,
      wheelHeightOffsetMm: 999,
      wheelAngleDeg: 44,
      wheelDistanceFromSteeringColumnMm: 0,
      wheelDiameterMm: 999,
    };
    const result = recomputePresetDynamicPlannerInput(current, preset, 205);

    expectOnlyDynamicFieldsToChange(current, result);
    expect(DYNAMIC_KEYS.some((key) => result[key] !== current[key])).toBe(true);
  });

  it('preserves current geometry when applying custom preset', () => {
    const custom = {
      ...DEFAULT_PLANNER_INPUT,
      pedalTrayDistanceMm: 510,
      steeringColumnDistanceMm: 360,
      wheelHeightOffsetMm: 42,
    };

    expect(applyPresetToPlannerInput(custom, 'custom', 169)).toEqual(custom);
  });

  it('optimizes dynamic geometry for custom preset when manually recomputed', () => {
    const custom = {
      ...DEFAULT_PLANNER_INPUT,
      pedalTrayDistanceMm: PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMinMm,
      steeringColumnDistanceMm: 80,
      steeringColumnBaseHeightMm: PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMaxMm,
      steeringColumnHeightMm: PLANNER_DIMENSION_LIMITS.steeringColumnHeightMaxMm,
      pedalsHeightMm: PLANNER_DIMENSION_LIMITS.pedalsHeightMaxMm,
      pedalAngleDeg: PLANNER_DIMENSION_LIMITS.pedalAngleDegMax,
      wheelHeightOffsetMm: 42,
    };
    const result = recomputePresetDynamicPlannerInput(custom, 'custom', 169);

    expectOnlyDynamicFieldsToChange(custom, result);
    expect(DYNAMIC_KEYS.some((key) => result[key] !== custom[key])).toBe(true);
  });

  it('marks a non-custom preset custom after a planner geometry edit', () => {
    expect(
      getPresetAfterPlannerInputEdit('gt', DEFAULT_PLANNER_INPUT, {
        ...DEFAULT_PLANNER_INPUT,
        steeringColumnDistanceMm: DEFAULT_PLANNER_INPUT.steeringColumnDistanceMm + 10,
      })
    ).toBe('custom');
  });

  it('preserves the preset when a planner geometry setter emits the same value', () => {
    expect(getPresetAfterPlannerInputEdit('gt', DEFAULT_PLANNER_INPUT, { ...DEFAULT_PLANNER_INPUT })).toBe('gt');
    expect(getPresetAfterPlannerInputEdit('custom', DEFAULT_PLANNER_INPUT, { ...DEFAULT_PLANNER_INPUT })).toBe(
      'custom'
    );
  });

  it.each(NON_CUSTOM_PRESETS)('matches base length to solved pedal tray placement for %s', (preset) => {
    const result = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, preset, 182);

    expect(result.baseLengthMm).toBe(result.seatBaseDepthMm + result.pedalTrayDistanceMm + result.pedalTrayDepthMm);
  });

  it.each(NON_CUSTOM_PRESETS)('derives steering column height from base height for %s', (preset) => {
    const result = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, preset, 182);

    expect(result.steeringColumnHeightMm).toBe(
      result.steeringColumnBaseHeightMm + PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm
    );
  });

  it.each(NON_CUSTOM_PRESETS)('optimizes monitor height to eye center when applying %s preset', (preset) => {
    const heightCm = 182;
    const input = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, preset, heightCm);
    const settings = applyPresetToPostureSettings(
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        preset,
        heightCm,
        monitorHeightFromBaseMm: 0,
      },
      input
    );
    const skeleton = createPlannerPostureSkeleton(input, settings);
    const expectedHeightFromBaseMm =
      Math.round((skeleton.joints.eyeCenter[2] * 1000 - BASE_BEAM_HEIGHT_MM) / PLANNER_CONTROL_STEP_MM) *
      PLANNER_CONTROL_STEP_MM;

    expect(settings.monitorHeightFromBaseMm).toBe(expectedHeightFromBaseMm);
    expect(getOptimizedPresetMonitorHeightFromBaseMm(input, preset, heightCm)).toBe(expectedHeightFromBaseMm);
  });

  it('uses boosted low-height eye center for preset monitor optimization', () => {
    const preset = 'gt';
    const boostedHeightCm = 119;
    const thresholdHeightCm = 120;
    const boostedInput = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, preset, boostedHeightCm);
    const thresholdInput = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, preset, thresholdHeightCm);
    const boostedMonitorHeight = getOptimizedPresetMonitorHeightFromBaseMm(boostedInput, preset, boostedHeightCm);
    const thresholdMonitorHeight = getOptimizedPresetMonitorHeightFromBaseMm(thresholdInput, preset, thresholdHeightCm);
    const boostedSkeleton = createPlannerPostureSkeleton(boostedInput, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      preset,
      heightCm: boostedHeightCm,
      monitorHeightFromBaseMm: 0,
    });
    const expectedBoostedHeight =
      Math.round((boostedSkeleton.joints.eyeCenter[2] * 1000 - BASE_BEAM_HEIGHT_MM) / PLANNER_CONTROL_STEP_MM) *
      PLANNER_CONTROL_STEP_MM;

    expect(boostedMonitorHeight).toBe(expectedBoostedHeight);
    expect(boostedMonitorHeight).toBeGreaterThan(thresholdMonitorHeight);
  });

  it('uses boosted low-height body position for preset dynamic optimization', () => {
    const preset = 'gt';
    const boostedInput = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, preset, 119);
    const thresholdInput = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, preset, 120);

    expect(boostedInput.steeringColumnDistanceMm).toBeGreaterThan(thresholdInput.steeringColumnDistanceMm);
    expect(boostedInput.pedalsHeightMm).not.toBe(thresholdInput.pedalsHeightMm);
  });

  it('uses boosted eye center for eye-to-wheel preset optimization', () => {
    const preset = 'gt';
    const boostedHeightCm = 119;
    const solvedInput = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, preset, boostedHeightCm);
    const lowWheelInput = {
      ...solvedInput,
      steeringColumnBaseHeightMm: solvedInput.steeringColumnBaseHeightMm - PLANNER_CONTROL_STEP_MM * 3,
    };

    expect(getMetricTargetScore(solvedInput, preset, boostedHeightCm, 'eyeToWheelTop')).toBeLessThan(
      getMetricTargetScore(lowWheelInput, preset, boostedHeightCm, 'eyeToWheelTop')
    );
  });

  it('optimizes brake delta toward brake alignment', () => {
    const preset = 'gt';
    const heightCm = 182;
    const brakeDeltaMaxMm = getPedalBrakeDeltaMaxMm(DEFAULT_PLANNER_INPUT);
    const lowBrakeInput = {
      ...DEFAULT_PLANNER_INPUT,
      pedalBrakeDeltaMm: 0,
    };
    const highBrakeInput = {
      ...DEFAULT_PLANNER_INPUT,
      pedalBrakeDeltaMm: brakeDeltaMaxMm,
    };
    const solvedInput = applyPresetToPlannerInput(lowBrakeInput, preset, heightCm);
    const solvedScore = getMetricTargetScore(solvedInput, preset, heightCm, 'brakeAlignment');

    expect(solvedScore).toBeLessThan(getMetricTargetScore(lowBrakeInput, preset, heightCm, 'brakeAlignment'));
    expect(solvedScore).toBeLessThan(getMetricTargetScore(highBrakeInput, preset, heightCm, 'brakeAlignment'));
  });

  it.each(NON_CUSTOM_PRESETS)('keeps boosted %s eye-to-wheel inside report limits', (preset) => {
    const boostedHeightCm = 119;
    const boostedInput = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, preset, boostedHeightCm);

    expect(getMetricTargetScore(boostedInput, preset, boostedHeightCm, 'eyeToWheelTop')).toBeLessThanOrEqual(1);
  });

  it('keeps pedal angle and delta X fixed while optimizing pedal tray reach', () => {
    const preset = 'gt';
    const heightCm = 182;
    const solvedInput = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, preset, heightCm);
    const recomputedInput = recomputePresetDynamicPlannerInput(solvedInput, preset, heightCm);
    const staleTrayInput = {
      ...solvedInput,
      pedalTrayDistanceMm: PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMinMm,
    };
    const solvedScore = getPedalPostureAngleScore(solvedInput, preset, heightCm);

    expect(recomputedInput.pedalsHeightMm).toBe(solvedInput.pedalsHeightMm);
    expect(recomputedInput.pedalsDeltaMm).toBe(solvedInput.pedalsDeltaMm);
    expect(recomputedInput.pedalAngleDeg).toBe(solvedInput.pedalAngleDeg);
    expect(solvedInput.pedalsDeltaMm).toBe(DEFAULT_PLANNER_INPUT.pedalsDeltaMm);
    expect(solvedInput.pedalAngleDeg).toBe(DEFAULT_PLANNER_INPUT.pedalAngleDeg);
    expect(solvedScore).toBeLessThan(getPedalPostureAngleScore(staleTrayInput, preset, heightCm));
  });

  it.each(NON_CUSTOM_PRESETS)('keeps optimized %s foot contact errors bounded at every height', (preset) => {
    const failures: string[] = [];

    for (
      let heightCm = PLANNER_POSTURE_LIMITS.heightMinCm;
      heightCm <= PLANNER_POSTURE_LIMITS.heightMaxCm;
      heightCm += 1
    ) {
      const input = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, preset, heightCm);
      const contactErrorMm = getPlannerPostureFootContactErrorMm(input, {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        preset,
        heightCm,
      });

      if (!Number.isFinite(contactErrorMm) || contactErrorMm > 150) {
        failures.push(`${preset} ${heightCm}cm foot-to-pedal gap ${contactErrorMm.toFixed(1)}mm`);
      }
    }

    expect(failures, failures.slice(0, 30).join('\n')).toEqual([]);
  });

  it('preserves monitor height for custom preset posture settings', () => {
    const settings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      preset: 'custom' as const,
      monitorHeightFromBaseMm: 123,
    };

    expect(applyPresetToPostureSettings(settings, DEFAULT_PLANNER_INPUT).monitorHeightFromBaseMm).toBe(123);
  });

  it.each(NON_CUSTOM_PRESETS)(
    'keeps solved base length within planner max for large preserved geometry in %s',
    (preset) => {
      const result = recomputePresetDynamicPlannerInput(
        {
          ...DEFAULT_PLANNER_INPUT,
          seatBaseDepthMm: 777,
          pedalTrayDepthMm: 777,
        },
        preset,
        205
      );

      expect(result.baseLengthMm).toBeLessThanOrEqual(PLANNER_DIMENSION_LIMITS.baseLengthMaxMm);
    }
  );
});
