import { describe, expect, it } from 'vitest';

import { createPlannerCutList, mergeCutListRows } from '../../components/calculator/aluminium-rig-planner/cut-list';
import { derivePlannerGeometry } from '../../components/calculator/aluminium-rig-planner/geometry';
import { createInitialPlannerInput } from '../../components/calculator/aluminium-rig-planner/presets';

describe('aluminium rig planner cut list', () => {
  function createGeometry() {
    const input = createInitialPlannerInput({
      driverHeightMm: 1750,
      inseamMm: 820,
      seatingBias: 'performance',
      presetType: 'gt',
    });

    return derivePlannerGeometry(input);
  }

  it('always includes the base module rows', () => {
    const cutList = createPlannerCutList(createGeometry(), {
      steeringColumn: false,
      pedalTray: false,
    }, false);

    expect(cutList).toEqual([
      { profileType: '80x40', lengthMm: 1400, quantity: 2 },
      { profileType: '80x40', lengthMm: 420, quantity: 2 },
      { profileType: '40x40', lengthMm: 360, quantity: 2 },
    ]);
  });

  it('excludes deactivated modules from the combined cut list', () => {
    const cutList = createPlannerCutList(createGeometry(), {
      steeringColumn: false,
      pedalTray: true,
    }, false);

    expect(cutList).toContainEqual({ profileType: '40x40', lengthMm: 320, quantity: 2 });
    expect(cutList).toContainEqual({ profileType: '40x40', lengthMm: 340, quantity: 3 });
    expect(cutList).not.toContainEqual({ profileType: '80x40', lengthMm: 620, quantity: 2 });
  });

  it('shortens cut lengths when endcaps are enabled', () => {
    const cutList = createPlannerCutList(createGeometry(), {
      steeringColumn: true,
      pedalTray: true,
    }, true);

    expect(cutList).toContainEqual({ profileType: '80x40', lengthMm: 1392, quantity: 2 });
    expect(cutList).toContainEqual({ profileType: '80x40', lengthMm: 596, quantity: 2 });
    expect(cutList).toContainEqual({ profileType: '40x40', lengthMm: 352, quantity: 2 });
    expect(cutList).toContainEqual({ profileType: '40x40', lengthMm: 312, quantity: 2 });
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
});
