import type {
  CutListEntry,
  CutListProfileType,
  PlannerCutPiece,
  PlannerOptimizationProfileSummary,
  PlannerOptimizationResult,
  PlannerOptimizationSettings,
  PlannerPurchasedBar,
  PlannerStockOption,
} from './types';

type MutableBar = {
  profileType: CutListProfileType;
  stockOption: PlannerStockOption;
  pieces: PlannerCutPiece[];
  usedLengthMm: number;
};

type ProfileSolveResult = {
  bars: PlannerPurchasedBar[];
  totalPurchasedLengthMm: number;
  totalAdjustedCutLengthMm: number;
  totalWasteMm: number;
  totalKerfMm: number;
  totalMassKg: number;
  subtotalCost: number;
};

type SearchContext = {
  pieces: PlannerCutPiece[];
  stockOptions: PlannerStockOption[];
  settings: PlannerOptimizationSettings;
  profileType: CutListProfileType;
  best:
    | {
        purchasedLengthMm: number;
        cost: number;
        barCount: number;
        bars: PlannerPurchasedBar[];
      }
    | null;
};

function comparePieces(a: PlannerCutPiece, b: PlannerCutPiece) {
  if (a.adjustedLengthMm !== b.adjustedLengthMm) {
    return b.adjustedLengthMm - a.adjustedLengthMm;
  }

  if (a.nominalLengthMm !== b.nominalLengthMm) {
    return b.nominalLengthMm - a.nominalLengthMm;
  }

  return a.id.localeCompare(b.id);
}

function compareStockOptions(
  a: PlannerStockOption,
  b: PlannerStockOption,
  settings: PlannerOptimizationSettings,
  profileType: CutListProfileType
) {
  const aCost = getEffectiveStockCost(a, settings, profileType);
  const bCost = getEffectiveStockCost(b, settings, profileType);

  if (settings.mode === 'cost') {
    if (aCost !== bCost) {
      return aCost - bCost;
    }

    if (a.lengthMm !== b.lengthMm) {
      return a.lengthMm - b.lengthMm;
    }

    return a.id.localeCompare(b.id);
  }

  if (a.lengthMm !== b.lengthMm) {
    return a.lengthMm - b.lengthMm;
  }

  if (aCost !== bCost) {
    return aCost - bCost;
  }

  return a.id.localeCompare(b.id);
}

function getEffectiveStockCost(
  stockOption: PlannerStockOption,
  settings: PlannerOptimizationSettings,
  profileType: CutListProfileType
) {
  if (settings.shippingMode === 'flat') {
    return stockOption.cost;
  }

  const massKg = (stockOption.lengthMm / 1000) * settings.profileWeightsKgPerMeter[profileType];
  return stockOption.cost + massKg * settings.shippingRatePerKg;
}

function getBarKerfLengthMm(bar: MutableBar, bladeThicknessMm: number) {
  return Math.max(0, bar.pieces.length - 1) * bladeThicknessMm;
}

function createPurchasedBar(
  bar: MutableBar,
  index: number,
  settings: PlannerOptimizationSettings,
  profileType: CutListProfileType
): PlannerPurchasedBar {
  const totalAdjustedCutLengthMm = bar.pieces.reduce((sum, piece) => sum + piece.adjustedLengthMm, 0);
  const kerfLengthMm = getBarKerfLengthMm(bar, settings.bladeThicknessMm);
  const usedLengthMm = totalAdjustedCutLengthMm + kerfLengthMm;
  const wasteLengthMm = Math.max(0, bar.stockOption.lengthMm - totalAdjustedCutLengthMm);
  const massKg = (bar.stockOption.lengthMm / 1000) * settings.profileWeightsKgPerMeter[profileType];
  const shippingCost = settings.shippingMode === 'per-kg' ? massKg * settings.shippingRatePerKg : 0;
  const totalCost = bar.stockOption.cost + shippingCost;

  return {
    id: `${profileType}-bar-${index + 1}`,
    profileType,
    stockOptionId: bar.stockOption.id,
    stockLengthMm: bar.stockOption.lengthMm,
    stockCost: bar.stockOption.cost,
    shippingCost,
    totalCost,
    massKg,
    kerfLengthMm,
    usedLengthMm,
    wasteLengthMm,
    pieces: [...bar.pieces],
  };
}

