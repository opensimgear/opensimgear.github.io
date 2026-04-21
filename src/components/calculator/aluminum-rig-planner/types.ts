export type PlannerVisibleModules = {
  pedalTray: boolean;
  steeringColumn: boolean;
};

export type CutListProfileType = '40x40' | '80x40';

export type CutListRow = {
  profileType: CutListProfileType;
  lengthMm: number;
  quantity: number;
};

export type CutListEntry = CutListRow & {
  key: string;
  beamIds: string[];
};

export interface PlannerInput {
  baseLengthMm: number;
  baseWidthMm: number;
  seatBaseDepthMm: number;
  baseInnerBeamSpacingMm: number;
  seatLengthMm: number;
  seatHeightFromBaseInnerBeamsMm: number;
  seatAngleDeg: number;
  backrestAngleDeg: number;
  pedalTrayDepthMm: number;
  pedalTrayDistanceMm: number;
  steeringColumnDistanceMm: number;
  steeringColumnBaseHeightMm: number;
  steeringColumnHeightMm: number;
}
