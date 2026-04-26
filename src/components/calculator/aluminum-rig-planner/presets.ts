import {
  BASE_BEAM_HEIGHT_MM,
  DEFAULT_PLANNER_INPUT,
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  DEFAULT_POSTURE_HEIGHT_CM,
  PLANNER_CONTROL_STEP_MM,
  PLANNER_DIMENSION_LIMITS,
  PLANNER_LAYOUT,
  PLANNER_POSTURE_LIMITS,
} from './constants';
import {
  clampPlannerInput,
  clampSteeringColumnHeights,
  getPedalTrayDistanceMaxMm,
  getPedalTrayDistanceMinMm,
  getSteeringColumnBaseHeightMaxMm,
  getSteeringColumnDistanceMaxMm,
} from './geometry';
import { createPlannerPostureSkeleton } from './posture';
import { createPlannerPostureReport } from './posture-report';
import type { PlannerInput, PlannerPostureModelMetrics, PlannerPosturePreset, PlannerPostureSettings } from './types';

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
  'steeringColumnBaseHeightMm' | 'steeringColumnDistanceMm' | 'pedalTrayDistanceMm' | 'pedalsHeightMm' | 'pedalAngleDeg'
>;
type PlannerPosturePresetSearchKey = keyof PlannerPosturePresetSeed;

const METERS_TO_MM = 1000;
const PRESET_SCORE_WEIGHTS: Record<string, number> = {
  elbowBend: 4,
};
const PRESET_SCORE_STATUS_PENALTY = {
  bad: 10000,
  warn: 1000,
  ok: 0,
} as const;
const PRESET_SEARCH_STEP_LEVELS: Array<Record<PlannerPosturePresetSearchKey, number>> = [
  {
    steeringColumnBaseHeightMm: 160,
    steeringColumnDistanceMm: 240,
    pedalTrayDistanceMm: 120,
    pedalsHeightMm: 80,
    pedalAngleDeg: 16,
  },
  {
    steeringColumnBaseHeightMm: 80,
    steeringColumnDistanceMm: 120,
    pedalTrayDistanceMm: 60,
    pedalsHeightMm: 40,
    pedalAngleDeg: 8,
  },
  {
    steeringColumnBaseHeightMm: 40,
    steeringColumnDistanceMm: 60,
    pedalTrayDistanceMm: 30,
    pedalsHeightMm: 20,
    pedalAngleDeg: 4,
  },
  {
    steeringColumnBaseHeightMm: 20,
    steeringColumnDistanceMm: 30,
    pedalTrayDistanceMm: 10,
    pedalsHeightMm: 10,
    pedalAngleDeg: 2,
  },
  {
    steeringColumnBaseHeightMm: 10,
    steeringColumnDistanceMm: 10,
    pedalTrayDistanceMm: 10,
    pedalsHeightMm: 10,
    pedalAngleDeg: 1,
  },
];
const PRESET_SEARCH_KEYS: PlannerPosturePresetSearchKey[] = [
  'steeringColumnBaseHeightMm',
  'steeringColumnDistanceMm',
  'pedalTrayDistanceMm',
  'pedalsHeightMm',
  'pedalAngleDeg',
];
const PRESET_SEARCH_MAX_PASSES_PER_LEVEL = 8;
const PRESET_SEARCH_NEIGHBOR_RADIUS = 3;
const SCORE_EPSILON = 0.000001;

export const PLANNER_POSTURE_PRESETS: Record<SolvablePlannerPosturePreset, PlannerPosturePresetFixedValues> = {
  formula: {
    seatAngleDeg: 18,
    backrestAngleDeg: 105,
    pedalsHeightMm: 300,
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

function clampMonitorHeightFromBaseMm(value: number) {
  return clamp(
    roundToStep(value, PLANNER_CONTROL_STEP_MM),
    PLANNER_POSTURE_LIMITS.monitorHeightFromBaseMinMm,
    PLANNER_POSTURE_LIMITS.monitorHeightFromBaseMaxMm
  );
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
      steeringColumnDistanceMm: 335 + heightDeltaCm * 1.2,
      pedalTrayDistanceMm: 520 + heightDeltaCm * 3.1,
      pedalsHeightMm: 120 + heightDeltaCm * 0.4,
      pedalAngleDeg: 58,
    };
  }

  if (preset === 'rally') {
    return {
      steeringColumnBaseHeightMm: 450 + heightDeltaCm * 0.35,
      steeringColumnDistanceMm: 330 + heightDeltaCm * 1.1,
      pedalTrayDistanceMm: 430 + heightDeltaCm * 3,
      pedalsHeightMm: 145 + heightDeltaCm * 0.3,
      pedalAngleDeg: 70,
    };
  }

  if (preset === 'road') {
    return {
      steeringColumnBaseHeightMm: 400 + heightDeltaCm * 0.45,
      steeringColumnDistanceMm: 430 + heightDeltaCm * 1.8,
      pedalTrayDistanceMm: 560 + heightDeltaCm * 3.4,
      pedalsHeightMm: 70 + heightDeltaCm * 0.3,
      pedalAngleDeg: 55,
    };
  }

  return {
    steeringColumnBaseHeightMm: 420 + heightDeltaCm * 0.4,
    steeringColumnDistanceMm: 380 + heightDeltaCm * 1.5,
    pedalTrayDistanceMm: 470 + heightDeltaCm * 3.2,
    pedalsHeightMm: 95 + heightDeltaCm * 0.35,
    pedalAngleDeg: 60,
  };
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
  const { steeringColumnBaseHeightMm, steeringColumnHeightMm } = clampSteeringColumnHeights(input, 'base-height');
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
      steeringColumnHeightMm: seed.steeringColumnBaseHeightMm + PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm,
      steeringColumnDistanceMm: seed.steeringColumnDistanceMm,
      pedalTrayDistanceMm: seed.pedalTrayDistanceMm,
      pedalsHeightMm: seed.pedalsHeightMm,
      pedalAngleDeg: seed.pedalAngleDeg,
    })
  );
}

