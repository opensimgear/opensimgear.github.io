#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const requireFromProject = createRequire(pathToFileURL(join(root, 'package.json')));
const sharp = requireFromProject('sharp');

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg.startsWith('--')) {
    const next = process.argv[i + 1];
    if (!next || next.startsWith('--')) {
      args.set(arg, true);
    } else {
      args.set(arg, next);
      i += 1;
    }
  }
}

const sourcePrefix = args.get('--source-prefix');
const refreshAssets = args.has('--refresh-assets');
const dryRun = args.has('--dry-run');

if (!sourcePrefix || args.has('--help')) {
  console.log(`Usage:
  node ~/.codex/skills/opensimgear-product-import/scripts/pull-product-images.mjs \\
    --source-prefix research/products/commercial/flight-controls/

Options:
  --source-prefix <path>  Required. Only products with matching source_file are processed.
  --refresh-assets       Re-download even when the local asset already exists.
  --dry-run              Count matching records without writing files.
`);
  process.exit(sourcePrefix ? 0 : 1);
}

const dataPath = join(root, 'src/data/3rdparty-products.json');
const assetDir = join(root, 'src/assets/products');
const imageMapPath = join(root, 'src/data/3rdparty-product-images.ts');
const maxWidth = 720;
const maxHeight = 540;
const concurrency = 8;
const timeoutMs = 20_000;
const userAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';

function fileBase(id) {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function importName(index, product) {
  return `productImage${index}_${fileBase(product.id).replace(/-/g, '_')}`;
}

function sourceUrlFor(product) {
  return (
    product.image?.source_url ??
    product.image?.sourceUrl ??
    product.url ??
    product.urls?.official ??
    product.urls?.repo ??
    product.urls?.docs ??
    product.homepage ??
    product.repository ??
    'https://opensimgear.com/'
  );
}

async function fetchBuffer(url, sourceUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        referer: sourceUrl,
        'user-agent': userAgent,
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  } catch {
    const { stdout } = await execFileAsync(
      '/usr/bin/curl',
      [
        '--fail',
        '--location',
        '--insecure',
        '--silent',
        '--show-error',
        '--max-time',
        String(Math.ceil(timeoutMs / 1000)),
        '--user-agent',
        userAgent,
        '--header',
        'Accept: image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8',
        '--referer',
        sourceUrl,
        url,
      ],
      {
        encoding: 'buffer',
        maxBuffer: 25_000_000,
      }
    );

    return Buffer.from(stdout);
  } finally {
    clearTimeout(timeout);
  }
}

async function writeProductAsset(product) {
  const imageUrl = product.image?.url;
  if (!imageUrl) throw new Error(`Missing image.url for ${product.id}`);

  const filename = `${fileBase(product.id)}.webp`;
  const assetPath = join(assetDir, filename);
  const asset = `src/assets/products/${filename}`;

  if (!refreshAssets && existsSync(assetPath)) {
    const metadata = await sharp(assetPath).metadata();
    if (metadata.width && metadata.height) {
      return {
        asset,
        width: metadata.width,
        height: metadata.height,
        format: 'webp',
      };
    }
  }

  const input = await fetchBuffer(imageUrl, sourceUrlFor(product));
  const output = await sharp(input)
    .resize({
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();

  await writeFile(assetPath, output);
  const metadata = await sharp(output).metadata();

  return {
    asset,
    width: metadata.width,
    height: metadata.height,
    format: 'webp',
  };
}

function regenerateImageMap(products) {
  const withAssets = products.filter((product) => product.image?.asset);
  const imports = withAssets.map((product, index) => {
    const variable = importName(index, product);
    const assetName = basename(product.image.asset);
    return `import ${variable} from '~/assets/products/${assetName}';`;
  });

  const entries = withAssets.map((product, index) => `  '${product.id}': ${importName(index, product)},`);

  return `import type { ImageMetadata } from 'astro';
${imports.join('\n')}

export const productImages: Record<string, ImageMetadata> = {
${entries.join('\n')}
};

export type ProductImageId = keyof typeof productImages;
`;
}

async function runPool(items, worker) {
  let cursor = 0;
  let failed = 0;

  async function next() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const product = items[index];

      try {
        await worker(product, index);
      } catch (error) {
        failed += 1;
        console.error(`[failed] ${product.id}: ${error.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  return failed;
}

const data = JSON.parse(await readFile(dataPath, 'utf8'));
const products = data.products ?? [];
const targets = products.filter((product) => product.source_file?.startsWith(sourcePrefix));

console.log(`Matched ${targets.length} product(s) with source_file prefix ${sourcePrefix}`);

if (dryRun) process.exit(0);
if (targets.length === 0) process.exit(0);

await mkdir(assetDir, { recursive: true });

const failed = await runPool(targets, async (product, index) => {
  const image = await writeProductAsset(product);
  product.image = {
    ...product.image,
    ...image,
  };
  console.log(`[${index + 1}/${targets.length}] ${product.id}`);
});

await writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);
await writeFile(imageMapPath, regenerateImageMap(products));

console.log(`Done. downloaded=${targets.length - failed} failed=${failed}`);
if (failed > 0) process.exitCode = 1;
