import { describe, expect, it } from 'vitest';

import {
  BASE_MODULE_LAYOUT,
  DEFAULT_PLANNER_INPUT,
  HALF_PROFILE_SHORT_MM,
} from '../../components/calculator/aluminum-rig-planner/constants';
import { createSeatModule } from '../../components/calculator/aluminum-rig-planner/modules/seat';
import type { MeshSpec } from '../../components/calculator/aluminum-rig-planner/modules/shared';

describe('aluminum rig planner seat module', () => {
  function getMesh(id: string, input = DEFAULT_PLANNER_INPUT): MeshSpec {
    const mesh = createSeatModule(input).find((entry) => entry.id === id);

    expect(mesh).toBeDefined();
    return mesh as MeshSpec;
  }

  function getMeshPosition(id: string, input = DEFAULT_PLANNER_INPUT) {
    return getMesh(id, input).position;
  }

  function projectOnSeatXAxis(position: [number, number, number], angleDeg: number) {
    const angleRad = (angleDeg * Math.PI) / 180;
    return position[0] * Math.cos(angleRad) + position[2] * Math.sin(angleRad);
  }

  function projectOnSeatZAxis(position: [number, number, number], angleDeg: number) {
    const angleRad = (angleDeg * Math.PI) / 180;
    return -position[0] * Math.sin(angleRad) + position[2] * Math.cos(angleRad);
  }

  function getMeshFrontEdge(mesh: MeshSpec, angleDeg: number) {
    return projectOnSeatXAxis(mesh.position, angleDeg) + mesh.size[0] / 2;
  }

  function getMeshFrontEdgeX(mesh: MeshSpec, angleDeg: number) {
    const angleRad = (angleDeg * Math.PI) / 180;
    return mesh.position[0] + (Math.cos(angleRad) * mesh.size[0]) / 2;
  }

  function getMeshTopFrontCornerHeight(mesh: MeshSpec, angleDeg: number) {
    const angleRad = (angleDeg * Math.PI) / 180;
    return mesh.position[2] + (mesh.size[0] / 2) * Math.sin(angleRad) + (mesh.size[2] / 2) * Math.cos(angleRad);
  }

  it('raises seat geometry by the configured seat height', () => {
    const lowSeat = getMeshPosition('seat-base-main', {
      ...DEFAULT_PLANNER_INPUT,
      seatHeightFromBaseInnerBeamsMm: 0,
    });
    const highSeat = getMeshPosition('seat-base-main', {
      ...DEFAULT_PLANNER_INPUT,
      seatHeightFromBaseInnerBeamsMm: 100,
    });

    expect(highSeat[2] - lowSeat[2]).toBeCloseTo(0.1);
  });

  it('tilts the backrest independently from the seat angle', () => {
    const uprightHeadrest = getMeshPosition('backrest-headrest', {
      ...DEFAULT_PLANNER_INPUT,
      seatAngleDeg: 10,
      backrestAngleDeg: 90,
    });
    const reclinedHeadrest = getMeshPosition('backrest-headrest', {
      ...DEFAULT_PLANNER_INPUT,
      seatAngleDeg: 10,
      backrestAngleDeg: 130,
    });

    expect(reclinedHeadrest[0]).toBeLessThan(uprightHeadrest[0]);
    expect(reclinedHeadrest[2]).toBeLessThan(uprightHeadrest[2]);
  });

  it('keeps the seat front anchor fixed in x when seat length changes', () => {
    const shortSeatBase = getMesh('seat-base-main', {
      ...DEFAULT_PLANNER_INPUT,
      seatLengthMm: 360,
    });
    const longSeatBase = getMesh('seat-base-main', {
      ...DEFAULT_PLANNER_INPUT,
      seatLengthMm: 520,
    });

    expect(getMeshFrontEdge(longSeatBase, 0)).toBeCloseTo(getMeshFrontEdge(shortSeatBase, 0));
  });

  it('aligns seat pan front edge with seat cross member', () => {
    const input = {
      ...DEFAULT_PLANNER_INPUT,
      seatAngleDeg: 0,
      seatBaseDepthMm: 430,
      seatDeltaMm: 0,
    };
    const seatBase = getMesh('seat-base-main', input);
    const seatCrossMemberFaceXmm =
      Math.max(
        BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm,
        input.seatBaseDepthMm - BASE_MODULE_LAYOUT.seatCrossMemberEndInsetMm
      ) +
      HALF_PROFILE_SHORT_MM +
      input.seatDeltaMm;

    expect(getMeshFrontEdgeX(seatBase, input.seatAngleDeg)).toBeCloseTo(seatCrossMemberFaceXmm / 1000);
  });

  it('moves seat pan forward and backward with seat delta', () => {
    const rearwardSeat = getMesh('seat-base-main', {
      ...DEFAULT_PLANNER_INPUT,
      seatAngleDeg: 0,
      seatDeltaMm: -100,
    });
    const forwardSeat = getMesh('seat-base-main', {
      ...DEFAULT_PLANNER_INPUT,
      seatAngleDeg: 0,
      seatDeltaMm: 100,
    });

    expect(getMeshFrontEdgeX(forwardSeat, 0) - getMeshFrontEdgeX(rearwardSeat, 0)).toBeCloseTo(0.2);
  });

  it('raises the seat front when seat length increases', () => {
    const shortSeatBase = getMesh('seat-base-main', {
      ...DEFAULT_PLANNER_INPUT,
      seatLengthMm: 360,
      seatAngleDeg: 20,
    });
    const longSeatBase = getMesh('seat-base-main', {
      ...DEFAULT_PLANNER_INPUT,
      seatLengthMm: 520,
      seatAngleDeg: 20,
    });

    expect(getMeshTopFrontCornerHeight(longSeatBase, 20)).toBeGreaterThan(
      getMeshTopFrontCornerHeight(shortSeatBase, 20)
    );
  });

  it('widens sitting area enough to overlap side bolsters', () => {
    const baseMain = getMesh('seat-base-main');
    const leftBolster = getMesh('seat-left-bolster');
    const rightBolster = getMesh('seat-right-bolster');

    const baseLeftEdge = baseMain.position[1] + baseMain.size[1] / 2;
    const baseRightEdge = baseMain.position[1] - baseMain.size[1] / 2;
    const leftInnerEdge = leftBolster.position[1] - leftBolster.size[1] / 2;
    const rightInnerEdge = rightBolster.position[1] + rightBolster.size[1] / 2;

    expect(leftInnerEdge).toBeLessThanOrEqual(baseLeftEdge);
    expect(rightInnerEdge).toBeGreaterThanOrEqual(baseRightEdge);
  });

  it('keeps backrest pieces at same thickness', () => {
    const lowerPanel = getMesh('backrest-lower-panel');
    const upperPanel = getMesh('backrest-upper-panel');
    const headrest = getMesh('backrest-headrest');
    const leftShoulderWing = getMesh('backrest-left-shoulder-wing');
    const rightShoulderWing = getMesh('backrest-right-shoulder-wing');

    expect(upperPanel.size[0]).toBeCloseTo(lowerPanel.size[0]);
    expect(headrest.size[0]).toBeCloseTo(lowerPanel.size[0]);
    expect(leftShoulderWing.size[0]).toBeCloseTo(lowerPanel.size[0]);
    expect(rightShoulderWing.size[0]).toBeCloseTo(lowerPanel.size[0]);
  });

  it('adds rounded corners to seat shell meshes', () => {
    const baseMain = getMesh('seat-base-main');
    const lowerPanel = getMesh('backrest-lower-panel');

    expect(baseMain.cornerRadius).toBeGreaterThan(0);
    expect(lowerPanel.cornerRadius).toBeCloseTo(baseMain.cornerRadius ?? 0);
    expect(baseMain.cornerSegments).toBeGreaterThanOrEqual(4);
  });

  it('overlaps backrest panels to keep shell continuous', () => {
    const input = {
      ...DEFAULT_PLANNER_INPUT,
      seatAngleDeg: 18,
      backrestAngleDeg: 118,
    };
    const backrestAxisDeg = input.seatAngleDeg + input.backrestAngleDeg - 90;
    const lowerPanel = getMesh('backrest-lower-panel', input);
    const upperPanel = getMesh('backrest-upper-panel', input);
    const headrest = getMesh('backrest-headrest', input);

    const lowerTopEdge = projectOnSeatZAxis(lowerPanel.position, backrestAxisDeg) + lowerPanel.size[2] / 2;
    const upperBottomEdge = projectOnSeatZAxis(upperPanel.position, backrestAxisDeg) - upperPanel.size[2] / 2;
    const upperTopEdge = projectOnSeatZAxis(upperPanel.position, backrestAxisDeg) + upperPanel.size[2] / 2;
    const headrestBottomEdge = projectOnSeatZAxis(headrest.position, backrestAxisDeg) - headrest.size[2] / 2;

    expect(upperBottomEdge).toBeLessThanOrEqual(lowerTopEdge);
    expect(headrestBottomEdge).toBeLessThanOrEqual(upperTopEdge);
  });
});
