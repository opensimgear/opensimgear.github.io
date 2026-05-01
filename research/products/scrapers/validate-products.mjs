#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { parse, stringify } from 'yaml';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const DB_DIR = path.join(ROOT, 'research/products/db');
const DEFAULT_BLACKLIST = path.join(ROOT, 'research/products/blacklist.json');
const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const BUILD = args.includes('--build');
const VERBOSE = args.includes('--verbose');
const blacklistPath = path.resolve(ROOT, stringArg('--blacklist') ?? DEFAULT_BLACKLIST);
const olderThan = parseDateArg('--older-than');
const categories = new Set(repeatedArg('--category'));
const shopDomains = new Set(repeatedArg('--shop-domain').map(normalizeDomain));
const nameRegexes = repeatedArg('--name-regex').map((pattern) => new RegExp(pattern, 'i'));
const today = new Date().toISOString().slice(0, 10);

if (args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

const databases = await loadDatabases();
const blacklist = await loadProductBlacklist(blacklistPath);
const report = {
  selected: 0,
  purged: 0,
  updated: 0,
  unchanged: 0,
  skipped: 0,
  byChange: {},
};

for (const database of Object.values(databases)) {
  for (const kind of ['commercial', 'opensource']) {
    const records = database.data[kind] ?? [];
    const kept = [];

    for (const product of records) {
      if (isBlacklistedProduct(product, blacklist)) {
        report.purged += 1;
        database.touched = true;
        logChange('purge-blacklist', database.category, productName(product));
        continue;
      }

      if (!matchesSelection(product, database.category)) {
        report.skipped += 1;
        kept.push(product);
        continue;
      }

      report.selected += 1;

      const changes = validateProduct(product, kind, database.category);
      if (changes.length) {
        report.updated += 1;
        database.touched = true;
        for (const change of changes) countChange(change);
        logChange(changes.join(','), database.category, productName(product));
      } else {
        report.unchanged += 1;
      }

      kept.push(product);
    }

    database.data[kind] = kept;
  }
}

printReport();

if (WRITE) {
  await writeTouchedDatabases(databases);
  if (BUILD) await runProductBuild();
} else {
  console.log('Dry run. Use --write to update YAML. Add --build to regenerate product data/images.');
}

function printUsage() {
  console.log(`Usage:
  pnpm products:validate -- [filters] [--write] [--build]

Filters are repeatable where noted. With no filters, all products are selected.
  --older-than <YYYY-MM-DD>       Select products whose last_updated is missing or older than date.
  --category <category>           Select category/file name. Repeatable.
  --shop-domain <domain>          Select products with matching shop domain. Repeatable.
  --name-regex <pattern>          Select products whose name matches regex. Repeatable.

Options:
  --blacklist <path>              Defaults to research/products/blacklist.json.
  --write                         Apply purge/validation updates to YAML.
  --build                         Run pnpm products:build after --write.
  --verbose                       Print each changed product.

Validation updates selected products:
  - purge rows matching blacklist from the full database
  - align component_category to YAML filename
  - normalize commercial license, subcategory slugs, shop status/price/currency/region/url
  - remove duplicate shops by same domain/name/url
  - add last_updated on changed products and changed shops`);
}

function stringArg(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
}

function repeatedArg(name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) values.push(args[index + 1]);
  }
  return values;
}

