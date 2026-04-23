import { describe, expect, it } from 'vitest';

import {
  BASE_BEAM_HEIGHT_MM,
  DEFAULT_PLANNER_INPUT,
  PLANNER_DIMENSION_LIMITS,
} from '../../components/calculator/aluminum-rig-planner/constants';
import {
  clampPlannerInput,
  getPedalAcceleratorDeltaMaxMm,
  getPedalBrakeDeltaMaxMm,
  getPedalClutchDeltaMaxMm,
  derivePlannerGeometry,
  getPedalTrayDistanceMaxMm,
  getSteeringColumnDistanceMaxMm,
} from '../../components/calculator/aluminum-rig-planner/geometry';
import { createPedalsModule } from '../../components/calculator/aluminum-rig-planner/modules/pedals';
import { mm } from '../../components/calculator/aluminum-rig-planner/modules/shared';
import { createSteeringColumnModule } from '../../components/calculator/aluminum-rig-planner/modules/steering-column';
import { createWheelModule } from '../../components/calculator/aluminum-rig-planner/modules/wheel';

describe('aluminum rig planner geometry', () => {
  it('clamps steering column distance against current base span', () => {
    const clamped = clampPlannerInput({
      ...DEFAULT_PLANNER_INPUT,
      baseLengthMm: 1000,
      seatBaseDepthMm: 500,
      steeringColumnDistanceMm: 900,
    });

    expect(clamped.steeringColumnDistanceMm).toBe(340);
  });

  it('computes steering column distance max from seat crossbeam to front inset', () => {
    expect(
      getSteeringColumnDistanceMaxMm({
        baseLengthMm: 1350,
        seatBaseDepthMm: 500,
      })
    ).toBe(690);
  });

  it('computes pedal tray distance max from tray midpoint and base end', () => {
    expect(
      getPedalTrayDistanceMaxMm({
        baseLengthMm: 1350,
        seatBaseDepthMm: 500,
        pedalTrayDepthMm: 300,
      })
    ).toBe(700);
  });

  it('derives geometry as clamped planner input only', () => {
    const geometry = derivePlannerGeometry({
      ...DEFAULT_PLANNER_INPUT,
      baseWidthMm: 900,
    });

    expect(geometry.input.baseWidthMm).toBe(PLANNER_DIMENSION_LIMITS.baseWidthMaxMm);
  });

  it('clamps pedal tray distance so tray midpoint stays on base rail', () => {
    const clamped = clampPlannerInput({
      ...DEFAULT_PLANNER_INPUT,
      baseLengthMm: 1000,
      seatBaseDepthMm: 500,
      pedalTrayDepthMm: 400,
      pedalTrayDistanceMm: 500,
    });

    expect(clamped.pedalTrayDistanceMm).toBe(300);
  });

  it('allows shorter pedal tray distances when base is too short for default minimum', () => {
    const clamped = clampPlannerInput({
      ...DEFAULT_PLANNER_INPUT,
      baseLengthMm: 800,
      seatBaseDepthMm: 500,
      pedalTrayDepthMm: 500,
      pedalTrayDistanceMm: 150,
    });

    expect(clamped.pedalTrayDistanceMm).toBe(50);
  });

  it('clamps pedal placement inputs against supported tray-relative limits', () => {
    const clamped = clampPlannerInput({
      ...DEFAULT_PLANNER_INPUT,
      baseWidthMm: 400,
      pedalsHeightMm: 150,
      pedalsDeltaMm: 260,
      pedalAngleDeg: 10,
      pedalAcceleratorDeltaMm: 999,
      pedalBrakeDeltaMm: 999,
      pedalClutchDeltaMm: 999,
    });

    expect(clamped.pedalsHeightMm).toBe(PLANNER_DIMENSION_LIMITS.pedalsHeightMaxMm);
    expect(clamped.pedalsDeltaMm).toBe(PLANNER_DIMENSION_LIMITS.pedalsDeltaMaxMm);
    expect(clamped.pedalAngleDeg).toBe(PLANNER_DIMENSION_LIMITS.pedalAngleDegMin);
    expect(clamped.pedalAcceleratorDeltaMm).toBe(getPedalAcceleratorDeltaMaxMm({ baseWidthMm: 400 }));
    expect(clamped.pedalBrakeDeltaMm).toBe(getPedalBrakeDeltaMaxMm({ baseWidthMm: 400 }));
    expect(clamped.pedalClutchDeltaMm).toBe(getPedalClutchDeltaMaxMm({ baseWidthMm: 400 }));
  });

  it('clamps seat posture settings to supported limits', () => {
    const clamped = clampPlannerInput({
      ...DEFAULT_PLANNER_INPUT,
      seatLengthMm: 900,
      seatDeltaMm: 400,
      seatHeightFromBaseInnerBeamsMm: 400,
      seatAngleDeg: -10,
      backrestAngleDeg: 200,
    });

    expect(clamped.seatLengthMm).toBe(PLANNER_DIMENSION_LIMITS.seatLengthMaxMm);
    expect(clamped.seatDeltaMm).toBe(PLANNER_DIMENSION_LIMITS.seatDeltaMaxMm);
    expect(clamped.seatHeightFromBaseInnerBeamsMm).toBe(300);
    expect(clamped.seatAngleDeg).toBe(0);
    expect(clamped.backrestAngleDeg).toBe(135);
  });

  it('positions steering uprights from seat crossbeam distance only', () => {
    const nearModule = createSteeringColumnModule(
      {
        ...DEFAULT_PLANNER_INPUT,
        seatBaseDepthMm: 500,
        steeringColumnDistanceMm: 120,
      },
      '#000000'
    );
    const farModule = createSteeringColumnModule(
      {
        ...DEFAULT_PLANNER_INPUT,
        seatBaseDepthMm: 500,
        steeringColumnDistanceMm: 240,
      },
      '#000000'
    );

    expect(nearModule[0]?.position[0]).toBeCloseTo(0.66);
    expect(farModule[0]?.position[0]).toBeCloseTo(0.78);
    expect(farModule[0]?.position[0]).toBeGreaterThan(nearModule[0]?.position[0] ?? 0);
  });

  it('adds hub and three spokes to wheel with center spoke pointing down', () => {
    const meshes = createWheelModule(DEFAULT_PLANNER_INPUT);
    const hub = meshes.find((mesh) => mesh.id === 'wheel-hub');
    const rim = meshes.find((mesh) => mesh.id === 'wheel-rim');
    const leftSpoke = meshes.find((mesh) => mesh.id === 'wheel-spoke-left');
    const centerSpoke = meshes.find((mesh) => mesh.id === 'wheel-spoke-center');
    const rightSpoke = meshes.find((mesh) => mesh.id === 'wheel-spoke-right');

    expect(hub).toBeDefined();
    expect(rim).toBeDefined();
    expect(leftSpoke).toBeDefined();
    expect(centerSpoke).toBeDefined();
    expect(rightSpoke).toBeDefined();

    expect(hub?.position).toEqual(rim?.position);
    expect(leftSpoke?.position[0]).toBeCloseTo(hub?.position[0] ?? 0);
    expect(leftSpoke?.position[1]).toBeCloseTo(hub?.position[1] ?? 0);
    expect(rightSpoke?.position[0]).toBeCloseTo(hub?.position[0] ?? 0);
    expect(rightSpoke?.position[1]).toBeCloseTo(hub?.position[1] ?? 0);
    expect(centerSpoke?.position[2]).toBeCloseTo(hub?.position[2] ?? 0);
    expect(centerSpoke?.position[1]).toBeLessThan(hub?.position[1] ?? 0);

    const hubPosition = hub?.position ?? [0, 0, 0];
    const spokeDirections = [leftSpoke, centerSpoke, rightSpoke].map((spoke) => {
      const dx = (spoke?.position[0] ?? 0) - hubPosition[0];
      const dy = (spoke?.position[1] ?? 0) - hubPosition[1];
      const dz = (spoke?.position[2] ?? 0) - hubPosition[2];
      const length = Math.hypot(dx, dy, dz);

      return [dx / length, dy / length, dz / length] as const;
    });

    const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

    expect(dot(spokeDirections[0], spokeDirections[1])).toBeCloseTo(0, 5);
    expect(dot(spokeDirections[1], spokeDirections[2])).toBeCloseTo(0, 5);
    expect(dot(spokeDirections[0], spokeDirections[2])).toBeCloseTo(-1, 5);
  });

  it('adds pedal plate and three pedals aligned from accelerator to clutch', () => {
    const meshes = createPedalsModule(DEFAULT_PLANNER_INPUT);
    const plate = meshes.find((mesh) => mesh.id === 'pedal-plate');
    const accelerator = meshes.find((mesh) => mesh.id === 'pedal-accelerator');
    const brake = meshes.find((mesh) => mesh.id === 'pedal-brake');
    const clutch = meshes.find((mesh) => mesh.id === 'pedal-clutch');

    expect(plate).toBeDefined();
    expect(accelerator).toBeDefined();
    expect(brake).toBeDefined();
    expect(clutch).toBeDefined();

    expect(accelerator?.position[0]).toBeCloseTo(brake?.position[0] ?? 0);
    expect(brake?.position[0]).toBeCloseTo(clutch?.position[0] ?? 0);
    expect(accelerator?.position[1]).toBeCloseTo(brake?.position[1] ?? 0);
    expect(brake?.position[1]).toBeCloseTo(clutch?.position[1] ?? 0);
    expect(accelerator?.position[2] ?? 0).toBeGreaterThan(brake?.position[2] ?? 0);
    expect(brake?.position[2] ?? 0).toBeGreaterThan(clutch?.position[2] ?? 0);
    expect(plate?.rotation ?? [0, 0, 0]).toEqual([0, 0, 0]);
    expect(plate?.position[1]).toBeCloseTo(mm(BASE_BEAM_HEIGHT_MM + 1.5));

    const leanRad = ((DEFAULT_PLANNER_INPUT.pedalAngleDeg - 90) * Math.PI) / 180;
    const pedalPivotXmm =
      DEFAULT_PLANNER_INPUT.seatBaseDepthMm +
      DEFAULT_PLANNER_INPUT.pedalTrayDistanceMm +
      DEFAULT_PLANNER_INPUT.pedalsDeltaMm;
    const pedalPivotYmm = BASE_BEAM_HEIGHT_MM + 3 + DEFAULT_PLANNER_INPUT.pedalsHeightMm;

    expect(accelerator?.position[0]).toBeCloseTo(mm(pedalPivotXmm - Math.sin(leanRad) * 90), 5);
    expect(accelerator?.position[1]).toBeCloseTo(mm(pedalPivotYmm + Math.cos(leanRad) * 90), 5);
    expect(accelerator?.rotation?.[2]).toBeCloseTo(leanRad, 5);
  });

  it('keeps pedal plate fixed to tray while pedal settings move only pedals', () => {
    const basePlate = createPedalsModule(DEFAULT_PLANNER_INPUT).find((mesh) => mesh.id === 'pedal-plate');
    const movedPlate = createPedalsModule({
      ...DEFAULT_PLANNER_INPUT,
      pedalsHeightMm: 80,
      pedalsDeltaMm: 120,
      pedalAngleDeg: 45,
      pedalAcceleratorDeltaMm: 50,
      pedalBrakeDeltaMm: 20,
      pedalClutchDeltaMm: 10,
    }).find((mesh) => mesh.id === 'pedal-plate');

    expect(movedPlate?.position).toEqual(basePlate?.position);
    expect(movedPlate?.size).toEqual(basePlate?.size);
    expect(movedPlate?.rotation ?? [0, 0, 0]).toEqual(basePlate?.rotation ?? [0, 0, 0]);
  });
});
