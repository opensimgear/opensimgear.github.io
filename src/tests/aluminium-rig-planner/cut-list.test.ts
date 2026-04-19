import { describe, expect, it } from 'vitest';

import type { PlannerGeometry } from '../../components/calculator/aluminium-rig-planner/geometry';
import { GT_PRESET } from '../../components/calculator/aluminium-rig-planner/presets';
import { deriveCutListRows } from '../../components/calculator/aluminium-rig-planner/cut-list';

function createGeometryFixture(frameMembers: PlannerGeometry['frameMembers']): PlannerGeometry {
  return {
    input: {
      ...GT_PRESET,
      driverHeightMm: 1750,
      inseamMm: 820,
      seatingBias: 'performance',
    },
    wheelMountOffsets: {
      mountXMm: 0,
      mountYMm: 0,
      wheelCenterOffsetXMm: 0,
      wheelCenterOffsetYMm: 0,
    },
    wheelReachMm: 0,
    legExtensionMm: 0,
    frameMembers,
  };
}

describe('aluminium rig planner cut list', () => {
  it('groups profile rows by matching frame-member lengths', () => {
    const geometry = createGeometryFixture([
      { id: 'long-left', start: { x: 0, y: 0 }, end: { x: 1400, y: 0 }, lengthMm: 1400 },
      { id: 'mid-brace', start: { x: 100, y: 0 }, end: { x: 656, y: 0 }, lengthMm: 556 },
      { id: 'short-b', start: { x: 0, y: 40 }, end: { x: 400, y: 40 }, lengthMm: 400 },
      { id: 'long-right', start: { x: 0, y: 80 }, end: { x: 1400, y: 80 }, lengthMm: 1400 },
      { id: 'short-a', start: { x: 0, y: 120 }, end: { x: 400, y: 120 }, lengthMm: 400 },
      { id: 'short-c', start: { x: 0, y: 160 }, end: { x: 400, y: 160 }, lengthMm: 400 },
      { id: 'short-d', start: { x: 0, y: 200 }, end: { x: 400, y: 200 }, lengthMm: 400 },
    ]);

    const rows = deriveCutListRows(geometry);

    expect(rows).toEqual([
      { profile: '40x80', lengthMm: 400, quantity: 4 },
      { profile: '40x80', lengthMm: 556, quantity: 1 },
      { profile: '40x80', lengthMm: 1400, quantity: 2 },
    ]);
  });

  it('keeps derivation pure and does not mutate frame members', () => {
    const geometry = createGeometryFixture([
      { id: 'member-a', start: { x: 0, y: 0 }, end: { x: 600, y: 0 }, lengthMm: 600 },
      { id: 'member-b', start: { x: 0, y: 40 }, end: { x: 600, y: 40 }, lengthMm: 600 },
      { id: 'member-c', start: { x: 0, y: 80 }, end: { x: 800, y: 80 }, lengthMm: 800 },
    ]);
    const snapshot = structuredClone(geometry.frameMembers);

    const rows = deriveCutListRows(geometry);

    expect(rows.every((row) => row.quantity >= 1)).toBe(true);
    expect(geometry.frameMembers).toEqual(snapshot);
  });
});
