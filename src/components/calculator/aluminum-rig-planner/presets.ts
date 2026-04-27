import {
  BASE_BEAM_HEIGHT_MM,
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
  getPedalBrakeDeltaMaxMm,
  getPedalTrayDistanceMaxMm,
  getPedalTrayDistanceMinMm,
  getSteeringColumnBaseHeightMaxMm,
  getSteeringColumnDistanceMaxMm,
} from './geometry';
import {
  createPlannerPostureSkeleton,
  getPlannerPostureFootContactErrorMm,
  getPostureBoosterSeatOffsetMm,
  POSTURE_BOOSTER_HEIGHT_THRESHOLD_CM,
} from './posture';
import { createPlannerPostureReport } from './posture-report';
import { PLANNER_POSTURE_PRESETS, type SolvablePlannerPosturePreset } from './preset-metadata';
import type {
  PlannerInput,
  PlannerPostureModelMetrics,
  PlannerPosturePreset,
  PlannerPostureSettings,
  PlannerPostureTargetRangesByPreset,
} from './types';

type PlannerPosturePresetSeed = Pick<
  PlannerInput,
  | 'steeringColumnBaseHeightMm'
  | 'steeringColumnDistanceMm'
  | 'pedalTrayDistanceMm'
  | 'pedalsHeightMm'
  | 'pedalsDeltaMm'
  | 'pedalAngleDeg'
  | 'pedalBrakeDeltaMm'
>;
type PlannerPosturePresetSearchKey = Exclude<
  keyof PlannerPosturePresetSeed,
  'pedalsHeightMm' | 'pedalsDeltaMm' | 'pedalAngleDeg'
>;
export type PlannerPresetSolveOptions = {
  includeMonitor?: boolean;
};

const METERS_TO_MM = 1000;
const PRESET_SCORE_WEIGHTS: Record<string, number> = {
  elbowBend: 4,
  kneeBend: 4,
  ankleBend: 4,
  footToToeBend: 3,
  eyeToWheelTop: 4,
  brakeAlignment: 3,
  torsoToThigh: 2,
};
const PRESET_SCORE_STATUS_PENALTY = {
  bad: 10000,
  warn: 1000,
  ok: 0,
} as const;
const PRESET_FOOT_CONTACT_TOLERANCE_MM = 1;
const PRESET_FOOT_CONTACT_SCORE_WEIGHT = 1_000_000;
const PRESET_FOOT_CONTACT_STEP_LEVELS = [
  {
    pedalTrayDistanceMm: 120,
  },
  {
    pedalTrayDistanceMm: 60,
  },
  {
    pedalTrayDistanceMm: 30,
  },
  {
    pedalTrayDistanceMm: 10,
  },
  {
    pedalTrayDistanceMm: 5,
  },
  {
    pedalTrayDistanceMm: 1,
  },
];
const PRESET_SEARCH_STEP_LEVELS: Array<Record<PlannerPosturePresetSearchKey, number>> = [
  {
    steeringColumnBaseHeightMm: 160,
    steeringColumnDistanceMm: 240,
    pedalTrayDistanceMm: 120,
    pedalBrakeDeltaMm: 120,
  },
  {
    steeringColumnBaseHeightMm: 80,
    steeringColumnDistanceMm: 120,
    pedalTrayDistanceMm: 60,
    pedalBrakeDeltaMm: 60,
  },
  {
    steeringColumnBaseHeightMm: 40,
    steeringColumnDistanceMm: 60,
    pedalTrayDistanceMm: 30,
    pedalBrakeDeltaMm: 30,
  },
  {
    steeringColumnBaseHeightMm: 20,
    steeringColumnDistanceMm: 30,
    pedalTrayDistanceMm: 10,
    pedalBrakeDeltaMm: 10,
  },
  {
    steeringColumnBaseHeightMm: 10,
    steeringColumnDistanceMm: 10,
    pedalTrayDistanceMm: 10,
    pedalBrakeDeltaMm: 5,
  },
];
const PRESET_SEARCH_KEYS: PlannerPosturePresetSearchKey[] = [
  'steeringColumnBaseHeightMm',
  'steeringColumnDistanceMm',
  'pedalTrayDistanceMm',
  'pedalBrakeDeltaMm',
];
const PRESET_SEARCH_MAX_PASSES_PER_LEVEL = 8;
const PRESET_SEARCH_NEIGHBOR_RADIUS = 3;
const SCORE_EPSILON = 0.000001;

