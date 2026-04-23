export type PlannerVisibleModules = {
  pedalTray: boolean;
  steeringColumn: boolean;
};

export type CutListProfileType = '40x40' | '80x40';
export type PlannerOptimizerMode = 'cost' | 'waste';
export type ShippingMode = 'flat' | 'per-kg';
export type PlannerCurrencyMode = 'auto' | 'eur' | 'usd';
export type PlannerCurrencyCode = 'EUR' | 'USD';

export type PlannerProfileShipping = Record<CutListProfileType, number>;

export type CutListRow = {
  profileType: CutListProfileType;
  lengthMm: number;
  quantity: number;
};

export type CutListEntry = CutListRow & {
  key: string;
  beamIds: string[];
};

export type PlannerStockOption = {
  id: string;
  profileType: CutListProfileType;
  lengthMm: number;
  cost: number;
};

export type PlannerOptimizationSettings = {
  mode: PlannerOptimizerMode;
  currencyMode: PlannerCurrencyMode;
  bladeThicknessMm: number;
  safetyMarginMm: number;
  shippingMode: ShippingMode;
  flatShippingCost: number;
  shippingRatePerKg: number;
  profileWeightsKgPerMeter: PlannerProfileShipping;
  stockOptions: PlannerStockOption[];
};

export type PlannerCutPiece = {
  id: string;
  beamId: string;
  cutListKey: string;
  profileType: CutListProfileType;
  nominalLengthMm: number;
  adjustedLengthMm: number;
};

export type PlannerPurchasedBar = {
  id: string;
  profileType: CutListProfileType;
  stockOptionId: string;
  stockLengthMm: number;
  stockCost: number;
  shippingCost: number;
  totalCost: number;
  massKg: number;
  kerfLengthMm: number;
  usedLengthMm: number;
  wasteLengthMm: number;
  pieces: PlannerCutPiece[];
};

export type PlannerOptimizationProfileSummary = {
  profileType: CutListProfileType;
  pieceCount: number;
  purchasedBars: PlannerPurchasedBar[];
  totalPurchasedLengthMm: number;
  totalAdjustedCutLengthMm: number;
  totalWasteMm: number;
  totalKerfMm: number;
  totalMassKg: number;
  subtotalCost: number;
};

export type PlannerOptimizationStatus = 'missing-stock-options' | 'infeasible' | 'ready';

export type PlannerOptimizationResult = {
  status: PlannerOptimizationStatus;
  profiles: PlannerOptimizationProfileSummary[];
  pieces: PlannerCutPiece[];
  totalPurchasedLengthMm: number;
  totalAdjustedCutLengthMm: number;
  totalWasteMm: number;
  totalKerfMm: number;
  totalMassKg: number;
  materialCost: number;
  shippingCost: number;
  totalCost: number;
  barCount: number;
  missingProfiles: CutListProfileType[];
  infeasibleProfiles: CutListProfileType[];
};

export interface PlannerInput {
  baseLengthMm: number;
  baseWidthMm: number;
  seatBaseDepthMm: number;
  baseInnerBeamSpacingMm: number;
  seatLengthMm: number;
  seatDeltaMm: number;
  seatHeightFromBaseInnerBeamsMm: number;
  seatAngleDeg: number;
  backrestAngleDeg: number;
  pedalTrayDepthMm: number;
  pedalTrayDistanceMm: number;
  pedalsHeightMm: number;
  pedalsDeltaMm: number;
  pedalAngleDeg: number;
  pedalAcceleratorDeltaMm: number;
  pedalBrakeDeltaMm: number;
  pedalClutchDeltaMm: number;
  steeringColumnDistanceMm: number;
  steeringColumnBaseHeightMm: number;
  steeringColumnHeightMm: number;
  wheelHeightOffsetMm: number;
  wheelAngleDeg: number;
  wheelDistanceFromSteeringColumnMm: number;
  wheelDiameterMm: number;
}
