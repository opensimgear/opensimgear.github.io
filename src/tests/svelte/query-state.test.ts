import { describe, expect, it } from 'vitest';

import { decodeQueryState, encodeQueryState } from '../../components/calculator/shared/query-state';

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
    expect(decodeQueryState(btoa('not json'))).toBeNull();
  });
});
