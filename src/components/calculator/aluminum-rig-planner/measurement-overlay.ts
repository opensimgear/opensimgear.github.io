import {
  BASE_BEAM_HEIGHT_MM,
  PEDAL_TRAY_LAYOUT,
  PLANNER_LAYOUT,
  PROFILE_SHORT_MM,
  UPRIGHT_BEAM_DEPTH_MM,
} from './constants';
import { centeredY, mm } from './modules/shared';
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

function horizontalArrowZ(clearanceMm = HORIZONTAL_ARROW_CLEARANCE_MM) {
  return mm(BASE_BEAM_HEIGHT_MM + clearanceMm);
}

function verticalArrowX(input: PlannerInput) {
  return mm(input.seatBaseDepthMm + input.steeringColumnDistanceMm + UPRIGHT_BEAM_DEPTH_MM);
}

function rightSideArrowY(input: PlannerInput, clearanceMm = VERTICAL_ARROW_CLEARANCE_MM) {
  return centeredY(input.baseWidthMm + clearanceMm, input.baseWidthMm);
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

function wheelCenterZmm(input: PlannerInput) {
  return BASE_BEAM_HEIGHT_MM + input.steeringColumnBaseHeightMm + input.wheelHeightOffsetMm;
}

export function createPlannerMeasurementOverlay(
  input: PlannerInput,
  key: PlannerMeasurementKey
): PlannerMeasurementOverlay {
  const baseCenterY = centeredY(input.baseWidthMm / 2, input.baseWidthMm);

  switch (key) {
    case 'baseLengthMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [0, centeredY(10, input.baseWidthMm), horizontalArrowZ()],
        end: [mm(input.baseLengthMm), centeredY(10, input.baseWidthMm), horizontalArrowZ()],
      };

    case 'baseWidthMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [mm(40), centeredY(0, input.baseWidthMm), horizontalArrowZ()],
        end: [mm(40), centeredY(input.baseWidthMm, input.baseWidthMm), horizontalArrowZ()],
      };

    case 'seatBaseDepthMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [0, centeredY(input.baseInnerBeamSpacingMm / 2, input.baseWidthMm), horizontalArrowZ()],
        end: [
          mm(input.seatBaseDepthMm),
          centeredY(input.baseInnerBeamSpacingMm / 2, input.baseWidthMm),
          horizontalArrowZ(),
        ],
      };

    case 'baseInnerBeamSpacingMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [
          mm(input.seatBaseDepthMm / 2),
          centeredY(input.baseWidthMm / 2 - input.baseInnerBeamSpacingMm / 2, input.baseWidthMm),
          horizontalArrowZ(PROFILE_SHORT_MM + 30),
        ],
        end: [
          mm(input.seatBaseDepthMm / 2),
          centeredY(input.baseWidthMm / 2 + input.baseInnerBeamSpacingMm / 2, input.baseWidthMm),
          horizontalArrowZ(PROFILE_SHORT_MM + 30),
        ],
      };

    case 'pedalTrayDepthMm': {
      const pedalTrayRearFaceXm = mm(input.seatBaseDepthMm + input.pedalTrayDistanceMm);

      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [
          pedalTrayRearFaceXm,
          centeredY(PEDAL_TRAY_LAYOUT.sideBeamCenterOffsetMm, input.baseWidthMm),
          horizontalArrowZ(),
        ],
        end: [
          pedalTrayRearFaceXm + mm(input.pedalTrayDepthMm),
          centeredY(PEDAL_TRAY_LAYOUT.sideBeamCenterOffsetMm, input.baseWidthMm),
          horizontalArrowZ(),
        ],
      };
    }

    case 'pedalTrayDistanceMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [mm(input.seatBaseDepthMm), baseCenterY, horizontalArrowZ()],
        end: [mm(input.seatBaseDepthMm + input.pedalTrayDistanceMm), baseCenterY, horizontalArrowZ()],
      };

    case 'steeringColumnDistanceMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [mm(input.seatBaseDepthMm), baseCenterY, horizontalArrowZ(PROFILE_SHORT_MM + 50)],
        end: [
          mm(input.seatBaseDepthMm + input.steeringColumnDistanceMm),
          baseCenterY,
          horizontalArrowZ(PROFILE_SHORT_MM + 50),
        ],
      };

    case 'steeringColumnBaseHeightMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [verticalArrowX(input), baseCenterY, mm(BASE_BEAM_HEIGHT_MM)],
        end: [verticalArrowX(input), baseCenterY, mm(BASE_BEAM_HEIGHT_MM + input.steeringColumnBaseHeightMm)],
      };

    case 'steeringColumnHeightMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [
          verticalArrowX(input) + mm(VERTICAL_ARROW_CLEARANCE_MM),
          rightSideArrowY(input),
          mm(BASE_BEAM_HEIGHT_MM),
        ],
        end: [
          verticalArrowX(input) + mm(VERTICAL_ARROW_CLEARANCE_MM),
          rightSideArrowY(input),
          mm(steeringColumnTopMm(input)),
        ],
      };

    case 'wheelHeightOffsetMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [mm(wheelCenterXmm(input)), baseCenterY, mm(BASE_BEAM_HEIGHT_MM + input.steeringColumnBaseHeightMm)],
        end: [mm(wheelCenterXmm(input)), baseCenterY, mm(wheelCenterZmm(input))],
      };

    case 'wheelDistanceFromSteeringColumnMm':
      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [mm(steeringColumnCenterXmm(input)), baseCenterY, horizontalArrowZ(PROFILE_SHORT_MM + 90)],
        end: [mm(wheelCenterXmm(input)), baseCenterY, horizontalArrowZ(PROFILE_SHORT_MM + 90)],
      };

    case 'wheelDiameterMm': {
      const wheelAngleRad = (-input.wheelAngleDeg * Math.PI) / 180;
      const wheelRadiusMm = input.wheelDiameterMm / 2;

      return {
        key,
        color: MEASUREMENT_OVERLAY_COLOR,
        start: [mm(wheelCenterXmm(input)), baseCenterY, mm(wheelCenterZmm(input))],
        end: [
          mm(wheelCenterXmm(input) - Math.sin(wheelAngleRad) * wheelRadiusMm),
          baseCenterY,
          mm(wheelCenterZmm(input) + Math.cos(wheelAngleRad) * wheelRadiusMm),
        ],
      };
    }
  }
}
