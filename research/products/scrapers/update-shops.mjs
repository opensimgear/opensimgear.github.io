#!/usr/bin/env node
import { execFile } from 'node:child_process';
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
const urlsFromArgs = positionalUrls();
const scraperArgs = passthroughArgs();

if (args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

const urls = uniqueUrls([
  ...(fileArg || !urlsFromArgs.length ? await readUrlsFromFile(fileArg ?? DEFAULT_SOURCE_FILE) : []),
  ...urlsFromArgs,
]);

if (!urls.length) {
  console.error('No shop URLs found.');
  printUsage();
  process.exit(1);
}

console.log(`Updating ${urls.length} shop source${urls.length === 1 ? '' : 's'} (${write ? 'write' : 'dry-run'})`);

const failures = [];
await runQueue(urls, concurrency, async (url, index) => {
  const prefix = `[${index + 1}/${urls.length}]`;
  console.log(`${prefix} ${url}`);

  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [SCRAPER, url, ...scraperArgs], {
      cwd: ROOT,
      maxBuffer: 1024 * 1024 * 64,
    });
    if (stdout.trim()) console.log(stdout.trim());
    if (stderr.trim()) console.error(stderr.trim());
  } catch (error) {
    failures.push({ url, error });
    console.error(`${prefix} failed: ${error.message}`);
    if (error.stdout?.trim()) console.log(error.stdout.trim());
    if (error.stderr?.trim()) console.error(error.stderr.trim());
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
    console.error(`- ${failure.url}: ${failure.error.message}`);
  }
  process.exit(1);
}

console.log(`Updated ${urls.length} shop source${urls.length === 1 ? '' : 's'}.`);

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

function positionalUrls() {
  const values = [];
  const takesValue = new Set(['--file', '--concurrency', '--limit', '--max-pages', '--threshold', '--shop-name', '--manufacturer', '--category', '--subcategory', '--region', '--map']);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (takesValue.has(args[index - 1])) continue;
    if (/^https?:\/\//i.test(arg)) values.push(arg);
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

async function readUrlsFromFile(file) {
  const text = await readFile(path.resolve(ROOT, file), 'utf8');
  if (file.endsWith('.json')) {
    const parsed = JSON.parse(text);
    const urls = Array.isArray(parsed) ? parsed : parsed.urls;
    if (!Array.isArray(urls)) {
      throw new Error(`${file} must be a JSON array of URLs.`);
    }

    return urls.filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url));
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .map((line) => line.match(/^https?:\/\/\S+/i)?.[0])
    .filter(Boolean);
}

function uniqueUrls(values) {
  return [...new Set(values.map((value) => value.replace(/\/+$/, '')))];
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
