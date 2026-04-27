<script lang="ts">
  import { buildPlannerPrintDocument, hasSelectedPlannerExportSections, type PlannerExportSections } from './export';
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

  type VisualLayoutGroup = {
    profileType: CutListProfileType;
    bars: PlannerPurchasedBar[];
  };

  interface Props {
    cutListEntries: CutListEntry[];
    currencyCode: PlannerCurrencyCode;
    currencyLocale: string;
    hoveredCutListKey: string | null;
    isNarrowViewport?: boolean;
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
    isNarrowViewport = false,
    optimizationResult,
    optimizationSettings,
    profileColor,
    onHoveredCutListKeyChange,
  }: Props = $props();
  let cutListCollapsed = $state(true);
  let visualLayoutExportRoot = $state<HTMLDivElement | null>(null);
  let purchaseSummaryExportRoot = $state<HTMLDivElement | null>(null);
  let exportMenuOpen = $state(false);
  let wasteWidthByBarId = $state<Record<string, number>>({});
  let exportSections = $state<PlannerExportSections>({
    image: true,
    visualLayout: true,
    purchaseSummary: true,
  });
  const wasteLabelWidthCache: Record<string, number> = {};

  function compareProfileTypes(a: CutListProfileType, b: CutListProfileType) {
    if (a === b) {
      return 0;
    }

    return a === '80x40' ? -1 : 1;
  }

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
        return compareProfileTypes(a.profileType, b.profileType);
      }

      return a.stockLengthMm - b.stockLengthMm;
    });
  });

  const visualLayoutGroups = $derived.by(() =>
    optimizationResult.profiles
      .slice()
      .sort((a, b) => {
        return compareProfileTypes(a.profileType, b.profileType);
      })
      .map<VisualLayoutGroup>((profile) => ({
        profileType: profile.profileType,
        bars: profile.purchasedBars.slice().sort((a, b) => {
          if (a.stockLengthMm !== b.stockLengthMm) {
            return b.stockLengthMm - a.stockLengthMm;
          }

          return a.id.localeCompare(b.id);
        }),
      }))
      .filter((group) => group.bars.length > 0)
  );

  const maxPurchasedBarLengthMm = $derived.by(() =>
    optimizationResult.profiles.reduce(
      (maximum, profile) => Math.max(maximum, ...profile.purchasedBars.map((bar) => bar.stockLengthMm)),
      0
    )
  );
  const totalSafetyMarginWasteMm = $derived.by(() =>
    optimizationResult.pieces.reduce(
      (sum, piece) => sum + Math.max(0, piece.adjustedLengthMm - piece.nominalLengthMm),
      0
    )
  );
  const BAR_RULER_STEP_MM = 100;
  const WHOLE_METER_MM = 1000;

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

  function formatLengthMm(value: number) {
    return `${new Intl.NumberFormat(currencyLocale, {
      maximumFractionDigits: 2,
    }).format(value)} mm`;
  }

  function formatWholeLengthMm(value: number) {
    return `${new Intl.NumberFormat(currencyLocale, {
      maximumFractionDigits: 0,
    }).format(value)} mm`;
  }

  function formatStockLength(valueMm: number) {
    return `${(valueMm / 1000).toFixed(1)} m`;
  }

  function getWasteLabelText(bar: PlannerPurchasedBar) {
    return formatWholeLengthMm(getBarUnusedLengthMm(bar));
  }

  function measureWasteLabelWidthPx(text: string) {
    const cachedWidth = wasteLabelWidthCache[text];

    if (cachedWidth !== undefined) {
      return cachedWidth;
    }

    let width = text.length * 6.2;

    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (context) {
        context.font = "700 9px 'Roboto Mono', monospace";
        width = context.measureText(text).width;
      }
    }

    wasteLabelWidthCache[text] = width;

    return width;
  }

  function getBarWidthPercent(bar: PlannerPurchasedBar) {
    if (maxPurchasedBarLengthMm <= 0) {
      return 100;
    }

    return (bar.stockLengthMm / maxPurchasedBarLengthMm) * 100;
  }

  function getBarTickMarks(bar: PlannerPurchasedBar) {
    const tickCount = Math.floor(bar.stockLengthMm / BAR_RULER_STEP_MM);
    const ticks = Array.from({ length: tickCount + 1 }, (_, index) => index * BAR_RULER_STEP_MM);

    if (ticks.at(-1) !== bar.stockLengthMm) {
      ticks.push(bar.stockLengthMm);
    }

    return ticks;
  }

  function formatTickLabelMeters(tickMm: number) {
    return `${tickMm / WHOLE_METER_MM} m`;
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

  function getBarUnusedLengthMm(bar: PlannerPurchasedBar) {
    return Math.max(0, bar.stockLengthMm - bar.usedLengthMm);
  }

  function getBarUnusedWidthPercent(bar: PlannerPurchasedBar) {
    if (bar.stockLengthMm <= 0) {
      return 0;
    }

    return (getBarUnusedLengthMm(bar) / bar.stockLengthMm) * 100;
  }

  function getKerfAriaLabel() {
    return `Blade kerf ${formatLengthMm(optimizationSettings.bladeThicknessMm)}`;
  }

  function getWasteAriaLabel(bar: PlannerPurchasedBar) {
    return `Waste ${formatWholeLengthMm(getBarUnusedLengthMm(bar))}`;
  }

  function setWasteWidth(barId: string, width: number) {
    if (wasteWidthByBarId[barId] === width) {
      return;
    }

    wasteWidthByBarId = {
      ...wasteWidthByBarId,
      [barId]: width,
    };
  }

  function shouldShowWasteLabel(bar: PlannerPurchasedBar) {
    const wasteWidth = wasteWidthByBarId[bar.id];

    if (!wasteWidth) {
      return false;
    }

    return wasteWidth >= measureWasteLabelWidthPx(getWasteLabelText(bar)) + 8;
  }

  function getPieceColor() {
    return profileColor;
  }

  function getPieceSafetyColor() {
    return 'rgba(96, 165, 250, 0.45)';
  }

  function shouldShowTickLabel(tickMm: number, bar: PlannerPurchasedBar) {
    return tickMm > 0 && tickMm <= bar.stockLengthMm && tickMm % WHOLE_METER_MM === 0;
  }

  function isEdgeTick(tickMm: number, bar: PlannerPurchasedBar) {
    return tickMm === 0 || tickMm === bar.stockLengthMm;
  }

  function isMajorTick(tickMm: number) {
    return tickMm % 500 === 0;
  }

  function isPieceHighlighted(cutListKey: string) {
    return hoveredCutListKey === cutListKey;
  }

  function shouldShowPieceLabel(piece: PlannerPurchasedBar['pieces'][number], bar: PlannerPurchasedBar) {
    return getPieceAdjustedWidthPercent(piece, bar) >= 12;
  }

  const canRunExport = $derived(hasSelectedPlannerExportSections(exportSections));

  function getPrintStylesheetsHtml() {
    if (typeof document === 'undefined') {
      return '';
    }

    return Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join('\n');
  }

  function capturePlannerPreviewScreenshot() {
    if (typeof document === 'undefined') {
      return '';
    }

    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="aluminum-rig-planner-preview-canvas"]');

    if (!canvas) {
      return '';
    }

    try {
      return canvas.toDataURL('image/png');
    } catch {
      return '';
    }
  }

  function removePrintFrame(frame: HTMLIFrameElement | null) {
    frame?.remove();
  }

  function runPrintExport() {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const selection = $state.snapshot(exportSections);
    const screenshot = selection.image ? capturePlannerPreviewScreenshot() : '';
    const resolvedSections: PlannerExportSections = {
      image: selection.image && Boolean(screenshot),
      visualLayout: selection.visualLayout && Boolean(visualLayoutExportRoot),
      purchaseSummary: selection.purchaseSummary && Boolean(purchaseSummaryExportRoot),
    };

    if (!hasSelectedPlannerExportSections(resolvedSections)) {
      return;
    }

    const printDocument = buildPlannerPrintDocument({
      title: 'OpenSimGear Rig Planner',
      subtitle: '3D view, cut layout, and purchase summary export',
      imageAlt: '3D rig planner view screenshot',
      imageUrl: screenshot,
      purchaseSummaryHtml: purchaseSummaryExportRoot?.outerHTML ?? '',
      sections: resolvedSections,
      stylesheetsHtml: getPrintStylesheetsHtml(),
      visualLayoutHtml: visualLayoutExportRoot?.outerHTML ?? '',
    });

    exportMenuOpen = false;
    const printFrame = document.createElement('iframe');
    printFrame.setAttribute('aria-hidden', 'true');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.opacity = '0';
    printFrame.style.pointerEvents = 'none';
    document.body.append(printFrame);

    const cleanup = () => {
      if (cleanupTimer) {
        window.clearTimeout(cleanupTimer);
      }
      removePrintFrame(printFrame);
    };
    const cleanupTimer = window.setTimeout(cleanup, 60_000);
    const printWindow = printFrame.contentWindow;

    if (!printWindow) {
      cleanup();
      return;
    }

    printWindow.addEventListener('afterprint', cleanup, { once: true });
    printWindow.addEventListener('pagehide', cleanup, { once: true });
    printWindow.document.open();
    printWindow.document.write(printDocument);
    printWindow.document.close();
  }