export { PLANNER_POSTURE_PRESETS };

function shouldIncludeMonitor(options: PlannerPresetSolveOptions = {}) {
  return options.includeMonitor ?? true;
}

function getPresetFixedFinalValues(preset: SolvablePlannerPosturePreset) {
  const { seatHeightFromBaseInnerBeamsMm, seatAngleDeg, backrestAngleDeg, wheelDiameterMm, wheelAngleDeg } =
    PLANNER_POSTURE_PRESETS[preset];

  return {
    seatHeightFromBaseInnerBeamsMm,
    seatAngleDeg,
    backrestAngleDeg,
    wheelDiameterMm,
    wheelAngleDeg,
  } satisfies Pick<
    PlannerInput,
    'seatHeightFromBaseInnerBeamsMm' | 'seatAngleDeg' | 'backrestAngleDeg' | 'wheelDiameterMm' | 'wheelAngleDeg'
  >;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function clampMonitorHeightFromBaseMm(value: number) {
  return clamp(
    roundToStep(value, PLANNER_CONTROL_STEP_MM),
    PLANNER_POSTURE_LIMITS.monitorHeightFromBaseMinMm,
    PLANNER_POSTURE_LIMITS.monitorHeightFromBaseMaxMm
  );
}

export function isPlannerPosturePreset(value: unknown): value is PlannerPosturePreset {
  return value === 'gt' || value === 'rally' || value === 'drift' || value === 'road' || value === 'custom';
}

export function isPresetSolvablePreset(value: unknown): value is SolvablePlannerPosturePreset {
  return value === 'gt' || value === 'rally' || value === 'drift' || value === 'road';
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

function getBoosterSeedAdjustment(values: Pick<PlannerInput, 'seatAngleDeg' | 'backrestAngleDeg'>, heightCm: number) {
  const { backMm, bottomMm } = getPostureBoosterSeatOffsetMm(heightCm);
  const seatAngleRad = toRad(values.seatAngleDeg);
  const backrestAngleRad = toRad(values.seatAngleDeg + values.backrestAngleDeg - 90);
  const seatNormalX = -Math.sin(seatAngleRad);
  const seatNormalZ = Math.cos(seatAngleRad);
  const backrestUpX = -Math.sin(backrestAngleRad);
  const backrestUpZ = Math.cos(backrestAngleRad);
  const bodyForwardX = backrestUpZ;
  const bodyForwardZ = -backrestUpX;

  return {
    xMm: seatNormalX * bottomMm + bodyForwardX * backMm,
    zMm: seatNormalZ * bottomMm + bodyForwardZ * backMm,
  };
}

function getPresetBoosterSeedAdjustment(preset: SolvablePlannerPosturePreset, heightCm: number) {
  return getBoosterSeedAdjustment(PLANNER_POSTURE_PRESETS[preset], heightCm);
}

function getPresetPedalHeightVsHipsTargetMm(preset: SolvablePlannerPosturePreset) {
  return PLANNER_POSTURE_PRESETS[preset].pedalHeightVsHipsMm;
}

function getPedalHeightVsHipsMm(
  input: PlannerInput,
  preset: SolvablePlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics
) {
  const skeleton = createPlannerPostureSkeleton(
    input,
    {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      preset,
      heightCm,
    },
    modelMetrics
  );

  return BASE_BEAM_HEIGHT_MM + 3 + input.pedalsHeightMm - skeleton.joints.hipCenter[2] * METERS_TO_MM;
}

function getPresetPedalsHeightSeedMm(
  input: PlannerInput,
  preset: SolvablePlannerPosturePreset,
  heightCm: number,
  fallbackPedalsHeightMm: number,
  modelMetrics: PlannerPostureModelMetrics
) {
  const seedInput = clampPlannerInput({
    ...input,
    ...getPresetFixedFinalValues(preset),
    pedalsHeightMm: fallbackPedalsHeightMm,
  });
  const currentPedalHeightVsHipsMm = getPedalHeightVsHipsMm(seedInput, preset, heightCm, modelMetrics);

  return fallbackPedalsHeightMm + getPresetPedalHeightVsHipsTargetMm(preset) - currentPedalHeightVsHipsMm;
}

function getPresetSeed(
  input: PlannerInput,
  preset: SolvablePlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics
): PlannerPosturePresetSeed {
  const heightDeltaCm = clamp(heightCm, 100, 220) - DEFAULT_POSTURE_HEIGHT_CM;
  const boosterSeedAdjustment = getPresetBoosterSeedAdjustment(preset, heightCm);

  if (preset === 'rally') {
    const fallbackPedalsHeightMm = 55 + heightDeltaCm * 0.3 + boosterSeedAdjustment.zMm;

    return {
      steeringColumnBaseHeightMm: 450 + heightDeltaCm * 0.35 + boosterSeedAdjustment.zMm,
      steeringColumnDistanceMm: 330 + heightDeltaCm * 1.1 + boosterSeedAdjustment.xMm,
      pedalTrayDistanceMm: 430 + heightDeltaCm * 3 + boosterSeedAdjustment.xMm,
      pedalsHeightMm: getPresetPedalsHeightSeedMm(input, preset, heightCm, fallbackPedalsHeightMm, modelMetrics),
      pedalsDeltaMm: input.pedalsDeltaMm,
      pedalAngleDeg: input.pedalAngleDeg,
      pedalBrakeDeltaMm: input.pedalBrakeDeltaMm,
    };
  }

  if (preset === 'drift') {
    const fallbackPedalsHeightMm = 65 + heightDeltaCm * 0.3 + boosterSeedAdjustment.zMm;

    return {
      steeringColumnBaseHeightMm: 440 + heightDeltaCm * 0.35 + boosterSeedAdjustment.zMm,
      steeringColumnDistanceMm: 330 + heightDeltaCm * 1.1 + boosterSeedAdjustment.xMm,
      pedalTrayDistanceMm: 440 + heightDeltaCm * 3 + boosterSeedAdjustment.xMm,
      pedalsHeightMm: getPresetPedalsHeightSeedMm(input, preset, heightCm, fallbackPedalsHeightMm, modelMetrics),
      pedalsDeltaMm: input.pedalsDeltaMm,
      pedalAngleDeg: input.pedalAngleDeg,
      pedalBrakeDeltaMm: input.pedalBrakeDeltaMm,
    };
  }

  if (preset === 'road') {
    const fallbackPedalsHeightMm = 85 + heightDeltaCm * 0.3 + boosterSeedAdjustment.zMm;

    return {
      steeringColumnBaseHeightMm: 400 + heightDeltaCm * 0.45 + boosterSeedAdjustment.zMm,
      steeringColumnDistanceMm: 430 + heightDeltaCm * 1.8 + boosterSeedAdjustment.xMm,
      pedalTrayDistanceMm: 560 + heightDeltaCm * 3.4 + boosterSeedAdjustment.xMm,
      pedalsHeightMm: getPresetPedalsHeightSeedMm(input, preset, heightCm, fallbackPedalsHeightMm, modelMetrics),
      pedalsDeltaMm: input.pedalsDeltaMm,
      pedalAngleDeg: input.pedalAngleDeg,
      pedalBrakeDeltaMm: input.pedalBrakeDeltaMm,
    };
  }

  const fallbackPedalsHeightMm = 95 + heightDeltaCm * 0.35 + boosterSeedAdjustment.zMm;

  return {
    steeringColumnBaseHeightMm: 420 + heightDeltaCm * 0.4 + boosterSeedAdjustment.zMm,
    steeringColumnDistanceMm: 380 + heightDeltaCm * 1.5 + boosterSeedAdjustment.xMm,
    pedalTrayDistanceMm: 470 + heightDeltaCm * 3.2 + boosterSeedAdjustment.xMm,
    pedalsHeightMm: getPresetPedalsHeightSeedMm(input, preset, heightCm, fallbackPedalsHeightMm, modelMetrics),
    pedalsDeltaMm: input.pedalsDeltaMm,
    pedalAngleDeg: input.pedalAngleDeg,
    pedalBrakeDeltaMm: input.pedalBrakeDeltaMm,
  };
}

function getCurrentPlannerInputSeed(input: PlannerInput): PlannerPosturePresetSeed {
  return {
    steeringColumnBaseHeightMm: input.steeringColumnBaseHeightMm,
    steeringColumnDistanceMm: input.steeringColumnDistanceMm,
    pedalTrayDistanceMm: input.pedalTrayDistanceMm,
    pedalsHeightMm: input.pedalsHeightMm,
    pedalsDeltaMm: input.pedalsDeltaMm,
    pedalAngleDeg: input.pedalAngleDeg,
    pedalBrakeDeltaMm: input.pedalBrakeDeltaMm,
  };
}

function getSolverSeed(
  input: PlannerInput,
  preset: PlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics
) {
  return isPresetSolvablePreset(preset)
    ? getPresetSeed(input, preset, heightCm, modelMetrics)
    : getCurrentPlannerInputSeed(input);
}

function getSolverBoosterSeedAdjustment(input: PlannerInput, preset: PlannerPosturePreset, heightCm: number) {
  return isPresetSolvablePreset(preset)
    ? getPresetBoosterSeedAdjustment(preset, heightCm)
    : getBoosterSeedAdjustment(input, heightCm);
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
    pedalsDeltaMm: clamp(
      input.pedalsDeltaMm,
      PLANNER_DIMENSION_LIMITS.pedalsDeltaMinMm,
      PLANNER_DIMENSION_LIMITS.pedalsDeltaMaxMm
    ),
    pedalAngleDeg: clamp(
      input.pedalAngleDeg,
      PLANNER_DIMENSION_LIMITS.pedalAngleDegMin,
      PLANNER_DIMENSION_LIMITS.pedalAngleDegMax
    ),
    pedalBrakeDeltaMm: clamp(input.pedalBrakeDeltaMm, 0, getPedalBrakeDeltaMaxMm(input)),
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
      pedalsDeltaMm: seed.pedalsDeltaMm,
      pedalAngleDeg: seed.pedalAngleDeg,
      pedalBrakeDeltaMm: seed.pedalBrakeDeltaMm,
    })
  );
}

