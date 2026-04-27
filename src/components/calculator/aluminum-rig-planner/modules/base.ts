import type { CutListRow, PlannerInput } from '../types';
import { BASE_MODULE_LAYOUT } from '../constants/planner';
import { BASE_PROFILE_MATERIAL } from '../constants/profile';
import {
  BASE_BEAM_HEIGHT,
  BASE_BEAM_WIDTH,
  centeredY,
  createCutListRow,
  mm,
  metersToRoundedMm,
  PROFILE_SHORT,
  type MeshSpec,
} from './shared';

export function createBaseModule(input: PlannerInput, profileColor: string): MeshSpec[] {
  const baseCenterX = mm(input.baseLengthMm / 2);
  const rearCrossBeamCenterX = mm(BASE_MODULE_LAYOUT.rearCrossMemberCenterXMm);
  const seatCrossBeamCenterX = mm(
    Math.max(
      BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm,
      input.seatBaseDepthMm - BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm
    )
  );
  const innerBeamCenterX = mm(input.seatBaseDepthMm / 2);
  const innerBeamLength = mm(input.seatBaseDepthMm);
  const railCenterOffsetMm = BASE_MODULE_LAYOUT.railCenterOffsetMm;
  const baseCenterY = centeredY(input.baseWidthMm / 2, input.baseWidthMm);
  const innerBeamOffsetMm = input.baseInnerBeamSpacingMm / 2;
  const baseCrossBeamLength = mm(input.baseWidthMm) - BASE_BEAM_WIDTH * 2;

  return [
    {
      id: 'left-rail',
      size: [mm(input.baseLengthMm), BASE_BEAM_WIDTH, BASE_BEAM_HEIGHT] as [number, number, number],
      position: [baseCenterX, centeredY(railCenterOffsetMm, input.baseWidthMm), BASE_BEAM_HEIGHT / 2] as [
        number,
        number,
        number,
      ],
      profileType: 'alu80x40',
      openEnds: ['negative', 'positive'],
      color: profileColor,
      metalness: BASE_PROFILE_MATERIAL.metalness,
      roughness: BASE_PROFILE_MATERIAL.roughness,
    },
    {
      id: 'right-rail',
      size: [mm(input.baseLengthMm), BASE_BEAM_WIDTH, BASE_BEAM_HEIGHT] as [number, number, number],
      position: [
        baseCenterX,
        centeredY(input.baseWidthMm - railCenterOffsetMm, input.baseWidthMm),
        BASE_BEAM_HEIGHT / 2,
      ] as [number, number, number],
      profileType: 'alu80x40',
      openEnds: ['negative', 'positive'],
      color: profileColor,
      metalness: BASE_PROFILE_MATERIAL.metalness,
      roughness: BASE_PROFILE_MATERIAL.roughness,
    },
    {
      id: 'rear-cross-member',
      size: [PROFILE_SHORT, baseCrossBeamLength, BASE_BEAM_HEIGHT] as [number, number, number],
      position: [rearCrossBeamCenterX, baseCenterY, BASE_BEAM_HEIGHT / 2] as [number, number, number],
      profileType: 'alu80x40',
      color: profileColor,
      metalness: BASE_PROFILE_MATERIAL.metalness,
      roughness: BASE_PROFILE_MATERIAL.roughness,
    },
    {
      id: 'seat-cross-member',
      size: [PROFILE_SHORT, baseCrossBeamLength, BASE_BEAM_HEIGHT] as [number, number, number],
      position: [seatCrossBeamCenterX, baseCenterY, BASE_BEAM_HEIGHT / 2] as [number, number, number],
      profileType: 'alu80x40',
      color: profileColor,
      metalness: BASE_PROFILE_MATERIAL.metalness,
      roughness: BASE_PROFILE_MATERIAL.roughness,
    },
    {
      id: 'inner-left-rail',
      size: [innerBeamLength, PROFILE_SHORT, PROFILE_SHORT] as [number, number, number],
      position: [
        innerBeamCenterX,
        centeredY(input.baseWidthMm / 2 - innerBeamOffsetMm, input.baseWidthMm),
        BASE_BEAM_HEIGHT + PROFILE_SHORT / 2,
      ] as [number, number, number],
      profileType: 'alu40x40',
      openEnds: ['negative', 'positive'],
      color: profileColor,
      metalness: BASE_PROFILE_MATERIAL.metalness,
      roughness: BASE_PROFILE_MATERIAL.roughness,
    },
    {
      id: 'inner-right-rail',
      size: [innerBeamLength, PROFILE_SHORT, PROFILE_SHORT] as [number, number, number],
      position: [
        innerBeamCenterX,
        centeredY(input.baseWidthMm / 2 + innerBeamOffsetMm, input.baseWidthMm),
        BASE_BEAM_HEIGHT + PROFILE_SHORT / 2,
      ] as [number, number, number],
      profileType: 'alu40x40',
      openEnds: ['negative', 'positive'],
      color: profileColor,
      metalness: BASE_PROFILE_MATERIAL.metalness,
      roughness: BASE_PROFILE_MATERIAL.roughness,
    },
  ];
}

export function createBaseCutList(input: PlannerInput): CutListRow[] {
  const baseCrossBeamLengthMm = metersToRoundedMm(mm(input.baseWidthMm) - BASE_BEAM_WIDTH * 2);

  return [
    createCutListRow('80x40', input.baseLengthMm, 2),
    createCutListRow('80x40', baseCrossBeamLengthMm, 2),
    createCutListRow('40x40', input.seatBaseDepthMm, 2),
  ];
}
