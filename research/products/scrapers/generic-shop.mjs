#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';
import { inferWinCtrlRegion, scrapeWinCtrl, winCtrlShopName } from './libs/winctrl.mjs';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const DB_DIR = path.join(ROOT, 'research/products/db');
const GENERATED_PRODUCTS = path.join(ROOT, 'src/data/3rdparty-products.json');
const USER_AGENT =
  'Mozilla/5.0 (compatible; OpenSimGearShopScraper/1.0; +https://opensimgear.com)';

let args = [];
let startUrl = null;
let WRITE = false;
let BUILD = false;
let INCLUDE_ACCESSORIES = false;
let VERBOSE = false;
let LIMIT = null;
let MAX_CRAWL_PAGES = 50;
let MATCH_THRESHOLD = 0.72;
let RATE_LIMIT_MS = 750;
let MAX_RETRIES = 3;
let shopNameOverride = null;
let manufacturerOverride = null;
let categoryOverride = null;
let subcategoryOverride = null;
let regionOverride = null;
let mappings = [];

async function main(argv = process.argv.slice(2)) {
  parseCliArgs(argv);

  if (!startUrl) {
    console.error(
      'Usage: pnpm products:update -- <url> [--write] [--build] [--max-pages 50] [--rate-limit-ms 750] [--retries 3] [--map "shop name=product:id"]',
    );
    process.exit(1);
  }

  verbose(`start url: ${startUrl}`);
  verbose(`mode: ${WRITE ? 'write' : 'dry-run'}`);
  verbose(`max pages: ${MAX_CRAWL_PAGES}`);
  verbose(`match threshold: ${MATCH_THRESHOLD}`);
  verbose(`rate limit: ${RATE_LIMIT_MS}ms`);
  verbose(`retries: ${MAX_RETRIES}`);

  const source = await scrapeShop(startUrl);
  const databases = await loadDatabases();
  const generated = await loadGeneratedProducts();
  const index = buildProductIndex(databases, generated);
  const foundProducts = source.products.slice(0, LIMIT ?? source.products.length);
  const actions = [];

  for (const found of foundProducts) {
    const mappedId = mappingFor(found.name);
    verbose(`match: ${found.name}`);
    if (mappedId) verbose(`  explicit map -> ${mappedId}`);

    const match = mappedId
      ? matchById(index, mappedId)
      : matchProduct(index, found, categoryOverride ?? inferCategory(found).category);

    const action = decideAction(found, match, source);
    verbose(`  action: ${action.type}`);
    actions.push(action);

    if (WRITE) applyAction(databases, action, source);
  }

  printReport(source, actions);

  if (WRITE) {
    await writeTouchedDatabases(databases);
    if (BUILD) await run('pnpm', ['products:build']);
  }
}

function parseCliArgs(argv) {
  args = argv;
  startUrl = positionalUrl();
  WRITE = args.includes('--write');
  BUILD = args.includes('--build');
  INCLUDE_ACCESSORIES = args.includes('--include-accessories');
  VERBOSE = args.includes('--verbose');
  LIMIT = numberArg('--limit');
  MAX_CRAWL_PAGES = numberArg('--max-pages') ?? 50;
  MATCH_THRESHOLD = numberArg('--threshold') ?? 0.72;
  RATE_LIMIT_MS = numberArg('--rate-limit-ms') ?? 750;
  MAX_RETRIES = numberArg('--retries') ?? 3;
  shopNameOverride = stringArg('--shop-name');
  manufacturerOverride = stringArg('--manufacturer');
  categoryOverride = stringArg('--category');
  subcategoryOverride = stringArg('--subcategory');
  regionOverride = stringArg('--region');
  mappings = mappingArgs();
}

function positionalUrl() {
  return args.find((arg, index) => !arg.startsWith('--') && !['--map', '--limit', '--max-pages', '--threshold', '--rate-limit-ms', '--retries', '--shop-name', '--manufacturer', '--category', '--subcategory', '--region'].includes(args[index - 1]));
}

function stringArg(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
}

function numberArg(name) {
  const value = stringArg(name);
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mappingArgs() {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--map' && args[index + 1]) values.push(args[index + 1]);
  }

  return values.map((value) => {
    const match = value.match(/^(.+?)(?:=>|=)(.+)$/);
    if (!match) throw new Error(`Invalid --map value: ${value}`);
    return { name: normalizeName(match[1]), id: match[2].trim() };
  });
}

function mappingFor(name) {
  const key = normalizeName(name);
  const mapping = mappings.find((item) => item.name === key);
  return mapping?.id ?? null;
}