function scoreCandidate(
  input: PlannerInput,
  preset: PlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics,
  metricKeys: string[] | null = null,
  targetRangesByPreset: PlannerPostureTargetRangesByPreset = DEFAULT_PLANNER_POSTURE_SETTINGS.targetRangesByPreset,
  options: PlannerPresetSolveOptions = {}
) {
  const includeMonitor = shouldIncludeMonitor(options);
  const report = createPlannerPostureReport(
    input,
    {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      preset,
      heightCm,
      showModel: true,
      showSkeleton: false,
      targetRangesByPreset,
      ...(includeMonitor
        ? {
            monitorHeightFromBaseMm: getOptimizedPresetMonitorHeightFromBaseMm(
              input,
              preset,
              heightCm,
              modelMetrics,
              targetRangesByPreset
            ),
          }
        : {}),
    },
    modelMetrics,
    { includeMonitor }
  );
  const metricKeySet = metricKeys ? new Set(metricKeys) : null;

  return report.metrics.reduce((total, metric) => {
    if (metricKeySet && !metricKeySet.has(metric.key)) {
      return total;
    }

    const value = metric.unit === 'mm' ? (metric.valueMm ?? 0) : (metric.valueDeg ?? 0);
    const target = (metric.range.min + metric.range.max) / 2;
    const width = Math.max(1, metric.range.max - metric.range.min);
    const statusPenalty = PRESET_SCORE_STATUS_PENALTY[metric.status];
    const weight = PRESET_SCORE_WEIGHTS[metric.key] ?? 1;

    return total + (statusPenalty + Math.abs(value - target) / width) * weight;
  }, 0);
}

