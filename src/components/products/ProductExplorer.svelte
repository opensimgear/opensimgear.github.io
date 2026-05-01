<script lang="ts">
  import { onMount } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { on } from 'svelte/events';
  import { productImages } from '~/data/3rdparty-product-images';

  type ProductKind = 'commercial' | 'opensource';
  type AvailabilityBucket = 'available' | 'active' | 'limited' | 'unknown';
  type LicenseBucket = 'commercial' | 'known' | 'permissive' | 'copyleft' | 'noncommercial' | 'unknown';
  type FilterValue = string[];
  type LoadState = 'loading' | 'ready' | 'error';
  type FacetKey = 'kind' | 'category' | 'group' | 'maker' | 'availability' | 'license';
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
    name: string | null;
    region: string;
    price: number | 'Unknown';
    currency: string;
    status: 'available' | 'eol' | 'out-of-stock';
    url: string | null;
  };
  type PriceSource = {
    price: number | 'Unknown';
    currency: string;
  };
  type NumericPriceSource = {
    price: number;
    currency: string;
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
    shops?: Shop[];
    estimated_price?: PriceSource;
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
  type ProductBreadcrumbItem = {
    label: string;
    value: string;
    filter: 'category' | 'group';
  };
  type ImageOverlay = {
    src: string;
    alt: string;
    originLeft: number;
    originTop: number;
    originWidth: number;
    originHeight: number;
    left: number;
    top: number;
    width: number;
    height: number;
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
    commercial: 'Commercial',
    known: 'Known license',
    permissive: 'Permissive',
    copyleft: 'Copyleft/open hardware',
    noncommercial: 'Non-commercial/source-available',
    unknown: 'Unknown',
  };

  const pageSizeOptions = [10, 24, 48, 96];
  const defaultSortKey: SortKey = 'name-asc';
  const defaultPageSize = 10;

  const QUERY_PARAM_KEYS = {
    query: 'q',
    kind: 'kind',
    category: 'category',
    group: 'group',
    maker: 'maker',
    availability: 'availability',
    license: 'license',
    sort: 'sort',
    page: 'page',
    pageSize: 'pageSize',
  } as const;
  const PRODUCT_QUERY_PARAM_KEY = 'product';

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
  let sortKey: SortKey = $state(defaultSortKey);
  let currentPage = $state(1);
  let pageSize = $state(defaultPageSize);
  let makerQuery = $state('');
  let showAllCategories = $state(false);
  let showAllGroups = $state(false);
  let showAllMakers = $state(false);
  let filterPanelOpen = $state(false);
  let priceLocale = $state('en-US');
  let priceCurrency = $state('USD');
  let imageOverlay: ImageOverlay | null = $state(null);
  let selectedProduct: Product | null = $state(null);
  let imageOverlayToken = 0;
  let mounted = false;
  let suppressUrlSync = false;

  const portal: Attachment<HTMLElement> = (node) => {
    if (typeof document === 'undefined' || !document.body) {
      return undefined;
    }

    const placeholder = document.createComment('product-detail-modal');
    const parent = node.parentNode;
    parent?.insertBefore(placeholder, node);
    document.body.appendChild(node);
    const removeClickListener = on(node, 'click', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (event.target === node || target?.closest('[data-product-detail-close]')) {
        closeProductDetail();
      }
    });

    return () => {
      removeClickListener();
      node.remove();
      placeholder.remove();
    };
  };

  onMount(() => {
    let cancelled = false;
    const locale = navigator.languages?.[0] ?? navigator.language ?? 'en-US';
    priceLocale = locale;
    priceCurrency = currencyForLocale(locale);
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
          applySelectedProductFromUrl();
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
      applySelectedProductFromUrl();
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
    buildOptions(filterProductsForOptions('group'), componentGroup, subCategoryLabel)
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
      .toSorted(compareProducts);
  });

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
        value: subCategoryLabel(value),
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

  function subCategoryLabel(value: string): string {
    const phraseLabels: Record<string, string> = {
      'g-seat': 'G-seat',
      'g-seat-controller': 'G-seat controller',
      'g-seat-cues': 'G-seat cues',
      'h-pattern-shifter': 'H-pattern shifter',
      'load-cell-pedals': 'Load-cell pedals',
      'toe-brake-pedals': 'Toe-brake pedals',
    };
    const acronyms: Record<string, string> = {
      ar: 'AR',
      ffb: 'FFB',
      gt: 'GT',
      hosas: 'HOSAS',
      hotas: 'HOTAS',
      mr: 'MR',
      vr: 'VR',
    };

    if (phraseLabels[value]) return phraseLabels[value];

    return value
      .split('-')
      .map((part, index) => {
        if (/^\d+dof$/.test(part)) return `${part.slice(0, -3)}DOF`;
        if (acronyms[part]) return acronyms[part];
        return index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part;
      })
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

  function productKey(product: Product): string {
    return product.id;
  }

  function primaryUrl(product: Product): string | null | undefined {
    return product.kind === 'commercial' ? product.product_url : product.project_url;
  }

  function githubOpenGraphImage(product: Product): string | null {
    if (product.kind !== 'opensource') return null;

    const projectUrl = product.project_url;
    if (!projectUrl) return null;

    try {
      const url = new URL(projectUrl);
      if (url.hostname !== 'github.com') return null;

      const [owner, repo] = url.pathname.split('/').filter(Boolean);
      if (!owner || !repo) return null;

      return `https://opengraph.githubassets.com/1/${owner}/${repo}`;
    } catch {
      return null;
    }
  }

  function productImage(product: Product): ProductImage | null {
    const fallback = githubOpenGraphImage(product);
    return productImages[product.id] ?? (fallback ? { src: fallback } : null);
  }

  function imageAlt(product: Product): string {
    return displayName(product);
  }

  function imageOverlayStyle(overlay: ImageOverlay): string {
    return `left: ${overlay.left}px; top: ${overlay.top}px; width: ${overlay.width}px; height: ${overlay.height}px;`;
  }

  function openImageOverlay(event: MouseEvent | FocusEvent, product: Product, image: ProductImage): void {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement) || typeof window === 'undefined') return;

    const rect = target.getBoundingClientRect();
    const gap = 8;
    const availableWidth = Math.max(gap, window.innerWidth - gap * 2);
    const availableHeight = Math.max(gap, window.innerHeight - gap * 2);

    const sourceWidth = image.width ?? rect.width * 2;
    const sourceHeight = image.height ?? rect.height * 2;
    const sourceRatio = sourceHeight > 0 ? sourceWidth / sourceHeight : 1;

    let width = rect.width * 2;
    let height = width / sourceRatio;

    if (height > availableHeight) {
      height = Math.min(availableHeight, rect.height * 2);
      width = height * sourceRatio;
    }
    if (width > availableWidth) {
      width = availableWidth;
      height = Math.min(availableHeight, width / sourceRatio);
    }

    width = Math.max(rect.width, Math.min(width, availableWidth));
    height = Math.max(rect.height, Math.min(height, availableHeight));

    const maxLeft = Math.max(gap, window.innerWidth - width - gap);
    const maxTop = Math.max(gap, window.innerHeight - height - gap);
    const token = ++imageOverlayToken;
    const nextOverlay = {
      src: image.src,
      alt: imageAlt(product),
      originLeft: rect.left,
      originTop: rect.top,
      originWidth: rect.width,
      originHeight: rect.height,
      left: Math.min(Math.max(rect.left + rect.width / 2 - width / 2, gap), maxLeft),
      top: Math.min(Math.max(rect.top + rect.height / 2 - height / 2, gap), maxTop),
      width,
      height,
    };

    imageOverlay = {
      ...nextOverlay,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };

    window.requestAnimationFrame(() => {
      if (imageOverlayToken === token) {
        imageOverlay = nextOverlay;
      }
    });
  }

  function closeImageOverlay(): void {
    if (!imageOverlay) return;

    const token = ++imageOverlayToken;
    const overlay = imageOverlay;
    imageOverlay = {
      ...overlay,
      left: overlay.originLeft,
      top: overlay.originTop,
      width: overlay.originWidth,
      height: overlay.originHeight,
    };

    window.setTimeout(() => {
      if (imageOverlayToken === token) {
        imageOverlay = null;
      }
    }, 150);
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

  function optionCountText(count: number): string {
    return formatCount(count);
  }

  function productMetaGroup(product: Product): string {
    return product.component_sub_category
      ? subCategoryLabel(product.component_sub_category)
      : titleCaseSlug(product.component_category);
  }

  function productBreadcrumb(product: Product): ProductBreadcrumbItem[] {
    const crumbs: ProductBreadcrumbItem[] = [
      {
        label: titleCaseSlug(product.component_category),
        value: product.component_category,
        filter: 'category',
      },
    ];

    if (product.component_sub_category) {
      crumbs.push({
        label: subCategoryLabel(product.component_sub_category),
        value: product.component_sub_category,
        filter: 'group',
      });
    }

    return crumbs;
  }

  function applyBreadcrumbFilter(crumb: ProductBreadcrumbItem): void {
    if (crumb.filter === 'category') {
      toggleFilterValue(categoryFilter, crumb.value);
    } else {
      toggleFilterValue(groupFilter, crumb.value);
    }
  }

  function applyMakerFilter(product: Product): void {
    const maker = makerName(product);
    if (maker) {
      toggleFilterValue(makerFilter, maker);
    }
  }

  function searchableText(product: Product): string {
    const shopText = (product.shops ?? [])
      .map((shop) =>
        [shop.name, shop.region, shop.status, shopStatusLabel(shop.status), shop.price, shop.currency, shop.url]
          .filter(Boolean)
          .join(' ')
      )
      .join(' ');
    const estimateText = product.estimated_price
      ? [product.estimated_price.price, product.estimated_price.currency].join(' ')
      : '';

    return normalizeText(
      [
        displayName(product),
        kindLabel(product.kind),
        product.component_category,
        product.component_sub_category,
        product.component_sub_category ? subCategoryLabel(product.component_sub_category) : null,
        makerName(product),
        product.description,
        product.product_url,
        product.project_url,
        product.license,
        shopText,
        estimateText,
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
      .filter((product) => exclude === 'license' || matchesFilter(licenseFilter, licenseBucket(product)));
  }

  function availabilityBucket(product: Product): AvailabilityBucket {
    const value = normalizeText(
      product.kind === 'commercial'
        ? (product.shops ?? [])
            .map((shop) => [shop.name, shop.region, shop.status, shop.url].filter(Boolean).join(' '))
            .join(' ')
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
    if (product.kind === 'commercial') return 'commercial';

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
      { label: product.kind === 'commercial' ? 'Product Page' : 'Project', url: primaryUrl(product) },
    ].filter((link): link is { label: string; url: string } => isHttpUrl(link.url));
  }

  function productShopLinks(product: Product): Shop[] {
    return (product.shops ?? []).filter((shop) => isHttpUrl(shop.url));
  }

  function regionFlag(region: string): string {
    const normalized = region.trim().toLowerCase();
    const flags: Record<string, string> = {
      eu: '🇪🇺',
      europe: '🇪🇺',
      us: '🇺🇸',
      usa: '🇺🇸',
      uk: '🇬🇧',
      gb: '🇬🇧',
      de: '🇩🇪',
      germany: '🇩🇪',
      au: '🇦🇺',
      australia: '🇦🇺',
      canada: '🇨🇦',
      ca: '🇨🇦',
      china: '🇨🇳',
      cn: '🇨🇳',
      japan: '🇯🇵',
      jp: '🇯🇵',
      global: '🌐',
    };

    return flags[normalized] ?? '';
  }

  function shopRegionLabel(shop: Shop): string {
    return shop.region || 'Unknown';
  }

  function shopStatusLabel(status: Shop['status'] | undefined): string {
    const labels: Record<Shop['status'], string> = {
      available: 'Available',
      eol: 'EOL',
      'out-of-stock': 'Out of stock',
    };
    return status ? labels[status] : 'Available';
  }

  function validPriceSource(source: PriceSource | null | undefined): NumericPriceSource | null {
    if (!source || !Number.isFinite(source.price) || !source.currency) return null;
    return source as NumericPriceSource;
  }

  function currencyForLocale(locale: string): string {
    const region = locale.split('-').at(-1)?.toUpperCase();
    const currenciesByRegion: Record<string, string> = {
      US: 'USD',
      CA: 'CAD',
      GB: 'GBP',
      IE: 'EUR',
      DE: 'EUR',
      FR: 'EUR',
      ES: 'EUR',
      IT: 'EUR',
      NL: 'EUR',
      BE: 'EUR',
      AT: 'EUR',
      PT: 'EUR',
      FI: 'EUR',
      GR: 'EUR',
      AU: 'AUD',
      NZ: 'NZD',
      CH: 'CHF',
      SE: 'SEK',
      NO: 'NOK',
      DK: 'DKK',
      JP: 'JPY',
      CN: 'CNY',
      IN: 'INR',
    };

    return (region && currenciesByRegion[region]) || 'USD';
  }

  function usdMultiplier(currency: string): number {
    const multipliers: Record<string, number> = {
      USD: 1,
      EUR: 1.08,
      GBP: 1.25,
      CAD: 0.73,
      AUD: 0.65,
      NZD: 0.6,
      CHF: 1.1,
      SEK: 0.095,
      NOK: 0.092,
      DKK: 0.145,
      JPY: 0.0064,
      CNY: 0.14,
      INR: 0.012,
    };

    return multipliers[currency] ?? 1;
  }

  function convertPrice(source: NumericPriceSource, currency: string): NumericPriceSource {
    return {
      price: (source.price * usdMultiplier(source.currency)) / usdMultiplier(currency),
      currency,
    };
  }

  function productPriceSource(product: Product): NumericPriceSource | null {
    if (product.kind === 'opensource') {
      const estimate = validPriceSource(product.estimated_price);
      return estimate ? convertPrice(estimate, priceCurrency) : null;
    }

    const prices = (product.shops ?? [])
      .map((shop) => validPriceSource(shop))
      .filter((source): source is NumericPriceSource => Boolean(source))
      .map((source) => convertPrice(source, priceCurrency));
    if (!prices.length) return null;

    return {
      price: prices.reduce((sum, source) => sum + source.price, 0) / prices.length,
      currency: priceCurrency,
    };
  }

  function formatPrice(source: NumericPriceSource): string {
    try {
      return new Intl.NumberFormat(priceLocale, {
        style: 'currency',
        currency: source.currency,
        maximumFractionDigits: Number.isInteger(source.price) ? 0 : 2,
      }).format(source.price);
    } catch {
      return `${source.currency} ${new Intl.NumberFormat(priceLocale).format(source.price)}`;
    }
  }

  function priceText(product: Product): string {
    const source = productPriceSource(product);
    if (!source) return '';

    return formatPrice(source);
  }

  function priceDisplayText(product: Product): string {
    const text = priceText(product);
    if (!text) return 'Price unknown';

    return product.kind === 'commercial' && (product.shops?.length ?? 0) > 1 ? `~${text}` : text;
  }

  function priceValue(product: Product): number | null {
    const source = productPriceSource(product);
    if (!source) return null;

    return source.price;
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
    url.searchParams.delete('source');
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
      buildOptions(filterProductsForOptions('group'), componentGroup, subCategoryLabel)
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

  function applySelectedProductFromUrl(): void {
    if (typeof window === 'undefined') return;

    const key = new URLSearchParams(window.location.search).get(PRODUCT_QUERY_PARAM_KEY);
    selectedProduct = key ? products.find((product) => productKey(product) === key) ?? null : null;
  }

  function openProductDetail(product: Product): void {
    if (typeof window === 'undefined') return;

    closeImageOverlay();
    selectedProduct = product;

    const url = new URL(window.location.href);
    url.searchParams.set(PRODUCT_QUERY_PARAM_KEY, productKey(product));
    window.history.pushState(
      { ...window.history.state, productModal: productKey(product) },
      '',
      `${url.pathname}${url.search}${url.hash}`
    );
  }

  function closeProductDetail(): void {
    if (typeof window === 'undefined') return;

    selectedProduct = null;
    const state = window.history.state as { productModal?: string } | null;
    if (state?.productModal) {
      window.history.back();
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete(PRODUCT_QUERY_PARAM_KEY);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function handleModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && selectedProduct) {
      closeProductDetail();
    }
  }
</script>

<svelte:window onkeydown={handleModalKeydown} />

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
      class="grid min-w-0 content-start gap-5 self-start rounded-[16px] border border-[var(--sl-color-gray-5)] bg-[rgba(13,19,30,0.55)] p-4 max-[72rem]:gap-3"
      aria-label="Product filters"
    >
      <button
        class="hidden w-full items-center justify-between gap-3 rounded-[12px] border border-[var(--sl-color-gray-5)] bg-[rgba(9,13,20,0.75)] px-3 py-2 text-left text-[0.9rem] font-[700] text-[var(--sl-color-text)] max-[72rem]:flex"
        type="button"
        aria-controls="product-filter-panel"
        aria-expanded={filterPanelOpen}
        onclick={() => (filterPanelOpen = !filterPanelOpen)}
      >
        <span class="inline-flex min-w-0 items-center gap-2">
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filters
          {#if activeFilters.length}
            <span class="rounded-full bg-[var(--sl-color-accent)] px-2 py-0.5 text-[0.72rem] font-[750] leading-none text-white">{activeFilters.length}</span>
          {/if}
        </span>
        <svg class={['h-4 w-4 shrink-0 transition-transform', filterPanelOpen && 'rotate-180']} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        id="product-filter-panel"
        class={[filterPanelOpen ? 'grid' : 'hidden', 'min-w-0 content-start gap-5 min-[72.01rem]:grid']}
      >
        <section class="grid min-w-0 gap-3">
          <div class="flex items-center justify-between">
            <h2 class="m-0 text-[0.75rem] font-[700] uppercase tracking-[0] text-[var(--sl-color-gray-2)]">Search</h2>
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
          <label class="flex min-w-0 items-center gap-2 text-[0.84rem] text-[var(--sl-color-text)]">
            <input
              class="h-4 w-4 rounded border-[var(--sl-color-gray-4)] bg-transparent text-[var(--sl-color-accent)] focus:ring-0"
              type="checkbox"
              checked={kindFilter.includes(option.value)}
              onchange={() => toggleFilterValue(kindFilter, option.value)}
            />
            <span class="min-w-0 flex-1 truncate" title={option.label}>{option.label}</span>
            <span class="w-10 shrink-0 text-right text-[0.74rem] tabular-nums text-[var(--sl-color-gray-2)]">
              {optionCountText(option.count)}
            </span>
          </label>
        {/each}
      </section>

      <section class="grid min-w-0 gap-2">
        <h2 class="m-0 text-[0.75rem] font-[700] uppercase tracking-[0] text-[var(--sl-color-gray-2)]">Component</h2>
        {#each visibleCategoryOptions as option (option.value)}
          <label class="flex min-w-0 items-center gap-2 text-[0.84rem] text-[var(--sl-color-text)]">
            <input
              class="h-4 w-4 rounded border-[var(--sl-color-gray-4)] bg-transparent text-[var(--sl-color-accent)] focus:ring-0"
              type="checkbox"
              checked={categoryFilter.includes(option.value)}
              onchange={() => toggleFilterValue(categoryFilter, option.value)}
            />
            <span class="min-w-0 flex-1 truncate" title={option.label}>{option.label}</span>
            <span class="w-10 shrink-0 text-right text-[0.74rem] tabular-nums text-[var(--sl-color-gray-2)]">{optionCountText(option.count)}</span>
          </label>
        {/each}
        {#if categoryOptions.length > 5}
          <button
            class="inline-flex items-center gap-1 justify-self-start border-0 bg-transparent p-0 text-[0.78rem] font-[650] text-[var(--sl-color-gray-2)] hover:text-[var(--sl-color-accent-high)]"
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
          <label class="flex min-w-0 items-center gap-2 text-[0.84rem] text-[var(--sl-color-text)]">
            <input
              class="h-4 w-4 rounded border-[var(--sl-color-gray-4)] bg-transparent text-[var(--sl-color-accent)] focus:ring-0"
              type="checkbox"
              checked={groupFilter.includes(option.value)}
              onchange={() => toggleFilterValue(groupFilter, option.value)}
            />
            <span class="min-w-0 flex-1 truncate" title={option.label}>{option.label}</span>
            <span class="w-10 shrink-0 text-right text-[0.74rem] tabular-nums text-[var(--sl-color-gray-2)]">{optionCountText(option.count)}</span>
          </label>
        {/each}
        {#if groupOptions.length > 4}
          <button
            class="inline-flex items-center gap-1 justify-self-start border-0 bg-transparent p-0 text-[0.78rem] font-[650] text-[var(--sl-color-gray-2)] hover:text-[var(--sl-color-accent-high)]"
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
          <label class="flex min-w-0 items-center gap-2 text-[0.84rem] text-[var(--sl-color-text)]">
            <input
              class="h-4 w-4 rounded border-[var(--sl-color-gray-4)] bg-transparent text-[var(--sl-color-accent)] focus:ring-0"
              type="checkbox"
              checked={makerFilter.includes(option.value)}
              onchange={() => toggleFilterValue(makerFilter, option.value)}
            />
            <span class="min-w-0 flex-1 truncate" title={option.label}>{option.label}</span>
            <span class="w-10 shrink-0 text-right text-[0.74rem] tabular-nums text-[var(--sl-color-gray-2)]">{optionCountText(option.count)}</span>
          </label>
        {/each}
        {#if filteredMakerOptions.length > 5}
          <button
            class="inline-flex items-center gap-1 justify-self-start border-0 bg-transparent p-0 text-[0.78rem] font-[650] text-[var(--sl-color-gray-2)] hover:text-[var(--sl-color-accent-high)]"
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
          <label class="flex min-w-0 items-center gap-2 text-[0.84rem] text-[var(--sl-color-text)]">
            <input
              class="h-4 w-4 rounded border-[var(--sl-color-gray-4)] bg-transparent text-[var(--sl-color-accent)] focus:ring-0"
              type="checkbox"
              checked={availabilityFilter.includes(option.value)}
              onchange={() => toggleFilterValue(availabilityFilter, option.value)}
            />
            <span class="min-w-0 flex-1 truncate" title={option.label}>{option.label}</span>
            <span class="w-10 shrink-0 text-right text-[0.74rem] tabular-nums text-[var(--sl-color-gray-2)]">{optionCountText(option.count)}</span>
          </label>
        {/each}
      </section>

      <section class="grid min-w-0 gap-2">
        <h2 class="m-0 text-[0.75rem] font-[700] uppercase tracking-[0] text-[var(--sl-color-gray-2)]">License</h2>
        {#each licenseOptions as option (option.value)}
          <label class="flex min-w-0 items-center gap-2 text-[0.84rem] text-[var(--sl-color-text)]">
            <input
              class="h-4 w-4 rounded border-[var(--sl-color-gray-4)] bg-transparent text-[var(--sl-color-accent)] focus:ring-0"
              type="checkbox"
              checked={licenseFilter.includes(option.value)}
              onchange={() => toggleFilterValue(licenseFilter, option.value)}
            />
            <span class="min-w-0 flex-1 truncate" title={option.label}>{option.label}</span>
            <span class="w-10 shrink-0 text-right text-[0.74rem] tabular-nums text-[var(--sl-color-gray-2)]">{optionCountText(option.count)}</span>
          </label>
        {/each}
      </section>

      </div>
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
        <div class="flex items-start justify-between gap-3 border-b border-[var(--sl-color-gray-5)] px-4 py-3" aria-label="Applied filters">
          <div class="flex min-w-0 flex-1 flex-wrap gap-2">
          {#each activeFilters as filter (filter.token)}
            <button
              class="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--sl-color-gray-5)] bg-[rgba(9,13,20,0.72)] px-3 py-1 text-[0.76rem] text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)]"
              type="button"
              onclick={() => clearFilter(filter.key, filter.rawValue)}
              aria-label={`Remove ${filter.label} filter ${filter.value}`}
            >
              <span class="text-[var(--sl-color-gray-2)]">{filter.label}</span>
              <strong class="max-w-[14rem] overflow-hidden text-ellipsis whitespace-nowrap font-[650]" title={filter.value}>{filter.value}</strong>
              <span aria-hidden="true">×</span>
            </button>
          {/each}
          </div>
          <button
            class="inline-flex shrink-0 items-center gap-2 rounded-[10px] border border-[var(--sl-color-gray-5)] bg-transparent px-3 py-1 text-[0.76rem] font-[650] text-[var(--sl-color-gray-2)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)]"
            type="button"
            onclick={resetFilters}
            aria-label="Reset filters"
          >
            Reset
          </button>
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
            {@const maker = makerName(product)}
            <article class="grid min-h-[10.5rem] gap-4 rounded-[14px] border border-[var(--sl-color-gray-5)] bg-[rgba(12,18,28,0.72)] p-3 [grid-template-columns:minmax(0,1fr)] min-[56.01rem]:[grid-template-columns:9rem_minmax(0,1fr)] min-[80.01rem]:[grid-template-columns:10.5rem_minmax(0,1fr)_11.5rem]">
              {#if image}
                <button
                  class="grid aspect-square w-full place-items-center overflow-hidden rounded-[10px] border border-[var(--sl-color-gray-5)] bg-white p-0 max-[56rem]:order-first"
                  type="button"
                  aria-label={`View ${displayName(product)}`}
                  onclick={() => openProductDetail(product)}
                  onmouseenter={(event) => openImageOverlay(event, product, image)}
                  onfocus={(event) => openImageOverlay(event, product, image)}
                  onmouseleave={closeImageOverlay}
                  onblur={closeImageOverlay}
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
                </button>
              {:else}
                <button
                  class="grid aspect-square w-full place-items-center rounded-[10px] border border-dashed border-[var(--sl-color-gray-5)] bg-[rgba(255,255,255,0.04)] text-[var(--sl-color-gray-3)] max-[56rem]:order-first"
                  type="button"
                  aria-label={`Open ${displayName(product)}`}
                  onclick={() => openProductDetail(product)}
                >
                  <svg class="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="9" cy="10" r="1.6" />
                    <path d="m21 15-4.5-4.5L9 18" />
                  </svg>
                </button>
              {/if}

              <div class="grid min-w-0 content-start gap-3">
                <div class="grid gap-1">
                  <h2 class="m-0 line-clamp-2 text-[1.05rem] font-[700] leading-[1.2]">
                    <button
                      class="rounded-none bg-transparent p-0 text-left text-[var(--sl-color-text)] hover:text-[var(--sl-color-accent-high)]"
                      type="button"
                      onclick={() => openProductDetail(product)}
                    >
                      {displayName(product)}
                    </button>
                  </h2>
                  {#if maker}
                    <button
                      class="justify-self-start rounded-none bg-transparent p-0 text-left text-[0.82rem] text-[var(--sl-color-gray-2)] underline-offset-4 hover:text-[var(--sl-color-accent-high)] hover:underline focus-visible:text-[var(--sl-color-accent-high)] focus-visible:underline"
                      type="button"
                      onclick={() => applyMakerFilter(product)}
                      aria-label={`Filter by maker ${maker}`}
                    >
                      {maker}
                    </button>
                  {:else}
                    <p class="m-0 text-[0.82rem] text-[var(--sl-color-gray-2)]">Unknown maker</p>
                  {/if}
                </div>

                <nav class="flex flex-wrap items-center gap-1 text-[0.76rem] font-[650] text-[var(--sl-color-gray-2)]" aria-label="Product category breadcrumb">
                  {#each productBreadcrumb(product) as crumb, index (index)}
                    {#if index > 0}
                      <span aria-hidden="true" class="text-[var(--sl-color-gray-3)]">&gt;</span>
                    {/if}
                    <button
                      class="rounded-none bg-transparent px-0 py-0 leading-none text-[var(--sl-color-gray-2)] underline-offset-4 hover:text-[var(--sl-color-accent-high)] hover:underline focus-visible:text-[var(--sl-color-accent-high)] focus-visible:underline"
                      type="button"
                      onclick={() => applyBreadcrumbFilter(crumb)}
                      aria-label={`Filter by ${crumb.label}`}
                    >
                      {crumb.label}
                    </button>
                  {/each}
                </nav>

                {#if productSummary(product)}
                  <p class="m-0 line-clamp-2 text-[0.88rem] leading-[1.5] text-[var(--sl-color-text)]">{productSummary(product)}</p>
                {/if}

                <div class="flex flex-wrap gap-2">
                  <button
                    class="inline-flex items-center gap-2 rounded-[10px] border border-[var(--sl-color-gray-5)] px-3 py-2 text-[0.82rem] font-[650] text-[var(--sl-color-text)] no-underline hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)]"
                    type="button"
                    onclick={() => openProductDetail(product)}
                  >
                    <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                      <path d="M12 5H5v14h14v-7" />
                      <path d="M14 5h5v5" />
                      <path d="m10 14 9-9" />
                    </svg>
                    Details
                  </button>
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

              <div class="grid content-start justify-items-start gap-3 border-t border-[var(--sl-color-gray-5)] pt-3 text-left min-[56.01rem]:col-span-2 min-[56.01rem]:grid-cols-[1fr_1fr] min-[80.01rem]:col-span-1 min-[80.01rem]:grid-cols-1 min-[80.01rem]:border-l min-[80.01rem]:border-t-0 min-[80.01rem]:pl-4 min-[80.01rem]:pt-0">
                <div class="flex min-w-0 justify-self-end">
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
                <div class="flex min-w-0 max-w-full items-start justify-start gap-2 text-[0.82rem] text-[var(--sl-color-gray-2)]">
                  <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <rect x="3" y="6" width="18" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2.25" />
                    <path d="M6 10v4M18 10v4" />
                  </svg>
                  <span class="min-w-0 truncate" title={priceDisplayText(product)}>{priceDisplayText(product)}</span>
                </div>
                {#if product.license}
                  <div class="flex min-w-0 max-w-full items-start justify-start gap-2 text-[0.82rem] text-[var(--sl-color-gray-2)]">
                    <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                      <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" />
                      <path d="m9 12 2 2 4-5" />
                    </svg>
                    <span class="min-w-0 truncate" title={product.license}>{product.license}</span>
                  </div>
                {/if}
              </div>
            </article>
          {:else}
            <p class="m-0 rounded-[14px] border border-[var(--sl-color-gray-5)] px-4 py-6 text-[var(--sl-color-gray-2)]">No products match current filters.</p>
          {/each}
        {/if}
      </div>

      <nav class="flex items-center justify-end gap-1 border-t border-[var(--sl-color-gray-5)] px-4 py-3 max-[56rem]:flex-wrap" aria-label="Product pages">
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--sl-color-gray-5)] bg-transparent text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)] disabled:cursor-not-allowed disabled:opacity-45"
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
          class="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--sl-color-gray-5)] bg-transparent text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)] disabled:cursor-not-allowed disabled:opacity-45"
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
          class="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--sl-color-gray-5)] bg-transparent text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)] disabled:cursor-not-allowed disabled:opacity-45"
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
          class="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--sl-color-gray-5)] bg-transparent text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)] disabled:cursor-not-allowed disabled:opacity-45"
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

  {#if selectedProduct}
    {@const modalImage = productImage(selectedProduct)}
    {@const modalMaker = makerName(selectedProduct)}
    {@const modalShops = productShopLinks(selectedProduct)}
    <div
      {@attach portal}
      class="fixed inset-0 z-[2147483646] grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm max-[52rem]:p-2"
      role="presentation"
    >
      <div
        class="grid max-h-[calc(100dvh-2rem)] min-h-0 w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[16px] border border-[var(--sl-color-gray-5)] bg-[var(--sl-color-bg)] shadow-[0_22px_70px_rgba(0,0,0,0.45)] max-[52rem]:max-h-[calc(100dvh-1rem)] max-[52rem]:rounded-[12px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
      >
        <header class="flex items-start justify-between gap-4 border-b border-[var(--sl-color-gray-5)] px-5 py-4 max-[52rem]:px-3 max-[52rem]:py-3">
          <div class="grid min-w-0 gap-1">
            {#if modalMaker}
              <p class="m-0 text-[0.8rem] font-[650] text-[var(--sl-color-gray-2)]">{modalMaker}</p>
            {/if}
            <h2 id="product-detail-title" class="m-0 text-[1.25rem] font-[750] leading-tight text-[var(--sl-color-text)]">
              {displayName(selectedProduct)}
            </h2>
          </div>
          <button
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[var(--sl-color-gray-5)] bg-transparent text-[var(--sl-color-text)] hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)]"
            type="button"
            data-product-detail-close
            aria-label="Close product detail"
            title="Close"
          >
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="grid min-h-0 gap-5 overflow-y-auto p-5 max-[52rem]:gap-4 max-[52rem]:p-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <nav class="flex flex-wrap items-center gap-1 text-[0.76rem] font-[650] text-[var(--sl-color-gray-2)]" aria-label="Product category breadcrumb">
              {#each productBreadcrumb(selectedProduct) as crumb, index (index)}
                {#if index > 0}
                  <span aria-hidden="true" class="text-[var(--sl-color-gray-3)]">&gt;</span>
                {/if}
                <button
                  class="rounded-none bg-transparent px-0 py-0 leading-none text-[var(--sl-color-gray-2)] underline-offset-4 hover:text-[var(--sl-color-accent-high)] hover:underline focus-visible:text-[var(--sl-color-accent-high)] focus-visible:underline"
                  type="button"
                  onclick={() => {
                    applyBreadcrumbFilter(crumb);
                    closeProductDetail();
                  }}
                  aria-label={`Filter by ${crumb.label}`}
                >
                  {crumb.label}
                </button>
              {/each}
            </nav>
            <span
              class={[
                'inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[0.76rem] font-[700] leading-none',
                selectedProduct.kind === 'commercial'
                  ? 'bg-yellow-200 text-yellow-900'
                  : 'bg-emerald-200 text-emerald-900',
              ]}
            >
              {kindLabel(selectedProduct.kind)}
            </span>
          </div>

          <div class="grid gap-5 [grid-template-columns:minmax(0,22rem)_minmax(0,1fr)] max-[52rem]:grid-cols-1">
            {#if modalImage}
              <figure class="m-0 grid content-start gap-2">
                <img
                  class="block max-h-[24rem] w-full rounded-[12px] border border-[var(--sl-color-gray-5)] bg-white p-3 object-contain"
                  src={modalImage.src}
                  alt={imageAlt(selectedProduct)}
                  width={modalImage.width ?? undefined}
                  height={modalImage.height ?? undefined}
                  loading="eager"
                  decoding="async"
                />
              </figure>
            {:else}
              <figure class="m-0 grid content-start gap-2">
                <div class="grid aspect-[4/3] w-full place-items-center rounded-[12px] border border-dashed border-[var(--sl-color-gray-5)] bg-[rgba(255,255,255,0.04)] text-[var(--sl-color-gray-3)]">
                  <svg class="h-16 w-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="9" cy="10" r="1.6" />
                    <path d="m21 15-4.5-4.5L9 18" />
                  </svg>
                </div>
              </figure>
            {/if}

            <div class="grid content-start gap-4">
              {#if selectedProduct.description}
                <p class="m-0 text-[0.95rem] leading-[1.65] text-[var(--sl-color-gray-2)]">{selectedProduct.description}</p>
              {/if}

              <div class="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))]">
                <div class="rounded-[12px] border border-[var(--sl-color-gray-5)] p-3">
                  <dt class="m-0 text-[0.75rem] font-[700] uppercase tracking-[0] text-[var(--sl-color-gray-3)]">Price</dt>
                  <dd class="m-0 mt-1 text-[var(--sl-color-text)]">{priceDisplayText(selectedProduct)}</dd>
                </div>
                {#if selectedProduct.license}
                  <div class="rounded-[12px] border border-[var(--sl-color-gray-5)] p-3">
                    <dt class="m-0 text-[0.75rem] font-[700] uppercase tracking-[0] text-[var(--sl-color-gray-3)]">License</dt>
                    <dd class="m-0 mt-1 text-[var(--sl-color-text)]">{selectedProduct.license}</dd>
                  </div>
                {/if}
                <div class="rounded-[12px] border border-[var(--sl-color-gray-5)] p-3">
                  <dt class="m-0 text-[0.75rem] font-[700] uppercase tracking-[0] text-[var(--sl-color-gray-3)]">Component</dt>
                  <dd class="m-0 mt-1 text-[var(--sl-color-text)]">{titleCaseSlug(selectedProduct.component_category)}</dd>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                {#each primarySourceLinks(selectedProduct) as link (link.url)}
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
          </div>

          {#if selectedProduct.kind === 'commercial'}
            <section class="grid gap-3" aria-labelledby="product-shops-title">
              <h3 id="product-shops-title" class="m-0 text-[1rem] font-[700]">Available at</h3>
              {#if modalShops.length}
                <div class="overflow-x-auto rounded-[12px] border border-[var(--sl-color-gray-5)]">
                  <table class="m-0 w-full min-w-[28rem] border-collapse text-left text-[0.9rem]">
                    <thead class="border-b border-[var(--sl-color-gray-5)] text-[0.76rem] uppercase tracking-[0] text-[var(--sl-color-gray-3)]">
                      <tr>
                        <th class="px-4 py-3 font-[700]">Name</th>
                        <th class="px-4 py-3 font-[700]">Region</th>
                        <th class="px-4 py-3 font-[700]">Status</th>
                        <th class="px-4 py-3 text-right font-[700]">Price</th>
                        <th class="px-4 py-3 text-right font-[700]">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each modalShops as shop (shop.url)}
                        <tr class="border-b border-[var(--sl-color-gray-6)] last:border-b-0">
                          <td class="px-4 py-3">{shop.name ?? 'Shop'}</td>
                          <td class="px-4 py-3">
                            <span class="inline-flex items-center gap-2 whitespace-nowrap">
                              {#if regionFlag(shop.region)}
                                <span aria-hidden="true">{regionFlag(shop.region)}</span>
                              {/if}
                              <span>{shopRegionLabel(shop)}</span>
                            </span>
                          </td>
                          <td class="px-4 py-3">{shopStatusLabel(shop.status)}</td>
                          <td class="px-4 py-3 text-right font-[650]">{formatPrice(shop)}</td>
                          <td class="px-4 py-3 text-right">
                            <a
                              class="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--sl-color-gray-5)] text-[var(--sl-color-gray-2)] no-underline hover:border-[var(--sl-color-accent)] hover:text-[var(--sl-color-accent-high)]"
                              href={shop.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              aria-label={`Open ${shop.name ?? 'shop'} page`}
                            >
                              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                                <path d="M12 5H5v14h14v-7" />
                                <path d="M14 5h5v5" />
                                <path d="m10 14 9-9" />
                              </svg>
                            </a>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {:else}
                <p class="m-0 rounded-[12px] border border-[var(--sl-color-gray-5)] px-4 py-3 text-[var(--sl-color-gray-2)]">No shop links available.</p>
              {/if}
            </section>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if imageOverlay}
    <img
      class="pointer-events-none fixed z-[2147483647] rounded-[10px] bg-white object-cover p-0 outline outline-1 outline-[var(--sl-color-gray-5)] shadow-[0_18px_45px_rgba(0,0,0,0.38)] transition-[left,top,width,height] duration-150 ease-out"
      src={imageOverlay.src}
      alt=""
      style={imageOverlayStyle(imageOverlay)}
      aria-hidden="true"
    />
  {/if}
</section>