function scoreCandidate(
  input: PlannerInput,
  preset: SolvablePlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics | null = null
) {
  const report = createPlannerPostureReport(
    input,
    {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      preset,
      heightCm,
      showModel: true,
      showSkeleton: false,
      monitorHeightFromBaseMm: getOptimizedPresetMonitorHeightFromBaseMm(input, preset, heightCm, modelMetrics),
    },
    modelMetrics
  );

  return report.metrics.reduce((total, metric) => {
    const value = metric.unit === 'mm' ? (metric.valueMm ?? 0) : (metric.valueDeg ?? 0);
    const target = (metric.range.min + metric.range.max) / 2;
    const width = Math.max(1, metric.range.max - metric.range.min);
    const statusPenalty = PRESET_SCORE_STATUS_PENALTY[metric.status];
    const weight = PRESET_SCORE_WEIGHTS[metric.key] ?? 1;

    return total + (statusPenalty + Math.abs(value - target) / width) * weight;
  }, 0);
}

function getPresetSearchLimits(
  input: PlannerInput
): Record<PlannerPosturePresetSearchKey, { min: number; max: number; step: number }> {
  return {
    steeringColumnBaseHeightMm: {
      min: PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMinMm,
      max: getSteeringColumnBaseHeightMaxMm(),
      step: 10,
    },
    steeringColumnDistanceMm: {
      min: PLANNER_LAYOUT.steeringColumnDistanceMinMm,
      max: getSteeringColumnDistanceMaxMm({
        ...input,
        baseLengthMm: PLANNER_DIMENSION_LIMITS.baseLengthMaxMm,
      }),
      step: 10,
    },
    pedalTrayDistanceMm: {
      min: PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMinMm,
      max: PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMaxMm,
      step: 10,
    },
    pedalsHeightMm: {
      min: PLANNER_DIMENSION_LIMITS.pedalsHeightMinMm,
      max: PLANNER_DIMENSION_LIMITS.pedalsHeightMaxMm,
      step: 10,
    },
    pedalAngleDeg: {
      min: PLANNER_DIMENSION_LIMITS.pedalAngleDegMin,
      max: PLANNER_DIMENSION_LIMITS.pedalAngleDegMax,
      step: 1,
    },
  };
}

function clampPresetSearchSeedValue(
  key: PlannerPosturePresetSearchKey,
  value: number,
  limits: Record<PlannerPosturePresetSearchKey, { min: number; max: number; step: number }>
) {
  const limit = limits[key];

  return clamp(roundToStep(value, limit.step), limit.min, limit.max);
}

function clampPresetSearchSeed(
  seed: PlannerPosturePresetSeed,
  limits: Record<PlannerPosturePresetSearchKey, { min: number; max: number; step: number }>
): PlannerPosturePresetSeed {
  return {
    steeringColumnBaseHeightMm: clampPresetSearchSeedValue(
      'steeringColumnBaseHeightMm',
      seed.steeringColumnBaseHeightMm,
      limits
    ),
    steeringColumnDistanceMm: clampPresetSearchSeedValue(
      'steeringColumnDistanceMm',
      seed.steeringColumnDistanceMm,
      limits
    ),
    pedalTrayDistanceMm: clampPresetSearchSeedValue('pedalTrayDistanceMm', seed.pedalTrayDistanceMm, limits),
    pedalsHeightMm: clampPresetSearchSeedValue('pedalsHeightMm', seed.pedalsHeightMm, limits),
    pedalAngleDeg: clampPresetSearchSeedValue('pedalAngleDeg', seed.pedalAngleDeg, limits),
  };
}

function getPresetSearchNeighborValues(
  key: PlannerPosturePresetSearchKey,
  value: number,
  step: number,
  limits: Record<PlannerPosturePresetSearchKey, { min: number; max: number; step: number }>
) {
  const values: number[] = [];

  for (let offset = -PRESET_SEARCH_NEIGHBOR_RADIUS; offset <= PRESET_SEARCH_NEIGHBOR_RADIUS; offset += 1) {
    values.push(clampPresetSearchSeedValue(key, value + offset * step, limits));
  }

  return [...new Set(values)];
}

