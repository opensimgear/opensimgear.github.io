import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PLANNER_INPUT,
  PEDAL_TRAY_LAYOUT,
} from '~/components/calculator/aluminum-rig-planner/constants/planner';
import {
  BASE_BEAM_WIDTH_MM,
  UPRIGHT_BEAM_DEPTH_MM,
} from '~/components/calculator/aluminum-rig-planner/constants/profile';
import { DEFAULT_PLANNER_POSTURE_SETTINGS } from '~/components/calculator/aluminum-rig-planner/constants/posture';
import {
  createPlannerCutList,
  createPlannerCutListEntries,
  mergeCutListRows,
} from '~/components/calculator/aluminum-rig-planner/cut-list/cut-list';
import type { PlannerPostureReport } from '~/components/calculator/aluminum-rig-planner/posture/posture-report';
import { derivePlannerGeometry } from '~/components/calculator/aluminum-rig-planner/scene/geometry';

describe('aluminum rig planner cut list', () => {
  function createGeometry() {
    return derivePlannerGeometry(DEFAULT_PLANNER_INPUT);
  }

  it('always includes base and fixed module rows', () => {
    const cutList = createPlannerCutList(createGeometry(), { monitor: false, monitorStand: false }, false);
    const entries = createPlannerCutListEntries(createGeometry(), { monitor: false, monitorStand: false }, false);

    expect(cutList).toContainEqual({ profileType: '80x40', lengthMm: DEFAULT_PLANNER_INPUT.baseLengthMm, quantity: 2 });
    expect(cutList).toContainEqual({
      profileType: '80x40',
      lengthMm: DEFAULT_PLANNER_INPUT.baseWidthMm - BASE_BEAM_WIDTH_MM * 2,
      quantity: 3,
    });
    expect(cutList).toContainEqual({
      profileType: '40x40',
      lengthMm: DEFAULT_PLANNER_INPUT.seatBaseDepthMm,
      quantity: 2,
    });
    expect(entries.flatMap((entry) => entry.beamIds)).toEqual(
      expect.arrayContaining(['steering-column-left', 'steering-column-right', 'pedal-tray-left', 'pedal-tray-right'])
    );
  });

  it('updates base crossbeam cut lengths when base width changes', () => {
    const cutList = createPlannerCutList(
      derivePlannerGeometry({
        ...DEFAULT_PLANNER_INPUT,
        baseWidthMm: 600,
      }),
      { monitor: false, monitorStand: false },
      false
    );

    expect(cutList).toContainEqual({ profileType: '80x40', lengthMm: 520, quantity: 3 });
  });

  it('updates pedal tray crossbeam cut lengths when base width changes', () => {
    const cutList = createPlannerCutList(
      derivePlannerGeometry({
        ...DEFAULT_PLANNER_INPUT,
        baseWidthMm: 600,
      }),
      { monitor: false, monitorStand: false },
      false
    );

    expect(cutList).toContainEqual({ profileType: '40x40', lengthMm: 440, quantity: 3 });
  });

  it('keeps fixed modules in the combined cut list when monitor is hidden', () => {
    const cutList = createPlannerCutList(createGeometry(), { monitor: false, monitorStand: false }, false);
    const cutListWithMonitor = createPlannerCutList(createGeometry(), { monitor: true, monitorStand: false }, false);

    expect(cutList).toEqual(cutListWithMonitor);
    expect(cutList).toContainEqual({ profileType: '40x40', lengthMm: 300, quantity: 2 });
    expect(cutList).toContainEqual({
      profileType: '40x40',
      lengthMm: DEFAULT_PLANNER_INPUT.baseWidthMm - PEDAL_TRAY_LAYOUT.sideBeamInnerSpanReductionMm,
      quantity: 3,
    });
    expect(cutList).toContainEqual({
      profileType: '80x40',
      lengthMm: DEFAULT_PLANNER_INPUT.steeringColumnHeightMm,
      quantity: 2,
    });
  });

  it('shortens cut lengths when endcaps are enabled', () => {
    const cutList = createPlannerCutList(createGeometry(), { monitor: true, monitorStand: false }, true);

    expect(cutList).toContainEqual({
      profileType: '80x40',
      lengthMm: DEFAULT_PLANNER_INPUT.baseLengthMm - 8,
      quantity: 2,
    });
    expect(cutList).toContainEqual({ profileType: '80x40', lengthMm: 506, quantity: 2 });
    expect(cutList).toContainEqual({
      profileType: '80x40',
      lengthMm: DEFAULT_PLANNER_INPUT.baseWidthMm - UPRIGHT_BEAM_DEPTH_MM * 2,
      quantity: 3,
    });
    expect(cutList).toContainEqual({
      profileType: '40x40',
      lengthMm: DEFAULT_PLANNER_INPUT.seatBaseDepthMm - 8,
      quantity: 2,
    });
    expect(cutList).toContainEqual({ profileType: '40x40', lengthMm: 292, quantity: 2 });
    expect(cutList).toContainEqual({
      profileType: '40x40',
      lengthMm: DEFAULT_PLANNER_INPUT.baseWidthMm - PEDAL_TRAY_LAYOUT.sideBeamInnerSpanReductionMm,
      quantity: 3,
    });
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
    const entries = createPlannerCutListEntries(createGeometry(), { monitor: false, monitorStand: false }, false);
    const pedalCrossBeams = entries.find(
      (entry) =>
        entry.profileType === '40x40' &&
        entry.lengthMm === DEFAULT_PLANNER_INPUT.baseWidthMm - PEDAL_TRAY_LAYOUT.sideBeamInnerSpanReductionMm
    );

    expect(pedalCrossBeams?.quantity).toBe(3);
    expect(pedalCrossBeams?.beamIds).toHaveLength(3);
    expect(pedalCrossBeams?.beamIds).toEqual(['pedal-tray-front', 'pedal-tray-middle', 'pedal-tray-rear']);
  });

  it('adds monitor stand profile pieces only when the stand module is enabled', () => {
    const postureReport = {
      metrics: [],
      hints: [],
      monitorDebug: {
        position: [1, 0, 1] as [number, number, number],
        diameterM: 0.01,
        constants: { ballDiameterMm: 10 },
      },
    } satisfies PlannerPostureReport;
    const withoutStand = createPlannerCutList(
      createGeometry(),
      { monitor: true, monitorStand: false },
      false,
      postureReport,
      DEFAULT_PLANNER_POSTURE_SETTINGS
    );
    const withStand = createPlannerCutListEntries(
      createGeometry(),
      { monitor: true, monitorStand: true },
      false,
      postureReport,
      DEFAULT_PLANNER_POSTURE_SETTINGS
    );

    expect(withStand).not.toEqual(withoutStand);
    expect(withStand.flatMap((entry) => entry.beamIds)).toEqual(
      expect.arrayContaining([
        'monitor-stand-crossbeam',
        'monitor-stand-left-leg',
        'monitor-stand-right-leg',
        'monitor-stand-left-foot',
        'monitor-stand-right-foot',
      ])
    );
  });
});