async function scrapeShop(url) {
  const base = new URL(url);
  const shopName = shopNameOverride ?? winCtrlShopName(base) ?? hostShopName(base.hostname);
  const region = regionOverride ?? inferWinCtrlRegion(base) ?? inferShopRegion(base);

  verbose(`shop name: ${shopName}`);
  verbose(`shop region: ${region}`);
  verbose('try WinCtrl list API');
  const winCtrlProducts = await scrapeWinCtrl(base, {
    fetchWithRetry,
    requestHeaders,
    isUsefulShopProduct,
    verbose,
  }).catch((error) => {
    verbose(`  WinCtrl failed: ${error.message}`);
    return [];
  });
  verbose(`  WinCtrl products: ${winCtrlProducts.length}`);

  verbose('try WooCommerce Store API');
  const wooCommerceProducts = await scrapeWooCommerce(base).catch((error) => {
    verbose(`  WooCommerce failed: ${error.message}`);
    return [];
  });
  verbose(`  WooCommerce products: ${wooCommerceProducts.length}`);

  verbose('try Shopify products.json');
  const shopifyProducts = await scrapeShopify(base).catch((error) => {
    verbose(`  Shopify failed: ${error.message}`);
    return [];
  });
  verbose(`  Shopify products: ${shopifyProducts.length}`);

  const products = [
    ...winCtrlProducts,
    ...wooCommerceProducts,
    ...shopifyProducts,
  ];

  if (!products.length) {
    verbose('try generic HTML crawler');
    products.push(...(await scrapeGenericHtml(base)));
    verbose(`  generic products: ${products.length}`);
  }

  return {
    startUrl: base.toString(),
    shopName,
    region,
    products: uniqueProducts(products).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

async function scrapeWooCommerce(base) {
  const products = [];
  const endpoint = new URL('/wp-json/wc/store/products', base);

  for (let page = 1; page <= 20; page += 1) {
    endpoint.search = new URLSearchParams({ per_page: '100', page: String(page) }).toString();
    verbose(`  fetch WooCommerce page ${page}: ${endpoint}`);
    const response = await fetchWithRetry(endpoint, { headers: requestHeaders('application/json') });
    if (!response.ok) break;

    const data = await response.json();
    if (!Array.isArray(data) || !data.length) break;

    products.push(
      ...data.map((product) => ({
        name: cleanText(product.name),
        url: product.permalink,
        image: product.images?.[0]?.src,
        price: parseMinorPrice(product.prices?.price, product.prices?.currency_minor_unit),
        currency: product.prices?.currency_code,
        status: wooCommerceStatus(product),
        description: cleanText(product.short_description),
        categories: (product.categories ?? []).map((category) => category.name),
      })),
    );

    const totalPages = Number(response.headers.get('x-wp-totalpages') ?? page);
    if (page >= totalPages) break;
  }

  return products.filter(isUsefulShopProduct);
}

async function scrapeShopify(base) {
  const urls = [
    ...new Set([
      new URL('/products.json?limit=250', base).toString(),
      new URL(`${trimTrailingSlash(base.pathname)}/products.json?limit=250`, base).toString(),
    ]),
  ];
  const products = [];

  for (const url of urls) {
    verbose(`  fetch Shopify feed: ${url}`);
    const response = await fetchWithRetry(url, { headers: requestHeaders('application/json') });
    if (!response.ok) continue;

    const data = await response.json();
    const shopifyProducts = data.products ?? [];
    products.push(
      ...shopifyProducts.map((product) => {
        const variant = product.variants?.find((item) => item.available) ?? product.variants?.[0];
        return {
          name: cleanText(product.title),
          url: new URL(`/products/${product.handle}`, base).toString(),
          image: product.images?.[0]?.src ?? product.image?.src,
          price: parsePrice(variant?.price),
          currency: variant?.price_currency ?? null,
          status: variant?.available === false ? 'out-of-stock' : 'available',
          description: cleanText(product.body_html),
          categories: [product.product_type, ...(product.tags ?? [])].filter(Boolean),
        };
      }),
    );
  }

  return products.filter(isUsefulShopProduct);
}

async function scrapeGenericHtml(base) {
  const pages = await discoverGenericShopPages(base);
  verbose(`  generic pages to inspect: ${pages.length}`);
  const productLinks = new Set();
  const products = [];

  for (const page of pages) {
    verbose(`  inspect page: ${page}`);
    let html;
    try {
      html = await fetchText(page);
    } catch {
      continue;
    }

    if (isProductHtml(html)) {
      const product = parseGenericProduct(html, page);
      if (product) {
        verbose(`    page is product: ${product.name}`);
        products.push(product);
      }
    }

    for (const link of extractLinks(html, page)) {
      if (looksLikeProductUrl(link, base)) productLinks.add(urlKey(link));
    }
  }

  verbose(`  product links discovered: ${productLinks.size}`);
  for (const link of productLinks) {
    try {
      verbose(`  fetch product: ${link}`);
      const productHtml = await fetchText(link);
      if (!isProductHtml(productHtml)) continue;
      const product = parseGenericProduct(productHtml, link);
      if (product) {
        verbose(`    product parsed: ${product.name}`);
        products.push(product);
      }
    } catch {
      // Link discovery is best effort.
    }
  }

  return products.filter(isUsefulShopProduct);
}

async function discoverGenericShopPages(base) {
  const queue = [base.toString()];
  const visited = new Set();

  while (queue.length && visited.size < MAX_CRAWL_PAGES) {
    const page = queue.shift();
    const key = urlKey(page);
    if (visited.has(key)) continue;
    visited.add(key);
    verbose(`  crawl page ${visited.size}/${MAX_CRAWL_PAGES}: ${key}`);

    let html;
    try {
      html = await fetchText(page);
    } catch {
      continue;
    }

    for (const link of extractLinks(html, page)) {
      const normalized = urlKey(link);
      if (!normalized || visited.has(normalized) || queue.includes(normalized)) continue;
      if (looksLikeShopPage(link, base) || looksLikePaginationUrl(link, page)) {
        verbose(`    queue catalog/page: ${normalized}`);
        queue.push(normalized);
      }
    }
  }

  return [...visited];
}

function parseGenericProduct(html, fallbackUrl) {
  const jsonProduct = parseJsonLdProduct(html);
  const name =
    cleanText(jsonProduct?.name) ||
    cleanText(meta(html, 'property', 'og:title') ?? firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i));
  if (!name) return null;

  const url = normalizeUrl(jsonProduct?.url ?? meta(html, 'property', 'og:url') ?? canonicalUrl(html) ?? fallbackUrl);
  const offer = Array.isArray(jsonProduct?.offers) ? jsonProduct.offers[0] : jsonProduct?.offers;
  const description = cleanText(jsonProduct?.description ?? meta(html, 'name', 'description'));
  return {
    name,
    url,
    image: extractProductImage(html, url, jsonProduct, name),
    price: parsePrice(offer?.price ?? meta(html, 'property', 'product:price:amount') ?? firstMatch(html, /data-price-amount=["']([^"']+)["']/i)),
    currency: offer?.priceCurrency ?? meta(html, 'property', 'product:price:currency'),
    status: detectShopStatus({
      availability: offer?.availability ?? meta(html, 'property', 'product:availability'),
      text: `${name} ${description} ${html.slice(0, 50_000)}`,
    }),
    description,
    categories: [],
  };
}

function extractProductImage(html, baseUrl, jsonProduct, productName) {
  const jsonImage = Array.isArray(jsonProduct?.image) ? jsonProduct.image[0] : jsonProduct?.image;
  const candidates = [
    imageValue(jsonImage),
    meta(html, 'property', 'og:image:secure_url'),
    meta(html, 'property', 'og:image:url'),
    meta(html, 'property', 'og:image'),
    meta(html, 'property', 'product:image'),
    meta(html, 'name', 'twitter:image'),
    linkHref(html, 'image_src'),
    ...extractImageCandidates(html, productName),
  ];

  for (const candidate of candidates) {
    const image = absolutizeUrl(candidate, baseUrl);
    if (isUsefulImageUrl(image)) return image;
  }

  return undefined;
}

function imageValue(value) {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.url ?? value.contentUrl ?? undefined;
}

function extractImageCandidates(html, productName) {
  const normalizedNameTokens = new Set(normalizeName(productName).split(' ').filter((token) => token.length > 2));
  const images = [];

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const source = attr(tag, 'src') ?? srcsetFirstUrl(attr(tag, 'srcset') ?? attr(tag, 'data-srcset'));
    const text = normalizeName([attr(tag, 'alt'), attr(tag, 'title'), attr(tag, 'class'), attr(tag, 'id')].filter(Boolean).join(' '));
    if (!source) continue;

    const score =
      (/\b(product|gallery|main|featured|woocommerce|shopify|media|image)\b/.test(text) ? 2 : 0) +
      [...normalizedNameTokens].filter((token) => text.includes(token)).length;
    images.push({ source, score });
  }

  return images
    .filter((image) => image.score > 0 || isUsefulImageUrl(image.source))
    .sort((a, b) => b.score - a.score)
    .map((image) => image.source);
}