function parseDateArg(name) {
  const value = stringArg(name);
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${name} must use YYYY-MM-DD.`);
  return value;
}

async function loadDatabases() {
  const files = (await readdir(DB_DIR)).filter((file) => file.endsWith('.yml')).sort();
  const databases = {};

  for (const file of files) {
    const category = basename(file, '.yml');
    const source = await readFile(path.join(DB_DIR, file), 'utf8');
    databases[category] = {
      category,
      file: path.join(DB_DIR, file),
      touched: false,
      data: parse(source) ?? {},
    };
    databases[category].data.commercial ??= [];
    databases[category].data.opensource ??= [];
  }

  return databases;
}

async function loadProductBlacklist(file) {
  try {
    const data = JSON.parse(await readFile(file, 'utf8'));
    const entries = Array.isArray(data) ? data : data.products;
    if (!Array.isArray(entries)) {
      throw new Error(`${file} must be a JSON array or an object with a products array.`);
    }
    return entries;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function matchesSelection(product, category) {
  if (!olderThan && !categories.size && !shopDomains.size && !nameRegexes.length) return true;

  return [
    olderThan ? productLastUpdated(product) < olderThan : true,
    categories.size ? categories.has(category) || categories.has(product.component_category) : true,
    shopDomains.size ? (product.shops ?? []).some((shop) => shopDomains.has(shopDomain(shop.url))) : true,
    nameRegexes.length ? nameRegexes.some((regex) => regex.test(productName(product))) : true,
  ].every(Boolean);
}

function validateProduct(product, kind, category) {
  const changes = [];
  const before = JSON.stringify(product);

  trimStringFields(product, productStringFields(kind));
  if (stripProductNameWords(product)) changes.push('strip-name-word');

  if (product.component_category !== category) {
    product.component_category = category;
    changes.push('fix-category');
  }

  if (product.component_sub_category !== slugify(product.component_sub_category ?? 'unknown')) {
    product.component_sub_category = slugify(product.component_sub_category ?? 'unknown');
    changes.push('slug-subcategory');
  }

  if (kind === 'commercial') {
    if (product.license !== 'Commercial') {
      product.license = 'Commercial';
      changes.push('fix-license');
    }

    if (!Array.isArray(product.shops)) {
      product.shops = [];
      changes.push('fix-shops-array');
    }

    const shopChanges = normalizeShops(product);
    changes.push(...shopChanges);
  }

  if (JSON.stringify(product) !== before) {
    product.last_updated = today;
    if (!changes.includes('touch-product')) changes.push('touch-product');
  }

  return unique(changes);
}

function normalizeShops(product) {
  const changes = [];
  const originalCount = product.shops.length;
  const deduped = new Map();

  for (const shop of product.shops) {
    trimStringFields(shop, ['name', 'region', 'currency', 'status', 'url', 'last_updated']);
    const before = JSON.stringify(shop);

    shop.name = shop.name?.toString() || null;
    shop.region = shop.region?.toString() || 'Unknown';
    shop.price = canonicalPrice(shop.price);
    shop.currency = shop.currency?.toString() || 'Unknown';
    shop.status = canonicalShopStatus(shop.status);
    shop.url = normalizeUrl(shop.url);

    if (JSON.stringify(shop) !== before) {
      shop.last_updated = today;
      changes.push('normalize-shop');
    }

    const key = shopKey(shop);
    const existing = deduped.get(key);
    if (!existing || shopScore(shop) > shopScore(existing)) deduped.set(key, shop);
  }

  product.shops = [...deduped.values()];
  if (product.shops.length !== originalCount) {
    changes.push('dedupe-shops');
    for (const shop of product.shops) shop.last_updated ??= today;
  }

  return changes;
}

function canonicalPrice(value) {
  if (value === undefined || value === null || value === '') return 'Unknown';
  if (value === 'Unknown') return 'Unknown';
  const number = Number(value);
  return Number.isFinite(number) ? number : 'Unknown';
}

function canonicalShopStatus(value) {
  const status = normalizeName(value).replace(/\s+/g, '-');
  if (status === 'eol' || status === 'discontinued') return 'eol';
  if (status === 'out-of-stock' || status === 'outofstock' || status === 'sold-out') return 'out-of-stock';
  return 'available';
}

function stripProductNameWords(product) {
  const productNameBefore = product.product_name;
  const projectNameBefore = product.project_name;
  if (product.product_name) product.product_name = stripBlacklistedNameWords(product.product_name, blacklist);
  if (product.project_name) product.project_name = stripBlacklistedNameWords(product.project_name, blacklist);
  return product.product_name !== productNameBefore || product.project_name !== projectNameBefore;
}

function isBlacklistedProduct(product, blacklist) {
  return blacklist.some((entry) => matchesBlacklistEntry(product, entry));
}

function stripBlacklistedNameWords(name, blacklist) {
  let value = normalizeSpaces(name);
  for (const word of blacklistedNameWords(blacklist)) {
    value = value.replace(nameWordPattern(word), ' ');
  }
  return normalizeSpaces(value);
}

function blacklistedNameWords(blacklist) {
  return blacklist.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    return entry.name_words ?? entry.nameWords ?? [];
  });
}

function nameWordPattern(word) {
  const phrase = word.toString().trim().split(/\s+/).map(escapeRegExp).join('\\s+');
  return new RegExp(`\\s*(?:[([{]\\s*)?${phrase}(?:\\s*[)\\]}])?\\s*`, 'gi');
}

function matchesBlacklistEntry(product, entry) {
  const text = normalizeName(
    [
      productName(product),
      product.product_url,
      product.project_url,
      product.component_category,
      product.component_sub_category,
      ...(product.shops ?? []).map((shop) => shop.url),
    ]
      .filter(Boolean)
      .join(' '),
  );
  const urls = productUrls(product).map(urlKey);

  if (typeof entry === 'string') {
    const needle = normalizeName(entry);
    return Boolean(needle && text.includes(needle));
  }

  if (!entry || typeof entry !== 'object') return false;
  if (!['name', 'url', 'category', 'match'].some((field) => entry[field])) return false;

  return [
    entry.name ? normalizeName(productName(product)).includes(normalizeName(entry.name)) : true,
    entry.url ? urls.some((url) => url === urlKey(entry.url) || url.includes(urlKey(entry.url))) : true,
    entry.category ? normalizeName(product.component_category).includes(normalizeName(entry.category)) : true,
    entry.match ? text.includes(normalizeName(entry.match)) : true,
  ].every(Boolean);
}

function productStringFields(kind) {
  return kind === 'commercial'
    ? ['product_name', 'description', 'manufacturer', 'component_category', 'component_sub_category', 'license', 'product_url', 'picture_url', 'last_updated']
    : ['project_name', 'description', 'maker', 'component_category', 'component_sub_category', 'license', 'project_url', 'picture_url', 'last_updated'];
}

function trimStringFields(object, fields) {
  for (const field of fields) {
    if (typeof object[field] === 'string') object[field] = object[field].trim();
  }
}

function productLastUpdated(product) {
  const productDate = normalizeDate(product.last_updated);
  const shopDates = (product.shops ?? []).map((shop) => normalizeDate(shop.last_updated)).filter(Boolean);
  return productDate || shopDates.sort().at(-1) || '0000-00-00';
}

function normalizeDate(value) {
  const date = value?.toString().trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function productName(product) {
  return product.product_name ?? product.project_name ?? '';
}

function productUrls(product) {
  return [product.product_url, product.project_url, ...(product.shops ?? []).map((shop) => shop.url)].filter(Boolean);
}

function shopKey(shop) {
  return shopDomain(shop.url) || urlKey(shop.url) || normalizeName(shop.name);
}

function shopScore(shop) {
  return ['name', 'region', 'price', 'currency', 'status', 'url', 'last_updated'].filter(
    (field) => shop[field] !== undefined && shop[field] !== null && shop[field] !== '',
  ).length;
}

function normalizeUrl(value) {
  const url = value?.toString().trim();
  if (!url || /^(null|n\/a|na|none|unknown|not found)$/i.test(url)) return null;
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

function urlKey(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|msclkid$|mc_cid$|mc_eid$|igshid$|ref$|referrer$)/i.test(key)) {
        parsed.searchParams.delete(key);
      }
    }
    return parsed.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return String(url).toLowerCase();
  }
}

function shopDomain(url) {
  if (!url) return '';
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return '';
  }
}

function normalizeDomain(value) {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

function normalizeName(value) {
  return (value ?? '')
    .toString()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSpaces(value) {
  return (value ?? '').toString().replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return (value ?? '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function unique(values) {
  return [...new Set(values)];
}

function countChange(change) {
  report.byChange[change] = (report.byChange[change] ?? 0) + 1;
}

function logChange(change, category, name) {
  if (!VERBOSE) return;
  console.log(`${change} | ${category} | ${name}`);
}

function printReport() {
  console.log(`${WRITE ? 'Write' : 'Dry run'} product validation`);
  console.log(`Selected: ${report.selected}`);
  console.log(`Purged: ${report.purged}`);
  console.log(`Updated: ${report.updated}`);
  console.log(`Unchanged: ${report.unchanged}`);
  console.log(`Skipped: ${report.skipped}`);
  const changes = Object.entries(report.byChange)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
  if (changes) console.log(`Changes: ${changes}`);
}

async function writeTouchedDatabases(databases) {
  for (const database of Object.values(databases)) {
    if (!database.touched) continue;
    await writeFile(database.file, stringify(database.data, { lineWidth: 92 }), 'utf8');
  }
}

async function runProductBuild() {
  const { stdout, stderr } = await execFileAsync('pnpm', ['products:build'], {
    cwd: ROOT,
    maxBuffer: 1024 * 1024 * 64,
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
}
