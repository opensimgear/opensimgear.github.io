import { describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_POSTURE_SETTINGS } from '~/components/calculator/aluminum-rig-planner/constants/posture';
import {
  createMonitorModule,
  getMonitorDimensionsMm,
  getMonitorScreenEdgePoints,
  getMonitorTargetFovFromDistanceMm,
  getSolvedMonitorDistanceFromEyesMm,
} from '~/components/calculator/aluminum-rig-planner/modules/monitor';
import type { PlannerPostureReport } from '~/components/calculator/aluminum-rig-planner/posture/posture-report';

describe('aluminum rig planner monitor module', () => {
  it('computes monitor plate dimensions from diagonal size and aspect ratio', () => {
    const dimensions = getMonitorDimensionsMm({
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorSizeIn: 32,
      monitorAspectRatio: '16:10',
    });

    expect(dimensions.widthMm).toBeCloseTo(689.3, 1);
    expect(dimensions.heightMm).toBeCloseTo(430.8, 1);
  });

  it('draws a flat tilted monitor as one plate', () => {
    const report = {
      monitorDebug: {
        position: [1, 0, 0.8] as [number, number, number],
      },
    } as PlannerPostureReport;
    const meshes = createMonitorModule(report, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: 'disabled',
      monitorTiltDeg: 10,
    });

    expect(meshes).toHaveLength(1);
    expect(meshes[0].id).toBe('monitor-plate');
    expect(meshes[0].rotation?.[1]).toBeCloseTo((-10 * Math.PI) / 180, 6);
  });

  it('approximates curved monitor panels with consumer radius segments', () => {
    const report = {
      monitorDebug: {
        position: [1, 0, 0.8] as [number, number, number],
      },
    } as PlannerPostureReport;
    const meshes = createMonitorModule(report, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: '1000r',
      monitorTiltDeg: -5,
    });
    const monitorDebug = report.monitorDebug!;
    const centerMesh = meshes[Math.floor(meshes.length / 2)];
    const leftEdge = meshes[0];
    const rightEdge = meshes.at(-1);

    expect(meshes).toHaveLength(25);
    expect(centerMesh.position[0]).toBeCloseTo(monitorDebug.position[0], 3);
    expect(centerMesh.position[1]).toBeCloseTo(monitorDebug.position[1], 6);
    expect(centerMesh.position[2]).toBe(monitorDebug.position[2]);
    expect(leftEdge.position[0]).toBeLessThan(centerMesh.position[0]);
    expect(rightEdge?.position[0]).toBeLessThan(centerMesh.position[0]);
    expect(leftEdge.rotation?.[2]).toBeLessThan(0);
    expect(rightEdge?.rotation?.[2]).toBeGreaterThan(0);
    expect(centerMesh.rotation?.[1]).toBeCloseTo((5 * Math.PI) / 180, 6);
  });

  it('keeps curved monitor segment edges contiguous', () => {
    const report = {
      monitorDebug: {
        position: [1, 0, 0.8] as [number, number, number],
      },
    } as PlannerPostureReport;
    const meshes = createMonitorModule(report, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: '1000r',
    });

    for (let index = 0; index < meshes.length - 1; index += 1) {
      const current = meshes[index];
      const next = meshes[index + 1];
      const currentHalfWidthM = current.size[1] / 2;
      const nextHalfWidthM = next.size[1] / 2;
      const currentYaw = current.rotation?.[2] ?? 0;
      const nextYaw = next.rotation?.[2] ?? 0;
      const currentEnd = [
        current.position[0] - Math.sin(currentYaw) * currentHalfWidthM,
        current.position[1] + Math.cos(currentYaw) * currentHalfWidthM,
      ];
      const nextStart = [
        next.position[0] + Math.sin(nextYaw) * nextHalfWidthM,
        next.position[1] - Math.cos(nextYaw) * nextHalfWidthM,
      ];

      expect(currentEnd[0]).toBeCloseTo(nextStart[0], 6);
      expect(currentEnd[1]).toBeCloseTo(nextStart[1], 6);
    }
  });

  it('returns no monitor meshes without monitor debug', () => {
    expect(createMonitorModule({ metrics: [], hints: [] }, DEFAULT_PLANNER_POSTURE_SETTINGS)).toEqual([]);
  });

  it('solves curved monitor apex distance from target horizontal FOV against the chord line', () => {
    const settings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: '1800r' as const,
      monitorTargetFovDeg: 60,
    };
    const dimensions = getMonitorDimensionsMm(settings);
    const halfChordMm = dimensions.widthMm / 2;
    const sagittaMm = 1800 - Math.sqrt(1800 * 1800 - halfChordMm * halfChordMm);
    const expectedDistanceMm = halfChordMm / Math.tan((settings.monitorTargetFovDeg * Math.PI) / 360) + sagittaMm;

    expect(getSolvedMonitorDistanceFromEyesMm(settings)).toBeCloseTo(expectedDistanceMm, 6);
  });

  it('returns flat monitor screen edge points across the chord width', () => {
    const midpoint: [number, number, number] = [1, 0, 0.8];
    const settings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: 'disabled' as const,
    };
    const dimensions = getMonitorDimensionsMm(settings);
    const edges = getMonitorScreenEdgePoints(midpoint, settings);

    expect(edges.left).toEqual([midpoint[0], midpoint[1] - (dimensions.widthMm / 2) * 0.001, midpoint[2]]);
    expect(edges.right).toEqual([midpoint[0], midpoint[1] + (dimensions.widthMm / 2) * 0.001, midpoint[2]]);
  });

  it('moves curved monitor screen edge points back to the chord line', () => {
    const midpoint: [number, number, number] = [1, 0, 0.8];
    const settings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: '1000r' as const,
    };
    const dimensions = getMonitorDimensionsMm(settings);
    const halfChordMm = dimensions.widthMm / 2;
    const sagittaMm = 1000 - Math.sqrt(1000 * 1000 - halfChordMm * halfChordMm);
    const edges = getMonitorScreenEdgePoints(midpoint, settings);

    expect(edges.left[0]).toBeCloseTo(midpoint[0] - sagittaMm * 0.001, 6);
    expect(edges.left[1]).toBeCloseTo(midpoint[1] - halfChordMm * 0.001, 6);
    expect(edges.right[0]).toBeCloseTo(midpoint[0] - sagittaMm * 0.001, 6);
    expect(edges.right[1]).toBeCloseTo(midpoint[1] + halfChordMm * 0.001, 6);
  });

  it('returns curved monitor curve center point one radius behind the apex midpoint', async () => {
    const monitorModule = (await import('~/components/calculator/aluminum-rig-planner/modules/monitor')) as Record<
      string,
      unknown
    >;
    const getMonitorCurveCenterPoint = monitorModule.getMonitorCurveCenterPoint as (
      midpoint: [number, number, number],
      settings: typeof DEFAULT_PLANNER_POSTURE_SETTINGS
    ) => [number, number, number] | null;
    const midpoint: [number, number, number] = [1, 0, 0.8];
    const curveCenter = getMonitorCurveCenterPoint(midpoint, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: '1000r' as const,
    });

    expect(curveCenter).toEqual([0, 0, 0.8]);
  });

  it('converts flat monitor distance back into matching horizontal FOV', () => {
    const settings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: 'disabled' as const,
      monitorTargetFovDeg: 60,
    };
    const distanceMm = getSolvedMonitorDistanceFromEyesMm(settings);
    const targetFovDeg = getMonitorTargetFovFromDistanceMm(distanceMm, settings);

    expect(targetFovDeg).toBeCloseTo(settings.monitorTargetFovDeg, 6);
  });

  it('gives a curved monitor a higher FOV than a flat monitor at the same apex distance', () => {
    const flatSettings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: 'disabled' as const,
    };
    const curvedSettings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: '5000r' as const,
    };
    const distanceMm = 600;

    expect(getMonitorTargetFovFromDistanceMm(distanceMm, curvedSettings)).toBeGreaterThan(
      getMonitorTargetFovFromDistanceMm(distanceMm, flatSettings)
    );
  });

  it('returns symmetric triple-screen inner and outer edge points in hinge mode', async () => {
    const monitorModule = (await import('~/components/calculator/aluminum-rig-planner/modules/monitor')) as Record<
      string,
      unknown
    >;
    const getTripleScreenEdgePoints = monitorModule.getTripleScreenEdgePoints as (
      midpoint: [number, number, number],
      settings: typeof DEFAULT_PLANNER_POSTURE_SETTINGS
    ) => {
      leftInner: [number, number, number];
      leftOuter: [number, number, number];
      rightInner: [number, number, number];
      rightOuter: [number, number, number];
    };
    const midpoint: [number, number, number] = [1, 0, 0.8];
    const edges = getTripleScreenEdgePoints(midpoint, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
    });
    const centerEdges = getMonitorScreenEdgePoints(midpoint, DEFAULT_PLANNER_POSTURE_SETTINGS);
    const leftGapM = Math.hypot(edges.leftInner[0] - centerEdges.left[0], edges.leftInner[1] - centerEdges.left[1]);
    const rightGapM = Math.hypot(
      edges.rightInner[0] - centerEdges.right[0],
      edges.rightInner[1] - centerEdges.right[1]
    );

    expect(edges.leftInner[0]).toBeCloseTo(edges.rightInner[0], 6);
    expect(edges.leftOuter[0]).toBeCloseTo(edges.rightOuter[0], 6);
    expect(edges.leftInner[1]).toBeCloseTo(-edges.rightInner[1], 6);
    expect(edges.leftOuter[1]).toBeCloseTo(-edges.rightOuter[1], 6);
    expect(edges.leftOuter[1]).toBeLessThan(edges.leftInner[1]);
    expect(edges.rightOuter[1]).toBeGreaterThan(edges.rightInner[1]);
    expect(leftGapM).toBeCloseTo(0.003, 6);
    expect(rightGapM).toBeCloseTo(0.003, 6);
  });

  it.each([
    ['flat', 'disabled' as const],
    ['curved', '1000r' as const],
  ])('aims %s hinged side monitor normals at the eye point', async (_label, monitorCurvature) => {
    const monitorModule = (await import('~/components/calculator/aluminum-rig-planner/modules/monitor')) as Record<
      string,
      unknown
    >;
    const getTripleScreenSidePanels = monitorModule.getTripleScreenSidePanels as (
      midpoint: [number, number, number],
      settings: typeof DEFAULT_PLANNER_POSTURE_SETTINGS
    ) => {
      left: { position: [number, number, number]; yawRadians: number };
      right: { position: [number, number, number]; yawRadians: number };
    };
    const getSolvedMonitorDistanceFromEyesMm = monitorModule.getSolvedMonitorDistanceFromEyesMm as (
      settings: typeof DEFAULT_PLANNER_POSTURE_SETTINGS
    ) => number;
    const midpoint: [number, number, number] = [1, 0, 0.8];
    const settings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorArcCenterAtEyes: false,
      monitorCurvature,
      monitorTargetFovDeg: 60,
    };
    const sidePanels = getTripleScreenSidePanels(midpoint, settings);
    const distanceMm = getSolvedMonitorDistanceFromEyesMm(settings);
    const eyePoint: [number, number, number] = [midpoint[0] - distanceMm * 0.001, midpoint[1], midpoint[2]];
    const assertNormalPassesThroughEye = (panel: { position: [number, number, number]; yawRadians: number }) => {
      const panelToEye = [eyePoint[0] - panel.position[0], eyePoint[1] - panel.position[1]];
      const normal = [-Math.cos(panel.yawRadians), -Math.sin(panel.yawRadians)];
      const cross = panelToEye[0] * normal[1] - panelToEye[1] * normal[0];

      expect(cross).toBeCloseTo(0, 6);
    };

    assertNormalPassesThroughEye(sidePanels.left);
    assertNormalPassesThroughEye(sidePanels.right);
  });

  it('keeps measured curved triples on separate hinge-based panel arcs', async () => {
    const monitorModule = (await import('~/components/calculator/aluminum-rig-planner/modules/monitor')) as Record<
      string,
      unknown
    >;
    const getMonitorCurveCenterPoint = monitorModule.getMonitorCurveCenterPoint as (
      midpoint: [number, number, number],
      settings: typeof DEFAULT_PLANNER_POSTURE_SETTINGS
    ) => [number, number, number] | null;
    const getTripleScreenCurveCenterPoints = monitorModule.getTripleScreenCurveCenterPoints as (
      midpoint: [number, number, number],
      settings: typeof DEFAULT_PLANNER_POSTURE_SETTINGS
    ) => {
      left: [number, number, number];
      right: [number, number, number];
    } | null;
    const midpoint: [number, number, number] = [1, 0, 0.8];
    const settings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: '1000r' as const,
      monitorTargetFovDeg: 60,
    };
    const center = getMonitorCurveCenterPoint(midpoint, settings);
    const sideCenters = getTripleScreenCurveCenterPoints(midpoint, settings);

    expect(center).not.toBeNull();
    expect(sideCenters).not.toBeNull();
    expect(sideCenters?.left[1]).not.toBeCloseTo(center?.[1] ?? 0, 6);
    expect(sideCenters?.right[1]).not.toBeCloseTo(center?.[1] ?? 0, 6);
  });

  it('returns symmetric triple-screen inner and outer edge points in arc-center-at-eyes mode', async () => {
    const monitorModule = (await import('~/components/calculator/aluminum-rig-planner/modules/monitor')) as Record<
      string,
      unknown
    >;
    const getTripleScreenEdgePoints = monitorModule.getTripleScreenEdgePoints as (
      midpoint: [number, number, number],
      settings: typeof DEFAULT_PLANNER_POSTURE_SETTINGS
    ) => {
      leftInner: [number, number, number];
      leftOuter: [number, number, number];
      rightInner: [number, number, number];
      rightOuter: [number, number, number];
    };
    const midpoint: [number, number, number] = [1, 0, 0.8];
    const settings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: '1000r' as const,
    } as typeof DEFAULT_PLANNER_POSTURE_SETTINGS & { monitorArcCenterAtEyes?: boolean };
    (settings as Record<string, unknown>).monitorArcCenterAtEyes = true;
    const edges = getTripleScreenEdgePoints(midpoint, settings);
    const centerEdges = getMonitorScreenEdgePoints(midpoint, settings);
    const leftGapM = Math.hypot(edges.leftInner[0] - centerEdges.left[0], edges.leftInner[1] - centerEdges.left[1]);
    const rightGapM = Math.hypot(
      edges.rightInner[0] - centerEdges.right[0],
      edges.rightInner[1] - centerEdges.right[1]
    );

    expect(edges.leftInner[0]).toBeCloseTo(edges.rightInner[0], 6);
    expect(edges.leftOuter[0]).toBeCloseTo(edges.rightOuter[0], 6);
    expect(edges.leftInner[1]).toBeCloseTo(-edges.rightInner[1], 6);
    expect(edges.leftOuter[1]).toBeCloseTo(-edges.rightOuter[1], 6);
    expect(edges.leftOuter[1]).toBeLessThan(edges.leftInner[1]);
    expect(edges.rightOuter[1]).toBeGreaterThan(edges.rightInner[1]);
    expect(edges.leftOuter[0]).toBeLessThan(edges.leftInner[0]);
    expect(edges.rightOuter[0]).toBeLessThan(edges.rightInner[0]);
    expect(leftGapM).toBeCloseTo(0.003, 6);
    expect(rightGapM).toBeCloseTo(0.003, 6);
  });

  it('keeps arc-center-at-eyes side monitor chords perpendicular to the eye-to-midpoint line', async () => {
    const monitorModule = (await import('~/components/calculator/aluminum-rig-planner/modules/monitor')) as Record<
      string,
      unknown
    >;
    const getTripleScreenEdgePoints = monitorModule.getTripleScreenEdgePoints as (
      midpoint: [number, number, number],
      settings: typeof DEFAULT_PLANNER_POSTURE_SETTINGS
    ) => {
      leftInner: [number, number, number];
      leftOuter: [number, number, number];
      rightInner: [number, number, number];
      rightOuter: [number, number, number];
    };
    const getArcCenterDistanceMm = monitorModule.getArcCenterDistanceMm as (
      settings: typeof DEFAULT_PLANNER_POSTURE_SETTINGS
    ) => number | null;

    const midpoint: [number, number, number] = [1, 0, 0.8];
    const settings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: '1000r' as const,
    } as typeof DEFAULT_PLANNER_POSTURE_SETTINGS & { monitorArcCenterAtEyes?: boolean };
    (settings as Record<string, unknown>).monitorArcCenterAtEyes = true;
    const edges = getTripleScreenEdgePoints(midpoint, settings);
    const radiusMm = getArcCenterDistanceMm(settings);

    expect(radiusMm).not.toBeNull();

    const eyeCenter: [number, number, number] = [midpoint[0] - (radiusMm ?? 0) * 0.001, midpoint[1], midpoint[2]];
    const leftChord: [number, number] = [
      edges.leftOuter[0] - edges.leftInner[0],
      edges.leftOuter[1] - edges.leftInner[1],
    ];
    const leftChordMidpoint: [number, number] = [
      (edges.leftInner[0] + edges.leftOuter[0]) / 2,
      (edges.leftInner[1] + edges.leftOuter[1]) / 2,
    ];
    const rightChord: [number, number] = [
      edges.rightOuter[0] - edges.rightInner[0],
      edges.rightOuter[1] - edges.rightInner[1],
    ];
    const rightChordMidpoint: [number, number] = [
      (edges.rightInner[0] + edges.rightOuter[0]) / 2,
      (edges.rightInner[1] + edges.rightOuter[1]) / 2,
    ];

    expect(
      leftChord[0] * (leftChordMidpoint[0] - eyeCenter[0]) + leftChord[1] * (leftChordMidpoint[1] - eyeCenter[1])
    ).toBeCloseTo(0, 6);
    expect(
      rightChord[0] * (rightChordMidpoint[0] - eyeCenter[0]) + rightChord[1] * (rightChordMidpoint[1] - eyeCenter[1])
    ).toBeCloseTo(0, 6);
  });

  it('returns symmetric side monitor curve centers for curved triple screens', async () => {
    const monitorModule = (await import('~/components/calculator/aluminum-rig-planner/modules/monitor')) as Record<
      string,
      unknown
    >;
    const getTripleScreenCurveCenterPoints = monitorModule.getTripleScreenCurveCenterPoints as (
      midpoint: [number, number, number],
      settings: typeof DEFAULT_PLANNER_POSTURE_SETTINGS
    ) => {
      left: [number, number, number];
      right: [number, number, number];
    } | null;
    const midpoint: [number, number, number] = [1, 0, 0.8];
    const centers = getTripleScreenCurveCenterPoints(midpoint, {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: '1000r' as const,
      monitorTargetFovDeg: 60,
    });

    expect(centers).not.toBeNull();
    expect(centers?.left[0]).toBeCloseTo(centers?.right[0] ?? 0, 6);
    expect(centers?.left[1]).toBeCloseTo(-(centers?.right[1] ?? 0), 6);
    expect(centers?.left[0] ?? 0).toBeLessThan(midpoint[0]);
  });

  it('uses one shared curve center for arc-center-at-eyes curved triple screens', async () => {
    const monitorModule = (await import('~/components/calculator/aluminum-rig-planner/modules/monitor')) as Record<
      string,
      unknown
    >;
    const getMonitorCurveCenterPoint = monitorModule.getMonitorCurveCenterPoint as (
      midpoint: [number, number, number],
      settings: typeof DEFAULT_PLANNER_POSTURE_SETTINGS
    ) => [number, number, number] | null;
    const getTripleScreenCurveCenterPoints = monitorModule.getTripleScreenCurveCenterPoints as (
      midpoint: [number, number, number],
      settings: typeof DEFAULT_PLANNER_POSTURE_SETTINGS
    ) => {
      left: [number, number, number];
      right: [number, number, number];
    } | null;
    const midpoint: [number, number, number] = [1, 0, 0.8];
    const settings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorCurvature: '1000r' as const,
      monitorArcCenterAtEyes: true,
      monitorTargetFovDeg: 45,
      monitorTripleScreen: true,
    };
    const center = getMonitorCurveCenterPoint(midpoint, settings);
    const sideCenters = getTripleScreenCurveCenterPoints(midpoint, settings);

    expect(center).not.toBeNull();
    expect(sideCenters).not.toBeNull();
    expect(sideCenters?.left[0]).toBeCloseTo(center?.[0] ?? 0, 6);
    expect(sideCenters?.left[1]).toBeCloseTo(center?.[1] ?? 0, 6);
    expect(sideCenters?.left[2]).toBeCloseTo(center?.[2] ?? 0, 6);
    expect(sideCenters?.right[0]).toBeCloseTo(center?.[0] ?? 0, 6);
    expect(sideCenters?.right[1]).toBeCloseTo(center?.[1] ?? 0, 6);
    expect(sideCenters?.right[2]).toBeCloseTo(center?.[2] ?? 0, 6);
  });
});
