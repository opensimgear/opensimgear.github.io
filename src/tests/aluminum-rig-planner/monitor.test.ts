import { describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_POSTURE_SETTINGS } from '../../components/calculator/aluminum-rig-planner/constants';
import {
  createMonitorModule,
  getMonitorDimensionsMm,
  getMonitorScreenEdgePoints,
  getMonitorTargetFovFromDistanceMm,
  getSolvedMonitorDistanceFromEyesMm,
} from '../../components/calculator/aluminum-rig-planner/modules/monitor';
import type { PlannerPostureReport } from '../../components/calculator/aluminum-rig-planner/posture-report';

describe('aluminum rig planner monitor module', () => {
  it('computes monitor plate dimensions from diagonal size and aspect ratio', () => {
    const dimensions = getMonitorDimensionsMm({
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorSizeIn: 32,
      monitorAspectRatio: '16:10',
    });

    expect(dimensions.thicknessMm).toBe(3);
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
    const centerMesh = meshes[Math.floor(meshes.length / 2)];
    const leftEdge = meshes[0];
    const rightEdge = meshes.at(-1);

    expect(meshes).toHaveLength(25);
    expect(centerMesh.position[0]).toBeCloseTo(report.monitorDebug.position[0], 3);
    expect(centerMesh.position[1]).toBeCloseTo(report.monitorDebug.position[1], 6);
    expect(centerMesh.position[2]).toBe(report.monitorDebug.position[2]);
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
});
