import { describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_INPUT } from '../../components/calculator/aluminum-rig-planner/constants';
import {
  createPlannerCutList,
  createPlannerCutListEntries,
  mergeCutListRows,
} from '../../components/calculator/aluminum-rig-planner/cut-list';
import { derivePlannerGeometry } from '../../components/calculator/aluminum-rig-planner/geometry';

describe('aluminum rig planner cut list', () => {
  function createGeometry() {
    return derivePlannerGeometry(DEFAULT_PLANNER_INPUT);
  }

  it('always includes base module rows', () => {
    const cutList = createPlannerCutList(
      createGeometry(),
      {
        steeringColumn: false,
        pedalTray: false,
      },
      false
    );

    expect(cutList).toEqual([
      { profileType: '80x40', lengthMm: DEFAULT_PLANNER_INPUT.baseLengthMm, quantity: 2 },
      { profileType: '80x40', lengthMm: 420, quantity: 2 },
      { profileType: '40x40', lengthMm: DEFAULT_PLANNER_INPUT.seatBaseDepthMm, quantity: 2 },
    ]);
  });

  it('updates base crossbeam cut lengths when base width changes', () => {
    const cutList = createPlannerCutList(
      derivePlannerGeometry({
        ...DEFAULT_PLANNER_INPUT,
        baseWidthMm: 600,
      }),
      {
        steeringColumn: false,
        pedalTray: false,
      },
      false
    );

    expect(cutList).toContainEqual({ profileType: '80x40', lengthMm: 520, quantity: 2 });
  });

  it('updates pedal tray crossbeam cut lengths when base width changes', () => {
    const cutList = createPlannerCutList(
      derivePlannerGeometry({
        ...DEFAULT_PLANNER_INPUT,
        baseWidthMm: 600,
      }),
      {
        steeringColumn: false,
        pedalTray: true,
      },
      false
    );

    expect(cutList).toContainEqual({ profileType: '40x40', lengthMm: 440, quantity: 3 });
  });

  it('excludes deactivated modules from combined cut list', () => {
    const cutList = createPlannerCutList(
      createGeometry(),
      {
        steeringColumn: false,
        pedalTray: true,
      },
      false
    );

    expect(cutList).toContainEqual({ profileType: '40x40', lengthMm: 300, quantity: 2 });
    expect(cutList).toContainEqual({ profileType: '40x40', lengthMm: 340, quantity: 3 });
    expect(cutList).not.toContainEqual({ profileType: '80x40', lengthMm: 510, quantity: 2 });
  });

  it('shortens cut lengths when endcaps are enabled', () => {
    const cutList = createPlannerCutList(
      createGeometry(),
      {
        steeringColumn: true,
        pedalTray: true,
      },
      true
    );

    expect(cutList).toContainEqual({ profileType: '80x40', lengthMm: DEFAULT_PLANNER_INPUT.baseLengthMm - 8, quantity: 2 });
    expect(cutList).toContainEqual({ profileType: '80x40', lengthMm: 506, quantity: 2 });
    expect(cutList).toContainEqual({ profileType: '80x40', lengthMm: 420, quantity: 3 });
    expect(cutList).toContainEqual({ profileType: '40x40', lengthMm: DEFAULT_PLANNER_INPUT.seatBaseDepthMm - 8, quantity: 2 });
    expect(cutList).toContainEqual({ profileType: '40x40', lengthMm: 292, quantity: 2 });
    expect(cutList).toContainEqual({ profileType: '40x40', lengthMm: 340, quantity: 3 });
  });

  it('merges rows with matching profile type and length', () => {
    const rows = mergeCutListRows([
      { profileType: '40x40', lengthMm: 320, quantity: 2 },
      { profileType: '80x40', lengthMm: 420, quantity: 2 },
      { profileType: '40x40', lengthMm: 320, quantity: 3 },
    ]);

    expect(rows).toContainEqual({ profileType: '40x40', lengthMm: 320, quantity: 5 });
    expect(rows).toContainEqual({ profileType: '80x40', lengthMm: 420, quantity: 2 });
    expect(rows).toHaveLength(2);
  });

  it('keeps beam ids for every member in merged cut-list entries', () => {
    const entries = createPlannerCutListEntries(
      createGeometry(),
      {
        steeringColumn: false,
        pedalTray: true,
      },
      false
    );
    const pedalCrossBeams = entries.find((entry) => entry.profileType === '40x40' && entry.lengthMm === 340);

    expect(pedalCrossBeams?.quantity).toBe(3);
    expect(pedalCrossBeams?.beamIds).toHaveLength(3);
    expect(pedalCrossBeams?.beamIds).toEqual(['pedal-tray-front', 'pedal-tray-middle', 'pedal-tray-rear']);
  });
});
