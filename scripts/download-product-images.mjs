import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { basename } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const dataPath = new URL('../src/data/3rdparty-products.json', import.meta.url);
const assetDir = new URL('../src/assets/products/', import.meta.url);
const imageMapPath = new URL('../src/data/3rdparty-product-images.ts', import.meta.url);
const MAX_WIDTH = 720;
const MAX_HEIGHT = 540;
const CONCURRENCY = 8;
const TIMEOUT_MS = 20000;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';
const execFileAsync = promisify(execFile);
const refreshAssets = process.argv.includes('--refresh-assets');

const manualBackfills = {
  'commercial:button-boxes-and-panels:logitech-flight-multi-panel': {
    url: 'https://resource.logitechg.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/flight-multi-panel/flight-multi-panel-gallery-1.png',
    source_url: 'https://www.logitechg.com/en-us/products/flight/flight-simulator-autopilot-multipanel.html',
    source_type: 'official',
  },
  'commercial:button-boxes-and-panels:logitech-flight-radio-panel': {
    url: 'https://resource.logitechg.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/flight-radio-panel/flight-radio-panel-gallery-1.png',
    source_url: 'https://www.logitechg.com/en-us/products/flight/flight-simulator-cockpit-radio-panel.html',
    source_type: 'official',
  },
  'commercial:button-boxes-and-panels:logitech-flight-switch-panel': {
    url: 'https://resource.logitechg.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/products/gaming/flight/flight-sim-switch-panel/945-000030/flight-sim-switch-panel6.png',
    source_url: 'https://www.logitechg.com/en-us/products/flight/flight-simulator-switch-panel.html',
    source_type: 'official',
  },
  'commercial:collectives:digital-reality-helicopter-collective-twist-throttle': {
    url: 'https://simulationdevices.com/images/944_Helicopter_simulator_collective.JPG',
    source_url: 'https://www.simulationdevices.com/collective.html',
    source_type: 'official',
  },
  'commercial:display-systems:trak-racer-freestanding-triple-monitor-stand-45': {
    url: 'https://trakracer.com/cdn/shop/files/MS-CM-SIN-TR2_06_81ed3728-9855-47ba-9ab6-e9c8f617e571_1200x1200.png?v=1746416521',
    source_url: 'https://trakracer.com/products/floor-triple-monitor-stand',
    source_type: 'official',
  },
  'commercial:joysticks:logitech-extreme-3d-pro': {
    url: 'https://resource.logitechg.com/w_1440,h_810,ar_16:9,c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/xtreme-3d-pro-joystick/2025/extreme-3d-pro-joystick-intro.jpg',
    source_url: 'https://www.logitechg.com/en-us/shop/p/extreme-3d-pro-joystick',
    source_type: 'official',
  },
  'commercial:pedals:asetek-invicta-thorp-ii': {
    url: 'https://www.asetek.com/simsports/us/wp-content/uploads/sites/2/2025/01/Invicta-Pedals-THORP-II-Close-up-2_NoBG.png',
    source_url: 'https://www.asetek.com/simsports/us/product/invicta-pedals-thorp-2/',
    source_type: 'official',
  },
  'commercial:pedals:logitech-pro-racing-pedals': {
    url: 'https://resource.logitechg.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/pro-racing/pro-racing-pedals/gallery/gallery-1-pedals.png',
    source_url: 'https://www.logitechg.com/en-us/products/driving/pro-racing-pedals.html',
    source_type: 'official',
  },
  'commercial:pedals:logitech-rs-pedals': {
    url: 'https://resource.logitechg.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/rs-pedals/gallery/gaming-rs-pedals-black-gallery-1-new.png',
    source_url: 'https://www.logitechg.com/en-hk/products/driving/rs-pedals.html',
    source_type: 'official',
  },
  'commercial:rigs-and-cockpits:trak-racer-tr80-mk5': {
    url: 'https://trakracer.eu/cdn/shop/files/19003e_shopify-min_900x.png?v=1648075378',
    source_url: 'https://trakracer.eu/products/tr80-racing-simulator-mk5',
    source_type: 'official',
  },
  'commercial:rudder-pedals:logitech-flight-sim-rudder-pedals': {
    url: 'https://resource.logitechg.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/flight-rudder-pedals/flight-rudder-pedals-gallery-1.png',
    source_url: 'https://www.logitechg.com/en-us/products/flight/flight-simulator-rudder-pedals.html',
    source_type: 'official',
  },
  'commercial:shifters:logitech-driving-force-shifter': {
    url: 'https://resource.logitechg.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/driving-force-shifter/shifter-gallery-1.png',
    source_url: 'https://www.logitechg.com/en-us/products/driving/driving-force-shifter.html',
    source_type: 'official',
  },
  'commercial:tactile-feedback:dayton-audio-tt25-8-puck': {
    url: 'https://www.daytonaudio.com/images/product/medium/1104.jpg',
    source_url: 'https://www.daytonaudio.com/product/1104/tt25-8-puck-tactile-transducer-mini-bass-shaker',
    source_type: 'official',
  },
  'commercial:throttles:logitech-flight-throttle-quadrant': {
    url: 'https://resource.logitechg.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/flight-throttle-quadrant/throttle-gallery-1.png',
    source_url: 'https://www.logitechg.com/en-us/products/flight/flight-simulator-throttle-quadrant.html',
    source_type: 'official',
  },
  'commercial:vr-and-head-tracking:meta-quest-3-512gb': {
    url: 'https://cdn.mos.cms.futurecdn.net/m2PdBpqN7Mtfr23zxqPK2E.jpg',
    source_url: 'https://www.androidcentral.com/gaming/virtual-reality/meta-quest-3-review',
    source_type: 'source',
  },
  'commercial:wheel-bases:asetek-invicta-27nm': {
    url: 'https://www.asetek.com/simsports/us/wp-content/uploads/sites/2/2024/05/Invicta-Wheelbase-Front-Right-Raised-Orange-LED_NoBG.png',
    source_url: 'https://www.asetek.com/simsports/us/product/invicta-direct-drive-wheelbase-27nm/',
    source_type: 'official',
  },
  'commercial:wheel-bases:fanatec-gt-dd-pro-8nm-qr2': {
    url: 'https://assets.fanatec.com/image/upload/c_fill,q_auto,h_1024,w_1024,f_auto/products/Wheel-Bases/CRD-9020006/CRD-9020006_01.webp',
    source_url: 'https://www.fanatec.com/us/en/p/wheel-bases/crd-9020006-us/gran-turismo-dd-pro-wheel-base-qr2-us',
    source_type: 'official',
  },
  'commercial:wheel-bases:logitech-pro-dd11': {
    url: 'https://resource.logitechg.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/pro-racing/pro-racing-wheel/2024-updates/pro-racing-base-ps-gallery1.png',
    source_url: 'https://www.logitechg.com/en-us/products/driving/pro-dd11-base.html',
    source_type: 'official',
  },
  'commercial:wheel-bases:logitech-rs50-base': {
    url: 'https://resource.logitechg.com/w_416,h_312,ar_4:3,c_pad,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/rs50-base-pdp/gallery/rs50-base-wheel-hub-front-angle-gallery-1.png',
    source_url: 'https://www.logitechg.com/en-eu/products/driving/rs50-base.html',
    source_type: 'official',
  },
  'commercial:wheel-bases:moza-r5': {
    url: 'https://mozaracing.com/cdn/shop/files/R5_fd53ca42-18cd-480a-a4a7-b8dca179d5dc.png?v=1753256093',
    source_url: 'https://mozaracing.com/products/r5-racing-bundle',
    source_type: 'official',
  },
  'commercial:yokes:logitech-flight-yoke-system': {
    url: 'https://resource.logitechg.com/c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/flight-yoke-system/yoke-gallery-1.png',
    source_url: 'https://www.logitechg.com/en-us/products/flight/flight-simulator-yoke-system.html',
    source_type: 'official',
  },
  'opensource:motion-platforms:bjoes-stewart-platform-6dof': {
    url: 'https://github.com/Bjoes/Stewart-platform-6DOF/assets/79850208/ee65c17e-6068-451a-889e-bb3d4af36408',
    source_url: 'https://github.com/Bjoes/Stewart-platform-6DOF',
    source_type: 'repo',
  },
  'opensource:motion-platforms:flypt-mover': {
    url: 'https://opengraph.githubassets.com/1/FlyPTMover/Releases',
    source_url: 'https://github.com/FlyPTMover/Releases',
    source_type: 'repo',
  },
  'opensource:vr-and-head-tracking:project-north-star': {
    url: 'https://raw.githubusercontent.com/leapmotion/ProjectNorthStar/master/Mechanical/imgs/hero-north-star-release.jpg',
    source_url: 'https://github.com/leapmotion/ProjectNorthStar',
    source_type: 'repo',
  },
  'opensource:steering-wheels:pico-wheel': {
    url: 'https://github.com/khui0/pico-wheel/assets/101839505/29395627-e298-49d1-adba-7828c009001b',
    source_url: 'https://github.com/khui0/pico-wheel',
    source_type: 'repo',
  },
};

