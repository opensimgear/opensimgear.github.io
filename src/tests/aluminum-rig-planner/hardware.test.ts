import { describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_INPUT } from '~/components/calculator/aluminum-rig-planner/constants/planner';
import { DEFAULT_PLANNER_POSTURE_SETTINGS } from '~/components/calculator/aluminum-rig-planner/constants/posture';
import { DEFAULT_PLANNER_OPTIMIZATION_SETTINGS } from '~/components/calculator/aluminum-rig-planner/constants/optimizer';
import { createPlannerHardwareSummaryRows } from '~/components/calculator/aluminum-rig-planner/cut-list/hardware';
import { getMonitorStandLayoutMm } from '~/components/calculator/aluminum-rig-planner/modules/monitor-stand';
import type { PlannerPostureMonitorDebug } from '~/components/calculator/aluminum-rig-planner/posture/posture-report';

const visibleMonitorStand = {
  monitor: true,
  monitorStand: true,
};

const hiddenMonitorStand = {
  monitor: true,
  monitorStand: false,
};

const monitorDebug = {
  position: [1.2, 0, 1] as [number, number, number],
  diameterM: 0.01,
  constants: {
    ballDiameterMm: 10,
  },
} satisfies PlannerPostureMonitorDebug;

const monitorStandLayout = getMonitorStandLayoutMm(
  monitorDebug,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  DEFAULT_PLANNER_INPUT.baseWidthMm
);
const integratedMonitorStandLayout = getMonitorStandLayoutMm(
  monitorDebug,
  {
    ...DEFAULT_PLANNER_POSTURE_SETTINGS,
    monitorStandVariant: 'integrated',
  },
  DEFAULT_PLANNER_INPUT
);

describe('aluminum rig planner hardware summary', () => {
  it('counts enabled rubber feet and applies unit cost', () => {
    const rows = createPlannerHardwareSummaryRows(
      DEFAULT_PLANNER_INPUT,
      visibleMonitorStand,
      DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorStandLayout,
      {
        ...DEFAULT_PLANNER_OPTIMIZATION_SETTINGS,
        hardwareUnitCosts: {
          rubberFeet: 3,
        },
      }
    );

    expect(rows).toEqual([
      {
        key: 'rubberFeet',
        label: 'Rubber feet',
        quantity: 8,
        unitCost: 3,
        totalCost: 24,
      },
    ]);
  });

  it('omits rubber feet when both base and monitor stand feet are disabled', () => {
    const rows = createPlannerHardwareSummaryRows(
      {
        ...DEFAULT_PLANNER_INPUT,
        baseFeetType: 'none',
        baseFeetHeightMm: 0,
      },
      visibleMonitorStand,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandFeetType: 'none',
        monitorStandFeetHeightMm: 0,
      },
      monitorStandLayout,
      DEFAULT_PLANNER_OPTIMIZATION_SETTINGS
    );

    expect(rows).toEqual([]);
  });

  it('does not count monitor stand feet when monitor stand module is hidden', () => {
    const rows = createPlannerHardwareSummaryRows(
      DEFAULT_PLANNER_INPUT,
      hiddenMonitorStand,
      DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorStandLayout,
      DEFAULT_PLANNER_OPTIMIZATION_SETTINGS
    );

    expect(rows[0]?.quantity).toBe(4);
  });

  it('does not count monitor stand feet for integrated stand variant', () => {
    const rows = createPlannerHardwareSummaryRows(
      DEFAULT_PLANNER_INPUT,
      visibleMonitorStand,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandVariant: 'integrated',
      },
      integratedMonitorStandLayout,
      DEFAULT_PLANNER_OPTIMIZATION_SETTINGS
    );

    expect(rows[0]?.quantity).toBe(4);
  });
});
