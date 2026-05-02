import type { PlannerGeometry } from '../scene/geometry';
import { createMonitorStandModule } from '~/components/calculator/aluminum-rig-planner/modules/monitor-stand';
import { createBaseModule } from '../modules/base';
import { createPedalTrayModule } from '../modules/pedal-tray';
import { createSteeringColumnModule } from '../modules/steering-column';
import { BLACK_PROFILE_COLOR, getMeshCutListRow } from '../modules/shared';
import type { PlannerPostureReport } from '../posture/posture-report';
import type {
  CutListEntry,
  CutListRow,
  PlannerPosturePreset,
  PlannerPostureSettings,
  PlannerVisibleModules,
} from '../types';

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

function getCutListRowKey(row: Pick<CutListRow, 'profileType' | 'lengthMm'>) {
  return `${row.profileType}:${row.lengthMm}`;
}

export function mergeCutListEntries(rows: CutListEntry[]): CutListEntry[] {
  const mergedRows = new Map<string, CutListEntry>();

  for (const row of rows) {
    const existing = mergedRows.get(row.key);

    if (existing) {
      existing.quantity += row.quantity;
      existing.beamIds.push(...row.beamIds);
      continue;
    }

    mergedRows.set(row.key, {
      ...row,
      beamIds: [...row.beamIds],
    });
  }

  return [...mergedRows.values()].sort(compareCutListRows);
}

function getPlannerMeshes(
  geometry: PlannerGeometry,
  visibleModules: PlannerVisibleModules,
  postureReport?: PlannerPostureReport | null,
  postureSettings?: PlannerPostureSettings<PlannerPosturePreset>
) {
  const fixedMeshes = [
    ...createBaseModule(geometry.input, BLACK_PROFILE_COLOR),
    ...createSteeringColumnModule(geometry.input, BLACK_PROFILE_COLOR),
    ...createPedalTrayModule(geometry.input, BLACK_PROFILE_COLOR),
  ];

  if (!visibleModules.monitor || !visibleModules.monitorStand || !postureReport?.monitorDebug || !postureSettings) {
    return fixedMeshes;
  }

  return [
    ...fixedMeshes,
    ...createMonitorStandModule(postureReport.monitorDebug, postureSettings, BLACK_PROFILE_COLOR, geometry.input),
  ];
}

export function createPlannerCutListEntries(
  geometry: PlannerGeometry,
  visibleModules: PlannerVisibleModules,
  showEndCaps: boolean,
  postureReport?: PlannerPostureReport | null,
  postureSettings?: PlannerPostureSettings<PlannerPosturePreset>
): CutListEntry[] {
  const rows: CutListEntry[] = [];
  const meshes = getPlannerMeshes(geometry, visibleModules, postureReport, postureSettings);

  for (const mesh of meshes) {
    const row = getMeshCutListRow(mesh, showEndCaps);

    if (row) {
      rows.push({
        ...row,
        key: getCutListRowKey(row),
        beamIds: [mesh.id],
      });
    }
  }

  return mergeCutListEntries(rows);
}

export function createPlannerCutList(
  geometry: PlannerGeometry,
  visibleModules: PlannerVisibleModules,
  showEndCaps: boolean,
  postureReport?: PlannerPostureReport | null,
  postureSettings?: PlannerPostureSettings<PlannerPosturePreset>
): CutListRow[] {
  return createPlannerCutListEntries(geometry, visibleModules, showEndCaps, postureReport, postureSettings).map(
    ({ key: _key, beamIds: _beamIds, ...row }) => row
  );
}
