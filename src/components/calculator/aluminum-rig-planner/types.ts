export type RigPresetType = 'gt' | 'formula';
export type SeatingBias = 'comfort' | 'performance';
export type WheelMountType = 'front' | 'bottom' | 'deck';

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

export interface DriverProfile {
  driverHeightMm: number;
  inseamMm: number;
  seatingBias: SeatingBias;
}

export interface PlannerInput extends DriverProfile {
  presetType: RigPresetType;
  wheelMountType: WheelMountType;
  baseLengthMm: number;
  baseWidthMm: number;
  seatBaseDepthMm: number;
  baseInnerBeamSpacingMm: number;
  pedalTrayDepthMm: number;
  pedalTrayDistanceMm: number;
  steeringColumnBaseHeightMm: number;
  steeringColumnHeightMm: number;
  baseHeightMm: number;
  seatXMm: number;
  seatYMm: number;
  seatBackAngleDeg: number;
  pedalXMm: number;
  pedalYMm: number;
  pedalAngleDeg: number;
  wheelXMm: number;
  wheelYMm: number;
  wheelTiltDeg: number;
}

export type PlannerPreset = Omit<PlannerInput, 'driverHeightMm' | 'inseamMm' | 'seatingBias'>;

export interface PlannerProfile extends DriverProfile {
  presetType?: RigPresetType;
}
