import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { parse as parseYaml } from 'yaml';
import sharp from 'sharp';

const rootDir = fileURLToPath(new URL('../../', import.meta.url));
const yamlDir = join(rootDir, 'research/products/db');
const jsonPath = join(rootDir, 'src/data/3rdparty-products.json');
const distJsonPath = join(rootDir, 'dist/products/products.json');
const assetDir = join(rootDir, 'src/assets/products');
const imageMapPath = join(rootDir, 'src/data/3rdparty-product-images.ts');
const imageSourceCachePath = join(rootDir, 'research/products/3rdparty-product-image-sources.json');

const MAX_WIDTH = 720;
const MAX_HEIGHT = 540;
const TIMEOUT_MS = 20_000;
const CONCURRENCY = 8;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

const refreshImages = process.argv.includes('--refresh-images');
const skipImages = process.argv.includes('--skip-images');
const execFileAsync = promisify(execFile);

function slugify(value) {
  return value
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function fileSafeId(id) {
  return id.replace(/[^a-zA-Z0-9._:-]+/g, '-');
}

function legacyAssetName(id) {
  return `${id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}.webp`;
}

function importName(id, index) {
  return `productImage${index}_${slugify(id).replaceAll('-', '_')}`;
}

function normalizeUrl(value) {
  const url = value?.toString().trim();
  if (!url || /^(null|n\/a|na|none|unknown|not found)$/i.test(url)) return null;
  return /^https?:\/\//i.test(url) ? url : null;
}

function normalizeImageSource(value) {
  const source = value?.toString().trim();
  if (!source || /^(null|n\/a|na|none|unknown|not found)$/i.test(source)) return null;
  return /^(https?:\/\/|file:\/\/)/i.test(source) ||
    source.startsWith('~/') ||
    source.includes('/') ||
    /\.(avif|gif|jpe?g|png|svg|tiff?|webp)$/i.test(source)
    ? source
    : null;
}

function productDisplayName(product) {
  return product.product_name ?? product.project_name ?? '';
}

function primaryUrl(product) {
  return product.product_url ?? product.project_url ?? null;
}

function canonicalPrice(value) {
  if (!value || typeof value !== 'object') return undefined;

  return {
    price: canonicalPriceValue(value.price),
    currency: value.currency?.toString() || 'Unknown',
  };
}

function canonicalPriceValue(value) {
  if (value === undefined || value === null || value === '') return 'Unknown';
  const number = Number(value);
  return Number.isFinite(number) ? number : 'Unknown';
}

function canonicalShopStatus(value) {
  const status = value?.toString().trim().toLowerCase().replace(/\s+/g, '-');
  if (status === 'eol') return 'eol';
  if (status === 'out-of-stock' || status === 'outofstock') return 'out-of-stock';
  return 'available';
}

function canonicalDate(value) {
  const date = value?.toString().trim();
  return date || null;
}

function canonicalProduct(product, kind) {
  const pictureUrl = normalizeImageSource(product.picture_url);

  if (kind === 'commercial') {
    return {
      kind,
      picture_url: pictureUrl,
      product_name: product.product_name?.toString() ?? '',
      description: product.description?.toString() ?? '',
      manufacturer: product.manufacturer?.toString() ?? '',
      component_category: product.component_category?.toString() ?? '',
      component_sub_category: product.component_sub_category?.toString() ?? '',
      license: 'Commercial',
      product_url: normalizeUrl(product.product_url),
      last_updated: canonicalDate(product.last_updated),
      shops: (product.shops ?? []).map((shop) => ({
        name: shop.name?.toString() ?? '',
        region: shop.region?.toString() ?? '',
        price: canonicalPriceValue(shop.price),
        currency: shop.currency?.toString() || 'Unknown',
        status: canonicalShopStatus(shop.status),
        url: normalizeUrl(shop.url),
        last_updated: canonicalDate(shop.last_updated),
      })),
    };
  }

  return {
    kind,
    picture_url: pictureUrl,
    project_name: product.project_name?.toString() ?? '',
    description: product.description?.toString() ?? '',
    maker: product.maker?.toString() ?? '',
    component_category: product.component_category?.toString() ?? '',
    component_sub_category: product.component_sub_category?.toString() ?? '',
    license: product.license?.toString() ?? '',
    project_url: normalizeUrl(product.project_url),
    last_updated: canonicalDate(product.last_updated),
    ...(product.estimated_price ? { estimated_price: canonicalPrice(product.estimated_price) } : {}),
  };
}

async function readJsonProducts(path) {
  try {
    const data = JSON.parse(await readFile(path, 'utf8'));
    return Array.isArray(data.products) ? data.products : [];
  } catch {
    return [];
  }
}

async function readJson(path, fallback) {
  try {
    const data = JSON.parse(await readFile(path, 'utf8'));
    return data;
  } catch {
    return fallback;
  }
}

function writeJson(path, value) {
  return writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sortObject(value) {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}

function productImageSource(product) {
  if (product.picture_url) return product.picture_url;
  if (product.kind !== 'opensource') return null;
  return githubFallbackForProduct(product);
}

function buildStableLookup(stableProducts) {
  const exact = new Map();
  const byUrl = new Map();
  const byName = new Map();

  for (const product of stableProducts) {
    const name = productDisplayName(product).toLowerCase();
    const url = primaryUrl(product);
    const exactKey = [product.kind, product.component_category, name, url].join('|');
    const urlKey = [product.kind, product.component_category, url].join('|');
    const nameKey = [product.kind, product.component_category, name].join('|');

    if (!exact.has(exactKey)) exact.set(exactKey, product);
    byUrl.set(urlKey, byUrl.has(urlKey) ? null : product);
    byName.set(nameKey, byName.has(nameKey) ? null : product);
  }

  return { exact, byUrl, byName };
}

function findStableProduct(product, lookup) {
  const name = productDisplayName(product).toLowerCase();
  const url = primaryUrl(product);
  const exactKey = [product.kind, product.component_category, name, url].join('|');
  const urlKey = [product.kind, product.component_category, url].join('|');
  const nameKey = [product.kind, product.component_category, name].join('|');

  return lookup.exact.get(exactKey) ?? lookup.byUrl.get(urlKey) ?? lookup.byName.get(nameKey) ?? null;
}

function assignStableIds(products, stableProducts) {
  const seen = new Map();
  const lookup = buildStableLookup(stableProducts);

  return products.map((product) => {
    const stableProduct = findStableProduct(product, lookup);
    const maker = product.manufacturer ?? product.maker ?? '';
    const generatedSlug = slugify([maker, productDisplayName(product)].filter(Boolean).join(' '));
    const baseSlug = stableProduct?.slug ?? generatedSlug;
    const baseId = stableProduct?.id ?? `${product.kind}:${product.component_category}:${baseSlug}`;
    const count = (seen.get(baseId) ?? 0) + 1;
    seen.set(baseId, count);

    const slug = count === 1 ? baseSlug : `${baseSlug}-${count}`;
    const id =
      count === 1 && stableProduct?.id ? stableProduct.id : `${product.kind}:${product.component_category}:${slug}`;

    return {
      id,
      kind: product.kind,
      slug,
      ...Object.fromEntries(Object.entries(product).filter(([key]) => key !== 'kind')),
    };
  });
}

async function readYamlProducts() {
  const files = (await readdir(yamlDir)).filter((file) => file.endsWith('.yml')).sort();
  const products = [];

  for (const file of files) {
    const category = basename(file, '.yml');
    const data = parseYaml(await readFile(join(yamlDir, file), 'utf8')) ?? {};

    for (const kind of ['commercial', 'opensource']) {
      const records = data[kind] ?? [];
      if (!Array.isArray(records)) {
        throw new Error(`${file}: ${kind} must be an array`);
      }

      for (const record of records) {
        const product = canonicalProduct(record, kind);
        if (product.component_category !== category) {
          throw new Error(`${file}: ${productDisplayName(product)} has category ${product.component_category}`);
        }
        products.push(product);
      }
    }
  }

  const distProducts = await readJsonProducts(distJsonPath);
  const stableProducts = distProducts.length > 0 ? distProducts : await readJsonProducts(jsonPath);
  return assignStableIds(products, stableProducts);
}

function databaseFor(products) {
  const publicProducts = products.map(publicProduct);

  return {
    schema_version: '2.0.0',
    generated_on: new Date().toISOString().slice(0, 10),
    description:
      'Third-party simulator hardware/software database generated from research/products/db YAML category files.',
    schema: {
      commercial_product: {
        id: 'Stable id in form commercial:component-category:slug.',
        kind: 'commercial.',
        slug: 'Stable route slug.',
        product_name: 'Product display name.',
        description: 'Short product description.',
        manufacturer: 'Product manufacturer.',
        component_category: 'Primary component category.',
        component_sub_category: 'Component subcategory slug.',
        license: 'Commercial.',
        product_url: 'Canonical product URL.',
        shops: 'Array of shop entries with name, region, price or Unknown, currency, and URL.',
      },
      opensource_project: {
        id: 'Stable id in form opensource:component-category:slug.',
        kind: 'opensource.',
        slug: 'Stable route slug.',
        project_name: 'Project display name.',
        description: 'Short project description.',
        maker: 'Project maker or maintainer.',
        component_category: 'Primary component category.',
        component_sub_category: 'Component subcategory slug.',
        license: 'Project license.',
        project_url: 'Canonical project URL.',
        estimated_price: 'Optional estimated build price with numeric price and currency.',
      },
    },
    summary: {
      total_records: publicProducts.length,
      by_kind: countBy(publicProducts, 'kind'),
      by_component_category: countBy(publicProducts, 'component_category'),
    },
    products: publicProducts,
  };
}

function publicProduct(product) {
  const { picture_url: _pictureUrl, ...publicFields } = product;
  return publicFields;
}

function countBy(products, key) {
  return products.reduce((counts, product) => {
    counts[product[key]] = (counts[product[key]] ?? 0) + 1;
    return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  }, {});
}

function validateProducts(products) {
  const ids = new Set();

  for (const product of products) {
    if (ids.has(product.id)) throw new Error(`Duplicate product id: ${product.id}`);
    ids.add(product.id);

    if (fileSafeId(product.id) !== product.id) {
      throw new Error(`Product id cannot be used as an asset filename: ${product.id}`);
    }

    const required =
      product.kind === 'commercial'
        ? [
          'id',
          'kind',
          'slug',
          'product_name',
          'description',
          'manufacturer',
          'component_category',
          'component_sub_category',
          'license',
          'product_url',
          'shops',
        ]
        : [
          'id',
          'kind',
          'slug',
          'project_name',
          'description',
          'maker',
          'component_category',
          'component_sub_category',
          'license',
          'project_url',
        ];

    for (const key of required) {
      if (!(key in product)) throw new Error(`${product.id}: missing ${key}`);
    }

    if (product.kind === 'commercial') {
      if (!Array.isArray(product.shops)) throw new Error(`${product.id}: shops must be an array`);
      for (const shop of product.shops) {
        if ((typeof shop.price !== 'number' || Number.isNaN(shop.price)) && shop.price !== 'Unknown') {
          throw new Error(`${product.id}: shop price must be a number or Unknown`);
        }
        for (const key of ['name', 'region', 'currency', 'url']) {
          if (!(key in shop)) throw new Error(`${product.id}: shop missing ${key}`);
        }
      }
    } else if (product.estimated_price) {
      if (typeof product.estimated_price.price !== 'number' || Number.isNaN(product.estimated_price.price)) {
        throw new Error(`${product.id}: estimated price must be a number`);
      }
      if (!product.estimated_price.currency) {
        throw new Error(`${product.id}: estimated price currency is required`);
      }
    }
  }
}

async function exists(path) {
  try {
    await access(path, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function fetchImageBuffer(url, referer) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        referer,
        'user-agent': USER_AGENT,
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    const { stdout } = await execFileAsync(
      '/usr/bin/curl',
      [
        '--fail',
        '--location',
        '--insecure',
        '--silent',
        '--show-error',
        '--max-time',
        String(Math.ceil(TIMEOUT_MS / 1000)),
        '--user-agent',
        USER_AGENT,
        '--header',
        'Accept: image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8',
        '--referer',
        referer,
        url,
      ],
      {
        encoding: 'buffer',
        maxBuffer: 25_000_000,
      }
    ).catch(() => {
      throw error;
    });

    return Buffer.from(stdout);
  } finally {
    clearTimeout(timeout);
  }
}

function isRemoteImageSource(source) {
  return /^https?:\/\//i.test(source);
}

function resolveLocalImageSource(source) {
  if (source.startsWith('file://')) return fileURLToPath(source);
  if (source.startsWith('~/')) return resolve(rootDir, 'src', source.slice(2));
  return isAbsolute(source) ? source : resolve(rootDir, source);
}

async function readLocalImageBuffer(source) {
  const path = resolveLocalImageSource(source);
  try {
    return await readFile(path);
  } catch (error) {
    throw new Error(`local image read failed (${path}): ${error.message}`);
  }
}

function hashBuffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function imageSourceCacheEntry(source) {
  if (isRemoteImageSource(source)) {
    return { cacheKey: source, buffer: null };
  }

  const buffer = await readLocalImageBuffer(source);
  return { cacheKey: `${source}#sha256=${hashBuffer(buffer)}`, buffer };
}

function githubOpenGraphFallback(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    if (url.hostname !== 'github.com') return null;
    const [owner, repo] = url.pathname.split('/').filter(Boolean);
    if (!owner || !repo) return null;
    return `https://opengraph.githubassets.com/1/${owner}/${repo}`;
  } catch {
    return null;
  }
}

function githubFallbackForProduct(product) {
  return githubOpenGraphFallback(product.project_url ?? product.product_url);
}

async function writeBufferIfChanged(path, buffer) {
  try {
    const current = await readFile(path);
    if (hashBuffer(current) === hashBuffer(buffer)) {
      return false;
    }
  } catch {
    // Missing or unreadable output gets replaced below.
  }

  await writeFile(path, buffer);
  return true;
}

async function convertImageBuffer(buffer, outputPath) {
  const outputBuffer = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();
  return writeBufferIfChanged(outputPath, outputBuffer);
}

function isCachedImageSource(cachedSource, sourceUrl) {
  return typeof cachedSource === 'string' && cachedSource === sourceUrl;
}

async function ensureProductImage(product, cachedSource) {
  const filename = `${product.id}.webp`;
  const outputPath = join(assetDir, filename);
  const legacyPath = join(assetDir, legacyAssetName(product.id));
  const sourceUrl = productImageSource(product);

  if (!sourceUrl) {
    return { filename: null, sourceUrl: null, changed: false };
  }

  const { cacheKey: sourceCacheKey, buffer: sourceBuffer } = await imageSourceCacheEntry(sourceUrl);
  const cacheHit = !refreshImages && isCachedImageSource(cachedSource, sourceCacheKey);

  if (cacheHit && (await exists(outputPath))) {
    await sharp(outputPath).metadata();
    return { filename, sourceUrl: sourceCacheKey, changed: false };
  }

  if (cacheHit && (await exists(legacyPath))) {
    const changed = await writeBufferIfChanged(outputPath, await readFile(legacyPath));
    return { filename, sourceUrl: sourceCacheKey, changed };
  }

  const referer = product.product_url ?? product.project_url ?? product.picture_url ?? '';
  let finalSourceUrl = sourceUrl;
  let finalSourceCacheKey = sourceCacheKey;

  try {
    const buffer = isRemoteImageSource(finalSourceUrl) ? await fetchImageBuffer(finalSourceUrl, referer) : sourceBuffer;
    const changed = await convertImageBuffer(buffer, outputPath);
    return { filename, sourceUrl: finalSourceCacheKey, changed };
  } catch (error) {
    if (!isRemoteImageSource(finalSourceUrl)) {
      throw new Error(`${product.id}: ${error.message}`);
    }

    const fallback =
      finalSourceUrl === product.picture_url ? githubFallbackForProduct(product) : githubOpenGraphFallback(referer);
    if (!fallback) {
      throw new Error(`${product.id}: image fetch failed: ${error.message}`);
    }

    finalSourceUrl = fallback;
    finalSourceCacheKey = fallback;
    const changed = await convertImageBuffer(await fetchImageBuffer(finalSourceUrl, referer), outputPath);
    return { filename, sourceUrl: finalSourceCacheKey, changed };
  }
}

async function runQueue(items, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runner() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, runner));
  return results;
}

