import {
  DEFAULT_PLANNER_INPUT,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  DEFAULT_POSTURE_HEIGHT_CM,
  PLANNER_DIMENSION_LIMITS,
} from './constants';
import {
  clampPlannerInput,
  getPedalTrayDistanceMaxMm,
  getPedalTrayDistanceMinMm,
  getSteeringColumnBaseHeightMaxMm,
  getSteeringColumnDistanceMaxMm,
} from './geometry';
import { createPlannerPostureReport } from './posture-report';
import type { PlannerInput, PlannerPosturePreset } from './types';

type SolvablePlannerPosturePreset = Exclude<PlannerPosturePreset, 'custom'>;
type PlannerPosturePresetFixedValues = Pick<
  PlannerInput,
  | 'seatAngleDeg'
  | 'backrestAngleDeg'
  | 'pedalsHeightMm'
  | 'pedalAngleDeg'
  | 'wheelDiameterMm'
  | 'wheelAngleDeg'
  | 'wheelHeightOffsetMm'
  | 'wheelDistanceFromSteeringColumnMm'
>;
type PlannerPosturePresetSeed = Pick<
  PlannerInput,
  | 'steeringColumnBaseHeightMm'
  | 'steeringColumnHeightMm'
  | 'steeringColumnDistanceMm'
  | 'pedalTrayDistanceMm'
  | 'pedalsHeightMm'
  | 'pedalAngleDeg'
>;

const DYNAMIC_SEARCH_STEPS = {
  steeringColumnBaseHeightMm: [-30, 0, 30],
  steeringColumnHeightMm: [-20, 0, 20],
  steeringColumnDistanceMm: [-50, 0, 50],
  pedalTrayDistanceMm: [-60, 0, 60],
  pedalsHeightMm: [-35, 0, 35],
  pedalAngleDeg: [-8, 0, 8],
} as const;

export const PLANNER_POSTURE_PRESETS: Record<SolvablePlannerPosturePreset, PlannerPosturePresetFixedValues> = {
  formula: {
    seatAngleDeg: 18,
    backrestAngleDeg: 105,
    pedalsHeightMm: 120,
    pedalAngleDeg: 58,
    wheelDiameterMm: 280,
    wheelAngleDeg: 16,
    wheelHeightOffsetMm: 125,
    wheelDistanceFromSteeringColumnMm: -250,
  },
  gt: {
    seatAngleDeg: 5,
    backrestAngleDeg: 100,
    pedalsHeightMm: 95,
    pedalAngleDeg: 60,
    wheelDiameterMm: 320,
    wheelAngleDeg: 14,
    wheelHeightOffsetMm: 170,
    wheelDistanceFromSteeringColumnMm: -210,
  },
  rally: {
    seatAngleDeg: 8,
    backrestAngleDeg: 105,
    pedalsHeightMm: 145,
    pedalAngleDeg: 70,
    wheelDiameterMm: 330,
    wheelAngleDeg: 10,
    wheelHeightOffsetMm: 190,
    wheelDistanceFromSteeringColumnMm: -210,
  },
  road: {
    seatAngleDeg: 10,
    backrestAngleDeg: 112,
    pedalsHeightMm: 70,
    pedalAngleDeg: 55,
    wheelDiameterMm: 300,
    wheelAngleDeg: 18,
    wheelHeightOffsetMm: 145,
    wheelDistanceFromSteeringColumnMm: -240,
  },
};

