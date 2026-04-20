import type { CutListRow, PlannerInput } from '../types';
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
  const rearCrossBeamCenterX = PROFILE_SHORT / 2;
  const seatCrossBeamCenterX = mm(Math.max(20, input.seatBaseDepthMm - 20));
  const innerBeamCenterX = mm(input.seatBaseDepthMm / 2);
  const innerBeamLength = mm(input.seatBaseDepthMm);
  const innerBeamOffsetMm = input.baseInnerBeamSpacingMm / 2;
  const baseCrossBeamLength = centeredZ(400) - centeredZ(0) - BASE_BEAM_WIDTH;

  return [
    {
      id: 'left-rail',
      size: [mm(input.baseLengthMm), BASE_BEAM_HEIGHT, BASE_BEAM_WIDTH] as [number, number, number],
      position: [baseCenterX, BASE_BEAM_HEIGHT / 2, centeredZ(0)] as [number, number, number],
      profileType: 'alu80x40',
      openEnds: ['negative', 'positive'],
      color: profileColor,
      metalness: 0.6,
      roughness: 0.32,
    },
    {
      id: 'right-rail',
      size: [mm(input.baseLengthMm), BASE_BEAM_HEIGHT, BASE_BEAM_WIDTH] as [number, number, number],
      position: [baseCenterX, BASE_BEAM_HEIGHT / 2, centeredZ(400)] as [number, number, number],
      profileType: 'alu80x40',
      openEnds: ['negative', 'positive'],
      color: profileColor,
      metalness: 0.6,
      roughness: 0.32,
    },
    {
      id: 'rear-cross-member',
      size: [PROFILE_SHORT, BASE_BEAM_HEIGHT, baseCrossBeamLength] as [number, number, number],
      position: [rearCrossBeamCenterX, BASE_BEAM_HEIGHT / 2, 0] as [number, number, number],
      profileType: 'alu80x40',
      color: profileColor,
      metalness: 0.6,
      roughness: 0.32,
    },
    {
      id: 'seat-cross-member',
      size: [PROFILE_SHORT, BASE_BEAM_HEIGHT, baseCrossBeamLength] as [number, number, number],
      position: [seatCrossBeamCenterX, BASE_BEAM_HEIGHT / 2, 0] as [number, number, number],
      profileType: 'alu80x40',
      color: profileColor,
      metalness: 0.6,
      roughness: 0.32,
    },
    {
      id: 'inner-left-rail',
      size: [innerBeamLength, PROFILE_SHORT, PROFILE_SHORT] as [number, number, number],
      position: [innerBeamCenterX, BASE_BEAM_HEIGHT + PROFILE_SHORT / 2, centeredZ(200 - innerBeamOffsetMm)] as [
        number,
        number,
        number,
      ],
      profileType: 'alu40x40',
      openEnds: ['negative', 'positive'],
      color: profileColor,
      metalness: 0.6,
      roughness: 0.32,
    },
    {
      id: 'inner-right-rail',
      size: [innerBeamLength, PROFILE_SHORT, PROFILE_SHORT] as [number, number, number],
      position: [innerBeamCenterX, BASE_BEAM_HEIGHT + PROFILE_SHORT / 2, centeredZ(200 + innerBeamOffsetMm)] as [
        number,
        number,
        number,
      ],
      profileType: 'alu40x40',
      openEnds: ['negative', 'positive'],
      color: profileColor,
      metalness: 0.6,
      roughness: 0.32,
    },
  ];
}

export function createBaseCutList(input: PlannerInput): CutListRow[] {
  const baseCrossBeamLengthMm = metersToRoundedMm(centeredZ(400) - centeredZ(0) - BASE_BEAM_WIDTH);

  return [
    createCutListRow('80x40', input.baseLengthMm, 2),
    createCutListRow('80x40', baseCrossBeamLengthMm, 2),
    createCutListRow('40x40', input.seatBaseDepthMm, 2),
  ];
}
