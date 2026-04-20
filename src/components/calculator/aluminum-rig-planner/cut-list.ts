import type { PlannerGeometry } from './geometry';
import { createBaseModule } from './modules/base';
import { createPedalTrayModule } from './modules/pedal-tray';
import { createSteeringColumnModule } from './modules/steering-column';
import { BLACK_PROFILE_COLOR, getMeshCutListRow } from './modules/shared';
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

export function createPlannerCutList(
  geometry: PlannerGeometry,
  visibleModules: PlannerVisibleModules,
  showEndCaps: boolean
): CutListRow[] {
  const rows: CutListRow[] = [];
  const meshes = [
    ...createBaseModule(geometry.input, BLACK_PROFILE_COLOR),
    ...(visibleModules.steeringColumn ? createSteeringColumnModule(geometry.input, geometry, BLACK_PROFILE_COLOR) : []),
    ...(visibleModules.pedalTray ? createPedalTrayModule(geometry.input, BLACK_PROFILE_COLOR) : []),
  ];

  for (const mesh of meshes) {
    const row = getMeshCutListRow(mesh, showEndCaps);

    if (row) {
      rows.push(row);
    }
  }

  return mergeCutListRows(rows);
}
