/**
 * Monitor module – computes monitor dimensions, FOV geometry, and generates 3D mesh specs.
 */

import type { PlannerPostureReport } from '../posture/posture-report';
import type {
  PlannerMonitorAspectRatio,
  PlannerMonitorCurvature,
  PlannerPosturePreset,
  PlannerPostureSettings,
} from '../types';
import {
  ASPECT_RATIO_PARTS,
  CURVATURE_RADIUS_MM,
  INCH_TO_MM,
  MONITOR_COLOR,
  MONITOR_CORNER_RADIUS_MM,
  MONITOR_CORNER_SEGMENTS,
  MONITOR_CURVED_SEGMENT_COUNT,
  MONITOR_FOV_MAX_DEG,
  MONITOR_FOV_MIN_DEG,
  MONITOR_MATERIAL,
  MONITOR_PLATE_THICKNESS_MM,
} from '../constants/monitor';
import { mm, toRad } from './math';
import type { MeshSpec } from './shared';

export type MonitorDimensionsMm = {
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
};
export type MonitorScreenEdgePoints = {
  left: [number, number, number];
  right: [number, number, number];
};

/** Compute monitor width/height/thickness from screen size and aspect ratio. */
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

/** Resolve the curvature radius in mm, clamped so the arc fits the monitor width. */
function getCurvatureRadiusMm(curvature: PlannerMonitorCurvature, widthMm: number) {
  if (curvature === 'disabled') {
    return null;
  }

  return Math.max(CURVATURE_RADIUS_MM[curvature], widthMm / 2 + MONITOR_PLATE_THICKNESS_MM);
}

/** Compute the chord geometry needed for FOV calculations. */
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

/** Derive the horizontal FOV (degrees) for a given eye-to-monitor distance. */
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

/** Solve for the eye-to-monitor distance that yields the target FOV. */
export function getSolvedMonitorDistanceFromEyesMm(
  settings: Pick<
    PlannerPostureSettings<PlannerPosturePreset>,
    'monitorAspectRatio' | 'monitorCurvature' | 'monitorSizeIn' | 'monitorTargetFovDeg'
  >
) {
  const fovGeometry = getMonitorFovGeometryMm(settings);
  const targetFovDeg = Math.max(MONITOR_FOV_MIN_DEG, Math.min(MONITOR_FOV_MAX_DEG, settings.monitorTargetFovDeg));
  const chordLineDistanceMm = fovGeometry.chordWidthMm / 2 / Math.tan(toRad(targetFovDeg / 2));

  return chordLineDistanceMm + fovGeometry.chordLineOffsetFromApexMm;
}

/** Get the left/right screen-edge points in 3D, accounting for curvature. */
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

/** Create a single monitor panel mesh spec with standard material. */
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
    cornerSegments: MONITOR_CORNER_SEGMENTS,
  };
}

/** Build monitor mesh specs – flat or curved arc segments depending on curvature. */
export function createMonitorModule(
  report: PlannerPostureReport,
  settings: PlannerPostureSettings<PlannerPosturePreset>
): MeshSpec[] {
  const monitorDebug = report.monitorDebug;

  if (!monitorDebug) {
    return [];
  }

  const dimensions = getMonitorDimensionsMm(settings);
  const tiltRadians = toRad(settings.monitorTiltDeg);
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
