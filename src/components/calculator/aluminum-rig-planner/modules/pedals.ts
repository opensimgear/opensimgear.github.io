import { Vector3 } from 'three';

import { BASE_BEAM_HEIGHT_MM, PEDAL_TRAY_LAYOUT } from '../constants';
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
const PEDAL_HEIGHT_MM = 180;
const PEDAL_THICKNESS_MM = 8;
const PEDAL_PLATE_THICKNESS_MM = 3;
const PEDAL_CORNER_RADIUS_MM = 5;
const PEDAL_PLATE_CORNER_RADIUS_MM = 3;
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

function getPedalBottomYmm(input: PlannerInput) {
  return BASE_BEAM_HEIGHT_MM + PEDAL_PLATE_THICKNESS_MM + input.pedalsHeightMm;
}

function getPedalCentersZmm(input: PlannerInput) {
  const trayHalfWidthMm = getPedalTrayUsableWidthMm(input) / 2;
  const acceleratorCenterZmm = trayHalfWidthMm - input.pedalAcceleratorDeltaMm - PEDAL_WIDTH_MM / 2;
  const brakeCenterZmm = acceleratorCenterZmm - PEDAL_WIDTH_MM - input.pedalBrakeDeltaMm;
  const clutchCenterZmm = brakeCenterZmm - PEDAL_WIDTH_MM - input.pedalClutchDeltaMm;

  return [acceleratorCenterZmm, brakeCenterZmm, clutchCenterZmm] as const;
}

export function createPedalsModule(input: PlannerInput): MeshSpec[] {
  const pedalLeanRad = toRad(input.pedalAngleDeg - 90);
  const pedalDirection = new Vector3(-Math.sin(pedalLeanRad), Math.cos(pedalLeanRad), 0).normalize();
  const pedalPivotXmm = getPedalBottomXmm(input);
  const pedalPivotYmm = getPedalBottomYmm(input);
  const pedalCenterXmm = pedalPivotXmm + pedalDirection.x * (PEDAL_HEIGHT_MM / 2);
  const pedalCenterYmm = pedalPivotYmm + pedalDirection.y * (PEDAL_HEIGHT_MM / 2);
  const pedalCentersZmm = getPedalCentersZmm(input);
  const trayRearFaceXmm = input.seatBaseDepthMm + input.pedalTrayDistanceMm;

  const pedals = pedalCentersZmm.map((pedalCenterZmm, index) => ({
    id: `pedal-${PEDAL_IDS[index]}`,
    position: [mm(pedalCenterXmm), mm(pedalCenterYmm), mm(pedalCenterZmm)] as [number, number, number],
    size: [mm(PEDAL_THICKNESS_MM), mm(PEDAL_HEIGHT_MM), mm(PEDAL_WIDTH_MM)] as [number, number, number],
    rotation: [0, 0, pedalLeanRad] as [number, number, number],
    materialKind: 'plastic' as const,
    color: PEDAL_COLOR,
    metalness: PEDAL_PLASTIC_MATERIAL.metalness,
    roughness: PEDAL_PLASTIC_MATERIAL.roughness,
    cornerRadius: mm(PEDAL_CORNER_RADIUS_MM),
    cornerSegments: 4,
  }));

  const plateWidthMm = getPedalTrayUsableWidthMm(input);
  const plateCenterZmm = 0;
  const plateDepthMm = input.pedalTrayDepthMm;
  const plateCenterXmm = trayRearFaceXmm + input.pedalTrayDepthMm / 2;
  const plateCenterYmm = BASE_BEAM_HEIGHT_MM + PEDAL_PLATE_THICKNESS_MM / 2;

  return [
    {
      id: 'pedal-plate',
      position: [mm(plateCenterXmm), mm(plateCenterYmm), mm(plateCenterZmm)] as [number, number, number],
      size: [mm(plateDepthMm), mm(PEDAL_PLATE_THICKNESS_MM), mm(plateWidthMm)] as [number, number, number],
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
