/**
 * Monitor module – computes monitor dimensions, FOV geometry, and generates 3D mesh specs.
 */

import type { PlannerPostureReport } from '../posture/posture-report';
import type {
  PlannerMonitorCurvature,
  PlannerMonitorVesaType,
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
  MONITOR_TRIPLE_SCREEN_GAP_MM,
} from '../constants/monitor';
import { mm, toDeg, toRad } from './math';
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
export type TripleScreenSidePanel = {
  position: [number, number, number];
  yawRadians: number;
};
export type TripleScreenEdgePoints = {
  leftInner: [number, number, number];
  leftOuter: [number, number, number];
  rightInner: [number, number, number];
  rightOuter: [number, number, number];
};
export type TripleScreenCurveCenterPoints = {
  left: [number, number, number];
  right: [number, number, number];
};

const MONITOR_BOTTOM_VESA_HOLE_DISTANCE_RATIO = 0.2;
const MONITOR_VESA_HOLE_COLOR = '#2563eb';
const MONITOR_VESA_HOLE_RADIUS_MM = 6;
const MONITOR_VESA_HOLE_DEPTH_MM = 8;

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

export function getMonitorVesaDimensionsMm(vesaType: PlannerMonitorVesaType) {
  const [widthMm, heightMm] = vesaType.split('x').map(Number);

  return { widthMm, heightMm };
}

