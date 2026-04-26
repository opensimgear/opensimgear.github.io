import type { CutListRow, PlannerInput } from '../types';
import { MODULE_PROFILE_MATERIAL, PLANNER_LAYOUT } from '../constants';
import {
  BASE_BEAM_HEIGHT_MM,
  centeredY,
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
  const baseCenterY = centeredY(input.baseWidthMm / 2, input.baseWidthMm);
  const wheelBaseRotationRad = (input.wheelAngleDeg * Math.PI) / 180;
  const crossBeamRotationRad = wheelBaseRotationRad + Math.PI / 2;
  const uprightHeightAboveBaseMm = Math.max(
    PROFILE_SHORT / MM_TO_METERS,
    input.steeringColumnHeightMm,
    input.steeringColumnBaseHeightMm + PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm
  );
  const supportX = input.seatBaseDepthMm + input.steeringColumnDistanceMm + UPRIGHT_BEAM_DEPTH / MM_TO_METERS;
  const crossBeamLengthMm = input.baseWidthMm - (UPRIGHT_BEAM_DEPTH / MM_TO_METERS) * 2;
  const crossBeamWideFaceMidpointZMm =
    BASE_BEAM_HEIGHT_MM + input.steeringColumnBaseHeightMm + PROFILE_TALL / MM_TO_METERS;
  const crossBeamWideFaceNormalX = Math.sin(wheelBaseRotationRad);
  const crossBeamWideFaceNormalZ = Math.cos(wheelBaseRotationRad);
  const crossBeamCenterXmm = supportX - crossBeamWideFaceNormalX * (PROFILE_SHORT / MM_TO_METERS / 2);
  const crossBeamCenterZmm =
    crossBeamWideFaceMidpointZMm - crossBeamWideFaceNormalZ * (PROFILE_SHORT / MM_TO_METERS / 2);
  const uprights: MeshSpec[] = [
    {
      id: 'steering-column-left',
      size: [UPRIGHT_BEAM_WIDTH, UPRIGHT_BEAM_DEPTH, mm(uprightHeightAboveBaseMm)] as [number, number, number],
      position: [
        mm(supportX),
        centeredY(railCenterOffsetMm, input.baseWidthMm),
        mm(BASE_BEAM_HEIGHT_MM + uprightHeightAboveBaseMm / 2),
      ] as [number, number, number],
      profileType: 'alu80x40',
      openEnds: ['positive'],
      color: profileColor,
      metalness: MODULE_PROFILE_MATERIAL.metalness,
      roughness: MODULE_PROFILE_MATERIAL.roughness,
    },
    {
      id: 'steering-column-right',
      size: [UPRIGHT_BEAM_WIDTH, UPRIGHT_BEAM_DEPTH, mm(uprightHeightAboveBaseMm)] as [number, number, number],
      position: [
        mm(supportX),
        centeredY(input.baseWidthMm - railCenterOffsetMm, input.baseWidthMm),
        mm(BASE_BEAM_HEIGHT_MM + uprightHeightAboveBaseMm / 2),
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
      size: [PROFILE_SHORT, mm(crossBeamLengthMm), PROFILE_TALL] as [number, number, number],
      position: [mm(crossBeamCenterXmm), baseCenterY, mm(crossBeamCenterZmm)] as [number, number, number],
      rotation: [0, crossBeamRotationRad, 0] as [number, number, number],
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

  return [createCutListRow('80x40', uprightHeightMm, 2), createCutListRow('80x40', crossBeamLengthMm, 1)];
}