function fileBase(id) {
  return id
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function fetchBuffer(url, sourceUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        referer: sourceUrl,
        'user-agent': USER_AGENT,
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
        String(Math.ceil(TIMEOUT_MS / 1000)),
        '--user-agent',
        USER_AGENT,
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
  const backfill = manualBackfills[product.id];
  let sourceImage = backfill ?? product.image;
  if (!sourceImage?.url) {
    throw new Error(`Missing image source for ${product.id}`);
  }

  const filename = `${fileBase(product.id)}.webp`;
  const assetUrl = new URL(filename, assetDir);
  const sourceUrl =
    sourceImage.source_url ?? sourceImage.sourceUrl ?? product.urls.official ?? product.urls.repo ?? product.urls.docs;

  if (!refreshAssets) {
    try {
      const metadata = await sharp(assetUrl).metadata();
      if (metadata.width && metadata.height) {
        return {
          url: sourceImage.url,
          asset: `src/assets/products/${filename}`,
          alt: sourceImage.alt ?? `${product.title || product.name} product photo`,
          source_url: sourceUrl,
          source_type: sourceImage.source_type ?? sourceImage.sourceType ?? 'source',
          width: metadata.width,
          height: metadata.height,
          format: 'webp',
        };
      }
    } catch {
      // Asset missing or unreadable: download it below.
    }
  }

  let buffer;
  try {
    buffer = await fetchBuffer(sourceImage.url, sourceUrl);
  } catch (error) {
    const repoFallback = githubOpenGraphFallback(sourceUrl);
    if (!repoFallback) throw error;

    sourceImage = {
      ...sourceImage,
      url: repoFallback,
      source_type: 'repo',
    };
    buffer = await fetchBuffer(sourceImage.url, sourceUrl);
  }
  const output = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer({ resolveWithObject: true });

  await writeFile(assetUrl, output.data);

  return {
    url: sourceImage.url,
    asset: `src/assets/products/${filename}`,
    alt: sourceImage.alt ?? `${product.title || product.name} product photo`,
    source_url: sourceUrl,
    source_type: sourceImage.source_type ?? sourceImage.sourceType ?? 'source',
    width: output.info.width,
    height: output.info.height,
    format: 'webp',
  };
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

async function runQueue(items, worker) {
  const results = Array(items.length);
  let next = 0;

  async function runner() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, runner));
  return results;
}