function clampPedalContactSeedValue(
  key: 'pedalTrayDistanceMm',
  value: number,
  limits: Record<PlannerPosturePresetSearchKey, { min: number; max: number; step: number }>
) {
  return clamp(value, limits[key].min, limits[key].max);
}

function getPedalContactErrorScore(
  input: PlannerInput,
  preset: PlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics,
  targetRangesByPreset: PlannerPostureTargetRangesByPreset = DEFAULT_PLANNER_POSTURE_SETTINGS.targetRangesByPreset
) {
  const contactErrorMm = getPlannerPostureFootContactErrorMm(
    input,
    {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      preset,
      heightCm,
      targetRangesByPreset,
    },
    modelMetrics
  );

  return Math.max(0, contactErrorMm - PRESET_FOOT_CONTACT_TOLERANCE_MM) * PRESET_FOOT_CONTACT_SCORE_WEIGHT;
}

function refinePedalsToFootContact(
  input: PlannerInput,
  preset: PlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics,
  targetRangesByPreset: PlannerPostureTargetRangesByPreset = DEFAULT_PLANNER_POSTURE_SETTINGS.targetRangesByPreset,
  options: PlannerPresetSolveOptions = {}
) {
  const limits = getPresetSearchLimits(input);
  let bestInput = input;
  let bestSeed = getCurrentPlannerInputSeed(input);
  let bestScore =
    getPedalContactErrorScore(bestInput, preset, heightCm, modelMetrics, targetRangesByPreset) +
    scoreCandidate(
      bestInput,
      preset,
      heightCm,
      modelMetrics,
      ['kneeBend', 'ankleBend', 'footToToeBend', 'brakeAlignment', 'torsoToThigh'],
      targetRangesByPreset,
      options
    );

  for (const stepLevel of PRESET_FOOT_CONTACT_STEP_LEVELS) {
    for (let pass = 0; pass < PRESET_SEARCH_MAX_PASSES_PER_LEVEL; pass += 1) {
      let didImprove = false;

      for (const pedalTrayDirection of [-1, 0, 1]) {
        const candidateSeed = {
          ...bestSeed,
          pedalTrayDistanceMm: clampPedalContactSeedValue(
            'pedalTrayDistanceMm',
            bestSeed.pedalTrayDistanceMm + pedalTrayDirection * stepLevel.pedalTrayDistanceMm,
            limits
          ),
        };
        const candidateInput = createCandidateInput(input, candidateSeed);
        const candidateScore =
          getPedalContactErrorScore(candidateInput, preset, heightCm, modelMetrics, targetRangesByPreset) +
          scoreCandidate(
            candidateInput,
            preset,
            heightCm,
            modelMetrics,
            ['kneeBend', 'ankleBend', 'footToToeBend', 'brakeAlignment', 'torsoToThigh'],
            targetRangesByPreset,
            options
          );

        if (candidateScore + SCORE_EPSILON >= bestScore) {
          continue;
        }

        bestSeed = candidateSeed;
        bestInput = candidateInput;
        bestScore = candidateScore;
        didImprove = true;
      }

      if (!didImprove) {
        break;
      }
    }
  }

  return bestInput;
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
    pedalBrakeDeltaMm: {
      min: 0,
      max: getPedalBrakeDeltaMaxMm(input),
      step: 10,
    },
  };
}

