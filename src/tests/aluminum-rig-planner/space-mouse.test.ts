import { describe, expect, it, vi } from 'vitest';
import { Euler, Matrix4, PerspectiveCamera, Vector3 } from 'three';

import {
  applySpaceMousePlatformDelta,
  getSpaceMousePlatformAffineFromPose,
  buildPlaneEquation,
  getSpaceMousePlatformDeltaFromAffines,
  getSpaceMousePlatformPoseFromAffine,
  getDiagonalFovRadians,
  getPerspectiveFrustum,
  getTargetFromCameraPose,
  getVerticalFovDegreesFromDiagonalRadians,
  syncOrbitCameraView,
  SPACEMOUSE_Z_UP_COORDINATE_SYSTEM,
} from '../../components/calculator/shared/space-mouse';

describe('aluminum rig planner space mouse helpers', () => {
  it('uses z-up coordinate system expected by 3Dconnexion navlib', () => {
    expect(SPACEMOUSE_Z_UP_COORDINATE_SYSTEM).toEqual([1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1]);
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

  it('syncs orbit controls target and camera pose before first interaction', () => {
    const camera = new PerspectiveCamera(50, 1.5, 0.1, 20);
    const update = vi.fn();
    const controls = {
      object: null,
      target: new Vector3(),
      update,
    } as unknown as Parameters<typeof syncOrbitCameraView>[0]['controls'];

    syncOrbitCameraView({
      camera,
      controls,
      cameraUp: [0, 0, 1],
      position: [2, 3, 4],
      target: [2, 8, 4],
    });

    const worldDirection = new Vector3();
    camera.getWorldDirection(worldDirection);

    expect(camera.position.toArray()).toEqual([2, 3, 4]);
    expect(camera.up.toArray()).toEqual([0, 0, 1]);
    expect(controls.object).toBe(camera);
    expect(controls.target.toArray()).toEqual([2, 8, 4]);
    expect(worldDirection.x).toBeCloseTo(0, 6);
    expect(worldDirection.y).toBeCloseTo(1, 6);
    expect(worldDirection.z).toBeCloseTo(0, 6);
    expect(update).toHaveBeenCalledOnce();
  });

  it('derives platform translation and rotation deltas from affine changes', () => {
    const previousView = new Matrix4().makeRotationFromEuler(new Euler(0, 0, 0, 'XYZ'));
    previousView.setPosition(1, 2, 3);

    const nextView = new Matrix4().makeRotationFromEuler(new Euler(0, 0, Math.PI / 12, 'XYZ'));
    nextView.setPosition(1.2, 1.7, 3.5);

    const delta = getSpaceMousePlatformDeltaFromAffines(previousView.toArray(), nextView.toArray());

    expect(delta.translation[0]).toBeCloseTo(0.2, 6);
    expect(delta.translation[1]).toBeCloseTo(-0.3, 6);
    expect(delta.translation[2]).toBeCloseTo(0.5, 6);
    expect(delta.rotation[0]).toBeCloseTo(0, 6);
    expect(delta.rotation[1]).toBeCloseTo(0, 6);
    expect(delta.rotation[2]).toBeCloseTo(15, 6);
  });

  it('derives world-space translation deltas from rotated affine changes', () => {
    const previousAffine = new Matrix4().makeRotationFromEuler(new Euler(Math.PI / 2, 0, 0, 'XYZ'));
    const nextAffine = previousAffine.clone().multiply(new Matrix4().makeTranslation(0, 0, 0.5));

    const delta = getSpaceMousePlatformDeltaFromAffines(previousAffine.toArray(), nextAffine.toArray());

    expect(delta.translation[0]).toBeCloseTo(0, 6);
    expect(delta.translation[1]).toBeCloseTo(-0.5, 6);
    expect(delta.translation[2]).toBeCloseTo(0, 6);
  });

  it('decodes affine pose translation and rotation in world space', () => {
    const affine = new Matrix4().makeRotationFromEuler(new Euler(Math.PI / 6, 0, -Math.PI / 4, 'XYZ'));
    affine.setPosition(0.25, -0.4, 0.8);

    const pose = getSpaceMousePlatformPoseFromAffine(affine.toArray());

    expect(pose.translation[0]).toBeCloseTo(0.25, 6);
    expect(pose.translation[1]).toBeCloseTo(-0.4, 6);
    expect(pose.translation[2]).toBeCloseTo(0.8, 6);
    expect(pose.rotation[0]).toBeCloseTo(30, 6);
    expect(pose.rotation[1]).toBeCloseTo(0, 6);
    expect(pose.rotation[2]).toBeCloseTo(-45, 6);
  });

  it('round-trips pivoted platform poses through affine conversion', () => {
    const pose = {
      translation: [0.15, -0.05, 0.02] as [number, number, number],
      rotation: [8, -6, 12] as [number, number, number],
    };
    const centerOfRotation = [0, 0, 0.5] as [number, number, number];

    const affine = getSpaceMousePlatformAffineFromPose(pose, { centerOfRotation });
    const roundTripPose = getSpaceMousePlatformPoseFromAffine(affine, { centerOfRotation });

    expect(roundTripPose.translation[0]).toBeCloseTo(pose.translation[0], 6);
    expect(roundTripPose.translation[1]).toBeCloseTo(pose.translation[1], 6);
    expect(roundTripPose.translation[2]).toBeCloseTo(pose.translation[2], 6);
    expect(roundTripPose.rotation[0]).toBeCloseTo(pose.rotation[0], 6);
    expect(roundTripPose.rotation[1]).toBeCloseTo(pose.rotation[1], 6);
    expect(roundTripPose.rotation[2]).toBeCloseTo(pose.rotation[2], 6);
  });

  it('applies optional translation and rotation scaling to platform pose updates', () => {
    const nextPose = applySpaceMousePlatformDelta(
      {
        translation: [0.1, -0.1, 0.2],
        rotation: [5, -10, 15],
      },
      {
        translation: [0.2, 0.4, -0.1],
        rotation: [2, 4, -6],
      },
      {
        translationScale: 0.5,
        rotationScale: 2,
      }
    );

    expect(nextPose.translation).toEqual([0.2, 0.1, 0.15000000000000002]);
    expect(nextPose.rotation).toEqual([9, -2, 3]);
  });
});
