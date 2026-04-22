<script lang="ts">
  import { CUT_LIST_HIGHLIGHT_COLOR } from './constants';

  import type {
    CutListEntry,
    PlannerCurrencyCode,
    CutListProfileType,
    PlannerOptimizationResult,
    PlannerOptimizationSettings,
    PlannerPurchasedBar,
  } from './types';

  type PurchaseSummaryRow = {
    key: string;
    profileType: CutListProfileType;
    stockLengthMm: number;
    quantity: number;
    materialCost: number;
    shippingCost: number;
    totalCost: number;
    totalMassKg: number;
  };

  interface Props {
    cutListEntries: CutListEntry[];
    currencyCode: PlannerCurrencyCode;
    currencyLocale: string;
    hoveredCutListKey: string | null;
    optimizationResult: PlannerOptimizationResult;
    optimizationSettings: PlannerOptimizationSettings;
    profileColor: string;
    onHoveredCutListKeyChange: (key: string | null) => void;
  }

  let {
    cutListEntries,
    currencyCode,
    currencyLocale,
    hoveredCutListKey,
    optimizationResult,
    optimizationSettings,
    profileColor,
    onHoveredCutListKeyChange,
  }: Props = $props();

  const purchaseSummaryRows = $derived.by(() => {
    const grouped: Record<string, PurchaseSummaryRow> = {};

    for (const profile of optimizationResult.profiles) {
      for (const bar of profile.purchasedBars) {
        const key = `${bar.profileType}:${bar.stockLengthMm}:${bar.stockOptionId}`;
        const existing = grouped[key];

        if (existing) {
          existing.quantity += 1;
          existing.materialCost += bar.stockCost;
          existing.shippingCost += bar.shippingCost;
          existing.totalCost += bar.totalCost;
          existing.totalMassKg += bar.massKg;
          continue;
        }

        grouped[key] = {
          key,
          profileType: bar.profileType,
          stockLengthMm: bar.stockLengthMm,
          quantity: 1,
          materialCost: bar.stockCost,
          shippingCost: bar.shippingCost,
          totalCost: bar.totalCost,
          totalMassKg: bar.massKg,
        };
      }
    }

    return Object.values(grouped).sort((a, b) => {
      if (a.profileType !== b.profileType) {
        return a.profileType === '80x40' ? -1 : 1;
      }

      return a.stockLengthMm - b.stockLengthMm;
    });
  });

  const visualLayoutBars = $derived.by(() =>
    optimizationResult.profiles
      .flatMap((profile) => profile.purchasedBars)
      .sort((a, b) => {
        if (a.stockLengthMm !== b.stockLengthMm) {
          return b.stockLengthMm - a.stockLengthMm;
        }

        if (a.profileType !== b.profileType) {
          return a.profileType.localeCompare(b.profileType);
        }

        return a.id.localeCompare(b.id);
      })
  );

  const maxPurchasedBarLengthMm = $derived.by(() =>
    optimizationResult.profiles.reduce(
      (maximum, profile) =>
        Math.max(maximum, ...profile.purchasedBars.map((bar) => bar.stockLengthMm)),
      0
    )
  );
  const BAR_RULER_STEP_MM = 250;

  function formatMoney(value: number) {
    return new Intl.NumberFormat(currencyLocale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function formatWeight(value: number) {
    return `${value.toFixed(2)} kg`;
  }

  function formatStockLength(valueMm: number) {
    return `${(valueMm / 1000).toFixed(1)} m`;
  }

  function getBarWidthPercent(bar: PlannerPurchasedBar) {
    if (maxPurchasedBarLengthMm <= 0) {
      return 100;
    }

    return (bar.stockLengthMm / maxPurchasedBarLengthMm) * 100;
  }

  function getBarTickMarks(bar: PlannerPurchasedBar) {
    const tickCount = Math.floor(bar.stockLengthMm / BAR_RULER_STEP_MM);

    return Array.from({ length: tickCount }, (_, index) => (index + 1) * BAR_RULER_STEP_MM).filter(
      (tickMm) => tickMm < bar.stockLengthMm
    );
  }

  function getPieceSafetyLengthMm(piece: PlannerPurchasedBar['pieces'][number]) {
    return Math.max(0, piece.adjustedLengthMm - piece.nominalLengthMm);
  }

  function getPieceSafetyLengthPerSideMm(piece: PlannerPurchasedBar['pieces'][number]) {
    return getPieceSafetyLengthMm(piece) / 2;
  }

  function getPieceAdjustedWidthPercent(piece: PlannerPurchasedBar['pieces'][number], bar: PlannerPurchasedBar) {
    if (bar.stockLengthMm <= 0) {
      return 0;
    }

    return (piece.adjustedLengthMm / bar.stockLengthMm) * 100;
  }

  function getPieceNominalWidthPercent(piece: PlannerPurchasedBar['pieces'][number]) {
    if (piece.adjustedLengthMm <= 0) {
      return 0;
    }

    return (piece.nominalLengthMm / piece.adjustedLengthMm) * 100;
  }

  function getPieceSafetyWidthPercent(piece: PlannerPurchasedBar['pieces'][number]) {
    if (piece.adjustedLengthMm <= 0) {
      return 0;
    }

    return (getPieceSafetyLengthMm(piece) / piece.adjustedLengthMm) * 100;
  }

  function getPieceSafetyWidthPercentPerSide(piece: PlannerPurchasedBar['pieces'][number]) {
    return getPieceSafetyWidthPercent(piece) / 2;
  }

  function getKerfWidthPercent(bar: PlannerPurchasedBar) {
    if (bar.stockLengthMm <= 0 || optimizationSettings.bladeThicknessMm <= 0) {
      return 0;
    }

    return (optimizationSettings.bladeThicknessMm / bar.stockLengthMm) * 100;
  }

  function getBarMaterialLengthMm(bar: PlannerPurchasedBar) {
    return bar.pieces.reduce((sum, piece) => sum + piece.nominalLengthMm, 0);
  }

  function getBarSafetyLengthMm(bar: PlannerPurchasedBar) {
    return bar.pieces.reduce((sum, piece) => sum + getPieceSafetyLengthMm(piece), 0);
  }

  function getBarUnusedLengthMm(bar: PlannerPurchasedBar) {
    return Math.max(0, bar.stockLengthMm - bar.usedLengthMm);
  }

  function getBarUnusedWidthPercent(bar: PlannerPurchasedBar) {
    if (bar.stockLengthMm <= 0) {
      return 0;
    }

    return (getBarUnusedLengthMm(bar) / bar.stockLengthMm) * 100;
  }

  function getBarTooltip(bar: PlannerPurchasedBar) {
    return [
      `${bar.profileType} - ${formatStockLength(bar.stockLengthMm)} stock`,
      `Material: ${getBarMaterialLengthMm(bar)} mm`,
      `Safety: ${getBarSafetyLengthMm(bar)} mm total`,
      `Kerf: ${bar.kerfLengthMm} mm`,
      `Unused: ${getBarUnusedLengthMm(bar)} mm`,
      `Price: ${formatMoney(bar.totalCost)}`,
      `Weight: ${formatWeight(bar.massKg)}`,
    ].join('\n');
  }

  function getPieceColor(cutListKey: string) {
    return hoveredCutListKey === cutListKey ? CUT_LIST_HIGHLIGHT_COLOR : profileColor;
  }

  function getPieceSafetyColor(cutListKey: string) {
    return hoveredCutListKey === cutListKey ? 'rgba(34, 197, 94, 0.55)' : 'rgba(96, 165, 250, 0.45)';
  }

  function shouldShowPieceLabel(piece: PlannerPurchasedBar['pieces'][number], bar: PlannerPurchasedBar) {
    return getPieceAdjustedWidthPercent(piece, bar) >= 12;
  }
</script>

<section
  data-testid="aluminum-rig-planner-cut-optimizer"
  class="border-t border-zinc-300 bg-white"
>
  <div class="space-y-4 p-4">
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div class="space-y-4">
        <div class="rounded border border-zinc-200 bg-zinc-50">
          <div class="border-b border-zinc-200 px-3 py-2">
            <h3 class="font-sans text-sm font-semibold text-zinc-900">Required cuts</h3>
            <p class="mt-1 text-xs text-zinc-500">Nominal lengths from current rig. Adjusted adds safety margin per piece.</p>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full border-collapse font-['Roboto_Mono',monospace] text-[12px] leading-tight text-zinc-900">
              <thead>
                <tr class="border-b border-zinc-200 bg-white text-zinc-600">
                  <th class="px-2 py-1 text-left font-medium">Profile</th>
                  <th class="px-2 py-1 text-left font-medium">Nominal</th>
                  <th class="px-2 py-1 text-left font-medium">Cut</th>
                  <th class="px-2 py-1 text-left font-medium">Qty</th>
                </tr>
              </thead>
              <tbody>
                {#each cutListEntries as entry (entry.key)}
                  <tr
                    class:bg-zinc-100={hoveredCutListKey === entry.key}
                    class="cursor-pointer border-b border-zinc-100 last:border-b-0"
                    onmouseenter={() => onHoveredCutListKeyChange(entry.key)}
                    onmouseleave={() => onHoveredCutListKeyChange(null)}
                  >
                    <td class="px-2 py-1 font-medium text-zinc-800">{entry.profileType}</td>
                    <td class="px-2 py-1 text-zinc-600">{entry.lengthMm} mm</td>
                    <td class="px-2 py-1 text-zinc-600">{entry.lengthMm + optimizationSettings.safetyMarginMm * 2} mm</td>
                    <td class="px-2 py-1 text-zinc-600">{entry.quantity}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="rounded border border-zinc-200 bg-zinc-50">
          <div class="border-b border-zinc-200 px-3 py-2">
            <h3 class="font-sans text-sm font-semibold text-zinc-900">Purchase result</h3>
          </div>

          {#if optimizationResult.status === 'missing-stock-options'}
            <div class="p-3 text-sm text-amber-700">
              Add stock lengths for {optimizationResult.missingProfiles.join(', ')} to run optimizer.
            </div>
          {:else if optimizationResult.status === 'infeasible'}
            <div class="p-3 text-sm text-red-700">
              No stock length can fit at least one adjusted cut for {optimizationResult.infeasibleProfiles.join(', ')}.
            </div>
          {:else if optimizationResult.barCount === 0}
            <div class="p-3 text-sm text-zinc-500">No purchasable bars needed yet.</div>
          {:else}
            <div class="grid gap-4 p-3">
              <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div class="rounded border border-zinc-200 bg-white p-3">
                  <div class="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Total cost</div>
                  <div class="mt-1 font-['Roboto_Mono',monospace] text-lg text-zinc-900">
                    {formatMoney(optimizationResult.totalCost)}
                  </div>
                  <div class="mt-1 text-xs text-zinc-500">
                    material {formatMoney(optimizationResult.materialCost)} · shipping {formatMoney(optimizationResult.shippingCost)}
                  </div>
                </div>

                <div class="rounded border border-zinc-200 bg-white p-3">
                  <div class="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Waste</div>
                  <div class="mt-1 font-['Roboto_Mono',monospace] text-lg text-zinc-900">
                    {optimizationResult.totalWasteMm} mm
                  </div>
                  <div class="mt-1 text-xs text-zinc-500">
                    kerf {optimizationResult.totalKerfMm} mm · bars {optimizationResult.barCount}
                  </div>
                </div>

                <div class="rounded border border-zinc-200 bg-white p-3">
                  <div class="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Purchased mass</div>
                  <div class="mt-1 font-['Roboto_Mono',monospace] text-lg text-zinc-900">
                    {formatWeight(optimizationResult.totalMassKg)}
                  </div>
                  <div class="mt-1 text-xs text-zinc-500">
                    stock {optimizationResult.totalPurchasedLengthMm} mm
                  </div>
                </div>
              </div>

              <div class="rounded border border-zinc-200 bg-white">
                <div class="border-b border-zinc-200 px-3 py-2 font-sans text-sm font-semibold text-zinc-900">
                  Purchase summary
                </div>
                <div class="overflow-x-auto">
                  <table class="min-w-full border-collapse font-['Roboto_Mono',monospace] text-[12px] leading-tight text-zinc-900">
                    <thead>
                      <tr class="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                        <th class="px-2 py-1 text-left font-medium">Profile</th>
                        <th class="px-2 py-1 text-left font-medium">Stock</th>
                        <th class="px-2 py-1 text-left font-medium">Qty</th>
                        <th class="px-2 py-1 text-left font-medium">Mass</th>
                        <th class="px-2 py-1 text-left font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each purchaseSummaryRows as row (row.key)}
                        <tr class="border-b border-zinc-100 last:border-b-0">
                          <td class="px-2 py-1 font-medium text-zinc-800">{row.profileType}</td>
                          <td class="px-2 py-1 text-zinc-600">{formatStockLength(row.stockLengthMm)}</td>
                          <td class="px-2 py-1 text-zinc-600">{row.quantity}</td>
                          <td class="px-2 py-1 text-zinc-600">{formatWeight(row.totalMassKg)}</td>
                          <td class="px-2 py-1 text-zinc-600">{formatMoney(row.totalCost)}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    {#if optimizationResult.status === 'ready' && optimizationResult.barCount > 0}
      <div class="rounded border border-zinc-200 bg-zinc-50">
        <div class="border-b border-zinc-200 px-3 py-2">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 class="font-sans text-sm font-semibold text-zinc-900">Visual cut layout</h3>
              <p class="mt-1 text-xs text-zinc-500">Bars scale to real purchased length. Empty space is unused stock.</p>
            </div>
            <div class="flex flex-wrap gap-3 text-xs text-zinc-600">
              <div class="flex items-center gap-2">
                <span
                  class="h-3 w-6 rounded-sm border border-zinc-300"
                  style={`background-color: ${profileColor};`}
                ></span>
                <span>Material</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="h-3 w-6 rounded-sm border border-blue-300 bg-blue-400/45"></span>
                <span>Safety margin</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="h-3 w-6 rounded-sm border border-red-300 bg-red-500/35"></span>
                <span>Kerf</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="h-3 w-6 rounded-sm border border-yellow-300 bg-yellow-400/35"></span>
                <span>Waste</span>
              </div>
            </div>
          </div>
        </div>
        <div class="px-3 pb-3">
          <div class="overflow-hidden rounded border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            {#each visualLayoutBars as bar (bar.id)}
              <article
                class="blueprint-row grid grid-cols-[4.5rem_minmax(0,1fr)_8.25rem] items-center gap-3 border-b border-slate-200 px-3 py-3 last:border-b-0"
                title={getBarTooltip(bar)}
              >
                <div class="flex justify-center">
                  <div class="profile-chip">
                    {bar.profileType}
                  </div>
                </div>

                <div class="min-w-0">
                  <div class="mx-auto" style={`width: ${getBarWidthPercent(bar)}%;`}>
                    <div class="bar-ruler">
                      {#each getBarTickMarks(bar) as tickMm (tickMm)}
                        <span class="bar-ruler__tick" style={`left: ${(tickMm / bar.stockLengthMm) * 100}%;`}></span>
                      {/each}
                    </div>
                    <div class="bar-shell">
                      <div class="bar-shell__grid"></div>
                      <div class="flex h-11 w-full">
                      {#each bar.pieces as piece, pieceIndex (piece.id)}
                        <button
                          class="bar-piece m-0 flex h-full shrink-0 appearance-none overflow-hidden border-r border-slate-200 bg-transparent p-0"
                          style={`width: ${getPieceAdjustedWidthPercent(piece, bar)}%;`}
                          title={`${piece.nominalLengthMm} mm material + ${getPieceSafetyLengthPerSideMm(piece)} mm safety each side`}
                          type="button"
                          onmouseenter={() => onHoveredCutListKeyChange(piece.cutListKey)}
                          onmouseleave={() => onHoveredCutListKeyChange(null)}
                        >
                          {#if getPieceSafetyLengthMm(piece) > 0}
                            <span
                              class="h-full shrink-0"
                              style={`width: ${getPieceSafetyWidthPercentPerSide(piece)}%; background-color: ${getPieceSafetyColor(piece.cutListKey)};`}
                            ></span>
                          {/if}
                          <span
                            class="bar-piece__material relative h-full shrink-0"
                            style={`width: ${getPieceNominalWidthPercent(piece)}%; background-color: ${getPieceColor(piece.cutListKey)};`}
                          >
                            {#if shouldShowPieceLabel(piece, bar)}
                              <span class="bar-piece__label">{piece.nominalLengthMm}</span>
                            {/if}
                          </span>
                          {#if getPieceSafetyLengthMm(piece) > 0}
                            <span
                              class="h-full shrink-0"
                              style={`width: ${getPieceSafetyWidthPercentPerSide(piece)}%; background-color: ${getPieceSafetyColor(piece.cutListKey)};`}
                            ></span>
                          {/if}
                        </button>
                        {#if pieceIndex < bar.pieces.length - 1 && optimizationSettings.bladeThicknessMm > 0}
                          <div
                            class="bar-kerf h-full shrink-0"
                            style={`width: ${getKerfWidthPercent(bar)}%;`}
                            title={`${optimizationSettings.bladeThicknessMm} mm kerf`}
                          ></div>
                        {/if}
                      {/each}
                      {#if bar.pieces.length > 0 && optimizationSettings.bladeThicknessMm > 0}
                        <div
                          class="bar-kerf h-full shrink-0"
                          style={`width: ${getKerfWidthPercent(bar)}%;`}
                          title={`${optimizationSettings.bladeThicknessMm} mm kerf`}
                        ></div>
                      {/if}
                      {#if getBarUnusedLengthMm(bar) > 0}
                        <div
                          class="bar-waste h-full shrink-0"
                          style={`width: ${getBarUnusedWidthPercent(bar)}%;`}
                          title={`${getBarUnusedLengthMm(bar)} mm waste`}
                        ></div>
                      {/if}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="space-y-1 text-right font-['Roboto_Mono',monospace] text-[11px] leading-tight text-slate-600">
                  <div class="text-[13px] font-semibold text-slate-900">{formatStockLength(bar.stockLengthMm)}</div>
                  <div>{formatMoney(bar.totalCost)}</div>
                  <div>{formatWeight(bar.massKg)}</div>
                  <div>{getBarUnusedLengthMm(bar)} mm waste</div>
                </div>
              </article>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </div>
</section>

<style>
  .blueprint-row {
    background:
      linear-gradient(180deg, rgba(250, 252, 255, 0.9), rgba(244, 247, 251, 0.88)),
      linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
      linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px);
    background-size:
      100% 100%,
      18px 18px,
      18px 18px;
  }

  .profile-chip {
    min-width: 3.75rem;
    padding: 0.35rem 0.5rem;
    border: 1px solid rgb(186 230 253);
    background: linear-gradient(180deg, rgb(240 249 255), rgb(224 242 254));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.95),
      0 1px 2px rgba(15, 23, 42, 0.08);
    color: rgb(15 23 42);
    font-family: 'Roboto Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-align: center;
  }

  .bar-ruler {
    position: relative;
    height: 0.6rem;
    margin-bottom: 0.35rem;
    border-top: 1px solid rgb(191 219 254);
  }

  .bar-ruler__tick {
    position: absolute;
    top: -1px;
    width: 1px;
    height: 0.55rem;
    background: rgb(148 163 184);
    opacity: 0.6;
  }

  .bar-shell {
    position: relative;
    overflow: hidden;
    border: 1px solid rgb(148 163 184);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(241, 245, 249, 0.92));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.95),
      0 3px 10px rgba(15, 23, 42, 0.08);
  }

  .bar-shell__grid {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
      linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px);
    background-size: 20px 100%, 100% 10px;
    pointer-events: none;
  }

  .bar-piece {
    position: relative;
    z-index: 1;
  }

  .bar-piece__material {
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.14),
      inset 0 -1px 0 rgba(15, 23, 42, 0.18);
  }

  .bar-piece__label {
    padding: 0 0.35rem;
    color: rgba(255, 255, 255, 0.92);
    font-family: 'Roboto Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    text-shadow: 0 1px 1px rgba(15, 23, 42, 0.45);
    white-space: nowrap;
    pointer-events: none;
  }

  .bar-kerf {
    position: relative;
    z-index: 1;
    background: rgba(239, 68, 68, 0.42);
    box-shadow:
      inset 1px 0 0 rgba(127, 29, 29, 0.2),
      inset -1px 0 0 rgba(127, 29, 29, 0.2);
  }

  .bar-waste {
    position: relative;
    z-index: 1;
    background:
      repeating-linear-gradient(
        135deg,
        rgba(250, 204, 21, 0.38) 0,
        rgba(250, 204, 21, 0.38) 8px,
        rgba(253, 224, 71, 0.18) 8px,
        rgba(253, 224, 71, 0.18) 16px
      );
  }
</style>