function srcsetFirstUrl(value) {
  return value?.split(',')[0]?.trim().split(/\s+/)[0];
}

function parseJsonLdProduct(html) {
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(decodeHtml(match[1]).trim());
      const candidates = flattenJsonLd(parsed);
      const product = candidates.find((item) => ldType(item).includes('product'));
      if (product) return product;
    } catch {
      // Some pages contain invalid JSON-LD; continue to meta fallback.
    }
  }

  return null;
}

function flattenJsonLd(value) {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (!value || typeof value !== 'object') return [];
  return [value, ...flattenJsonLd(value['@graph'] ?? [])];
}

function ldType(value) {
  const type = value?.['@type'];
  return Array.isArray(type) ? type.map((item) => item.toLowerCase()) : [String(type ?? '').toLowerCase()];
}

async function loadDatabases() {
  const files = (await readdir(DB_DIR)).filter((file) => file.endsWith('.yml')).sort();
  const databases = {};

  for (const file of files) {
    const category = basename(file, '.yml');
    const source = await readFile(path.join(DB_DIR, file), 'utf8');
    databases[category] = {
      file: path.join(DB_DIR, file),
      touched: false,
      data: parse(source) ?? {},
    };
    databases[category].data.commercial ??= [];
    databases[category].data.opensource ??= [];
  }

  return databases;
}