function getPresetFixedFinalValues(preset: SolvablePlannerPosturePreset) {
  const {
    seatAngleDeg,
    backrestAngleDeg,
    wheelDiameterMm,
    wheelAngleDeg,
    wheelHeightOffsetMm,
    wheelDistanceFromSteeringColumnMm,
  } = PLANNER_POSTURE_PRESETS[preset];

  return {
    seatAngleDeg,
    backrestAngleDeg,
    wheelDiameterMm,
    wheelAngleDeg,
    wheelHeightOffsetMm,
    wheelDistanceFromSteeringColumnMm,
  } satisfies Pick<
    PlannerInput,
    | 'seatAngleDeg'
    | 'backrestAngleDeg'
    | 'wheelDiameterMm'
    | 'wheelAngleDeg'
    | 'wheelHeightOffsetMm'
    | 'wheelDistanceFromSteeringColumnMm'
  >;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

export function isPlannerPosturePreset(value: unknown): value is PlannerPosturePreset {
  return value === 'formula' || value === 'gt' || value === 'rally' || value === 'road' || value === 'custom';
}

export function isPresetSolvablePreset(value: unknown): value is SolvablePlannerPosturePreset {
  return value === 'formula' || value === 'gt' || value === 'rally' || value === 'road';
}

export function getPresetAfterPlannerInputEdit(
  currentPreset: PlannerPosturePreset,
  before: PlannerInput,
  after: PlannerInput
): PlannerPosturePreset {
  if (currentPreset === 'custom') {
    return 'custom';
  }

  const didInputChange = (Object.keys(before) as Array<keyof PlannerInput>).some((key) => before[key] !== after[key]);

  return didInputChange ? 'custom' : currentPreset;
}

function getPresetSeed(preset: SolvablePlannerPosturePreset, heightCm: number): PlannerPosturePresetSeed {
  const heightDeltaCm = clamp(heightCm, 100, 220) - DEFAULT_POSTURE_HEIGHT_CM;

  if (preset === 'formula') {
    return {
      steeringColumnBaseHeightMm: 390 + heightDeltaCm * 0.5,
      steeringColumnHeightMm: 515 + heightDeltaCm * 0.2,
      steeringColumnDistanceMm: 335 + heightDeltaCm * 1.2,
      pedalTrayDistanceMm: 520 + heightDeltaCm * 3.1,
      pedalsHeightMm: 120 + heightDeltaCm * 0.4,
      pedalAngleDeg: 58,
    };
  }

  if (preset === 'rally') {
    return {
      steeringColumnBaseHeightMm: 450 + heightDeltaCm * 0.35,
      steeringColumnHeightMm: 560 + heightDeltaCm * 0.15,
      steeringColumnDistanceMm: 330 + heightDeltaCm * 1.1,
      pedalTrayDistanceMm: 430 + heightDeltaCm * 3,
      pedalsHeightMm: 145 + heightDeltaCm * 0.3,
      pedalAngleDeg: 70,
    };
  }

  if (preset === 'road') {
    return {
      steeringColumnBaseHeightMm: 400 + heightDeltaCm * 0.45,
      steeringColumnHeightMm: 510 + heightDeltaCm * 0.15,
      steeringColumnDistanceMm: 430 + heightDeltaCm * 1.8,
      pedalTrayDistanceMm: 560 + heightDeltaCm * 3.4,
      pedalsHeightMm: 70 + heightDeltaCm * 0.3,
      pedalAngleDeg: 55,
    };
  }

  return {
    steeringColumnBaseHeightMm: 420 + heightDeltaCm * 0.4,
    steeringColumnHeightMm: 520 + heightDeltaCm * 0.15,
    steeringColumnDistanceMm: 380 + heightDeltaCm * 1.5,
    pedalTrayDistanceMm: 470 + heightDeltaCm * 3.2,
    pedalsHeightMm: 95 + heightDeltaCm * 0.35,
    pedalAngleDeg: 60,
  };
}

function getCandidateValues(value: number, offsets: readonly number[], min: number, max: number, step: number) {
  return [...new Set(offsets.map((offset) => clamp(roundToStep(value + offset, step), min, max)))];
}

function placeBaseAroundPedalTray(input: PlannerInput) {
  const wantedBaseLengthMm = input.seatBaseDepthMm + input.pedalTrayDistanceMm + input.pedalTrayDepthMm;
  const baseLengthMm = clamp(
    roundToStep(wantedBaseLengthMm, 10),
    PLANNER_DIMENSION_LIMITS.baseLengthMinMm,
    PLANNER_DIMENSION_LIMITS.baseLengthMaxMm
  );
  const pedalTrayDistanceMm = clamp(
    baseLengthMm - input.seatBaseDepthMm - input.pedalTrayDepthMm,
    getPedalTrayDistanceMinMm({ ...input, baseLengthMm }),
    getPedalTrayDistanceMaxMm({ ...input, baseLengthMm })
  );

  return {
    ...input,
    baseLengthMm: clamp(
      input.seatBaseDepthMm + pedalTrayDistanceMm + input.pedalTrayDepthMm,
      PLANNER_DIMENSION_LIMITS.baseLengthMinMm,
      PLANNER_DIMENSION_LIMITS.baseLengthMaxMm
    ),
    pedalTrayDistanceMm,
  };
}

function clampDynamicPlannerInput(input: PlannerInput): PlannerInput {
  const baseLengthMm = clamp(
    input.baseLengthMm,
    PLANNER_DIMENSION_LIMITS.baseLengthMinMm,
    PLANNER_DIMENSION_LIMITS.baseLengthMaxMm
  );
  const pedalTrayDistanceMm = clamp(
    input.pedalTrayDistanceMm,
    getPedalTrayDistanceMinMm({ ...input, baseLengthMm }),
    getPedalTrayDistanceMaxMm({ ...input, baseLengthMm })
  );
  const steeringColumnHeightMm = clamp(
    input.steeringColumnHeightMm,
    PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm,
    PLANNER_DIMENSION_LIMITS.steeringColumnHeightMaxMm
  );
  const steeringColumnBaseHeightMm = clamp(
    input.steeringColumnBaseHeightMm,
    PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMinMm,
    getSteeringColumnBaseHeightMaxMm(steeringColumnHeightMm)
  );
  const steeringColumnDistanceMm = clamp(
    input.steeringColumnDistanceMm,
    80,
    getSteeringColumnDistanceMaxMm({ ...input, baseLengthMm })
  );

  return {
    ...input,
    baseLengthMm,
    pedalTrayDistanceMm,
    pedalsHeightMm: clamp(
      input.pedalsHeightMm,
      PLANNER_DIMENSION_LIMITS.pedalsHeightMinMm,
      PLANNER_DIMENSION_LIMITS.pedalsHeightMaxMm
    ),
    pedalAngleDeg: clamp(
      input.pedalAngleDeg,
      PLANNER_DIMENSION_LIMITS.pedalAngleDegMin,
      PLANNER_DIMENSION_LIMITS.pedalAngleDegMax
    ),
    steeringColumnBaseHeightMm,
    steeringColumnHeightMm,
    steeringColumnDistanceMm,
  };
}

function createCandidateInput(input: PlannerInput, seed: PlannerPosturePresetSeed): PlannerInput {
  return clampDynamicPlannerInput(
    placeBaseAroundPedalTray({
      ...input,
      steeringColumnBaseHeightMm: seed.steeringColumnBaseHeightMm,
      steeringColumnHeightMm: seed.steeringColumnHeightMm,
      steeringColumnDistanceMm: seed.steeringColumnDistanceMm,
      pedalTrayDistanceMm: seed.pedalTrayDistanceMm,
      pedalsHeightMm: seed.pedalsHeightMm,
      pedalAngleDeg: seed.pedalAngleDeg,
    })
  );
}

function scoreCandidate(input: PlannerInput, preset: SolvablePlannerPosturePreset, heightCm: number) {
  const report = createPlannerPostureReport(input, {
    ...DEFAULT_PLANNER_POSTURE_SETTINGS,
    preset,
    heightCm,
    showModel: true,
    showSkeleton: false,
  });

  return report.metrics.reduce((total, metric) => {
    const value = metric.unit === 'mm' ? (metric.valueMm ?? 0) : (metric.valueDeg ?? 0);
    const center = (metric.range.min + metric.range.max) / 2;
    const width = Math.max(1, metric.range.max - metric.range.min);
    const statusPenalty = metric.status === 'bad' ? 100 : metric.status === 'warn' ? 20 : 0;

    return total + statusPenalty + Math.abs(value - center) / width;
  }, 0);
}

function solveDynamicPlannerInput(
  input: PlannerInput,
  preset: SolvablePlannerPosturePreset,
  heightCm: number
): PlannerInput {
  const seed = getPresetSeed(preset, heightCm);
  const baseCandidate = createCandidateInput(input, seed);
  const seeds = {
    steeringColumnBaseHeightMm: getCandidateValues(
      seed.steeringColumnBaseHeightMm,
      DYNAMIC_SEARCH_STEPS.steeringColumnBaseHeightMm,
      PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMinMm,
      PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMaxMm,
      10
    ),
    steeringColumnHeightMm: getCandidateValues(
      seed.steeringColumnHeightMm,
      DYNAMIC_SEARCH_STEPS.steeringColumnHeightMm,
      PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm,
      PLANNER_DIMENSION_LIMITS.steeringColumnHeightMaxMm,
      10
    ),
    steeringColumnDistanceMm: getCandidateValues(
      seed.steeringColumnDistanceMm,
      DYNAMIC_SEARCH_STEPS.steeringColumnDistanceMm,
      80,
      baseCandidate.baseLengthMm,
      10
    ),
    pedalTrayDistanceMm: getCandidateValues(
      seed.pedalTrayDistanceMm,
      DYNAMIC_SEARCH_STEPS.pedalTrayDistanceMm,
      PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMinMm,
      PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMaxMm,
      10
    ),
    pedalsHeightMm: getCandidateValues(
      seed.pedalsHeightMm,
      DYNAMIC_SEARCH_STEPS.pedalsHeightMm,
      PLANNER_DIMENSION_LIMITS.pedalsHeightMinMm,
      PLANNER_DIMENSION_LIMITS.pedalsHeightMaxMm,
      10
    ),
    pedalAngleDeg: getCandidateValues(
      seed.pedalAngleDeg,
      DYNAMIC_SEARCH_STEPS.pedalAngleDeg,
      PLANNER_DIMENSION_LIMITS.pedalAngleDegMin,
      PLANNER_DIMENSION_LIMITS.pedalAngleDegMax,
      1
    ),
  };
  let bestInput = baseCandidate;
  let bestScore = scoreCandidate(bestInput, preset, heightCm);

  for (const steeringColumnBaseHeightMm of seeds.steeringColumnBaseHeightMm) {
    for (const steeringColumnHeightMm of seeds.steeringColumnHeightMm) {
      for (const steeringColumnDistanceMm of seeds.steeringColumnDistanceMm) {
        for (const pedalTrayDistanceMm of seeds.pedalTrayDistanceMm) {
          for (const pedalsHeightMm of seeds.pedalsHeightMm) {
            for (const pedalAngleDeg of seeds.pedalAngleDeg) {
              const candidate = createCandidateInput(input, {
                steeringColumnBaseHeightMm,
                steeringColumnHeightMm,
                steeringColumnDistanceMm,
                pedalTrayDistanceMm,
                pedalsHeightMm,
                pedalAngleDeg,
              });
              const score = scoreCandidate(candidate, preset, heightCm);

              if (score < bestScore) {
                bestInput = candidate;
                bestScore = score;
              }
            }
          }
        }
      }
    }
  }

  return placeBaseAroundPedalTray(bestInput);
}

export function recomputePresetDynamicPlannerInput(
  input: PlannerInput,
  preset: PlannerPosturePreset,
  heightCm: number
): PlannerInput {
  if (!isPresetSolvablePreset(preset)) {
    return { ...input };
  }

  return solveDynamicPlannerInput(input, preset, heightCm);
}

export function applyPresetToPlannerInput(
  input: PlannerInput,
  preset: PlannerPosturePreset,
  heightCm: number
): PlannerInput {
  if (!isPresetSolvablePreset(preset)) {
    return { ...input };
  }

  return {
    ...recomputePresetDynamicPlannerInput(
      clampPlannerInput({ ...input, ...PLANNER_POSTURE_PRESETS[preset] }),
      preset,
      heightCm
    ),
    ...getPresetFixedFinalValues(preset),
  };
}

export function createPresetPlannerInput(
  preset: PlannerPosturePreset,
  heightCm: number,
  currentInput: PlannerInput = DEFAULT_PLANNER_INPUT
): PlannerInput {
  return applyPresetToPlannerInput(currentInput, preset, heightCm);
}
