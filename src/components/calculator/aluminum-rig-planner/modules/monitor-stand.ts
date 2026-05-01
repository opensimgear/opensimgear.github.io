import {
  MODULE_PROFILE_MATERIAL,
  UPRIGHT_BEAM_DEPTH_MM,
  UPRIGHT_BEAM_WIDTH_MM,
} from '~/components/calculator/aluminum-rig-planner/constants/profile';
import {
  getMonitorDimensionsMm,
  getMonitorVesaDimensionsMm,
  getTripleScreenSidePanels,
} from '~/components/calculator/aluminum-rig-planner/modules/monitor';
import {
  mm,
  PROFILE_SHORT,
  UPRIGHT_BEAM_DEPTH,
  UPRIGHT_BEAM_WIDTH,
  type MeshSpec,
} from '~/components/calculator/aluminum-rig-planner/modules/shared';
import type { PlannerPostureMonitorDebug } from '~/components/calculator/aluminum-rig-planner/posture/posture-report';
import type { PlannerPosturePreset, PlannerPostureSettings } from '~/components/calculator/aluminum-rig-planner/types';

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

export type MonitorStandLayoutMm = {
  monitorBottomHeightMm: number;
  bottomVesaHoleHeightMm: number;
  topVesaHoleHeightMm: number;
  crossBeamTopHeightMm: number;
  crossBeamCenterHeightMm: number;
  crossBeamLengthMm: number;
  crossBeams: MonitorStandCrossBeamLayoutMm[];
  sideLegs: MonitorStandSideLegLayoutMm[];
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

export function getMonitorStandLayoutMm(
  monitorDebug: PlannerPostureMonitorDebug,
  settings: PlannerPostureSettings<PlannerPosturePreset>,
  baseWidthMm: number
): MonitorStandLayoutMm {
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
  const feetHeightMm = Math.max(0, settings.monitorStandFeetHeightMm);
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
    settings.monitorTripleScreen && settings.monitorSizeIn > MONITOR_STAND_SIDE_LEG_MIN_MONITOR_SIZE_IN
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

  return {
    monitorBottomHeightMm,
    bottomVesaHoleHeightMm,
    topVesaHoleHeightMm,
    crossBeamTopHeightMm,
    crossBeamCenterHeightMm,
    crossBeamLengthMm,
    crossBeams: [centerCrossBeam, ...sideCrossBeams],
    sideLegs,
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

export function createMonitorStandModule(
  monitorDebug: PlannerPostureMonitorDebug,
  settings: PlannerPostureSettings<PlannerPosturePreset>,
  profileColor: string,
  baseWidthMm: number
): MeshSpec[] {
  const layout = getMonitorStandLayoutMm(monitorDebug, settings, baseWidthMm);
  const sideYPositions = [-layout.legCenterYAbsMm, layout.legCenterYAbsMm];
  const profileProps = {
    color: profileColor,
    metalness: MODULE_PROFILE_MATERIAL.metalness,
    roughness: MODULE_PROFILE_MATERIAL.roughness,
  };
  const footCenterZ = mm(layout.legBottomHeightMm - PROFILE_SHORT_MM / 2);
  const legCenterZ = mm(layout.legBottomHeightMm + layout.legLengthMm / 2);
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
  const sideLegFootMeshes = layout.sideLegs.map((sideLeg) => {
    const center = getOffsetPointMm(
      [mm(sideLeg.centerXMm), mm(sideLeg.centerYMm), 0],
      sideLeg.yawRadians,
      (0.5 - MONITOR_STAND_FOOT_FRONT_RATIO) * layout.footLengthMm
    );

    return {
      id: `${sideLeg.id}-foot`,
      size: [mm(layout.footLengthMm), PROFILE_SHORT, PROFILE_SHORT] as [number, number, number],
      position: [mm(center.xMm), mm(center.yMm), footCenterZ] as [number, number, number],
      rotation: [0, 0, sideLeg.yawRadians] as [number, number, number],
      profileType: 'alu40x40' as const,
      openEnds: ['negative' as const, 'positive' as const],
      ...profileProps,
    } satisfies MeshSpec;
  });

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
    ...sideYPositions.flatMap<MeshSpec>((sideYPositionMm, index) => {
      const side = index === 0 ? 'left' : 'right';

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
          id: `monitor-stand-${side}-foot`,
          size: [mm(layout.footLengthMm), PROFILE_SHORT, PROFILE_SHORT] as [number, number, number],
          position: [mm(layout.footCenterXMm), mm(sideYPositionMm), footCenterZ] as [number, number, number],
          profileType: 'alu40x40' as const,
          openEnds: ['negative', 'positive'],
          ...profileProps,
        },
      ];
    }),
    ...sideLegMeshes,
    ...sideLegFootMeshes,
  ];
}
