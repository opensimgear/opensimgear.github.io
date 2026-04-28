import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PLANNER_INPUT,
  PLANNER_DIMENSION_LIMITS,
} from '~/components/calculator/aluminum-rig-planner/constants/planner';
import { DEFAULT_PLANNER_OPTIMIZATION_SETTINGS } from '~/components/calculator/aluminum-rig-planner/constants/optimizer';
import {
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  MONITOR_ASPECT_RATIO_OPTIONS,
  MONITOR_CURVATURE_OPTIONS,
  PLANNER_POSTURE_LIMITS,
} from '~/components/calculator/aluminum-rig-planner/constants/posture';
import { getSteeringColumnDistanceMaxMm } from '~/components/calculator/aluminum-rig-planner/scene/geometry';
import {
  getArcCenterDistanceMm,
  getMonitorTargetFovFromDistanceMm,
  getSolvedMonitorDistanceFromEyesMm,
} from '~/components/calculator/aluminum-rig-planner/modules/monitor';
import { getPlannerPostureTargetRangeControlLimits } from '~/components/calculator/aluminum-rig-planner/posture/posture-targets';
import { mergePlannerQueryState } from '~/components/calculator/aluminum-rig-planner/query-state';

describe('aluminum rig planner query state', () => {
  it('sanitizes out-of-range shared-link values before hydration', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      baseWidthMm: 900,
      seatLengthMm: 999,
      seatDeltaMm: 999,
      seatHeightFromBaseInnerBeamsMm: -30,
      seatAngleDeg: 80,
      backrestAngleDeg: 20,
      pedalTrayDepthMm: 120,
      pedalTrayDistanceMm: -50,
      pedalLengthMm: 999,
      steeringColumnDistanceMm: 1200,
      steeringColumnBaseHeightMm: 900,
      steeringColumnHeightMm: 120,
    });

    expect(state.plannerInput.baseWidthMm).toBe(PLANNER_DIMENSION_LIMITS.baseWidthMaxMm);
    expect(state.plannerInput.seatLengthMm).toBe(PLANNER_DIMENSION_LIMITS.seatLengthMaxMm);
    expect(state.plannerInput.seatDeltaMm).toBe(PLANNER_DIMENSION_LIMITS.seatDeltaMaxMm);
    expect(state.plannerInput.seatHeightFromBaseInnerBeamsMm).toBe(0);
    expect(state.plannerInput.seatAngleDeg).toBe(45);
    expect(state.plannerInput.backrestAngleDeg).toBe(PLANNER_DIMENSION_LIMITS.backrestAngleDegMin);
    expect(state.plannerInput.pedalTrayDepthMm).toBe(300);
    expect(state.plannerInput.pedalTrayDistanceMm).toBe(0);
    expect(state.plannerInput.pedalLengthMm).toBe(PLANNER_DIMENSION_LIMITS.pedalLengthMaxMm);
    expect(state.plannerInput.steeringColumnDistanceMm).toBe(getSteeringColumnDistanceMaxMm(state.plannerInput));
    expect(state.plannerInput.steeringColumnBaseHeightMm).toBe(300);
    expect(state.plannerInput.steeringColumnHeightMm).toBe(380);
  });

  it('keeps steering column base height within column height clearance', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      steeringColumnBaseHeightMm: 460,
      steeringColumnHeightMm: 420,
    });

    expect(state.plannerInput.steeringColumnBaseHeightMm).toBe(340);
    expect(state.plannerInput.steeringColumnHeightMm).toBe(420);
  });

  it('keeps steering column height at fixed min while lowering base to fit', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      steeringColumnBaseHeightMm: 500,
      steeringColumnHeightMm: PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm,
    });

    expect(state.plannerInput.steeringColumnBaseHeightMm).toBe(300);
    expect(state.plannerInput.steeringColumnHeightMm).toBe(PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm);
  });

  it('sanitizes optimizer settings and malformed stock rows', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      optimizer: {
        mode: 'waste',
        currencyMode: 'eur',
        bladeThicknessMm: -3,
        safetyMarginMm: -5,
        shippingMode: 'per-kg',
        flatShippingCost: -10,
        shippingRatePerKg: -2,
        profileWeightsKgPerMeter: {
          '40x40': -1,
          '80x40': 3.4,
        },
        stockOptions: [
          {
            id: 'stock-1',
            profileType: '40x40',
            lengthMm: 1500,
            cost: 49.95,
          },
          {
            profileType: '80x40',
            lengthMm: -2000,
            cost: 80,
          },
          {
            profileType: 'bogus',
            lengthMm: 1000,
            cost: 30,
          },
          {
            profileType: '80x40',
            lengthMm: 3000,
            cost: 95,
          },
        ],
      },
    });

    expect(state.optimizationSettings.mode).toBe('waste');
    expect(state.optimizationSettings.currencyMode).toBe('eur');
    expect(state.optimizationSettings.bladeThicknessMm).toBe(0.5);
    expect(state.optimizationSettings.safetyMarginMm).toBe(0);
    expect(state.optimizationSettings.shippingMode).toBe('per-kg');
    expect(state.optimizationSettings.flatShippingCost).toBe(0);
    expect(state.optimizationSettings.shippingRatePerKg).toBe(0);
    expect(state.optimizationSettings.profileWeightsKgPerMeter['40x40']).toBe(0);
    expect(state.optimizationSettings.profileWeightsKgPerMeter['80x40']).toBe(3.4);
    expect(state.optimizationSettings.stockOptions).toHaveLength(2);
    expect(state.optimizationSettings.stockOptions[0]).toEqual({
      id: 'stock-1',
      profileType: '40x40',
      lengthMm: 1500,
      cost: 45,
    });
    expect(state.optimizationSettings.stockOptions[1]).toMatchObject({
      profileType: '80x40',
      lengthMm: 3000,
      cost: 95,
    });
    expect(state.optimizationSettings.stockOptions[1].id).toMatch(/^planner-stock-option-/);
  });

  it.each(['cost', 'waste'] as const)('preserves %s optimizer mode from shared-link state', (mode) => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      optimizer: {
        mode,
      },
    });

    expect(state.optimizationSettings.mode).toBe(mode);
  });

  it('preserves decimal blade thickness values within allowed range', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      optimizer: {
        bladeThicknessMm: 2.74,
      },
    });

    expect(state.optimizationSettings.bladeThicknessMm).toBe(2.7);
  });

  it('caps blade thickness at 5 mm from shared-link state', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      optimizer: {
        bladeThicknessMm: 8,
      },
    });

    expect(state.optimizationSettings.bladeThicknessMm).toBe(5);
  });

  it('uses optimizer defaults when optimizer state is absent', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {});

    expect(state.optimizationSettings).toEqual({
      ...DEFAULT_PLANNER_OPTIMIZATION_SETTINGS,
      profileWeightsKgPerMeter: { ...DEFAULT_PLANNER_OPTIMIZATION_SETTINGS.profileWeightsKgPerMeter },
      stockOptions: DEFAULT_PLANNER_OPTIMIZATION_SETTINGS.stockOptions.map((option) => ({ ...option })),
    });
  });

  it('sanitizes posture settings from shared-link state', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      posture: {
        preset: 'rally',
        advanced: true,
        heightCm: 260,
        showModel: false,
        showSkeleton: true,
      },
    });

    expect(state.postureSettings.preset).toBe('rally');
    expect(state.postureSettings.advanced).toBe(true);
    expect(state.postureSettings.heightCm).toBe(220);
    expect(state.postureSettings.showModel).toBe(false);
    expect(state.postureSettings.showSkeleton).toBe(true);
  });

  it('sanitizes posture target ranges per preset from shared-link state', () => {
    const wristLimits = getPlannerPostureTargetRangeControlLimits('rally', 'wristBend');
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      posture: {
        targetRangesByPreset: {
          rally: {
            wristBend: { min: 999, max: -999 },
          },
        },
      },
    });

    expect(state.postureSettings.targetRangesByPreset.rally.wristBend).toEqual(wristLimits);
    expect(state.postureSettings.targetRangesByPreset.gt.wristBend).toEqual(
      DEFAULT_PLANNER_POSTURE_SETTINGS.targetRangesByPreset.gt.wristBend
    );
    expect(state.postureSettings.targetRangesByPreset.rally).not.toBe(state.postureSettings.targetRangesByPreset.gt);
  });

  it('sanitizes custom preset and monitor module values from shared-link state', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      posture: {
        preset: 'custom',
        monitorSizeIn: 999,
        monitorAspectRatio: 'bogus',
        monitorCurvature: 'banana',
        monitorTiltDeg: 99,
        monitorTargetFovDeg: 999,
        monitorDistanceFromEyesMm: Number.POSITIVE_INFINITY,
        monitorHeightFromBaseMm: -100,
      },
    });

    expect(state.postureSettings.preset).toBe('custom');
    expect(state.postureSettings.monitorSizeIn).toBe(PLANNER_POSTURE_LIMITS.monitorSizeMaxIn);
    expect(state.postureSettings.monitorAspectRatio).toBe(DEFAULT_PLANNER_POSTURE_SETTINGS.monitorAspectRatio);
    expect(state.postureSettings.monitorCurvature).toBe(DEFAULT_PLANNER_POSTURE_SETTINGS.monitorCurvature);
    expect(state.postureSettings.monitorTiltDeg).toBe(PLANNER_POSTURE_LIMITS.monitorTiltMaxDeg);
    expect(state.postureSettings.monitorTargetFovDeg).toBe(PLANNER_POSTURE_LIMITS.monitorTargetFovMaxDeg);
    expect(state.postureSettings.monitorDistanceFromEyesMm).toBeCloseTo(
      getSolvedMonitorDistanceFromEyesMm(state.postureSettings),
      6
    );
    expect(state.postureSettings.monitorHeightFromBaseMm).toBe(PLANNER_POSTURE_LIMITS.monitorHeightFromBaseMinMm);
    expect(
      MONITOR_ASPECT_RATIO_OPTIONS.some((option) => option.value === state.postureSettings.monitorAspectRatio)
    ).toBe(true);
    expect(MONITOR_CURVATURE_OPTIONS.some((option) => option.value === state.postureSettings.monitorCurvature)).toBe(
      true
    );
  });

  it('sets monitor tilt to zero when triple screen hydrates from shared-link state', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      posture: {
        monitorTiltDeg: 9,
        monitorTripleScreen: true,
      },
    });

    expect(state.postureSettings.monitorTiltDeg).toBe(0);
    expect(state.postureSettings.monitorTripleScreen).toBe(true);
  });

  it('migrates old monitor midpoint shared-link fields to the new monitor module shape', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      posture: {
        monitorMidpointXMm: 1400,
        monitorMidpointYMm: 900,
      },
    });

    expect(state.postureSettings.monitorDistanceFromEyesMm).toBeGreaterThan(0);
    expect(state.postureSettings.monitorDistanceFromEyesMm).not.toBe(
      DEFAULT_PLANNER_POSTURE_SETTINGS.monitorDistanceFromEyesMm
    );
    expect(state.postureSettings.monitorHeightFromBaseMm).toBe(820);
  });

  it('migrates legacy curved monitor distance using chord-line FOV geometry', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      posture: {
        monitorCurvature: '5000r',
        monitorDistanceFromEyesMm: 600,
      },
    });

    expect(state.postureSettings.monitorTargetFovDeg).toBeCloseTo(
      getMonitorTargetFovFromDistanceMm(600, state.postureSettings),
      6
    );
  });

  it('uses z-up monitor midpoint height when present in shared-link state', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      posture: {
        monitorMidpointXMm: 1400,
        monitorMidpointYMm: 9999,
        monitorMidpointZMm: 900,
      },
    });

    expect(state.postureSettings.monitorHeightFromBaseMm).toBe(820);
  });

  it('hydrates continuous-curve triple-screen arc-center distance from shared-link state', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      posture: {
        monitorCurvature: '1000r',
        monitorContinuousCurve: true,
        monitorTargetFovDeg: 45,
        monitorTripleScreen: true,
      },
    });

    expect(state.postureSettings.monitorDistanceFromEyesMm).toBeCloseTo(
      getArcCenterDistanceMm(state.postureSettings) ?? 0,
      6
    );
    expect(state.postureSettings.monitorContinuousCurve).toBe(true);
    expect(state.postureSettings.monitorTripleScreen).toBe(true);
  });

  it('hydrates curved triple screens as measured distance when continuous curve is off', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      posture: {
        monitorCurvature: '5000r',
        monitorContinuousCurve: false,
        monitorTargetFovDeg: 45,
        monitorTripleScreen: true,
      },
    });

    expect(state.postureSettings.monitorDistanceFromEyesMm).toBeCloseTo(
      getSolvedMonitorDistanceFromEyesMm(state.postureSettings),
      6
    );
    expect(state.postureSettings.monitorDistanceFromEyesMm).not.toBeCloseTo(
      getArcCenterDistanceMm(state.postureSettings) ?? 0,
      1
    );
    expect(state.postureSettings.monitorContinuousCurve).toBe(false);
    expect(state.postureSettings.monitorCurvature).toBe('5000r');
    expect(state.postureSettings.monitorTripleScreen).toBe(true);
  });

  it('clamps continuous-curve shared links to the largest supported radius', () => {
    const state = mergePlannerQueryState(DEFAULT_PLANNER_INPUT, {
      posture: {
        monitorCurvature: '5000r',
        monitorContinuousCurve: true,
        monitorTargetFovDeg: 45,
        monitorTripleScreen: true,
      },
    });

    expect(state.postureSettings.monitorCurvature).toBe('1500r');
    expect(state.postureSettings.monitorDistanceFromEyesMm).toBeCloseTo(
      getArcCenterDistanceMm(state.postureSettings) ?? 0,
      6
    );
    expect(state.postureSettings.monitorContinuousCurve).toBe(true);
    expect(state.postureSettings.monitorTripleScreen).toBe(true);
  });
});
