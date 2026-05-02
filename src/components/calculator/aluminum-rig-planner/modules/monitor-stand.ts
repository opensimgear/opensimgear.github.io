import {
  BASE_BEAM_HEIGHT_MM,
  MODULE_PROFILE_MATERIAL,
  UPRIGHT_BEAM_DEPTH_MM,
  UPRIGHT_BEAM_WIDTH_MM,
} from '~/components/calculator/aluminum-rig-planner/constants/profile';
import {
  getMonitorDimensionsMm,
  getMonitorVesaDimensionsMm,
  getTripleScreenSidePanels,
} from '~/components/calculator/aluminum-rig-planner/modules/monitor';
import { PLANNER_POSTURE_LIMITS } from '~/components/calculator/aluminum-rig-planner/constants/posture';
import {
  mm,
  PROFILE_SHORT,
  UPRIGHT_BEAM_DEPTH,
  UPRIGHT_BEAM_WIDTH,
  type MeshSpec,
} from '~/components/calculator/aluminum-rig-planner/modules/shared';
import type { PlannerPostureMonitorDebug } from '~/components/calculator/aluminum-rig-planner/posture/posture-report';
import type {
  PlannerInput,
  PlannerPosturePreset,
  PlannerPostureSettings,
} from '~/components/calculator/aluminum-rig-planner/types';

const PROFILE_SHORT_MM = 40;
const MONITOR_STAND_BEHIND_MONITOR_OFFSET_MM = 60;
const MONITOR_STAND_FOOT_FRONT_RATIO = 0.75;
const MONITOR_STAND_WIDTH_RATIO = 0.9;
const MONITOR_STAND_MIN_INTERNAL_BASE_WIDTH_RATIO = 1.05;
const MONITOR_STAND_TRIPLE_CENTER_WIDTH_RATIO = 1.2;
const MONITOR_STAND_TRIPLE_SIDE_START_RATIO = 0.03;
const MONITOR_STAND_TRIPLE_SIDE_WIDTH_RATIO = 0.7;
const MONITOR_STAND_4040_CROSS_BEAM_MAX_MONITOR_SIZE_IN = 32;
const MONITOR_STAND_SINGLE_4040_CROSS_BEAM_MAX_MONITOR_SIZE_IN = 48;
const MONITOR_STAND_SIDE_LEG_MIN_MONITOR_SIZE_IN = 43;
const MONITOR_STAND_LEG_EXTRA_MARGIN_MIN_MM = 40;
const MONITOR_STAND_SIDE_LEG_POSITION_RATIO = 0.9;
const INTEGRATED_MONITOR_STAND_MAX_MONITOR_SIZE_IN = 32;
const INTEGRATED_MONITOR_STAND_TOP_ARM_FRONT_OVERHANG_MM = 80;
const INTEGRATED_MONITOR_STAND_PLATE_THICKNESS_MM = 6;
const INTEGRATED_MONITOR_STAND_PLATE_LONG_EDGE_HEIGHT_MM = 120;
const INTEGRATED_MONITOR_STAND_PLATE_SHORT_EDGE_HEIGHT_MM = 80;
const INTEGRATED_MONITOR_STAND_PLATE_CORNER_RADIUS_MM = 3;
const INTEGRATED_MONITOR_STAND_VERTICAL_START_HEIGHT_RATIO = 0.8;
const INTEGRATED_MONITOR_STAND_STEEL_COLOR = '#7f858b';
const INTEGRATED_MONITOR_STAND_STEEL_MATERIAL = {
  metalness: 0.72,
  roughness: 0.42,
} as const;
const MONITOR_STAND_RUBBER_FOOT_TOP_LENGTH_MM = 80;
const MONITOR_STAND_RUBBER_FOOT_TOP_WIDTH_MM = 40;
const MONITOR_STAND_RUBBER_FOOT_BOTTOM_LENGTH_MM = 70;
const MONITOR_STAND_RUBBER_FOOT_BOTTOM_WIDTH_MM = 35;
const MONITOR_STAND_RUBBER_FOOT_COLOR = '#111111';
const MONITOR_STAND_RUBBER_FOOT_MATERIAL = {
  metalness: 0.05,
  roughness: 0.75,
} as const;

export type MonitorStandCrossBeamLayoutMm = {
  id: string;
  centerXMm: number;
  centerYMm: number;
  yawRadians: number;
  lengthMm: number;
  depthMm: number;
  heightMm: number;
  profileType: 'alu40x40' | 'alu80x40';
};

