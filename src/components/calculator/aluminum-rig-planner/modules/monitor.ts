import type { PlannerPostureReport } from '../posture-report';
import type { PlannerMonitorAspectRatio, PlannerPosturePreset, PlannerPostureSettings } from '../types';
import { mm, type MeshSpec } from './shared';

const INCH_TO_MM = 25.4;
const MONITOR_PLATE_THICKNESS_MM = 3;
const MONITOR_COLOR = '#050505';
const MONITOR_CORNER_RADIUS_MM = 4;
const MONITOR_MATERIAL = {
  metalness: 0.02,
  roughness: 0.7,
} as const;

const ASPECT_RATIO_PARTS: Record<PlannerMonitorAspectRatio, readonly [number, number]> = {
  '16:10': [16, 10],
  '16:9': [16, 9],
  '21:9': [21, 9],
  '32:9': [32, 9],
  '4:3': [4, 3],
  '5:4': [5, 4],
  '3:2': [3, 2],
};

export type MonitorDimensionsMm = {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
};

export function getMonitorDimensionsMm(
  settings: Pick<PlannerPostureSettings<PlannerPosturePreset>, 'monitorAspectRatio' | 'monitorSizeIn'>
): MonitorDimensionsMm {
  const [widthRatio, heightRatio] = ASPECT_RATIO_PARTS[settings.monitorAspectRatio];
  const diagonalMm = settings.monitorSizeIn * INCH_TO_MM;
  const diagonalRatio = Math.sqrt(widthRatio * widthRatio + heightRatio * heightRatio);

  return {
    widthMm: (diagonalMm * widthRatio) / diagonalRatio,
    heightMm: (diagonalMm * heightRatio) / diagonalRatio,
    thicknessMm: MONITOR_PLATE_THICKNESS_MM,
  };
}

export function createMonitorModule(
  report: PlannerPostureReport,
  settings: PlannerPostureSettings<PlannerPosturePreset>
): MeshSpec[] {
  const dimensions = getMonitorDimensionsMm(settings);

  return [
    {
      id: 'monitor-plate',
      position: report.monitorDebug.position,
      size: [mm(dimensions.thicknessMm), mm(dimensions.heightMm), mm(dimensions.widthMm)],
      materialKind: 'plastic',
      color: MONITOR_COLOR,
      metalness: MONITOR_MATERIAL.metalness,
      roughness: MONITOR_MATERIAL.roughness,
      cornerRadius: mm(MONITOR_CORNER_RADIUS_MM),
      cornerSegments: 3,
    },
  ];
}
