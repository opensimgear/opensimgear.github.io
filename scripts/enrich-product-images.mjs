import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const dataPath = new URL('../src/data/3rdparty-products.json', import.meta.url);
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';
const TIMEOUT_MS = 12000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_IMAGE_BYTES = 8_000_000;
const CONCURRENCY = 8;

const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif']);
const weakImagePattern =
  /logo|icon|favicon|sprite|placeholder|avatar|profile|banner|payment|paypal|klarna|visa|mastercard|amex|trust|badge|flag|loading|spinner|pixel|tracking|social|share|apple-touch/i;
const strongImagePattern = /product|hero|main|gallery|media|photo|image|jpg|jpeg|png|webp|avif|render|build|kit|pedal|wheel|base|shifter|handbrake|joystick|throttle|collective|yoke|seat|rig|cockpit|tension|motion|button|panel|vr|tracker|headset|display|wind/i;

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function decodeHtml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function normalizeUrl(value, baseUrl) {
  if (!value || /^(data|blob|javascript):/i.test(value)) return null;
  const cleanValue = decodeHtml(value).trim();
  if (!cleanValue || cleanValue.startsWith('#')) return null;

  try {
    const url = new URL(cleanValue, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;

    if (url.hostname === 'github.com' && url.pathname.includes('/blob/')) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 5) {
        const [owner, repo, , branch, ...pathParts] = parts;
        return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${pathParts.join('/')}`;
      }
    }

    return url.href;
  } catch {
    return null;
  }
}

function extensionOf(url) {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split('.').pop()?.toLowerCase() ?? '';
  } catch {
    return '';
  }
}

function isDirectImageUrl(url) {
  return imageExtensions.has(extensionOf(url));
}

function sourceUrls(product) {
  return [
    { url: product.urls.official, type: 'official', rank: 4 },
    { url: product.urls.repo, type: 'repo', rank: 3 },
    { url: product.urls.docs, type: 'docs', rank: 3 },
    ...(product.urls.sources ?? []).map((url) => ({ url, type: 'source', rank: 2 })),
  ]
    .filter((source) => isHttpUrl(source.url))
    .filter((source, index, sources) => sources.findIndex((candidate) => candidate.url === source.url) === index);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'user-agent': USER_AGENT,
        ...(options.headers ?? {}),
      },
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function responseBuffer(response, maxBytes) {
  const reader = response.body?.getReader();
  if (!reader) return Buffer.alloc(0);

  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) break;
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks);
}

async function fetchHtml(url) {
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) return null;

    const buffer = await responseBuffer(response, MAX_HTML_BYTES);
    return buffer.toString('utf8');
  } catch {
    return null;
  }
}

function attributeMap(tag) {
  const attrs = {};
  const pattern = /([:@\w.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    attrs[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

function srcsetFirst(value) {
  return value
    ?.split(',')
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .find(Boolean);
}

function extractMetaImages(html, baseUrl, source) {
  const candidates = [];

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributeMap(match[0]);
    const key = (attrs.property ?? attrs.name ?? attrs.itemprop ?? '').toLowerCase();
    if (!/^(og:image|og:image:secure_url|twitter:image|twitter:image:src|image|thumbnail|thumbnailurl|thing:thumbnail)$/.test(key)) {
      continue;
    }

    const imageUrl = normalizeUrl(attrs.content, baseUrl);
    if (imageUrl) {
      candidates.push({
        url: imageUrl,
        sourceUrl: source.url,
        sourceType: source.type,
        role: 'meta',
        alt: attrs.alt ?? '',
        sourceRank: source.rank,
      });
    }
  }

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributeMap(match[0]);
    const rel = (attrs.rel ?? '').toLowerCase();
    if (!/\b(image_src|preload)\b/.test(rel) && attrs.as !== 'image') continue;

    const imageUrl = normalizeUrl(attrs.href, baseUrl);
    if (imageUrl) {
      candidates.push({
        url: imageUrl,
        sourceUrl: source.url,
        sourceType: source.type,
        role: 'link',
        alt: '',
        sourceRank: source.rank,
      });
    }
  }

  return candidates;
}

function extractJsonLdImages(html, baseUrl, source) {
  const candidates = [];

  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const jsonText = match[1].trim();
    if (!jsonText) continue;

    try {
      const parsed = JSON.parse(jsonText);
      for (const imageUrl of jsonLdImageUrls(parsed)) {
        const url = normalizeUrl(imageUrl, baseUrl);
        if (url) {
          candidates.push({
            url,
            sourceUrl: source.url,
            sourceType: source.type,
            role: 'jsonld',
            alt: '',
            sourceRank: source.rank,
          });
        }
      }
    } catch {
      for (const match of jsonText.matchAll(/"image"\s*:\s*"([^"]+)"/gi)) {
        const url = normalizeUrl(match[1], baseUrl);
        if (url) {
          candidates.push({
            url,
            sourceUrl: source.url,
            sourceType: source.type,
            role: 'jsonld',
            alt: '',
            sourceRank: source.rank,
          });
        }
      }
    }
  }

  return candidates;
}

function jsonLdImageUrls(value) {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(jsonLdImageUrls);
  if (typeof value !== 'object') return [];

  return [
    ...jsonLdImageUrls(value.image),
    ...jsonLdImageUrls(value.thumbnailUrl),
    ...jsonLdImageUrls(value.primaryImageOfPage),
    ...jsonLdImageUrls(value.url && /image/i.test(value['@type'] ?? '') ? value.url : null),
    ...Object.values(value).flatMap((item) => {
      if (item === value.image || item === value.thumbnailUrl || item === value.primaryImageOfPage) return [];
      if (typeof item !== 'object') return [];
      return jsonLdImageUrls(item);
    }),
  ];
}

function extractImgTags(html, baseUrl, source) {
  const candidates = [];

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = attributeMap(match[0]);
    const src =
      attrs.src ??
      attrs['data-src'] ??
      attrs['data-lazy-src'] ??
      attrs['data-original'] ??
      attrs['data-zoom-image'] ??
      srcsetFirst(attrs.srcset) ??
      srcsetFirst(attrs['data-srcset']);
    const imageUrl = normalizeUrl(src, baseUrl);
    if (!imageUrl) continue;

    candidates.push({
      url: imageUrl,
      sourceUrl: source.url,
      sourceType: source.type,
      role: 'img',
      alt: attrs.alt ?? attrs.title ?? '',
      sourceRank: source.rank,
      widthHint: Number.parseInt(attrs.width ?? '', 10) || null,
      heightHint: Number.parseInt(attrs.height ?? '', 10) || null,
    });
  }

  for (const match of html.matchAll(/url\((["']?)([^"')]+)\1\)/gi)) {
    const imageUrl = normalizeUrl(match[2], baseUrl);
    if (!imageUrl) continue;

    candidates.push({
      url: imageUrl,
      sourceUrl: source.url,
      sourceType: source.type,
      role: 'css',
      alt: '',
      sourceRank: source.rank,
    });
  }

  return candidates;
}

function productTokens(product) {
  const words = [
    product.name,
    product.title,
    product.organization.display,
    product.organization.manufacturer,
    product.organization.maintainer_or_org,
    product.component_category,
    product.subcategory,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !['the', 'and', 'with', 'for', 'sim', 'pro'].includes(word));

  return [...new Set(words)];
}

function candidateScore(candidate, product) {
  const haystack = `${candidate.url} ${candidate.alt}`.toLowerCase();
  const tokens = productTokens(product);
  const tokenHits = tokens.filter((token) => haystack.includes(token)).length;
  const ext = extensionOf(candidate.url);
  const aspect =
    candidate.width && candidate.height && candidate.height > 0 ? candidate.width / candidate.height : null;

  let score = candidate.sourceRank * 12 + tokenHits * 8;

  if (candidate.role === 'jsonld') score += 35;
  if (candidate.role === 'meta') score += 30;
  if (candidate.role === 'link') score += 20;
  if (candidate.role === 'img') score += 14;
  if (candidate.role === 'direct') score += 35;
  if (strongImagePattern.test(haystack)) score += 10;
  if (imageExtensions.has(ext)) score += 8;
  if (candidate.widthHint && candidate.heightHint) score += Math.min(candidate.widthHint, candidate.heightHint) >= 300 ? 12 : -6;
  if (candidate.width && candidate.height) {
    if (candidate.width >= 500 && candidate.height >= 350) score += 26;
    if (candidate.width >= 900 && candidate.height >= 600) score += 12;
    if (aspect && aspect >= 0.45 && aspect <= 2.7) score += 14;
    if (candidate.width < 220 || candidate.height < 160) score -= 45;
  }

  if (weakImagePattern.test(haystack)) score -= 55;
  if (/\.svg(?:$|\?)/i.test(candidate.url)) score -= 65;
  if (/\.gif(?:$|\?)/i.test(candidate.url)) score -= 20;
  if (/youtube\.com|youtu\.be|img\.youtube\.com/i.test(candidate.url)) score -= 12;
  if (/opengraph\.githubassets\.com|github\.com\/[^/]+\.png/i.test(candidate.url)) score -= 18;

  return score;
}

async function validateImage(candidate) {
  try {
    const response = await fetchWithTimeout(candidate.url, {
      headers: {
        accept: 'image/avif,image/webp,image/png,image/jpeg,*/*;q=0.7',
      },
    });
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') ?? '';
    if (!/^image\//i.test(contentType) && !isDirectImageUrl(response.url)) return null;

    const buffer = await responseBuffer(response, MAX_IMAGE_BYTES);
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return null;

    const metadata = await sharp(buffer, { failOn: 'none' }).metadata();
    if (!metadata.width || !metadata.height) return null;

    return {
      ...candidate,
      url: response.url,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format ?? null,
      byteLength: buffer.length,
    };
  } catch {
    return null;
  }
}

function youtubeThumbnail(url) {
  try {
    const parsed = new URL(url);
    let id = null;
    if (parsed.hostname.includes('youtu.be')) id = parsed.pathname.slice(1);
    if (parsed.hostname.includes('youtube.com')) id = parsed.searchParams.get('v');
    if (!id) return null;
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  } catch {
    return null;
  }
}

async function candidatesForSource(source) {
  const candidates = [];

  if (isDirectImageUrl(source.url)) {
    candidates.push({
      url: source.url,
      sourceUrl: source.url,
      sourceType: source.type,
      role: 'direct',
      alt: '',
      sourceRank: source.rank,
    });
  }

  const thumbnail = youtubeThumbnail(source.url);
  if (thumbnail) {
    candidates.push({
      url: thumbnail,
      sourceUrl: source.url,
      sourceType: source.type,
      role: 'youtube',
      alt: '',
      sourceRank: source.rank,
    });
  }

  const html = await fetchHtml(source.url);
  if (!html) return candidates;

  return [
    ...candidates,
    ...extractJsonLdImages(html, source.url, source),
    ...extractMetaImages(html, source.url, source),
    ...extractImgTags(html, source.url, source),
  ];
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  const deduped = [];

  for (const candidate of candidates) {
    const key = candidate.url.replace(/([?&])(width|height|w|h|format|fit|crop)=\d+/gi, '$1');
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

function imageRecord(candidate, product) {
  return {
    url: candidate.url,
    alt: `${product.title || product.name} product photo`,
    source_url: candidate.sourceUrl,
    source_type: candidate.sourceType,
    width: candidate.width,
    height: candidate.height,
    format: candidate.format,
  };
}

async function enrichProduct(product) {
  const sources = sourceUrls(product);
  const candidates = [];

  for (const source of sources.slice(0, 5)) {
    candidates.push(...(await candidatesForSource(source)));
  }

  const ranked = dedupeCandidates(candidates)
    .filter((candidate) => !/\.svg(?:$|\?)/i.test(candidate.url))
    .sort((a, b) => candidateScore(b, product) - candidateScore(a, product));

  for (const candidate of ranked.slice(0, 10)) {
    const validated = await validateImage(candidate);
    if (!validated) continue;

    const scored = { ...validated, score: candidateScore(validated, product) };
    if (scored.score < 0) continue;
    return imageRecord(scored, product);
  }

  return null;
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

const database = JSON.parse(await readFile(dataPath, 'utf8'));
let completed = 0;

const images = await runQueue(database.products, async (product) => {
  const image = await enrichProduct(product);
  completed += 1;
  const marker = image ? 'ok' : 'miss';
  console.log(`${completed}/${database.products.length} ${marker} ${product.id}`);
  return image;
});

let missing = 0;
database.products = database.products.map((product, index) => {
  const image = images[index];
  if (!image) missing += 1;
  return {
    ...product,
    image,
  };
});

await writeFile(dataPath, `${JSON.stringify(database, null, 2)}\n`);
console.log(`done. images=${database.products.length - missing}, missing=${missing}`);
