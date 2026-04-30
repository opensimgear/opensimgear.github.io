<script lang="ts">
  import { onMount } from 'svelte';
  import { productImages } from '~/data/3rdparty-product-images';

  type ProductKind = 'commercial' | 'opensource';
  type AvailabilityBucket = 'available' | 'active' | 'limited' | 'unknown';
  type LicenseBucket = 'known' | 'permissive' | 'copyleft' | 'noncommercial' | 'unknown';
  type FilterValue = string[];
  type LoadState = 'loading' | 'ready' | 'error';
  type SourceFilter = 'primary' | 'shop' | 'image';
  type FacetKey = 'kind' | 'category' | 'group' | 'maker' | 'availability' | 'license' | 'source';
  type SortKey =
    | 'name-asc'
    | 'name-desc'
    | 'category-asc'
    | 'kind-asc'
    | 'maker-asc'
    | 'price-asc'
    | 'price-desc';
  type ProductImage = {
    src: string;
    width?: number;
    height?: number;
    format?: string;
  };
  type Shop = {
    region: string | null;
    price: number;
    currency: string;
    url: string | null;
  };

  type Product = {
    id: string;
    kind: ProductKind;
    slug: string;
    product_name?: string;
    project_name?: string;
    description: string | null;
    manufacturer?: string | null;
    maker?: string | null;
    component_category: string;
    component_sub_category: string | null;
    product_url?: string | null;
    project_url?: string | null;
    picture_url: string | null;
    shops?: Shop[];
    license?: string | null;
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
    primary: 'Product or project URL',
    shop: 'Shop URL',
    image: 'Picture URL',
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
  let makerQuery = $state('');
  let showAllCategories = $state(false);
  let showAllGroups = $state(false);
  let showAllMakers = $state(false);
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
    buildOptions(filterProductsForOptions('group'), componentGroup, titleCaseSlug)
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
      .filter((product) => matchesFilter(groupFilter, componentGroup(product)))
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
        label: 'Subcategory',
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
  let visibleCategoryOptions = $derived(showAllCategories ? categoryOptions : categoryOptions.slice(0, 5));
  let visibleGroupOptions = $derived(showAllGroups ? groupOptions : groupOptions.slice(0, 4));
  let filteredMakerOptions = $derived.by(() => {
    const normalizedMakerQuery = normalizeText(makerQuery);

    if (!normalizedMakerQuery) return makerOptions;
    return makerOptions.filter((option) => normalizeText(option.label).includes(normalizedMakerQuery));
  });
  let visibleMakerOptions = $derived(showAllMakers ? filteredMakerOptions : filteredMakerOptions.slice(0, 5));

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
    return product.manufacturer ?? product.maker ?? '';
  }

  function displayName(product: Product): string {
    return product.product_name ?? product.project_name ?? '';
  }

  function componentGroup(product: Product): string | null {
    return product.component_sub_category;
  }

  function productHref(product: Product): string {
    return `/products/${product.kind}/${product.component_category}/${product.slug}/`;
  }

  function primaryUrl(product: Product): string | null | undefined {
    return product.kind === 'commercial' ? product.product_url : product.project_url;
  }

  function productImage(product: Product): ProductImage | null {
    return productImages[product.id] ?? (isHttpUrl(product.picture_url) ? { src: product.picture_url } : null);
  }

  function imageAlt(product: Product): string {
    return `${displayName(product)} product photo`;
  }

  function productSummary(product: Product): string {
    return product.description ?? product.license ?? '';
  }

  function normalizeText(value: string): string {
    return value.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function formatCount(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  function toggleFilterValue(filter: string[], value: string): void {
    if (filter.includes(value)) {
      filter.splice(filter.indexOf(value), 1);
    } else {
      filter.push(value);
    }

    currentPage = 1;
    syncUrlState();
  }

  function toggleSourceFilterValue(value: SourceFilter): void {
    if (sourceFilter.includes(value)) {
      sourceFilter = sourceFilter.filter((item) => item !== value);
    } else {
      sourceFilter = [...sourceFilter, value];
    }

    currentPage = 1;
    syncUrlState();
  }

  function optionCountText(count: number): string {
    return formatCount(count);
  }

  function productDateLabel(product: Product): string {
    return product.kind === 'opensource' ? 'Project' : 'Product';
  }

  function productMetaGroup(product: Product): string {
    return product.component_sub_category ?? titleCaseSlug(product.component_category);
  }

  function productTags(product: Product): string[] {
    return [
      titleCaseSlug(product.component_category),
      product.component_sub_category,
      product.kind === 'opensource' ? product.license : priceText(product),
    ].filter((value): value is string => Boolean(value)).slice(0, 3);
  }

  function searchableText(product: Product): string {
    const shopText = (product.shops ?? [])
      .map((shop) => [shop.region, shop.price, shop.currency, shop.url].filter(Boolean).join(' '))
      .join(' ');

    return normalizeText(
      [
        displayName(product),
        kindLabel(product.kind),
        product.component_category,
        product.component_sub_category,
        makerName(product),
        product.description,
        product.product_url,
        product.project_url,
        product.picture_url,
        product.license,
        shopText,
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
    return filter.some((value) => {
      if (value === 'primary') return isHttpUrl(primaryUrl(product));
      if (value === 'image') return isHttpUrl(product.picture_url);
      return (product.shops ?? []).some((shop) => isHttpUrl(shop.url));
    });
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
      .filter((product) => exclude === 'group' || matchesFilter(groupFilter, componentGroup(product)))
      .filter((product) => exclude === 'maker' || matchesFilter(makerFilter, makerName(product)))
      .filter((product) => exclude === 'availability' || matchesFilter(availabilityFilter, availabilityBucket(product)))
      .filter((product) => exclude === 'license' || matchesFilter(licenseFilter, licenseBucket(product)))
      .filter((product) => exclude === 'source' || matchesSourceFilter(product, sourceFilter));
  }

  function buildSourceOptions(sourceProducts: Product[]): Option[] {
    return (['primary', 'shop', 'image'] as const).map((value) => ({
      value,
      label: sourceLabels[value],
      count: sourceProducts.filter((product) => matchesSourceFilter(product, [value])).length,
    }));
  }

  function availabilityBucket(product: Product): AvailabilityBucket {
    const value = normalizeText(
      product.kind === 'commercial'
        ? (product.shops ?? []).map((shop) => [shop.region, shop.url].filter(Boolean).join(' ')).join(' ')
        : [product.project_url, product.description].filter(Boolean).join(' ')
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
    const value = normalizeText(product.license ?? '');

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

  function isHttpUrl(value: string | null | undefined): value is string {
    return typeof value === 'string' && /^https?:\/\//.test(value);
  }

  function primarySourceLinks(product: Product): { label: string; url: string }[] {
    return [
      { label: product.kind === 'commercial' ? 'Product' : 'Project', url: primaryUrl(product) },
      { label: 'Image', url: product.picture_url },
    ].filter((link): link is { label: string; url: string } => isHttpUrl(link.url));
  }

  function priceText(product: Product): string {
    const shop = product.shops?.[0];
    if (!shop) return '';

    return `${shop.currency} ${shop.price}`;
  }

  function priceValue(product: Product): number | null {
    const shop = product.shops?.[0];
    if (!shop) return null;

    const multipliers: Record<string, number> = {
      USD: 1,
      EUR: 1.08,
      GBP: 1.25,
      CAD: 0.73,
      AUD: 0.65,
      CHF: 1.1,
    };

    return shop.price * (multipliers[shop.currency] ?? 1);
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

  function compareProducts(a: Product, b: Product): number {
    switch (sortKey) {
      case 'name-desc':
        return compareText(displayName(b), displayName(a));
      case 'category-asc':
        return compareText(a.component_category, b.component_category) || compareText(displayName(a), displayName(b));
      case 'kind-asc':
        return (
          compareText(kindLabel(a.kind), kindLabel(b.kind)) ||
          compareText(a.component_category, b.component_category) ||
          compareText(displayName(a), displayName(b))
        );
      case 'maker-asc':
        return compareText(makerName(a), makerName(b)) || compareText(displayName(a), displayName(b));
      case 'price-asc':
        return compareNumber(priceValue(a), priceValue(b), 'asc') || compareText(displayName(a), displayName(b));
      case 'price-desc':
        return compareNumber(priceValue(a), priceValue(b), 'desc') || compareText(displayName(a), displayName(b));
      case 'name-asc':
      default:
        return compareText(displayName(a), displayName(b));
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
    return value === 'primary' || value === 'shop' || value === 'image';
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
      buildOptions(filterProductsForOptions('group'), componentGroup, titleCaseSlug)
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

<section class="not-content grid gap-4 text-sm" aria-label="Product database">
  <div
    class="grid auto-rows-fr gap-3 [grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))]"
    aria-label="Product totals"
  >
    <article class="rounded-[14px] border border-[var(--sl-color-gray-5)] bg-[rgba(13,19,30,0.55)] px-4 py-3">
      <div class="flex items-center gap-3">
        <span class="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--sl-color-gray-5)] text-[var(--sl-color-gray-2)]">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M12 3 4.5 7.2v9.6L12 21l7.5-4.2V7.2L12 3Z" />
            <path d="M12 12 4.5 7.2M12 12l7.5-4.8M12 12v9" />
          </svg>
        </span>
        <div>
          <p class="m-0 text-[0.75rem] font-[650] text-[var(--sl-color-gray-2)]">Products</p>
          <strong class="block text-[1.9rem] leading-none">{formatCount(totals.all)}</strong>
        </div>
      </div>
    </article>
    <article class="rounded-[14px] border border-[var(--sl-color-gray-5)] bg-[rgba(13,19,30,0.55)] px-4 py-3">
      <div class="flex items-center gap-3">
        <span class="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--sl-color-gray-5)] text-[var(--sl-color-gray-2)]">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M4 20h16M7 20V9m5 11V4m5 16v-7M5 9h4M10 4h4M15 13h4" />
          </svg>
        </span>
        <div>
          <p class="m-0 text-[0.75rem] font-[650] text-[var(--sl-color-gray-2)]">Commercial</p>
          <strong class="block text-[1.9rem] leading-none">{formatCount(totals.commercial)}</strong>
        </div>
      </div>
    </article>
    <article class="rounded-[14px] border border-[var(--sl-color-gray-5)] bg-[rgba(13,19,30,0.55)] px-4 py-3">
      <div class="flex items-center gap-3">
        <span class="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--sl-color-gray-5)] text-[var(--sl-color-gray-2)]">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M12 21a9 9 0 1 1 0-18" />
            <path d="M12 3a9 9 0 0 1 0 18" />
            <path d="M12 12v9" />
          </svg>
        </span>
        <div>
          <p class="m-0 text-[0.75rem] font-[650] text-[var(--sl-color-gray-2)]">Open Source</p>
          <strong class="block text-[1.9rem] leading-none">{formatCount(totals.opensource)}</strong>
        </div>
      </div>
    </article>
    <article class="rounded-[14px] border border-[var(--sl-color-gray-5)] bg-[rgba(13,19,30,0.55)] px-4 py-3">
      <div class="flex items-center gap-3">
        <span class="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--sl-color-gray-5)] text-[var(--sl-color-gray-2)]">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <rect x="4" y="4" width="6" height="6" rx="1.2" />
            <rect x="14" y="4" width="6" height="6" rx="1.2" />
            <rect x="4" y="14" width="6" height="6" rx="1.2" />
            <rect x="14" y="14" width="6" height="6" rx="1.2" />
          </svg>
        </span>
        <div>
          <p class="m-0 text-[0.75rem] font-[650] text-[var(--sl-color-gray-2)]">Categories</p>
          <strong class="block text-[1.9rem] leading-none">{formatCount(totals.categories)}</strong>
        </div>
      </div>
    </article>
    <article class="rounded-[14px] border border-[var(--sl-color-gray-5)] bg-[rgba(13,19,30,0.55)] px-4 py-3">
      <div class="flex items-center gap-3">
        <span class="grid h-9 w-9 place-items-center rounded-[10px] border border-[var(--sl-color-gray-5)] text-[var(--sl-color-gray-2)]">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
            <circle cx="9.5" cy="7" r="3.5" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a3.5 3.5 0 0 1 0 6.74" />
          </svg>
        </span>
        <div>
          <p class="m-0 text-[0.75rem] font-[650] text-[var(--sl-color-gray-2)]">Makers</p>
          <strong class="block text-[1.9rem] leading-none">{formatCount(totals.makers)}</strong>
        </div>
      </div>
    </article>
  </div>

  <div class="grid min-h-0 gap-4 [grid-template-columns:minmax(16.5rem,18rem)_minmax(0,1fr)] max-[72rem]:grid-cols-1">
    <aside
      class="grid min-w-0 content-start gap-5 self-start rounded-[16px] border border-[var(--sl-color-gray-5)] bg-[rgba(13,19,30,0.55)] p-4"
      aria-label="Product filters"
    >
      <section class="grid min-w-0 gap-3">
        <div class="flex items-center justify-between">
          <h2 class="m-0 text-[0.75rem] font-[700] uppercase tracking-[0] text-[var(--sl-color-gray-2)]">Search</h2>
          {#if activeFilterCount}
            <button
              class="rounded-[8px] border border-[var(--sl-color-gray-5)] px-2 py-1 text-[0.7rem] font-[650] text-[var(--sl-color-gray-2)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)]"
              type="button"
              onclick={resetFilters}
            >
              Reset
            </button>
          {/if}
        </div>
        <label class="relative block min-w-0">
          <input
            class="box-border w-full min-w-0 rounded-[10px] border border-[var(--sl-color-gray-5)] bg-[rgba(9,13,20,0.75)] py-2 pl-3 pr-10 text-[0.85rem] text-[var(--sl-color-text)] outline-none placeholder:text-[var(--sl-color-gray-3)] focus:border-[var(--sl-color-accent)]"
            bind:value={query}
            type="search"
            placeholder="Search name, maker, category..."
            oninput={resetPage}
          />
          <span class="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-[var(--sl-color-gray-3)]">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>
        </label>
      </section>

      <section class="grid min-w-0 gap-2">
        <h2 class="m-0 text-[0.75rem] font-[700] uppercase tracking-[0] text-[var(--sl-color-gray-2)]">Type</h2>
        {#each kindOptions as option (option.value)}
          <label class="flex items-center gap-2 text-[0.84rem] text-[var(--sl-color-text)]">
            <input
              class="h-4 w-4 rounded border-[var(--sl-color-gray-4)] bg-transparent text-[var(--sl-color-accent)] focus:ring-0"
              type="checkbox"
              checked={kindFilter.includes(option.value)}
              onchange={() => toggleFilterValue(kindFilter, option.value)}
            />
            <span class="min-w-0 flex-1 truncate">{option.label}</span>
            <span class="w-9 shrink-0 text-left text-[0.74rem] text-[var(--sl-color-gray-2)]">
              {optionCountText(option.count)}
            </span>
          </label>
        {/each}
      </section>

      <section class="grid min-w-0 gap-2">
        <h2 class="m-0 text-[0.75rem] font-[700] uppercase tracking-[0] text-[var(--sl-color-gray-2)]">Component</h2>
        {#each visibleCategoryOptions as option (option.value)}
          <label class="flex items-center gap-2 text-[0.84rem] text-[var(--sl-color-text)]">
            <input
              class="h-4 w-4 rounded border-[var(--sl-color-gray-4)] bg-transparent text-[var(--sl-color-accent)] focus:ring-0"
              type="checkbox"
              checked={categoryFilter.includes(option.value)}
              onchange={() => toggleFilterValue(categoryFilter, option.value)}
            />
            <span class="min-w-0 flex-1 truncate">{option.label}</span>
            <span class="w-9 shrink-0 text-left text-[0.74rem] text-[var(--sl-color-gray-2)]">{optionCountText(option.count)}</span>
          </label>
        {/each}
        {#if categoryOptions.length > 5}
          <button
            class="inline-flex items-center gap-1 justify-self-start text-[0.78rem] font-[650] text-[var(--sl-color-gray-2)] hover:text-[var(--sl-color-accent-high)]"
            type="button"
            onclick={() => (showAllCategories = !showAllCategories)}
            aria-label={showAllCategories ? 'Show fewer components' : 'Show more components'}
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              {#if showAllCategories}
                <path d="M5 12h14" />
              {:else}
                <path d="M12 5v14M5 12h14" />
              {/if}
            </svg>
            {showAllCategories ? 'Less' : 'More'}
          </button>
        {/if}
      </section>

      <section class="grid min-w-0 gap-2">
        <h2 class="m-0 text-[0.75rem] font-[700] uppercase tracking-[0] text-[var(--sl-color-gray-2)]">Subcategory</h2>
        {#each visibleGroupOptions as option (option.value)}
          <label class="flex items-center gap-2 text-[0.84rem] text-[var(--sl-color-text)]">
            <input
              class="h-4 w-4 rounded border-[var(--sl-color-gray-4)] bg-transparent text-[var(--sl-color-accent)] focus:ring-0"
              type="checkbox"
              checked={groupFilter.includes(option.value)}
              onchange={() => toggleFilterValue(groupFilter, option.value)}
            />
            <span class="min-w-0 flex-1 truncate">{option.label}</span>
            <span class="w-9 shrink-0 text-left text-[0.74rem] text-[var(--sl-color-gray-2)]">{optionCountText(option.count)}</span>
          </label>
        {/each}
        {#if groupOptions.length > 4}
          <button
            class="inline-flex items-center gap-1 justify-self-start text-[0.78rem] font-[650] text-[var(--sl-color-gray-2)] hover:text-[var(--sl-color-accent-high)]"
            type="button"
            onclick={() => (showAllGroups = !showAllGroups)}
            aria-label={showAllGroups ? 'Show fewer subcategories' : 'Show more subcategories'}
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              {#if showAllGroups}
                <path d="M5 12h14" />
              {:else}
                <path d="M12 5v14M5 12h14" />
              {/if}
            </svg>
            {showAllGroups ? 'Less' : 'More'}
          </button>
        {/if}
      </section>

      <section class="grid min-w-0 gap-2">
        <h2 class="m-0 text-[0.75rem] font-[700] uppercase tracking-[0] text-[var(--sl-color-gray-2)]">Maker</h2>
        <input
          class="box-border w-full min-w-0 rounded-[10px] border border-[var(--sl-color-gray-5)] bg-[rgba(9,13,20,0.75)] px-3 py-2 text-[0.82rem] text-[var(--sl-color-text)] outline-none placeholder:text-[var(--sl-color-gray-3)] focus:border-[var(--sl-color-accent)]"
          bind:value={makerQuery}
          type="search"
          placeholder="Search maker..."
        />
        {#each visibleMakerOptions as option (option.value)}
          <label class="flex items-center gap-2 text-[0.84rem] text-[var(--sl-color-text)]">
            <input
              class="h-4 w-4 rounded border-[var(--sl-color-gray-4)] bg-transparent text-[var(--sl-color-accent)] focus:ring-0"
              type="checkbox"
              checked={makerFilter.includes(option.value)}
              onchange={() => toggleFilterValue(makerFilter, option.value)}
            />
            <span class="min-w-0 flex-1 truncate">{option.label}</span>
            <span class="w-9 shrink-0 text-left text-[0.74rem] text-[var(--sl-color-gray-2)]">{optionCountText(option.count)}</span>
          </label>
        {/each}
        {#if filteredMakerOptions.length > 5}
          <button
            class="inline-flex items-center gap-1 justify-self-start text-[0.78rem] font-[650] text-[var(--sl-color-gray-2)] hover:text-[var(--sl-color-accent-high)]"
            type="button"
            onclick={() => (showAllMakers = !showAllMakers)}
            aria-label={showAllMakers ? 'Show fewer makers' : 'Show more makers'}
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              {#if showAllMakers}
                <path d="M5 12h14" />
              {:else}
                <path d="M12 5v14M5 12h14" />
              {/if}
            </svg>
            {showAllMakers ? 'Less' : 'More'}
          </button>
        {/if}
      </section>

      <section class="grid min-w-0 gap-2">
        <h2 class="m-0 text-[0.75rem] font-[700] uppercase tracking-[0] text-[var(--sl-color-gray-2)]">Availability</h2>
        {#each availabilityOptions as option (option.value)}
          <label class="flex items-center gap-2 text-[0.84rem] text-[var(--sl-color-text)]">
            <input
              class="h-4 w-4 rounded border-[var(--sl-color-gray-4)] bg-transparent text-[var(--sl-color-accent)] focus:ring-0"
              type="checkbox"
              checked={availabilityFilter.includes(option.value)}
              onchange={() => toggleFilterValue(availabilityFilter, option.value)}
            />
            <span class="min-w-0 flex-1 truncate">{option.label}</span>
            <span class="w-9 shrink-0 text-left text-[0.74rem] text-[var(--sl-color-gray-2)]">{optionCountText(option.count)}</span>
          </label>
        {/each}
      </section>

      <section class="grid min-w-0 gap-2">
        <h2 class="m-0 text-[0.75rem] font-[700] uppercase tracking-[0] text-[var(--sl-color-gray-2)]">License</h2>
        {#each licenseOptions as option (option.value)}
          <label class="flex items-center gap-2 text-[0.84rem] text-[var(--sl-color-text)]">
            <input
              class="h-4 w-4 rounded border-[var(--sl-color-gray-4)] bg-transparent text-[var(--sl-color-accent)] focus:ring-0"
              type="checkbox"
              checked={licenseFilter.includes(option.value)}
              onchange={() => toggleFilterValue(licenseFilter, option.value)}
            />
            <span class="min-w-0 flex-1 truncate">{option.label}</span>
            <span class="w-9 shrink-0 text-left text-[0.74rem] text-[var(--sl-color-gray-2)]">{optionCountText(option.count)}</span>
          </label>
        {/each}
      </section>

      <section class="grid min-w-0 gap-2">
        <h2 class="m-0 text-[0.75rem] font-[700] uppercase tracking-[0] text-[var(--sl-color-gray-2)]">Links</h2>
        {#each sourceOptions as option (option.value)}
          <label class="flex items-center gap-2 text-[0.84rem] text-[var(--sl-color-text)]">
            <input
              class="h-4 w-4 rounded border-[var(--sl-color-gray-4)] bg-transparent text-[var(--sl-color-accent)] focus:ring-0"
              type="checkbox"
              checked={sourceFilter.includes(option.value as SourceFilter)}
              onchange={() => toggleSourceFilterValue(option.value as SourceFilter)}
            />
            <span class="min-w-0 flex-1 truncate">{option.label}</span>
            <span class="w-9 shrink-0 text-left text-[0.74rem] text-[var(--sl-color-gray-2)]">{optionCountText(option.count)}</span>
          </label>
        {/each}
      </section>
    </aside>

    <section
      class="grid min-h-0 overflow-hidden rounded-[16px] border border-[var(--sl-color-gray-5)] bg-[rgba(13,19,30,0.55)] [grid-template-rows:auto_auto_minmax(0,1fr)_auto]"
      aria-label="Filtered products"
    >
      <div class="flex items-center justify-between gap-3 border-b border-[var(--sl-color-gray-5)] px-4 py-3 max-[56rem]:flex-col max-[56rem]:items-stretch">
        {#if loadState === 'loading'}
          <p class="m-0 text-[0.92rem] text-[var(--sl-color-gray-2)]" aria-live="polite">Loading products...</p>
        {:else if loadState === 'error'}
          <p class="m-0 text-[0.92rem] text-[var(--sl-color-gray-2)]" aria-live="polite">Load failed.</p>
        {:else}
          <p class="m-0 text-[0.92rem] text-[var(--sl-color-gray-2)]" aria-live="polite">
            {pageDisplayStart}-{pageEndIndex} of {formatCount(filteredProducts.length)} products
          </p>
        {/if}

        <div class="flex flex-wrap items-center gap-4 text-[0.84rem]">
          <label class="flex items-center gap-2">
            <span class="text-[var(--sl-color-gray-2)]">Sort by</span>
            <select
              class="min-w-[8.5rem] rounded-[10px] border border-[var(--sl-color-gray-5)] bg-[rgba(9,13,20,0.75)] px-3 py-2 text-[var(--sl-color-text)] outline-none focus:border-[var(--sl-color-accent)]"
              bind:value={sortKey}
              onchange={resetPage}
            >
              {#each sortOptions as option (option.value)}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </label>

          <label class="flex items-center gap-2">
            <span class="text-[var(--sl-color-gray-2)]">Per page</span>
            <select
              class="min-w-[4.5rem] rounded-[10px] border border-[var(--sl-color-gray-5)] bg-[rgba(9,13,20,0.75)] px-3 py-2 text-[var(--sl-color-text)] outline-none focus:border-[var(--sl-color-accent)]"
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
        <div class="flex flex-wrap gap-2 border-b border-[var(--sl-color-gray-5)] px-4 py-3" aria-label="Applied filters">
          {#each activeFilters as filter (filter.token)}
            <button
              class="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--sl-color-gray-5)] bg-[rgba(9,13,20,0.72)] px-3 py-1 text-[0.76rem] text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)]"
              type="button"
              onclick={() => clearFilter(filter.key, filter.rawValue)}
              aria-label={`Remove ${filter.label} filter ${filter.value}`}
            >
              <span class="text-[var(--sl-color-gray-2)]">{filter.label}</span>
              <strong class="max-w-[14rem] overflow-hidden text-ellipsis whitespace-nowrap font-[650]">{filter.value}</strong>
              <span aria-hidden="true">×</span>
            </button>
          {/each}
        </div>
      {/if}

      <div class="grid min-h-0 content-start gap-3 overflow-auto p-4 max-[72rem]:overflow-visible">
        {#if loadState === 'loading'}
          <p class="m-0 rounded-[14px] border border-[var(--sl-color-gray-5)] px-4 py-6 text-[var(--sl-color-gray-2)]">Loading products...</p>
        {:else if loadState === 'error'}
          <p class="m-0 rounded-[14px] border border-[var(--sl-color-gray-5)] px-4 py-6 text-[var(--sl-color-gray-2)]">{loadError}</p>
        {:else}
          {#each paginatedProducts as product (product.id)}
            {@const image = productImage(product)}
            <article class="grid min-h-[10.5rem] gap-4 rounded-[14px] border border-[var(--sl-color-gray-5)] bg-[rgba(12,18,28,0.72)] p-3 [grid-template-columns:10.5rem_minmax(0,1fr)_15rem] max-[80rem]:[grid-template-columns:9rem_minmax(0,1fr)] max-[56rem]:grid-cols-1">
              {#if image}
                <a
                  class="grid aspect-square w-full place-items-center overflow-hidden rounded-[10px] border border-[var(--sl-color-gray-5)] bg-white no-underline"
                  href={productHref(product)}
                  aria-label={`View ${displayName(product)}`}
                >
                  <img
                    class="block h-full w-full object-contain p-2"
                    src={image.src}
                    alt={imageAlt(product)}
                    width={image.width ?? undefined}
                    height={image.height ?? undefined}
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              {/if}

              <div class="grid min-w-0 content-start gap-3">
                <div class="grid gap-1">
                  <h2 class="m-0 line-clamp-2 text-[1.05rem] font-[700] leading-[1.2]">
                    <a class="text-[var(--sl-color-text)] no-underline hover:text-[var(--sl-color-accent-high)]" href={productHref(product)}>
                      {displayName(product)}
                    </a>
                  </h2>
                  <p class="m-0 text-[0.82rem] text-[var(--sl-color-gray-2)]">{makerName(product) || 'Unknown maker'}</p>
                </div>

                <div class="flex flex-wrap gap-2" aria-label="Product attributes">
                  {#each productTags(product) as tag (tag)}
                    <span class="rounded-full border border-[var(--sl-color-gray-5)] bg-[rgba(18,26,38,0.85)] px-2.5 py-1 text-[0.72rem] font-[650] leading-none text-[var(--sl-color-gray-2)]">
                      {tag}
                    </span>
                  {/each}
                </div>

                {#if productSummary(product)}
                  <p class="m-0 line-clamp-2 text-[0.88rem] leading-[1.5] text-[var(--sl-color-text)]">{productSummary(product)}</p>
                {/if}

                <div class="flex flex-wrap gap-2">
                  <a
                    class="inline-flex items-center gap-2 rounded-[10px] border border-[var(--sl-color-gray-5)] px-3 py-2 text-[0.82rem] font-[650] text-[var(--sl-color-text)] no-underline hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)]"
                    href={productHref(product)}
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                      <path d="M12 5H5v14h14v-7" />
                      <path d="M14 5h5v5" />
                      <path d="m10 14 9-9" />
                    </svg>
                    Details
                  </a>
                  {#each primarySourceLinks(product) as link (link.label)}
                    <a
                      class="inline-flex items-center gap-2 rounded-[10px] border border-[var(--sl-color-gray-5)] px-3 py-2 text-[0.82rem] font-[650] text-[var(--sl-color-text)] no-underline hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)]"
                      href={link.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                        <path d="M12 5H5v14h14v-7" />
                        <path d="M14 5h5v5" />
                        <path d="m10 14 9-9" />
                      </svg>
                      {link.label}
                    </a>
                  {/each}
                </div>
              </div>

              <div class="grid content-start gap-3 border-l border-[var(--sl-color-gray-5)] pl-4 max-[80rem]:col-span-2 max-[80rem]:grid-cols-[1fr_1fr_1fr] max-[80rem]:border-l-0 max-[80rem]:border-t max-[80rem]:pl-0 max-[80rem]:pt-3 max-[56rem]:grid-cols-1">
                <div class="flex justify-end max-[80rem]:justify-start">
                  <span
                    class={[
                      'inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[0.76rem] font-[700] leading-none',
                      product.kind === 'commercial'
                        ? 'bg-yellow-200 text-yellow-900'
                        : 'bg-emerald-200 text-emerald-900',
                    ]}
                  >
                    {kindLabel(product.kind)}
                  </span>
                </div>
                <div class="flex items-start gap-2 text-[0.82rem] text-[var(--sl-color-gray-2)]">
                  <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="10" cy="7" r="3" />
                  </svg>
                  <span class="min-w-0 break-words">{makerName(product) || 'Unknown maker'}</span>
                </div>
                <div class="flex items-start gap-2 text-[0.82rem] text-[var(--sl-color-gray-2)]">
                  <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path d="M4 7h16M4 12h16M4 17h10" />
                  </svg>
                  <span class="min-w-0 break-words">{productMetaGroup(product)}</span>
                </div>
                <div class="flex items-start gap-2 text-[0.82rem] text-[var(--sl-color-gray-2)]">
                  <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <rect x="3.5" y="5" width="17" height="15" rx="2" />
                    <path d="M8 3v4M16 3v4M3.5 10h17" />
                  </svg>
                  <span>{productDateLabel(product)} URL {primaryUrl(product) ? 'available' : 'unknown'}</span>
                </div>
              </div>
            </article>
          {:else}
            <p class="m-0 rounded-[14px] border border-[var(--sl-color-gray-5)] px-4 py-6 text-[var(--sl-color-gray-2)]">No products match current filters.</p>
          {/each}
        {/if}
      </div>

      <nav class="flex items-center justify-end gap-1 border-t border-[var(--sl-color-gray-5)] px-4 py-3 max-[56rem]:flex-wrap" aria-label="Product pages">
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--sl-color-gray-5)] text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)] disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onclick={() => goToPage(1)}
          disabled={activePage === 1}
          aria-label="First page"
          title="First page"
        >
          <svg class="block h-4 w-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 5v14M18 6l-6 6 6 6M12 6l-6 6 6 6" />
          </svg>
        </button>
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--sl-color-gray-5)] text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)] disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onclick={() => goToPage(activePage - 1)}
          disabled={activePage === 1}
          aria-label="Previous page"
          title="Previous page"
        >
          <svg class="block h-4 w-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <span class="px-3 text-[0.84rem] text-[var(--sl-color-gray-2)]" aria-live="polite">Page {activePage} / {totalPages}</span>
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--sl-color-gray-5)] text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)] disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onclick={() => goToPage(activePage + 1)}
          disabled={activePage === totalPages}
          aria-label="Next page"
          title="Next page"
        >
          <svg class="block h-4 w-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--sl-color-gray-5)] text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)] disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onclick={() => goToPage(totalPages)}
          disabled={activePage === totalPages}
          aria-label="Last page"
          title="Last page"
        >
          <svg class="block h-4 w-4 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 5v14M6 6l6 6-6 6M12 6l6 6-6 6" />
          </svg>
        </button>
      </nav>
    </section>
  </div>
</section>
