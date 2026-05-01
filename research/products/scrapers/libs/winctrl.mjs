export function winCtrlShopName(base) {
  return isWinCtrl(base) ? 'WINCTRL' : null;
}

export function inferWinCtrlRegion(base) {
  if (!isWinCtrl(base)) return null;
  const host = base.hostname.toLowerCase().replace(/^www\./, '');
  const labels = host.split('.');
  return labels.includes('ea') ? 'US' : null;
}

export async function scrapeWinCtrl(
  base,
  { fetchWithRetry, requestHeaders, isUsefulShopProduct, verbose = () => {} },
) {
  if (!isWinCtrl(base)) return [];

  const endpoint = new URL('/home/list/get', base);
  verbose(`  fetch WinCtrl API: ${endpoint}`);
  const response = await fetchWithRetry(endpoint, {
    headers: {
      ...requestHeaders('application/json,text/plain,*/*'),
      language: 'en',
    },
  });
  if (!response.ok) return [];

  const data = await response.json();
  const categoryById = new Map(
    (data.data?.category ?? []).map((category) => [
      Number(category.id),
      cleanText(category.name || category.title),
    ]),
  );
  const products = data.data?.list ?? [];

  return products
    .map((product) => {
      const category = categoryById.get(Number(product.category_id));
      return {
        name: cleanText(product.title),
        url: new URL(`/view/goods-details.html?id=${product.id}`, base).toString(),
        image: absolutizeUrl(product.pics?.[0], base),
        price: usablePrice(product.price),
        currency: currencyFromSymbol(product.currency_unit),
        description: cleanText(product.description),
        categories: [category, product.goods_no, product.dis_goods_no].filter(Boolean),
        sourceKey: product.goods_no ? `winctrl:${normalizeName(product.goods_no)}` : undefined,
        status: winCtrlStatus(product),
      };
    })
    .filter((product) => isUsefulShopProduct(product) || isUsefulWinCtrlProduct(product));
}

function isWinCtrl(base) {
  return base.hostname.toLowerCase().endsWith('winctrl.com');
}

function winCtrlStatus(product) {
  if (usablePrice(product.price) === undefined && parsePrice(product.price) !== undefined) {
    return 'out-of-stock';
  }
  if (Number(product.suspend_sales) === 1) return 'out-of-stock';
  return 'available';
}

function isUsefulWinCtrlProduct(product) {
  if (!product.name || !product.url) return false;
  const text = normalizeName(`${product.name} ${(product.categories ?? []).join(' ')} ${product.url}`);
  if (hasAny(text, ['sticker', 'shirt', 'hoodie', 'cap', 'hat', 'scent', 'merchandise'])) {
    return false;
  }

  return hasAny(text, [
    'adapter',
    'base',
    'button',
    'collective',
    'combo',
    'conversion kit',
    'desk plate',
    'display',
    'flight',
    'grip',
    'hotas',
    'joystick',
    'module',
    'mount',
    'panel',
    'pedal',
    'plate',
    'rudder',
    'shaker kit',
    'throttle',
  ]);
}

function hasAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function usablePrice(value) {
  const price = parsePrice(value);
  return price !== undefined && price < 999999 ? price : undefined;
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

function currencyFromSymbol(value) {
  const symbol = cleanText(value);
  if (symbol === '€') return 'EUR';
  if (symbol === '$' || symbol === 'US$') return 'USD';
  if (symbol === '£') return 'GBP';
  if (symbol === '¥' || symbol === '￥') return 'JPY';
  return symbol || undefined;
}

function absolutizeUrl(url, baseUrl) {
  if (!url) return undefined;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return undefined;
  }
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