export function getDefaultMonitorBottomVesaHoleDistanceMm(
  settings: Pick<PlannerPostureSettings<PlannerPosturePreset>, 'monitorAspectRatio' | 'monitorSizeIn'>
) {
  return Math.round(getMonitorDimensionsMm(settings).heightMm * MONITOR_BOTTOM_VESA_HOLE_DISTANCE_RATIO);
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

/** Arc-center-at-eyes distance = curvature radius so the arc center sits at the eye point. */
export function getArcCenterDistanceMm(
  settings: Pick<
    PlannerPostureSettings<PlannerPosturePreset>,
    'monitorAspectRatio' | 'monitorCurvature' | 'monitorSizeIn'
  >
) {
  const dimensions = getMonitorDimensionsMm(settings);
  const curvatureRadiusMm = getCurvatureRadiusMm(settings.monitorCurvature, dimensions.widthMm);

  return curvatureRadiusMm;
}

/** Derive the FOV that results from placing the eyes at the arc center. */
export function getArcCenterFovDeg(
  settings: Pick<
    PlannerPostureSettings<PlannerPosturePreset>,
    'monitorAspectRatio' | 'monitorCurvature' | 'monitorSizeIn'
  >
) {
  const dimensions = getMonitorDimensionsMm(settings);
  const curvatureRadiusMm = getCurvatureRadiusMm(settings.monitorCurvature, dimensions.widthMm);

  if (!curvatureRadiusMm) {
    return null;
  }

  const halfChordMm = dimensions.widthMm / 2;
  const halfAngleRadians = Math.asin(Math.min(1, halfChordMm / curvatureRadiusMm));

  return toDeg(halfAngleRadians * 2);
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

/** Get the center point of the monitor curvature circle in 3D, when curved. */
export function getMonitorCurveCenterPoint(
  midpoint: [number, number, number],
  settings: Pick<
    PlannerPostureSettings<PlannerPosturePreset>,
    'monitorAspectRatio' | 'monitorCurvature' | 'monitorSizeIn'
  >
) {
  const dimensions = getMonitorDimensionsMm(settings);
  const curvatureRadiusMm = getCurvatureRadiusMm(settings.monitorCurvature, dimensions.widthMm);

  if (!curvatureRadiusMm) {
    return null;
  }

  return [midpoint[0] - mm(curvatureRadiusMm), midpoint[1], midpoint[2]] as [number, number, number];
}

/** Compute side screen yaw angle so the combined triple setup matches the target FOV. */
export function getTripleScreenSideYawRadians(
  settings: Pick<
    PlannerPostureSettings<PlannerPosturePreset>,
    'monitorAspectRatio' | 'monitorCurvature' | 'monitorSizeIn' | 'monitorTargetFovDeg'
  >
) {
  const dimensions = getMonitorDimensionsMm(settings);
  const distanceMm = getSolvedMonitorDistanceFromEyesMm(settings);
  const halfCenterWidthMm = dimensions.widthMm / 2;
  const sagittaMm = getMonitorSagittaMm(settings);
  const hingeDistanceFromCenterMm = halfCenterWidthMm + MONITOR_TRIPLE_SCREEN_GAP_MM;
  const adjacentMm = Math.max(1, distanceMm - sagittaMm);
  const diagonalMm = Math.hypot(adjacentMm, hingeDistanceFromCenterMm);
  const hingeAngleRadians = Math.atan2(hingeDistanceFromCenterMm, adjacentMm);
  const centerHalfAngleRadians = Math.asin(Math.min(1, halfCenterWidthMm / diagonalMm));

  return hingeAngleRadians + centerHalfAngleRadians;
}

/**
 * Compute the sagitta (depth of the arc) for the current curvature.
 * Returns 0 for flat monitors.
 */
function getMonitorSagittaMm(
  settings: Pick<
    PlannerPostureSettings<PlannerPosturePreset>,
    'monitorAspectRatio' | 'monitorCurvature' | 'monitorSizeIn'
  >
) {
  const dimensions = getMonitorDimensionsMm(settings);
  const curvatureRadiusMm = getCurvatureRadiusMm(settings.monitorCurvature, dimensions.widthMm);

  if (!curvatureRadiusMm) {
    return 0;
  }

  const halfChordMm = dimensions.widthMm / 2;

  return curvatureRadiusMm - Math.sqrt(Math.max(0, curvatureRadiusMm * curvatureRadiusMm - halfChordMm * halfChordMm));
}

/** Compute position and yaw for left/right side panels in a triple screen setup. */
export function getTripleScreenSidePanels(
  midpoint: [number, number, number],
  settings: Pick<
    PlannerPostureSettings<PlannerPosturePreset>,
    'monitorAspectRatio' | 'monitorCurvature' | 'monitorArcCenterAtEyes' | 'monitorSizeIn' | 'monitorTargetFovDeg'
  >
): { left: TripleScreenSidePanel; right: TripleScreenSidePanel } {
  const dimensions = getMonitorDimensionsMm(settings);
  const curvatureRadiusMm = getCurvatureRadiusMm(settings.monitorCurvature, dimensions.widthMm);
  const halfChordMm = dimensions.widthMm / 2;

  // Arc-center-at-eyes mode shares one arc centered at the eye point.
  if (curvatureRadiusMm && settings.monitorArcCenterAtEyes) {
    const halfAngleRad = Math.asin(Math.min(1, halfChordMm / curvatureRadiusMm));
    const gapAngleRad = 2 * Math.asin(Math.min(1, MONITOR_TRIPLE_SCREEN_GAP_MM / 2 / curvatureRadiusMm));
    const sideCenterAngleRad = halfAngleRad * 2 + gapAngleRad;

    // Side panel apex is on the arc at angular offset ±sideCenterAngleRad from center.
    // Arc center (eye point) is at distance curvatureRadiusMm behind the midpoint apex.
    // Point on arc at angle θ relative to midpoint: x = -(R - R*cos(θ)), y = R*sin(θ)
    const sideApexXMm = -(curvatureRadiusMm - curvatureRadiusMm * Math.cos(sideCenterAngleRad));
    const sideApexAbsYMm = curvatureRadiusMm * Math.sin(sideCenterAngleRad);

    return {
      left: {
        position: [midpoint[0] + mm(sideApexXMm), midpoint[1] - mm(sideApexAbsYMm), midpoint[2]],
        yawRadians: -sideCenterAngleRad,
      },
      right: {
        position: [midpoint[0] + mm(sideApexXMm), midpoint[1] + mm(sideApexAbsYMm), midpoint[2]],
        yawRadians: sideCenterAngleRad,
      },
    };
  }

  // Standard mode: hinge-based positioning.
  const sideYawRadians = getTripleScreenSideYawRadians(settings);
  const sagittaMm = getMonitorSagittaMm(settings);

  const hingeXMm = -sagittaMm;
  const hingeAbsYMm = halfChordMm + MONITOR_TRIPLE_SCREEN_GAP_MM;

  const innerLocalXMm = -sagittaMm;
  const innerLocalAbsYMm = halfChordMm;

  const cosYaw = Math.cos(sideYawRadians);
  const sinYaw = Math.sin(sideYawRadians);

  const rightInnerRotXMm = innerLocalXMm * cosYaw - -innerLocalAbsYMm * sinYaw;
  const rightInnerRotYMm = innerLocalXMm * sinYaw + -innerLocalAbsYMm * cosYaw;
  const rightOriginXMm = hingeXMm - rightInnerRotXMm;
  const rightOriginYMm = hingeAbsYMm - rightInnerRotYMm;

  const leftInnerRotXMm = innerLocalXMm * cosYaw - innerLocalAbsYMm * -sinYaw;
  const leftInnerRotYMm = innerLocalXMm * -sinYaw + innerLocalAbsYMm * cosYaw;
  const leftOriginXMm = hingeXMm - leftInnerRotXMm;
  const leftOriginYMm = -hingeAbsYMm - leftInnerRotYMm;

  return {
    left: {
      position: [midpoint[0] + mm(leftOriginXMm), midpoint[1] + mm(leftOriginYMm), midpoint[2]],
      yawRadians: -sideYawRadians,
    },
    right: {
      position: [midpoint[0] + mm(rightOriginXMm), midpoint[1] + mm(rightOriginYMm), midpoint[2]],
      yawRadians: sideYawRadians,
    },
  };
}

/** Get inner and outer screen edge points of the side panels for FOV overlay. */
export function getTripleScreenEdgePoints(
  midpoint: [number, number, number],
  settings: Pick<
    PlannerPostureSettings<PlannerPosturePreset>,
    'monitorAspectRatio' | 'monitorCurvature' | 'monitorArcCenterAtEyes' | 'monitorSizeIn' | 'monitorTargetFovDeg'
  >
): TripleScreenEdgePoints {
  const dimensions = getMonitorDimensionsMm(settings);
  const halfChordMm = dimensions.widthMm / 2;
  const sidePanels = getTripleScreenSidePanels(midpoint, settings);
  const sagittaMm = getMonitorSagittaMm(settings);
  const edgeLocalXMm = -sagittaMm;

  const rightYaw = sidePanels.right.yawRadians;
  const rightCos = Math.cos(rightYaw);
  const rightSin = Math.sin(rightYaw);
  // Right panel: inner = local (-sagitta, -halfChord), outer = local (-sagitta, +halfChord)
  const rightInnerX = sidePanels.right.position[0] + mm(edgeLocalXMm * rightCos - -halfChordMm * rightSin);
  const rightInnerY = sidePanels.right.position[1] + mm(edgeLocalXMm * rightSin + -halfChordMm * rightCos);
  const rightOuterX = sidePanels.right.position[0] + mm(edgeLocalXMm * rightCos - halfChordMm * rightSin);
  const rightOuterY = sidePanels.right.position[1] + mm(edgeLocalXMm * rightSin + halfChordMm * rightCos);

  const leftYaw = sidePanels.left.yawRadians;
  const leftCos = Math.cos(leftYaw);
  const leftSin = Math.sin(leftYaw);
  // Left panel: inner = local (-sagitta, +halfChord), outer = local (-sagitta, -halfChord)
  const leftInnerX = sidePanels.left.position[0] + mm(edgeLocalXMm * leftCos - halfChordMm * leftSin);
  const leftInnerY = sidePanels.left.position[1] + mm(edgeLocalXMm * leftSin + halfChordMm * leftCos);
  const leftOuterX = sidePanels.left.position[0] + mm(edgeLocalXMm * leftCos - -halfChordMm * leftSin);
  const leftOuterY = sidePanels.left.position[1] + mm(edgeLocalXMm * leftSin + -halfChordMm * leftCos);

  return {
    leftInner: [leftInnerX, leftInnerY, midpoint[2]],
    leftOuter: [leftOuterX, leftOuterY, midpoint[2]],
    rightInner: [rightInnerX, rightInnerY, midpoint[2]],
    rightOuter: [rightOuterX, rightOuterY, midpoint[2]],
  };
}

/** Get curvature circle center points for left/right side monitors, when curved. */
export function getTripleScreenCurveCenterPoints(
  midpoint: [number, number, number],
  settings: Pick<
    PlannerPostureSettings<PlannerPosturePreset>,
    'monitorAspectRatio' | 'monitorCurvature' | 'monitorArcCenterAtEyes' | 'monitorSizeIn' | 'monitorTargetFovDeg'
  >
): TripleScreenCurveCenterPoints | null {
  const dimensions = getMonitorDimensionsMm(settings);
  const curvatureRadiusMm = getCurvatureRadiusMm(settings.monitorCurvature, dimensions.widthMm);

  if (!curvatureRadiusMm) {
    return null;
  }

  const sidePanels = getTripleScreenSidePanels(midpoint, settings);
  const leftCos = Math.cos(sidePanels.left.yawRadians);
  const leftSin = Math.sin(sidePanels.left.yawRadians);
  const rightCos = Math.cos(sidePanels.right.yawRadians);
  const rightSin = Math.sin(sidePanels.right.yawRadians);

  return {
    left: [
      sidePanels.left.position[0] - mm(curvatureRadiusMm * leftCos),
      sidePanels.left.position[1] - mm(curvatureRadiusMm * leftSin),
      midpoint[2],
    ],
    right: [
      sidePanels.right.position[0] - mm(curvatureRadiusMm * rightCos),
      sidePanels.right.position[1] - mm(curvatureRadiusMm * rightSin),
      midpoint[2],
    ],
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

/**
 * Generate monitor panel meshes for a single screen at a given origin/yaw.
 * Handles both flat (single plate) and curved (arc segments) modes.
 */
function createMonitorPanelMeshes(
  idPrefix: string,
  origin: [number, number, number],
  baseYawRadians: number,
  settings: PlannerPostureSettings<PlannerPosturePreset>
): MeshSpec[] {
  const dimensions = getMonitorDimensionsMm(settings);
  const tiltRadians = toRad(settings.monitorTiltDeg);
  const curvatureRadiusMm = getCurvatureRadiusMm(settings.monitorCurvature, dimensions.widthMm);
  const cosYaw = Math.cos(baseYawRadians);
  const sinYaw = Math.sin(baseYawRadians);

  /** Rotate a local (xMm, yMm) offset by baseYawRadians and add to origin in meters. */
  function toWorld(localXMm: number, localYMm: number): [number, number, number] {
    return [
      origin[0] + mm(localXMm * cosYaw - localYMm * sinYaw),
      origin[1] + mm(localXMm * sinYaw + localYMm * cosYaw),
      origin[2],
    ];
  }

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
      const localYawRadians = Math.atan2(-deltaXMm, deltaYMm);

      return createMonitorMeshSpec(
        `${idPrefix}-${index.toString().padStart(2, '0')}`,
        toWorld(centerXMm, centerYMm),
        [mm(dimensions.thicknessMm), mm(segmentWidthMm), mm(dimensions.heightMm)],
        [0, -tiltRadians, baseYawRadians + localYawRadians]
      );
    });
  }

  return [
    createMonitorMeshSpec(
      idPrefix,
      origin,
      [mm(dimensions.thicknessMm), mm(dimensions.widthMm), mm(dimensions.heightMm)],
      [0, -tiltRadians, baseYawRadians]
    ),
  ];
}

function getMonitorLocalPointMm(origin: [number, number, number], yawRadians: number, localXMm: number, localYMm = 0) {
  const cosYaw = Math.cos(yawRadians);
  const sinYaw = Math.sin(yawRadians);

  return {
    xMm: origin[0] / 0.001 + localXMm * cosYaw - localYMm * sinYaw,
    yMm: origin[1] / 0.001 + localXMm * sinYaw + localYMm * cosYaw,
  };
}

function createMonitorVesaHoleMeshes(
  idPrefix: string,
  origin: [number, number, number],
  yawRadians: number,
  settings: PlannerPostureSettings<PlannerPosturePreset>
): MeshSpec[] {
  const dimensions = getMonitorDimensionsMm(settings);
  const vesaDimensions = getMonitorVesaDimensionsMm(settings.monitorVesaType);
  const monitorBottomHeightMm = origin[2] / 0.001 - dimensions.heightMm / 2;
  const bottomVesaHoleHeightMm = monitorBottomHeightMm + settings.monitorBottomVesaHoleDistanceMm;
  const topVesaHoleHeightMm = bottomVesaHoleHeightMm + vesaDimensions.heightMm;
  const localXMm = dimensions.thicknessMm / 2 + MONITOR_VESA_HOLE_DEPTH_MM / 2;
  const yPositions = [-vesaDimensions.widthMm / 2, vesaDimensions.widthMm / 2];
  const zPositions = [bottomVesaHoleHeightMm, topVesaHoleHeightMm];

  return yPositions.flatMap((yMm) =>
    zPositions.map((zMm) => {
      const position = getMonitorLocalPointMm(origin, yawRadians, localXMm, yMm);

      return {
        id: `${idPrefix}-vesa-hole-${yMm}-${zMm}`,
        shape: 'cylinder' as const,
        size: [
          mm(MONITOR_VESA_HOLE_DEPTH_MM),
          mm(MONITOR_VESA_HOLE_RADIUS_MM * 2),
          mm(MONITOR_VESA_HOLE_RADIUS_MM * 2),
        ] as [number, number, number],
        position: [mm(position.xMm), mm(position.yMm), mm(zMm)] as [number, number, number],
        rotation: [0, 0, yawRadians + Math.PI / 2] as [number, number, number],
        cylinderRadiusTop: mm(MONITOR_VESA_HOLE_RADIUS_MM),
        cylinderRadiusBottom: mm(MONITOR_VESA_HOLE_RADIUS_MM),
        cylinderRadialSegments: 20,
        materialKind: 'metal' as const,
        color: MONITOR_VESA_HOLE_COLOR,
        metalness: MONITOR_MATERIAL.metalness,
        roughness: MONITOR_MATERIAL.roughness,
      };
    })
  );
}

/** Build center monitor mesh specs – flat or curved arc segments depending on curvature. */
function createCenterMonitorModule(
  report: PlannerPostureReport,
  settings: PlannerPostureSettings<PlannerPosturePreset>
): MeshSpec[] {
  if (!report.monitorDebug) {
    return [];
  }

  return [
    ...createMonitorPanelMeshes('monitor-plate', report.monitorDebug.position, 0, settings),
    ...createMonitorVesaHoleMeshes('monitor-plate', report.monitorDebug.position, 0, settings),
  ];
}

/** Build side monitor mesh specs for a triple screen setup. */
function createTripleScreenSideMeshes(
  monitorDebug: { position: [number, number, number] },
  settings: PlannerPostureSettings<PlannerPosturePreset>
): MeshSpec[] {
  const sidePanels = getTripleScreenSidePanels(monitorDebug.position, settings);

  return [
    ...createMonitorPanelMeshes('monitor-plate-left', sidePanels.left.position, sidePanels.left.yawRadians, settings),
    ...createMonitorVesaHoleMeshes('monitor-plate-left', sidePanels.left.position, sidePanels.left.yawRadians, settings),
    ...createMonitorPanelMeshes(
      'monitor-plate-right',
      sidePanels.right.position,
      sidePanels.right.yawRadians,
      settings
    ),
    ...createMonitorVesaHoleMeshes(
      'monitor-plate-right',
      sidePanels.right.position,
      sidePanels.right.yawRadians,
      settings
    ),
  ];
}

/** Build all monitor mesh specs including side screens if triple screen is enabled. */
export function createMonitorModule(
  report: PlannerPostureReport,
  settings: PlannerPostureSettings<PlannerPosturePreset>
): MeshSpec[] {
  const monitorDebug = report.monitorDebug;

  if (!monitorDebug) {
    return [];
  }

  const centerMeshes = createCenterMonitorModule(report, settings);

  if (!settings.monitorTripleScreen) {
    return centerMeshes;
  }

  return [...centerMeshes, ...createTripleScreenSideMeshes(monitorDebug, settings)];
}