export type MonitorStandSideLegLayoutMm = {
  id: string;
  centerXMm: number;
  centerYMm: number;
  yawRadians: number;
};

export type MonitorStandIntegratedMountLayoutMm = {
  side: 'left' | 'right';
  plateCenterXMm: number;
  plateCenterYMm: number;
  plateCenterZMm: number;
  plateLengthMm: number;
  plateThicknessMm: number;
  plateHeightMm: number;
  plateBottomRiseMm: number;
  plateCornerRadiusMm: number;
  verticalCenterXMm: number;
  verticalCenterYMm: number;
  verticalCenterZMm: number;
  verticalLengthMm: number;
  topArmCenterXMm: number;
  topArmCenterYMm: number;
  topArmLengthMm: number;
};

export type MonitorStandLayoutMm = {
  variant: 'freestand' | 'integrated';
  monitorBottomHeightMm: number;
  bottomVesaHoleHeightMm: number;
  topVesaHoleHeightMm: number;
  crossBeamTopHeightMm: number;
  crossBeamCenterHeightMm: number;
  crossBeamLengthMm: number;
  crossBeams: MonitorStandCrossBeamLayoutMm[];
  sideLegs: MonitorStandSideLegLayoutMm[];
  integratedMounts: MonitorStandIntegratedMountLayoutMm[];
  internalWidthMm: number;
  legTopHeightMm: number;
  legBottomHeightMm: number;
  legLengthMm: number;
  legCenterYAbsMm: number;
  standCenterXMm: number;
  legCenterXMm: number;
  crossBeamCenterXMm: number;
  footLengthMinMm: number;
  footLengthMaxMm: number;
  footLengthMm: number;
  footCenterXMm: number;
};

export { getMonitorVesaDimensionsMm };

function getOffsetPointMm(position: [number, number, number], yawRadians: number, localXMm: number, localYMm = 0) {
  const cosYaw = Math.cos(yawRadians);
  const sinYaw = Math.sin(yawRadians);

  return {
    xMm: position[0] / 0.001 + localXMm * cosYaw - localYMm * sinYaw,
    yMm: position[1] / 0.001 + localXMm * sinYaw + localYMm * cosYaw,
  };
}

function getEffectiveFeetHeightMm(settings: PlannerPostureSettings<PlannerPosturePreset>) {
  return settings.monitorStandFeetType === 'rubber'
    ? Math.max(
      PLANNER_POSTURE_LIMITS.monitorStandFeetHeightMinMm,
      Math.min(PLANNER_POSTURE_LIMITS.monitorStandFeetHeightMaxMm, settings.monitorStandFeetHeightMm)
    )
    : 0;
}

export function getEffectiveMonitorStandVariant(settings: PlannerPostureSettings<PlannerPosturePreset>) {
  return settings.monitorStandVariant === 'integrated' &&
    settings.monitorSizeIn <= INTEGRATED_MONITOR_STAND_MAX_MONITOR_SIZE_IN
    ? 'integrated'
    : 'freestand';
}

function getBaseWidthMm(inputOrBaseWidthMm: PlannerInput | number) {
  return typeof inputOrBaseWidthMm === 'number' ? inputOrBaseWidthMm : inputOrBaseWidthMm.baseWidthMm;
}

