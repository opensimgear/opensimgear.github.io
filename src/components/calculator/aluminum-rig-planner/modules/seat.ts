/**
 * Seat module – generates 3D mesh specs for the racing seat (cushion + backrest).
 * Uses bounding-box templates rotated around the seat pivot.
 */

import { BASE_MODULE_LAYOUT } from '../constants/planner';
import { BASE_BEAM_HEIGHT_MM, HALF_PROFILE_SHORT_MM, PROFILE_SHORT_MM } from '../constants/profile';
import {
  BACKREST_HEADREST_BOTTOM_MM,
  BACKREST_HEADREST_WIDTH_DELTA_MM,
  BACKREST_HEADREST_WIDTH_LIMITS_MM,
  BACKREST_HEIGHT_MM,
  BACKREST_LOWER_PANEL_TOP_MM,
  BACKREST_LOWER_WIDTH_DELTA_MM,
  BACKREST_LOWER_WIDTH_LIMITS_MM,
  BACKREST_THICKNESS_MM,
  BACKREST_UPPER_PANEL_BOTTOM_MM,
  BACKREST_UPPER_PANEL_TOP_MM,
  BACKREST_UPPER_WIDTH_DELTA_MM,
  BACKREST_UPPER_WIDTH_LIMITS_MM,
  SEAT_BASE_THICKNESS_MM,
  SEAT_CORNER_RADIUS_MM,
  SEAT_CORNER_SEGMENTS,
  SEAT_FRONT_ANCHOR_REAR_OFFSET_MM,
  SEAT_INNER_WIDTH_MARGIN_MM,
  SEAT_INNER_WIDTH_MIN_MM,
  SEAT_OUTER_WIDTH_BASE_INSET_MM,
  SEAT_OUTER_WIDTH_INNER_BEAM_PAD_MM,
  SEAT_OUTER_WIDTH_MAX_MM,
  SEAT_OUTER_WIDTH_MIN_MM,
  SEAT_SIDE_BOLSTER_END_INSET_MM,
  SEAT_SIDE_BOLSTER_HEIGHT_MM,
  SEAT_SIDE_BOLSTER_START_MM,
  SEAT_SIDE_BOLSTER_WIDTH_MM,
  SEAT_SOLID_OVERLAP_MM,
  SHOULDER_WING_HEIGHT_MM,
  SHOULDER_WING_INSET_MM,
  SHOULDER_WING_WIDTH_MM,
  SHOULDER_WING_Z_START_MM,
  UPHOLSTERY_COLOR,
  UPHOLSTERY_MATERIAL,
} from '../constants/seat';
import type { PlannerInput } from '../types';
import { clamp, mm, toRad } from './math';
import type { MeshSpec } from './shared';

type SeatTemplate = {
  id: string;
  color: string;
  localPosition: [number, number, number];
  size: [number, number, number];
  localRotationZDeg?: number;
  metalness?: number;
  roughness?: number;
  cornerRadius?: number;
  cornerSegments?: number;
};

type SeatBoundsTemplate = Omit<SeatTemplate, 'localPosition' | 'size'> & {
  xBoundsMm: [number, number];
  yBoundsMm: [number, number];
  zBoundsMm: [number, number];
  cornerRadiusMm?: number;
};

/** Convert axis-aligned bounds into a centered position + size template. */
function createBoundsTemplate(template: SeatBoundsTemplate): SeatTemplate {
  return {
    id: template.id,
    color: template.color,
    localPosition: [
      mm((template.xBoundsMm[0] + template.xBoundsMm[1]) / 2),
      mm((template.yBoundsMm[0] + template.yBoundsMm[1]) / 2),
      mm((template.zBoundsMm[0] + template.zBoundsMm[1]) / 2),
    ],
    size: [
      mm(template.xBoundsMm[1] - template.xBoundsMm[0]),
      mm(template.yBoundsMm[1] - template.yBoundsMm[0]),
      mm(template.zBoundsMm[1] - template.zBoundsMm[0]),
    ],
    localRotationZDeg: template.localRotationZDeg,
    metalness: template.metalness,
    roughness: template.roughness,
    cornerRadius: template.cornerRadiusMm ? mm(template.cornerRadiusMm) : undefined,
    cornerSegments: template.cornerSegments,
  };
}

/** Create symmetric Y bounds centered on zero. */
function createCenteredBounds(widthMm: number): [number, number] {
  return [-widthMm / 2, widthMm / 2];
}

