import type { PlannerInput } from '../types';
import {
  BASE_BEAM_HEIGHT,
  BASE_BEAM_WIDTH,
  centeredZ,
  CROSS_BEAM_LENGTH_MM,
  mm,
  PROFILE_COLOR,
  PROFILE_SHORT,
  type MeshSpec,
} from './shared';

export function createBaseModule(input: PlannerInput): MeshSpec[] {
  const baseCenterX = mm(input.baseLengthMm / 2);
  const rearCrossBeamCenterX = PROFILE_SHORT / 2;
  const seatCrossBeamCenterX = mm(Math.max(20, input.seatBaseDepthMm - 20));
  const innerBeamCenterX = mm(input.seatBaseDepthMm / 2);
  const innerBeamLength = mm(input.seatBaseDepthMm);
  const innerBeamOffsetMm = input.baseInnerBeamSpacingMm / 2;

  return [
    {
      id: 'left-rail',
      size: [mm(input.baseLengthMm), BASE_BEAM_HEIGHT, BASE_BEAM_WIDTH] as [number, number, number],
      position: [baseCenterX, BASE_BEAM_HEIGHT / 2, centeredZ(0)] as [number, number, number],
      color: PROFILE_COLOR,
      metalness: 0.6,
      roughness: 0.32,
    },
    {
      id: 'right-rail',
      size: [mm(input.baseLengthMm), BASE_BEAM_HEIGHT, BASE_BEAM_WIDTH] as [number, number, number],
      position: [baseCenterX, BASE_BEAM_HEIGHT / 2, centeredZ(400)] as [number, number, number],
      color: PROFILE_COLOR,
      metalness: 0.6,
      roughness: 0.32,
    },
    {
      id: 'rear-cross-member',
      size: [PROFILE_SHORT, BASE_BEAM_HEIGHT, mm(CROSS_BEAM_LENGTH_MM)] as [number, number, number],
      position: [rearCrossBeamCenterX, BASE_BEAM_HEIGHT / 2, 0] as [number, number, number],
      color: PROFILE_COLOR,
      metalness: 0.6,
      roughness: 0.32,
    },
    {
      id: 'seat-cross-member',
      size: [PROFILE_SHORT, BASE_BEAM_HEIGHT, mm(CROSS_BEAM_LENGTH_MM)] as [number, number, number],
      position: [seatCrossBeamCenterX, BASE_BEAM_HEIGHT / 2, 0] as [number, number, number],
      color: PROFILE_COLOR,
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
      color: PROFILE_COLOR,
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
      color: PROFILE_COLOR,
      metalness: 0.6,
      roughness: 0.32,
    },
  ];
}
