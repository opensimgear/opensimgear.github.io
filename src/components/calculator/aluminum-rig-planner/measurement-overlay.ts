import {
  BASE_BEAM_HEIGHT_MM,
  PEDAL_TRAY_LAYOUT,
  PLANNER_LAYOUT,
  PROFILE_SHORT_MM,
  UPRIGHT_BEAM_DEPTH_MM,
} from './constants';
import { centeredZ, mm } from './modules/shared';
import type { PlannerInput } from './types';

export const MEASUREMENT_OVERLAY_COLOR = '#2563eb';
const HORIZONTAL_ARROW_CLEARANCE_MM = 70;
const VERTICAL_ARROW_CLEARANCE_MM = 40;

export const PLANNER_MEASUREMENT_KEYS = [
  'baseLengthMm',
  'baseWidthMm',
  'seatBaseDepthMm',
  'baseInnerBeamSpacingMm',
  'pedalTrayDepthMm',
  'pedalTrayDistanceMm',
  'steeringColumnDistanceMm',
  'steeringColumnBaseHeightMm',
  'steeringColumnHeightMm',
  'wheelHeightOffsetMm',
  'wheelDistanceFromSteeringColumnMm',
  'wheelDiameterMm',
] as const satisfies readonly (keyof PlannerInput)[];

export type PlannerMeasurementKey = (typeof PLANNER_MEASUREMENT_KEYS)[number];

export type PlannerMeasurementOverlay = {
  key: PlannerMeasurementKey;
  start: [number, number, number];
  end: [number, number, number];
  color: string;
};

function horizontalArrowY(clearanceMm = HORIZONTAL_ARROW_CLEARANCE_MM) {
  return mm(BASE_BEAM_HEIGHT_MM + clearanceMm);
}

function verticalArrowX(input: PlannerInput) {
  return mm(input.seatBaseDepthMm + input.steeringColumnDistanceMm + UPRIGHT_BEAM_DEPTH_MM);
}

function rightSideArrowZ(input: PlannerInput, clearanceMm = VERTICAL_ARROW_CLEARANCE_MM) {
  return centeredZ(input.baseWidthMm + clearanceMm, input.baseWidthMm);
}

function steeringColumnTopMm(input: PlannerInput) {
  return (
    BASE_BEAM_HEIGHT_MM +
    Math.max(
      PROFILE_SHORT_MM,
      input.steeringColumnHeightMm,
      input.steeringColumnBaseHeightMm + PLANNER_LAYOUT.steeringColumnClearanceAboveBaseMm
    )
  );
}

function steeringColumnCenterXmm(input: PlannerInput) {
  return input.seatBaseDepthMm + input.steeringColumnDistanceMm + UPRIGHT_BEAM_DEPTH_MM;
}

function wheelCenterXmm(input: PlannerInput) {
  return steeringColumnCenterXmm(input) + input.wheelDistanceFromSteeringColumnMm;
}

function wheelCenterYmm(input: PlannerInput) {
  return BASE_BEAM_HEIGHT_MM + input.steeringColumnBaseHeightMm + input.wheelHeightOffsetMm;
}

