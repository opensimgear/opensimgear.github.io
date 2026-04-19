import type { PlannerGeometry } from './geometry';

export type CutListRow = {
  profile: '40x80';
  lengthMm: number;
  quantity: number;
};

export function deriveCutListRows(geometry: PlannerGeometry): CutListRow[] {
  const groupedRows = new Map<number, CutListRow>();

  for (const member of geometry.frameMembers) {
    const existingRow = groupedRows.get(member.lengthMm);

    if (existingRow) {
      existingRow.quantity += 1;
      continue;
    }

    groupedRows.set(member.lengthMm, {
      profile: '40x80',
      lengthMm: member.lengthMm,
      quantity: 1,
    });
  }

  return [...groupedRows.values()].sort((left, right) => left.lengthMm - right.lengthMm);
}
