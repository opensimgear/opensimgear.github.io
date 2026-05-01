#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SHOP_URL = 'https://ascher-racing.com/de/shop';
const ROBOTS_URL = 'https://ascher-racing.com/robots.txt';
const USER_AGENT =
  'Mozilla/5.0 (compatible; OpenSimGearProductScraper/1.0; +https://opensimgear.com)';

const DATABASES = {
  'button-boxes-and-panels': path.join(ROOT, 'research/products/db/button-boxes-and-panels.yml'),
  'steering-wheels': path.join(ROOT, 'research/products/db/steering-wheels.yml'),
};

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const BUILD = args.includes('--build');
const INCLUDE_ACCESSORIES = args.includes('--include-accessories');
const UPDATE_DESCRIPTIONS = args.includes('--update-descriptions');
const LIMIT = numberArg('--limit');

function numberArg(name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = Number(args[index + 1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function main() {
  const candidates = await discoverProductUrls();
  const products = [];

  for (const url of candidates.slice(0, LIMIT ?? candidates.length)) {
    const html = await fetchText(url);
    if (!isProductPage(html)) continue;

    const product = parseProductPage(html, url);
    if (!product || !shouldImport(product)) continue;
    products.push(product);
  }

  products.sort((a, b) => a.product_name.localeCompare(b.product_name));

  const databases = await loadDatabases();
  const changes = mergeProducts(databases, products);

  if (WRITE) {
    await writeDatabases(databases);
    if (BUILD) {
      await run('pnpm', ['products:build']);
    }
  }

  printReport(products, changes);
}

async function discoverProductUrls() {
  const urls = new Set();

  for (const sitemapUrl of await discoverSitemaps()) {
    try {
      const xml = await fetchText(sitemapUrl);
      for (const loc of [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((m) => decodeHtml(m[1]))) {
        if (looksLikeProductUrl(loc)) urls.add(normalizeUrl(loc));
      }
    } catch (error) {
      console.warn(`skip sitemap ${sitemapUrl}: ${error.message}`);
    }
  }

  const categoryUrls = await discoverCategoryUrls();
  for (const categoryUrl of categoryUrls) {
    try {
      const html = await fetchText(categoryUrl);
      for (const link of extractLinks(html, categoryUrl)) {
        if (looksLikeProductUrl(link)) urls.add(normalizeUrl(link));
      }
    } catch (error) {
      console.warn(`skip category ${categoryUrl}: ${error.message}`);
    }
  }

  return [...urls].sort();
}

async function discoverSitemaps() {
  try {
    const robots = await fetchText(ROBOTS_URL);
    return [...robots.matchAll(/^Sitemap:\s*(.+)$/gim)].map((m) => m[1].trim());
  } catch {
    return [];
  }
}

async function discoverCategoryUrls() {
  const categoryUrls = new Set([
    SHOP_URL,
    `${SHOP_URL}/steering-wheels`,
    `${SHOP_URL}/steering-wheels/mclaren-lenkrader`,
    `${SHOP_URL}/steering-wheels/formula`,
    `${SHOP_URL}/steering-wheels/gt-buttonplate`,
    `${SHOP_URL}/dashboards`,
  ]);

  for (const categoryUrl of [...categoryUrls]) {
    try {
      const html = await fetchText(categoryUrl);
      for (const link of extractLinks(html, categoryUrl)) {
        if (isRelevantCategory(link)) categoryUrls.add(normalizeUrl(link));
      }
    } catch {
      // Category discovery is best effort. Product validation follows.
    }
  }

  return [...categoryUrls].sort();
}

function isRelevantCategory(url) {
  const pathname = new URL(url).pathname;
  return /^\/de\/shop\/(steering-wheels|dashboards)(\/|$)/.test(pathname);
}

function looksLikeProductUrl(url) {
  let parsed;
  try {
    parsed = new URL(url, SHOP_URL);
  } catch {
    return false;
  }

  if (parsed.hostname !== 'ascher-racing.com') return false;

  const pathname = parsed.pathname;
  if (pathname === '/de/shop' || pathname.endsWith('/de/shop/')) return false;
  if (/\/(cart|checkout|customer|wishlist|product_compare|catalogsearch)\//.test(pathname)) {
    return false;
  }

  return /^\/de\/shop\/[^/?#]+\/?$/.test(pathname) || /^\/de\/catalog\/product\/view\//.test(pathname);
}

function isProductPage(html) {
  return /property=["']og:type["']\s+content=["']product["']/i.test(html) || /catalog-product-view/.test(html);
}

function parseProductPage(html, fallbackUrl) {
  const pageTitle = cleanText(
    meta(html, 'property', 'og:title') ??
      firstMatch(html, /<span[^>]+data-ui-id=["']page-title-wrapper["'][^>]*>([\s\S]*?)<\/span>/i) ??
      firstMatch(html, /<h1[^>]*class=["'][^"']*page-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i),
  );

  if (!pageTitle) return null;

  const productName = normalizeProductName(pageTitle);
  const category = inferCategory(productName);
  const price = parsePrice(
    meta(html, 'property', 'product:price:amount') ??
      meta(html, 'itemprop', 'price') ??
      firstMatch(html, /data-price-amount=["']([^"']+)["']/i) ??
      firstMatch(html, /"product_price"\s*:\s*"?([0-9.]+)"?/i),
  );
  const currency =
    cleanText(meta(html, 'property', 'product:price:currency') ?? meta(html, 'itemprop', 'priceCurrency')) || 'EUR';
  const productUrl = normalizeUrl(meta(html, 'property', 'og:url') ?? canonicalUrl(html) ?? fallbackUrl);
  const pictureUrl = meta(html, 'property', 'og:image') ?? firstMatch(html, /<img[^>]+itemprop=["']image["'][^>]+src=["']([^"']+)["']/i);
  const metaDescription = cleanText(meta(html, 'name', 'description'));

  return {
    product_name: productName,
    description: buildDescription(productName, category.subCategory, html, metaDescription),
    manufacturer: 'Ascher Racing',
    component_category: category.category,
    component_sub_category: category.subCategory,
    product_url: productUrl,
    picture_url: pictureUrl ? absolutizeUrl(pictureUrl, productUrl) : undefined,
    shops: [
      {
        name: 'Ascher Racing',
        price,
        currency,
        url: productUrl,
        region: 'EU',
      },
    ],
  };
}

function shouldImport(product) {
  if (product.manufacturer !== 'Ascher Racing') return false;

  const text = `${product.product_name} ${product.product_url}`.toLowerCase();
  if (/(bundle|bundles|set|kit|combo|paket)/.test(text)) return false;
  if (INCLUDE_ACCESSORIES) return true;

  if (/(sticker|spacer|adapter|cable|screw|merchandise|cap|shirt|hoodie|mount|halter|qr|quick-release)/.test(text)) {
    return false;
  }

  return /(dashboard|mclaren|artura|ultimate|sabelt|sw1|b16|b24|f28|f64|formula|lenkrad|wheel)/.test(text);
}

function inferCategory(name) {
  if (/dashboard|display|ddu/i.test(name)) {
    return { category: 'button-boxes-and-panels', subCategory: 'Control panel' };
  }

  if (/b16|b24|button\s*plate/i.test(name)) {
    return { category: 'steering-wheels', subCategory: 'Wheel electronics' };
  }

  if (/sabelt|sw1/i.test(name)) {
    return { category: 'steering-wheels', subCategory: 'GT wheel' };
  }

  return { category: 'steering-wheels', subCategory: 'Formula wheel' };
}

function buildDescription(name, subCategory, html, metaDescription) {
  const stock = stockText(html);
  const detail = metaDescription
    ? ` ${sentence(cleanText(metaDescription.replace(/^Ascher Racing\s*/i, '')))}`
    : '';
  return `Ascher Racing ${name}. ${subCategory.toLowerCase()}. ${stock} on official shop.${detail}`.trim();
}

function stockText(html) {
  if (/(out of stock|nicht lieferbar|ausverkauft|zurzeit nicht)/i.test(html)) {
    return 'currently out of stock';
  }

  if (/(in stock|auf lager|add to cart|In den Warenkorb)/i.test(html)) {
    return 'in stock';
  }

  return 'listed';
}

async function loadDatabases() {
  const entries = {};

  for (const [category, file] of Object.entries(DATABASES)) {
    const source = await readFile(file, 'utf8');
    entries[category] = {
      file,
      data: parse(source),
    };

    entries[category].data.commercial ??= [];
    entries[category].data.opensource ??= [];
  }

  return entries;
}

function mergeProducts(databases, products) {
  const changes = {
    updated: [],
    created: [],
    unchanged: [],
    missingExisting: [],
  };
  const seenExisting = new Set();
  const existingIndexes = buildExistingIndexes(databases);

  for (const product of products) {
    const match = findExisting(existingIndexes, product);

    if (match) {
      seenExisting.add(match.id);
      const changed = updateExisting(match.record, product);
      changes[changed ? 'updated' : 'unchanged'].push(product.product_name);
      continue;
    }

    databases[product.component_category].data.commercial.push(product);
    changes.created.push(product.product_name);
  }

  for (const existing of existingIndexes.records) {
    if (!seenExisting.has(existing.id)) changes.missingExisting.push(existing.record.product_name);
  }

  return changes;
}

function buildExistingIndexes(databases) {
  const byUrl = new Map();
  const byName = new Map();
  const records = [];

  for (const [category, database] of Object.entries(databases)) {
    for (const record of database.data.commercial) {
      if (record.manufacturer !== 'Ascher Racing') continue;

      const id = `${category}:${record.product_name}`;
      const entry = { id, category, record };
      records.push(entry);
      byName.set(nameKey(record.product_name), entry);

      for (const url of recordUrls(record)) {
        byUrl.set(urlKey(url), entry);
      }
    }
  }

  return { byUrl, byName, records };
}

function findExisting(indexes, product) {
  for (const url of recordUrls(product)) {
    const match = indexes.byUrl.get(urlKey(url));
    if (match) return match;
  }

  return indexes.byName.get(nameKey(product.product_name));
}

function updateExisting(record, scraped) {
  let changed = false;

  for (const key of [
    'manufacturer',
    'component_category',
    'component_sub_category',
    'product_url',
    'picture_url',
  ]) {
    if (scraped[key] !== undefined && record[key] !== scraped[key]) {
      record[key] = scraped[key];
      changed = true;
    }
  }

  if (UPDATE_DESCRIPTIONS && scraped.description !== undefined && record.description !== scraped.description) {
    record.description = scraped.description;
    changed = true;
  }

  record.shops ??= [];
  const shop = record.shops.find((entry) => entry.name === 'Ascher Racing') ?? record.shops[0] ?? {};
  if (!record.shops.includes(shop)) record.shops.unshift(shop);

  for (const [key, value] of Object.entries(scraped.shops[0])) {
    if (value !== undefined && shop[key] !== value) {
      shop[key] = value;
      changed = true;
    }
  }

  return changed;
}

async function writeDatabases(databases) {
  for (const database of Object.values(databases)) {
    await writeFile(database.file, stringify(database.data, { lineWidth: 92 }), 'utf8');
  }
}

function recordUrls(record) {
  return [record.product_url, ...(record.shops ?? []).map((shop) => shop.url)].filter(Boolean);
}

function printReport(products, changes) {
  console.log(`Ascher products found: ${products.length}`);
  console.log(`Updated: ${changes.updated.length}`);
  console.log(`Created: ${changes.created.length}`);
  console.log(`Unchanged: ${changes.unchanged.length}`);
  console.log(`Existing not rediscovered: ${changes.missingExisting.length}`);

  if (changes.created.length) {
    console.log(`New: ${changes.created.join(', ')}`);
  }

  if (changes.missingExisting.length) {
    console.log(`Not found now: ${changes.missingExisting.join(', ')}`);
  }

  if (!WRITE) {
    console.log('Dry run. Use --write to update product YAML, and --build to regenerate product data.');
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'de-DE,de;q=0.8,en-US;q=0.6,en;q=0.4',
      'user-agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.text();
}

function extractLinks(html, baseUrl) {
  return [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)]
    .map((match) => absolutizeUrl(decodeHtml(match[1]), baseUrl))
    .filter(Boolean);
}

function meta(html, attrName, attrValue) {
  const escaped = attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = firstMatch(
    html,
    new RegExp(`<meta(?=[^>]*\\b${attrName}=["']${escaped}["'])[^>]*>`, 'i'),
    0,
  );
  return tag ? attr(tag, 'content') : undefined;
}

function canonicalUrl(html) {
  const tag = firstMatch(html, /<link(?=[^>]*rel=["']canonical["'])[^>]*>/i, 0);
  return tag ? attr(tag, 'href') : undefined;
}

function attr(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match ? decodeHtml(match[1]) : undefined;
}

function firstMatch(text, pattern, group = 1) {
  const match = text.match(pattern);
  return match ? match[group] : undefined;
}

function parsePrice(value) {
  if (!value) return undefined;
  const parsed = Number(String(value).replace(',', '.').replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeProductName(name) {
  return cleanText(name)
    .replace(/^Ascher[-\s]*Racing\s*/i, '')
    .replace(/^AR\s+/i, '')
    .trim();
}

function normalizeUrl(url) {
  const parsed = new URL(url, SHOP_URL);
  parsed.hash = '';
  parsed.search = '';
  return parsed.toString();
}

function absolutizeUrl(url, baseUrl) {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return null;
  }
}

function urlKey(url) {
  return normalizeUrl(url)
    .replace(/\/$/, '')
    .replace(/\/de\/catalog\/product\/view\/id\/\d+\/s\/([^/]+)\/category\/\d+$/, '/de/shop/$1');
}

function nameKey(name) {
  return normalizeProductName(name).toLowerCase().replace(/[^a-z0-9]+/g, '');
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
  if (!text) return '';
  return text.endsWith('.') ? text : `${text}.`;
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
