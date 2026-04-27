import type { PlannerPostureReport } from '../posture/posture-report';
import type {
  PlannerMonitorAspectRatio,
  PlannerMonitorCurvature,
  PlannerPosturePreset,
  PlannerPostureSettings,
} from '../types';
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
export type MonitorScreenEdgePoints = {
  left: [number, number, number];
  right: [number, number, number];
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

function getMonitorFovGeometryMm(
  settings: Pick<
    PlannerPostureSettings<PlannerPosturePreset>,
    'monitorAspectRatio' | 'monitorCurvature' | 'monitorSizeIn'
  >
) {
  const dimensions = getMonitorDimensionsMm(settings);
  const curvatureRadiusMm = getCurvatureRadiusMm(settings.monitorCurvature, dimensions.widthMm);

  if (!curvatureRadiusMm) {
    return {
      chordWidthMm: dimensions.widthMm,
      chordLineOffsetFromApexMm: 0,
    };
  }

  const halfChordMm = dimensions.widthMm / 2;
  const chordLineOffsetFromApexMm =
    curvatureRadiusMm - Math.sqrt(Math.max(0, curvatureRadiusMm * curvatureRadiusMm - halfChordMm * halfChordMm));

  return {
    chordWidthMm: dimensions.widthMm,
    chordLineOffsetFromApexMm,
  };
}

export function getMonitorTargetFovFromDistanceMm(
  distanceMm: number,
  settings: Pick<
    PlannerPostureSettings<PlannerPosturePreset>,
    'monitorAspectRatio' | 'monitorCurvature' | 'monitorSizeIn'
  >
) {
  const fovGeometry = getMonitorFovGeometryMm(settings);
  const safeDistanceMm = Math.max(1, distanceMm - fovGeometry.chordLineOffsetFromApexMm);

  return (2 * Math.atan(fovGeometry.chordWidthMm / 2 / safeDistanceMm) * 180) / Math.PI;
}

export function getSolvedMonitorDistanceFromEyesMm(
  settings: Pick<
    PlannerPostureSettings<PlannerPosturePreset>,
    'monitorAspectRatio' | 'monitorCurvature' | 'monitorSizeIn' | 'monitorTargetFovDeg'
  >
) {
  const fovGeometry = getMonitorFovGeometryMm(settings);
  const targetFovDeg = Math.max(1, Math.min(170, settings.monitorTargetFovDeg));
  const chordLineDistanceMm = fovGeometry.chordWidthMm / 2 / Math.tan((targetFovDeg * Math.PI) / 360);

  return chordLineDistanceMm + fovGeometry.chordLineOffsetFromApexMm;
}

export function getMonitorScreenEdgePoints(
  midpoint: [number, number, number],
  settings: Pick<
    PlannerPostureSettings<PlannerPosturePreset>,
    'monitorAspectRatio' | 'monitorCurvature' | 'monitorSizeIn'
  >
): MonitorScreenEdgePoints {
  const dimensions = getMonitorDimensionsMm(settings);
  const curvatureRadiusMm = getCurvatureRadiusMm(settings.monitorCurvature, dimensions.widthMm);
  const halfChordM = mm(dimensions.widthMm / 2);
  const chordLineOffsetM = curvatureRadiusMm
    ? mm(
        curvatureRadiusMm -
          Math.sqrt(Math.max(0, curvatureRadiusMm * curvatureRadiusMm - (dimensions.widthMm / 2) ** 2))
      )
    : 0;

  return {
    left: [midpoint[0] - chordLineOffsetM, midpoint[1] - halfChordM, midpoint[2]],
    right: [midpoint[0] - chordLineOffsetM, midpoint[1] + halfChordM, midpoint[2]],
  };
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
  const monitorDebug = report.monitorDebug;

  if (!monitorDebug) {
    return [];
  }

  const dimensions = getMonitorDimensionsMm(settings);
  const tiltRadians = (settings.monitorTiltDeg * Math.PI) / 180;
  const curvatureRadiusMm = getCurvatureRadiusMm(settings.monitorCurvature, dimensions.widthMm);

  if (curvatureRadiusMm) {
    const halfChordMm = dimensions.widthMm / 2;
    const maxThetaRadians = Math.asin(Math.min(1, halfChordMm / curvatureRadiusMm));
    const thetaStepRadians = (maxThetaRadians * 2) / MONITOR_CURVED_SEGMENT_COUNT;
    const getArcPoint = (thetaRadians: number) => ({
      xMm: -(curvatureRadiusMm - curvatureRadiusMm * Math.cos(thetaRadians)),
      yMm: -curvatureRadiusMm * Math.sin(thetaRadians),
    });

    return Array.from({ length: MONITOR_CURVED_SEGMENT_COUNT }, (_, index) => {
      const start = getArcPoint(-maxThetaRadians + thetaStepRadians * index);
      const end = getArcPoint(-maxThetaRadians + thetaStepRadians * (index + 1));
      const centerXMm = (start.xMm + end.xMm) / 2;
      const centerYMm = (start.yMm + end.yMm) / 2;
      const deltaXMm = end.xMm - start.xMm;
      const deltaYMm = end.yMm - start.yMm;
      const segmentWidthMm = Math.sqrt(deltaXMm * deltaXMm + deltaYMm * deltaYMm);
      const yawRadians = Math.atan2(-deltaXMm, deltaYMm);

      return createMonitorMeshSpec(
        `monitor-plate-${index.toString().padStart(2, '0')}`,
        [monitorDebug.position[0] + mm(centerXMm), monitorDebug.position[1] + mm(centerYMm), monitorDebug.position[2]],
        [mm(dimensions.thicknessMm), mm(segmentWidthMm), mm(dimensions.heightMm)],
        [0, -tiltRadians, yawRadians]
      );
    });
  }

  return [
    createMonitorMeshSpec(
      'monitor-plate',
      monitorDebug.position,
      [mm(dimensions.thicknessMm), mm(dimensions.widthMm), mm(dimensions.heightMm)],
      [0, -tiltRadians, 0]
    ),
  ];
}
