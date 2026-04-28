import { getMonitorScreenEdgePoints, getTripleScreenEdgePoints } from '../modules/monitor';
import { createPlannerPostureSkeleton, type PosturePoint } from './posture';
import type { PlannerPostureReport } from './posture-report';
import type { PlannerInput, PlannerPostureModelMetrics, PlannerPosturePreset, PlannerPostureSettings } from '../types';

export type PlannerFovOverlay = {
  bounds: {
    maxX: number;
    maxY: number;
    minX: number;
    minY: number;
  };
  eyeCenter: PosturePoint;
  fovLabels: {
    id: string;
    position: PosturePoint;
    valueDeg: number;
  }[];
  hasCurvedMonitor: boolean;
  leftScreenEdge: PosturePoint;
  rightScreenEdge: PosturePoint;
  summary: {
    eyeDistanceToPanelMm: number;
    fovPerMonitorDeg: number;
    totalFovDeg: number;
  };
  tripleScreen?: {
    leftInnerEdge: PosturePoint;
    leftOuterEdge: PosturePoint;
    rightInnerEdge: PosturePoint;
    rightOuterEdge: PosturePoint;
  };
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

function getTopViewFovDeg(eyeCenter: PosturePoint, left: PosturePoint, right: PosturePoint) {
  const leftDirection = [left[0] - eyeCenter[0], left[1] - eyeCenter[1]];
  const rightDirection = [right[0] - eyeCenter[0], right[1] - eyeCenter[1]];
  const leftLength = Math.hypot(leftDirection[0], leftDirection[1]);
  const rightLength = Math.hypot(rightDirection[0], rightDirection[1]);

  if (leftLength <= 0 || rightLength <= 0) {
    return 0;
  }

  const cosine =
    (leftDirection[0] * rightDirection[0] + leftDirection[1] * rightDirection[1]) / (leftLength * rightLength);

  return (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI;
}

function getFovLabelPosition(eyeCenter: PosturePoint, left: PosturePoint, right: PosturePoint): PosturePoint {
  const leftDirection = [left[0] - eyeCenter[0], left[1] - eyeCenter[1]];
  const rightDirection = [right[0] - eyeCenter[0], right[1] - eyeCenter[1]];
  const leftLength = Math.hypot(leftDirection[0], leftDirection[1]);
  const rightLength = Math.hypot(rightDirection[0], rightDirection[1]);

  if (leftLength <= 0 || rightLength <= 0) {
    return [eyeCenter[0], eyeCenter[1], eyeCenter[2] + 0.05];
  }

  const bisector = [
    leftDirection[0] / leftLength + rightDirection[0] / rightLength,
    leftDirection[1] / leftLength + rightDirection[1] / rightLength,
  ];
  const bisectorLength = Math.hypot(bisector[0], bisector[1]);

  if (bisectorLength <= 0) {
    return [eyeCenter[0], eyeCenter[1], eyeCenter[2] + 0.05];
  }

  const distanceFromEyes = 0.16;

  return [
    eyeCenter[0] + (bisector[0] / bisectorLength) * distanceFromEyes,
    eyeCenter[1] + (bisector[1] / bisectorLength) * distanceFromEyes,
    eyeCenter[2] + 0.05,
  ];
}

export function createPlannerFovOverlay(
  input: PlannerInput,
  postureSettings: PlannerPostureSettings<PlannerPosturePreset>,
  postureReport: PlannerPostureReport,
  postureModelMetrics: PlannerPostureModelMetrics
): PlannerFovOverlay | null {
  const monitorDebug = postureReport.monitorDebug;

  if (!monitorDebug) {
    return null;
  }

  const skeleton = createPlannerPostureSkeleton(
    input,
    {
      ...postureSettings,
      preset: postureSettings.preset === 'custom' ? 'gt' : postureSettings.preset,
    },
    postureModelMetrics
  );
  const screenEdges = getMonitorScreenEdgePoints(monitorDebug.position, postureSettings);
  const points: PosturePoint[] = [skeleton.joints.eyeCenter, screenEdges.left, screenEdges.right];
  const hasCurvedMonitor = postureSettings.monitorCurvature !== 'disabled';
  const tripleScreenData = postureSettings.monitorTripleScreen
    ? getTripleScreenEdgePoints(monitorDebug.position, postureSettings)
    : null;
  const totalLeftEdge = tripleScreenData?.leftOuter ?? screenEdges.left;
  const totalRightEdge = tripleScreenData?.rightOuter ?? screenEdges.right;
  const fovPerMonitorDeg = getTopViewFovDeg(skeleton.joints.eyeCenter, screenEdges.left, screenEdges.right);
  const totalFovDeg = getTopViewFovDeg(skeleton.joints.eyeCenter, totalLeftEdge, totalRightEdge);
  const eyeDistanceToPanelMm = Math.round(Math.max(0, monitorDebug.position[0] - skeleton.joints.eyeCenter[0]) * 1000);
  const fovLabels = [
    {
      id: 'center-monitor-fov',
      position: getFovLabelPosition(skeleton.joints.eyeCenter, screenEdges.left, screenEdges.right),
      valueDeg: fovPerMonitorDeg,
    },
  ];

  if (tripleScreenData) {
    points.push(
      tripleScreenData.leftInner,
      tripleScreenData.leftOuter,
      tripleScreenData.rightInner,
      tripleScreenData.rightOuter
    );
    fovLabels.push(
      {
        id: 'left-monitor-fov',
        position: getFovLabelPosition(
          skeleton.joints.eyeCenter,
          tripleScreenData.leftOuter,
          tripleScreenData.leftInner
        ),
        valueDeg: getTopViewFovDeg(skeleton.joints.eyeCenter, tripleScreenData.leftOuter, tripleScreenData.leftInner),
      },
      {
        id: 'right-monitor-fov',
        position: getFovLabelPosition(
          skeleton.joints.eyeCenter,
          tripleScreenData.rightInner,
          tripleScreenData.rightOuter
        ),
        valueDeg: getTopViewFovDeg(skeleton.joints.eyeCenter, tripleScreenData.rightInner, tripleScreenData.rightOuter),
      }
    );
  }

  points.push(...fovLabels.map((label) => label.position));

  return {
    bounds: getBounds(points),
    eyeCenter: skeleton.joints.eyeCenter,
    fovLabels,
    hasCurvedMonitor,
    leftScreenEdge: screenEdges.left,
    rightScreenEdge: screenEdges.right,
    summary: {
      eyeDistanceToPanelMm,
      fovPerMonitorDeg,
      totalFovDeg,
    },
    ...(tripleScreenData
      ? {
          tripleScreen: {
            leftInnerEdge: tripleScreenData.leftInner,
            leftOuterEdge: tripleScreenData.leftOuter,
            rightInnerEdge: tripleScreenData.rightInner,
            rightOuterEdge: tripleScreenData.rightOuter,
          },
        }
      : {}),
  };
}
