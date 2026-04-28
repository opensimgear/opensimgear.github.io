import { beforeEach, describe, expect, it } from 'vitest';
import { loadUserServoMotors } from '~/components/calculator/actuator-sizing/motors';

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

const localStorageMock = createLocalStorageMock();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

describe('motor catalog storage', () => {
  beforeEach(() => localStorage.clear());

  it('loads legacy user motors that only contain the original required fields', () => {
    localStorage.setItem(
      'actuator-sizing-user-motors',
      JSON.stringify([
        {
          id: 'legacy-user-motor',
          name: 'Legacy User Motor',
          ratedRPM: 3000,
          maxRPM: 4500,
          ratedTorque_Nm: 1.27,
          peakTorque_Nm: 3.81,
          continuousPower_W: 400,
          inertia_kgm2: 2.9e-5,
          source: 'user',
        },
      ])
    );

    expect(loadUserServoMotors()).toHaveLength(1);
  });
});