function getIntegratedMonitorStandMountsMm(
  inputOrBaseWidthMm: PlannerInput | number,
  settings: PlannerPostureSettings<PlannerPosturePreset>,
  crossBeamCenterXMm: number,
  crossBeamCenterHeightMm: number
): MonitorStandIntegratedMountLayoutMm[] {
  if (typeof inputOrBaseWidthMm === 'number') {
    return [];
  }

  const input = inputOrBaseWidthMm;
  const steeringColumnCenterXMm = input.seatBaseDepthMm + input.steeringColumnDistanceMm + UPRIGHT_BEAM_DEPTH_MM;
  const steeringColumnHeightMm = Math.max(
    PROFILE_SHORT_MM,
    input.steeringColumnHeightMm,
    input.steeringColumnBaseHeightMm + UPRIGHT_BEAM_WIDTH_MM
  );
  const steeringColumnNegativeXFaceXMm = steeringColumnCenterXMm - UPRIGHT_BEAM_WIDTH_MM / 2;
  const crossBeamPositiveXFaceMm = crossBeamCenterXMm + PROFILE_SHORT_MM / 2;
  const configuredPlateLengthMm = Math.max(
    PLANNER_POSTURE_LIMITS.monitorStandIntegratedPlateLengthMinMm,
    Math.min(
      PLANNER_POSTURE_LIMITS.monitorStandIntegratedPlateLengthMaxMm,
      settings.monitorStandIntegratedPlateLengthMm
    )
  );
  const verticalCenterXMm = steeringColumnNegativeXFaceXMm + configuredPlateLengthMm - PROFILE_SHORT_MM / 2;
  const verticalArmPositiveXFaceXMm = verticalCenterXMm + PROFILE_SHORT_MM / 2;
  const plateLengthMm = verticalArmPositiveXFaceXMm - steeringColumnNegativeXFaceXMm;
  const plateHeightMm = INTEGRATED_MONITOR_STAND_PLATE_LONG_EDGE_HEIGHT_MM;
  const plateBottomRiseMm =
    INTEGRATED_MONITOR_STAND_PLATE_LONG_EDGE_HEIGHT_MM - INTEGRATED_MONITOR_STAND_PLATE_SHORT_EDGE_HEIGHT_MM;
  const topArmNegativeXEndMm = crossBeamPositiveXFaceMm;
  const topArmPositiveXEndMm = verticalCenterXMm + INTEGRATED_MONITOR_STAND_TOP_ARM_FRONT_OVERHANG_MM;
  const topArmLengthMm = Math.max(PROFILE_SHORT_MM, topArmPositiveXEndMm - topArmNegativeXEndMm);
  const verticalBottomHeightMm =
    BASE_BEAM_HEIGHT_MM + steeringColumnHeightMm * INTEGRATED_MONITOR_STAND_VERTICAL_START_HEIGHT_RATIO;
  const verticalTopHeightMm = Math.max(
    crossBeamCenterHeightMm - PROFILE_SHORT_MM / 2,
    verticalBottomHeightMm + PROFILE_SHORT_MM
  );
  const verticalLengthMm = Math.max(PROFILE_SHORT_MM, verticalTopHeightMm - verticalBottomHeightMm);
  const verticalCenterZMm = verticalBottomHeightMm + verticalLengthMm / 2;
  const plateCenterZMm = verticalBottomHeightMm + plateHeightMm / 2;

  return [
    { side: 'left' as const, sign: -1 },
    { side: 'right' as const, sign: 1 },
  ].map(({ side, sign }) => {
    const steeringColumnCenterYMm = sign * (input.baseWidthMm / 2 - UPRIGHT_BEAM_DEPTH_MM / 2);
    const steeringColumnExternalFaceYMm = sign * (input.baseWidthMm / 2);
    const plateCenterYMm = steeringColumnExternalFaceYMm + sign * (INTEGRATED_MONITOR_STAND_PLATE_THICKNESS_MM / 2);

    return {
      side,
      plateCenterXMm: steeringColumnNegativeXFaceXMm + plateLengthMm / 2,
      plateCenterYMm,
      plateLengthMm,
      plateThicknessMm: INTEGRATED_MONITOR_STAND_PLATE_THICKNESS_MM,
      plateHeightMm,
      plateBottomRiseMm,
      plateCornerRadiusMm: INTEGRATED_MONITOR_STAND_PLATE_CORNER_RADIUS_MM,
      verticalCenterXMm,
      verticalCenterYMm: steeringColumnCenterYMm,
      verticalCenterZMm,
      verticalLengthMm,
      topArmCenterXMm: topArmNegativeXEndMm + topArmLengthMm / 2,
      topArmCenterYMm: steeringColumnCenterYMm,
      topArmLengthMm,
      plateCenterZMm,
    };
  });
}