function createProfileSummary(
  profileType: CutListProfileType,
  pieces: PlannerCutPiece[],
  bars: MutableBar[],
  settings: PlannerOptimizationSettings
): PlannerOptimizationProfileSummary {
  const purchasedBars = bars.map((bar, index) => createPurchasedBar(bar, index, settings, profileType));
  const totalPurchasedLengthMm = purchasedBars.reduce((sum, bar) => sum + bar.stockLengthMm, 0);
  const totalAdjustedCutLengthMm = pieces.reduce((sum, piece) => sum + piece.adjustedLengthMm, 0);
  const totalWasteMm = totalPurchasedLengthMm - totalAdjustedCutLengthMm;
  const totalKerfMm = purchasedBars.reduce((sum, bar) => sum + bar.kerfLengthMm, 0);
  const totalMassKg = purchasedBars.reduce((sum, bar) => sum + bar.massKg, 0);
  const subtotalCost = purchasedBars.reduce((sum, bar) => sum + bar.totalCost, 0);

  return {
    profileType,
    pieceCount: pieces.length,
    purchasedBars,
    totalPurchasedLengthMm,
    totalAdjustedCutLengthMm,
    totalWasteMm,
    totalKerfMm,
    totalMassKg,
    subtotalCost,
  };
}

function compareProfileSummaries(
  mode: PlannerOptimizationSettings['mode'],
  candidate: { purchasedLengthMm: number; cost: number; barCount: number },
  currentBest: { purchasedLengthMm: number; cost: number; barCount: number } | null
) {
  if (!currentBest) {
    return -1;
  }

  const candidateTuple =
    mode === 'cost'
      ? [candidate.cost, candidate.purchasedLengthMm, candidate.barCount]
      : [candidate.purchasedLengthMm, candidate.cost, candidate.barCount];
  const bestTuple =
    mode === 'cost'
      ? [currentBest.cost, currentBest.purchasedLengthMm, currentBest.barCount]
      : [currentBest.purchasedLengthMm, currentBest.cost, currentBest.barCount];

  for (let index = 0; index < candidateTuple.length; index += 1) {
    if (candidateTuple[index] !== bestTuple[index]) {
      return candidateTuple[index] - bestTuple[index];
    }
  }

  return 0;
}

function shouldPrune(
  mode: PlannerOptimizationSettings['mode'],
  candidate: { purchasedLengthMm: number; cost: number; barCount: number },
  best: { purchasedLengthMm: number; cost: number; barCount: number } | null
) {
  if (!best) {
    return false;
  }

  const candidateTuple =
    mode === 'cost'
      ? [candidate.cost, candidate.purchasedLengthMm, candidate.barCount]
      : [candidate.purchasedLengthMm, candidate.cost, candidate.barCount];
  const bestTuple = mode === 'cost' ? [best.cost, best.purchasedLengthMm, best.barCount] : [best.purchasedLengthMm, best.cost, best.barCount];

  for (let index = 0; index < candidateTuple.length; index += 1) {
    if (candidateTuple[index] < bestTuple[index]) {
      return false;
    }

    if (candidateTuple[index] > bestTuple[index]) {
      return true;
    }
  }

  return true;
}

