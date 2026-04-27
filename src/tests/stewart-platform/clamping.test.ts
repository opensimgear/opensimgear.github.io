import { describe, expect, it } from 'vitest';

import {
  clampPlatformMovement,
  clampStewartParameterState,
  clampStewartPlatformMovement,
  getStewartActuatorMaxExtensionMin,
  getStewartActuatorMaxExtension,
  hasPlatformMovementChange,
} from '../../components/calculator/stewart-platform/state';

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
    expect(clampPlatformMovement({ x: 14, y: -20, z: 18 }, { x: -30, y: 40, z: -9 }, spec)).toEqual({
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
    expect(clampPlatformMovement({ x: -4, y: 6, z: -8 }, { x: 7, y: -9, z: 11 }, spec)).toEqual({
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

describe('clampStewartParameterState', () => {
  it('clamps parameters to hard limits and clamps max extension to derived slider bounds', () => {
    expect(
      clampStewartParameterState({
        baseDiameter: 0.4,
        platformDiameter: 0.8,
        alphaP: 180,
        alphaB: 5,
        cor: { x: 1, y: -1, z: -0.3 },
        actuatorMin: 1.5,
        actuatorMax: 1.1,
      })
    ).toEqual({
      baseDiameter: 0.4,
      platformDiameter: 0.4,
      alphaP: 110,
      alphaB: 10,
      cor: { x: 0.4, y: -0.4, z: 0 },
      actuatorMin: 1.5,
      actuatorMax: getStewartActuatorMaxExtensionMin(1.5),
    });
  });

  it('clamps incoming max extension down to derived upper bound', () => {
    expect(
      clampStewartParameterState({
        baseDiameter: 1,
        platformDiameter: 0.6,
        alphaP: 15,
        alphaB: 20,
        cor: { x: 0, y: 0, z: 0 },
        actuatorMin: 0.4,
        actuatorMax: 1.9,
      }).actuatorMax
    ).toBeCloseTo(0.74);
  });

  it('clamps incoming max extension up to derived lower bound', () => {
    expect(
      clampStewartParameterState({
        baseDiameter: 1,
        platformDiameter: 0.6,
        alphaP: 15,
        alphaB: 20,
        cor: { x: 0, y: 0, z: 0 },
        actuatorMin: 0.4,
        actuatorMax: 0.41,
      }).actuatorMax
    ).toBeCloseTo(0.42);
  });

  it('reuses center-of-rotation object when already inside bounds', () => {
    const cor = { x: 0.1, y: -0.1, z: 0.2 };
    const state = clampStewartParameterState({
      baseDiameter: 1,
      platformDiameter: 0.6,
      alphaP: 15,
      alphaB: 20,
      cor,
      actuatorMin: 0.4,
      actuatorMax: 0.7,
    });

    expect(state.cor).toBe(cor);
  });
});

describe('getStewartActuatorMaxExtensionMin', () => {
  it('uses min extension + 5%', () => {
    expect(getStewartActuatorMaxExtensionMin(0.4)).toBeCloseTo(0.42);
    expect(getStewartActuatorMaxExtensionMin(1)).toBeCloseTo(1.05);
  });
});

describe('getStewartActuatorMaxExtension', () => {
  it('uses min extension * 2 - min extension * 0.15', () => {
    expect(getStewartActuatorMaxExtension(0.4)).toBeCloseTo(0.74);
    expect(getStewartActuatorMaxExtension(1)).toBeCloseTo(1.85);
  });
});

describe('clampStewartPlatformMovement', () => {
  const spec = {
    pitch: 10,
    roll: 12,
    yaw: 15,
    transX: 20,
    transY: 25,
    transZUp: 30,
    transZDown: 5,
  };

  it('also clamps translation to displayed point input limits', () => {
    expect(clampStewartPlatformMovement({ x: 3, y: -4, z: 5 }, { x: 7, y: -9, z: 11 }, spec, 5)).toEqual({
      rotation: {
        x: 3,
        y: -4,
        z: 5,
      },
      translation: {
        x: 5,
        y: -5,
        z: 5,
      },
    });
  });

  it('reuses translation object when values already satisfy physical and UI limits', () => {
    const translation = { x: 4, y: -3, z: 2 };
    const movement = clampStewartPlatformMovement({ x: 0, y: 0, z: 0 }, translation, spec, 5);

    expect(movement.translation).toBe(translation);
  });
});
