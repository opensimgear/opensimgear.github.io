import { describe, expect, it } from 'vitest';

import { decodeQueryState, encodeQueryState } from '../../components/calculator/shared/query-state';

function encodeUtf8Base64(value: string) {
  return Buffer.from(value, 'utf8').toString('base64');
}

describe('query state helpers', () => {
  it('round-trips query state through base64 json encoding', () => {
    const state = {
      profile: 'compact',
      selected: ['motor-a', 'motor-b'],
      thresholds: {
        min: 0.25,
        max: 0.75,
      },
      enabled: true,
    };

    expect(decodeQueryState(encodeQueryState(state))).toEqual(state);
  });

  it('returns null for invalid base64 payloads', () => {
    expect(decodeQueryState('%not-base64%')).toBeNull();
  });

  it('returns null for valid base64 payloads with invalid json', () => {
    expect(decodeQueryState(encodeUtf8Base64('not json'))).toBeNull();
  });

  it('returns null for decoded null json values', () => {
    expect(decodeQueryState(encodeUtf8Base64('null'))).toBeNull();
  });

  it('returns null for decoded array json values', () => {
    expect(decodeQueryState(encodeUtf8Base64('[]'))).toBeNull();
  });

  it('round-trips unicode content safely', () => {
    const state = {
      label: 'héllo 世界',
      emoji: '🛩️',
    };

    expect(decodeQueryState(encodeQueryState(state))).toEqual(state);
  });

  it('round-trips actuator sizing query state shape', () => {
    const state = {
      strokeLength: 100,
      maxVelocity: 300,
      acceleration: 5000,
      deceleration: 5000,
      dwellTime: 0.1,
      systemType: 'stewart',
      actuatorAngle: 70,
      totalMass: 150,
      autoGearRatio: true,
      advancedMode: false,
    };

    expect(decodeQueryState<typeof state>(encodeQueryState(state))).toEqual(state);
  });
});
