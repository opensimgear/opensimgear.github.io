import type { CutListRow, PlannerInput } from '../types';
import { BASE_MODULE_LAYOUT, BASE_PROFILE_MATERIAL } from '../constants';
import {
  BASE_BEAM_HEIGHT,
  BASE_BEAM_WIDTH,
  centeredZ,
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
  const baseCenterZ = centeredZ(input.baseWidthMm / 2, input.baseWidthMm);
  const innerBeamOffsetMm = input.baseInnerBeamSpacingMm / 2;
  const baseCrossBeamLength = mm(input.baseWidthMm) - BASE_BEAM_WIDTH * 2;

  return [
    {
      id: 'left-rail',
      size: [mm(input.baseLengthMm), BASE_BEAM_HEIGHT, BASE_BEAM_WIDTH] as [number, number, number],
      position: [baseCenterX, BASE_BEAM_HEIGHT / 2, centeredZ(railCenterOffsetMm, input.baseWidthMm)] as [
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
      size: [mm(input.baseLengthMm), BASE_BEAM_HEIGHT, BASE_BEAM_WIDTH] as [number, number, number],
      position: [
        baseCenterX,
        BASE_BEAM_HEIGHT / 2,
        centeredZ(input.baseWidthMm - railCenterOffsetMm, input.baseWidthMm),
      ] as [number, number, number],
      profileType: 'alu80x40',
      openEnds: ['negative', 'positive'],
      color: profileColor,
      metalness: BASE_PROFILE_MATERIAL.metalness,
      roughness: BASE_PROFILE_MATERIAL.roughness,
    },
    {
      id: 'rear-cross-member',
      size: [PROFILE_SHORT, BASE_BEAM_HEIGHT, baseCrossBeamLength] as [number, number, number],
      position: [rearCrossBeamCenterX, BASE_BEAM_HEIGHT / 2, baseCenterZ] as [number, number, number],
      profileType: 'alu80x40',
      color: profileColor,
      metalness: BASE_PROFILE_MATERIAL.metalness,
      roughness: BASE_PROFILE_MATERIAL.roughness,
    },
    {
      id: 'seat-cross-member',
      size: [PROFILE_SHORT, BASE_BEAM_HEIGHT, baseCrossBeamLength] as [number, number, number],
      position: [seatCrossBeamCenterX, BASE_BEAM_HEIGHT / 2, baseCenterZ] as [number, number, number],
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
        BASE_BEAM_HEIGHT + PROFILE_SHORT / 2,
        centeredZ(input.baseWidthMm / 2 - innerBeamOffsetMm, input.baseWidthMm),
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
        BASE_BEAM_HEIGHT + PROFILE_SHORT / 2,
        centeredZ(input.baseWidthMm / 2 + innerBeamOffsetMm, input.baseWidthMm),
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
