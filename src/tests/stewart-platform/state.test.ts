import { describe, expect, it } from 'vitest';

import { clampPlatformMovement, hasPlatformMovementChange } from '../../components/calculator/stewart-platform/state';

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

  it('reuses existing movement objects when values already inside bounds', () => {
    const rotation = { x: -4, y: 6, z: -8 };
    const translation = { x: 7, y: -9, z: 11 };
    const movement = clampPlatformMovement(rotation, translation, spec);

    expect(movement.rotation).toBe(rotation);
    expect(movement.translation).toBe(translation);
  });

  it('preserves exact asymmetric z translation bounds', () => {
    expect(clampPlatformMovement({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -5 }, spec).translation.z).toBe(-5);
    expect(clampPlatformMovement({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 30 }, spec).translation.z).toBe(30);
  });

  it('detects when clamped values match current scalar values', () => {
    const rotation = { x: -4, y: 6, z: -8 };
    const translation = { x: 7, y: -9, z: 11 };
    const movement = clampPlatformMovement(rotation, translation, spec);

    expect(hasPlatformMovementChange(rotation, translation, movement)).toBe(false);
    expect(
      hasPlatformMovementChange(rotation, translation, {
        rotation: { ...movement.rotation, x: 5 },
        translation: movement.translation,
      })
    ).toBe(true);
  });
});
