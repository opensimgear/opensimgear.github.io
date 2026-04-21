import { describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_INPUT } from '../../components/calculator/aluminum-rig-planner/constants';
import {
  clampPlannerInput,
  derivePlannerGeometry,
  getPedalTrayDistanceMaxMm,
  getSteeringColumnDistanceMaxMm,
} from '../../components/calculator/aluminum-rig-planner/geometry';
import { createSteeringColumnModule } from '../../components/calculator/aluminum-rig-planner/modules/steering-column';

describe('aluminum rig planner geometry', () => {
  it('clamps steering column distance against current base span', () => {
    const clamped = clampPlannerInput({
      ...DEFAULT_PLANNER_INPUT,
      baseLengthMm: 1000,
      seatBaseDepthMm: 500,
      steeringColumnDistanceMm: 900,
    });

    expect(clamped.steeringColumnDistanceMm).toBe(340);
  });

  it('computes steering column distance max from seat crossbeam to front inset', () => {
    expect(
      getSteeringColumnDistanceMaxMm({
        baseLengthMm: 1350,
        seatBaseDepthMm: 500,
      })
    ).toBe(690);
  });

  it('computes pedal tray distance max from tray midpoint and base end', () => {
    expect(
      getPedalTrayDistanceMaxMm({
        baseLengthMm: 1350,
        seatBaseDepthMm: 500,
        pedalTrayDepthMm: 300,
      })
    ).toBe(700);
  });

  it('derives geometry as clamped planner input only', () => {
    const geometry = derivePlannerGeometry({
      ...DEFAULT_PLANNER_INPUT,
      baseWidthMm: 900,
    });

    expect(geometry.input.baseWidthMm).toBe(600);
  });

  it('clamps pedal tray distance so tray midpoint stays on base rail', () => {
    const clamped = clampPlannerInput({
      ...DEFAULT_PLANNER_INPUT,
      baseLengthMm: 1000,
      seatBaseDepthMm: 500,
      pedalTrayDepthMm: 400,
      pedalTrayDistanceMm: 500,
    });

    expect(clamped.pedalTrayDistanceMm).toBe(300);
  });

  it('allows shorter pedal tray distances when base is too short for default minimum', () => {
    const clamped = clampPlannerInput({
      ...DEFAULT_PLANNER_INPUT,
      baseLengthMm: 800,
      seatBaseDepthMm: 500,
      pedalTrayDepthMm: 500,
      pedalTrayDistanceMm: 150,
    });

    expect(clamped.pedalTrayDistanceMm).toBe(50);
  });

  it('positions steering uprights from seat crossbeam distance only', () => {
    const nearModule = createSteeringColumnModule(
      {
        ...DEFAULT_PLANNER_INPUT,
        seatBaseDepthMm: 500,
        steeringColumnDistanceMm: 120,
      },
      '#000000'
    );
    const farModule = createSteeringColumnModule(
      {
        ...DEFAULT_PLANNER_INPUT,
        seatBaseDepthMm: 500,
        steeringColumnDistanceMm: 240,
      },
      '#000000'
    );

    expect(nearModule[0]?.position[0]).toBeCloseTo(0.66);
    expect(farModule[0]?.position[0]).toBeCloseTo(0.78);
    expect(farModule[0]?.position[0]).toBeGreaterThan(nearModule[0]?.position[0] ?? 0);
  });
});
