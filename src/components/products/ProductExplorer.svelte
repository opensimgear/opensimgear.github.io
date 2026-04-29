<script lang="ts">
  import { onMount } from 'svelte';

  type ProductKind = 'commercial' | 'opensource';
  type ProductValue = string | string[] | null;
  type AvailabilityBucket = 'available' | 'active' | 'limited' | 'unknown';
  type LicenseBucket = 'known' | 'permissive' | 'copyleft' | 'noncommercial' | 'unknown';
  type FilterValue = 'all' | string;
  type LoadState = 'loading' | 'ready' | 'error';
  type SourceFilter = 'all' | 'official' | 'repo' | 'docs';
  type SortKey =
    | 'name-asc'
    | 'name-desc'
    | 'category-asc'
    | 'kind-asc'
    | 'maker-asc'
    | 'price-asc'
    | 'price-desc'
    | 'sources-desc'
    | 'checked-desc';

  type Product = {
    id: string;
    kind: ProductKind;
    name: string;
    title: string;
    slug: string;
    component_category: string;
    component_categories: string[];
    category_group: string | null;
    subcategory: string | null;
    last_checked: string | null;
    urls: {
      official: string | null;
      repo: string | null;
      docs: string | null;
      sources: string[];
    };
    organization: {
      manufacturer: string | null;
      maintainer_or_org: string | null;
      display: string | null;
    };
    availability: {
      status: string | null;
      maturity_or_status: string | null;
      price_or_msrp: string | null;
      region_or_availability: string | null;
      license: string | null;
    };
    details: Record<string, ProductValue>;
    raw_fields: Record<string, ProductValue>;
  };

  type Option = {
    value: string;
    label: string;
    count: number;
  };

  type Props = {
    dataUrl: string;
  };

  const { dataUrl }: Props = $props();

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: 'name-asc', label: 'Name A-Z' },
    { value: 'name-desc', label: 'Name Z-A' },
    { value: 'category-asc', label: 'Category A-Z' },
    { value: 'kind-asc', label: 'Type, then category' },
    { value: 'maker-asc', label: 'Maker A-Z' },
    { value: 'price-asc', label: 'Price low-high' },
    { value: 'price-desc', label: 'Price high-low' },
    { value: 'sources-desc', label: 'Most sources' },
    { value: 'checked-desc', label: 'Newest check' },
  ];

  const availabilityLabels: Record<AvailabilityBucket, string> = {
    available: 'Available commercial',
    active: 'Active open project',
    limited: 'Limited or caution',
    unknown: 'Unknown',
  };

  const licenseLabels: Record<LicenseBucket, string> = {
    known: 'Known license',
    permissive: 'Permissive',
    copyleft: 'Copyleft/open hardware',
    noncommercial: 'Non-commercial/source-available',
    unknown: 'Unknown',
  };

  let products: Product[] = $state([]);
  let loadState: LoadState = $state('loading');
  let loadError = $state('');
  let query = $state('');
  let kindFilter: FilterValue = $state('all');
  let categoryFilter: FilterValue = $state('all');
  let groupFilter: FilterValue = $state('all');
  let makerFilter: FilterValue = $state('all');
  let availabilityFilter: FilterValue = $state('all');
  let licenseFilter: FilterValue = $state('all');
  let sourceFilter: SourceFilter = $state('all');
  let sortKey: SortKey = $state('name-asc');

  onMount(() => {
    let cancelled = false;

    async function loadProducts(): Promise<void> {
      loadState = 'loading';
      loadError = '';

      try {
        const response = await fetch(dataUrl);
        if (!response.ok) {
          throw new Error(`Product data request failed: ${response.status}`);
        }

        const payload = (await response.json()) as { products?: Product[] };
        if (!Array.isArray(payload.products)) {
          throw new Error('Product data response missing products array.');
        }

        if (!cancelled) {
          products = payload.products;
          loadState = 'ready';
        }
      } catch (error) {
        if (!cancelled) {
          loadState = 'error';
          loadError = error instanceof Error ? error.message : 'Product data failed to load.';
        }
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  });

  let totals = $derived.by(() => ({
    all: products.length,
    commercial: products.filter((product) => product.kind === 'commercial').length,
    opensource: products.filter((product) => product.kind === 'opensource').length,
    categories: new Set(products.map((product) => product.component_category)).size,
    makers: new Set(products.map((product) => makerName(product)).filter(Boolean)).size,
  }));

  let categoryOptions = $derived(buildOptions(products, (product) => product.component_category, titleCaseSlug));
  let groupOptions = $derived(buildOptions(products, (product) => product.category_group, titleCaseSlug));
  let makerOptions = $derived(buildOptions(products, makerName, (value) => value));
  let availabilityOptions = $derived(
    buildOptions(products, availabilityBucket, (value) => availabilityLabels[value as AvailabilityBucket] ?? value)
  );
  let licenseOptions = $derived(
    buildOptions(products, licenseBucket, (value) => licenseLabels[value as LicenseBucket] ?? value)
  );

  let filteredProducts = $derived.by(() => {
    const normalizedQuery = normalizeText(query);

    return products
      .filter((product) => matchesQuery(product, normalizedQuery))
      .filter((product) => matchesFilter(kindFilter, product.kind))
      .filter((product) => matchesFilter(categoryFilter, product.component_category))
      .filter((product) => matchesFilter(groupFilter, product.category_group))
      .filter((product) => matchesFilter(makerFilter, makerName(product)))
      .filter((product) => matchesFilter(availabilityFilter, availabilityBucket(product)))
      .filter((product) => matchesFilter(licenseFilter, licenseBucket(product)))
      .filter((product) => matchesSourceFilter(product, sourceFilter))
      .toSorted(compareProducts);
  });

  let activeFilterCount = $derived(
    [
      query.trim(),
      kindFilter !== 'all',
      categoryFilter !== 'all',
      groupFilter !== 'all',
      makerFilter !== 'all',
      availabilityFilter !== 'all',
      licenseFilter !== 'all',
      sourceFilter !== 'all',
    ].filter(Boolean).length
  );

  function titleCaseSlug(value: string): string {
    return value
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function kindLabel(kind: ProductKind): string {
    return kind === 'opensource' ? 'Open Source' : 'Commercial';
  }

  function makerName(product: Product): string {
    return product.organization.display ?? product.organization.manufacturer ?? product.organization.maintainer_or_org ?? '';
  }

  function productHref(product: Product): string {
    return `/products/${product.kind}/${product.component_category}/${product.slug}/`;
  }

  function asList(value: ProductValue | undefined): string[] {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
  }

  function firstText(value: ProductValue | undefined): string {
    return asList(value)[0] ?? '';
  }

  function productSummary(product: Product): string {
    return (
      product.availability.status ??
      product.availability.maturity_or_status ??
      product.availability.price_or_msrp ??
      product.availability.license ??
      firstText(product.details.fit_notes) ??
      ''
    );
  }

  function normalizeText(value: string): string {
    return value.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function searchableText(product: Product): string {
    const detailText = Object.values(product.details).flatMap(asList).join(' ');
    const rawText = Object.values(product.raw_fields).flatMap(asList).join(' ');

    return normalizeText(
      [
        product.title,
        product.name,
        kindLabel(product.kind),
        product.component_category,
        product.component_categories.join(' '),
        product.category_group,
        product.subcategory,
        makerName(product),
        product.availability.status,
        product.availability.maturity_or_status,
        product.availability.price_or_msrp,
        product.availability.region_or_availability,
        product.availability.license,
        detailText,
        rawText,
      ]
        .filter(Boolean)
        .join(' ')
    );
  }

  function matchesQuery(product: Product, normalizedQuery: string): boolean {
    if (!normalizedQuery) return true;
    return searchableText(product).includes(normalizedQuery);
  }

  function matchesFilter(filter: FilterValue, value: string | null): boolean {
    return filter === 'all' || value === filter;
  }

  function matchesSourceFilter(product: Product, filter: SourceFilter): boolean {
    if (filter === 'all') return true;
    return isHttpUrl(product.urls[filter]);
  }

  function buildOptions(
    sourceProducts: Product[],
    getValue: (product: Product) => string | null,
    getLabel: (value: string) => string
  ): Option[] {
    const options: Option[] = [];

    for (const product of sourceProducts) {
      const value = getValue(product);
      if (!value) continue;

      const option = options.find((candidate) => candidate.value === value);
      if (option) {
        option.count += 1;
      } else {
        options.push({ value, label: getLabel(value), count: 1 });
      }
    }

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }

  function availabilityBucket(product: Product): AvailabilityBucket {
    const value = normalizeText(
      [product.availability.status, product.availability.maturity_or_status, product.availability.region_or_availability]
        .filter(Boolean)
        .join(' ')
    );

    if (!value) return 'unknown';
    if (/not recommended|unavailable|discontinued|archived|retired|unclear|unknown|not found/.test(value)) {
      return 'limited';
    }
    if (product.kind === 'commercial' && /available|active|shop|store|direct|stock|listing|product/.test(value)) {
      return 'available';
    }
    if (/active|current|public|released|maintained|ongoing|updated|available/.test(value)) {
      return 'active';
    }

    return 'unknown';
  }

  function licenseBucket(product: Product): LicenseBucket {
    const value = normalizeText(product.availability.license ?? '');

    if (!value || /unknown|not found|unclear|not clearly|not verified|no explicit/.test(value)) {
      return 'unknown';
    }
    if (/non.?commercial|not osi|source-available|not-for-resale|personal home use|freeware/.test(value)) {
      return 'noncommercial';
    }
    if (/\bgpl|agpl|lgpl|eupl|cern-ohl|sharealike|sa-4|by-sa/.test(value)) {
      return 'copyleft';
    }
    if (/\bmit\b|\bbsd\b|apache|cc0|cc-by|boost|isc|zlib/.test(value)) {
      return 'permissive';
    }

    return 'known';
  }

  function sourceCount(product: Product): number {
    return new Set(sourceUrls(product)).size;
  }

  function isHttpUrl(value: string | null | undefined): value is string {
    return typeof value === 'string' && /^https?:\/\//.test(value);
  }

  function sourceUrls(product: Product): string[] {
    return [product.urls.official, product.urls.repo, product.urls.docs, ...product.urls.sources].filter(isHttpUrl);
  }

  function primarySourceLinks(product: Product): { label: string; url: string }[] {
    return [
      { label: 'Official', url: product.urls.official },
      { label: 'Repo', url: product.urls.repo },
      { label: 'Docs', url: product.urls.docs },
    ].filter((link): link is { label: string; url: string } => isHttpUrl(link.url));
  }

  function priceText(product: Product): string {
    return product.availability.price_or_msrp ?? firstText(product.raw_fields.price_or_msrp);
  }

  function priceValue(product: Product): number | null {
    const value = priceText(product);
    if (!value) return null;

    const currencyMatch = value.match(/\b(USD|EUR|GBP|CAD|AUD|CHF)\b|[$\u20ac\u00a3]/i);
    const amountMatch = value.match(/(?:USD|EUR|GBP|CAD|AUD|CHF|[$\u20ac\u00a3])\s*([0-9][0-9,]*(?:\.\d+)?)/i);
    const fallbackAmountMatch = value.match(/\b([0-9][0-9,]*(?:\.\d+)?)\b/);
    const rawAmount = amountMatch?.[1] ?? fallbackAmountMatch?.[1];
    if (!rawAmount) return null;

    const amount = Number.parseFloat(rawAmount.replaceAll(',', ''));
    if (!Number.isFinite(amount)) return null;

    const currency = currencyMatch?.[0].toUpperCase() ?? 'USD';
    const multipliers: Record<string, number> = {
      $: 1,
      USD: 1,
      '\u20ac': 1.08,
      EUR: 1.08,
      '\u00a3': 1.25,
      GBP: 1.25,
      CAD: 0.73,
      AUD: 0.65,
      CHF: 1.1,
    };

    return amount * (multipliers[currency] ?? 1);
  }

  function compareText(a: string, b: string): number {
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  }

  function compareNumber(a: number | null, b: number | null, direction: 'asc' | 'desc'): number {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return direction === 'asc' ? a - b : b - a;
  }

  function compareDate(a: string | null, b: string | null): number {
    return compareNumber(a ? Date.parse(a) : null, b ? Date.parse(b) : null, 'desc');
  }

  function compareProducts(a: Product, b: Product): number {
    switch (sortKey) {
      case 'name-desc':
        return compareText(b.title || b.name, a.title || a.name);
      case 'category-asc':
        return compareText(a.component_category, b.component_category) || compareText(a.title || a.name, b.title || b.name);
      case 'kind-asc':
        return (
          compareText(kindLabel(a.kind), kindLabel(b.kind)) ||
          compareText(a.component_category, b.component_category) ||
          compareText(a.title || a.name, b.title || b.name)
        );
      case 'maker-asc':
        return compareText(makerName(a), makerName(b)) || compareText(a.title || a.name, b.title || b.name);
      case 'price-asc':
        return compareNumber(priceValue(a), priceValue(b), 'asc') || compareText(a.title || a.name, b.title || b.name);
      case 'price-desc':
        return compareNumber(priceValue(a), priceValue(b), 'desc') || compareText(a.title || a.name, b.title || b.name);
      case 'sources-desc':
        return sourceCount(b) - sourceCount(a) || compareText(a.title || a.name, b.title || b.name);
      case 'checked-desc':
        return compareDate(a.last_checked, b.last_checked) || compareText(a.title || a.name, b.title || b.name);
      case 'name-asc':
      default:
        return compareText(a.title || a.name, b.title || b.name);
    }
  }

  function resetFilters(): void {
    query = '';
    kindFilter = 'all';
    categoryFilter = 'all';
    groupFilter = 'all';
    makerFilter = 'all';
    availabilityFilter = 'all';
    licenseFilter = 'all';
    sourceFilter = 'all';
    sortKey = 'name-asc';
  }
</script>

<section class="product-explorer" aria-label="Product database">
  <div class="summary-strip" aria-label="Product totals">
    <div>
      <span>Products</span>
      <strong>{totals.all}</strong>
    </div>
    <div>
      <span>Commercial</span>
      <strong>{totals.commercial}</strong>
    </div>
    <div>
      <span>Open Source</span>
      <strong>{totals.opensource}</strong>
    </div>
    <div>
      <span>Categories</span>
      <strong>{totals.categories}</strong>
    </div>
    <div>
      <span>Makers</span>
      <strong>{totals.makers}</strong>
    </div>
  </div>

  <div class="filter-panel">
    <label class="field field--wide">
      <span>Search</span>
      <input bind:value={query} type="search" placeholder="Name, maker, category, compatibility, notes" />
    </label>

    <label class="field">
      <span>Type</span>
      <select bind:value={kindFilter}>
        <option value="all">All types</option>
        <option value="commercial">Commercial</option>
        <option value="opensource">Open Source</option>
      </select>
    </label>

    <label class="field">
      <span>Component</span>
      <select bind:value={categoryFilter}>
        <option value="all">All components</option>
        {#each categoryOptions as option (option.value)}
          <option value={option.value}>{option.label} ({option.count})</option>
        {/each}
      </select>
    </label>

    <label class="field">
      <span>Group</span>
      <select bind:value={groupFilter}>
        <option value="all">All groups</option>
        {#each groupOptions as option (option.value)}
          <option value={option.value}>{option.label} ({option.count})</option>
        {/each}
      </select>
    </label>

    <label class="field">
      <span>Maker</span>
      <select bind:value={makerFilter}>
        <option value="all">All makers</option>
        {#each makerOptions as option (option.value)}
          <option value={option.value}>{option.label} ({option.count})</option>
        {/each}
      </select>
    </label>

    <label class="field">
      <span>Availability</span>
      <select bind:value={availabilityFilter}>
        <option value="all">All availability</option>
        {#each availabilityOptions as option (option.value)}
          <option value={option.value}>{option.label} ({option.count})</option>
        {/each}
      </select>
    </label>

    <label class="field">
      <span>License</span>
      <select bind:value={licenseFilter}>
        <option value="all">All licenses</option>
        {#each licenseOptions as option (option.value)}
          <option value={option.value}>{option.label} ({option.count})</option>
        {/each}
      </select>
    </label>

    <label class="field">
      <span>Source</span>
      <select bind:value={sourceFilter}>
        <option value="all">Any source</option>
        <option value="official">Official page</option>
        <option value="repo">Repository</option>
        <option value="docs">Docs page</option>
      </select>
    </label>
  </div>

  <div class="result-bar">
    {#if loadState === 'loading'}
      <p aria-live="polite">Loading products...</p>
    {:else if loadState === 'error'}
      <p aria-live="polite">Load failed.</p>
    {:else}
      <p aria-live="polite">
        <strong>{filteredProducts.length}</strong> of {products.length}
        {activeFilterCount ? ` / ${activeFilterCount} filters` : ''}
      </p>
    {/if}

    <div class="result-actions">
      <label class="field field--inline">
        <span>Sort</span>
        <select bind:value={sortKey}>
          {#each sortOptions as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>

      <button type="button" onclick={resetFilters} disabled={!activeFilterCount && sortKey === 'name-asc'}>
        Reset
      </button>
    </div>
  </div>

  <div class="product-grid">
    {#if loadState === 'loading'}
      <p class="empty-state">Loading products...</p>
    {:else if loadState === 'error'}
      <p class="empty-state">{loadError}</p>
    {:else}
      {#each filteredProducts as product (product.id)}
        <article class="product-card">
          <div class="product-card__header">
            <div>
              <h2>
                <a href={productHref(product)}>{product.title || product.name}</a>
              </h2>
              <p>{makerName(product) || 'Unknown maker'}</p>
            </div>
            <span class="kind-badge" data-kind={product.kind}>{kindLabel(product.kind)}</span>
          </div>

          <div class="tag-row" aria-label="Product attributes">
            <span>{titleCaseSlug(product.component_category)}</span>
            {#if product.category_group}
              <span>{titleCaseSlug(product.category_group)}</span>
            {/if}
            {#if product.subcategory}
              <span>{product.subcategory}</span>
            {/if}
          </div>

          {#if productSummary(product)}
            <p class="product-card__summary">{productSummary(product)}</p>
          {/if}

          <dl class="fact-grid">
            {#if priceText(product)}
              <div>
                <dt>Price</dt>
                <dd>{priceText(product)}</dd>
              </div>
            {/if}
            {#if product.availability.license}
              <div>
                <dt>License</dt>
                <dd>{product.availability.license}</dd>
              </div>
            {/if}
            <div>
              <dt>Sources</dt>
              <dd>{sourceCount(product)}</dd>
            </div>
            {#if product.last_checked}
              <div>
                <dt>Checked</dt>
                <dd>{product.last_checked}</dd>
              </div>
            {/if}
          </dl>

          <div class="link-row">
            <a href={productHref(product)}>Details</a>
            {#each primarySourceLinks(product) as link (link.label)}
              <a href={link.url} rel="noreferrer">{link.label}</a>
            {/each}
          </div>
        </article>
      {:else}
        <p class="empty-state">No products match current filters.</p>
      {/each}
    {/if}
  </div>
</section>

<style>
  .product-explorer {
    display: grid;
    gap: 1rem;
  }

  .summary-strip {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
    gap: 0.5rem;
  }

  .summary-strip > div {
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 8px;
    padding: 0.75rem;
  }

  .summary-strip span,
  .field span,
  .fact-grid dt {
    color: var(--sl-color-gray-3);
    display: block;
    font-size: 0.78rem;
    font-weight: 650;
    letter-spacing: 0;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .summary-strip strong {
    display: block;
    font-size: 1.45rem;
    line-height: 1.15;
    margin-top: 0.25rem;
  }

  .filter-panel {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    border-block: 1px solid var(--sl-color-gray-6);
    padding-block: 1rem;
  }

  .field {
    display: grid;
    gap: 0.35rem;
    min-width: 0;
  }

  .field--wide {
    grid-column: span 2;
  }

  .field--inline {
    align-items: center;
    grid-template-columns: auto minmax(11rem, 1fr);
  }

  input,
  select {
    min-width: 0;
    width: 100%;
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 6px;
    background: var(--sl-color-bg);
    color: var(--sl-color-text);
    font: inherit;
    line-height: 1.2;
    padding: 0.6rem 0.7rem;
  }

  input:focus,
  select:focus,
  button:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--sl-color-accent);
    outline-offset: 2px;
  }

  .result-bar {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    justify-content: space-between;
  }

  .result-bar p {
    margin: 0;
  }

  .result-actions {
    display: flex;
    gap: 0.5rem;
    align-items: end;
  }

  button {
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 6px;
    background: var(--sl-color-bg);
    color: var(--sl-color-text);
    cursor: pointer;
    font: inherit;
    line-height: 1.2;
    padding: 0.6rem 0.8rem;
  }

  button:hover:not(:disabled) {
    border-color: var(--sl-color-accent);
    color: var(--sl-color-accent-high);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .product-grid {
    display: grid;
    gap: 0.75rem;
  }

  .product-card {
    display: grid;
    gap: 0.85rem;
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 8px;
    padding: 1rem;
  }

  .product-card__header {
    display: flex;
    gap: 0.75rem;
    align-items: start;
    justify-content: space-between;
  }

  .product-card h2 {
    font-size: 1rem;
    line-height: 1.35;
    margin: 0;
  }

  .product-card h2 a {
    color: var(--sl-color-text);
    text-decoration-thickness: 1px;
    text-underline-offset: 0.18em;
  }

  .product-card__header p,
  .product-card__summary {
    color: var(--sl-color-gray-2);
    font-size: 0.92rem;
    line-height: 1.5;
    margin: 0.25rem 0 0;
  }

  .kind-badge,
  .tag-row span {
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 999px;
    color: var(--sl-color-gray-2);
    font-size: 0.78rem;
    line-height: 1.2;
    padding: 0.32rem 0.5rem;
  }

  .kind-badge {
    flex: 0 0 auto;
    white-space: nowrap;
  }

  .kind-badge[data-kind='commercial'] {
    border-color: var(--sl-color-accent-low);
    color: var(--sl-color-accent-high);
  }

  .tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .fact-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.7rem;
    margin: 0;
  }

  .fact-grid div {
    min-width: 0;
  }

  .fact-grid dd {
    color: var(--sl-color-text);
    font-size: 0.9rem;
    line-height: 1.45;
    margin: 0.2rem 0 0;
    overflow-wrap: anywhere;
  }

  .link-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .link-row a {
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 6px;
    color: var(--sl-color-text);
    font-size: 0.86rem;
    line-height: 1.2;
    padding: 0.42rem 0.58rem;
    text-decoration: none;
  }

  .link-row a:hover {
    border-color: var(--sl-color-accent);
    color: var(--sl-color-accent-high);
  }

  .empty-state {
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 8px;
    margin: 0;
    padding: 1rem;
  }

  @media (max-width: 64rem) {
    .filter-panel {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 42rem) {
    .filter-panel,
    .field--wide {
      grid-template-columns: 1fr;
    }

    .field--wide {
      grid-column: auto;
    }

    .result-bar,
    .result-actions,
    .product-card__header {
      align-items: stretch;
      flex-direction: column;
    }

    .field--inline {
      grid-template-columns: 1fr;
    }

    .kind-badge {
      align-self: start;
    }
  }
</style>
