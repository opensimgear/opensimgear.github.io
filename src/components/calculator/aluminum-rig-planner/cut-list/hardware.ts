import type { MonitorStandLayoutMm } from '~/components/calculator/aluminum-rig-planner/modules/monitor-stand';
import type {
  PlannerHardwareType,
  PlannerInput,
  PlannerOptimizationSettings,
  PlannerPosturePreset,
  PlannerPostureSettings,
  PlannerVisibleModules,
} from '~/components/calculator/aluminum-rig-planner/types';

export type PlannerHardwareSummaryRow = {
  key: PlannerHardwareType;
  label: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

function getRubberFeetQuantity(
  input: PlannerInput,
  visibleModules: PlannerVisibleModules,
  postureSettings: PlannerPostureSettings<PlannerPosturePreset>,
  monitorStandLayout: MonitorStandLayoutMm | null
) {
  const baseFeetQuantity = input.baseFeetType === 'rubber' ? 4 : 0;
  const monitorStandFeetQuantity =
    visibleModules.monitor &&
    visibleModules.monitorStand &&
    postureSettings.monitorStandFeetType === 'rubber' &&
    monitorStandLayout?.variant === 'freestand' &&
    monitorStandLayout
      ? 4 + monitorStandLayout.sideLegs.length * 2
      : 0;

  return baseFeetQuantity + monitorStandFeetQuantity;
}

export function createPlannerHardwareSummaryRows(
  input: PlannerInput,
  visibleModules: PlannerVisibleModules,
  postureSettings: PlannerPostureSettings<PlannerPosturePreset>,
  monitorStandLayout: MonitorStandLayoutMm | null,
  optimizationSettings: PlannerOptimizationSettings
): PlannerHardwareSummaryRow[] {
  const rubberFeetQuantity = getRubberFeetQuantity(input, visibleModules, postureSettings, monitorStandLayout);

  if (rubberFeetQuantity <= 0) {
    return [];
  }

  const unitCost = Math.max(0, optimizationSettings.hardwareUnitCosts.rubberFeet);

  return [
    {
      key: 'rubberFeet',
      label: 'Rubber feet',
      quantity: rubberFeetQuantity,
      unitCost,
      totalCost: rubberFeetQuantity * unitCost,
    },
  ];
}