async function loadGeneratedProducts() {
  try {
    const data = JSON.parse(await readFile(GENERATED_PRODUCTS, 'utf8'));
    return Array.isArray(data.products) ? data.products : [];
  } catch {
    return [];
  }
}

function buildProductIndex(databases, generatedProducts) {
  const records = [];

  for (const [category, database] of Object.entries(databases)) {
    for (const product of database.data.commercial) {
      const generated = generatedProducts.find((item) => generatedMatchesYaml(item, product, category));
      records.push({
        id: generated?.id ?? `commercial:${category}:${slugify(`${product.manufacturer} ${product.product_name}`)}`,
        category,
        database,
        product,
        searchName: normalizeName(`${product.manufacturer} ${product.product_name}`),
        productName: normalizeName(product.product_name),
        urls: productUrls(product).map(urlKey),
      });
    }
  }

  return records;
}

function generatedMatchesYaml(generated, product, category) {
  return (
    generated.kind === 'commercial' &&
    generated.component_category === category &&
    generated.product_name === product.product_name &&
    generated.manufacturer === product.manufacturer
  );
}

function matchById(index, id) {
  const match = index.find((record) => record.id === id);
  if (!match) throw new Error(`--map target not found in generated DB: ${id}`);
  return { record: match, score: 1, reason: 'mapping' };
}

function matchProduct(index, found, inferredCategory) {
  const foundUrl = urlKey(found.url);
  const urlMatch = index.find((record) => record.urls.includes(foundUrl));
  if (urlMatch) {
    verbose(`  matched by URL: ${urlMatch.id}`);
    return { record: urlMatch, score: 1, reason: 'url' };
  }

  const foundName = normalizeName(found.name);
  const namedManufacturers = manufacturerNamesIn(foundName, index);
  if (namedManufacturers.size) verbose(`  manufacturer tokens: ${[...namedManufacturers].join(', ')}`);
  let best = null;

  for (const record of index) {
    if (namedManufacturers.size) {
      const recordManufacturer = normalizeName(record.product.manufacturer);
      if (![...namedManufacturers].some((manufacturer) => recordManufacturer.includes(manufacturer) || manufacturer.includes(recordManufacturer))) {
        continue;
      }
    }

    const categoryBonus = !inferredCategory || record.category === inferredCategory ? 0.08 : -0.08;
    const score = Math.max(
      similarity(foundName, record.searchName),
      similarity(foundName, record.productName),
      tokenSetSimilarity(foundName, record.searchName),
      tokenSetSimilarity(foundName, record.productName),
    ) + categoryBonus;
    if (!modelTokensCompatible(foundName, record.searchName) && !modelTokensCompatible(foundName, record.productName)) {
      continue;
    }

    if (!best || score > best.score) {
      best = { record, score, reason: 'fuzzy' };
    }
  }

  if (best) verbose(`  best fuzzy: ${best.record.id} score=${best.score.toFixed(2)}`);
  if (best && best.score >= MATCH_THRESHOLD) return best;
  verbose('  no DB match above threshold');
  return null;
}

function decideAction(found, match, source) {
  const inferred = inferCategory(found);
  const status = normalizeShopStatus(found.status);
  const parsedPrice = usablePrice(found.price);
  const price = status === 'out-of-stock' ? 'Unknown' : parsedPrice;
  const shop = {
    name: source.shopName,
    ...(price !== undefined ? { price, currency: found.currency ?? 'USD' } : {}),
    url: normalizeUrl(found.url),
    region: source.region,
    status,
  };

  if (!match) {
    return {
      type: 'create-product',
      found,
      shop,
      category: categoryOverride ?? inferred.category,
      subCategory: subcategoryOverride ?? inferred.subCategory,
      manufacturer: manufacturerOverride ?? inferManufacturer(found, source.shopName),
      match: null,
    };
  }

  const existingShop = findExistingShop(match.record.product, shop);
  if (!existingShop) {
    return { type: 'add-shop', found, shop, match };
  }

  const priceChanged =
    price !== undefined &&
    (price === 'Unknown' ? existingShop.price !== 'Unknown' : Number(existingShop.price) !== Number(price));
  const missingFields = missingShopFields(existingShop, shop);
  return {
    type: priceChanged ? 'update-price' : missingFields.length ? 'update-shop-fields' : 'no-change',
    found,
    shop,
    match,
    existingShop,
    missingFields,
  };
}

