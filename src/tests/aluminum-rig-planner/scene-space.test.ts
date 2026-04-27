import { describe, expect, it } from 'vitest';

import { SCENE_VIEW } from '../../components/calculator/aluminum-rig-planner/constants';

describe('aluminum rig planner scene space', () => {
  it('uses native z-up world settings without a planner-to-scene bridge', () => {
    expect(SCENE_VIEW.cameraUp[0]).toBeCloseTo(0);
    expect(SCENE_VIEW.cameraUp[1]).toBeCloseTo(0);
    expect(SCENE_VIEW.cameraUp[2]).toBeCloseTo(1);
    expect(SCENE_VIEW.gridPlane).toBe('xy');
    expect(SCENE_VIEW.gridPosition[2]).toBeCloseTo(-0.002);
    expect('sceneRotation' in SCENE_VIEW).toBe(false);
  });
});
