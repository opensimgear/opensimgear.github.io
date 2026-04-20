import type { CutListRow, PlannerInput } from '../types';
import { MODULE_PROFILE_MATERIAL, PLANNER_LAYOUT } from '../constants';
import {
  BASE_BEAM_HEIGHT_MM,
  centeredZ,
  createCutListRow,
  MM_TO_METERS,
  mm,
  PROFILE_SHORT,
  PROFILE_TALL,
  UPRIGHT_BEAM_DEPTH,
  UPRIGHT_BEAM_WIDTH,
  type MeshSpec,
} from './shared';

export function createSteeringColumnModule(input: PlannerInput, profileColor: string): MeshSpec[] {
  const railCenterOffsetMm = UPRIGHT_BEAM_DEPTH / MM_TO_METERS / 2;
  const baseCenterZ = centeredZ(input.baseWidthMm / 2, input.baseWidthMm);
  const uprightHeightAboveBaseMm = Math.max(
    PROFILE_SHORT / MM_TO_METERS,
    input.steeringColumnHeightMm,
    input.steeringColumnBaseHeightMm + PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm
  );
  const supportX = input.seatBaseDepthMm + input.steeringColumnDistanceMm + UPRIGHT_BEAM_DEPTH / MM_TO_METERS;
  const uprightRearFaceXMm = supportX - UPRIGHT_BEAM_WIDTH / MM_TO_METERS / 2;
  const crossBeamLengthMm = input.baseWidthMm - (UPRIGHT_BEAM_DEPTH / MM_TO_METERS) * 2;
  const uprights: MeshSpec[] = [
    {
      id: 'steering-column-left',
      size: [UPRIGHT_BEAM_WIDTH, mm(uprightHeightAboveBaseMm), UPRIGHT_BEAM_DEPTH] as [number, number, number],
      position: [
        mm(supportX),
        mm(BASE_BEAM_HEIGHT_MM + uprightHeightAboveBaseMm / 2),
        centeredZ(railCenterOffsetMm, input.baseWidthMm),
      ] as [number, number, number],
      profileType: 'alu80x40',
      openEnds: ['positive'],
      color: profileColor,
      metalness: MODULE_PROFILE_MATERIAL.metalness,
      roughness: MODULE_PROFILE_MATERIAL.roughness,
    },
    {
      id: 'steering-column-right',
      size: [UPRIGHT_BEAM_WIDTH, mm(uprightHeightAboveBaseMm), UPRIGHT_BEAM_DEPTH] as [number, number, number],
      position: [
        mm(supportX),
        mm(BASE_BEAM_HEIGHT_MM + uprightHeightAboveBaseMm / 2),
        centeredZ(input.baseWidthMm - railCenterOffsetMm, input.baseWidthMm),
      ] as [number, number, number],
      profileType: 'alu80x40',
      openEnds: ['positive'],
      color: profileColor,
      metalness: MODULE_PROFILE_MATERIAL.metalness,
      roughness: MODULE_PROFILE_MATERIAL.roughness,
    },
  ];

  return [
    ...uprights,
    {
      id: 'steering-column-crossbeam',
      size: [PROFILE_SHORT, PROFILE_TALL, mm(crossBeamLengthMm)] as [number, number, number],
      position: [
        mm(uprightRearFaceXMm + PROFILE_SHORT / MM_TO_METERS / 2),
        mm(BASE_BEAM_HEIGHT_MM + input.steeringColumnBaseHeightMm + PROFILE_TALL / MM_TO_METERS / 2),
        baseCenterZ,
      ] as [number, number, number],
      profileType: 'alu80x40',
      color: profileColor,
      metalness: MODULE_PROFILE_MATERIAL.metalness,
      roughness: MODULE_PROFILE_MATERIAL.roughness,
    },
  ];
}

export function createSteeringColumnCutList(input: PlannerInput): CutListRow[] {
  const uprightHeightMm = Math.max(
    PROFILE_SHORT / MM_TO_METERS,
    input.steeringColumnHeightMm,
    input.steeringColumnBaseHeightMm + PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm
  );
  const crossBeamLengthMm = Math.round(input.baseWidthMm - (UPRIGHT_BEAM_DEPTH / MM_TO_METERS) * 2);

  return [
    createCutListRow('80x40', uprightHeightMm, 2),
    createCutListRow('80x40', crossBeamLengthMm, 1),
  ];
}
