import { BASE_MODULE_LAYOUT } from '../constants/planner';
import { BASE_BEAM_HEIGHT_MM, HALF_PROFILE_SHORT_MM, PROFILE_SHORT_MM } from '../constants/profile';
import type { PlannerInput } from '../types';
import { mm, type MeshSpec } from './shared';

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

const UPHOLSTERY_COLOR = '#141414';
const UPHOLSTERY_MATERIAL = {
  metalness: 0.02,
  roughness: 0.94,
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

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

function createCenteredBounds(widthMm: number): [number, number] {
  return [-widthMm / 2, widthMm / 2];
}

function rotateLocalPoint([x, y, z]: [number, number, number], angleRad: number): [number, number, number] {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return [x * cos - z * sin, y, x * sin + z * cos];
}

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

export function createSeatModule(input: PlannerInput): MeshSpec[] {
  const seatAngleRad = toRad(input.seatAngleDeg);
  const backrestAngleRad = toRad(input.seatAngleDeg + input.backrestAngleDeg - 90);

  const outerSeatWidthMm = clamp(Math.max(input.baseInnerBeamSpacingMm + 120, input.baseWidthMm - 30), 430, 530);
  const solidOverlapMm = 6;
  const seatDepthMm = input.seatLengthMm;
  const seatBaseThicknessMm = 46;
  const seatSideBolsterWidthMm = 52;
  const seatSideBolsterHeightMm = 118;
  const seatCornerRadiusMm = 14;
  const seatCornerSegments = 5;
  const innerSeatWidthMm = clamp(
    outerSeatWidthMm - seatSideBolsterWidthMm * 2 + solidOverlapMm * 2,
    300,
    outerSeatWidthMm - 40
  );
  const seatFrontAnchorLocalXmm = seatDepthMm - 38;
  const seatCrossMemberCenterXmm = Math.max(
    BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm,
    input.seatBaseDepthMm - BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm
  );
  const seatFrontAnchorXmm = seatCrossMemberCenterXmm + HALF_PROFILE_SHORT_MM + input.seatDeltaMm;
  const seatRearPivotXmm = seatFrontAnchorXmm - Math.cos(seatAngleRad) * seatFrontAnchorLocalXmm;
  const seatRearPivotZmm = BASE_BEAM_HEIGHT_MM + PROFILE_SHORT_MM + input.seatHeightFromBaseInnerBeamsMm;
  const seatPivot: [number, number, number] = [mm(seatRearPivotXmm), 0, mm(seatRearPivotZmm)];

  const backrestThicknessMm = 54;
  const backrestHeightMm = 760;
  const lowerBackWidthMm = clamp(innerSeatWidthMm + 46, 306, 390);
  const upperBackWidthMm = clamp(innerSeatWidthMm - 12, 248, 312);
  const headrestWidthMm = clamp(innerSeatWidthMm + 26, 268, 328);
  const shoulderWingWidthMm = 96;
  const shoulderWingHeightMm = 176;
  const backrestXBoundsMm: [number, number] = [-backrestThicknessMm / 2, backrestThicknessMm / 2];
  const seatBaseEndMm = seatFrontAnchorLocalXmm;
  const seatSideBolsterStartMm = 30;
  const seatSideBolsterEndMm = seatDepthMm - 70 + solidOverlapMm;
  const seatTemplates: SeatTemplate[] = [
    createBoundsTemplate({
      id: 'base-main',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: [0, seatBaseEndMm],
      yBoundsMm: createCenteredBounds(innerSeatWidthMm),
      zBoundsMm: [0, seatBaseThicknessMm],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: seatCornerRadiusMm,
      cornerSegments: seatCornerSegments,
    }),
    createBoundsTemplate({
      id: 'left-bolster',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: [seatSideBolsterStartMm, seatSideBolsterEndMm],
      yBoundsMm: [outerSeatWidthMm / 2 - seatSideBolsterWidthMm, outerSeatWidthMm / 2],
      zBoundsMm: [0, seatSideBolsterHeightMm],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: seatCornerRadiusMm,
      cornerSegments: seatCornerSegments,
    }),
    createBoundsTemplate({
      id: 'right-bolster',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: [seatSideBolsterStartMm, seatSideBolsterEndMm],
      yBoundsMm: [-outerSeatWidthMm / 2, -outerSeatWidthMm / 2 + seatSideBolsterWidthMm],
      zBoundsMm: [0, seatSideBolsterHeightMm],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: seatCornerRadiusMm,
      cornerSegments: seatCornerSegments,
    }),
  ];

  const backrestTemplates: SeatTemplate[] = [
    createBoundsTemplate({
      id: 'lower-panel',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: backrestXBoundsMm,
      yBoundsMm: createCenteredBounds(lowerBackWidthMm),
      zBoundsMm: [0, 486],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: seatCornerRadiusMm,
      cornerSegments: seatCornerSegments,
    }),
    createBoundsTemplate({
      id: 'upper-panel',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: backrestXBoundsMm,
      yBoundsMm: createCenteredBounds(upperBackWidthMm),
      zBoundsMm: [480, 652],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: seatCornerRadiusMm,
      cornerSegments: seatCornerSegments,
    }),
    createBoundsTemplate({
      id: 'headrest',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: backrestXBoundsMm,
      yBoundsMm: createCenteredBounds(headrestWidthMm),
      zBoundsMm: [646, backrestHeightMm],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: seatCornerRadiusMm,
      cornerSegments: seatCornerSegments,
    }),
    createBoundsTemplate({
      id: 'left-shoulder-wing',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: backrestXBoundsMm,
      yBoundsMm: [upperBackWidthMm / 2 - 24, upperBackWidthMm / 2 + shoulderWingWidthMm - 24],
      zBoundsMm: [432, 432 + shoulderWingHeightMm],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: seatCornerRadiusMm,
      cornerSegments: seatCornerSegments,
    }),
    createBoundsTemplate({
      id: 'right-shoulder-wing',
      color: UPHOLSTERY_COLOR,
      xBoundsMm: backrestXBoundsMm,
      yBoundsMm: [-upperBackWidthMm / 2 - shoulderWingWidthMm + 24, -upperBackWidthMm / 2 + 24],
      zBoundsMm: [432, 432 + shoulderWingHeightMm],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
      cornerRadiusMm: seatCornerRadiusMm,
      cornerSegments: seatCornerSegments,
    }),
  ];

  return [
    ...createSeatParts('seat', seatPivot, seatAngleRad, seatTemplates),
    ...createSeatParts('backrest', seatPivot, backrestAngleRad, backrestTemplates),
  ];
}