export function getMonitorStandLayoutMm(
  monitorDebug: PlannerPostureMonitorDebug,
  settings: PlannerPostureSettings<PlannerPosturePreset>,
  inputOrBaseWidthMm: PlannerInput | number
): MonitorStandLayoutMm {
  const baseWidthMm = getBaseWidthMm(inputOrBaseWidthMm);
  const variant = getEffectiveMonitorStandVariant(settings);
  const monitorDimensions = getMonitorDimensionsMm(settings);
  const vesaDimensions = getMonitorVesaDimensionsMm(settings.monitorVesaType);
  const monitorMidpointHeightMm = monitorDebug.position[2] / 0.001;
  const monitorBottomHeightMm = monitorMidpointHeightMm - monitorDimensions.heightMm / 2;
  const bottomVesaHoleHeightMm = monitorBottomHeightMm + settings.monitorBottomVesaHoleDistanceMm;
  const topVesaHoleHeightMm = bottomVesaHoleHeightMm + vesaDimensions.heightMm;
  const rawCrossBeamTopHeightMm = bottomVesaHoleHeightMm + settings.monitorBottomVesaHolesToCrossBeamTopMm;
  const crossBeamTopHeightMm = Math.max(PROFILE_SHORT_MM, rawCrossBeamTopHeightMm);
  const crossBeamDepthMm = PROFILE_SHORT_MM;
  const usesHeavyCrossBeams = settings.monitorTripleScreen
    ? settings.monitorSizeIn > MONITOR_STAND_4040_CROSS_BEAM_MAX_MONITOR_SIZE_IN
    : settings.monitorSizeIn > MONITOR_STAND_SINGLE_4040_CROSS_BEAM_MAX_MONITOR_SIZE_IN;
  const crossBeamHeightMm = usesHeavyCrossBeams ? UPRIGHT_BEAM_WIDTH_MM : PROFILE_SHORT_MM;
  const crossBeamProfileType = usesHeavyCrossBeams ? 'alu80x40' : 'alu40x40';
  const crossBeamCenterHeightMm = crossBeamTopHeightMm - crossBeamHeightMm / 2;
  const minLegSpanLengthMm = baseWidthMm * MONITOR_STAND_MIN_INTERNAL_BASE_WIDTH_RATIO + UPRIGHT_BEAM_DEPTH_MM * 2;
  const requestedCrossBeamLengthMm = settings.monitorTripleScreen
    ? monitorDimensions.widthMm * MONITOR_STAND_TRIPLE_CENTER_WIDTH_RATIO
    : Math.max(monitorDimensions.widthMm * MONITOR_STAND_WIDTH_RATIO, minLegSpanLengthMm);
  const requestedLegSpanLengthMm = settings.monitorTripleScreen
    ? Math.round(monitorDimensions.widthMm)
    : requestedCrossBeamLengthMm;
  const legSpanLengthMm = Math.round(Math.max(requestedLegSpanLengthMm, minLegSpanLengthMm));
  const crossBeamLengthMm = Math.round(Math.max(requestedCrossBeamLengthMm, legSpanLengthMm));
  const internalWidthMm = legSpanLengthMm - UPRIGHT_BEAM_DEPTH_MM * 2;
  const legExtraMarginMm = Math.max(MONITOR_STAND_LEG_EXTRA_MARGIN_MIN_MM, settings.monitorStandLegExtraMarginMm);
  const feetHeightMm = getEffectiveFeetHeightMm(settings);
  const legBottomHeightMm = PROFILE_SHORT_MM + feetHeightMm;
  const legTopHeightMm = Math.max(crossBeamTopHeightMm + legExtraMarginMm, legBottomHeightMm + PROFILE_SHORT_MM);
  const legLengthMm = Math.max(PROFILE_SHORT_MM, legTopHeightMm - legBottomHeightMm);
  const legLengthToCrossBeamMm = Math.max(PROFILE_SHORT_MM, crossBeamTopHeightMm - legBottomHeightMm);
  const legCenterYAbsMm = Math.max(PROFILE_SHORT_MM / 2, legSpanLengthMm / 2 - PROFILE_SHORT_MM / 2);
  const standCenterXMm = monitorDebug.position[0] / 0.001 + MONITOR_STAND_BEHIND_MONITOR_OFFSET_MM;
  const crossBeamCenterXMm = standCenterXMm;
  const legCenterXMm = crossBeamCenterXMm + UPRIGHT_BEAM_WIDTH_MM / 2 + PROFILE_SHORT_MM / 2;
  const footLengthMinMm = Math.round(legLengthToCrossBeamMm / 2);
  const footLengthMaxMm = Math.round(legLengthToCrossBeamMm);
  const footLengthMm = Math.max(
    footLengthMinMm,
    Math.min(footLengthMaxMm, Math.round(settings.monitorStandFootLengthMm))
  );
  const footCenterXMm = legCenterXMm + (0.5 - MONITOR_STAND_FOOT_FRONT_RATIO) * footLengthMm;
  const centerCrossBeam = {
    id: 'monitor-stand-crossbeam',
    centerXMm: crossBeamCenterXMm,
    centerYMm: monitorDebug.position[1] / 0.001,
    yawRadians: 0,
    lengthMm: crossBeamLengthMm,
    depthMm: crossBeamDepthMm,
    heightMm: crossBeamHeightMm,
    profileType: crossBeamProfileType,
  } satisfies MonitorStandCrossBeamLayoutMm;
  const sideBeamLayouts = settings.monitorTripleScreen
    ? Object.entries(getTripleScreenSidePanels(monitorDebug.position, settings)).map(([side, panel]) => {
      const sideLengthMm = Math.round(crossBeamLengthMm * MONITOR_STAND_TRIPLE_SIDE_WIDTH_RATIO);
      const sideInnerEdgeMm = side === 'right' ? -monitorDimensions.widthMm / 2 : monitorDimensions.widthMm / 2;
      const sideDirection = side === 'right' ? 1 : -1;
      const sideCenterLocalYMm =
        sideInnerEdgeMm +
        sideDirection * (crossBeamLengthMm * MONITOR_STAND_TRIPLE_SIDE_START_RATIO + sideLengthMm / 2);
      const center = getOffsetPointMm(
        panel.position,
        panel.yawRadians,
        MONITOR_STAND_BEHIND_MONITOR_OFFSET_MM,
        sideCenterLocalYMm
      );

      return {
        crossBeam: {
          id: `monitor-stand-${side}-crossbeam`,
          centerXMm: center.xMm,
          centerYMm: center.yMm,
          yawRadians: panel.yawRadians,
          lengthMm: sideLengthMm,
          depthMm: crossBeamDepthMm,
          heightMm: crossBeamHeightMm,
          profileType: crossBeamProfileType,
        } satisfies MonitorStandCrossBeamLayoutMm,
        sideDirection,
      };
    })
    : [];
  const sideCrossBeams = sideBeamLayouts.map((layout) => layout.crossBeam);
  const sideLegs =
    variant === 'freestand' &&
      settings.monitorTripleScreen &&
      settings.monitorSizeIn > MONITOR_STAND_SIDE_LEG_MIN_MONITOR_SIZE_IN
      ? sideBeamLayouts.map(({ crossBeam, sideDirection }) => {
        const legPositionOnBeamMm =
          sideDirection * (crossBeam.lengthMm * (MONITOR_STAND_SIDE_LEG_POSITION_RATIO - 0.5));
        const center = getOffsetPointMm(
          [mm(crossBeam.centerXMm), mm(crossBeam.centerYMm), 0],
          crossBeam.yawRadians,
          crossBeam.depthMm / 2 + UPRIGHT_BEAM_WIDTH_MM / 2,
          legPositionOnBeamMm
        );

        return {
          id: `${crossBeam.id.replace('-crossbeam', '')}-support-leg`,
          centerXMm: center.xMm,
          centerYMm: center.yMm,
          yawRadians: crossBeam.yawRadians,
        } satisfies MonitorStandSideLegLayoutMm;
      })
      : [];
  const integratedMounts =
    variant === 'integrated'
      ? getIntegratedMonitorStandMountsMm(inputOrBaseWidthMm, settings, crossBeamCenterXMm, crossBeamCenterHeightMm)
      : [];

  return {
    variant,
    monitorBottomHeightMm,
    bottomVesaHoleHeightMm,
    topVesaHoleHeightMm,
    crossBeamTopHeightMm,
    crossBeamCenterHeightMm,
    crossBeamLengthMm,
    crossBeams: [centerCrossBeam, ...sideCrossBeams],
    sideLegs,
    integratedMounts,
    internalWidthMm,
    legTopHeightMm,
    legBottomHeightMm,
    legLengthMm,
    legCenterYAbsMm,
    standCenterXMm,
    legCenterXMm,
    crossBeamCenterXMm,
    footLengthMinMm,
    footLengthMaxMm,
    footLengthMm,
    footCenterXMm,
  };
}