function solveDynamicPlannerInput(
  input: PlannerInput,
  preset: SolvablePlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics | null = null
): PlannerInput {
  const limits = getPresetSearchLimits(input);
  let bestSeed = clampPresetSearchSeed(getPresetSeed(preset, heightCm), limits);
  let bestInput = createCandidateInput(input, bestSeed);
  let bestScore = scoreCandidate(bestInput, preset, heightCm, modelMetrics);

  for (const stepLevel of PRESET_SEARCH_STEP_LEVELS) {
    for (let pass = 0; pass < PRESET_SEARCH_MAX_PASSES_PER_LEVEL; pass += 1) {
      let didImprove = false;

      for (const steeringColumnBaseHeightMm of getPresetSearchNeighborValues(
        'steeringColumnBaseHeightMm',
        bestSeed.steeringColumnBaseHeightMm,
        stepLevel.steeringColumnBaseHeightMm,
        limits
      )) {
        for (const steeringColumnDistanceMm of getPresetSearchNeighborValues(
          'steeringColumnDistanceMm',
          bestSeed.steeringColumnDistanceMm,
          stepLevel.steeringColumnDistanceMm,
          limits
        )) {
          const candidateSeed: PlannerPosturePresetSeed = {
            ...bestSeed,
            steeringColumnBaseHeightMm,
            steeringColumnDistanceMm,
          };
          const candidateInput = createCandidateInput(input, candidateSeed);
          const score = scoreCandidate(candidateInput, preset, heightCm, modelMetrics);

          if (score + SCORE_EPSILON < bestScore) {
            bestSeed = candidateSeed;
            bestInput = candidateInput;
            bestScore = score;
            didImprove = true;
          }
        }
      }

      for (const key of PRESET_SEARCH_KEYS) {
        if (key === 'steeringColumnBaseHeightMm' || key === 'steeringColumnDistanceMm') {
          continue;
        }

        for (const direction of [-1, 1]) {
          const candidateSeed: PlannerPosturePresetSeed = {
            ...bestSeed,
            [key]: clampPresetSearchSeedValue(key, bestSeed[key] + direction * stepLevel[key], limits),
          };
          const candidateInput = createCandidateInput(input, candidateSeed);
          const score = scoreCandidate(candidateInput, preset, heightCm, modelMetrics);

          if (score + SCORE_EPSILON < bestScore) {
            bestSeed = candidateSeed;
            bestInput = candidateInput;
            bestScore = score;
            didImprove = true;
          }
        }
      }

      if (!didImprove) {
        break;
      }
    }
  }

  return placeBaseAroundPedalTray(bestInput);
}

export function recomputePresetDynamicPlannerInput(
  input: PlannerInput,
  preset: PlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics | null = null
): PlannerInput {
  if (!isPresetSolvablePreset(preset)) {
    return { ...input };
  }

  return solveDynamicPlannerInput(input, preset, heightCm, modelMetrics);
}

export function getOptimizedPresetMonitorHeightFromBaseMm(
  input: PlannerInput,
  preset: PlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics | null = null
) {
  if (!isPresetSolvablePreset(preset)) {
    return DEFAULT_PLANNER_POSTURE_SETTINGS.monitorHeightFromBaseMm;
  }

  const skeleton = createPlannerPostureSkeleton(
    input,
    {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      preset,
      heightCm,
    },
    modelMetrics
  );

  return clampMonitorHeightFromBaseMm(skeleton.joints.eyeCenter[2] * METERS_TO_MM - BASE_BEAM_HEIGHT_MM);
}

export function applyPresetToPostureSettings(
  settings: PlannerPostureSettings<PlannerPosturePreset>,
  input: PlannerInput,
  modelMetrics: PlannerPostureModelMetrics | null = null
): PlannerPostureSettings<PlannerPosturePreset> {
  if (!isPresetSolvablePreset(settings.preset)) {
    return { ...settings };
  }

  return {
    ...settings,
    monitorHeightFromBaseMm: getOptimizedPresetMonitorHeightFromBaseMm(
      input,
      settings.preset,
      settings.heightCm,
      modelMetrics
    ),
  };
}

export function applyPresetToPlannerInput(
  input: PlannerInput,
  preset: PlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics | null = null
): PlannerInput {
  if (!isPresetSolvablePreset(preset)) {
    return { ...input };
  }

  return {
    ...recomputePresetDynamicPlannerInput(
      clampPlannerInput({ ...input, ...PLANNER_POSTURE_PRESETS[preset] }),
      preset,
      heightCm,
      modelMetrics
    ),
    ...getPresetFixedFinalValues(preset),
  };
}

export function createPresetPlannerInput(
  preset: PlannerPosturePreset,
  heightCm: number,
  currentInput: PlannerInput = DEFAULT_PLANNER_INPUT,
  modelMetrics: PlannerPostureModelMetrics | null = null
): PlannerInput {
  return applyPresetToPlannerInput(currentInput, preset, heightCm, modelMetrics);
}