function importName(id, index) {
  return `productImage${index}_${fileBase(id).replaceAll('-', '_')}`;
}

async function writeImageMap(products) {
  const imports = [];
  const entries = [];

  products.forEach((product, index) => {
    const name = importName(product.id, index);
    const assetPath = product.image.asset.replace(/^src\/assets\//, '~/assets/');
    imports.push(`import ${name} from '${assetPath}';`);
    entries.push(`  ${JSON.stringify(product.id)}: ${name},`);
  });

  await writeFile(
    imageMapPath,
    `${imports.join('\n')}\n\nimport type { ImageMetadata } from 'astro';\n\nexport const productImages: Record<string, ImageMetadata> = {\n${entries.join('\n')}\n};\n`
  );
}

const database = JSON.parse(await readFile(dataPath, 'utf8'));

if (refreshAssets) {
  await rm(assetDir, { recursive: true, force: true });
}
await mkdir(assetDir, { recursive: true });

let completed = 0;
const images = await runQueue(database.products, async (product) => {
  const image = await writeProductAsset(product);
  completed += 1;
  console.log(`${completed}/${database.products.length} ${basename(image.asset)}`);
  return image;
});

database.products = database.products.map((product, index) => ({
  ...product,
  image: images[index],
}));

await writeFile(dataPath, `${JSON.stringify(database, null, 2)}\n`);
await writeImageMap(database.products);

console.log(`done. assets=${database.products.length}`);
