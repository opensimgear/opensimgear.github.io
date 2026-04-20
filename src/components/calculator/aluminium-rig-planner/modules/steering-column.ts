import type { PlannerGeometry } from '../geometry';
import type { PlannerInput } from '../types';
import {
  BASE_BEAM_HEIGHT_MM,
  centeredZ,
  MM_TO_METERS,
  mm,
  PROFILE_COLOR,
  PROFILE_SHORT,
  PROFILE_TALL,
  RENDERED_RAIL_SPACING_MM,
  SCENE_WIDTH_MM,
  UPRIGHT_BEAM_DEPTH,
  UPRIGHT_BEAM_WIDTH,
  type MeshSpec,
} from './shared';

export function createSteeringColumnModule(input: PlannerInput, geometry: PlannerGeometry): MeshSpec[] {
  const uprights = geometry.wheelSupportUprights.map<MeshSpec>((upright) => {
    const uprightHeightAboveBaseMm = Math.max(
      PROFILE_SHORT / MM_TO_METERS,
      input.steeringColumnHeightMm,
      input.steeringColumnBaseHeightMm + PROFILE_TALL / MM_TO_METERS
    );
    const uprightZMm = upright.id === 'wheel-support-left' ? 0 : SCENE_WIDTH_MM;

    return {
      id: upright.id,
      size: [UPRIGHT_BEAM_WIDTH, mm(uprightHeightAboveBaseMm), UPRIGHT_BEAM_DEPTH] as [number, number, number],
      position: [
        mm(upright.x),
        mm(BASE_BEAM_HEIGHT_MM + uprightHeightAboveBaseMm / 2),
        centeredZ(uprightZMm),
      ] as [number, number, number],
      profileType: 'alu80x40',
      color: PROFILE_COLOR,
      metalness: 0.62,
      roughness: 0.3,
    };
  });

  const supportX = geometry.wheelSupportUprights[0]?.x ?? input.wheelXMm;
  const uprightRearFaceXMm = supportX - UPRIGHT_BEAM_WIDTH / MM_TO_METERS / 2;
  const crossBeamLengthMm = RENDERED_RAIL_SPACING_MM - UPRIGHT_BEAM_DEPTH / MM_TO_METERS;

  return [
    ...uprights,
    {
      id: 'wheel-support-crossbeam',
      size: [PROFILE_SHORT, PROFILE_TALL, mm(crossBeamLengthMm)] as [number, number, number],
      position: [
        mm(uprightRearFaceXMm + PROFILE_SHORT / MM_TO_METERS / 2),
        mm(BASE_BEAM_HEIGHT_MM + input.steeringColumnBaseHeightMm + PROFILE_TALL / MM_TO_METERS / 2),
        0,
      ] as [number, number, number],
      profileType: 'alu80x40',
      color: PROFILE_COLOR,
      metalness: 0.62,
      roughness: 0.3,
    },
  ];
}