function solveProfile(context: SearchContext, bars: MutableBar[], index: number, purchasedLengthMm: number, cost: number) {
  if (
    shouldPrune(
      context.settings.mode,
      { purchasedLengthMm, cost, barCount: bars.length },
      context.best && {
        purchasedLengthMm: context.best.purchasedLengthMm,
        cost: context.best.cost,
        barCount: context.best.barCount,
      }
    )
  ) {
    return;
  }

  if (index >= context.pieces.length) {
    const summary = createProfileSummary(context.profileType, context.pieces, bars, context.settings);
    const nextBest = {
      purchasedLengthMm: summary.totalPurchasedLengthMm,
      cost: summary.subtotalCost,
      barCount: summary.purchasedBars.length,
      bars: summary.purchasedBars,
    };

    if (
      compareProfileSummaries(
        context.settings.mode,
        nextBest,
        context.best && {
          purchasedLengthMm: context.best.purchasedLengthMm,
          cost: context.best.cost,
          barCount: context.best.barCount,
        }
      ) < 0
    ) {
      context.best = nextBest;
    }

    return;
  }

  const piece = context.pieces[index];
  const existingBarCandidates = bars
    .map((bar, barIndex) => {
      const additionalKerf = bar.pieces.length > 0 ? context.settings.bladeThicknessMm : 0;
      const nextUsedLengthMm = bar.usedLengthMm + piece.adjustedLengthMm + additionalKerf;

      if (nextUsedLengthMm > bar.stockOption.lengthMm) {
        return null;
      }

      return {
        barIndex,
        remainingLengthMm: bar.stockOption.lengthMm - nextUsedLengthMm,
      };
    })
    .filter((candidate): candidate is { barIndex: number; remainingLengthMm: number } => candidate !== null)
    .sort((a, b) => a.remainingLengthMm - b.remainingLengthMm);

  for (const candidate of existingBarCandidates) {
    const bar = bars[candidate.barIndex];
    const additionalKerf = bar.pieces.length > 0 ? context.settings.bladeThicknessMm : 0;

    bar.pieces.push(piece);
    bar.usedLengthMm += piece.adjustedLengthMm + additionalKerf;
    solveProfile(context, bars, index + 1, purchasedLengthMm, cost);
    bar.usedLengthMm -= piece.adjustedLengthMm + additionalKerf;
    bar.pieces.pop();
  }

  for (const stockOption of context.stockOptions) {
    if (piece.adjustedLengthMm > stockOption.lengthMm) {
      continue;
    }

    const bar: MutableBar = {
      profileType: context.profileType,
      stockOption,
      pieces: [piece],
      usedLengthMm: piece.adjustedLengthMm,
    };

    bars.push(bar);
    solveProfile(
      context,
      bars,
      index + 1,
      purchasedLengthMm + stockOption.lengthMm,
      cost + getEffectiveStockCost(stockOption, context.settings, context.profileType)
    );
    bars.pop();
  }
}

function solveProfilePieces(
  profileType: CutListProfileType,
  pieces: PlannerCutPiece[],
  stockOptions: PlannerStockOption[],
  settings: PlannerOptimizationSettings
): ProfileSolveResult | null {
  const totalAdjustedLengthMm = pieces.reduce((sum, piece) => sum + piece.adjustedLengthMm, 0);
  const orderedPieces = [...pieces].sort(comparePieces);
  const orderedStockOptions = [...stockOptions].sort((a, b) => compareStockOptions(a, b, settings, profileType));
  const context: SearchContext = {
    pieces: orderedPieces,
    stockOptions: orderedStockOptions,
    settings,
    profileType,
    best: null,
  };

  solveProfile(context, [], 0, 0, 0);

  if (!context.best) {
    return null;
  }

  return {
    bars: context.best.bars,
    totalPurchasedLengthMm: context.best.purchasedLengthMm,
    totalAdjustedCutLengthMm: totalAdjustedLengthMm,
    totalWasteMm: context.best.purchasedLengthMm - totalAdjustedLengthMm,
    totalKerfMm: context.best.bars.reduce((sum, bar) => sum + bar.kerfLengthMm, 0),
    totalMassKg: context.best.bars.reduce((sum, bar) => sum + bar.massKg, 0),
    subtotalCost: context.best.cost,
  };
}