function getBoostedSteeringBaseHeightFloorMm(
  input: PlannerInput,
  preset: PlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics,
  targetRangesByPreset: PlannerPostureTargetRangesByPreset = DEFAULT_PLANNER_POSTURE_SETTINGS.targetRangesByPreset,
  options: PlannerPresetSolveOptions = {}
) {
  const boosterSeedAdjustment = getSolverBoosterSeedAdjustment(input, preset, heightCm);

  if (Math.abs(boosterSeedAdjustment.zMm) <= SCORE_EPSILON) {
    return null;
  }

  const thresholdInput = solveDynamicPlannerInput(
    input,
    preset,
    POSTURE_BOOSTER_HEIGHT_THRESHOLD_CM,
    modelMetrics,
    false,
    targetRangesByPreset,
    options
  );

  return thresholdInput.steeringColumnBaseHeightMm;
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
    pedalsHeightMm: clamp(
      roundToStep(seed.pedalsHeightMm, PLANNER_CONTROL_STEP_MM),
      PLANNER_DIMENSION_LIMITS.pedalsHeightMinMm,
      PLANNER_DIMENSION_LIMITS.pedalsHeightMaxMm
    ),
    pedalsDeltaMm: clamp(
      seed.pedalsDeltaMm,
      PLANNER_DIMENSION_LIMITS.pedalsDeltaMinMm,
      PLANNER_DIMENSION_LIMITS.pedalsDeltaMaxMm
    ),
    pedalAngleDeg: clamp(
      roundToStep(seed.pedalAngleDeg, 1),
      PLANNER_DIMENSION_LIMITS.pedalAngleDegMin,
      PLANNER_DIMENSION_LIMITS.pedalAngleDegMax
    ),
    pedalBrakeDeltaMm: clampPresetSearchSeedValue('pedalBrakeDeltaMm', seed.pedalBrakeDeltaMm, limits),
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
  preset: PlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics,
  useBoostedSteeringBaseFloor = true,
  targetRangesByPreset: PlannerPostureTargetRangesByPreset = DEFAULT_PLANNER_POSTURE_SETTINGS.targetRangesByPreset,
  options: PlannerPresetSolveOptions = {}
): PlannerInput {
  const includeMonitor = shouldIncludeMonitor(options);
  const limits = getPresetSearchLimits(input);
  const boostedSteeringBaseHeightFloorMm = useBoostedSteeringBaseFloor
    ? getBoostedSteeringBaseHeightFloorMm(input, preset, heightCm, modelMetrics, targetRangesByPreset, options)
    : null;

  if (boostedSteeringBaseHeightFloorMm !== null) {
    limits.steeringColumnBaseHeightMm.min = Math.max(
      limits.steeringColumnBaseHeightMm.min,
      clampPresetSearchSeedValue('steeringColumnBaseHeightMm', boostedSteeringBaseHeightFloorMm, limits)
    );
  }

  let bestSeed = clampPresetSearchSeed(getSolverSeed(input, preset, heightCm, modelMetrics), limits);
  let bestInput = createCandidateInput(input, bestSeed);
  let bestScore = scoreCandidate(bestInput, preset, heightCm, modelMetrics, null, targetRangesByPreset, options);
  const maybeAdoptCandidate = (candidateSeed: PlannerPosturePresetSeed, metricKeys: string[]) => {
    const candidateInput = createCandidateInput(input, candidateSeed);
    const currentScore = scoreCandidate(
      bestInput,
      preset,
      heightCm,
      modelMetrics,
      metricKeys,
      targetRangesByPreset,
      options
    );
    const candidateScore = scoreCandidate(
      candidateInput,
      preset,
      heightCm,
      modelMetrics,
      metricKeys,
      targetRangesByPreset,
      options
    );

    if (candidateScore + SCORE_EPSILON >= currentScore) {
      return false;
    }

    bestSeed = candidateSeed;
    bestInput = candidateInput;
    bestScore = scoreCandidate(candidateInput, preset, heightCm, modelMetrics, null, targetRangesByPreset, options);

    return true;
  };
  const maybeAdoptFullCandidate = (candidateSeed: PlannerPosturePresetSeed) => {
    const candidateInput = createCandidateInput(input, candidateSeed);
    const score = scoreCandidate(candidateInput, preset, heightCm, modelMetrics, null, targetRangesByPreset, options);

    if (score + SCORE_EPSILON >= bestScore) {
      return false;
    }

    bestSeed = candidateSeed;
    bestInput = candidateInput;
    bestScore = score;

    return true;
  };

  for (const stepLevel of PRESET_SEARCH_STEP_LEVELS) {
    for (let pass = 0; pass < PRESET_SEARCH_MAX_PASSES_PER_LEVEL; pass += 1) {
      let didImprove = false;

      if (includeMonitor) {
        for (const steeringColumnBaseHeightMm of getPresetSearchNeighborValues(
          'steeringColumnBaseHeightMm',
          bestSeed.steeringColumnBaseHeightMm,
          stepLevel.steeringColumnBaseHeightMm,
          limits
        )) {
          if (
            maybeAdoptCandidate(
              {
                ...bestSeed,
                steeringColumnBaseHeightMm,
              },
              ['eyeToWheelTop']
            )
          ) {
            didImprove = true;
          }
        }
      }

      for (const steeringColumnDistanceMm of getPresetSearchNeighborValues(
        'steeringColumnDistanceMm',
        bestSeed.steeringColumnDistanceMm,
        stepLevel.steeringColumnDistanceMm,
        limits
      )) {
        if (
          maybeAdoptCandidate(
            {
              ...bestSeed,
              steeringColumnDistanceMm,
            },
            ['elbowBend']
          )
        ) {
          didImprove = true;
        }
      }

      for (const key of PRESET_SEARCH_KEYS) {
        if (key === 'steeringColumnBaseHeightMm' || key === 'steeringColumnDistanceMm' || key === 'pedalBrakeDeltaMm') {
          continue;
        }

        for (const direction of [-1, 1]) {
          const candidateSeed: PlannerPosturePresetSeed = {
            ...bestSeed,
            [key]: clampPresetSearchSeedValue(key, bestSeed[key] + direction * stepLevel[key], limits),
          };

          if (maybeAdoptFullCandidate(candidateSeed)) {
            didImprove = true;
          }
        }
      }

      for (const pedalBrakeDeltaMm of getPresetSearchNeighborValues(
        'pedalBrakeDeltaMm',
        bestSeed.pedalBrakeDeltaMm,
        stepLevel.pedalBrakeDeltaMm,
        limits
      )) {
        if (
          maybeAdoptCandidate(
            {
              ...bestSeed,
              pedalBrakeDeltaMm,
            },
            ['brakeAlignment']
          )
        ) {
          didImprove = true;
        }
      }

      if (!didImprove) {
        break;
      }
    }
  }

  return placeBaseAroundPedalTray(
    refinePedalsToFootContact(bestInput, preset, heightCm, modelMetrics, targetRangesByPreset, options)
  );
}

