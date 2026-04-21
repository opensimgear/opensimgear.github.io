import { describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_INPUT } from '../../components/calculator/aluminum-rig-planner/constants';
import { createPlannerMeasurementOverlay } from '../../components/calculator/aluminum-rig-planner/measurement-overlay';

describe('aluminum rig planner measurement overlay', () => {
  it('places pedal tray distance arrow between seat crossbeam front and tray rear edge', () => {
    const overlay = createPlannerMeasurementOverlay(DEFAULT_PLANNER_INPUT, 'pedalTrayDistanceMm');

    expect(overlay.start[0]).toBeCloseTo(0.35);
    expect(overlay.start[1]).toBeCloseTo(0.15);
    expect(overlay.start[2]).toBeCloseTo(0);
    expect(overlay.end[0]).toBeCloseTo(0.95);
    expect(overlay.end[1]).toBeCloseTo(0.15);
    expect(overlay.end[2]).toBeCloseTo(0);
  });

  it('places steering column distance arrow from seat front edge to upright rear face', () => {
    const overlay = createPlannerMeasurementOverlay(DEFAULT_PLANNER_INPUT, 'steeringColumnDistanceMm');

    expect(overlay.start[0]).toBeCloseTo(0.35);
    expect(overlay.start[1]).toBeCloseTo(0.17);
    expect(overlay.start[2]).toBeCloseTo(0);
    expect(overlay.end[0]).toBeCloseTo(0.75);
    expect(overlay.end[1]).toBeCloseTo(0.17);
    expect(overlay.end[2]).toBeCloseTo(0);
  });
});
