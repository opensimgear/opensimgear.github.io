import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';

import {
  DEFAULT_PLANNER_INPUT,
  PLANNER_LAYOUT,
  PLANNER_DIMENSION_LIMITS,
} from '~/components/calculator/aluminum-rig-planner/constants/planner';
import {
  BASE_BEAM_HEIGHT_MM,
  PROFILE_SHORT_MM,
  PROFILE_TALL_MM,
  UPRIGHT_BEAM_DEPTH_MM,
} from '~/components/calculator/aluminum-rig-planner/constants/profile';
import {
  clampSteeringColumnHeights,
  clampPlannerInput,
  getPedalAcceleratorDeltaMaxMm,
  getPedalBrakeDeltaMaxMm,
  getPedalClutchDeltaMaxMm,
  derivePlannerGeometry,
  getPedalTrayDistanceMaxMm,
  getSteeringColumnBaseHeightMaxMm,
  getSteeringColumnDistanceMaxMm,
} from '~/components/calculator/aluminum-rig-planner/scene/geometry';
import { createPedalsModule } from '~/components/calculator/aluminum-rig-planner/modules/pedals';
import { getProfileMeshRotation } from '~/components/calculator/aluminum-rig-planner/modules/profile-geometry';
import { mm } from '~/components/calculator/aluminum-rig-planner/modules/shared';
import { createSteeringColumnModule } from '~/components/calculator/aluminum-rig-planner/modules/steering-column';
import { createWheelModule } from '~/components/calculator/aluminum-rig-planner/modules/wheel';

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

  it('caps steering column base height against the column global max', () => {
    expect(getSteeringColumnBaseHeightMaxMm()).toBe(
      Math.min(
        PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMaxMm,
        PLANNER_DIMENSION_LIMITS.steeringColumnHeightMaxMm - PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm
      )
    );
  });

  it('raises steering column height when base height is the edited value', () => {
    const clamped = clampSteeringColumnHeights(
      {
        steeringColumnBaseHeightMm: 500,
        steeringColumnHeightMm: PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm,
      },
      'base-height'
    );

    expect(clamped.steeringColumnBaseHeightMm).toBe(500);
    expect(clamped.steeringColumnHeightMm).toBe(580);
  });

  it('lowers steering column base height when column height is the edited value', () => {
    const clamped = clampSteeringColumnHeights(
      {
        steeringColumnBaseHeightMm: 500,
        steeringColumnHeightMm: PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm,
      },
      'column-height'
    );

    expect(clamped.steeringColumnBaseHeightMm).toBe(300);
    expect(clamped.steeringColumnHeightMm).toBe(PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm);
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
      pedalLengthMm: -10,
      pedalAcceleratorDeltaMm: 999,
      pedalBrakeDeltaMm: 999,
      pedalClutchDeltaMm: 999,
    });

    expect(clamped.pedalsHeightMm).toBe(150);
    expect(clamped.pedalsDeltaMm).toBe(PLANNER_DIMENSION_LIMITS.pedalsDeltaMaxMm);
    expect(clamped.pedalAngleDeg).toBe(PLANNER_DIMENSION_LIMITS.pedalAngleDegMin);
    expect(clamped.pedalLengthMm).toBe(PLANNER_DIMENSION_LIMITS.pedalLengthMinMm);
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
      seatAngleDeg: -999,
      backrestAngleDeg: 200,
    });

    expect(clamped.seatLengthMm).toBe(PLANNER_DIMENSION_LIMITS.seatLengthMaxMm);
    expect(clamped.seatDeltaMm).toBe(PLANNER_DIMENSION_LIMITS.seatDeltaMaxMm);
    expect(clamped.seatHeightFromBaseInnerBeamsMm).toBe(300);
    expect(clamped.seatAngleDeg).toBe(PLANNER_DIMENSION_LIMITS.seatAngleDegMin);
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

  it('orients steering column crossbeam with the wide attachment face centered on the upright plane', () => {
    const meshes = createSteeringColumnModule(DEFAULT_PLANNER_INPUT, '#000000');
    const upright = meshes.find((mesh) => mesh.id === 'steering-column-left');
    const crossbeam = meshes.find((mesh) => mesh.id === 'steering-column-crossbeam');
    const wheelBase = createWheelModule(DEFAULT_PLANNER_INPUT).find((mesh) => mesh.id === 'wheel-base');
    const expectedCrossbeamTopZMm =
      BASE_BEAM_HEIGHT_MM + DEFAULT_PLANNER_INPUT.steeringColumnBaseHeightMm + PROFILE_TALL_MM;

    if (!crossbeam || !upright || !wheelBase) {
      throw new Error('Missing steering crossbeam, upright, or wheel base mesh');
    }

    const crossbeamRotation = new Quaternion().setFromEuler(new Euler(...getProfileMeshRotation(crossbeam)));
    const wheelBaseRotation = new Quaternion().setFromEuler(new Euler(...(wheelBase.rotation ?? [0, 0, 0])));
    const crossbeamWideFaceNormal = new Vector3(1, 0, 0).applyQuaternion(crossbeamRotation).normalize();
    const crossbeamAttachmentFaceNormal = crossbeamWideFaceNormal.clone().negate();
    const wheelBaseBottomNormal = new Vector3(0, 0, -1).applyQuaternion(wheelBaseRotation).normalize();
    const crossbeamWideFaceMidpoint = new Vector3(...crossbeam.position).add(
      crossbeamAttachmentFaceNormal.clone().multiplyScalar(crossbeam.size[0] / 2)
    );

    expect(crossbeam.size[0]).toBeCloseTo(mm(PROFILE_SHORT_MM));
    expect(crossbeam.size[1]).toBeCloseTo(mm(DEFAULT_PLANNER_INPUT.baseWidthMm - UPRIGHT_BEAM_DEPTH_MM * 2));
    expect(crossbeam.size[2]).toBeCloseTo(mm(PROFILE_TALL_MM));
    expect(Math.abs(crossbeamAttachmentFaceNormal.dot(wheelBaseBottomNormal))).toBeCloseTo(1);
    expect(crossbeamWideFaceMidpoint.x).toBeCloseTo(upright.position[0]);
    expect(crossbeamWideFaceMidpoint.z).toBeCloseTo(mm(expectedCrossbeamTopZMm));
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
    expect(leftSpoke?.position[2]).toBeCloseTo(hub?.position[2] ?? 0);
    expect(rightSpoke?.position[0]).toBeCloseTo(hub?.position[0] ?? 0);
    expect(rightSpoke?.position[2]).toBeCloseTo(hub?.position[2] ?? 0);
    expect(centerSpoke?.position[1]).toBeCloseTo(hub?.position[1] ?? 0);
    expect(centerSpoke?.position[2]).toBeLessThan(hub?.position[2] ?? 0);

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

  it('uses a doubled wheel connector cylinder length', () => {
    const meshes = createWheelModule(DEFAULT_PLANNER_INPUT);
    const rim = meshes.find((mesh) => mesh.id === 'wheel-rim');
    const base = meshes.find((mesh) => mesh.id === 'wheel-base');
    const connector = meshes.find((mesh) => mesh.id === 'wheel-connector');
    const wheelAngleRad = (-DEFAULT_PLANNER_INPUT.wheelAngleDeg * Math.PI) / 180;
    const wheelAxis = [Math.cos(wheelAngleRad), 0, Math.sin(wheelAngleRad)] as const;
    const projectFromRim = (position: [number, number, number]) =>
      (position[0] - (rim?.position[0] ?? 0)) * wheelAxis[0] +
      (position[1] - (rim?.position[1] ?? 0)) * wheelAxis[1] +
      (position[2] - (rim?.position[2] ?? 0)) * wheelAxis[2];

    expect(connector).toBeDefined();
    expect(base).toBeDefined();
    expect(connector?.size[0]).toBeCloseTo(projectFromRim(connector?.position ?? [0, 0, 0]) * 2);
    expect(projectFromRim(base?.position ?? [0, 0, 0])).toBeCloseTo(
      (connector?.size[0] ?? 0) + (base?.size[0] ?? 0) / 2
    );
  });

  it('adds pedal plate with shortened accelerator and floating brake/clutch pedals', () => {
    const meshes = createPedalsModule(DEFAULT_PLANNER_INPUT);
    const plate = meshes.find((mesh) => mesh.id === 'pedal-plate');
    const accelerator = meshes.find((mesh) => mesh.id === 'pedal-accelerator');
    const brake = meshes.find((mesh) => mesh.id === 'pedal-brake');
    const clutch = meshes.find((mesh) => mesh.id === 'pedal-clutch');

    expect(plate).toBeDefined();
    expect(accelerator).toBeDefined();
    expect(brake).toBeDefined();
    expect(clutch).toBeDefined();

    expect(brake?.position[0]).toBeCloseTo(clutch?.position[0] ?? 0);
    expect(brake?.position[2]).toBeCloseTo(clutch?.position[2] ?? 0);
    expect(accelerator?.position[1] ?? 0).toBeLessThan(brake?.position[1] ?? 0);
    expect(brake?.position[1] ?? 0).toBeLessThan(clutch?.position[1] ?? 0);
    expect(plate?.rotation ?? [0, 0, 0]).toEqual([0, 0, 0]);
    expect(accelerator?.size[2]).toBeCloseTo(mm(DEFAULT_PLANNER_INPUT.pedalLengthMm * 0.75));
    expect(brake?.size[2]).toBeCloseTo(mm(DEFAULT_PLANNER_INPUT.pedalLengthMm * 0.5));
    expect(clutch?.size[2]).toBeCloseTo(mm(DEFAULT_PLANNER_INPUT.pedalLengthMm * 0.5));

    const leanRad = ((DEFAULT_PLANNER_INPUT.pedalAngleDeg - 90) * Math.PI) / 180;
    const pedalPivotXmm =
      DEFAULT_PLANNER_INPUT.seatBaseDepthMm +
      DEFAULT_PLANNER_INPUT.pedalTrayDistanceMm +
      DEFAULT_PLANNER_INPUT.pedalsDeltaMm;
    const pedalPivotZmm = BASE_BEAM_HEIGHT_MM + 3 + DEFAULT_PLANNER_INPUT.pedalsHeightMm;
    const acceleratorCenterOffsetMm = DEFAULT_PLANNER_INPUT.pedalLengthMm * 0.625;
    const floatingPedalCenterOffsetMm = DEFAULT_PLANNER_INPUT.pedalLengthMm * 0.75;

    expect(plate?.position[0]).toBeCloseTo(
      mm(
        DEFAULT_PLANNER_INPUT.seatBaseDepthMm +
          DEFAULT_PLANNER_INPUT.pedalTrayDistanceMm +
          DEFAULT_PLANNER_INPUT.pedalTrayDepthMm / 2
      )
    );
    expect(plate?.position[2]).toBeCloseTo(mm(pedalPivotZmm - 1.5));
    expect(accelerator?.position[0]).toBeCloseTo(mm(pedalPivotXmm - Math.sin(leanRad) * acceleratorCenterOffsetMm), 5);
    expect(accelerator?.position[2]).toBeCloseTo(mm(pedalPivotZmm + Math.cos(leanRad) * acceleratorCenterOffsetMm), 5);
    expect(brake?.position[0]).toBeCloseTo(mm(pedalPivotXmm - Math.sin(leanRad) * floatingPedalCenterOffsetMm), 5);
    expect(brake?.position[2]).toBeCloseTo(mm(pedalPivotZmm + Math.cos(leanRad) * floatingPedalCenterOffsetMm), 5);
    expect(clutch?.position[0]).toBeCloseTo(mm(pedalPivotXmm - Math.sin(leanRad) * floatingPedalCenterOffsetMm), 5);
    expect(clutch?.position[2]).toBeCloseTo(mm(pedalPivotZmm + Math.cos(leanRad) * floatingPedalCenterOffsetMm), 5);
    expect(accelerator?.rotation?.[1]).toBeCloseTo(-leanRad, 5);
    expect(brake?.rotation?.[1]).toBeCloseTo(-leanRad, 5);
    expect(clutch?.rotation?.[1]).toBeCloseTo(-leanRad, 5);
  });

  it('scales pedal faces from the pedal length input', () => {
    const pedalLengthMm = 240;
    const meshes = createPedalsModule({
      ...DEFAULT_PLANNER_INPUT,
      pedalLengthMm,
    });
    const accelerator = meshes.find((mesh) => mesh.id === 'pedal-accelerator');
    const brake = meshes.find((mesh) => mesh.id === 'pedal-brake');
    const leanRad = ((DEFAULT_PLANNER_INPUT.pedalAngleDeg - 90) * Math.PI) / 180;
    const pedalPivotXmm =
      DEFAULT_PLANNER_INPUT.seatBaseDepthMm +
      DEFAULT_PLANNER_INPUT.pedalTrayDistanceMm +
      DEFAULT_PLANNER_INPUT.pedalsDeltaMm;
    const pedalPivotZmm = BASE_BEAM_HEIGHT_MM + 3 + DEFAULT_PLANNER_INPUT.pedalsHeightMm;

    expect(accelerator?.size[2]).toBeCloseTo(mm(pedalLengthMm * 0.75));
    expect(brake?.size[2]).toBeCloseTo(mm(pedalLengthMm * 0.5));
    expect(accelerator?.position[0]).toBeCloseTo(mm(pedalPivotXmm - Math.sin(leanRad) * 150), 5);
    expect(accelerator?.position[2]).toBeCloseTo(mm(pedalPivotZmm + Math.cos(leanRad) * 150), 5);
    expect(brake?.position[0]).toBeCloseTo(mm(pedalPivotXmm - Math.sin(leanRad) * 180), 5);
    expect(brake?.position[2]).toBeCloseTo(mm(pedalPivotZmm + Math.cos(leanRad) * 180), 5);
  });

  it('keeps pedal plate linked to tray face while height follows pedal pivot', () => {
    const basePlate = createPedalsModule(DEFAULT_PLANNER_INPUT).find((mesh) => mesh.id === 'pedal-plate');
    const movedInput = {
      ...DEFAULT_PLANNER_INPUT,
      pedalsHeightMm: 80,
      pedalsDeltaMm: 120,
      pedalAngleDeg: 45,
      pedalAcceleratorDeltaMm: 50,
      pedalBrakeDeltaMm: 20,
      pedalClutchDeltaMm: 10,
    };
    const movedPlate = createPedalsModule(movedInput).find((mesh) => mesh.id === 'pedal-plate');
    const movedPedalPivotZmm = BASE_BEAM_HEIGHT_MM + 3 + movedInput.pedalsHeightMm;

    expect(movedPlate?.position[0]).toBeCloseTo(basePlate?.position[0] ?? 0);
    expect(movedPlate?.position[2]).toBeCloseTo(mm(movedPedalPivotZmm - 1.5));
    expect(movedPlate?.position[1]).toBeCloseTo(basePlate?.position[1] ?? 0);
    expect(movedPlate?.size).toEqual(basePlate?.size);
    expect(movedPlate?.rotation ?? [0, 0, 0]).toEqual(basePlate?.rotation ?? [0, 0, 0]);
  });
});
