import type { PlannerInput } from '../types';
import { PROFILE_COLOR, PROFILE_SHORT, BASE_BEAM_HEIGHT, mm, type MeshSpec } from './shared';

export function createPedalTrayModule(input: PlannerInput): MeshSpec[] {
  const trayTopY = BASE_BEAM_HEIGHT;
  const trayBeamCenterY = trayTopY - PROFILE_SHORT / 2;
  const traySideOffsetZ = 0.19;
  const trayInnerFaceOffsetZ = traySideOffsetZ - PROFILE_SHORT / 2;
  const trayRearCrossBeamCenterXMm = input.seatBaseDepthMm + input.pedalTrayDistanceMm + 20;
  const trayFrontCrossBeamCenterXMm = trayRearCrossBeamCenterXMm + input.pedalTrayDepthMm - 40;
  const trayMiddleCrossBeamCenterXMm = (trayRearCrossBeamCenterXMm + trayFrontCrossBeamCenterXMm) / 2;
  const traySideBeamCenterXMm = trayRearCrossBeamCenterXMm + (input.pedalTrayDepthMm - 40) / 2;
  const trayCrossBeamLength = trayInnerFaceOffsetZ * 2;
  const traySideBeamLength = mm(input.pedalTrayDepthMm);

  return [
    {
      id: 'pedal-tray-left',
      size: [traySideBeamLength, PROFILE_SHORT, PROFILE_SHORT] as [number, number, number],
      position: [mm(traySideBeamCenterXMm), trayBeamCenterY, -traySideOffsetZ] as [number, number, number],
      profileType: 'alu40x40',
      color: PROFILE_COLOR,
      metalness: 0.62,
      roughness: 0.3,
    },
    {
      id: 'pedal-tray-right',
      size: [traySideBeamLength, PROFILE_SHORT, PROFILE_SHORT] as [number, number, number],
      position: [mm(traySideBeamCenterXMm), trayBeamCenterY, traySideOffsetZ] as [number, number, number],
      profileType: 'alu40x40',
      color: PROFILE_COLOR,
      metalness: 0.62,
      roughness: 0.3,
    },
    {
      id: 'pedal-tray-front',
      size: [PROFILE_SHORT, PROFILE_SHORT, trayCrossBeamLength] as [number, number, number],
      position: [mm(trayFrontCrossBeamCenterXMm), trayBeamCenterY, 0] as [number, number, number],
      profileType: 'alu40x40',
      color: PROFILE_COLOR,
      metalness: 0.62,
      roughness: 0.3,
    },
    {
      id: 'pedal-tray-middle',
      size: [PROFILE_SHORT, PROFILE_SHORT, trayCrossBeamLength] as [number, number, number],
      position: [mm(trayMiddleCrossBeamCenterXMm), trayBeamCenterY, 0] as [number, number, number],
      profileType: 'alu40x40',
      color: PROFILE_COLOR,
      metalness: 0.62,
      roughness: 0.3,
    },
    {
      id: 'pedal-tray-rear',
      size: [PROFILE_SHORT, PROFILE_SHORT, trayCrossBeamLength] as [number, number, number],
      position: [mm(trayRearCrossBeamCenterXMm), trayBeamCenterY, 0] as [number, number, number],
      profileType: 'alu40x40',
      color: PROFILE_COLOR,
      metalness: 0.62,
      roughness: 0.3,
    },
  ];
}
