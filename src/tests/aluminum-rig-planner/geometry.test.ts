import { describe, expect, it } from 'vitest';

import { createInitialPlannerInput } from '../../components/calculator/aluminum-rig-planner/presets';
import {
  clampPlannerInput,
  derivePlannerGeometry,
  getWheelMountOffsets,
} from '../../components/calculator/aluminum-rig-planner/geometry';

describe('aluminum rig planner geometry', () => {
  it('clamps impossible posture angles before geometry derivation', () => {
    const clamped = clampPlannerInput({
      ...createInitialPlannerInput({
        driverHeightMm: 1750,
        inseamMm: 820,
        seatingBias: 'performance',
        presetType: 'gt',
      }),
      seatBackAngleDeg: -20,
      pedalAngleDeg: 65,
      wheelTiltDeg: 80,
    });

    expect(clamped.seatBackAngleDeg).toBeGreaterThanOrEqual(10);
    expect(clamped.pedalAngleDeg).toBeLessThanOrEqual(35);
    expect(clamped.wheelTiltDeg).toBeLessThanOrEqual(35);
  });

  it('returns wheel mount offsets for front, bottom, and deck mounts', () => {
    const front = getWheelMountOffsets('front');
    const bottom = getWheelMountOffsets('bottom');
    const deck = getWheelMountOffsets('deck');

    expect(front).toMatchObject({ wheelCenterOffsetXMm: expect.any(Number), wheelCenterOffsetYMm: expect.any(Number) });
    expect(bottom).toMatchObject({
      wheelCenterOffsetXMm: expect.any(Number),
      wheelCenterOffsetYMm: expect.any(Number),
    });
    expect(deck).toMatchObject({ wheelCenterOffsetXMm: expect.any(Number), wheelCenterOffsetYMm: expect.any(Number) });
    expect(front.wheelCenterOffsetXMm).toBeLessThan(deck.wheelCenterOffsetXMm);
  });

  it('derives stable geometry for known GT preset and mount-specific output', () => {
    const input = createInitialPlannerInput({
      driverHeightMm: 1750,
      inseamMm: 820,
      seatingBias: 'performance',
      presetType: 'gt',
    });

    const frontGeometry = derivePlannerGeometry({ ...input, wheelMountType: 'front' });
    const deckGeometry = derivePlannerGeometry(input);
    const bottomGeometry = derivePlannerGeometry({ ...input, wheelMountType: 'bottom' });

    expect(frontGeometry.wheelMountOffsets).toEqual({
      mountXMm: 0,
      mountYMm: 150,
      wheelCenterOffsetXMm: 60,
      wheelCenterOffsetYMm: 90,
    });
    expect(frontGeometry.wheelSupportUprights).toEqual([
      {
        id: 'wheel-support-left',
        x: 630,
        y: 170,
        heightMm: 770,
      },
      {
        id: 'wheel-support-right',
        x: 630,
        y: 330,
        heightMm: 770,
      },
    ]);

    expect(deckGeometry.wheelMountOffsets).toEqual({
      mountXMm: 70,
      mountYMm: 190,
      wheelCenterOffsetXMm: 145,
      wheelCenterOffsetYMm: 130,
    });
    expect(deckGeometry.wheelReachMm).toBe(691);
    expect(deckGeometry.legExtensionMm).toBe(669);
    expect(deckGeometry.frameMembers).toHaveLength(6);
    expect(deckGeometry.frameMembers.find((member) => member.id === 'wheel-cross-member')).toMatchObject({
      start: { x: 700, y: 0 },
      end: { x: 700, y: 500 },
      lengthMm: 500,
    });
    expect(deckGeometry.wheelSupportUprights).toEqual([
      {
        id: 'wheel-support-left',
        x: 700,
        y: 170,
        heightMm: 810,
      },
      {
        id: 'wheel-support-right',
        x: 700,
        y: 330,
        heightMm: 810,
      },
    ]);

    expect(bottomGeometry.wheelMountOffsets).toEqual({
      mountXMm: 30,
      mountYMm: 80,
      wheelCenterOffsetXMm: 105,
      wheelCenterOffsetYMm: 125,
    });
    expect(bottomGeometry.wheelReachMm).toBe(661);
    expect(bottomGeometry.frameMembers.find((member) => member.id === 'wheel-cross-member')).toMatchObject({
      start: { x: 660, y: 0 },
      end: { x: 660, y: 500 },
      lengthMm: 500,
    });
    expect(bottomGeometry.wheelSupportUprights).toEqual([
      {
        id: 'wheel-support-left',
        x: 660,
        y: 170,
        heightMm: 700,
      },
      {
        id: 'wheel-support-right',
        x: 660,
        y: 330,
        heightMm: 700,
      },
    ]);
  });

  it('updates frame width and steering upright spacing when base width changes', () => {
    const geometry = derivePlannerGeometry({
      ...createInitialPlannerInput({
        driverHeightMm: 1750,
        inseamMm: 820,
        seatingBias: 'performance',
        presetType: 'gt',
      }),
      baseWidthMm: 560,
    });

    expect(geometry.frameMembers.find((member) => member.id === 'seat-cross-member')).toMatchObject({
      start: { x: 360, y: 0 },
      end: { x: 360, y: 560 },
      lengthMm: 560,
    });
    expect(geometry.wheelSupportUprights).toEqual([
      {
        id: 'wheel-support-left',
        x: 700,
        y: 200,
        heightMm: 810,
      },
      {
        id: 'wheel-support-right',
        x: 700,
        y: 360,
        heightMm: 810,
      },
    ]);
  });
});
