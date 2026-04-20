import type { PlannerGeometry } from './geometry';
import { createBaseCutList } from './modules/base';
import { createPedalTrayCutList } from './modules/pedal-tray';
import { createSteeringColumnCutList } from './modules/steering-column';
import type { CutListRow, PlannerVisibleModules } from './types';

function compareCutListRows(a: CutListRow, b: CutListRow) {
  if (a.profileType !== b.profileType) {
    return a.profileType === '80x40' ? -1 : 1;
  }

  return b.lengthMm - a.lengthMm;
}

export function mergeCutListRows(rows: CutListRow[]): CutListRow[] {
  const mergedRows = new Map<string, CutListRow>();

  for (const row of rows) {
    const key = `${row.profileType}:${row.lengthMm}`;
    const existing = mergedRows.get(key);

    if (existing) {
      existing.quantity += row.quantity;
      continue;
    }

    mergedRows.set(key, { ...row });
  }

  return [...mergedRows.values()].sort(compareCutListRows);
}

export function createPlannerCutList(geometry: PlannerGeometry, visibleModules: PlannerVisibleModules): CutListRow[] {
  const rows: CutListRow[] = [...createBaseCutList(geometry.input)];

  if (visibleModules.steeringColumn) {
    rows.push(...createSteeringColumnCutList(geometry.input, geometry));
  }

  if (visibleModules.pedalTray) {
    rows.push(...createPedalTrayCutList(geometry.input));
  }

  return mergeCutListRows(rows);
}