export function recomputePresetDynamicPlannerInput(
  input: PlannerInput,
  preset: PlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics,
  targetRangesByPreset: PlannerPostureTargetRangesByPreset = DEFAULT_PLANNER_POSTURE_SETTINGS.targetRangesByPreset,
  options: PlannerPresetSolveOptions = {}
): PlannerInput {
  return solveDynamicPlannerInput(input, preset, heightCm, modelMetrics, true, targetRangesByPreset, options);
}

export function getOptimizedPresetMonitorHeightFromBaseMm(
  input: PlannerInput,
  preset: PlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics,
  targetRangesByPreset: PlannerPostureTargetRangesByPreset = DEFAULT_PLANNER_POSTURE_SETTINGS.targetRangesByPreset
) {
  const skeleton = createPlannerPostureSkeleton(
    input,
    {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      preset,
      heightCm,
      targetRangesByPreset,
    },
    modelMetrics
  );

  return clampMonitorHeightFromBaseMm(skeleton.joints.eyeCenter[2] * METERS_TO_MM - BASE_BEAM_HEIGHT_MM);
}

export function applyPresetToPostureSettings(
  settings: PlannerPostureSettings<PlannerPosturePreset>,
  input: PlannerInput,
  modelMetrics: PlannerPostureModelMetrics,
  options: PlannerPresetSolveOptions = {}
): PlannerPostureSettings<PlannerPosturePreset> {
  if (!isPresetSolvablePreset(settings.preset) || !shouldIncludeMonitor(options)) {
    return { ...settings };
  }

  return {
    ...settings,
    monitorHeightFromBaseMm: getOptimizedPresetMonitorHeightFromBaseMm(
      input,
      settings.preset,
      settings.heightCm,
      modelMetrics,
      settings.targetRangesByPreset
    ),
  };
}

export function applyPresetToPlannerInput(
  input: PlannerInput,
  preset: PlannerPosturePreset,
  heightCm: number,
  modelMetrics: PlannerPostureModelMetrics,
  targetRangesByPreset: PlannerPostureTargetRangesByPreset = DEFAULT_PLANNER_POSTURE_SETTINGS.targetRangesByPreset,
  options: PlannerPresetSolveOptions = {}
): PlannerInput {
  if (!isPresetSolvablePreset(preset)) {
    return { ...input };
  }

  return {
    ...recomputePresetDynamicPlannerInput(
      clampPlannerInput({ ...input, ...getPresetFixedFinalValues(preset) }),
      preset,
      heightCm,
      modelMetrics,
      targetRangesByPreset,
      options
    ),
    ...getPresetFixedFinalValues(preset),
  };
}

export function createPresetPlannerInput(
  preset: PlannerPosturePreset,
  heightCm: number,
  currentInput: PlannerInput,
  modelMetrics: PlannerPostureModelMetrics,
  options: PlannerPresetSolveOptions = {}
): PlannerInput {
  return applyPresetToPlannerInput(currentInput, preset, heightCm, modelMetrics, undefined, options);
}