function createRubberFootMeshes(
  footId: string,
  centerXMm: number,
  centerYMm: number,
  yawRadians: number,
  lengthMm: number,
  heightMm: number
): MeshSpec[] {
  if (heightMm <= 0) {
    return [];
  }

  return [-1, 1].map((sign) => {
    const padCenter = getOffsetPointMm(
      [mm(centerXMm), mm(centerYMm), 0],
      yawRadians,
      sign * (lengthMm / 2 - MONITOR_STAND_RUBBER_FOOT_TOP_LENGTH_MM / 2)
    );

    return {
      id: `${footId}-rubber-${sign < 0 ? 'rear' : 'front'}`,
      shape: 'truncated-box' as const,
      size: [mm(MONITOR_STAND_RUBBER_FOOT_TOP_LENGTH_MM), mm(MONITOR_STAND_RUBBER_FOOT_TOP_WIDTH_MM), mm(heightMm)] as [
        number,
        number,
        number,
      ],
      truncatedBoxBottomSize: [
        mm(MONITOR_STAND_RUBBER_FOOT_BOTTOM_LENGTH_MM),
        mm(MONITOR_STAND_RUBBER_FOOT_BOTTOM_WIDTH_MM),
      ] as [number, number],
      position: [mm(padCenter.xMm), mm(padCenter.yMm), mm(heightMm / 2)] as [number, number, number],
      rotation: [0, 0, yawRadians] as [number, number, number],
      materialKind: 'plastic' as const,
      color: MONITOR_STAND_RUBBER_FOOT_COLOR,
      metalness: MONITOR_STAND_RUBBER_FOOT_MATERIAL.metalness,
      roughness: MONITOR_STAND_RUBBER_FOOT_MATERIAL.roughness,
    } satisfies MeshSpec;
  });
}

