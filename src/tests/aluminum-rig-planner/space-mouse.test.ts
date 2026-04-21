import { describe, expect, it } from 'vitest';
import { PerspectiveCamera } from 'three';

import {
  buildPlaneEquation,
  getDiagonalFovRadians,
  getPerspectiveFrustum,
  getTargetFromCameraPose,
  getVerticalFovDegreesFromDiagonalRadians,
  SPACEMOUSE_Z_UP_COORDINATE_SYSTEM,
} from '../../components/calculator/shared/space-mouse';

describe('aluminum rig planner space mouse helpers', () => {
  it('uses z-up coordinate system expected by 3Dconnexion navlib', () => {
    expect(SPACEMOUSE_Z_UP_COORDINATE_SYSTEM).toEqual([
      1, 0, 0, 0,
      0, 0, -1, 0,
      0, 1, 0, 0,
      0, 0, 0, 1,
    ]);
  });

  it('converts between vertical and diagonal perspective fov values', () => {
    const diagonalFov = getDiagonalFovRadians(50, 1.5);

    expect(getVerticalFovDegreesFromDiagonalRadians(diagonalFov, 1.5)).toBeCloseTo(50, 6);
  });

  it('derives perspective frustum from camera fov and aspect', () => {
    const camera = new PerspectiveCamera(50, 1.5, 0.1, 20);
    const frustum = getPerspectiveFrustum(camera);

    expect(frustum[0]).toBeCloseTo(-0.06994614872324978, 6);
    expect(frustum[1]).toBeCloseTo(0.06994614872324978, 6);
    expect(frustum[2]).toBeCloseTo(-0.04663076581549985, 6);
    expect(frustum[3]).toBeCloseTo(0.04663076581549985, 6);
    expect(frustum[4]).toBe(0.1);
    expect(frustum[5]).toBe(20);
  });

  it('builds normalized plane equation from point and normal', () => {
    expect(buildPlaneEquation([0, 0, -0.002], [0, 0, 2])).toEqual([0, 0, 1, 0.002]);
  });

  it('derives orbit target from camera pose so pose-only pan survives controls sync', () => {
    expect(getTargetFromCameraPose([2, 3, 4], [0, 1, 0], 5)).toEqual([2, 8, 4]);
  });
});
