import type { CutListRow, PlannerInput } from '../types';
import { PEDAL_TRAY_LAYOUT } from '../constants/planner';
import { MODULE_PROFILE_MATERIAL } from '../constants/profile';
import {
  BASE_BEAM_HEIGHT,
  centeredY,
  createCutListRow,
  metersToRoundedMm,
  mm,
  PROFILE_SHORT,
  type MeshSpec,
} from './shared';

export function createPedalTrayModule(input: PlannerInput, profileColor: string): MeshSpec[] {
  const trayTopZ = BASE_BEAM_HEIGHT;
  const trayBeamCenterZ = trayTopZ - PROFILE_SHORT / 2;
  const traySideCenterOffsetMm = PEDAL_TRAY_LAYOUT.sideBeamCenterOffsetMm;
  const trayCenterY = centeredY(input.baseWidthMm / 2, input.baseWidthMm);
  const trayRearCrossBeamCenterXMm =
    input.seatBaseDepthMm + input.pedalTrayDistanceMm + PEDAL_TRAY_LAYOUT.rearCrossMemberCenterInsetMm;
  const trayFrontCrossBeamCenterXMm =
    trayRearCrossBeamCenterXMm + input.pedalTrayDepthMm - PEDAL_TRAY_LAYOUT.crossBeamInsetTotalMm;
  const trayMiddleCrossBeamCenterXMm = (trayRearCrossBeamCenterXMm + trayFrontCrossBeamCenterXMm) / 2;
  const traySideBeamCenterXMm =
    trayRearCrossBeamCenterXMm + (input.pedalTrayDepthMm - PEDAL_TRAY_LAYOUT.crossBeamInsetTotalMm) / 2;
  const trayCrossBeamLength = mm(input.baseWidthMm - PEDAL_TRAY_LAYOUT.sideBeamInnerSpanReductionMm);
  const traySideBeamLength = mm(input.pedalTrayDepthMm);

  return [
    {
      id: 'pedal-tray-left',
      size: [traySideBeamLength, PROFILE_SHORT, PROFILE_SHORT] as [number, number, number],
      position: [mm(traySideBeamCenterXMm), centeredY(traySideCenterOffsetMm, input.baseWidthMm), trayBeamCenterZ] as [
        number,
        number,
        number,
      ],
      profileType: 'alu40x40',
      openEnds: ['negative', 'positive'],
      color: profileColor,
      metalness: MODULE_PROFILE_MATERIAL.metalness,
      roughness: MODULE_PROFILE_MATERIAL.roughness,
    },
    {
      id: 'pedal-tray-right',
      size: [traySideBeamLength, PROFILE_SHORT, PROFILE_SHORT] as [number, number, number],
      position: [
        mm(traySideBeamCenterXMm),
        centeredY(input.baseWidthMm - traySideCenterOffsetMm, input.baseWidthMm),
        trayBeamCenterZ,
      ] as [number, number, number],
      profileType: 'alu40x40',
      openEnds: ['negative', 'positive'],
      color: profileColor,
      metalness: MODULE_PROFILE_MATERIAL.metalness,
      roughness: MODULE_PROFILE_MATERIAL.roughness,
    },
    {
      id: 'pedal-tray-front',
      size: [PROFILE_SHORT, trayCrossBeamLength, PROFILE_SHORT] as [number, number, number],
      position: [mm(trayFrontCrossBeamCenterXMm), trayCenterY, trayBeamCenterZ] as [number, number, number],
      profileType: 'alu40x40',
      color: profileColor,
      metalness: MODULE_PROFILE_MATERIAL.metalness,
      roughness: MODULE_PROFILE_MATERIAL.roughness,
    },
    {
      id: 'pedal-tray-middle',
      size: [PROFILE_SHORT, trayCrossBeamLength, PROFILE_SHORT] as [number, number, number],
      position: [mm(trayMiddleCrossBeamCenterXMm), trayCenterY, trayBeamCenterZ] as [number, number, number],
      profileType: 'alu40x40',
      color: profileColor,
      metalness: MODULE_PROFILE_MATERIAL.metalness,
      roughness: MODULE_PROFILE_MATERIAL.roughness,
    },
    {
      id: 'pedal-tray-rear',
      size: [PROFILE_SHORT, trayCrossBeamLength, PROFILE_SHORT] as [number, number, number],
      position: [mm(trayRearCrossBeamCenterXMm), trayCenterY, trayBeamCenterZ] as [number, number, number],
      profileType: 'alu40x40',
      color: profileColor,
      metalness: MODULE_PROFILE_MATERIAL.metalness,
      roughness: MODULE_PROFILE_MATERIAL.roughness,
    },
  ];
}

export function createPedalTrayCutList(input: PlannerInput): CutListRow[] {
  const trayCrossBeamLengthMm = metersToRoundedMm(
    mm(input.baseWidthMm - PEDAL_TRAY_LAYOUT.sideBeamInnerSpanReductionMm)
  );

  return [createCutListRow('40x40', input.pedalTrayDepthMm, 2), createCutListRow('40x40', trayCrossBeamLengthMm, 3)];
}
