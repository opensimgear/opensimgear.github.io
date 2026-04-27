/**
 * Pedals module – generates 3D mesh specs for the three pedals and the base plate.
 */

import { Vector3 } from 'three';

import { PEDAL_TRAY_LAYOUT } from '../constants/planner';
import { BASE_BEAM_HEIGHT_MM } from '../constants/profile';
import {
  ACCELERATOR_PEDAL_LENGTH_RATIO,
  FLOATING_PEDAL_START_RATIO,
  PEDAL_COLOR,
  PEDAL_CORNER_RADIUS_MM,
  PEDAL_CORNER_SEGMENTS,
  PEDAL_IDS,
  PEDAL_PLATE_COLOR,
  PEDAL_PLATE_CORNER_RADIUS_MM,
  PEDAL_PLATE_CORNER_SEGMENTS,
  PEDAL_PLATE_MATERIAL,
  PEDAL_PLATE_THICKNESS_MM,
  PEDAL_PLASTIC_MATERIAL,
  PEDAL_THICKNESS_MM,
  PEDAL_WIDTH_MM,
} from '../constants/pedals';
import type { PlannerInput } from '../types';
import { mm, toRad } from './math';
import type { MeshSpec } from './shared';

/** Compute the usable width of the pedal tray after subtracting side-beam spans. */
function getPedalTrayUsableWidthMm(input: PlannerInput) {
  return Math.max(0, input.baseWidthMm - PEDAL_TRAY_LAYOUT.sideBeamInnerSpanReductionMm);
}

/** Get the X position of the pedal contact point (bottom of pedal arc). */
function getPedalBottomXmm(input: PlannerInput) {
  return input.seatBaseDepthMm + input.pedalTrayDistanceMm + input.pedalsDeltaMm;
}

/** Get the Z position of the pedal contact point (top of the plate + pedal height). */
function getPedalBottomZmm(input: PlannerInput) {
  return BASE_BEAM_HEIGHT_MM + PEDAL_PLATE_THICKNESS_MM + input.pedalsHeightMm;
}

/** Compute Y center of each pedal from accelerator/brake/clutch deltas. */
function getPedalCentersYmm(input: PlannerInput) {
  const trayHalfWidthMm = getPedalTrayUsableWidthMm(input) / 2;
  const acceleratorCenterZmm = trayHalfWidthMm - input.pedalAcceleratorDeltaMm - PEDAL_WIDTH_MM / 2;
  const brakeCenterZmm = acceleratorCenterZmm - PEDAL_WIDTH_MM - input.pedalBrakeDeltaMm;
  const clutchCenterZmm = brakeCenterZmm - PEDAL_WIDTH_MM - input.pedalClutchDeltaMm;

  return [-acceleratorCenterZmm, -brakeCenterZmm, -clutchCenterZmm] as const;
}

/** Build mesh specs for all three pedals and the metal base plate. */
export function createPedalsModule(input: PlannerInput): MeshSpec[] {
  const pedalLeanRad = toRad(input.pedalAngleDeg - 90);
  const pedalDirection = new Vector3(-Math.sin(pedalLeanRad), 0, Math.cos(pedalLeanRad)).normalize();
  const pedalPivotXmm = getPedalBottomXmm(input);
  const pedalPivotZmm = getPedalBottomZmm(input);
  const pedalCentersYmm = getPedalCentersYmm(input);
  const trayRearFaceXmm = input.seatBaseDepthMm + input.pedalTrayDistanceMm;

  const pedals = pedalCentersYmm.map((pedalCenterYmm, index) => {
    const visibleStartMm =
      index === 0
        ? input.pedalLengthMm * (1 - ACCELERATOR_PEDAL_LENGTH_RATIO)
        : input.pedalLengthMm * FLOATING_PEDAL_START_RATIO;
    const visibleHeightMm = input.pedalLengthMm - visibleStartMm;
    const visibleCenterOffsetMm = visibleStartMm + visibleHeightMm / 2;
    const pedalCenterXmm = pedalPivotXmm + pedalDirection.x * visibleCenterOffsetMm;
    const pedalCenterZmm = pedalPivotZmm + pedalDirection.z * visibleCenterOffsetMm;

    return {
      id: `pedal-${PEDAL_IDS[index]}`,
      position: [mm(pedalCenterXmm), mm(pedalCenterYmm), mm(pedalCenterZmm)] as [number, number, number],
      size: [mm(PEDAL_THICKNESS_MM), mm(PEDAL_WIDTH_MM), mm(visibleHeightMm)] as [number, number, number],
      rotation: [0, -pedalLeanRad, 0] as [number, number, number],
      materialKind: 'plastic' as const,
      color: PEDAL_COLOR,
      metalness: PEDAL_PLASTIC_MATERIAL.metalness,
      roughness: PEDAL_PLASTIC_MATERIAL.roughness,
      cornerRadius: mm(PEDAL_CORNER_RADIUS_MM),
      cornerSegments: PEDAL_CORNER_SEGMENTS,
    };
  });

  const plateWidthMm = getPedalTrayUsableWidthMm(input);
  const plateCenterYmm = 0;
  const plateDepthMm = input.pedalTrayDepthMm;
  const plateCenterXmm = trayRearFaceXmm + input.pedalTrayDepthMm / 2;
  const plateCenterZmm = pedalPivotZmm - PEDAL_PLATE_THICKNESS_MM / 2;

  return [
    {
      id: 'pedal-plate',
      position: [mm(plateCenterXmm), mm(plateCenterYmm), mm(plateCenterZmm)] as [number, number, number],
      size: [mm(plateDepthMm), mm(plateWidthMm), mm(PEDAL_PLATE_THICKNESS_MM)] as [number, number, number],
      materialKind: 'metal',
      color: PEDAL_PLATE_COLOR,
      metalness: PEDAL_PLATE_MATERIAL.metalness,
      roughness: PEDAL_PLATE_MATERIAL.roughness,
      cornerRadius: mm(PEDAL_PLATE_CORNER_RADIUS_MM),
      cornerSegments: PEDAL_PLATE_CORNER_SEGMENTS,
    },
    ...pedals,
  ];
}