function applyAction(databases, action, source) {
  if (action.type === 'create-product') {
    const database = databases[action.category];
    if (!database) throw new Error(`Unknown component category: ${action.category}`);
    database.data.commercial.push(newProduct(action, source));
    database.touched = true;
    return;
  }

  if (action.type === 'add-shop') {
    action.match.record.product.shops ??= [];
    action.match.record.product.shops.push(action.shop);
    action.match.record.database.touched = true;
    return;
  }

  if (action.type === 'update-price') {
    action.existingShop.price = action.shop.price;
    action.existingShop.currency = action.shop.currency;
    action.existingShop.status = action.shop.status;
    action.match.record.database.touched = true;
    return;
  }

  if (action.type === 'update-shop-fields') {
    for (const field of action.missingFields) {
      action.existingShop[field] = action.shop[field];
    }
    action.match.record.database.touched = true;
  }
}

function missingShopFields(existingShop, shop) {
  return ['price', 'currency', 'region', 'status'].filter(
    (field) =>
      shop[field] !== undefined &&
      shop[field] !== null &&
      shop[field] !== '' &&
      (existingShop[field] === undefined ||
        existingShop[field] === null ||
        existingShop[field] === '' ||
        (field === 'region' && existingShop[field] === 'Unknown' && shop[field] !== 'Unknown') ||
        (field === 'status' && existingShop[field] !== shop[field])),
  );
}

function newProduct(action) {
  const name = cleanProductName(action.found.name, action.manufacturer);
  return {
    product_name: name,
    description: `${action.manufacturer} ${name}. ${labelFromSlug(action.subCategory).toLowerCase()}. listed on ${action.shop.name}. ${sentence(action.found.description)}`.trim(),
    manufacturer: action.manufacturer,
    component_category: action.category,
    component_sub_category: action.subCategory,
    product_url: action.found.url,
    picture_url: action.found.image,
    shops: [action.shop],
  };
}

function findExistingShop(product, shop) {
  const targetUrl = urlKey(shop.url);
  const targetDomain = shopDomain(shop.url);
  return (product.shops ?? []).find((entry) => {
    const entryDomain = shopDomain(entry.url);
    return (
      urlKey(entry.url) === targetUrl ||
      (entryDomain && entryDomain === targetDomain) ||
      normalizeName(entry.name) === normalizeName(shop.name)
    );
  });
}

async function writeTouchedDatabases(databases) {
  for (const database of Object.values(databases)) {
    if (!database.touched) continue;
    await writeFile(database.file, stringify(database.data, { lineWidth: 92 }), 'utf8');
  }
}

function printReport(source, actions) {
  console.log(`${WRITE ? 'Write' : 'Dry run'}: ${source.startUrl}`);
  console.log(`Shop: ${source.shopName}`);
  console.log(`Region: ${source.region}`);
  console.log(`Products found: ${actions.length}`);
  console.log('');

  for (const action of actions) {
    const price =
      action.shop.status === 'out-of-stock'
        ? 'out of stock'
        : action.shop.price === undefined
          ? 'unknown price'
          : `${action.shop.price} ${action.shop.currency}`;
    const match = action.match
      ? `${action.match.record.id} (${action.match.reason}, ${action.match.score.toFixed(2)})`
      : `${action.category}/${action.subCategory}`;
    console.log(`- ${action.found.name} | ${action.shop.status} | ${price} | ${action.type} | ${match}`);
  }

  const summary = actions.reduce((counts, action) => {
    counts[action.type] = (counts[action.type] ?? 0) + 1;
    return counts;
  }, {});
  console.log('');
  console.log(`Summary: ${Object.entries(summary).map(([key, value]) => `${key}=${value}`).join(', ')}`);
  if (!WRITE) console.log('Use --write to update YAML. Add --build to regenerate product data/images.');
}

function verbose(message) {
  if (VERBOSE) console.error(`[shop-scraper] ${message}`);
}

function wooCommerceStatus(product) {
  if (product.is_in_stock === false) return 'out-of-stock';
  if (product.is_purchasable === false && product.is_in_stock !== true) return 'eol';
  return 'available';
}

function detectShopStatus({ availability, text }) {
  const availabilityText = normalizeName(availability);
  const pageText = normalizeName(text);

  if (hasAny(availabilityText, ['discontinued', 'eol'])) return 'eol';
  if (hasAny(availabilityText, ['outofstock', 'out stock', 'soldout', 'sold out'])) return 'out-of-stock';
  if (hasAny(availabilityText, ['instock', 'in stock', 'preorder', 'pre order'])) return 'available';

  if (hasAny(pageText, ['discontinued', 'end of life', 'end-of-life', 'no longer available', 'eol'])) {
    return 'eol';
  }
  if (hasAny(pageText, ['out of stock', 'sold out', 'unavailable', 'backorder', 'back order'])) {
    return 'out-of-stock';
  }

  return 'available';
}

