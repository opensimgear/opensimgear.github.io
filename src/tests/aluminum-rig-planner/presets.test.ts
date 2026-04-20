import { describe, expect, it } from 'vitest';

import {
  createInitialPlannerInput,
  FORMULA_PRESET,
  getPresetLabel,
  GT_PRESET,
} from '../../components/calculator/aluminum-rig-planner/presets';
import type { DriverProfile } from '../../components/calculator/aluminum-rig-planner/types';

describe('aluminum rig planner presets', () => {
  it('returns human labels for preset ids', () => {
    expect(getPresetLabel('gt')).toBe('GT');
    expect(getPresetLabel('formula')).toBe('Formula');
  });

  it('seeds gt with more upright seat and lower pedal angle than formula', () => {
    const profile: DriverProfile = {
      driverHeightMm: 1750,
      inseamMm: 820,
      seatingBias: 'performance',
    };

    const gtInput = createInitialPlannerInput({
      ...profile,
      presetType: 'gt',
    });
    const formulaInput = createInitialPlannerInput({
      ...profile,
      presetType: 'formula',
    });

    expect(gtInput.seatBackAngleDeg).toBeGreaterThan(formulaInput.seatBackAngleDeg);
    expect(gtInput.pedalAngleDeg).toBeLessThan(formulaInput.pedalAngleDeg);
  });

  it('moves pedals and wheel farther forward for taller drivers', () => {
    const shortDriver = createInitialPlannerInput({
      driverHeightMm: 1650,
      inseamMm: 760,
      seatingBias: 'comfort',
      presetType: 'gt',
    });
    const tallDriver = createInitialPlannerInput({
      driverHeightMm: 1900,
      inseamMm: 920,
      seatingBias: 'comfort',
      presetType: 'gt',
    });

    expect(tallDriver.pedalXMm).toBeGreaterThan(shortDriver.pedalXMm);
    expect(tallDriver.wheelXMm).toBeGreaterThan(shortDriver.wheelXMm);
  });

  it('uses deck wheel mount for gt preset by default', () => {
    expect(GT_PRESET.wheelMountType).toBe('deck');
  });

  it('uses front wheel mount for formula preset by default', () => {
    expect(FORMULA_PRESET.wheelMountType).toBe('front');
  });

  it('seeds pedal tray module values from preset', () => {
    expect(GT_PRESET.pedalTrayDepthMm).toBe(320);
    expect(GT_PRESET.pedalTrayDistanceMm).toBe(550);
    expect(FORMULA_PRESET.pedalTrayDepthMm).toBe(320);
    expect(FORMULA_PRESET.pedalTrayDistanceMm).toBe(550);
  });
});