/** Rotate a local-space point around the Y axis (XZ rotation). */
function rotateLocalPoint([x, y, z]: [number, number, number], angleRad: number): [number, number, number] {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return [x * cos - z * sin, y, x * sin + z * cos];
}

/** Transform an array of seat templates into world-space MeshSpecs around a pivot. */
function createSeatParts(
  prefix: string,
  pivot: [number, number, number],
  baseRotationRad: number,
  templates: SeatTemplate[]
): MeshSpec[] {
  return templates.map((template) => {
    const localPosition = rotateLocalPoint(template.localPosition, baseRotationRad);

    return {
      id: `${prefix}-${template.id}`,
      position: [pivot[0] + localPosition[0], pivot[1] + localPosition[1], pivot[2] + localPosition[2]] as [
        number,
        number,
        number,
      ],
      size: template.size,
      rotation: [0, -(baseRotationRad + toRad(template.localRotationZDeg ?? 0)), 0] as [number, number, number],
      materialKind: 'plastic',
      color: template.color,
      metalness: template.metalness,
      roughness: template.roughness,
      cornerRadius: template.cornerRadius,
      cornerSegments: template.cornerSegments,
    };
  });
}

/** Build the full set of seat + backrest meshes from planner input. */
export function createSeatModule(input: PlannerInput): MeshSpec[] {
  const seatAngleRad = toRad(input.seatAngleDeg);
  const backrestAngleRad = toRad(input.seatAngleDeg + input.backrestAngleDeg - 90);

  const outerSeatWidthMm = clamp(
    Math.max(
      input.baseInnerBeamSpacingMm + SEAT_OUTER_WIDTH_INNER_BEAM_PAD_MM,
      input.baseWidthMm - SEAT_OUTER_WIDTH_BASE_INSET_MM
    ),
    SEAT_OUTER_WIDTH_MIN_MM,
    SEAT_OUTER_WIDTH_MAX_MM
  );
  const seatDepthMm = input.seatLengthMm;
  const innerSeatWidthMm = clamp(
    outerSeatWidthMm - SEAT_SIDE_BOLSTER_WIDTH_MM * 2 + SEAT_SOLID_OVERLAP_MM * 2,
    SEAT_INNER_WIDTH_MIN_MM,
    outerSeatWidthMm - SEAT_INNER_WIDTH_MARGIN_MM
  );
  const seatFrontAnchorLocalXmm = seatDepthMm - SEAT_FRONT_ANCHOR_REAR_OFFSET_MM;
  const seatCrossMemberCenterXmm = Math.max(
    BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm,
    input.seatBaseDepthMm - BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm
  );
  const seatFrontAnchorXmm = seatCrossMemberCenterXmm + HALF_PROFILE_SHORT_MM + input.seatDeltaMm;
  const seatRearPivotXmm = seatFrontAnchorXmm - Math.cos(seatAngleRad) * seatFrontAnchorLocalXmm;
  const seatRearPivotZmm = BASE_BEAM_HEIGHT_MM + PROFILE_SHORT_MM + input.seatHeightFromBaseInnerBeamsMm;
  const seatPivot: [number, number, number] = [mm(seatRearPivotXmm), 0, mm(seatRearPivotZmm)];

  const lowerBackWidthMm = clamp(
    innerSeatWidthMm + BACKREST_LOWER_WIDTH_DELTA_MM,
    BACKREST_LOWER_WIDTH_LIMITS_MM.min,
    BACKREST_LOWER_WIDTH_LIMITS_MM.max
  );
  const upperBackWidthMm = clamp(
    innerSeatWidthMm - BACKREST_UPPER_WIDTH_DELTA_MM,
    BACKREST_UPPER_WIDTH_LIMITS_MM.min,
    BACKREST_UPPER_WIDTH_LIMITS_MM.max
  );
  const headrestWidthMm = clamp(
    innerSeatWidthMm + BACKREST_HEADREST_WIDTH_DELTA_MM,
    BACKREST_HEADREST_WIDTH_LIMITS_MM.min,
    BACKREST_HEADREST_WIDTH_LIMITS_MM.max
  );
  const backrestXBoundsMm: [number, number] = [-BACKREST_THICKNESS_MM / 2, BACKREST_THICKNESS_MM / 2];
  const seatBaseEndMm = seatFrontAnchorLocalXmm;
  const seatSideBolsterEndMm = seatDepthMm - SEAT_SIDE_BOLSTER_END_INSET_MM + SEAT_SOLID_OVERLAP_MM;
  const seatTemplates: SeatTemplate[] = [
    createBoundsTemplate({
      id: 'base-main',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: [0, seatBaseEndMm],
      yBoundsMm: createCenteredBounds(innerSeatWidthMm),
      zBoundsMm: [0, SEAT_BASE_THICKNESS_MM],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: SEAT_CORNER_RADIUS_MM,
      cornerSegments: SEAT_CORNER_SEGMENTS,
    }),
    createBoundsTemplate({
      id: 'left-bolster',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: [SEAT_SIDE_BOLSTER_START_MM, seatSideBolsterEndMm],
      yBoundsMm: [outerSeatWidthMm / 2 - SEAT_SIDE_BOLSTER_WIDTH_MM, outerSeatWidthMm / 2],
      zBoundsMm: [0, SEAT_SIDE_BOLSTER_HEIGHT_MM],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: SEAT_CORNER_RADIUS_MM,
      cornerSegments: SEAT_CORNER_SEGMENTS,
    }),
    createBoundsTemplate({
      id: 'right-bolster',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: [SEAT_SIDE_BOLSTER_START_MM, seatSideBolsterEndMm],
      yBoundsMm: [-outerSeatWidthMm / 2, -outerSeatWidthMm / 2 + SEAT_SIDE_BOLSTER_WIDTH_MM],
      zBoundsMm: [0, SEAT_SIDE_BOLSTER_HEIGHT_MM],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: SEAT_CORNER_RADIUS_MM,
      cornerSegments: SEAT_CORNER_SEGMENTS,
    }),
  ];

  const backrestTemplates: SeatTemplate[] = [
    createBoundsTemplate({
      id: 'lower-panel',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: backrestXBoundsMm,
      yBoundsMm: createCenteredBounds(lowerBackWidthMm),
      zBoundsMm: [0, BACKREST_LOWER_PANEL_TOP_MM],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: SEAT_CORNER_RADIUS_MM,
      cornerSegments: SEAT_CORNER_SEGMENTS,
    }),
    createBoundsTemplate({
      id: 'upper-panel',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: backrestXBoundsMm,
      yBoundsMm: createCenteredBounds(upperBackWidthMm),
      zBoundsMm: [BACKREST_UPPER_PANEL_BOTTOM_MM, BACKREST_UPPER_PANEL_TOP_MM],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: SEAT_CORNER_RADIUS_MM,
      cornerSegments: SEAT_CORNER_SEGMENTS,
    }),
    createBoundsTemplate({
      id: 'headrest',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: backrestXBoundsMm,
      yBoundsMm: createCenteredBounds(headrestWidthMm),
      zBoundsMm: [BACKREST_HEADREST_BOTTOM_MM, BACKREST_HEIGHT_MM],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: SEAT_CORNER_RADIUS_MM,
      cornerSegments: SEAT_CORNER_SEGMENTS,
    }),
    createBoundsTemplate({
      id: 'left-shoulder-wing',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: backrestXBoundsMm,
      yBoundsMm: [
        upperBackWidthMm / 2 - SHOULDER_WING_INSET_MM,
        upperBackWidthMm / 2 + SHOULDER_WING_WIDTH_MM - SHOULDER_WING_INSET_MM,
      ],
      zBoundsMm: [SHOULDER_WING_Z_START_MM, SHOULDER_WING_Z_START_MM + SHOULDER_WING_HEIGHT_MM],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: SEAT_CORNER_RADIUS_MM,
      cornerSegments: SEAT_CORNER_SEGMENTS,
    }),
    createBoundsTemplate({
      id: 'right-shoulder-wing',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: backrestXBoundsMm,
      yBoundsMm: [
        -upperBackWidthMm / 2 - SHOULDER_WING_WIDTH_MM + SHOULDER_WING_INSET_MM,
        -upperBackWidthMm / 2 + SHOULDER_WING_INSET_MM,
      ],
      zBoundsMm: [SHOULDER_WING_Z_START_MM, SHOULDER_WING_Z_START_MM + SHOULDER_WING_HEIGHT_MM],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: SEAT_CORNER_RADIUS_MM,
      cornerSegments: SEAT_CORNER_SEGMENTS,
    }),
  ];

  return [
    ...createSeatParts('seat', seatPivot, seatAngleRad, seatTemplates),
    ...createSeatParts('backrest', seatPivot, backrestAngleRad, backrestTemplates),
  ];
}
