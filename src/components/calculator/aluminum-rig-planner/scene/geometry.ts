import type { PlannerInput } from '../types';
import { PEDAL_TRAY_LAYOUT, PLANNER_DIMENSION_LIMITS, PLANNER_LAYOUT } from '../constants/planner';

export type PlannerGeometry = {
  input: PlannerInput;
};

export type SteeringColumnHeightClampMode = 'base-height' | 'column-height';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getSteeringColumnBaseHeightMaxMm() {
  return Math.max(
    PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMinMm,
    Math.min(
      PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMaxMm,
      PLANNER_DIMENSION_LIMITS.steeringColumnHeightMaxMm - PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm
    )
  );
}

export function clampSteeringColumnHeights(
  input: Pick<PlannerInput, 'steeringColumnBaseHeightMm' | 'steeringColumnHeightMm'>,
  mode: SteeringColumnHeightClampMode = 'column-height'
) {
  const baseHeightMaxMm = getSteeringColumnBaseHeightMaxMm();
  const steeringColumnHeightMm = clamp(
    input.steeringColumnHeightMm,
    PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm,
    PLANNER_DIMENSION_LIMITS.steeringColumnHeightMaxMm
  );

  if (mode === 'base-height') {
    const steeringColumnBaseHeightMm = clamp(
      input.steeringColumnBaseHeightMm,
      PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMinMm,
      baseHeightMaxMm
    );

    return {
      steeringColumnBaseHeightMm,
      steeringColumnHeightMm: clamp(
        Math.max(
          steeringColumnHeightMm,
          steeringColumnBaseHeightMm + PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm
        ),
        PLANNER_DIMENSION_LIMITS.steeringColumnHeightMinMm,
        PLANNER_DIMENSION_LIMITS.steeringColumnHeightMaxMm
      ),
    };
  }

  return {
    steeringColumnBaseHeightMm: clamp(
      input.steeringColumnBaseHeightMm,
      PLANNER_DIMENSION_LIMITS.steeringColumnBaseHeightMinMm,
      Math.min(baseHeightMaxMm, steeringColumnHeightMm - PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm)
    ),
    steeringColumnHeightMm,
  };
}

export function getSteeringColumnDistanceMaxMm(input: Pick<PlannerInput, 'baseLengthMm' | 'seatBaseDepthMm'>) {
  return Math.max(
    PLANNER_LAYOUT.steeringColumnDistanceMinMm,
    input.baseLengthMm - input.seatBaseDepthMm - PLANNER_LAYOUT.steeringColumnDistanceFrontInsetMm
  );
}

export function getPedalTrayDistanceMaxMm(
  input: Pick<PlannerInput, 'baseLengthMm' | 'seatBaseDepthMm' | 'pedalTrayDepthMm'>
) {
  return Math.max(0, input.baseLengthMm - input.seatBaseDepthMm - input.pedalTrayDepthMm / 2);
}

export function getPedalTrayDistanceMinMm(
  input: Pick<PlannerInput, 'baseLengthMm' | 'seatBaseDepthMm' | 'pedalTrayDepthMm'>
) {
  return getPedalTrayDistanceMaxMm(input) < PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMinMm
    ? 0
    : PLANNER_DIMENSION_LIMITS.pedalTrayDistanceMinMm;
}

export function getPedalTrayUsableWidthMm(input: Pick<PlannerInput, 'baseWidthMm'>) {
  return Math.max(0, input.baseWidthMm - PEDAL_TRAY_LAYOUT.sideBeamInnerSpanReductionMm);
}

export function getPedalAcceleratorDeltaMaxMm(input: Pick<PlannerInput, 'baseWidthMm'>) {
  return getPedalTrayUsableWidthMm(input) / 2;
}

export function getPedalBrakeDeltaMaxMm(input: Pick<PlannerInput, 'baseWidthMm'>) {
  return getPedalTrayUsableWidthMm(input) / 2;
}

export function getPedalClutchDeltaMaxMm(input: Pick<PlannerInput, 'baseWidthMm'>) {
  return getPedalTrayUsableWidthMm(input) / 4;
}

