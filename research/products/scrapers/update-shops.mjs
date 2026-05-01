#!/usr/bin/env node
import { execFile, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const DEFAULT_SOURCE_FILE = path.join(ROOT, 'research/products/source.json');
const SCRAPER = path.join(ROOT, 'research/products/scrapers/generic-shop.mjs');
const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);
const write = args.includes('--write');
const build = args.includes('--build');
const fileArg = stringArg('--file');
const concurrency = numberArg('--concurrency') ?? 1;
const sourcesFromArgs = positionalSources();
const scraperArgs = passthroughArgs();

if (args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

const sources = uniqueSources([
  ...(fileArg || !sourcesFromArgs.length ? await readSourcesFromFile(fileArg ?? DEFAULT_SOURCE_FILE) : []),
  ...sourcesFromArgs,
]);

if (!sources.length) {
  console.error('No shop URLs found.');
  printUsage();
  process.exit(1);
}

console.log(`Updating ${sources.length} shop source${sources.length === 1 ? '' : 's'} (${write ? 'write' : 'dry-run'})`);

const failures = [];
await runQueue(sources, concurrency, async (source, index) => {
  const prefix = `[${index + 1}/${sources.length}]`;
  console.log(`${prefix} ${source.url}${source.method ? ` (${source.method})` : ''}`);

  try {
    await runScraper(source, scraperArgs);
  } catch (error) {
    failures.push({ source, error });
    console.error(`${prefix} failed: ${error.message}`);
  }
});

if (build) {
  console.log('Running product build...');
  const { stdout, stderr } = await execFileAsync('pnpm', ['products:build'], {
    cwd: ROOT,
    maxBuffer: 1024 * 1024 * 64,
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
}

if (failures.length) {
  console.error(`Failed ${failures.length} shop source${failures.length === 1 ? '' : 's'}:`);
  for (const failure of failures) {
    console.error(`- ${failure.source.url}: ${failure.error.message}`);
  }
  process.exit(1);
}

console.log(`Updated ${sources.length} shop source${sources.length === 1 ? '' : 's'}.`);

function printUsage() {
  console.log(`Usage:
  pnpm products:update-all -- [url ...] [--file research/products/source.json] [--write] [--build] [scraper flags]

Examples:
  pnpm products:update-all
  pnpm products:update-all -- --write --build
  pnpm products:update-all -- https://sim-lab.eu https://simagic.com --write --max-pages 20

Runner flags:
  --file <path>          JSON URL list file. Defaults to research/products/source.json when no URLs are given.
  --concurrency <n>      Number of shops to scrape at once. Defaults to 1.
  --build               Run pnpm products:build once after all shops.

Source JSON may be ["https://shop.example"] or [{"url":"https://shop.example","method":"custom"}].
Source methods: crawl, woocommerce, shopify, custom.

Other flags are passed through to generic-shop.mjs.`);
}

function stringArg(name) {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1] ?? null;
}

function numberArg(name) {
  const value = stringArg(name);
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function positionalSources() {
  const values = [];
  const takesValue = valueFlags();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (takesValue.has(args[index - 1])) continue;
    if (/^https?:\/\//i.test(arg)) values.push(sourceFromValue(arg));
  }

  return values;
}

function passthroughArgs() {
  const runnerFlags = new Set(['--file', '--concurrency', '--build', '--help', '-h']);
  const runnerFlagsWithValue = new Set(['--file', '--concurrency']);
  const values = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (/^https?:\/\//i.test(arg)) continue;
    if (runnerFlagsWithValue.has(arg)) {
      index += 1;
      continue;
    }
    if (runnerFlags.has(arg)) continue;
    values.push(arg);
  }

  return values;
}

function valueFlags() {
  return new Set([
    '--file',
    '--concurrency',
    '--limit',
    '--max-pages',
    '--threshold',
    '--shop-name',
    '--manufacturer',
    '--category',
    '--subcategory',
    '--region',
    '--map',
    '--method',
    '--blacklist',
  ]);
}

function runScraper(source, args) {
  return new Promise((resolve, reject) => {
    const childArgs = [SCRAPER, source.url, ...args];
    if (source.method && !args.includes('--method')) childArgs.push('--method', source.method);
    const child = spawn(process.execPath, childArgs, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.pipe(process.stdout, { end: false });
    child.stderr.pipe(process.stderr, { end: false });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(signal ? `scraper exited with signal ${signal}` : `scraper exited with code ${code}`));
    });
  });
}

async function readSourcesFromFile(file) {
  const text = await readFile(path.resolve(ROOT, file), 'utf8');
  if (file.endsWith('.json')) {
    const parsed = JSON.parse(text);
    const values = Array.isArray(parsed) ? parsed : parsed.urls;
    if (!Array.isArray(values)) {
      throw new Error(`${file} must be a JSON array of URLs or { url, method } objects.`);
    }

    return values.map(sourceFromValue).filter(Boolean);
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .map((line) => line.match(/^https?:\/\/\S+/i)?.[0])
    .filter(Boolean)
    .map(sourceFromValue);
}

function sourceFromValue(value) {
  if (typeof value === 'string') {
    return /^https?:\/\//i.test(value) ? { url: value.replace(/\/+$/, '') } : null;
  }

  if (!value || typeof value !== 'object' || typeof value.url !== 'string') return null;
  if (!/^https?:\/\//i.test(value.url)) return null;
  return {
    url: value.url.replace(/\/+$/, ''),
    ...(value.method ? { method: normalizeMethod(value.method) } : {}),
  };
}

function normalizeMethod(value) {
  const method = String(value).toLowerCase();
  if (method === 'else') return 'crawl';
  if (['crawl', 'woocommerce', 'shopify', 'custom'].includes(method)) return method;
  throw new Error(`Invalid source method: ${value}`);
}

function uniqueSources(values) {
  const byUrl = new Map();
  for (const source of values.filter(Boolean)) {
    byUrl.set(source.url, source);
  }
  return [...byUrl.values()];
}

async function runQueue(items, limit, worker) {
  let nextIndex = 0;

  async function runner() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
}