async function writeImageMap(products, filenames) {
  const imports = [];
  const entries = [];

  products.forEach((product, index) => {
    const filename = filenames[index];
    if (!filename) return;

    const name = importName(product.id, index);
    imports.push(`import ${name} from '~/assets/products/${filename}';`);
    entries.push(`  ${JSON.stringify(product.id)}: ${name},`);
  });

  await writeFile(
    imageMapPath,
    `import type { ImageMetadata } from 'astro';\n${imports.join('\n')}\n\nexport const productImages: Record<string, ImageMetadata> = {\n${entries.join('\n')}\n};\n\nexport type ProductImageId = keyof typeof productImages;\n`
  );
}

const products = await readYamlProducts();
validateProducts(products);
const imageSourceCache = await readJson(imageSourceCachePath, Object.create(null));
const updatedImageSourceCache = Object.create(null);

await writeFile(jsonPath, `${JSON.stringify(databaseFor(products), null, 2)}\n`);

if (!skipImages) {
  await mkdir(assetDir, { recursive: true });

  const imageResults = await runQueue(products, async (product) => {
    const cachedSource = imageSourceCache[product.id] ?? null;
    const { filename, sourceUrl, changed } = await ensureProductImage(product, cachedSource);
    if (sourceUrl) updatedImageSourceCache[product.id] = sourceUrl;
    return { filename, changed };
  });
  const filenames = imageResults.map(({ filename }) => filename);

  for (const { filename, changed } of imageResults) {
    if (changed && filename) {
      console.log(`Image changed: ${filename}`);
    }
  }

  await writeImageMap(products, filenames);
  await writeJson(imageSourceCachePath, sortObject(updatedImageSourceCache));
} else {
  console.log('Skipped image generation.');
}

console.log(`Built ${products.length} products from YAML.`);
