import { describe, expect, it } from 'vitest';

import { DEFAULT_PLANNER_POSTURE_SETTINGS } from '../../components/calculator/aluminum-rig-planner/constants';
import { getMonitorDimensionsMm } from '../../components/calculator/aluminum-rig-planner/modules/monitor';

describe('aluminum rig planner monitor module', () => {
  it('computes monitor plate dimensions from diagonal size and aspect ratio', () => {
    const dimensions = getMonitorDimensionsMm({
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorSizeIn: 32,
      monitorAspectRatio: '16:10',
    });

    expect(dimensions.thicknessMm).toBe(3);
    expect(dimensions.widthMm).toBeCloseTo(689.3, 1);
    expect(dimensions.heightMm).toBeCloseTo(430.8, 1);
  });
});
