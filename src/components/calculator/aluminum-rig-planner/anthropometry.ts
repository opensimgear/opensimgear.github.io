import { DEFAULT_ANTHROPOMETRY_LENGTHS_MM, DEFAULT_POSTURE_HEIGHT_CM, PLANNER_POSTURE_LIMITS } from './constants';
import type { PlannerAnthropometryLengthsMm, PlannerAnthropometryRatios } from './types';

export const PLANNER_ANTHROPOMETRY_KEYS = Object.keys(DEFAULT_ANTHROPOMETRY_LENGTHS_MM) as Array<
  keyof PlannerAnthropometryRatios
>;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundAnthropometryLengthMm(value: number) {
  return Number(value.toFixed(1));
}

export function clampPostureHeightCm(heightCm: number) {
  return clamp(heightCm, PLANNER_POSTURE_LIMITS.heightMinCm, PLANNER_POSTURE_LIMITS.heightMaxCm);
}

export function getAnthropometryScaleFactor(fromHeightCm: number, toHeightCm: number) {
  const safeFromHeightCm = clampPostureHeightCm(fromHeightCm);
  const safeToHeightCm = clampPostureHeightCm(toHeightCm);

  return safeToHeightCm / safeFromHeightCm;
}

export function getAnthropometryLengthLimitsMm(heightCm: number) {
  const scaleFactor = getAnthropometryScaleFactor(DEFAULT_POSTURE_HEIGHT_CM, heightCm);

  return Object.fromEntries(
    PLANNER_ANTHROPOMETRY_KEYS.map((key) => {
      const defaultLengthMm = DEFAULT_ANTHROPOMETRY_LENGTHS_MM[key];

      return [
        key,
        {
          min: roundAnthropometryLengthMm(defaultLengthMm * 0.8 * scaleFactor),
          max: roundAnthropometryLengthMm(defaultLengthMm * 1.2 * scaleFactor),
        },
      ];
    })
  ) as Record<keyof PlannerAnthropometryRatios, { min: number; max: number }>;
}

export function clampAnthropometryLengthMm(key: keyof PlannerAnthropometryRatios, value: number, heightCm: number) {
  const limits = getAnthropometryLengthLimitsMm(heightCm)[key];

  return roundAnthropometryLengthMm(clamp(value, limits.min, limits.max));
}

export function getDefaultAnthropometryLengthsMm(heightCm: number): PlannerAnthropometryLengthsMm {
  const scaleFactor = getAnthropometryScaleFactor(DEFAULT_POSTURE_HEIGHT_CM, heightCm);

  return Object.fromEntries(
    PLANNER_ANTHROPOMETRY_KEYS.map((key) => [
      key,
      roundAnthropometryLengthMm(DEFAULT_ANTHROPOMETRY_LENGTHS_MM[key] * scaleFactor),
    ])
  ) as PlannerAnthropometryLengthsMm;
}

export function scaleAnthropometryLengthsByHeight(
  lengthsMm: PlannerAnthropometryLengthsMm,
  fromHeightCm: number,
  toHeightCm: number
): PlannerAnthropometryLengthsMm {
  const scaleFactor = getAnthropometryScaleFactor(fromHeightCm, toHeightCm);

  return Object.fromEntries(
    PLANNER_ANTHROPOMETRY_KEYS.map((key) => [
      key,
      clampAnthropometryLengthMm(key, lengthsMm[key] * scaleFactor, toHeightCm),
    ])
  ) as PlannerAnthropometryLengthsMm;
}
