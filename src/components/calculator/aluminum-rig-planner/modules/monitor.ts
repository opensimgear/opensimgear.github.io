import type { PlannerPostureReport } from '../posture-report';
import type {
  PlannerMonitorAspectRatio,
  PlannerMonitorCurvature,
  PlannerPosturePreset,
  PlannerPostureSettings,
} from '../types';
import { CURVED_MONITOR_RECOMMENDED_FOV_DEG } from '../constants';
import { mm, type MeshSpec } from './shared';

const INCH_TO_MM = 25.4;
const MONITOR_PLATE_THICKNESS_MM = 3;
const MONITOR_COLOR = '#050505';
const MONITOR_CORNER_RADIUS_MM = 4;
const MONITOR_CURVED_SEGMENT_COUNT = 25;
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
const CURVATURE_RADIUS_MM: Record<Exclude<PlannerMonitorCurvature, 'disabled'>, number> = {
  '5000r': 5000,
  '4000r': 4000,
  '3000r': 3000,
  '2500r': 2500,
  '2300r': 2300,
  '1800r': 1800,
  '1500r': 1500,
  '1000r': 1000,
  '800r': 800,
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

function getCurvatureRadiusMm(curvature: PlannerMonitorCurvature, widthMm: number) {
  if (curvature === 'disabled') {
    return null;
  }

  return Math.max(CURVATURE_RADIUS_MM[curvature], widthMm / 2 + MONITOR_PLATE_THICKNESS_MM);
}

export function getMonitorTargetFovFromDistanceMm(
  distanceMm: number,
  settings: Pick<PlannerPostureSettings<PlannerPosturePreset>, 'monitorAspectRatio' | 'monitorSizeIn'>
) {
  const dimensions = getMonitorDimensionsMm(settings);
  const safeDistanceMm = Math.max(1, distanceMm);

  return (2 * Math.atan(dimensions.widthMm / 2 / safeDistanceMm) * 180) / Math.PI;
}

export function getSolvedMonitorDistanceFromEyesMm(
  settings: Pick<
    PlannerPostureSettings<PlannerPosturePreset>,
    'monitorAspectRatio' | 'monitorCurvature' | 'monitorSizeIn' | 'monitorTargetFovDeg'
  >
) {
  const dimensions = getMonitorDimensionsMm(settings);
  const curvatureRadiusMm = getCurvatureRadiusMm(settings.monitorCurvature, dimensions.widthMm);

  if (curvatureRadiusMm) {
    const recommendedFovDistanceMm =
      dimensions.widthMm / 2 / Math.tan((CURVED_MONITOR_RECOMMENDED_FOV_DEG * Math.PI) / 360);

    return Math.min(curvatureRadiusMm, recommendedFovDistanceMm);
  }

  const targetFovDeg = Math.max(1, Math.min(170, settings.monitorTargetFovDeg));

  return dimensions.widthMm / 2 / Math.tan((targetFovDeg * Math.PI) / 360);
}

function createMonitorMeshSpec(
  id: string,
  position: [number, number, number],
  size: [number, number, number],
  rotation: [number, number, number]
): MeshSpec {
  return {
    id,
    position,
    size,
    rotation,
    materialKind: 'plastic',
    color: MONITOR_COLOR,
    metalness: MONITOR_MATERIAL.metalness,
    roughness: MONITOR_MATERIAL.roughness,
    cornerRadius: mm(MONITOR_CORNER_RADIUS_MM),
    cornerSegments: 3,
  };
}

export function createMonitorModule(
  report: PlannerPostureReport,
  settings: PlannerPostureSettings<PlannerPosturePreset>
): MeshSpec[] {
  const dimensions = getMonitorDimensionsMm(settings);
  const tiltRadians = (settings.monitorTiltDeg * Math.PI) / 180;
  const curvatureRadiusMm = getCurvatureRadiusMm(settings.monitorCurvature, dimensions.widthMm);

  if (curvatureRadiusMm) {
    const halfChordMm = dimensions.widthMm / 2;
    const maxThetaRadians = Math.asin(Math.min(1, halfChordMm / curvatureRadiusMm));
    const thetaStepRadians = (maxThetaRadians * 2) / MONITOR_CURVED_SEGMENT_COUNT;
    const getArcPoint = (thetaRadians: number) => ({
      xMm: -(curvatureRadiusMm - curvatureRadiusMm * Math.cos(thetaRadians)),
      zMm: curvatureRadiusMm * Math.sin(thetaRadians),
    });

    return Array.from({ length: MONITOR_CURVED_SEGMENT_COUNT }, (_, index) => {
      const start = getArcPoint(-maxThetaRadians + thetaStepRadians * index);
      const end = getArcPoint(-maxThetaRadians + thetaStepRadians * (index + 1));
      const centerXMm = (start.xMm + end.xMm) / 2;
      const centerZMm = (start.zMm + end.zMm) / 2;
      const deltaXMm = end.xMm - start.xMm;
      const deltaZMm = end.zMm - start.zMm;
      const segmentWidthMm = Math.sqrt(deltaXMm * deltaXMm + deltaZMm * deltaZMm);
      const yawRadians = Math.atan2(deltaXMm, deltaZMm);

      return createMonitorMeshSpec(
        `monitor-plate-${index.toString().padStart(2, '0')}`,
        [
          report.monitorDebug.position[0] + mm(centerXMm),
          report.monitorDebug.position[1],
          report.monitorDebug.position[2] + mm(centerZMm),
        ],
        [mm(dimensions.thicknessMm), mm(dimensions.heightMm), mm(segmentWidthMm)],
        [0, yawRadians, tiltRadians]
      );
    });
  }

  return [
    createMonitorMeshSpec(
      'monitor-plate',
      report.monitorDebug.position,
      [mm(dimensions.thicknessMm), mm(dimensions.heightMm), mm(dimensions.widthMm)],
      [0, 0, tiltRadians]
    ),
  ];
}