export function createPlannerCutPieces(cutListEntries: CutListEntry[], safetyMarginMm: number) {
  return cutListEntries.flatMap((entry) =>
    entry.beamIds.map((beamId, index) => ({
      id: `${entry.key}:${beamId}:${index}`,
      beamId,
      cutListKey: entry.key,
      profileType: entry.profileType,
      nominalLengthMm: entry.lengthMm,
      adjustedLengthMm: entry.lengthMm + Math.max(0, safetyMarginMm),
    }))
  );
}

export function createPlannerOptimizationResult(
  cutListEntries: CutListEntry[],
  settings: PlannerOptimizationSettings
): PlannerOptimizationResult {
  const pieces = createPlannerCutPieces(cutListEntries, settings.safetyMarginMm);
  const profiles: PlannerOptimizationProfileSummary[] = [];
  const missingProfiles: CutListProfileType[] = [];
  const infeasibleProfiles: CutListProfileType[] = [];

  for (const profileType of ['80x40', '40x40'] as const) {
    const profilePieces = pieces.filter((piece) => piece.profileType === profileType);

    if (profilePieces.length === 0) {
      continue;
    }

    const stockOptions = settings.stockOptions.filter((option) => option.profileType === profileType);

    if (stockOptions.length === 0) {
      missingProfiles.push(profileType);
      continue;
    }

    if (profilePieces.some((piece) => stockOptions.every((option) => option.lengthMm < piece.adjustedLengthMm))) {
      infeasibleProfiles.push(profileType);
      continue;
    }

    const result = solveProfilePieces(profileType, profilePieces, stockOptions, settings);

    if (!result) {
      infeasibleProfiles.push(profileType);
      continue;
    }

    profiles.push({
      profileType,
      pieceCount: profilePieces.length,
      purchasedBars: result.bars,
      totalPurchasedLengthMm: result.totalPurchasedLengthMm,
      totalAdjustedCutLengthMm: result.totalAdjustedCutLengthMm,
      totalWasteMm: result.totalWasteMm,
      totalKerfMm: result.totalKerfMm,
      totalMassKg: result.totalMassKg,
      subtotalCost: result.subtotalCost,
    });
  }

  const totalPurchasedLengthMm = profiles.reduce((sum, profile) => sum + profile.totalPurchasedLengthMm, 0);
  const totalAdjustedCutLengthMm = profiles.reduce((sum, profile) => sum + profile.totalAdjustedCutLengthMm, 0);
  const totalWasteMm = profiles.reduce((sum, profile) => sum + profile.totalWasteMm, 0);
  const totalKerfMm = profiles.reduce((sum, profile) => sum + profile.totalKerfMm, 0);
  const totalMassKg = profiles.reduce((sum, profile) => sum + profile.totalMassKg, 0);
  const materialCost = profiles.reduce((sum, profile) => {
    return (
      sum + profile.purchasedBars.reduce((barSum, bar) => barSum + bar.stockCost, 0)
    );
  }, 0);
  const shippingCostFromBars = profiles.reduce(
    (sum, profile) => sum + profile.purchasedBars.reduce((barSum, bar) => barSum + bar.shippingCost, 0),
    0
  );
  const shippingCost =
    settings.shippingMode === 'flat'
      ? totalPurchasedLengthMm > 0
        ? settings.flatShippingCost
        : 0
      : shippingCostFromBars;
  const totalCost = materialCost + shippingCost;
  const barCount = profiles.reduce((sum, profile) => sum + profile.purchasedBars.length, 0);
  const status = missingProfiles.length > 0 ? 'missing-stock-options' : infeasibleProfiles.length > 0 ? 'infeasible' : 'ready';

  return {
    status,
    profiles,
    pieces,
    totalPurchasedLengthMm,
    totalAdjustedCutLengthMm,
    totalWasteMm,
    totalKerfMm,
    totalMassKg,
    materialCost,
    shippingCost,
    totalCost,
    barCount,
    missingProfiles,
    infeasibleProfiles,
  };
}
