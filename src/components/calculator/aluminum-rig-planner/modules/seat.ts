import { BASE_BEAM_HEIGHT_MM, BASE_MODULE_LAYOUT, PROFILE_SHORT_MM } from '../constants';
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
};

const UPHOLSTERY_COLOR = '#141414';
const TRIM_COLOR = '#232529';
const BEZEL_COLOR = '#2d3035';
const UPHOLSTERY_MATERIAL = {
  metalness: 0.02,
  roughness: 0.94,
} as const;
const TRIM_MATERIAL = {
  metalness: 0.08,
  roughness: 0.72,
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function rotateLocalPoint([x, y, z]: [number, number, number], angleRad: number): [number, number, number] {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return [x * cos - y * sin, x * sin + y * cos, z];
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
      rotation: [0, 0, baseRotationRad + toRad(template.localRotationZDeg ?? 0)] as [number, number, number],
      materialKind: 'plastic',
      color: template.color,
      metalness: template.metalness,
      roughness: template.roughness,
    };
  });
}

export function createSeatModule(input: PlannerInput): MeshSpec[] {
  const seatAngleRad = toRad(input.seatAngleDeg);
  const backrestAngleRad = toRad(input.seatAngleDeg + input.backrestAngleDeg - 90);

  const outerSeatWidthMm = clamp(Math.max(input.baseInnerBeamSpacingMm + 120, input.baseWidthMm - 30), 430, 530);
  const innerSeatWidthMm = clamp(outerSeatWidthMm - 132, 260, 340);
  const seatDepthMm = input.seatLengthMm;
  const seatBaseThicknessMm = 46;
  const seatFrontBolsterHeightMm = 88;
  const seatRearRollHeightMm = 58;
  const seatSideBolsterWidthMm = 58;
  const seatSideBolsterHeightMm = 122;
  const seatSideBolsterLengthMm = clamp(seatDepthMm * 0.78, 260, 360);
  const seatFrontAnchorLocalXmm = seatDepthMm - 38;
  const seatFrontAnchorXmm = Math.max(
    BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm,
    input.seatBaseDepthMm - BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm
  );
  const seatRearPivotXmm = seatFrontAnchorXmm - Math.cos(seatAngleRad) * seatFrontAnchorLocalXmm;
  const seatRearPivotYmm = BASE_BEAM_HEIGHT_MM + PROFILE_SHORT_MM + input.seatHeightFromBaseInnerBeamsMm;
  const seatPivot: [number, number, number] = [mm(seatRearPivotXmm), mm(seatRearPivotYmm), 0];

  const backrestThicknessMm = 54;
  const backrestHeightMm = 760;
  const lowerBackWidthMm = clamp(innerSeatWidthMm + 46, 306, 390);
  const upperBackWidthMm = clamp(innerSeatWidthMm - 12, 248, 312);
  const headrestWidthMm = clamp(innerSeatWidthMm + 26, 268, 328);
  const backrestLowerBolsterWidthMm = 72;
  const shoulderWingWidthMm = 120;
  const shoulderWingHeightMm = 182;
  const harnessFrameHeightMm = 84;
  const harnessFrameWidthMm = 60;
  const harnessFrameBarMm = 8;
  const harnessFrameXOffsetMm = backrestThicknessMm / 2 + 4;
  const harnessFrameCenterOffsetZMm = 78;

  const seatTemplates: SeatTemplate[] = [
    {
      id: 'base-main',
      color: UPHOLSTERY_COLOR,
      localPosition: [mm(seatDepthMm * 0.42), mm(seatBaseThicknessMm / 2), 0],
      size: [mm(seatDepthMm * 0.74), mm(seatBaseThicknessMm), mm(innerSeatWidthMm)],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
    },
    {
      id: 'front-bolster',
      color: UPHOLSTERY_COLOR,
      localPosition: [mm(seatFrontAnchorLocalXmm), mm(seatFrontBolsterHeightMm / 2), 0],
      size: [mm(76), mm(seatFrontBolsterHeightMm), mm(innerSeatWidthMm + 30)],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
    },
    {
      id: 'rear-roll',
      color: TRIM_COLOR,
      localPosition: [mm(30), mm(seatRearRollHeightMm / 2), 0],
      size: [mm(60), mm(seatRearRollHeightMm), mm(innerSeatWidthMm + 44)],
      metalness: TRIM_MATERIAL.metalness,
      roughness: TRIM_MATERIAL.roughness,
    },
    {
      id: 'left-bolster',
      color: UPHOLSTERY_COLOR,
      localPosition: [
        mm(seatDepthMm * 0.48),
        mm(seatSideBolsterHeightMm / 2),
        -mm(outerSeatWidthMm / 2 - seatSideBolsterWidthMm / 2),
      ],
      size: [mm(seatSideBolsterLengthMm), mm(seatSideBolsterHeightMm), mm(seatSideBolsterWidthMm)],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
    },
    {
      id: 'right-bolster',
      color: UPHOLSTERY_COLOR,
      localPosition: [
        mm(seatDepthMm * 0.48),
        mm(seatSideBolsterHeightMm / 2),
        mm(outerSeatWidthMm / 2 - seatSideBolsterWidthMm / 2),
      ],
      size: [mm(seatSideBolsterLengthMm), mm(seatSideBolsterHeightMm), mm(seatSideBolsterWidthMm)],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
    },
    {
      id: 'left-hinge-cover',
      color: TRIM_COLOR,
      localPosition: [mm(22), mm(26), -mm(outerSeatWidthMm / 2 - 14)],
      size: [mm(42), mm(52), mm(20)],
      metalness: TRIM_MATERIAL.metalness,
      roughness: TRIM_MATERIAL.roughness,
    },
    {
      id: 'right-hinge-cover',
      color: TRIM_COLOR,
      localPosition: [mm(22), mm(26), mm(outerSeatWidthMm / 2 - 14)],
      size: [mm(42), mm(52), mm(20)],
      metalness: TRIM_MATERIAL.metalness,
      roughness: TRIM_MATERIAL.roughness,
    },
  ];

  const backrestTemplates: SeatTemplate[] = [
    {
      id: 'lower-panel',
      color: UPHOLSTERY_COLOR,
      localPosition: [-mm(8), mm(228), 0],
      size: [mm(backrestThicknessMm), mm(456), mm(lowerBackWidthMm)],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
    },
    {
      id: 'upper-panel',
      color: UPHOLSTERY_COLOR,
      localPosition: [-mm(10), mm(566), 0],
      size: [mm(backrestThicknessMm), mm(186), mm(upperBackWidthMm)],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
    },
    {
      id: 'headrest',
      color: UPHOLSTERY_COLOR,
      localPosition: [-mm(10), mm(backrestHeightMm - 66), 0],
      size: [mm(backrestThicknessMm + 6), mm(132), mm(headrestWidthMm)],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
    },
    {
      id: 'left-lower-bolster',
      color: UPHOLSTERY_COLOR,
      localPosition: [-mm(6), mm(236), -mm(lowerBackWidthMm / 2 + backrestLowerBolsterWidthMm / 2 - 24)],
      size: [mm(backrestThicknessMm + 18), mm(470), mm(backrestLowerBolsterWidthMm)],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
    },
    {
      id: 'right-lower-bolster',
      color: UPHOLSTERY_COLOR,
      localPosition: [-mm(6), mm(236), mm(lowerBackWidthMm / 2 + backrestLowerBolsterWidthMm / 2 - 24)],
      size: [mm(backrestThicknessMm + 18), mm(470), mm(backrestLowerBolsterWidthMm)],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
    },
    {
      id: 'left-shoulder-wing',
      color: UPHOLSTERY_COLOR,
      localPosition: [-mm(4), mm(518), -mm(upperBackWidthMm / 2 + shoulderWingWidthMm / 2 - 18)],
      size: [mm(backrestThicknessMm + 26), mm(shoulderWingHeightMm), mm(shoulderWingWidthMm)],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
    },
    {
      id: 'right-shoulder-wing',
      color: UPHOLSTERY_COLOR,
      localPosition: [-mm(4), mm(518), mm(upperBackWidthMm / 2 + shoulderWingWidthMm / 2 - 18)],
      size: [mm(backrestThicknessMm + 26), mm(shoulderWingHeightMm), mm(shoulderWingWidthMm)],
      metalness: UPHOLSTERY_MATERIAL.metalness,
      roughness: UPHOLSTERY_MATERIAL.roughness,
    },
    {
      id: 'left-harness-outer',
      color: BEZEL_COLOR,
      localPosition: [
        mm(harnessFrameXOffsetMm),
        mm(590),
        -mm(harnessFrameCenterOffsetZMm + harnessFrameWidthMm / 2 - harnessFrameBarMm / 2),
      ],
      size: [mm(8), mm(harnessFrameHeightMm), mm(harnessFrameBarMm)],
      metalness: TRIM_MATERIAL.metalness,
      roughness: TRIM_MATERIAL.roughness,
    },
    {
      id: 'left-harness-inner',
      color: BEZEL_COLOR,
      localPosition: [
        mm(harnessFrameXOffsetMm),
        mm(590),
        -mm(harnessFrameCenterOffsetZMm - harnessFrameWidthMm / 2 + harnessFrameBarMm / 2),
      ],
      size: [mm(8), mm(harnessFrameHeightMm), mm(harnessFrameBarMm)],
      metalness: TRIM_MATERIAL.metalness,
      roughness: TRIM_MATERIAL.roughness,
    },
    {
      id: 'left-harness-top',
      color: BEZEL_COLOR,
      localPosition: [
        mm(harnessFrameXOffsetMm),
        mm(590 + harnessFrameHeightMm / 2 - harnessFrameBarMm / 2),
        -mm(harnessFrameCenterOffsetZMm),
      ],
      size: [mm(8), mm(harnessFrameBarMm), mm(harnessFrameWidthMm)],
      metalness: TRIM_MATERIAL.metalness,
      roughness: TRIM_MATERIAL.roughness,
    },
    {
      id: 'right-harness-outer',
      color: BEZEL_COLOR,
      localPosition: [
        mm(harnessFrameXOffsetMm),
        mm(590),
        mm(harnessFrameCenterOffsetZMm + harnessFrameWidthMm / 2 - harnessFrameBarMm / 2),
      ],
      size: [mm(8), mm(harnessFrameHeightMm), mm(harnessFrameBarMm)],
      metalness: TRIM_MATERIAL.metalness,
      roughness: TRIM_MATERIAL.roughness,
    },
    {
      id: 'right-harness-inner',
      color: BEZEL_COLOR,
      localPosition: [
        mm(harnessFrameXOffsetMm),
        mm(590),
        mm(harnessFrameCenterOffsetZMm - harnessFrameWidthMm / 2 + harnessFrameBarMm / 2),
      ],
      size: [mm(8), mm(harnessFrameHeightMm), mm(harnessFrameBarMm)],
      metalness: TRIM_MATERIAL.metalness,
      roughness: TRIM_MATERIAL.roughness,
    },
    {
      id: 'right-harness-top',
      color: BEZEL_COLOR,
      localPosition: [
        mm(harnessFrameXOffsetMm),
        mm(590 + harnessFrameHeightMm / 2 - harnessFrameBarMm / 2),
        mm(harnessFrameCenterOffsetZMm),
      ],
      size: [mm(8), mm(harnessFrameBarMm), mm(harnessFrameWidthMm)],
      metalness: TRIM_MATERIAL.metalness,
      roughness: TRIM_MATERIAL.roughness,
    },
  ];

  return [
    ...createSeatParts('seat', seatPivot, seatAngleRad, seatTemplates),
    ...createSeatParts('backrest', seatPivot, backrestAngleRad, backrestTemplates),
  ];
}
