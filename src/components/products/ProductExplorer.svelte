<script lang="ts">
  import { onMount } from 'svelte';
  import { productImages } from '~/data/3rdparty-product-images';

  type ProductKind = 'commercial' | 'opensource';
  type ProductValue = string | string[] | null;
  type AvailabilityBucket = 'available' | 'active' | 'limited' | 'unknown';
  type LicenseBucket = 'known' | 'permissive' | 'copyleft' | 'noncommercial' | 'unknown';
  type FilterValue = string[];
  type LoadState = 'loading' | 'ready' | 'error';
  type SourceFilter = 'official' | 'repo' | 'docs';
  type FacetKey = 'kind' | 'category' | 'group' | 'maker' | 'availability' | 'license' | 'source';
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
  type ProductImage = {
    src: string;
    width: number;
    height: number;
    format: string;
  };
  type ProductImageRecord = {
    url: string;
    asset: string;
    alt: string;
    source_url: string | null;
    source_type: string;
    width: number;
    height: number;
    format: string;
  };

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
    image: ProductImageRecord;
  };

  type Option = {
    value: string;
    label: string;
    count: number;
  };

  type ActiveFilter = {
    key: FacetKey | 'query';
    label: string;
    value: string;
    rawValue?: string;
    token: string;
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

  const sourceLabels: Record<SourceFilter, string> = {
    official: 'Official page',
    repo: 'Repository',
    docs: 'Docs page',
  };

  const pageSizeOptions = [12, 24, 48, 96];
  const defaultSortKey: SortKey = 'name-asc';
  const defaultPageSize = 24;

  const QUERY_PARAM_KEYS = {
    query: 'q',
    kind: 'kind',
    category: 'category',
    group: 'group',
    maker: 'maker',
    availability: 'availability',
    license: 'license',
    source: 'source',
    sort: 'sort',
    page: 'page',
    pageSize: 'pageSize',
  } as const;

  let products: Product[] = $state([]);
  let loadState: LoadState = $state('loading');
  let loadError = $state('');
  let query = $state('');
  let kindFilter: FilterValue = $state([]);
  let categoryFilter: FilterValue = $state([]);
  let groupFilter: FilterValue = $state([]);
  let makerFilter: FilterValue = $state([]);
  let availabilityFilter: FilterValue = $state([]);
  let licenseFilter: FilterValue = $state([]);
  let sourceFilter: SourceFilter[] = $state([]);
  let sortKey: SortKey = $state(defaultSortKey);
  let currentPage = $state(1);
  let pageSize = $state(defaultPageSize);
  let mounted = false;
  let suppressUrlSync = false;

  onMount(() => {
    let cancelled = false;
    applyUrlState(new URLSearchParams(window.location.search));

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
          normalizeCurrentState();
          loadState = 'ready';
          syncUrlState();
        }
      } catch (error) {
        if (!cancelled) {
          loadState = 'error';
          loadError = error instanceof Error ? error.message : 'Product data failed to load.';
        }
      }
    }

    void loadProducts();
    const handlePopState = () => {
      applyUrlState(new URLSearchParams(window.location.search));
      normalizeCurrentState();
    };
    window.addEventListener('popstate', handlePopState);
    mounted = true;

    return () => {
      cancelled = true;
      window.removeEventListener('popstate', handlePopState);
    };
  });

  let totals = $derived.by(() => ({
    all: products.length,
    commercial: products.filter((product) => product.kind === 'commercial').length,
    opensource: products.filter((product) => product.kind === 'opensource').length,
    categories: new Set(products.map((product) => product.component_category)).size,
    makers: new Set(products.map((product) => makerName(product)).filter(Boolean)).size,
  }));

  let kindOptions = $derived(buildOptions(filterProductsForOptions('kind'), (product) => product.kind, kindLabel));
  let categoryOptions = $derived(
    buildOptions(filterProductsForOptions('category'), (product) => product.component_category, titleCaseSlug)
  );
  let groupOptions = $derived(
    buildOptions(filterProductsForOptions('group'), (product) => product.category_group, titleCaseSlug)
  );
  let makerOptions = $derived(buildOptions(filterProductsForOptions('maker'), makerName, (value) => value));
  let availabilityOptions = $derived(
    buildOptions(
      filterProductsForOptions('availability'),
      availabilityBucket,
      (value) => availabilityLabels[value as AvailabilityBucket] ?? value
    )
  );
  let licenseOptions = $derived(
    buildOptions(
      filterProductsForOptions('license'),
      licenseBucket,
      (value) => licenseLabels[value as LicenseBucket] ?? value
    )
  );
  let sourceOptions = $derived(
    buildSourceOptions(filterProductsForOptions('source')).filter((option) => option.count > 0)
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
      kindFilter.length,
      categoryFilter.length,
      groupFilter.length,
      makerFilter.length,
      availabilityFilter.length,
      licenseFilter.length,
      sourceFilter.length,
    ].reduce((total, value) => total + (typeof value === 'number' ? value : value ? 1 : 0), 0)
  );

  let activeFilters = $derived.by(() => {
    const filters: ActiveFilter[] = [];
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      filters.push({ key: 'query', label: 'Search', value: trimmedQuery, token: `query:${trimmedQuery}` });
    }
    for (const value of kindFilter) {
      filters.push({
        key: 'kind',
        label: 'Type',
        value: kindLabel(value as ProductKind),
        rawValue: value,
        token: `kind:${value}`,
      });
    }
    for (const value of categoryFilter) {
      filters.push({
        key: 'category',
        label: 'Component',
        value: titleCaseSlug(value),
        rawValue: value,
        token: `category:${value}`,
      });
    }
    for (const value of groupFilter) {
      filters.push({
        key: 'group',
        label: 'Group',
        value: titleCaseSlug(value),
        rawValue: value,
        token: `group:${value}`,
      });
    }
    for (const value of makerFilter) {
      filters.push({ key: 'maker', label: 'Maker', value, rawValue: value, token: `maker:${value}` });
    }
    for (const value of availabilityFilter) {
      filters.push({
        key: 'availability',
        label: 'Availability',
        value: availabilityLabels[value as AvailabilityBucket] ?? value,
        rawValue: value,
        token: `availability:${value}`,
      });
    }
    for (const value of licenseFilter) {
      filters.push({
        key: 'license',
        label: 'License',
        value: licenseLabels[value as LicenseBucket] ?? value,
        rawValue: value,
        token: `license:${value}`,
      });
    }
    for (const value of sourceFilter) {
      filters.push({
        key: 'source',
        label: 'Source',
        value: sourceLabels[value],
        rawValue: value,
        token: `source:${value}`,
      });
    }

    return filters;
  });

  let totalPages = $derived(Math.max(1, Math.ceil(filteredProducts.length / pageSize)));
  let activePage = $derived(Math.min(currentPage, totalPages));
  let pageStartIndex = $derived(filteredProducts.length ? (activePage - 1) * pageSize : 0);
  let pageDisplayStart = $derived(filteredProducts.length ? pageStartIndex + 1 : 0);
  let pageEndIndex = $derived(Math.min(pageStartIndex + pageSize, filteredProducts.length));
  let paginatedProducts = $derived(filteredProducts.slice(pageStartIndex, pageEndIndex));

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
    return (
      product.organization.display ?? product.organization.manufacturer ?? product.organization.maintainer_or_org ?? ''
    );
  }

  function productHref(product: Product): string {
    return `/products/${product.kind}/${product.component_category}/${product.slug}/`;
  }

  function productImage(product: Product): ProductImage | null {
    return productImages[product.id] ?? null;
  }

  function imageAlt(product: Product): string {
    return product.image?.alt ?? `${product.title || product.name} product photo`;
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
    return filter.length === 0 || (value !== null && filter.includes(value));
  }

  function matchesSourceFilter(product: Product, filter: SourceFilter[]): boolean {
    if (filter.length === 0) return true;
    return filter.some((value) => isHttpUrl(product.urls[value]));
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

  function filterProductsForOptions(exclude: FacetKey): Product[] {
    const normalizedQuery = normalizeText(query);

    return products
      .filter((product) => matchesQuery(product, normalizedQuery))
      .filter((product) => exclude === 'kind' || matchesFilter(kindFilter, product.kind))
      .filter((product) => exclude === 'category' || matchesFilter(categoryFilter, product.component_category))
      .filter((product) => exclude === 'group' || matchesFilter(groupFilter, product.category_group))
      .filter((product) => exclude === 'maker' || matchesFilter(makerFilter, makerName(product)))
      .filter((product) => exclude === 'availability' || matchesFilter(availabilityFilter, availabilityBucket(product)))
      .filter((product) => exclude === 'license' || matchesFilter(licenseFilter, licenseBucket(product)))
      .filter((product) => exclude === 'source' || matchesSourceFilter(product, sourceFilter));
  }

  function buildSourceOptions(sourceProducts: Product[]): Option[] {
    return (['official', 'repo', 'docs'] as const).map((value) => ({
      value,
      label: sourceLabels[value],
      count: sourceProducts.filter((product) => isHttpUrl(product.urls[value])).length,
    }));
  }

  function availabilityBucket(product: Product): AvailabilityBucket {
    const value = normalizeText(
      [
        product.availability.status,
        product.availability.maturity_or_status,
        product.availability.region_or_availability,
      ]
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
        return (
          compareText(a.component_category, b.component_category) || compareText(a.title || a.name, b.title || b.name)
        );
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

  function parsePageValue(value: string | null): number {
    if (!value) return 1;

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }

  function isSortKey(value: string | null): value is SortKey {
    return sortOptions.some((option) => option.value === value);
  }

  function isSourceFilter(value: string | null): value is SourceFilter {
    return value === 'official' || value === 'repo' || value === 'docs';
  }

  function hasOptionValue(options: Option[], value: string): boolean {
    return options.some((option) => option.value === value);
  }

  function normalizeFilterValues(values: string[], options: Option[]): FilterValue {
    return [...new Set(values.filter((value) => hasOptionValue(options, value)))];
  }

  function parseFilterValues(params: URLSearchParams, key: string): string[] {
    return [
      ...new Set(
        params
          .getAll(key)
          .map((value) => value.trim())
          .filter(Boolean)
      ),
    ];
  }

  function replaceSearchParams(params: URLSearchParams, key: string, values: string[]): void {
    params.delete(key);
    for (const value of values) {
      params.append(key, value);
    }
  }

  function applyUrlState(params: URLSearchParams): void {
    suppressUrlSync = true;
    const sortParam = params.get(QUERY_PARAM_KEYS.sort);
    const pageSizeParam = parsePageValue(params.get(QUERY_PARAM_KEYS.pageSize));

    query = params.get(QUERY_PARAM_KEYS.query)?.trim() ?? '';
    kindFilter = parseFilterValues(params, QUERY_PARAM_KEYS.kind);
    categoryFilter = parseFilterValues(params, QUERY_PARAM_KEYS.category);
    groupFilter = parseFilterValues(params, QUERY_PARAM_KEYS.group);
    makerFilter = parseFilterValues(params, QUERY_PARAM_KEYS.maker);
    availabilityFilter = parseFilterValues(params, QUERY_PARAM_KEYS.availability);
    licenseFilter = parseFilterValues(params, QUERY_PARAM_KEYS.license);
    sourceFilter = parseFilterValues(params, QUERY_PARAM_KEYS.source).filter(isSourceFilter);
    sortKey = isSortKey(sortParam) ? sortParam : defaultSortKey;
    pageSize = pageSizeOptions.includes(pageSizeParam) ? pageSizeParam : defaultPageSize;
    currentPage = parsePageValue(params.get(QUERY_PARAM_KEYS.page));

    suppressUrlSync = false;
  }

  function syncUrlState(): void {
    if (!mounted || suppressUrlSync || typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    const nextQuery = query.trim();

    setOptionalSearchParam(url.searchParams, QUERY_PARAM_KEYS.query, nextQuery);
    replaceSearchParams(url.searchParams, QUERY_PARAM_KEYS.kind, kindFilter);
    replaceSearchParams(url.searchParams, QUERY_PARAM_KEYS.category, categoryFilter);
    replaceSearchParams(url.searchParams, QUERY_PARAM_KEYS.group, groupFilter);
    replaceSearchParams(url.searchParams, QUERY_PARAM_KEYS.maker, makerFilter);
    replaceSearchParams(url.searchParams, QUERY_PARAM_KEYS.availability, availabilityFilter);
    replaceSearchParams(url.searchParams, QUERY_PARAM_KEYS.license, licenseFilter);
    replaceSearchParams(url.searchParams, QUERY_PARAM_KEYS.source, sourceFilter);
    setOptionalSearchParam(url.searchParams, QUERY_PARAM_KEYS.sort, sortKey, defaultSortKey);
    setOptionalSearchParam(url.searchParams, QUERY_PARAM_KEYS.page, String(activePage), '1');
    setOptionalSearchParam(url.searchParams, QUERY_PARAM_KEYS.pageSize, String(pageSize), String(defaultPageSize));

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }

  function setOptionalSearchParam(params: URLSearchParams, key: string, value: string, defaultValue = ''): void {
    if (!value || value === defaultValue) {
      params.delete(key);
      return;
    }

    params.set(key, value);
  }

  function normalizeCurrentState(): void {
    kindFilter = normalizeFilterValues(
      kindFilter,
      buildOptions(filterProductsForOptions('kind'), (product) => product.kind, kindLabel)
    );
    categoryFilter = normalizeFilterValues(
      categoryFilter,
      buildOptions(filterProductsForOptions('category'), (product) => product.component_category, titleCaseSlug)
    );
    groupFilter = normalizeFilterValues(
      groupFilter,
      buildOptions(filterProductsForOptions('group'), (product) => product.category_group, titleCaseSlug)
    );
    makerFilter = normalizeFilterValues(
      makerFilter,
      buildOptions(filterProductsForOptions('maker'), makerName, (value) => value)
    );
    availabilityFilter = normalizeFilterValues(
      availabilityFilter,
      buildOptions(
        filterProductsForOptions('availability'),
        availabilityBucket,
        (value) => availabilityLabels[value as AvailabilityBucket] ?? value
      )
    );
    licenseFilter = normalizeFilterValues(
      licenseFilter,
      buildOptions(
        filterProductsForOptions('license'),
        licenseBucket,
        (value) => licenseLabels[value as LicenseBucket] ?? value
      )
    );
    sourceFilter = [...new Set(sourceFilter)].filter((value) =>
      buildSourceOptions(filterProductsForOptions('source')).some(
        (option) => option.value === value && option.count > 0
      )
    );
    if (!pageSizeOptions.includes(pageSize)) {
      pageSize = defaultPageSize;
    }
    if (!isSortKey(sortKey)) {
      sortKey = defaultSortKey;
    }
    if (currentPage < 1) {
      currentPage = 1;
    }
  }

  function resetFilters(): void {
    query = '';
    kindFilter = [];
    categoryFilter = [];
    groupFilter = [];
    makerFilter = [];
    availabilityFilter = [];
    licenseFilter = [];
    sourceFilter = [];
    sortKey = defaultSortKey;
    currentPage = 1;
    syncUrlState();
  }

  function removeFilterValue(values: string[], value: string | undefined): string[] {
    if (!value) return [];
    return values.filter((item) => item !== value);
  }

  function clearFilter(key: FacetKey | 'query', value?: string): void {
    switch (key) {
      case 'query':
        query = '';
        break;
      case 'kind':
        kindFilter = value ? removeFilterValue(kindFilter, value) : [];
        break;
      case 'category':
        categoryFilter = value ? removeFilterValue(categoryFilter, value) : [];
        break;
      case 'group':
        groupFilter = value ? removeFilterValue(groupFilter, value) : [];
        break;
      case 'maker':
        makerFilter = value ? removeFilterValue(makerFilter, value) : [];
        break;
      case 'availability':
        availabilityFilter = value ? removeFilterValue(availabilityFilter, value) : [];
        break;
      case 'license':
        licenseFilter = value ? removeFilterValue(licenseFilter, value) : [];
        break;
      case 'source':
        sourceFilter = value ? sourceFilter.filter((item) => item !== value) : [];
        break;
    }

    currentPage = 1;
    syncUrlState();
  }

  function resetPage(): void {
    currentPage = 1;
    syncUrlState();
  }

  function goToPage(page: number): void {
    currentPage = Math.max(1, Math.min(page, totalPages));
    syncUrlState();
  }
</script>

<section class="not-content grid gap-4" aria-label="Product database">
  <div
    class="grid auto-rows-fr gap-2 [grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr))]"
    aria-label="Product totals"
  >
    <div class="grid h-full content-between rounded-lg border border-[var(--sl-color-gray-5)] p-3">
      <span
        class="block whitespace-nowrap text-[0.78rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
        >Products</span
      >
      <strong class="mt-1 block text-[1.45rem] leading-[1.15]">{totals.all}</strong>
    </div>
    <div class="grid h-full content-between rounded-lg border border-[var(--sl-color-gray-5)] p-3">
      <span
        class="block whitespace-nowrap text-[0.78rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
        >Commercial</span
      >
      <strong class="mt-1 block text-[1.45rem] leading-[1.15]">{totals.commercial}</strong>
    </div>
    <div class="grid h-full content-between rounded-lg border border-[var(--sl-color-gray-5)] p-3">
      <span
        class="block whitespace-nowrap text-[0.78rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
        >Open Source</span
      >
      <strong class="mt-1 block text-[1.45rem] leading-[1.15]">{totals.opensource}</strong>
    </div>
    <div class="grid h-full content-between rounded-lg border border-[var(--sl-color-gray-5)] p-3">
      <span
        class="block whitespace-nowrap text-[0.78rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
        >Categories</span
      >
      <strong class="mt-1 block text-[1.45rem] leading-[1.15]">{totals.categories}</strong>
    </div>
    <div class="grid h-full content-between rounded-lg border border-[var(--sl-color-gray-5)] p-3">
      <span
        class="block whitespace-nowrap text-[0.78rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
        >Makers</span
      >
      <strong class="mt-1 block text-[1.45rem] leading-[1.15]">{totals.makers}</strong>
    </div>
  </div>

  <div
    class="grid text-xs h-[clamp(34rem,calc(100vh-13rem),56rem)] gap-4 min-h-0 max-[64rem]:h-auto [grid-template-columns:minmax(16rem,18rem)_minmax(0,1fr)] max-[64rem]:grid-cols-1"
  >
    <aside
      class="grid content-start gap-3 overflow-auto rounded-lg border border-[var(--sl-color-gray-5)] p-4 min-h-0 max-[64rem]:overflow-visible"
      aria-label="Product filters"
    >
      <label class="grid min-w-0 gap-[0.35rem]">
        <span class="block text-[0.78rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
          >Search</span
        >
        <input
          class="w-full min-w-0 rounded-[6px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] px-[0.7rem] py-[0.6rem] leading-[1.2] text-[var(--sl-color-text)] focus:outline-2 focus:outline-[var(--sl-color-accent)] focus:outline-offset-2"
          bind:value={query}
          type="search"
          placeholder="Name, maker, category, compatibility, notes"
          oninput={resetPage}
        />
      </label>

      <label class="grid min-w-0 gap-[0.35rem]">
        <span class="block text-[0.78rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
          >Type</span
        >
        <select
          class="min-h-28 w-full min-w-0 rounded-[6px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] px-[0.5rem] py-[0.45rem] leading-[1.2] text-[var(--sl-color-text)] focus:outline-2 focus:outline-[var(--sl-color-accent)] focus:outline-offset-2"
          multiple
          size="2"
          bind:value={kindFilter}
          onchange={resetPage}
        >
          {#each kindOptions as option (option.value)}
            <option value={option.value}>{option.label} ({option.count})</option>
          {/each}
        </select>
      </label>

      <label class="grid min-w-0 gap-[0.35rem]">
        <span class="block text-[0.78rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
          >Component</span
        >
        <select
          class="min-h-32 w-full min-w-0 rounded-[6px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] px-[0.5rem] py-[0.45rem] leading-[1.2] text-[var(--sl-color-text)] focus:outline-2 focus:outline-[var(--sl-color-accent)] focus:outline-offset-2"
          multiple
          size="6"
          bind:value={categoryFilter}
          onchange={resetPage}
        >
          {#each categoryOptions as option (option.value)}
            <option value={option.value}>{option.label} ({option.count})</option>
          {/each}
        </select>
      </label>

      <label class="grid min-w-0 gap-[0.35rem]">
        <span class="block text-[0.78rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
          >Group</span
        >
        <select
          class="min-h-28 w-full min-w-0 rounded-[6px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] px-[0.5rem] py-[0.45rem] leading-[1.2] text-[var(--sl-color-text)] focus:outline-2 focus:outline-[var(--sl-color-accent)] focus:outline-offset-2"
          multiple
          size="4"
          bind:value={groupFilter}
          onchange={resetPage}
        >
          {#each groupOptions as option (option.value)}
            <option value={option.value}>{option.label} ({option.count})</option>
          {/each}
        </select>
      </label>

      <label class="grid min-w-0 gap-[0.35rem]">
        <span class="block text-[0.78rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
          >Maker</span
        >
        <select
          class="min-h-32 w-full min-w-0 rounded-[6px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] px-[0.5rem] py-[0.45rem] leading-[1.2] text-[var(--sl-color-text)] focus:outline-2 focus:outline-[var(--sl-color-accent)] focus:outline-offset-2"
          multiple
          size="6"
          bind:value={makerFilter}
          onchange={resetPage}
        >
          {#each makerOptions as option (option.value)}
            <option value={option.value}>{option.label} ({option.count})</option>
          {/each}
        </select>
      </label>

      <label class="grid min-w-0 gap-[0.35rem]">
        <span class="block text-[0.78rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
          >Availability</span
        >
        <select
          class="min-h-28 w-full min-w-0 rounded-[6px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] px-[0.5rem] py-[0.45rem] leading-[1.2] text-[var(--sl-color-text)] focus:outline-2 focus:outline-[var(--sl-color-accent)] focus:outline-offset-2"
          multiple
          size="4"
          bind:value={availabilityFilter}
          onchange={resetPage}
        >
          {#each availabilityOptions as option (option.value)}
            <option value={option.value}>{option.label} ({option.count})</option>
          {/each}
        </select>
      </label>

      <label class="grid min-w-0 gap-[0.35rem]">
        <span class="block text-[0.78rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
          >License</span
        >
        <select
          class="min-h-28 w-full min-w-0 rounded-[6px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] px-[0.5rem] py-[0.45rem] leading-[1.2] text-[var(--sl-color-text)] focus:outline-2 focus:outline-[var(--sl-color-accent)] focus:outline-offset-2"
          multiple
          size="4"
          bind:value={licenseFilter}
          onchange={resetPage}
        >
          {#each licenseOptions as option (option.value)}
            <option value={option.value}>{option.label} ({option.count})</option>
          {/each}
        </select>
      </label>

      <label class="grid min-w-0 gap-[0.35rem]">
        <span class="block text-[0.78rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
          >Source</span
        >
        <select
          class="min-h-24 w-full min-w-0 rounded-[6px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] px-[0.5rem] py-[0.45rem] leading-[1.2] text-[var(--sl-color-text)] focus:outline-2 focus:outline-[var(--sl-color-accent)] focus:outline-offset-2"
          multiple
          size="3"
          bind:value={sourceFilter}
          onchange={resetPage}
        >
          {#each sourceOptions as option (option.value)}
            <option value={option.value}>{option.label} ({option.count})</option>
          {/each}
        </select>
      </label>

      <button
        class="w-full rounded-[6px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] px-[0.8rem] py-[0.6rem] leading-[1.2] text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-[var(--sl-color-accent)] focus-visible:outline-offset-2"
        type="button"
        onclick={resetFilters}
        disabled={!activeFilterCount && sortKey === 'name-asc'}
      >
        Reset filters
      </button>
    </aside>

    <section
      class="m-0 grid min-h-0 overflow-hidden rounded-lg border border-[var(--sl-color-gray-5)] [grid-template-rows:auto_auto_minmax(0,1fr)_auto]"
      aria-label="Filtered products"
    >
      <div
        class="flex items-center justify-between gap-[0.65rem] border-b border-[var(--sl-color-gray-6)] px-3 py-[0.65rem] max-[42rem]:flex-col max-[42rem]:items-stretch"
      >
        {#if loadState === 'loading'}
          <p class="m-0" aria-live="polite">Loading products...</p>
        {:else if loadState === 'error'}
          <p class="m-0" aria-live="polite">Load failed.</p>
        {:else}
          <p class="m-0" aria-live="polite">
            <strong>{pageDisplayStart}-{pageEndIndex}</strong> of {filteredProducts.length}
            {activeFilterCount ? ` / ${activeFilterCount} filters` : ''}
          </p>
        {/if}

        <div class="flex flex-wrap items-end gap-2 max-[42rem]:flex-col max-[42rem]:items-stretch">
          <label
            class="grid min-w-0 items-center gap-[0.35rem] [grid-template-columns:auto_minmax(8rem,1fr)] max-[42rem]:grid-cols-1"
          >
            <span
              class="block text-[0.78rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
              >Sort</span
            >
            <select
              class="w-full min-w-0 rounded-[6px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] px-[0.7rem] py-[0.6rem] leading-[1.2] text-[var(--sl-color-text)] focus:outline-2 focus:outline-[var(--sl-color-accent)] focus:outline-offset-2"
              bind:value={sortKey}
              onchange={resetPage}
            >
              {#each sortOptions as option (option.value)}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </label>

          <label
            class="grid min-w-0 items-center gap-[0.35rem] [grid-template-columns:auto_minmax(4.5rem,1fr)] max-[42rem]:grid-cols-1"
          >
            <span
              class="block text-[0.78rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
              >Per page</span
            >
            <select
              class="w-full min-w-0 rounded-[6px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] px-[0.7rem] py-[0.6rem] leading-[1.2] text-[var(--sl-color-text)] focus:outline-2 focus:outline-[var(--sl-color-accent)] focus:outline-offset-2"
              bind:value={pageSize}
              onchange={resetPage}
            >
              {#each pageSizeOptions as option (option)}
                <option value={option}>{option}</option>
              {/each}
            </select>
          </label>
        </div>
      </div>

      {#if activeFilters.length}
        <div
          class="grid gap-[0.35rem] border-b border-[var(--sl-color-gray-6)] px-3 py-[0.55rem]"
          aria-label="Applied filters"
        >
          <span class="text-[0.72rem] font-[650] uppercase leading-[1.2] tracking-[0] text-[var(--sl-color-gray-3)]"
            >Applied</span
          >
          <div class="flex flex-wrap gap-[0.35rem]">
            {#each activeFilters as filter (filter.token)}
              <button
                class="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] px-[0.45rem] py-[0.28rem] text-[0.76rem] leading-[1.2] text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)] focus-visible:outline-2 focus-visible:outline-[var(--sl-color-accent)] focus-visible:outline-offset-2"
                type="button"
                onclick={() => clearFilter(filter.key, filter.rawValue)}
                aria-label={`Remove ${filter.label} filter ${filter.value}`}
              >
                <span class="text-[var(--sl-color-gray-3)]">{filter.label}</span>
                <strong
                  class="max-w-[14rem] overflow-hidden text-ellipsis whitespace-nowrap font-[650] max-[42rem]:max-w-[10rem]"
                >
                  {filter.value}
                </strong>
                <span aria-hidden="true">x</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <div class="grid min-h-0 content-start gap-2 overflow-auto p-3 max-[64rem]:overflow-visible">
        {#if loadState === 'loading'}
          <p class="m-0 rounded-lg border border-[var(--sl-color-gray-5)] p-4">Loading products...</p>
        {:else if loadState === 'error'}
          <p class="m-0 rounded-lg border border-[var(--sl-color-gray-5)] p-4">{loadError}</p>
        {:else}
          {#each paginatedProducts as product (product.id)}
            {@const image = productImage(product)}
            <article
              class="grid h-[180px] grid-cols-[auto_minmax(0,1fr)] items-stretch gap-[0.55rem] rounded-[6px] border border-[var(--sl-color-gray-5)] p-2 max-[42rem]:h-auto max-[42rem]:grid-cols-1 max-[42rem]:items-start"
            >
              {#if image}
                <a
                  class="grid h-full min-w-[4.75rem] w-auto aspect-square place-items-center overflow-hidden rounded-[4px] border border-[var(--sl-color-gray-6)] bg-white no-underline max-[42rem]:h-auto max-[42rem]:max-w-48 max-[42rem]:w-full"
                  href={productHref(product)}
                  aria-label={`View ${product.name}`}
                >
                  <img
                    class="block h-full w-full object-contain p-1"
                    src={image.src}
                    alt={imageAlt(product)}
                    width={image.width}
                    height={image.height}
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              {/if}

              <div class="grid min-w-0 gap-[0.35rem]">
                <div class="flex items-start justify-between gap-2 max-[42rem]:flex-col max-[42rem]:items-stretch">
                  <div class="min-w-0">
                    <h2 class="line-clamp-2 overflow-hidden text-[0.9rem] leading-[1.2]">
                      <a
                        class="text-[var(--sl-color-text)] underline-offset-[0.18em] [text-decoration-thickness:1px]"
                        href={productHref(product)}
                      >
                        {product.title || product.name}
                      </a>
                    </h2>
                    <p
                      class="mt-[0.1rem] overflow-hidden text-ellipsis whitespace-nowrap text-[0.8rem] leading-[1.3] text-[var(--sl-color-gray-2)]"
                    >
                      {makerName(product) || 'Unknown maker'}
                    </p>
                  </div>
                  <span
                    class={[
                      'shrink-0 whitespace-nowrap rounded-full border px-[0.34rem] py-[0.18rem] text-[0.68rem] font-[650] leading-[1.2] text-[var(--sl-color-gray-2)] max-[42rem]:self-start',
                      product.kind === 'commercial'
                        ? 'border-yellow-300 bg-yellow-100 text-yellow-900'
                        : 'border-green-300 bg-green-100 text-green-900',
                    ]}
                  >
                    {kindLabel(product.kind)}
                  </span>
                </div>

                <div class="m-0 flex max-h-[1.45rem] flex-wrap gap-1 overflow-hidden" aria-label="Product attributes">
                  <span
                    class="rounded-full border border-[var(--sl-color-gray-5)] px-[0.34rem] py-[0.18rem] text-[0.68rem] font-[650] leading-[1.2] text-[var(--sl-color-gray-2)]"
                  >
                    {titleCaseSlug(product.component_category)}
                  </span>
                  {#if product.category_group}
                    <span
                      class="rounded-full border border-[var(--sl-color-gray-5)] px-[0.34rem] py-[0.18rem] text-[0.68rem] font-[650] leading-[1.2] text-[var(--sl-color-gray-2)]"
                    >
                      {titleCaseSlug(product.category_group)}
                    </span>
                  {/if}
                  {#if product.subcategory}
                    <span
                      class="rounded-full border border-[var(--sl-color-gray-5)] px-[0.34rem] py-[0.18rem] text-[0.68rem] font-[650] leading-[1.2] text-[var(--sl-color-gray-2)]"
                    >
                      {product.subcategory}
                    </span>
                  {/if}
                </div>

                {#if productSummary(product)}
                  <p class="line-clamp-1 overflow-hidden text-[0.8rem] leading-[1.3] text-[var(--sl-color-gray-2)]">
                    {productSummary(product)}
                  </p>
                {/if}

                <div class="m-0 flex flex-wrap gap-[0.3rem]">
                  <a
                    class="rounded-[5px] border border-[var(--sl-color-gray-5)] px-[0.38rem] py-[0.24rem] text-[0.74rem] leading-[1.2] text-[var(--sl-color-text)] no-underline hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)]"
                    href={productHref(product)}
                  >
                    Details
                  </a>
                  {#each primarySourceLinks(product) as link (link.label)}
                    <a
                      class="rounded-[5px] border border-[var(--sl-color-gray-5)] px-[0.38rem] py-[0.24rem] text-[0.74rem] leading-[1.2] text-[var(--sl-color-text)] no-underline hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)]"
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {link.label}
                    </a>
                  {/each}
                </div>
              </div>
            </article>
          {:else}
            <p class="m-0 rounded-lg border border-[var(--sl-color-gray-5)] p-4">No products match current filters.</p>
          {/each}
        {/if}
      </div>

      <nav
        class="flex items-center justify-end gap-1 border-t border-[var(--sl-color-gray-6)] px-[0.6rem] py-[0.45rem] max-[42rem]:flex-col max-[42rem]:items-stretch"
        aria-label="Product pages"
      >
        <button
          class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] p-0 align-middle leading-none text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-[var(--sl-color-accent)] focus-visible:outline-offset-2"
          type="button"
          onclick={() => goToPage(1)}
          disabled={activePage === 1}
          aria-label="First page"
          title="First page"
        >
          <svg
            class="block h-4 w-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M6 5v14M18 6l-6 6 6 6M12 6l-6 6 6 6" />
          </svg>
        </button>
        <button
          class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] p-0 align-middle leading-none text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-[var(--sl-color-accent)] focus-visible:outline-offset-2"
          type="button"
          onclick={() => goToPage(activePage - 1)}
          disabled={activePage === 1}
          aria-label="Previous page"
          title="Previous page"
        >
          <svg
            class="block h-4 w-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <span
          class="whitespace-nowrap px-[0.35rem] text-[0.78rem] leading-[1.2] text-[var(--sl-color-gray-2)]"
          aria-live="polite"
        >
          Page {activePage} / {totalPages}
        </span>
        <button
          class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] p-0 align-middle leading-none text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-[var(--sl-color-accent)] focus-visible:outline-offset-2"
          type="button"
          onclick={() => goToPage(activePage + 1)}
          disabled={activePage === totalPages}
          aria-label="Next page"
          title="Next page"
        >
          <svg
            class="block h-4 w-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
        <button
          class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] p-0 align-middle leading-none text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-[var(--sl-color-accent)] focus-visible:outline-offset-2"
          type="button"
          onclick={() => goToPage(totalPages)}
          disabled={activePage === totalPages}
          aria-label="Last page"
          title="Last page"
        >
          <svg
            class="block h-4 w-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M18 5v14M6 6l6 6-6 6M12 6l6 6-6 6" />
          </svg>
        </button>
      </nav>
    </section>
  </div>
</section>