function normalizeShopStatus(value) {
  const status = normalizeName(value);
  if (hasAny(status, ['eol', 'discontinued', 'end of life'])) return 'eol';
  if (hasAny(status, ['out of stock', 'outofstock', 'sold out', 'unavailable'])) return 'out-of-stock';
  return 'available';
}

function inferCategory(product) {
  const text = normalizeName(`${product.name} ${(product.categories ?? []).join(' ')} ${product.url}`);
  if (hasAny(text, ['pedal', 'pedals', 'loadcell', 'load cell'])) {
    return { category: 'pedals', subCategory: text.includes('hydraulic') ? 'hydraulic-pedals' : text.includes('load') ? 'load-cell-pedals' : 'two-pedal-set' };
  }
  if (hasAny(text, ['wheelbase', 'wheel base', 'direct drive', 'ddwb', 'servo base'])) {
    return { category: 'wheel-bases', subCategory: 'ffb-controller' };
  }
  if (hasAny(text, ['steering wheel', 'wheel rim', 'formula wheel', 'gt wheel'])) {
    return { category: 'steering-wheels', subCategory: text.includes('formula') ? 'formula-wheel' : 'gt-wheel' };
  }
  if (hasAny(text, ['shifter', 'shift'])) {
    return { category: 'shifters', subCategory: hasAny(text, ['h shifter', 'h-pattern']) ? 'h-pattern-shifter' : 'sequential-shifter' };
  }
  if (hasAny(text, ['handbrake', 'e brake', 'e-brake'])) {
    return { category: 'handbrakes', subCategory: 'analog-handbrake' };
  }
  if (hasAny(text, ['motion', 'actuator', 'dof'])) {
    return { category: 'motion-platforms', subCategory: text.includes('4') ? '4dof-platform' : 'motion-simulator' };
  }
  if (hasAny(text, ['cockpit', 'rig', 'chassis', 'seat'])) {
    return { category: 'rigs-and-cockpits', subCategory: text.includes('aluminum') ? 'aluminum-cockpit' : 'cockpit-frame' };
  }
  if (hasAny(text, ['button box', 'dashboard', 'display', 'ddu', 'panel'])) {
    return { category: 'button-boxes-and-panels', subCategory: 'control-panel' };
  }

  return { category: categoryOverride ?? 'rigs-and-cockpits', subCategory: subcategoryOverride ?? 'rig-mounts' };
}

function inferManufacturer(product, shopName) {
  if (manufacturerOverride) return manufacturerOverride;
  const words = cleanText(product.name).split(/\s+/);
  const first = words[0] ?? shopName;
  return /^[A-Z0-9-]{2,}$/.test(first) ? first : shopName;
}

function isUsefulShopProduct(product) {
  if (!product.name || !product.url) return false;
  const text = normalizeName(`${product.name} ${(product.categories ?? []).join(' ')} ${product.url}`);
  if (hasAny(text, ['sticker', 'shirt', 't shirt', 'hoodie', 'cap', 'hat', 'scent', 'merchandise'])) {
    return false;
  }
  if (
    !INCLUDE_ACCESSORIES &&
    hasAny(text, [
      'refurbished',
      'warehouse',
      'bundle',
      'bundles',
      'boost kit',
      'replacement',
      'spare',
      'cable',
      'adapter',
      'badge',
      'power adapter',
      'quick release',
      'desktop clamp',
      'extension',
      'labels',
      'label',
      'knob',
      'antenna',
      'antenne',
    ])
  ) {
    return false;
  }
  if (product.price !== undefined) return true;

  return hasAny(text, [
    'wheel',
    'wheelbase',
    'wheel base',
    'direct drive',
    'pedal',
    'shifter',
    'handbrake',
    'cockpit',
    'motion',
    'actuator',
    'dashboard',
    'button box',
    'display',
    'rig',
    'seat',
    'chair',
    'mount',
  ]);
}

function looksLikeProductUrl(url, base) {
  const parsed = new URL(url);
  if (parsed.hostname !== base.hostname) return false;
  if (/(cart|checkout|account|wishlist|login|blog|tag|search|wp-json|feed|xmlrpc)/i.test(parsed.pathname)) {
    return false;
  }
  if (looksLikePaginationUrl(url, base.toString())) return false;
  return /(product|products|shop|store)/i.test(parsed.pathname);
}

function looksLikeShopPage(url, base) {
  const parsed = new URL(url);
  if (parsed.hostname !== base.hostname) return false;
  if (/(cart|checkout|account|wishlist|login|blog|tag|search|wp-json|feed|xmlrpc)/i.test(parsed.pathname)) {
    return false;
  }

  return /\/(shop|store|collections?|categories|product-category|catalog)(\/|$)/i.test(parsed.pathname);
}

