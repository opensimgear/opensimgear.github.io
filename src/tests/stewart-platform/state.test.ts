import { describe, expect, it } from 'vitest';

import { clampPlatformMovement } from '../../components/calculator/stewart-platform/state';

describe('clampPlatformMovement', () => {
  const spec = {
    pitch: 10,
    roll: 12,
    yaw: 15,
    transX: 20,
    transY: 25,
    transZUp: 30,
    transZDown: 5,
  };

  it('clamps out-of-range rotation and translation values to the platform bounds', () => {
    expect(
      clampPlatformMovement(
        { x: 14, y: -20, z: 18 },
        { x: -30, y: 40, z: -9 },
        spec
      )
    ).toEqual({
      rotation: {
        x: 10,
        y: -12,
        z: 15,
      },
      translation: {
        x: -20,
        y: 25,
        z: -5,
      },
    });
  });

  it('preserves in-range rotation and translation values', () => {
    expect(
      clampPlatformMovement(
        { x: -4, y: 6, z: -8 },
        { x: 7, y: -9, z: 11 },
        spec
      )
    ).toEqual({
      rotation: {
        x: -4,
        y: 6,
        z: -8,
      },
      translation: {
        x: 7,
        y: -9,
        z: 11,
      },
    });
  });
});
