import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ACTIVE_POSTURE_PRESET,
  DEFAULT_PLANNER_INPUT,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  PLANNER_DIMENSION_LIMITS,
} from '../../components/calculator/aluminum-rig-planner/constants';
import { clampPlannerInput } from '../../components/calculator/aluminum-rig-planner/geometry';
import {
  applyPresetToPlannerInput,
  getPresetAfterPlannerInputEdit,
  PLANNER_POSTURE_PRESETS,
  recomputePresetDynamicPlannerInput,
} from '../../components/calculator/aluminum-rig-planner/presets';
import type { PlannerInput, PlannerPosturePreset } from '../../components/calculator/aluminum-rig-planner/types';

const NON_CUSTOM_PRESETS = ['formula', 'gt', 'rally', 'road'] satisfies PlannerPosturePreset[];
const DYNAMIC_KEYS = [
  'steeringColumnBaseHeightMm',
  'steeringColumnHeightMm',
  'steeringColumnDistanceMm',
  'pedalTrayDistanceMm',
  'pedalsHeightMm',
  'pedalAngleDeg',
  'baseLengthMm',
] as const;
const FIXED_FINAL_PRESET_KEYS = [
  'seatAngleDeg',
  'backrestAngleDeg',
  'wheelDiameterMm',
  'wheelAngleDeg',
  'wheelHeightOffsetMm',
  'wheelDistanceFromSteeringColumnMm',
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

describe('aluminum rig planner posture presets', () => {
  it('uses GT as the default active preset', () => {
    expect(DEFAULT_ACTIVE_POSTURE_PRESET).toBe('gt');
    expect(DEFAULT_PLANNER_POSTURE_SETTINGS.preset).toBe(DEFAULT_ACTIVE_POSTURE_PRESET);
  });

  it.each(NON_CUSTOM_PRESETS)('applies every fixed-final preset value for %s', (preset) => {
    const result = applyPresetToPlannerInput(
      {
        ...DEFAULT_PLANNER_INPUT,
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

  it.each(NON_CUSTOM_PRESETS)('keeps solved pedal values after applying %s preset', (preset) => {
    const heightCm = 182;
    const seededInput = clampPlannerInput({ ...DEFAULT_PLANNER_INPUT, ...PLANNER_POSTURE_PRESETS[preset] });
    const solvedInput = recomputePresetDynamicPlannerInput(seededInput, preset, heightCm);
    const result = applyPresetToPlannerInput(DEFAULT_PLANNER_INPUT, preset, heightCm);

    expect(result.pedalsHeightMm).toBe(solvedInput.pedalsHeightMm);
    expect(result.pedalAngleDeg).toBe(solvedInput.pedalAngleDeg);
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
      pedalsDeltaMm: 999,
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

  it('preserves current geometry for custom preset and custom height recompute', () => {
    const custom = {
      ...DEFAULT_PLANNER_INPUT,
      pedalTrayDistanceMm: 510,
      steeringColumnDistanceMm: 360,
      wheelHeightOffsetMm: 42,
    };

    expect(applyPresetToPlannerInput(custom, 'custom', 169)).toEqual(custom);
    expect(recomputePresetDynamicPlannerInput(custom, 'custom', 205)).toEqual(custom);
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