function looksLikePaginationUrl(url, currentUrl) {
  const parsed = new URL(url);
  const current = new URL(currentUrl);
  if (parsed.hostname !== current.hostname) return false;
  if (parsed.pathname === current.pathname && parsed.search === current.search) return false;
  if (parsed.searchParams.has('page') || parsed.searchParams.has('paged') || parsed.searchParams.has('p')) return true;
  return /\/page\/\d+\/?$/i.test(parsed.pathname) || /[?&]page=\d+/i.test(parsed.href);
}

function isProductHtml(html) {
  return /"@type"\s*:\s*"Product"/i.test(html) || /og:type["'][^>]+product/i.test(html) || /product:price:amount/i.test(html);
}

function requestHeaders(accept) {
  return {
    accept,
    'accept-language': 'en-US,en;q=0.8',
    'user-agent': USER_AGENT,
  };
}

async function fetchText(url) {
  const response = await fetchWithRetry(url, {
    headers: requestHeaders('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

let nextFetchAt = 0;

async function fetchWithRetry(url, options = {}) {
  let lastResponse = null;
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) {
      const delay = retryDelayMs(lastResponse, attempt);
      verbose(`  retry ${attempt}/${MAX_RETRIES} after ${delay}ms: ${url}`);
      await sleep(delay);
    }

    await waitForRateLimit();

    try {
      const response = await fetch(url, options);
      if (!shouldRetryResponse(response) || attempt === MAX_RETRIES) return response;
      lastResponse = response;
      lastError = null;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      lastResponse = null;
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return lastResponse;
}

async function waitForRateLimit() {
  const now = Date.now();
  const waitMs = Math.max(0, nextFetchAt - now);
  nextFetchAt = Math.max(now, nextFetchAt) + RATE_LIMIT_MS;
  if (waitMs > 0) await sleep(waitMs);
}

function shouldRetryResponse(response) {
  return response.status === 429 || response.status === 408 || response.status === 425 || response.status === 502 || response.status === 503 || response.status === 504;
}

function retryDelayMs(response, attempt) {
  const retryAfter = response?.headers?.get('retry-after');
  const retryAfterMs = parseRetryAfterMs(retryAfter);
  if (retryAfterMs !== null) return retryAfterMs;
  return Math.min(30_000, RATE_LIMIT_MS * 2 ** attempt);
}

function parseRetryAfterMs(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractLinks(html, baseUrl) {
  return [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)]
    .map((match) => absolutizeUrl(decodeHtml(match[1]), baseUrl))
    .filter(Boolean);
}

function meta(html, attrName, attrValue) {
  const escaped = escapeRegExp(attrValue);
  const tag = firstMatch(html, new RegExp(`<meta(?=[^>]*\\b${attrName}=["']${escaped}["'])[^>]*>`, 'i'), 0);
  return tag ? attr(tag, 'content') : undefined;
}

function canonicalUrl(html) {
  const tag = firstMatch(html, /<link(?=[^>]*rel=["']canonical["'])[^>]*>/i, 0);
  return tag ? attr(tag, 'href') : undefined;
}

function linkHref(html, rel) {
  const escaped = escapeRegExp(rel);
  const tag = firstMatch(html, new RegExp(`<link(?=[^>]*\\brel=["']${escaped}["'])[^>]*>`, 'i'), 0);
  return tag ? attr(tag, 'href') : undefined;
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${escapeRegExp(name)}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match ? decodeHtml(match[1]) : undefined;
}

function firstMatch(text, pattern, group = 1) {
  const match = text.match(pattern);
  return match ? match[group] : undefined;
}

function productUrls(product) {
  return [product.product_url, ...(product.shops ?? []).map((shop) => shop.url)].filter(Boolean);
}

function urlKey(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (isTrackingParam(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return String(url).toLowerCase();
  }
}

function isTrackingParam(key) {
  return /^(utm_|fbclid$|gclid$|msclkid$|mc_cid$|mc_eid$|igshid$|ref$|referrer$)/i.test(key);
}

function shopDomain(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function normalizeUrl(url) {
  return url ? new URL(url).toString() : null;
}

function absolutizeUrl(url, baseUrl) {
  if (!url) return undefined;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function isUsefulImageUrl(url) {
  if (!url) return false;
  const text = url.toLowerCase();
  if (/(\b|\/)(logo|icon|sprite|placeholder|avatar|payment|badge|favicon)(\b|[-_.?/])/.test(text)) return false;
  if (/\.(svg|gif)(\?|#|$)/.test(text)) return false;
  return /\.(avif|jpe?g|png|webp)(\?|#|$)/.test(text) || /\/image\/|\/media\/|\/cdn\/|\/products?\//.test(text);
}

function parseMinorPrice(value, minorUnit = 2) {
  if (value === undefined || value === null || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number / 10 ** Number(minorUnit ?? 2) : undefined;
}

function parsePrice(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = normalizePriceText(value);
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
}

function normalizePriceText(value) {
  const text = String(value).trim().replace(/[^0-9.,-]/g, '');
  if (text.includes(',') && text.includes('.')) return text.replace(/,/g, '');
  if (text.includes(',') && !text.includes('.')) return text.replace(',', '.');
  return text;
}

function usablePrice(value) {
  const price = parsePrice(value);
  return price !== undefined && price < 999999 ? price : undefined;
}

function uniqueProducts(products) {
  const byUrl = new Map();
  for (const product of products) {
    const key = product.sourceKey || urlKey(product.url) || normalizeName(product.name);
    if (!byUrl.has(key)) byUrl.set(key, product);
  }
  return [...byUrl.values()];
}

function normalizeName(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(new|upgrade|upgraded|version|pre|order|preorder|pre-order|global|first|arrival|sale|official|sim|racing)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanProductName(name, manufacturer) {
  return cleanText(name).replace(new RegExp(`^${escapeRegExp(manufacturer)}\\s+`, 'i'), '').trim();
}

function cleanText(value) {
  return decodeHtml(String(value ?? '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function sentence(value) {
  const text = cleanText(value);
  if (!text) return 'Official shop listing.';
  const clipped = text.length > 180 ? `${text.slice(0, 177).trim()}...` : text;
  return clipped.endsWith('.') ? clipped : `${clipped}.`;
}

function similarity(a, b) {
  if (!a || !b) return 0;
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length, 1);
}

function tokenSetSimilarity(a, b) {
  const left = new Set(a.split(' ').filter(Boolean));
  const right = new Set(b.split(' ').filter(Boolean));
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((token) => right.has(token)).length;
  return (2 * intersection) / (left.size + right.size);
}

function modelTokensCompatible(a, b) {
  const left = modelTokens(a);
  const right = modelTokens(b);
  if (left.size !== right.size && (!left.size || !right.size)) return false;
  if (!left.size || !right.size) return true;
  return [...left].some((token) => right.has(token));
}

function modelTokens(value) {
  return new Set(
    value
      .split(' ')
      .filter((token) => /\d/.test(token))
      .filter((token) => token.length >= 2),
  );
}

function manufacturerNamesIn(foundName, index) {
  const manufacturers = new Set();
  for (const record of index) {
    const manufacturer = normalizeName(record.product.manufacturer);
    if (manufacturer && foundName.includes(manufacturer)) manufacturers.add(manufacturer);
  }
  return manufacturers;
}

function levenshtein(a, b) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function hasAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function hostShopName(hostname) {
  const [name] = hostname.replace(/^www\./, '').split('.');
  return name
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function inferShopRegion(url) {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const labels = host.split('.');
  const pathParts = url.pathname.toLowerCase().split('/').filter(Boolean);
  const tokens = new Set([
    ...labels,
    ...pathParts,
    ...pathParts.flatMap((part) => part.split(/[-_]/)),
  ]);

  if (hasToken(tokens, ['eu', 'europe', 'european', 'en-eu'])) return 'EU';
  if (hasToken(tokens, ['us', 'usa', 'united-states', 'en-us'])) return 'US';
  if (hasToken(tokens, ['uk', 'gb', 'en-gb', 'en-uk'])) return 'UK';
  if (hasToken(tokens, ['de', 'deutschland', 'germany', 'en-de', 'de-de'])) return 'DE';
  if (hasToken(tokens, ['au', 'australia', 'en-au'])) return 'AU';
  if (hasToken(tokens, ['ca', 'canada', 'en-ca'])) return 'Canada';
  if (hasToken(tokens, ['cn', 'china', 'zh-cn'])) return 'China';
  if (hasToken(tokens, ['jp', 'japan', 'ja-jp'])) return 'Japan';
  if (hasToken(tokens, ['global', 'world', 'international', 'intl'])) return 'Global';

  if (host.endsWith('.de')) return 'DE';
  if (host.endsWith('.co.uk') || host.endsWith('.uk')) return 'UK';
  if (host.endsWith('.eu')) return 'EU';
  if (host.endsWith('.com.au') || host.endsWith('.au')) return 'AU';
  if (host.endsWith('.ca')) return 'Canada';
  if (host.endsWith('.cn')) return 'China';
  if (host.endsWith('.jp')) return 'Japan';

  return 'Unknown';
}

function hasToken(tokens, values) {
  return values.some((value) => tokens.has(value));
}

function labelFromSlug(value) {
  const phraseLabels = {
    'g-seat': 'G-seat',
    'g-seat-controller': 'G-seat controller',
    'g-seat-cues': 'G-seat cues',
    'h-pattern-shifter': 'H-pattern shifter',
    'load-cell-pedals': 'Load-cell pedals',
    'toe-brake-pedals': 'Toe-brake pedals',
  };
  const acronyms = {
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

function trimTrailingSlash(value) {
  return value.replace(/\/$/, '');
}

function slugify(value) {
  return value
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = execFile(command, commandArgs, { cwd: ROOT, stdio: 'inherit' }, (error) => {
      if (error) reject(error);
      else resolve();
    });
    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