export function clampPlannerInput(input: PlannerInput): PlannerInput {
  const baseLengthMm = clamp(
    input.baseLengthMm,
    PLANNER_DIMENSION_LIMITS.baseLengthMinMm,
    PLANNER_DIMENSION_LIMITS.baseLengthMaxMm
  );
  const baseWidthMm = clamp(
    input.baseWidthMm,
    PLANNER_DIMENSION_LIMITS.baseWidthMinMm,
    PLANNER_DIMENSION_LIMITS.baseWidthMaxMm
  );
  const baseFeetType = input.baseFeetType === 'rubber' ? 'rubber' : 'none';
  const baseFeetHeightMm =
    baseFeetType === 'none'
      ? 0
      : clamp(
          input.baseFeetHeightMm,
          PLANNER_DIMENSION_LIMITS.baseFeetHeightMinMm,
          PLANNER_DIMENSION_LIMITS.baseFeetHeightMaxMm
        );
  const seatBaseDepthMm = clamp(
    input.seatBaseDepthMm,
    PLANNER_DIMENSION_LIMITS.seatBaseDepthMinMm,
    Math.min(PLANNER_DIMENSION_LIMITS.seatBaseDepthMaxMm, baseLengthMm)
  );
  const steeringColumnDistanceMm = clamp(
    input.steeringColumnDistanceMm,
    PLANNER_LAYOUT.steeringColumnDistanceMinMm,
    getSteeringColumnDistanceMaxMm({
      baseLengthMm,
      seatBaseDepthMm,
    })
  );
  const pedalTrayDepthMm = clamp(
    input.pedalTrayDepthMm,
    PLANNER_DIMENSION_LIMITS.pedalTrayDepthMinMm,
    PLANNER_DIMENSION_LIMITS.pedalTrayDepthMaxMm
  );
  const pedalTrayDistanceMm = clamp(
    input.pedalTrayDistanceMm,
    getPedalTrayDistanceMinMm({
      baseLengthMm,
      seatBaseDepthMm,
      pedalTrayDepthMm,
    }),
    getPedalTrayDistanceMaxMm({
      baseLengthMm,
      seatBaseDepthMm,
      pedalTrayDepthMm,
    })
  );
  const { steeringColumnBaseHeightMm, steeringColumnHeightMm } = clampSteeringColumnHeights(input, 'column-height');

  return {
    ...input,
    baseLengthMm,
    baseWidthMm,
    baseFeetType,
    baseFeetHeightMm,
    seatBaseDepthMm,
    baseInnerBeamSpacingMm: clamp(
      input.baseInnerBeamSpacingMm,
      PLANNER_DIMENSION_LIMITS.baseInnerBeamSpacingMinMm,
      PLANNER_DIMENSION_LIMITS.baseInnerBeamSpacingMaxMm
    ),
    seatLengthMm: clamp(
      input.seatLengthMm,
      PLANNER_DIMENSION_LIMITS.seatLengthMinMm,
      PLANNER_DIMENSION_LIMITS.seatLengthMaxMm
    ),
    seatDeltaMm: clamp(
      input.seatDeltaMm,
      PLANNER_DIMENSION_LIMITS.seatDeltaMinMm,
      PLANNER_DIMENSION_LIMITS.seatDeltaMaxMm
    ),
    seatHeightFromBaseInnerBeamsMm: clamp(
      input.seatHeightFromBaseInnerBeamsMm,
      PLANNER_DIMENSION_LIMITS.seatHeightFromBaseInnerBeamsMinMm,
      PLANNER_DIMENSION_LIMITS.seatHeightFromBaseInnerBeamsMaxMm
    ),
    seatAngleDeg: clamp(
      input.seatAngleDeg,
      PLANNER_DIMENSION_LIMITS.seatAngleDegMin,
      PLANNER_DIMENSION_LIMITS.seatAngleDegMax
    ),
    backrestAngleDeg: clamp(
      input.backrestAngleDeg,
      PLANNER_DIMENSION_LIMITS.backrestAngleDegMin,
      PLANNER_DIMENSION_LIMITS.backrestAngleDegMax
    ),
    pedalTrayDepthMm,
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
    pedalLengthMm: clamp(
      input.pedalLengthMm,
      PLANNER_DIMENSION_LIMITS.pedalLengthMinMm,
      PLANNER_DIMENSION_LIMITS.pedalLengthMaxMm
    ),
    pedalAcceleratorDeltaMm: clamp(input.pedalAcceleratorDeltaMm, 0, getPedalAcceleratorDeltaMaxMm({ baseWidthMm })),
    pedalBrakeDeltaMm: clamp(input.pedalBrakeDeltaMm, 0, getPedalBrakeDeltaMaxMm({ baseWidthMm })),
    pedalClutchDeltaMm: clamp(input.pedalClutchDeltaMm, 0, getPedalClutchDeltaMaxMm({ baseWidthMm })),
    steeringColumnDistanceMm,
    steeringColumnBaseHeightMm,
    steeringColumnHeightMm,
    wheelHeightOffsetMm: clamp(
      input.wheelHeightOffsetMm,
      PLANNER_DIMENSION_LIMITS.wheelHeightOffsetMinMm,
      PLANNER_DIMENSION_LIMITS.wheelHeightOffsetMaxMm
    ),
    wheelAngleDeg: clamp(
      input.wheelAngleDeg,
      PLANNER_DIMENSION_LIMITS.wheelAngleDegMin,
      PLANNER_DIMENSION_LIMITS.wheelAngleDegMax
    ),
    wheelDistanceFromSteeringColumnMm: clamp(
      input.wheelDistanceFromSteeringColumnMm,
      PLANNER_DIMENSION_LIMITS.wheelDistanceFromSteeringColumnMinMm,
      PLANNER_DIMENSION_LIMITS.wheelDistanceFromSteeringColumnMaxMm
    ),
    wheelDiameterMm: clamp(
      input.wheelDiameterMm,
      PLANNER_DIMENSION_LIMITS.wheelDiameterMinMm,
      PLANNER_DIMENSION_LIMITS.wheelDiameterMaxMm
    ),
  };
}

export function derivePlannerGeometry(rawInput: PlannerInput): PlannerGeometry {
  return {
    input: clampPlannerInput(rawInput),
  };
}
