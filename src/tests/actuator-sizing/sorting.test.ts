import { describe, expect, it } from 'vitest';
import {
  getAriaSort,
  sortMotorResults,
  toggleSortState,
  type SortState,
} from '~/components/calculator/actuator-sizing/sorting';
import type { MotorEvaluationV2, ServoMotor } from '~/components/calculator/actuator-sizing/types';

function motor(id: string): ServoMotor {
  return {
    id,
    name: id,
    ratedRPM: 3000,
    maxRPM: 4500,
    ratedTorque_Nm: 1,
    peakTorque_Nm: 3,
    continuousPower_W: 300,
    inertia_kgm2: 1e-5,
    source: 'builtin',
  };
}

function result(id: string, overrides: Partial<MotorEvaluationV2>): MotorEvaluationV2 {
  return {
    motor: motor(id),
    gearRatio: 1,
    T_peak_required_Nm: 0,
    T_rms_required_Nm: 0,
    n_required_rpm: 0,
    P_peak_required_W: 0,
    J_load_kgm2: 0,
    J_total_kgm2: 0,
    inertiaRatio: 1,
    peakTorqueMargin_pct: 0,
    rmsTorqueMargin_pct: 0,
    speedMargin_pct: 0,
    status: 'pass',
    score: 0,
    ...overrides,
  };
}

describe('toggleSortState', () => {
  it('starts a newly clicked column in descending order', () => {
    const state: SortState = { key: 'score', descending: false };
    expect(toggleSortState(state, 'score')).toEqual({ key: 'score', descending: true });
  });

  it('toggles the same column from descending to ascending', () => {
    const state: SortState = { key: 'score', descending: true };
    expect(toggleSortState(state, 'score')).toEqual({ key: 'score', descending: false });
  });
});

describe('getAriaSort', () => {
  it('returns descending for the active descending column', () => {
    expect(getAriaSort({ key: 'score', descending: true }, 'score')).toBe('descending');
  });

  it('returns ascending for the active ascending column', () => {
    expect(getAriaSort({ key: 'score', descending: false }, 'score')).toBe('ascending');
  });

  it('returns none for inactive columns', () => {
    expect(getAriaSort({ key: 'score', descending: true }, 'status')).toBe('none');
  });
});

describe('sortMotorResults', () => {
  const sample = [
    result('warn-low', { status: 'warn', score: 10, peakTorqueMargin_pct: 20, inertiaRatio: 9 }),
    result('pass-high', { status: 'pass', score: 90, peakTorqueMargin_pct: 60, inertiaRatio: 3 }),
    result('pass-low', { status: 'pass', score: 30, peakTorqueMargin_pct: 10, inertiaRatio: 7 }),
  ];

  it('keeps status sort using pass-warn-fail precedence', () => {
    const sorted = sortMotorResults(sample, { key: 'status', descending: true });
    expect(sorted.map((entry) => entry.motor.id)).toEqual(['pass-high', 'pass-low', 'warn-low']);
  });

  it('reverses status order when toggled ascending', () => {
    const sorted = sortMotorResults(sample, { key: 'status', descending: false });
    expect(sorted.map((entry) => entry.motor.id)).toEqual(['warn-low', 'pass-low', 'pass-high']);
  });

  it('sorts clicked metric columns descending first', () => {
    const sorted = sortMotorResults(sample, { key: 'score', descending: true });
    expect(sorted.map((entry) => entry.motor.id)).toEqual(['pass-high', 'pass-low', 'warn-low']);
  });

  it('sorts ascending when the same column is clicked again', () => {
    const sorted = sortMotorResults(sample, { key: 'score', descending: false });
    expect(sorted.map((entry) => entry.motor.id)).toEqual(['warn-low', 'pass-low', 'pass-high']);
  });
});
