import { beforeEach, describe, expect, it } from 'vitest';
import { BUILTIN_SERVO_MOTORS, loadUserServoMotors } from '../../components/calculator/actuator-sizing/motors';
import type { ServoMotor } from '../../components/calculator/actuator-sizing/types';

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

describe('ServoMotor catalog metadata', () => {
  it('accepts optional metadata fields without affecting required calculator fields', () => {
    const motor: ServoMotor = {
      id: 'metadata-smoke-test',
      name: 'Metadata Smoke Test',
      manufacturer: 'Test Vendor',
      motorType: 'ac-servo',
      series: 'Example Series',
      ratedRPM: 3000,
      maxRPM: 5000,
      ratedTorque_Nm: 1.27,
      peakTorque_Nm: 3.81,
      continuousPower_W: 400,
      inertia_kgm2: 2.9e-5,
      dimensions_mm: { width: 60, height: 60, length: 123 },
      torqueCurve: [
        { rpm: 0, torque_Nm: 3.8 },
        { rpm: 3000, torque_Nm: 1.27 },
      ],
      datasheetPath: 'docs/motors/test/example/datasheet.pdf',
      source: 'builtin',
    };

    expect(motor.motorType).toBe('ac-servo');
    expect(motor.dimensions_mm?.length).toBe(123);
    expect(motor.torqueCurve?.[1]?.torque_Nm).toBe(1.27);
    expect(motor.datasheetPath).toContain('docs/motors/');
  });
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

  it('contains at least 30 built-in motors between 200 W and 1000 W', () => {
    expect(BUILTIN_SERVO_MOTORS.length).toBeGreaterThanOrEqual(30);
    expect(
      BUILTIN_SERVO_MOTORS.every((motor) => motor.continuousPower_W >= 200 && motor.continuousPower_W <= 1000)
    ).toBe(true);
  });

  it('keeps built-in entries source-backed with vendored datasheets', () => {
    expect(BUILTIN_SERVO_MOTORS.every((motor) => motor.datasheetPath?.startsWith('docs/motors/'))).toBe(true);
  });

  it('includes OMC StepperOnline motors in the supported power range', () => {
    const omcMotorIds = BUILTIN_SERVO_MOTORS.filter((motor) => motor.manufacturer === 'StepperOnline').map(
      (motor) => motor.id
    );

    expect(omcMotorIds).toEqual(
      expect.arrayContaining([
        'omc-a6m60-400h2a1-m17',
        'omc-a6m80-750h2a1-m17',
        'omc-a6m80-1000h2a1-m17',
        'omc-t6m80-750h2a1-m23',
        'omc-t6m80-1000h2a1-m23',
        'omc-t7m60-400h2a1-m23',
        'omc-t7m80-750h2a1-m23',
        'omc-e6m60-400h2a2-m17s',
        'omc-e6m80-750h2a2-m17s',
        'omc-e6m80-1000h2a2-m17s',
      ])
    );
  });
});
