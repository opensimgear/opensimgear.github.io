<script lang="ts">
  import type {
    CutListEntry,
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
    hoveredCutListKey: string | null;
    optimizationResult: PlannerOptimizationResult;
    optimizationSettings: PlannerOptimizationSettings;
    onHoveredCutListKeyChange: (key: string | null) => void;
  }

  let {
    cutListEntries,
    hoveredCutListKey,
    optimizationResult,
    optimizationSettings,
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

  function formatMoney(value: number) {
    return `$${value.toFixed(2)}`;
  }

  function formatWeight(value: number) {
    return `${value.toFixed(2)} kg`;
  }

  function formatPieces(bar: PlannerPurchasedBar) {
    return bar.pieces
      .map((piece) =>
        piece.adjustedLengthMm === piece.nominalLengthMm
          ? `${piece.nominalLengthMm} mm`
          : `${piece.nominalLengthMm} + ${piece.adjustedLengthMm - piece.nominalLengthMm} mm`
      )
      .join(' · ');
  }
</script>

<section
  data-testid="aluminum-rig-planner-cut-optimizer"
  class="border-t border-zinc-300 bg-white"
>
  <div class="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
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
                  <td class="px-2 py-1 text-zinc-600">{entry.lengthMm + optimizationSettings.safetyMarginMm} mm</td>
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
                        <td class="px-2 py-1 text-zinc-600">{row.stockLengthMm} mm</td>
                        <td class="px-2 py-1 text-zinc-600">{row.quantity}</td>
                        <td class="px-2 py-1 text-zinc-600">{formatWeight(row.totalMassKg)}</td>
                        <td class="px-2 py-1 text-zinc-600">{formatMoney(row.totalCost)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>

            <div class="space-y-3">
              {#each optimizationResult.profiles as profile (profile.profileType)}
                <section class="rounded border border-zinc-200 bg-white">
                  <div class="border-b border-zinc-200 px-3 py-2">
                    <div class="font-sans text-sm font-semibold text-zinc-900">{profile.profileType} cut layout</div>
                    <div class="mt-1 text-xs text-zinc-500">
                      {profile.purchasedBars.length} bars · {profile.totalWasteMm} mm waste · {formatMoney(profile.subtotalCost)}
                    </div>
                  </div>
                  <div class="grid gap-3 p-3">
                    {#each profile.purchasedBars as bar (bar.id)}
                      <article class="rounded border border-zinc-200 bg-zinc-50 p-3">
                        <div class="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div class="font-['Roboto_Mono',monospace] text-sm font-semibold text-zinc-900">
                              {bar.stockLengthMm} mm stock
                            </div>
                            <div class="mt-1 text-xs text-zinc-500">
                              used {bar.usedLengthMm} mm · waste {bar.wasteLengthMm} mm · kerf {bar.kerfLengthMm} mm
                            </div>
                          </div>
                          <div class="text-right text-xs text-zinc-500">
                            <div>{formatMoney(bar.totalCost)}</div>
                            <div>{formatWeight(bar.massKg)}</div>
                          </div>
                        </div>
                        <div class="mt-3 text-xs text-zinc-700">
                          <span class="font-semibold text-zinc-900">Cuts:</span> {formatPieces(bar)}
                        </div>
                        <div class="mt-3 flex flex-wrap gap-2">
                          {#each bar.pieces as piece (piece.id)}
                            <button
                              class="rounded border border-zinc-300 bg-white px-2 py-1 font-['Roboto_Mono',monospace] text-[11px] text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-100"
                              type="button"
                              onmouseenter={() => onHoveredCutListKeyChange(piece.cutListKey)}
                              onmouseleave={() => onHoveredCutListKeyChange(null)}
                            >
                              {piece.nominalLengthMm}
                              {#if piece.adjustedLengthMm !== piece.nominalLengthMm}
                                <span class="text-zinc-500"> + {piece.adjustedLengthMm - piece.nominalLengthMm}</span>
                              {/if}
                            </button>
                          {/each}
                        </div>
                      </article>
                    {/each}
                  </div>
                </section>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</section>
