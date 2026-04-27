import { getMonitorScreenEdgePoints } from './modules/monitor';
import { createPlannerPostureSkeleton, type PosturePoint } from './posture';
import type { PlannerPostureReport } from './posture-report';
import type { PlannerInput, PlannerPostureModelMetrics, PlannerPosturePreset, PlannerPostureSettings } from './types';

export type PlannerFovOverlay = {
  bounds: {
    maxX: number;
    maxY: number;
    minX: number;
    minY: number;
  };
  eyeCenter: PosturePoint;
  leftScreenEdge: PosturePoint;
  rightScreenEdge: PosturePoint;
};

function getBounds(points: PosturePoint[]): PlannerFovOverlay['bounds'] {
  return points.reduce(
    (bounds, point) => ({
      maxX: Math.max(bounds.maxX, point[0]),
      maxY: Math.max(bounds.maxY, point[1]),
      minX: Math.min(bounds.minX, point[0]),
      minY: Math.min(bounds.minY, point[1]),
    }),
    {
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
    }
  );
}

export function createPlannerFovOverlay(
  input: PlannerInput,
  postureSettings: PlannerPostureSettings<PlannerPosturePreset>,
  postureReport: PlannerPostureReport,
  postureModelMetrics: PlannerPostureModelMetrics
): PlannerFovOverlay {
  const skeleton = createPlannerPostureSkeleton(
    input,
    {
      ...postureSettings,
      preset: postureSettings.preset === 'custom' ? 'gt' : postureSettings.preset,
    },
    postureModelMetrics
  );
  const screenEdges = getMonitorScreenEdgePoints(postureReport.monitorDebug.position, postureSettings);
  const points = [skeleton.joints.eyeCenter, screenEdges.left, screenEdges.right];

  return {
    bounds: getBounds(points),
    eyeCenter: skeleton.joints.eyeCenter,
    leftScreenEdge: screenEdges.left,
    rightScreenEdge: screenEdges.right,
  };
}
