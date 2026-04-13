import type { MotorEvaluationV2 } from './types';

export type SortKey = 'status' | 'score' | 'peak' | 'rms' | 'speed' | 'inertia';

export interface SortState {
  key: SortKey;
  descending: boolean;
}

export const DEFAULT_SORT_STATE: SortState = {
  key: 'score',
  descending: true,
};

export function toggleSortState(current: SortState, clicked: SortKey): SortState {
  if (current.key === clicked) {
    return {
      key: clicked,
      descending: !current.descending,
    };
  }

  return {
    key: clicked,
    descending: true,
  };
}

export function getAriaSort(state: SortState, key: SortKey): 'ascending' | 'descending' | 'none' {
  if (state.key !== key) {
    return 'none';
  }

  return state.descending ? 'descending' : 'ascending';
}

export function sortMotorResults(results: MotorEvaluationV2[], state: SortState): MotorEvaluationV2[] {
  const order: Record<MotorEvaluationV2['status'], number> = { pass: 0, warn: 1, fail: 2 };

  return [...results].sort((a, b) => {
    if (state.key === 'status') {
      const statusDiff = state.descending ? order[a.status] - order[b.status] : order[b.status] - order[a.status];
      if (statusDiff !== 0) {
        return statusDiff;
      }

      return state.descending ? b.score - a.score : a.score - b.score;
    }

    const valueFor = (result: MotorEvaluationV2): number => {
      switch (state.key) {
        case 'score':
          return result.score;
        case 'peak':
          return result.peakTorqueMargin_pct;
        case 'rms':
          return result.rmsTorqueMargin_pct;
        case 'speed':
          return result.speedMargin_pct;
        case 'inertia':
          return result.inertiaRatio;
        case 'status':
          return 0;
      }
    };

    return state.descending ? valueFor(b) - valueFor(a) : valueFor(a) - valueFor(b);
  });
}
