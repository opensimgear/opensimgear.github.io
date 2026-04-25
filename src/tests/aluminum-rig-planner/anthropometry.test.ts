import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  getAnthropometryLengthLimitsMm,
  getDefaultAnthropometryLengthsMm,
  scaleAnthropometryLengthsByHeight,
} from '../../components/calculator/aluminum-rig-planner/anthropometry';
import {
  DEFAULT_ANTHROPOMETRY_LENGTHS_MM,
  DEFAULT_ANTHROPOMETRY_RATIOS,
  DEFAULT_POSTURE_HEIGHT_CM,
} from '../../components/calculator/aluminum-rig-planner/constants';
import {
  DEFAULT_ANTHROPOMETRY_LENGTHS_MM as GENERATED_DEFAULT_ANTHROPOMETRY_LENGTHS_MM,
  DEFAULT_ANTHROPOMETRY_RATIOS as GENERATED_DEFAULT_ANTHROPOMETRY_RATIOS,
} from '../../components/calculator/aluminum-rig-planner/anthropometry-defaults';

const constantsSource = readFileSync(
  new URL('../../components/calculator/aluminum-rig-planner/constants.ts', import.meta.url),
  'utf8'
);
const anthropometryDefaultsSource = readFileSync(
  new URL('../../components/calculator/aluminum-rig-planner/anthropometry-defaults.ts', import.meta.url),
  'utf8'
);

describe('aluminum rig planner anthropometry scaling', () => {
  it('keeps generated anthropometry defaults outside the main constants module', () => {
    expect(constantsSource).toContain("from './anthropometry-defaults'");
    expect(constantsSource).not.toMatch(/export const DEFAULT_ANTHROPOMETRY_LENGTHS_MM\s*[:=]/);
    expect(anthropometryDefaultsSource).toContain('satisfies PlannerAnthropometryLengthsMm');
    expect(GENERATED_DEFAULT_ANTHROPOMETRY_LENGTHS_MM).toBe(DEFAULT_ANTHROPOMETRY_LENGTHS_MM);
    expect(GENERATED_DEFAULT_ANTHROPOMETRY_RATIOS).toBe(DEFAULT_ANTHROPOMETRY_RATIOS);
  });

  it('derives default anthropometry lengths from height ratios', () => {
    expect(DEFAULT_ANTHROPOMETRY_LENGTHS_MM.upperArmLength).toBe(
      Number((DEFAULT_ANTHROPOMETRY_RATIOS.upperArmLength * DEFAULT_POSTURE_HEIGHT_CM * 10).toFixed(1))
    );
    expect(DEFAULT_ANTHROPOMETRY_LENGTHS_MM.footLength).toBe(
      Number((DEFAULT_ANTHROPOMETRY_RATIOS.footLength * DEFAULT_POSTURE_HEIGHT_CM * 10).toFixed(1))
    );
  });

  it('scales default anthropometry lengths from height', () => {
    const scaledLengths = getDefaultAnthropometryLengthsMm(200);

    expect(scaledLengths.upperArmLength).toBe(Number((DEFAULT_ANTHROPOMETRY_RATIOS.upperArmLength * 2000).toFixed(1)));
    expect(scaledLengths.footLength).toBe(Number((DEFAULT_ANTHROPOMETRY_RATIOS.footLength * 2000).toFixed(1)));
  });

  it('rescales current anthropometry lengths when height changes', () => {
    const scaledLengths = scaleAnthropometryLengthsByHeight(
      {
        ...DEFAULT_ANTHROPOMETRY_LENGTHS_MM,
        upperArmLength: 360,
        footLength: 250,
      },
      DEFAULT_POSTURE_HEIGHT_CM,
      200
    );
    const scaleFactor = 200 / DEFAULT_POSTURE_HEIGHT_CM;
    const limits = getAnthropometryLengthLimitsMm(200);

    expect(scaledLengths.upperArmLength).toBe(limits.upperArmLength.max);
    expect(scaledLengths.footLength).toBe(Number((250 * scaleFactor).toFixed(1)));
  });

  it('scales anthropometry limits with height', () => {
    const limits = getAnthropometryLengthLimitsMm(200);
    const scaleFactor = 200 / DEFAULT_POSTURE_HEIGHT_CM;

    expect(limits.upperArmLength.min).toBe(
      Number((DEFAULT_ANTHROPOMETRY_LENGTHS_MM.upperArmLength * 0.8 * scaleFactor).toFixed(1))
    );
    expect(limits.upperArmLength.max).toBe(
      Number((DEFAULT_ANTHROPOMETRY_LENGTHS_MM.upperArmLength * 1.2 * scaleFactor).toFixed(1))
    );
  });
});
