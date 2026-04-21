import { describe, expect, it } from 'vitest';

import { SCENE_VIEW } from '../../components/calculator/aluminum-rig-planner/constants';
import {
  plannerYUpToSceneZUp,
  Z_UP_SCENE_ROOT_ROTATION,
} from '../../components/calculator/aluminum-rig-planner/scene-space';

describe('aluminum rig planner scene space', () => {
  it('maps legacy planner Y-up coordinates into Z-up scene coordinates while keeping X fixed', () => {
    expect(plannerYUpToSceneZUp([1, 2, 3])).toEqual([1, -3, 2]);
  });

  it('uses z-up world settings for camera, grid, and root rotation', () => {
    expect(SCENE_VIEW.cameraUp[0]).toBeCloseTo(0);
    expect(SCENE_VIEW.cameraUp[1]).toBeCloseTo(0);
    expect(SCENE_VIEW.cameraUp[2]).toBeCloseTo(1);
    expect(SCENE_VIEW.gridPlane).toBe('xy');
    expect(SCENE_VIEW.gridPosition[2]).toBeCloseTo(-0.002);
    expect(SCENE_VIEW.sceneRotation).toEqual(Z_UP_SCENE_ROOT_ROTATION);
  });
});
