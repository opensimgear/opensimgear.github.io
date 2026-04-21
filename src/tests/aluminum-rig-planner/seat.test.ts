import { describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_INPUT } from '../../components/calculator/aluminum-rig-planner/constants';
import { createSeatModule } from '../../components/calculator/aluminum-rig-planner/modules/seat';

describe('aluminum rig planner seat module', () => {
  function getMeshPosition(id: string, input = DEFAULT_PLANNER_INPUT) {
    const mesh = createSeatModule(input).find((entry) => entry.id === id);

    expect(mesh).toBeDefined();
    return mesh?.position ?? [0, 0, 0];
  }

  it('raises seat geometry by the configured seat height', () => {
    const lowSeat = getMeshPosition('seat-base-main', {
      ...DEFAULT_PLANNER_INPUT,
      seatHeightFromBaseInnerBeamsMm: 0,
    });
    const highSeat = getMeshPosition('seat-base-main', {
      ...DEFAULT_PLANNER_INPUT,
      seatHeightFromBaseInnerBeamsMm: 100,
    });

    expect(highSeat[1] - lowSeat[1]).toBeCloseTo(0.1);
  });

  it('tilts the backrest independently from the seat angle', () => {
    const uprightHeadrest = getMeshPosition('backrest-headrest', {
      ...DEFAULT_PLANNER_INPUT,
      seatAngleDeg: 10,
      backrestAngleDeg: 90,
    });
    const reclinedHeadrest = getMeshPosition('backrest-headrest', {
      ...DEFAULT_PLANNER_INPUT,
      seatAngleDeg: 10,
      backrestAngleDeg: 130,
    });

    expect(reclinedHeadrest[0]).toBeLessThan(uprightHeadrest[0]);
    expect(reclinedHeadrest[1]).toBeLessThan(uprightHeadrest[1]);
  });

  it('keeps the seat front anchor fixed in x when seat length changes', () => {
    const shortSeatFront = getMeshPosition('seat-front-bolster', {
      ...DEFAULT_PLANNER_INPUT,
      seatLengthMm: 360,
    });
    const longSeatFront = getMeshPosition('seat-front-bolster', {
      ...DEFAULT_PLANNER_INPUT,
      seatLengthMm: 520,
    });

    expect(longSeatFront[0]).toBeCloseTo(shortSeatFront[0]);
  });

  it('raises the seat front when seat length increases', () => {
    const shortSeatFront = getMeshPosition('seat-front-bolster', {
      ...DEFAULT_PLANNER_INPUT,
      seatLengthMm: 360,
      seatAngleDeg: 20,
    });
    const longSeatFront = getMeshPosition('seat-front-bolster', {
      ...DEFAULT_PLANNER_INPUT,
      seatLengthMm: 520,
      seatAngleDeg: 20,
    });

    expect(longSeatFront[1]).toBeGreaterThan(shortSeatFront[1]);
  });
});
