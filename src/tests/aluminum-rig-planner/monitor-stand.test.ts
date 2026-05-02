import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PLANNER_POSTURE_SETTINGS,
  PLANNER_POSTURE_LIMITS,
} from '~/components/calculator/aluminum-rig-planner/constants/posture';
import { DEFAULT_PLANNER_INPUT } from '~/components/calculator/aluminum-rig-planner/constants/planner';
import {
  createMonitorStandModule,
  getEffectiveMonitorStandVariant,
  getMonitorStandLayoutMm,
  getMonitorVesaDimensionsMm,
} from '~/components/calculator/aluminum-rig-planner/modules/monitor-stand';
import type { PlannerPostureMonitorDebug } from '~/components/calculator/aluminum-rig-planner/posture/posture-report';

const monitorDebug = {
  position: [1.2, 0, 1] as [number, number, number],
  diameterM: 0.01,
  constants: {
    ballDiameterMm: 10,
  },
} satisfies PlannerPostureMonitorDebug;

const narrowBaseWidthMm = 400;

describe('aluminum rig planner monitor stand module', () => {
  it('parses VESA standard dimensions', () => {
    expect(getMonitorVesaDimensionsMm('400x200')).toEqual({ widthMm: 400, heightMm: 200 });
  });

  it('places cross beam top from monitor bottom and bottom VESA hole offset', () => {
    const settings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorSizeIn: 32,
      monitorAspectRatio: '16:10' as const,
      monitorVesaType: '100x100' as const,
      monitorBottomVesaHoleDistanceMm: 150,
      monitorBottomVesaHolesToCrossBeamTopMm: 20,
      monitorStandLegExtraMarginMm: 80,
    };
    const layout = getMonitorStandLayoutMm(monitorDebug, settings, narrowBaseWidthMm);

    expect(layout.monitorBottomHeightMm).toBeCloseTo(784.6, 1);
    expect(layout.bottomVesaHoleHeightMm).toBeCloseTo(934.6, 1);
    expect(layout.crossBeamTopHeightMm).toBeCloseTo(954.6, 1);
    expect(layout.crossBeamCenterHeightMm).toBeCloseTo(934.6, 1);
    expect(layout.crossBeamLengthMm).toBe(620);
    expect(layout.internalWidthMm).toBe(540);
    expect(layout.crossBeamCenterXMm).toBe(1260);
    expect(layout.legCenterXMm).toBe(1320);
    expect(layout.footLengthMinMm).toBe(447);
    expect(layout.footLengthMaxMm).toBe(895);
    expect(layout.footLengthMm).toBe(500);
    expect(layout.footCenterXMm).toBe(1195);
    expect(layout.legLengthMm).toBeCloseTo(974.6, 1);
  });

  it('clamps configured foot length between half leg height and leg height', () => {
    const baseSettings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorBottomVesaHoleDistanceMm: 150,
      monitorBottomVesaHolesToCrossBeamTopMm: 20,
      monitorStandLegExtraMarginMm: 80,
    };
    const shortFoot = getMonitorStandLayoutMm(
      monitorDebug,
      {
        ...baseSettings,
        monitorStandFootLengthMm: 10,
      },
      narrowBaseWidthMm
    );
    const longFoot = getMonitorStandLayoutMm(
      monitorDebug,
      {
        ...baseSettings,
        monitorStandFootLengthMm: 9999,
      },
      narrowBaseWidthMm
    );

    expect(shortFoot.footLengthMm).toBe(447);
    expect(longFoot.footLengthMm).toBe(895);
  });

  it('does not apply extra leg margin to foot length', () => {
    const lowMargin = getMonitorStandLayoutMm(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandLegExtraMarginMm: 0,
      },
      narrowBaseWidthMm
    );
    const highMargin = getMonitorStandLayoutMm(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandLegExtraMarginMm: 200,
      },
      narrowBaseWidthMm
    );

    expect(lowMargin.legLengthMm).not.toBe(highMargin.legLengthMm);
    expect(lowMargin.footLengthMm).toBe(highMargin.footLengthMm);
  });

  it('enforces a 40 mm minimum leg margin in layout math', () => {
    const layout = getMonitorStandLayoutMm(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorBottomVesaHoleDistanceMm: 150,
        monitorBottomVesaHolesToCrossBeamTopMm: 20,
        monitorStandLegExtraMarginMm: 0,
      },
      narrowBaseWidthMm
    );

    expect(layout.legLengthMm).toBeCloseTo(934.6, 1);
  });

  it('keeps internal stand width at least 5 percent wider than the rig base', () => {
    const layout = getMonitorStandLayoutMm(monitorDebug, DEFAULT_PLANNER_POSTURE_SETTINGS, 600);

    expect(layout.crossBeamLengthMm).toBe(710);
    expect(layout.internalWidthMm).toBe(630);
  });

  it('keeps triple monitor legs at least 5 percent wider than the rig base', () => {
    const layout = getMonitorStandLayoutMm(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorTripleScreen: true,
      },
      800
    );

    expect(layout.crossBeamLengthMm).toBe(920);
    expect(layout.internalWidthMm).toBe(840);
    expect(layout.legCenterYAbsMm).toBe(440);
  });

  it('uses extended center, screen-width leg span, and delayed side cross beams in triple monitor mode', () => {
    const settings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorTripleScreen: true,
    };
    const layout = getMonitorStandLayoutMm(monitorDebug, settings, 600);

    expect(layout.crossBeamLengthMm).toBe(827);
    expect(layout.internalWidthMm).toBe(630);
    expect(layout.legCenterYAbsMm).toBe(335);
    expect(layout.sideLegs).toHaveLength(0);
    expect(layout.crossBeams.map((crossBeam) => crossBeam.id)).toEqual([
      'monitor-stand-crossbeam',
      'monitor-stand-left-crossbeam',
      'monitor-stand-right-crossbeam',
    ]);
    expect(layout.crossBeams.map((crossBeam) => crossBeam.lengthMm)).toEqual([827, 579, 579]);
    expect(layout.crossBeams.every((crossBeam) => crossBeam.profileType === 'alu40x40')).toBe(true);
    expect(layout.crossBeamCenterHeightMm).toBeCloseTo(950.6, 1);
    expect(Math.abs(layout.crossBeams[1].centerYMm)).toBeCloseTo(556.1, 1);
    expect(layout.crossBeams[1].centerYMm).toBeLessThan(0);
    expect(layout.crossBeams[2].centerYMm).toBeGreaterThan(0);
    expect(layout.crossBeams[1].yawRadians).toBeLessThan(0);
    expect(layout.crossBeams[2].yawRadians).toBeGreaterThan(0);
  });

  it('adds one support leg at 90 percent of each side beam above 43 inch triple monitors', () => {
    const layout = getMonitorStandLayoutMm(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorSizeIn: 44,
        monitorTripleScreen: true,
      },
      600
    );

    expect(layout.sideLegs.map((leg) => leg.id)).toEqual([
      'monitor-stand-left-support-leg',
      'monitor-stand-right-support-leg',
    ]);
    expect(layout.sideLegs[0].centerYMm).toBeLessThan(layout.crossBeams[1].centerYMm);
    expect(layout.sideLegs[1].centerYMm).toBeGreaterThan(layout.crossBeams[2].centerYMm);
  });

  it('generates one cross beam, two vertical legs, and two feet', () => {
    const meshes = createMonitorStandModule(
      monitorDebug,
      DEFAULT_PLANNER_POSTURE_SETTINGS,
      '#222222',
      narrowBaseWidthMm
    );

    expect(meshes.map((mesh) => mesh.id)).toEqual(
      expect.arrayContaining([
        'monitor-stand-crossbeam',
        'monitor-stand-left-leg',
        'monitor-stand-right-leg',
        'monitor-stand-left-foot',
        'monitor-stand-right-foot',
      ])
    );
    expect(meshes.some((mesh) => mesh.id.includes('vesa'))).toBe(false);
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-crossbeam')?.profileType).toBe('alu40x40');
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-left-leg')?.profileType).toBe('alu80x40');
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-left-foot')?.profileType).toBe('alu40x40');
  });

  it('generates integrated plates, 4040 uprights, and top T arms up to 32 inch monitors', () => {
    const meshes = createMonitorStandModule(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandVariant: 'integrated',
      },
      '#222222',
      DEFAULT_PLANNER_INPUT
    );

    expect(
      getEffectiveMonitorStandVariant({ ...DEFAULT_PLANNER_POSTURE_SETTINGS, monitorStandVariant: 'integrated' })
    ).toBe('integrated');
    expect(meshes.map((mesh) => mesh.id)).toEqual(
      expect.arrayContaining([
        'monitor-stand-crossbeam',
        'monitor-stand-integrated-left-plate',
        'monitor-stand-integrated-right-plate',
        'monitor-stand-integrated-left-upright',
        'monitor-stand-integrated-right-upright',
        'monitor-stand-integrated-left-top-arm',
        'monitor-stand-integrated-right-top-arm',
      ])
    );
    expect(meshes.some((mesh) => mesh.id === 'monitor-stand-left-foot')).toBe(false);
    expect(meshes.some((mesh) => mesh.id === 'monitor-stand-left-leg')).toBe(false);
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-plate')?.profileType).toBeUndefined();
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-plate')?.shape).toBe('trapezoid-plate');
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-plate')?.materialKind).toBe('metal');
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-plate')?.size[1]).toBe(0.006);
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-plate')?.size[2]).toBe(0.12);
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-plate')?.trapezoidPlateBottomRise).toBe(
      0.04
    );
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-plate')?.trapezoidPlateCornerRadius).toBe(
      0.003
    );
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-plate')?.color).not.toBe('#222222');
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-upright')?.profileType).toBe('alu40x40');
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-top-arm')?.profileType).toBe('alu40x40');
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-top-arm')?.rotation?.[2]).toBeCloseTo(
      Math.PI / 2
    );
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-upright')?.openEnds).toEqual(['negative']);
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-top-arm')?.openEnds).toEqual(['negative']);
  });

  it('butts integrated top arm negative X ends to the crossbeam positive X face and extends past uprights', () => {
    const layout = getMonitorStandLayoutMm(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandVariant: 'integrated',
      },
      DEFAULT_PLANNER_INPUT
    );
    const meshes = createMonitorStandModule(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandVariant: 'integrated',
      },
      '#222222',
      DEFAULT_PLANNER_INPUT
    );
    const crossBeam = meshes.find((mesh) => mesh.id === 'monitor-stand-crossbeam');
    const topArm = meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-top-arm');

    expect(topArm?.position[2]).toBeCloseTo(crossBeam?.position[2] ?? 0);
    expect((topArm?.position[0] ?? 0) - (topArm?.size[1] ?? 0) / 2).toBeCloseTo(
      (crossBeam?.position[0] ?? 0) + (crossBeam?.size[0] ?? 0) / 2
    );
    expect(layout.integratedMounts[0]?.topArmCenterXMm).toBeGreaterThan(layout.crossBeamCenterXMm);
    expect((topArm?.position[0] ?? 0) + (topArm?.size[1] ?? 0) / 2).toBeGreaterThanOrEqual(
      (layout.integratedMounts[0]?.verticalCenterXMm ?? 0) / 1000 + 0.08
    );
  });

  it('starts integrated uprights below the steering column top and aligns them with steering pillars', () => {
    const meshes = createMonitorStandModule(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandVariant: 'integrated',
      },
      '#222222',
      DEFAULT_PLANNER_INPUT
    );
    const leftPlate = meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-plate');
    const rightPlate = meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-right-plate');
    const leftUpright = meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-upright');
    const leftTopArm = meshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-top-arm');
    const steeringColumnTopMm = 80 + DEFAULT_PLANNER_INPUT.steeringColumnHeightMm;
    const uprightBottomMm = ((leftUpright?.position[2] ?? 0) - (leftUpright?.size[2] ?? 0) / 2) * 1000;

    expect(uprightBottomMm).toBeCloseTo(80 + DEFAULT_PLANNER_INPUT.steeringColumnHeightMm * 0.8);
    expect(uprightBottomMm).toBeLessThan(steeringColumnTopMm);
    expect((leftUpright?.position[2] ?? 0) + (leftUpright?.size[2] ?? 0) / 2).toBeCloseTo(
      (leftTopArm?.position[2] ?? 0) - (leftTopArm?.size[2] ?? 0) / 2
    );
    expect((leftPlate?.position[1] ?? 0) + (leftPlate?.size[1] ?? 0) / 2).toBeCloseTo(
      -DEFAULT_PLANNER_INPUT.baseWidthMm / 2 / 1000
    );
    expect((rightPlate?.position[1] ?? 0) - (rightPlate?.size[1] ?? 0) / 2).toBeCloseTo(
      DEFAULT_PLANNER_INPUT.baseWidthMm / 2 / 1000
    );
    expect(leftUpright?.position[1]).toBeCloseTo(-(DEFAULT_PLANNER_INPUT.baseWidthMm / 2 - 20) / 1000);
    expect((leftPlate?.position[0] ?? 0) - (leftPlate?.size[0] ?? 0) / 2).toBeCloseTo(
      (DEFAULT_PLANNER_INPUT.seatBaseDepthMm + DEFAULT_PLANNER_INPUT.steeringColumnDistanceMm + 40 - 40) / 1000
    );
    expect((leftPlate?.position[0] ?? 0) + (leftPlate?.size[0] ?? 0) / 2).toBeCloseTo(
      (leftUpright?.position[0] ?? 0) + (leftUpright?.size[0] ?? 0) / 2
    );
  });

  it('uses integrated plate length and fixed vertical edge heights', () => {
    const shortMeshes = createMonitorStandModule(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandVariant: 'integrated',
        monitorStandIntegratedPlateLengthMm: 300,
      },
      '#222222',
      DEFAULT_PLANNER_INPUT
    );
    const cappedMeshes = createMonitorStandModule(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandVariant: 'integrated',
        monitorStandIntegratedPlateLengthMm: 500,
      },
      '#222222',
      DEFAULT_PLANNER_INPUT
    );
    const shortPlate = shortMeshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-plate');
    const cappedPlate = cappedMeshes.find((mesh) => mesh.id === 'monitor-stand-integrated-left-plate');

    expect(shortPlate?.size[0]).toBe(0.3);
    expect(shortPlate?.size[2]).toBe(0.12);
    expect(shortPlate?.trapezoidPlateBottomRise).toBe(0.04);
    expect(cappedPlate?.size[0]).toBe(0.4);
    expect(cappedPlate?.trapezoidPlateBottomRise).toBe(0.04);
  });

  it('falls back from integrated to freestand above 32 inch monitors', () => {
    const settings = {
      ...DEFAULT_PLANNER_POSTURE_SETTINGS,
      monitorSizeIn: 33,
      monitorStandVariant: 'integrated' as const,
    };
    const layout = getMonitorStandLayoutMm(monitorDebug, settings, DEFAULT_PLANNER_INPUT);
    const meshes = createMonitorStandModule(monitorDebug, settings, '#222222', DEFAULT_PLANNER_INPUT);

    expect(layout.variant).toBe('freestand');
    expect(getEffectiveMonitorStandVariant(settings)).toBe('freestand');
    expect(meshes.some((mesh) => mesh.id === 'monitor-stand-left-foot')).toBe(true);
    expect(meshes.some((mesh) => mesh.id.includes('integrated'))).toBe(false);
  });

  it('keeps side cross beams for integrated triple monitors', () => {
    const layout = getMonitorStandLayoutMm(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandVariant: 'integrated',
        monitorTripleScreen: true,
      },
      DEFAULT_PLANNER_INPUT
    );
    const meshes = createMonitorStandModule(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandVariant: 'integrated',
        monitorTripleScreen: true,
      },
      '#222222',
      DEFAULT_PLANNER_INPUT
    );

    expect(layout.variant).toBe('integrated');
    expect(layout.crossBeams.map((crossBeam) => crossBeam.id)).toEqual([
      'monitor-stand-crossbeam',
      'monitor-stand-left-crossbeam',
      'monitor-stand-right-crossbeam',
    ]);
    expect(meshes.some((mesh) => mesh.id === 'monitor-stand-left-crossbeam')).toBe(true);
    expect(meshes.some((mesh) => mesh.id === 'monitor-stand-right-crossbeam')).toBe(true);
    expect(meshes.some((mesh) => mesh.id.endsWith('support-leg'))).toBe(false);
  });

  it('keeps cross beams fixed while feet height raises feet and shortens legs', () => {
    const feetHeightMm = PLANNER_POSTURE_LIMITS.monitorStandFeetHeightMaxMm;
    const defaultFeetHeightMm = DEFAULT_PLANNER_POSTURE_SETTINGS.monitorStandFeetHeightMm;
    const feetHeightDeltaMm = feetHeightMm - defaultFeetHeightMm;
    const defaultMeshes = createMonitorStandModule(
      monitorDebug,
      DEFAULT_PLANNER_POSTURE_SETTINGS,
      '#222222',
      narrowBaseWidthMm
    );
    const raisedMeshes = createMonitorStandModule(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandFeetType: 'rubber',
        monitorStandFeetHeightMm: feetHeightMm,
      },
      '#222222',
      narrowBaseWidthMm
    );
    const defaultLayout = getMonitorStandLayoutMm(monitorDebug, DEFAULT_PLANNER_POSTURE_SETTINGS, narrowBaseWidthMm);
    const raisedLayout = getMonitorStandLayoutMm(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandFeetType: 'rubber',
        monitorStandFeetHeightMm: feetHeightMm,
      },
      narrowBaseWidthMm
    );
    const defaultCrossBeam = defaultMeshes.find((mesh) => mesh.id === 'monitor-stand-crossbeam');
    const raisedCrossBeam = raisedMeshes.find((mesh) => mesh.id === 'monitor-stand-crossbeam');
    const defaultLeg = defaultMeshes.find((mesh) => mesh.id === 'monitor-stand-left-leg');
    const raisedLeg = raisedMeshes.find((mesh) => mesh.id === 'monitor-stand-left-leg');
    const defaultFoot = defaultMeshes.find((mesh) => mesh.id === 'monitor-stand-left-foot');
    const raisedFoot = raisedMeshes.find((mesh) => mesh.id === 'monitor-stand-left-foot');

    expect(raisedCrossBeam?.position[2]).toBeCloseTo(defaultCrossBeam?.position[2] ?? 0);
    expect(raisedFoot?.position[2]).toBeCloseTo((defaultFoot?.position[2] ?? 0) + feetHeightDeltaMm / 1000);
    expect(raisedLeg?.size[2]).toBeCloseTo((defaultLeg?.size[2] ?? 0) - feetHeightDeltaMm / 1000);
    expect(raisedLayout.legBottomHeightMm).toBe(defaultLayout.legBottomHeightMm + feetHeightDeltaMm);
    expect(raisedLayout.legLengthMm).toBeCloseTo(defaultLayout.legLengthMm - feetHeightDeltaMm, 1);
  });

  it('renders rubber pads under both ends of each stand foot when rubber feet are selected', () => {
    const meshes = createMonitorStandModule(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandFeetType: 'rubber',
        monitorStandFeetHeightMm: 30,
      },
      '#222222',
      narrowBaseWidthMm
    );
    const rubberPads = meshes.filter((mesh) => mesh.id.includes('-rubber-'));

    expect(rubberPads.map((mesh) => mesh.id)).toEqual(
      expect.arrayContaining([
        'monitor-stand-left-foot-rubber-rear',
        'monitor-stand-left-foot-rubber-front',
        'monitor-stand-right-foot-rubber-rear',
        'monitor-stand-right-foot-rubber-front',
      ])
    );
    expect(rubberPads).toHaveLength(4);
    expect(rubberPads.every((mesh) => mesh.shape === 'truncated-box')).toBe(true);
    expect(rubberPads[0]?.size).toEqual([0.08, 0.04, 0.03]);
    expect(rubberPads[0]?.truncatedBoxBottomSize).toEqual([0.07, 0.035]);
  });

  it('clamps rubber monitor stand feet height to the allowed range', () => {
    const lowLayout = getMonitorStandLayoutMm(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandFeetType: 'rubber',
        monitorStandFeetHeightMm: 1,
      },
      narrowBaseWidthMm
    );
    const highLayout = getMonitorStandLayoutMm(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandFeetType: 'rubber',
        monitorStandFeetHeightMm: 999,
      },
      narrowBaseWidthMm
    );

    expect(lowLayout.legBottomHeightMm).toBe(40 + PLANNER_POSTURE_LIMITS.monitorStandFeetHeightMinMm);
    expect(highLayout.legBottomHeightMm).toBe(40 + PLANNER_POSTURE_LIMITS.monitorStandFeetHeightMaxMm);
  });

  it('does not use feet height or render pads when monitor stand feet type is none', () => {
    const layout = getMonitorStandLayoutMm(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandFeetType: 'none',
        monitorStandFeetHeightMm: 50,
      },
      narrowBaseWidthMm
    );
    const meshes = createMonitorStandModule(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorStandFeetType: 'none',
        monitorStandFeetHeightMm: 50,
      },
      '#222222',
      narrowBaseWidthMm
    );

    expect(layout.legBottomHeightMm).toBe(40);
    expect(meshes.some((mesh) => mesh.id.includes('-rubber-'))).toBe(false);
  });

  it('uses 8040 single-monitor cross beams above 48 inch only', () => {
    const fortyEightInchMeshes = createMonitorStandModule(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorSizeIn: 48,
      },
      '#222222',
      narrowBaseWidthMm
    );
    const fortyNineInchMeshes = createMonitorStandModule(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorSizeIn: 49,
      },
      '#222222',
      narrowBaseWidthMm
    );

    expect(fortyEightInchMeshes.find((mesh) => mesh.id === 'monitor-stand-crossbeam')?.profileType).toBe('alu40x40');
    expect(fortyNineInchMeshes.find((mesh) => mesh.id === 'monitor-stand-crossbeam')?.profileType).toBe('alu80x40');
  });

  it('adds side cross beams in triple monitor mode', () => {
    const meshes = createMonitorStandModule(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorTripleScreen: true,
      },
      '#222222',
      narrowBaseWidthMm
    );
    const crossBeams = meshes.filter((mesh) => mesh.id.endsWith('crossbeam'));

    expect(meshes.map((mesh) => mesh.id)).toEqual(
      expect.arrayContaining([
        'monitor-stand-crossbeam',
        'monitor-stand-left-crossbeam',
        'monitor-stand-right-crossbeam',
      ])
    );
    expect(crossBeams.every((mesh) => mesh.profileType === 'alu40x40')).toBe(true);
    expect(crossBeams.every((mesh) => mesh.size[2] === 0.04)).toBe(true);
    expect(meshes.some((mesh) => mesh.id.includes('vesa'))).toBe(false);
  });

  it('uses 8040 triple cross beams above 32 inch without adding side support legs before 43 inch', () => {
    const meshes = createMonitorStandModule(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorSizeIn: 34,
        monitorTripleScreen: true,
      },
      '#222222',
      narrowBaseWidthMm
    );
    const crossBeams = meshes.filter((mesh) => mesh.id.endsWith('crossbeam'));

    expect(crossBeams.every((mesh) => mesh.profileType === 'alu80x40')).toBe(true);
    expect(meshes.some((mesh) => mesh.id.endsWith('support-leg'))).toBe(false);
  });

  it('generates side support legs above 43 inch triple monitors', () => {
    const meshes = createMonitorStandModule(
      monitorDebug,
      {
        ...DEFAULT_PLANNER_POSTURE_SETTINGS,
        monitorSizeIn: 44,
        monitorTripleScreen: true,
      },
      '#222222',
      narrowBaseWidthMm
    );

    expect(meshes.map((mesh) => mesh.id)).toEqual(
      expect.arrayContaining([
        'monitor-stand-left-support-leg',
        'monitor-stand-right-support-leg',
        'monitor-stand-left-support-leg-foot',
        'monitor-stand-right-support-leg-foot',
      ])
    );
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-left-support-leg')?.profileType).toBe('alu80x40');
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-right-support-leg')?.profileType).toBe('alu80x40');
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-left-support-leg-foot')?.profileType).toBe('alu40x40');
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-right-support-leg-foot')?.profileType).toBe('alu40x40');
    expect(meshes.find((mesh) => mesh.id === 'monitor-stand-crossbeam')?.profileType).toBe('alu80x40');
  });

  it('mounts the cross beam on the -X front face of the 8040 legs', () => {
    const meshes = createMonitorStandModule(
      monitorDebug,
      DEFAULT_PLANNER_POSTURE_SETTINGS,
      '#222222',
      narrowBaseWidthMm
    );
    const crossBeam = meshes.find((mesh) => mesh.id === 'monitor-stand-crossbeam');
    const leftLeg = meshes.find((mesh) => mesh.id === 'monitor-stand-left-leg');
    const leftFoot = meshes.find((mesh) => mesh.id === 'monitor-stand-left-foot');

    expect(crossBeam?.position[0]).toBeCloseTo((leftLeg?.position[0] ?? 0) - 0.06);
    expect(leftFoot?.position[0]).toBeCloseTo((leftLeg?.position[0] ?? 0) - 0.125);
  });
});
