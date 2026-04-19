import { describe, expect, it } from 'vitest';

import { derivePlannerGeometry } from '../../components/calculator/aluminium-rig-planner/geometry';
import { createInitialPlannerInput } from '../../components/calculator/aluminium-rig-planner/presets';
import { evaluatePostureGuidance } from '../../components/calculator/aluminium-rig-planner/ergonomics';

describe('aluminium rig planner ergonomics', () => {
  it('pins elbow and knee guidance for baseline preset', () => {
    const input = createInitialPlannerInput({
      driverHeightMm: 1750,
      inseamMm: 820,
      seatingBias: 'performance',
      presetType: 'gt',
    });
    const geometry = derivePlannerGeometry(input);

    const guidance = evaluatePostureGuidance(input, geometry);

    expect(guidance).toEqual([
      {
        id: 'elbow-angle',
        severity: 'good',
        angleDeg: 97,
        detail: 'Elbow bend stays in a comfortable range.',
      },
      {
        id: 'knee-angle',
        severity: 'good',
        angleDeg: 105,
        detail: 'Knee bend stays in a comfortable pedal range.',
      },
    ]);
  });

  it('switches knee guidance from review to good at lower threshold', () => {
    const baselineInput = createInitialPlannerInput({
      driverHeightMm: 1750,
      inseamMm: 820,
      seatingBias: 'performance',
      presetType: 'gt',
    });

    const reviewInput = { ...baselineInput, pedalXMm: 950 };
    const goodInput = { ...baselineInput, pedalXMm: 955 };

    const reviewGuidance = evaluatePostureGuidance(reviewInput, derivePlannerGeometry(reviewInput));
    const goodGuidance = evaluatePostureGuidance(goodInput, derivePlannerGeometry(goodInput));

    expect(reviewGuidance.find((item) => item.id === 'knee-angle')).toEqual({
      id: 'knee-angle',
      severity: 'review',
      angleDeg: 99,
      detail: 'Pedal distance is close to knee-angle limits.',
    });

    expect(goodGuidance.find((item) => item.id === 'knee-angle')).toEqual({
      id: 'knee-angle',
      severity: 'good',
      angleDeg: 100,
      detail: 'Knee bend stays in a comfortable pedal range.',
    });
  });

  it('warns when wheel reach is pushed too far away', () => {
    const input = {
      ...createInitialPlannerInput({
        driverHeightMm: 1750,
        inseamMm: 820,
        seatingBias: 'performance',
        presetType: 'gt',
      }),
      wheelXMm: 980,
      wheelYMm: 700,
    };
    const geometry = derivePlannerGeometry(input);

    const guidance = evaluatePostureGuidance(input, geometry);
    const elbowGuidance = guidance.find((item) => item.id === 'elbow-angle');

    expect(elbowGuidance).toMatchObject({
      id: 'elbow-angle',
      severity: 'warning',
    });
    expect(elbowGuidance?.detail).toMatch(/reach/i);
  });
});