</script>

<section data-testid="aluminum-rig-planner-cut-optimizer" class="border-t border-zinc-300 bg-white">
  {#if isNarrowViewport}
    <button
      type="button"
      class="cut-list-toggle flex w-full items-center justify-between border-b border-zinc-200 bg-zinc-50/80 px-4 py-2.5 text-left text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100/80"
      aria-expanded={!cutListCollapsed}
      onclick={() => {
        cutListCollapsed = !cutListCollapsed;
      }}
    >
      <span class="flex items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          class="h-4 w-4 text-zinc-500"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"></path>
          <path d="M4 12h8"></path>
          <path d="M12 4v16"></path>
        </svg>
        Cut List & Optimizer
      </span>
      <svg
        viewBox="0 0 12 12"
        class="h-3 w-3 text-zinc-400 transition-transform duration-200"
        class:rotate-180={!cutListCollapsed}
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M3 5l3 3 3-3" />
      </svg>
    </button>
  {/if}
  {#if !isNarrowViewport || !cutListCollapsed}
    <div class={isNarrowViewport ? 'space-y-3 px-0 py-3 sm:space-y-4 sm:px-4 sm:py-4' : 'space-y-4 p-4'}>
      {#if optimizationResult.status === 'ready' && optimizationResult.barCount > 0}
        <div bind:this={visualLayoutExportRoot} class="rounded border border-zinc-200 bg-zinc-50">
          <div class="widget-card__header border-b border-zinc-200 px-3 py-2">
            <div class="flex flex-col gap-3">
              <div class="flex items-start justify-between gap-3">
                <h3 class="widget-card__title font-sans text-sm font-semibold text-zinc-900">
                  <span
                    class="widget-card__icon grid h-6 w-6 place-items-center rounded-sm border border-sky-200 bg-sky-50 text-sky-700"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      class="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"></path>
                      <path d="M4 12h8"></path>
                      <path d="M12 15h8"></path>
                      <path d="M12 9h8"></path>
                      <path d="M12 4v16"></path>
                    </svg>
                  </span>
                  <span>Visual Cut Layout</span>
                </h3>
                <div class="planner-export-controls flex items-center justify-start">
                  <details bind:open={exportMenuOpen} class="export-menu">
                    <summary
                      class="control-chip control-chip--slate flex cursor-pointer list-none items-center gap-1.5 border-0 p-0 text-left font-['Roboto_Mono',monospace] text-[10px] text-zinc-700"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        class="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 3v12"></path>
                        <path d="m7 10l5 5l5-5"></path>
                        <path d="M5 21h14"></path>
                      </svg>
                      <span>Export</span>
                    </summary>
                    <div class="export-menu__panel">
                      <div class="export-menu__eyebrow">Print export</div>
                      <div class="export-menu__copy">Deactivate any section before opening print preview.</div>
                      <label class="export-menu__option">
                        <input bind:checked={exportSections.image} type="checkbox" />
                        <span>3D view screenshot</span>
                      </label>
                      <label class="export-menu__option">
                        <input bind:checked={exportSections.visualLayout} type="checkbox" />
                        <span>Visual cut layout</span>
                      </label>
                      <label class="export-menu__option">
                        <input bind:checked={exportSections.purchaseSummary} type="checkbox" />
                        <span>Purchase summary</span>
                      </label>
                      <button
                        type="button"
                        class="export-menu__action"
                        disabled={!canRunExport}
                        onclick={runPrintExport}
                      >
                        Open print preview
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>
          <div class="overflow-hidden rounded bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            {#each visualLayoutGroups as group (group.profileType)}
              <section class="visual-layout-group border-b border-slate-200 last:border-b-0">
                <div class="visual-layout-group__header flex items-center justify-between gap-3 px-3 py-2">
                  <div class="flex items-center gap-3">
                    <div class="profile-name">
                      {group.profileType}
                    </div>
                    <div class="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">profile bars</div>
                  </div>
                  <div class="font-['Roboto_Mono',monospace] text-[11px] text-slate-500">
                    {group.bars.length}
                    {group.bars.length === 1 ? 'bar' : 'bars'}
                  </div>
                </div>
                <div class="visual-layout-group__rows">
                  {#each group.bars as bar (bar.id)}
                    <article class="blueprint-row border-t border-slate-200 px-3 py-3 first:border-t-0">
                      <div class="min-w-0">
                        <div style={`width: ${getBarWidthPercent(bar)}%;`}>
                          <div class="bar-ruler">
                            {#each getBarTickMarks(bar) as tickMm (tickMm)}
                              <span
                                class={[
                                  'bar-ruler__tick',
                                  isEdgeTick(tickMm, bar) && 'bar-ruler__tick--edge',
                                  isMajorTick(tickMm) && 'bar-ruler__tick--major',
                                  tickMm === bar.stockLengthMm && 'bar-ruler__tick--end',
                                ]}
                                style={`left: ${(tickMm / bar.stockLengthMm) * 100}%;`}
                              >
                                {#if shouldShowTickLabel(tickMm, bar)}
                                  <span class="bar-ruler__label">{formatTickLabelMeters(tickMm)}</span>
                                {/if}
                              </span>
                            {/each}
                          </div>
                          <div class="bar-shell">
                            <div class="flex h-4 w-full">
                              {#each bar.pieces as piece, pieceIndex (piece.id)}
                                <button
                                  class="bar-piece m-0 flex h-full shrink-0 appearance-none overflow-hidden border-r border-slate-200 bg-transparent p-0"
                                  style={`width: ${getPieceAdjustedWidthPercent(piece, bar)}%;`}
                                  aria-label={`${piece.nominalLengthMm} mm material plus ${getPieceSafetyLengthPerSideMm(piece)} mm safety each side`}
                                  type="button"
                                  onmouseenter={() => onHoveredCutListKeyChange(piece.cutListKey)}
                                  onmouseleave={() => {
                                    onHoveredCutListKeyChange(null);
                                  }}
                                >
                                  {#if getPieceSafetyLengthMm(piece) > 0}
                                    <span
                                      class="h-full shrink-0"
                                      style={`width: ${getPieceSafetyWidthPercentPerSide(piece)}%; background-color: ${getPieceSafetyColor()};`}
                                    ></span>
                                  {/if}
                                  <span
                                    class="bar-piece__material relative h-full shrink-0"
                                    style={`width: ${getPieceNominalWidthPercent(piece)}%; background-color: ${getPieceColor()};`}
                                  >
                                    {#if isPieceHighlighted(piece.cutListKey)}
                                      <span class="bar-piece__highlight"></span>
                                    {/if}
                                    {#if shouldShowPieceLabel(piece, bar)}
                                      <span class="bar-piece__label">{piece.nominalLengthMm}</span>
                                    {/if}
                                  </span>
                                  {#if getPieceSafetyLengthMm(piece) > 0}
                                    <span
                                      class="relative h-full shrink-0"
                                      style={`width: ${getPieceSafetyWidthPercentPerSide(piece)}%; background-color: ${getPieceSafetyColor()};`}
                                    ></span>
                                  {/if}
                                  {#if isPieceHighlighted(piece.cutListKey)}
                                    <span class="bar-piece__highlight"></span>
                                  {/if}
                                </button>
                                {#if pieceIndex < bar.pieces.length - 1 && optimizationSettings.bladeThicknessMm > 0}
                                  <div
                                    class="bar-kerf h-full shrink-0"
                                    style={`width: ${getKerfWidthPercent(bar)}%;`}
                                    role="img"
                                    aria-label={getKerfAriaLabel()}
                                  ></div>
                                {/if}
                              {/each}
                              {#if bar.pieces.length > 0 && optimizationSettings.bladeThicknessMm > 0}
                                <div
                                  class="bar-kerf h-full shrink-0"
                                  style={`width: ${getKerfWidthPercent(bar)}%;`}
                                  role="img"
                                  aria-label={getKerfAriaLabel()}
                                ></div>
                              {/if}
                              {#if getBarUnusedLengthMm(bar) > 0}
                                <div
                                  class="bar-waste h-full shrink-0"
                                  style={`width: ${getBarUnusedWidthPercent(bar)}%;`}
                                  role="img"
                                  aria-label={getWasteAriaLabel(bar)}
                                  bind:clientWidth={null, (width) => setWasteWidth(bar.id, width)}
                                >
                                  {#if shouldShowWasteLabel(bar)}
                                    <span class="bar-waste__label">{getWasteLabelText(bar)}</span>
                                  {/if}
                                </div>
                              {/if}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  {/each}
                </div>
              </section>
            {/each}
          </div>
        </div>
      {/if}

      <div class="flex flex-wrap items-start gap-4">
        <div class="min-w-max flex-[1_1_max-content] space-y-4">
          <div class="required-cuts-card w-full rounded border border-zinc-200">
            <div class="widget-card__header border-b border-zinc-200 px-3 py-2">
              <h3 class="widget-card__title font-sans text-sm font-semibold text-zinc-900">
                <span
                  class="widget-card__icon grid h-6 w-6 place-items-center rounded-sm border border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path>
                    <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2"></path>
                    <path d="M9 12h.01"></path>
                    <path d="M13 12h2"></path>
                    <path d="M9 16h.01"></path>
                    <path d="M13 16h2"></path>
                  </svg>
                </span>
                <span>Cut List</span>
              </h3>
            </div>
            <div>
              <table
                class="min-w-full w-max border-collapse font-['Roboto_Mono',monospace] text-[12px] leading-tight text-zinc-900 whitespace-nowrap"
              >
                <thead>
                  <tr class="border-b border-zinc-200 bg-white text-zinc-600">
                    <th class="px-2 py-1 text-left font-medium">Profile</th>
                    <th class="px-2 py-1 text-right font-medium">Length</th>
                    <th class="px-2 py-1 text-center font-medium">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {#each cutListEntries as entry (entry.key)}
                    <tr
                      class:required-cuts-row--highlight={hoveredCutListKey === entry.key}
                      class="cursor-pointer border-b border-zinc-100 transition-colors last:border-b-0"
                      onmouseenter={() => onHoveredCutListKeyChange(entry.key)}
                      onmouseleave={() => onHoveredCutListKeyChange(null)}
                    >
                      <td class="px-2 py-1 font-medium text-zinc-800">{entry.profileType}</td>
                      <td class="px-2 py-1 text-right text-zinc-600">{entry.lengthMm} mm</td>
                      <td class="px-2 py-1 text-center text-zinc-600">{entry.quantity}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="min-w-max flex-[1_1_max-content] space-y-4">
          <div bind:this={purchaseSummaryExportRoot} class="w-full rounded border border-zinc-200 bg-zinc-50">
            <div class="widget-card__header border-b border-zinc-200 px-3 py-2">
              <div class="flex items-start justify-between gap-3 sm:items-center">
                <h3 class="widget-card__title min-w-0 pr-2 font-sans text-sm font-semibold text-zinc-900">
                  <span
                    class="widget-card__icon grid h-6 w-6 place-items-center rounded-sm border border-amber-200 bg-amber-50 text-amber-700"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      class="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 19a2 2 0 1 0 4 0a2 2 0 1 0-4 0"></path>
                      <path d="M15 19a2 2 0 1 0 4 0a2 2 0 1 0-4 0"></path>
                      <path d="M17 17H6V3H4"></path>
                      <path d="m6 5l14 1l-1 7H6"></path>
                    </svg>
                  </span>
                  <span>Purchase Summary</span>
                </h3>
                {#if optimizationResult.status === 'ready' && optimizationResult.barCount > 0}
                  <button
                    type="button"
                    class="waste-tooltip-trigger control-chip control-chip--amber ml-auto flex shrink-0 cursor-help appearance-none items-center gap-1.5 border-0 p-0 text-left font-['Roboto_Mono',monospace] text-[10px] text-zinc-700"
                    aria-describedby="purchase-summary-waste-tooltip"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      class="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 7h16"></path>
                      <path d="M10 11v6"></path>
                      <path d="M14 11v6"></path>
                      <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12"></path>
                      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"></path>
                    </svg>
                    <span>{optimizationResult.totalWasteMm} mm</span>
                    <span id="purchase-summary-waste-tooltip" class="waste-tooltip" role="tooltip">
                      <span>Blade kerf: {formatLengthMm(optimizationResult.totalKerfMm)}</span>
                      <span>Safety margin: {formatLengthMm(totalSafetyMarginWasteMm)}</span>
                    </span>
                  </button>
                {/if}
              </div>
            </div>

            {#if optimizationResult.status === 'missing-stock-options'}
              <div class="p-3 text-sm text-amber-700">
                Add stock lengths for {optimizationResult.missingProfiles.join(', ')} to run optimizer.
              </div>
            {:else if optimizationResult.status === 'infeasible'}
              <div class="p-3 text-sm text-red-700">
                No stock length can fit at least one adjusted cut for {optimizationResult.infeasibleProfiles.join(
                  ', '
                )}.
              </div>
            {:else if optimizationResult.barCount === 0}
              <div class="p-3 text-sm text-zinc-500">No purchasable bars needed yet.</div>
            {:else}
              <div>
                <table
                  class="min-w-full w-max table-auto border-collapse font-['Roboto_Mono',monospace] text-[12px] leading-tight text-zinc-900 whitespace-nowrap"
                >
                  <thead>
                    <tr class="border-b border-zinc-200 bg-white text-zinc-600">
                      <th class="px-2 py-1 text-left font-medium">Profile</th>
                      <th class="px-2 py-1 text-left font-medium">Stock</th>
                      <th class="px-2 py-1 text-center font-medium">Qty</th>
                      <th class="px-2 py-1 text-right font-medium">Mass</th>
                      <th class="px-2 py-1 text-right font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each purchaseSummaryRows as row (row.key)}
                      <tr class="border-b border-zinc-100 last:border-b-0">
                        <td class="px-2 py-1 font-medium text-zinc-800">{row.profileType}</td>
                        <td class="px-2 py-1 text-zinc-600">{formatStockLength(row.stockLengthMm)}</td>
                        <td class="px-2 py-1 text-center text-zinc-600">{row.quantity}</td>
                        <td class="px-2 py-1 text-right text-zinc-600">{formatWeight(row.totalMassKg)}</td>
                        <td class="px-2 py-1 text-right text-zinc-600">{formatMoney(row.totalCost)}</td>
                      </tr>
                    {/each}
                  </tbody>
                  <tfoot class="align-bottom">
                    <tr class="border-t-2 border-zinc-300 bg-zinc-50">
                      <td class="px-2 py-2 font-semibold uppercase tracking-wide text-zinc-700"> Total </td>
                      <td class="px-2 py-2 text-[10px] font-normal text-zinc-500">
                        {formatStockLength(optimizationResult.totalPurchasedLengthMm)}
                      </td>
                      <td class="px-2 py-2 text-center text-[10px] font-normal text-zinc-500">
                        {optimizationResult.barCount}
                      </td>
                      <td class="px-2 py-2 text-right font-semibold text-zinc-900">
                        <div>{formatWeight(optimizationResult.totalMassKg)}</div>
                      </td>
                      <td class="px-2 py-2 text-right font-semibold text-zinc-900">
                        <div class="mb-1 flex items-center justify-end gap-1 text-[10px] font-normal text-zinc-500">
                          <svg
                            viewBox="0 0 24 24"
                            class="h-3 w-3 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M3 17h2"></path>
                            <path d="M7 17h8"></path>
                            <path d="M17 17h2"></path>
                            <path d="M5 17V7h10v10"></path>
                            <path d="M15 10h3l3 3v4"></path>
                            <path d="M7 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0"></path>
                            <path d="M17 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0"></path>
                          </svg>
                          <span>{formatMoney(optimizationResult.shippingCost)}</span>
                        </div>
                        <div>{formatMoney(optimizationResult.totalCost)}</div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</section>

<style>
  .widget-card__header {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(248, 250, 252, 0.72));
  }

  .widget-card__title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .widget-card__icon {
    flex-shrink: 0;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.78),
      0 1px 2px rgba(15, 23, 42, 0.06);
  }

  .waste-tooltip-trigger {
    position: relative;
    outline: none;
  }

  .control-chip {
    min-height: 1.5rem;
    padding: 0 0.5rem;
    border-radius: 0.125rem;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.82),
      0 1px 2px rgba(15, 23, 42, 0.08);
  }

  .control-chip--amber {
    border: 1px solid rgba(217, 119, 6, 0.22);
    background: linear-gradient(180deg, rgba(255, 251, 235, 0.98), rgba(254, 243, 199, 0.92));
  }

  .control-chip--amber:hover {
    border-color: rgba(217, 119, 6, 0.34);
    background: linear-gradient(180deg, rgba(255, 247, 237, 1), rgba(253, 230, 138, 0.94));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.86),
      0 1px 2px rgba(120, 53, 15, 0.08);
  }

  .control-chip--amber:focus-visible {
    border-color: rgba(217, 119, 6, 0.45);
    box-shadow:
      0 0 0 3px rgba(251, 191, 36, 0.24),
      inset 0 1px 0 rgba(255, 255, 255, 0.86);
  }

  .control-chip--slate {
    border: 1px solid rgba(148, 163, 184, 0.28);
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(226, 232, 240, 0.92));
    color: rgb(51 65 85);
  }

  .control-chip--slate:hover {
    border-color: rgba(100, 116, 139, 0.38);
    background: linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(226, 232, 240, 0.98));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.86),
      0 1px 2px rgba(15, 23, 42, 0.08);
  }

  .control-chip--slate:focus-visible {
    border-color: rgba(100, 116, 139, 0.5);
    box-shadow:
      0 0 0 3px rgba(148, 163, 184, 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.86);
  }

  .export-menu {
    position: relative;
  }

  .export-menu summary::-webkit-details-marker {
    display: none;
  }

  .export-menu__panel {
    position: absolute;
    top: calc(100% + 0.55rem);
    right: 0;
    z-index: 30;
    display: grid;
    gap: 0.65rem;
    min-width: 16rem;
    padding: 0.85rem;
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 0.55rem;
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 18px 48px rgba(15, 23, 42, 0.16);
    backdrop-filter: blur(10px);
  }

  .export-menu__eyebrow {
    color: rgb(15 23 42);
    font-family: 'Roboto Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .export-menu__copy {
    color: rgb(71 85 105);
    font-size: 12px;
    line-height: 1.4;
  }

  .export-menu__option {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: rgb(30 41 59);
    font-size: 12px;
    line-height: 1.3;
  }

  .export-menu__option input {
    width: 0.9rem;
    height: 0.9rem;
    accent-color: rgb(71 85 105);
  }

  .export-menu__action {
    min-height: 2.1rem;
    border: 1px solid rgba(71, 85, 105, 0.22);
    border-radius: 0.35rem;
    background: linear-gradient(180deg, rgba(248, 250, 252, 1), rgba(226, 232, 240, 0.95));
    color: rgb(15 23 42);
    font-family: 'Roboto Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .export-menu__action:hover:not(:disabled) {
    border-color: rgba(71, 85, 105, 0.34);
    background: linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(226, 232, 240, 1));
  }

  .export-menu__action:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .export-menu__action:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.24);
  }

  .waste-tooltip {
    position: absolute;
    top: calc(100% + 0.45rem);
    right: 0;
    z-index: 20;
    display: grid;
    gap: 0.2rem;
    min-width: max-content;
    padding: 0.55rem 0.7rem;
    border: 1px solid rgba(148, 163, 184, 0.45);
    border-radius: 0.4rem;
    background: rgba(15, 23, 42, 0.96);
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.24);
    color: rgb(241 245 249);
    font-size: 11px;
    line-height: 1.3;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transform: translateY(-0.2rem);
    transition:
      opacity 140ms ease,
      transform 140ms ease;
  }

  .waste-tooltip::before {
    content: '';
    position: absolute;
    top: -0.35rem;
    right: 0.8rem;
    width: 0.7rem;
    height: 0.7rem;
    border-top: 1px solid rgba(148, 163, 184, 0.45);
    border-left: 1px solid rgba(148, 163, 184, 0.45);
    background: rgba(15, 23, 42, 0.96);
    transform: rotate(45deg);
  }

  .waste-tooltip-trigger:hover .waste-tooltip,
  .waste-tooltip-trigger:focus-visible .waste-tooltip,
  .waste-tooltip-trigger:focus-within .waste-tooltip {
    opacity: 1;
    transform: translateY(0);
  }

  .required-cuts-card {
    background:
      linear-gradient(180deg, rgba(250, 252, 255, 0.9), rgba(244, 247, 251, 0.88)),
      linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
      linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px);
    background-size:
      100% 100%,
      18px 18px,
      18px 18px;
  }

  .required-cuts-row--highlight {
    background: rgba(34, 197, 94, 0.32);
    box-shadow: inset 0 0 0 1px rgba(21, 128, 61, 0.35);
  }

  .profile-name {
    color: rgb(15 23 42);
    font-family: 'Roboto Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  .visual-layout-group {
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.96)),
      linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px),
      linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px);
    background-size:
      100% 100%,
      18px 18px,
      18px 18px;
  }

  .visual-layout-group__header {
    background: linear-gradient(90deg, rgba(226, 232, 240, 0.72), rgba(241, 245, 249, 0.3));
  }

  .bar-ruler {
    position: relative;
    height: 0.95rem;
    margin-bottom: 0.05rem;
    border-top: 1px solid rgb(191 219 254);
  }

  .bar-ruler__tick {
    position: absolute;
    top: -1px;
    width: 1px;
    height: 0.35rem;
    background: rgb(148 163 184);
    opacity: 0.6;
  }

  .bar-ruler__tick--major,
  .bar-ruler__tick--edge {
    height: 0.55rem;
  }

  .bar-ruler__tick--end {
    transform: translateX(-100%);
  }

  .bar-ruler__label {
    position: absolute;
    top: -0.1rem;
    left: 50%;
    transform: translate(-50%, -100%);
    color: rgb(71 85 105);
    font-family: 'Roboto Mono', monospace;
    font-size: 9px;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
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

  .bar-piece__highlight {
    position: absolute;
    inset: 0;
    background: rgba(34, 197, 94, 0.32);
    box-shadow: inset 0 0 0 1px rgba(21, 128, 61, 0.35);
    pointer-events: none;
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
    background: repeating-linear-gradient(
      135deg,
      rgba(250, 204, 21, 0.38) 0,
      rgba(250, 204, 21, 0.38) 8px,
      rgba(253, 224, 71, 0.18) 8px,
      rgba(253, 224, 71, 0.18) 16px
    );
  }

  .bar-waste__label {
    position: absolute;
    top: 50%;
    right: 0.25rem;
    padding: 0 0.2rem;
    color: rgb(113 63 18);
    font-family: 'Roboto Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    line-height: 1;
    transform: translateY(-50%);
    white-space: nowrap;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.28);
    pointer-events: none;
  }
</style>
