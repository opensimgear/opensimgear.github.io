import { describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_INPUT } from '~/components/calculator/aluminum-rig-planner/constants/planner';
import { createPlannerMeasurementOverlay } from '~/components/calculator/aluminum-rig-planner/scene/measurement-overlay';

describe('aluminum rig planner measurement overlay', () => {
  it('places pedal tray distance arrow between inner cross beam and tray rear edge', () => {
    const overlay = createPlannerMeasurementOverlay(DEFAULT_PLANNER_INPUT, 'pedalTrayDistanceMm');

    expect(overlay.start[0]).toBeCloseTo(DEFAULT_PLANNER_INPUT.seatBaseDepthMm / 1000);
    expect(overlay.start[1]).toBeCloseTo(0);
    expect(overlay.start[2]).toBeCloseTo(0.15);
    expect(overlay.end[0]).toBeCloseTo(
      (DEFAULT_PLANNER_INPUT.seatBaseDepthMm + DEFAULT_PLANNER_INPUT.pedalTrayDistanceMm) / 1000
    );
    expect(overlay.end[1]).toBeCloseTo(0);
    expect(overlay.end[2]).toBeCloseTo(0.15);
  });

  it('keeps pedal tray distance arrow anchored to inner cross beam when seat moves', () => {
    const overlay = createPlannerMeasurementOverlay(
      {
        ...DEFAULT_PLANNER_INPUT,
        seatDeltaMm: 80,
      },
      'pedalTrayDistanceMm'
    );

    expect(overlay.start[0]).toBeCloseTo(DEFAULT_PLANNER_INPUT.seatBaseDepthMm / 1000);
  });

  it('places steering column distance arrow from seat front edge to upright rear face', () => {
    const overlay = createPlannerMeasurementOverlay(DEFAULT_PLANNER_INPUT, 'steeringColumnDistanceMm');

    expect(overlay.start[0]).toBeCloseTo(DEFAULT_PLANNER_INPUT.seatBaseDepthMm / 1000);
    expect(overlay.start[1]).toBeCloseTo(0);
    expect(overlay.start[2]).toBeCloseTo(0.17);
    expect(overlay.end[0]).toBeCloseTo(
      (DEFAULT_PLANNER_INPUT.seatBaseDepthMm + DEFAULT_PLANNER_INPUT.steeringColumnDistanceMm) / 1000
    );
    expect(overlay.end[1]).toBeCloseTo(0);
    expect(overlay.end[2]).toBeCloseTo(0.17);
  });

  it('keeps steering column distance arrow anchored to inner cross beam when seat moves', () => {
    const overlay = createPlannerMeasurementOverlay(
      {
        ...DEFAULT_PLANNER_INPUT,
        seatDeltaMm: 80,
      },
      'steeringColumnDistanceMm'
    );

    expect(overlay.start[0]).toBeCloseTo(DEFAULT_PLANNER_INPUT.seatBaseDepthMm / 1000);
  });
});
