import { Vector3 } from 'three';

import { PEDAL_TRAY_LAYOUT } from '../constants/planner';
import { BASE_BEAM_HEIGHT_MM } from '../constants/profile';
import type { PlannerInput } from '../types';
import { mm, type MeshSpec } from './shared';

const PEDAL_COLOR = '#151a20';
const PEDAL_PLATE_COLOR = '#404650';
const PEDAL_PLASTIC_MATERIAL = {
  metalness: 0.1,
  roughness: 0.74,
} as const;
const PEDAL_PLATE_MATERIAL = {
  metalness: 0.52,
  roughness: 0.4,
} as const;
const PEDAL_WIDTH_MM = 60;
const PEDAL_THICKNESS_MM = 8;
const PEDAL_PLATE_THICKNESS_MM = 3;
const PEDAL_CORNER_RADIUS_MM = 5;
const PEDAL_PLATE_CORNER_RADIUS_MM = 3;
const ACCELERATOR_PEDAL_LENGTH_RATIO = 3 / 4;
const FLOATING_PEDAL_START_RATIO = 1 / 2;
const PEDAL_IDS = ['accelerator', 'brake', 'clutch'] as const;

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function getPedalTrayUsableWidthMm(input: PlannerInput) {
  return Math.max(0, input.baseWidthMm - PEDAL_TRAY_LAYOUT.sideBeamInnerSpanReductionMm);
}

function getPedalBottomXmm(input: PlannerInput) {
  return input.seatBaseDepthMm + input.pedalTrayDistanceMm + input.pedalsDeltaMm;
}

function getPedalBottomZmm(input: PlannerInput) {
  return BASE_BEAM_HEIGHT_MM + PEDAL_PLATE_THICKNESS_MM + input.pedalsHeightMm;
}

function getPedalCentersYmm(input: PlannerInput) {
  const trayHalfWidthMm = getPedalTrayUsableWidthMm(input) / 2;
  const acceleratorCenterZmm = trayHalfWidthMm - input.pedalAcceleratorDeltaMm - PEDAL_WIDTH_MM / 2;
  const brakeCenterZmm = acceleratorCenterZmm - PEDAL_WIDTH_MM - input.pedalBrakeDeltaMm;
  const clutchCenterZmm = brakeCenterZmm - PEDAL_WIDTH_MM - input.pedalClutchDeltaMm;

  return [-acceleratorCenterZmm, -brakeCenterZmm, -clutchCenterZmm] as const;
}

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
      cornerSegments: 4,
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
      cornerSegments: 3,
    },
    ...pedals,
  ];
}
