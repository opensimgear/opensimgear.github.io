import { describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_INPUT } from '../../components/calculator/aluminum-rig-planner/constants';
import {
  clampPlannerInput,
  derivePlannerGeometry,
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

  it('derives geometry as clamped planner input only', () => {
    const geometry = derivePlannerGeometry({
      ...DEFAULT_PLANNER_INPUT,
      baseWidthMm: 900,
    });

    expect(geometry.input.baseWidthMm).toBe(600);
  });

  it('positions steering uprights from seat crossbeam distance only', () => {
    const nearModule = createSteeringColumnModule(
      {
        ...DEFAULT_PLANNER_INPUT,
        steeringColumnDistanceMm: 120,
      },
      '#000000'
    );
    const farModule = createSteeringColumnModule(
      {
        ...DEFAULT_PLANNER_INPUT,
        steeringColumnDistanceMm: 240,
      },
      '#000000'
    );

    expect(nearModule[0]?.position[0]).toBeCloseTo(0.66);
    expect(farModule[0]?.position[0]).toBeCloseTo(0.78);
    expect(farModule[0]?.position[0]).toBeGreaterThan(nearModule[0]?.position[0] ?? 0);
  });
});