export function createMonitorStandModule(
  monitorDebug: PlannerPostureMonitorDebug,
  settings: PlannerPostureSettings<PlannerPosturePreset>,
  profileColor: string,
  inputOrBaseWidthMm: PlannerInput | number
): MeshSpec[] {
  const layout = getMonitorStandLayoutMm(monitorDebug, settings, inputOrBaseWidthMm);
  const sideYPositions = [-layout.legCenterYAbsMm, layout.legCenterYAbsMm];
  const profileProps = {
    color: profileColor,
    metalness: MODULE_PROFILE_MATERIAL.metalness,
    roughness: MODULE_PROFILE_MATERIAL.roughness,
  };
  const footCenterZ = mm(layout.legBottomHeightMm - PROFILE_SHORT_MM / 2);
  const legCenterZ = mm(layout.legBottomHeightMm + layout.legLengthMm / 2);
  const rubberFootHeightMm = getEffectiveFeetHeightMm(settings);
  const sideLegMeshes = layout.sideLegs.map(
    (sideLeg) =>
      ({
        id: sideLeg.id,
        size: [UPRIGHT_BEAM_WIDTH, UPRIGHT_BEAM_DEPTH, mm(layout.legLengthMm)] as [number, number, number],
        position: [mm(sideLeg.centerXMm), mm(sideLeg.centerYMm), legCenterZ] as [number, number, number],
        rotation: [0, 0, sideLeg.yawRadians] as [number, number, number],
        profileType: 'alu80x40' as const,
        openEnds: ['positive' as const],
        ...profileProps,
      }) satisfies MeshSpec
  );
  const sideLegFootLayouts = layout.sideLegs.map((sideLeg) => {
    const center = getOffsetPointMm(
      [mm(sideLeg.centerXMm), mm(sideLeg.centerYMm), 0],
      sideLeg.yawRadians,
      (0.5 - MONITOR_STAND_FOOT_FRONT_RATIO) * layout.footLengthMm
    );

    return {
      id: `${sideLeg.id}-foot`,
      centerXMm: center.xMm,
      centerYMm: center.yMm,
      yawRadians: sideLeg.yawRadians,
    };
  });
  const sideLegFootMeshes = sideLegFootLayouts.map(
    (foot) =>
      ({
        id: foot.id,
        size: [mm(layout.footLengthMm), PROFILE_SHORT, PROFILE_SHORT] as [number, number, number],
        position: [mm(foot.centerXMm), mm(foot.centerYMm), footCenterZ] as [number, number, number],
        rotation: [0, 0, foot.yawRadians] as [number, number, number],
        profileType: 'alu40x40' as const,
        openEnds: ['negative' as const, 'positive' as const],
        ...profileProps,
      }) satisfies MeshSpec
  );
  const sideLegRubberFootMeshes = sideLegFootLayouts.flatMap((foot) =>
    createRubberFootMeshes(
      foot.id,
      foot.centerXMm,
      foot.centerYMm,
      foot.yawRadians,
      layout.footLengthMm,
      rubberFootHeightMm
    )
  );
  const integratedMountMeshes = layout.integratedMounts.flatMap<MeshSpec>((mount) => [
    {
      id: `monitor-stand-integrated-${mount.side}-plate`,
      shape: 'trapezoid-plate' as const,
      size: [mm(mount.plateLengthMm), mm(mount.plateThicknessMm), mm(mount.plateHeightMm)] as [number, number, number],
      position: [mm(mount.plateCenterXMm), mm(mount.plateCenterYMm), mm(mount.plateCenterZMm)] as [
        number,
        number,
        number,
      ],
      trapezoidPlateBottomRise: mm(mount.plateBottomRiseMm),
      trapezoidPlateCornerRadius: mm(mount.plateCornerRadiusMm),
      materialKind: 'metal' as const,
      color: INTEGRATED_MONITOR_STAND_STEEL_COLOR,
      metalness: INTEGRATED_MONITOR_STAND_STEEL_MATERIAL.metalness,
      roughness: INTEGRATED_MONITOR_STAND_STEEL_MATERIAL.roughness,
    },
    {
      id: `monitor-stand-integrated-${mount.side}-upright`,
      size: [PROFILE_SHORT, PROFILE_SHORT, mm(mount.verticalLengthMm)] as [number, number, number],
      position: [mm(mount.verticalCenterXMm), mm(mount.verticalCenterYMm), mm(mount.verticalCenterZMm)] as [
        number,
        number,
        number,
      ],
      profileType: 'alu40x40' as const,
      openEnds: ['negative' as const],
      ...profileProps,
    },
    {
      id: `monitor-stand-integrated-${mount.side}-top-arm`,
      size: [PROFILE_SHORT, mm(mount.topArmLengthMm), PROFILE_SHORT] as [number, number, number],
      position: [mm(mount.topArmCenterXMm), mm(mount.topArmCenterYMm), mm(layout.crossBeamCenterHeightMm)] as [
        number,
        number,
        number,
      ],
      rotation: [0, 0, Math.PI / 2] as [number, number, number],
      profileType: 'alu40x40' as const,
      openEnds: ['negative' as const],
      ...profileProps,
    },
  ]);

  return [
    ...layout.crossBeams.map((crossBeam) => ({
      id: crossBeam.id,
      size: [mm(crossBeam.depthMm), mm(crossBeam.lengthMm), mm(crossBeam.heightMm)] as [number, number, number],
      position: [mm(crossBeam.centerXMm), mm(crossBeam.centerYMm), mm(layout.crossBeamCenterHeightMm)] as [
        number,
        number,
        number,
      ],
      rotation: [0, 0, crossBeam.yawRadians] as [number, number, number],
      profileType: crossBeam.profileType,
      openEnds: ['negative' as const, 'positive' as const],
      ...profileProps,
    })),
    ...(layout.variant === 'freestand'
      ? sideYPositions.flatMap<MeshSpec>((sideYPositionMm, index) => {
        const side = index === 0 ? 'left' : 'right';
        const footId = `monitor-stand-${side}-foot`;

        return [
          {
            id: `monitor-stand-${side}-leg`,
            size: [UPRIGHT_BEAM_WIDTH, UPRIGHT_BEAM_DEPTH, mm(layout.legLengthMm)] as [number, number, number],
            position: [mm(layout.legCenterXMm), mm(sideYPositionMm), legCenterZ] as [number, number, number],
            profileType: 'alu80x40' as const,
            openEnds: ['positive'],
            ...profileProps,
          },
          {
            id: footId,
            size: [mm(layout.footLengthMm), PROFILE_SHORT, PROFILE_SHORT] as [number, number, number],
            position: [mm(layout.footCenterXMm), mm(sideYPositionMm), footCenterZ] as [number, number, number],
            profileType: 'alu40x40' as const,
            openEnds: ['negative', 'positive'],
            ...profileProps,
          },
          ...createRubberFootMeshes(
            footId,
            layout.footCenterXMm,
            sideYPositionMm,
            0,
            layout.footLengthMm,
            rubberFootHeightMm
          ),
        ];
      })
      : []),
    ...integratedMountMeshes,
    ...sideLegMeshes,
    ...sideLegFootMeshes,
    ...sideLegRubberFootMeshes,
  ];
}
