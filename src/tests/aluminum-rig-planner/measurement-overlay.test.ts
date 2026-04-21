import { describe, expect, it } from 'vitest';

import {
  BASE_MODULE_LAYOUT,
  DEFAULT_PLANNER_INPUT,
  HALF_PROFILE_SHORT_MM,
} from '../../components/calculator/aluminum-rig-planner/constants';
import { createPlannerMeasurementOverlay } from '../../components/calculator/aluminum-rig-planner/measurement-overlay';

describe('aluminum rig planner measurement overlay', () => {
  const seatFrontXmm =
    Math.max(
      BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm,
      DEFAULT_PLANNER_INPUT.seatBaseDepthMm - BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm
    ) +
    HALF_PROFILE_SHORT_MM +
    DEFAULT_PLANNER_INPUT.seatDeltaMm;

  it('places pedal tray distance arrow between seat crossbeam front and tray rear edge', () => {
    const overlay = createPlannerMeasurementOverlay(DEFAULT_PLANNER_INPUT, 'pedalTrayDistanceMm');

    expect(overlay.start[0]).toBeCloseTo(seatFrontXmm / 1000);
    expect(overlay.start[1]).toBeCloseTo(0.15);
    expect(overlay.start[2]).toBeCloseTo(0);
    expect(overlay.end[0]).toBeCloseTo(
      (DEFAULT_PLANNER_INPUT.seatBaseDepthMm + DEFAULT_PLANNER_INPUT.pedalTrayDistanceMm) / 1000
    );
    expect(overlay.end[1]).toBeCloseTo(0.15);
    expect(overlay.end[2]).toBeCloseTo(0);
  });

  it('places steering column distance arrow from seat front edge to upright rear face', () => {
    const overlay = createPlannerMeasurementOverlay(DEFAULT_PLANNER_INPUT, 'steeringColumnDistanceMm');

    expect(overlay.start[0]).toBeCloseTo(seatFrontXmm / 1000);
    expect(overlay.start[1]).toBeCloseTo(0.17);
    expect(overlay.start[2]).toBeCloseTo(0);
    expect(overlay.end[0]).toBeCloseTo(
      (DEFAULT_PLANNER_INPUT.seatBaseDepthMm + DEFAULT_PLANNER_INPUT.steeringColumnDistanceMm) / 1000
    );
    expect(overlay.end[1]).toBeCloseTo(0.17);
    expect(overlay.end[2]).toBeCloseTo(0);
  });
});
