import type { PlannerGeometry } from '../geometry';
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

export function createSteeringColumnModule(input: PlannerInput, geometry: PlannerGeometry, profileColor: string): MeshSpec[] {
  const railCenterOffsetMm = UPRIGHT_BEAM_DEPTH / MM_TO_METERS / 2;
  const baseCenterZ = centeredZ(input.baseWidthMm / 2, input.baseWidthMm);
  const uprights = geometry.wheelSupportUprights.map<MeshSpec>((upright) => {
    const uprightHeightAboveBaseMm = Math.max(
      PROFILE_SHORT / MM_TO_METERS,
      input.steeringColumnHeightMm,
      input.steeringColumnBaseHeightMm + PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm
    );
    const uprightZMm = upright.id === 'wheel-support-left' ? railCenterOffsetMm : input.baseWidthMm - railCenterOffsetMm;

    return {
      id: upright.id,
      size: [UPRIGHT_BEAM_WIDTH, mm(uprightHeightAboveBaseMm), UPRIGHT_BEAM_DEPTH] as [number, number, number],
      position: [
        mm(upright.x),
        mm(BASE_BEAM_HEIGHT_MM + uprightHeightAboveBaseMm / 2),
        centeredZ(uprightZMm, input.baseWidthMm),
      ] as [number, number, number],
      profileType: 'alu80x40',
      openEnds: ['positive'],
      color: profileColor,
      metalness: MODULE_PROFILE_MATERIAL.metalness,
      roughness: MODULE_PROFILE_MATERIAL.roughness,
    };
  });

  const supportX = geometry.wheelSupportUprights[0]?.x ?? input.wheelXMm;
  const uprightRearFaceXMm = supportX - UPRIGHT_BEAM_WIDTH / MM_TO_METERS / 2;
  const crossBeamLengthMm = input.baseWidthMm - (UPRIGHT_BEAM_DEPTH / MM_TO_METERS) * 2;

  return [
    ...uprights,
    {
      id: 'wheel-support-crossbeam',
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

export function createSteeringColumnCutList(input: PlannerInput, geometry: PlannerGeometry): CutListRow[] {
  const uprightHeightMm = Math.max(
    PROFILE_SHORT / MM_TO_METERS,
    input.steeringColumnHeightMm,
    input.steeringColumnBaseHeightMm + PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm
  );
  const crossBeamLengthMm = Math.round(input.baseWidthMm - (UPRIGHT_BEAM_DEPTH / MM_TO_METERS) * 2);

  return [
    createCutListRow('80x40', uprightHeightMm, geometry.wheelSupportUprights.length || 2),
    createCutListRow('80x40', crossBeamLengthMm, 1),
  ];
}