export function createPlannerMeasurementOverlay(
  input: PlannerInput,
  key: PlannerMeasurementKey
): PlannerMeasurementOverlay {
  const baseCenterZ = centeredZ(input.baseWidthMm / 2, input.baseWidthMm);

  switch (key) {
    case 'baseLengthMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [0, horizontalArrowY(), centeredZ(10, input.baseWidthMm)],
        end: [mm(input.baseLengthMm), horizontalArrowY(), centeredZ(10, input.baseWidthMm)],
      };

    case 'baseWidthMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [mm(40), horizontalArrowY(), centeredZ(0, input.baseWidthMm)],
        end: [mm(40), horizontalArrowY(), centeredZ(input.baseWidthMm, input.baseWidthMm)],
      };

    case 'seatBaseDepthMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [0, horizontalArrowY(), centeredZ(input.baseInnerBeamSpacingMm / 2, input.baseWidthMm)],
        end: [
          mm(input.seatBaseDepthMm),
          horizontalArrowY(),
          centeredZ(input.baseInnerBeamSpacingMm / 2, input.baseWidthMm),
        ],
      };

    case 'baseInnerBeamSpacingMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [
          mm(input.seatBaseDepthMm / 2),
          horizontalArrowY(PROFILE_SHORT_MM + 30),
          centeredZ(input.baseWidthMm / 2 - input.baseInnerBeamSpacingMm / 2, input.baseWidthMm),
        ],
        end: [
          mm(input.seatBaseDepthMm / 2),
          horizontalArrowY(PROFILE_SHORT_MM + 30),
          centeredZ(input.baseWidthMm / 2 + input.baseInnerBeamSpacingMm / 2, input.baseWidthMm),
        ],
      };

    case 'pedalTrayDepthMm': {
      const pedalTrayRearFaceXm = mm(input.seatBaseDepthMm + input.pedalTrayDistanceMm);

      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [
          pedalTrayRearFaceXm,
          horizontalArrowY(),
          centeredZ(PEDAL_TRAY_LAYOUT.sideBeamCenterOffsetMm, input.baseWidthMm),
        ],
        end: [
          pedalTrayRearFaceXm + mm(input.pedalTrayDepthMm),
          horizontalArrowY(),
          centeredZ(PEDAL_TRAY_LAYOUT.sideBeamCenterOffsetMm, input.baseWidthMm),
        ],
      };
    }

    case 'pedalTrayDistanceMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [mm(input.seatBaseDepthMm), horizontalArrowY(), baseCenterZ],
        end: [mm(input.seatBaseDepthMm + input.pedalTrayDistanceMm), horizontalArrowY(), baseCenterZ],
      };

    case 'steeringColumnDistanceMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [mm(input.seatBaseDepthMm), horizontalArrowY(PROFILE_SHORT_MM + 50), baseCenterZ],
        end: [
          mm(input.seatBaseDepthMm + input.steeringColumnDistanceMm),
          horizontalArrowY(PROFILE_SHORT_MM + 50),
          baseCenterZ,
        ],
      };

    case 'steeringColumnBaseHeightMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [verticalArrowX(input), mm(BASE_BEAM_HEIGHT_MM), baseCenterZ],
        end: [verticalArrowX(input), mm(BASE_BEAM_HEIGHT_MM + input.steeringColumnBaseHeightMm), baseCenterZ],
      };

    case 'steeringColumnHeightMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [
          verticalArrowX(input) + mm(VERTICAL_ARROW_CLEARANCE_MM),
          mm(BASE_BEAM_HEIGHT_MM),
          rightSideArrowZ(input),
        ],
        end: [
          verticalArrowX(input) + mm(VERTICAL_ARROW_CLEARANCE_MM),
          mm(steeringColumnTopMm(input)),
          rightSideArrowZ(input),
        ],
      };

    case 'wheelHeightOffsetMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [mm(wheelCenterXmm(input)), mm(BASE_BEAM_HEIGHT_MM + input.steeringColumnBaseHeightMm), baseCenterZ],
        end: [
          mm(wheelCenterXmm(input)),
          mm(wheelCenterYmm(input)),
          baseCenterZ,
        ],
      };

    case 'wheelDistanceFromSteeringColumnMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [mm(steeringColumnCenterXmm(input)), horizontalArrowY(PROFILE_SHORT_MM + 90), baseCenterZ],
        end: [mm(wheelCenterXmm(input)), horizontalArrowY(PROFILE_SHORT_MM + 90), baseCenterZ],
      };

    case 'wheelDiameterMm': {
      const wheelAngleRad = (-input.wheelAngleDeg * Math.PI) / 180;
      const wheelRadiusMm = input.wheelDiameterMm / 2;

      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [mm(wheelCenterXmm(input)), mm(wheelCenterYmm(input)), baseCenterZ],
        end: [
          mm(wheelCenterXmm(input) - Math.sin(wheelAngleRad) * wheelRadiusMm),
          mm(wheelCenterYmm(input) + Math.cos(wheelAngleRad) * wheelRadiusMm),
          baseCenterZ,
        ],
      };
    }
  }
}
