export function isFanatecShop(base) {
  return base.hostname.toLowerCase().endsWith('fanatec.com');
}

export function fanatecShopName(base) {
  return isFanatecShop(base) ? 'Fanatec' : null;
}

export function inferFanatecRegion(base) {
  if (!isFanatecShop(base)) return null;
  const region = base.pathname.toLowerCase().split('/').filter(Boolean)[0];
  const regions = {
    au: 'AU',
    ca: 'Canada',
    eu: 'EU',
    jp: 'Japan',
    us: 'US',
  };
  return regions[region] ?? 'EU';
}

export async function scrapeFanatec(
  base,
  { fetchText, isUsefulShopProduct, parseGenericProduct, maxProducts = 50, verbose = () => {} },
) {
  const region = fanatecRegionCode(base);
  const sitemapUrl = new URL(`/${region}-sitemap-products-1.xml`, base).toString();
  verbose(`  fetch Fanatec product sitemap: ${sitemapUrl}`);

  const sitemap = await fetchText(sitemapUrl);
  const urls = productUrlsFromSitemap(sitemap, region).slice(0, maxProducts);
  const products = [];
  verbose(`  Fanatec product URLs: ${urls.length}`);

  for (const url of urls) {
    try {
      verbose(`  fetch Fanatec product: ${url}`);
      const html = await fetchText(url);
      const product = parseGenericProduct(html, url);
      if (product && isUsefulShopProduct(product)) {
        products.push(product);
      }
    } catch (error) {
      verbose(`    Fanatec product failed: ${error.message}`);
    }
  }

  return products;
}

function fanatecRegionCode(base) {
  const region = base.pathname.toLowerCase().split('/').filter(Boolean)[0];
  return ['au', 'ca', 'eu', 'jp', 'us'].includes(region) ? region : 'eu';
}

function productUrlsFromSitemap(sitemap, region) {
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => decodeXml(match[1]))
    .filter((url) => url.includes(`/${region}/en/p/`))
    .filter(isSimulatorProductUrl);

  return [...new Set(urls)];
}

function isSimulatorProductUrl(url) {
  return /\/p\/(sim-racing-accessories|steering-wheels|wheel-bases|wheel-rims|pedals|cockpits|sim-racing-bundles|shifters|handbrakes)\//i.test(
    url,
  );
}

function decodeXml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
