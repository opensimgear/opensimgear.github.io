export function isSimagicShop(url) {
  return /(^|\.)simagic\.com$/i.test(url.hostname);
}

export function simagicShopName(url) {
  return isSimagicShop(url) ? 'Simagic' : null;
}

export function normalizeSimagicProduct(product) {
  if (!isSimagicProduct(product)) return product;
  return {
    ...product,
    manufacturer: 'Simagic',
  };
}

export function inferSimagicCategory(product) {
  if (!isSimagicProduct(product)) return null;

  const text = normalizeText(`${product.name} ${(product.categories ?? []).join(' ')} ${product.url}`);

  if (hasAny(text, ['alpha base', 'wheel base', 'wheelbase', 'evo sport', 'evo 12', 'evo pro', 'evo ultra'])) {
    return { category: 'wheel-bases', subCategory: 'ffb-controller' };
  }

  if (hasAny(text, ['kill switch', 'motor shaft extender', 'mounting bracket', 'can extender'])) {
    return { category: 'wheel-bases', subCategory: 'wheel-base-accessories' };
  }

  if (hasAny(text, ['gt pro hub', 'neo x hub', 'maglink', 'qr-a'])) {
    return { category: 'steering-wheels', subCategory: 'wheel-electronics' };
  }

  if (hasAny(text, ['wheel', 'p 325', 'p 330', 'hub'])) {
    return { category: 'steering-wheels', subCategory: text.includes('formula') ? 'formula-wheel' : 'gt-wheel' };
  }

  if (hasAny(text, ['handbrake'])) {
    return { category: 'handbrakes', subCategory: text.includes('hydraulic') ? 'hybrid-handbrake' : 'analog-handbrake' };
  }

  if (hasAny(text, ['shifter', 'q1', 'ds 8x', 'long handle'])) {
    return { category: 'shifters', subCategory: text.includes('ds 8x') ? 'hybrid-shifter' : 'sequential-shifter' };
  }

  if (hasAny(text, ['pedal', 'p1000', 'p2000', 'p500', 'p700', 'heel', 'throttle plate', 'load sell sensor', 'p hys', 'p hysi', 'p orp', 'p aps'])) {
    if (hasAny(text, ['inversion', 'hydraulic throttle', 'rubber pads', 'springs kit'])) {
      return { category: 'pedals', subCategory: 'pedal-upgrade-kit' };
    }
    if (hasAny(text, ['p hys', 'p hysi', 'p orp'])) {
      return { category: 'pedals', subCategory: 'pedal-upgrade-kit' };
    }
    if (hasAny(text, ['bracket', 'mount'])) {
      return { category: 'pedals', subCategory: 'pedal-mount' };
    }
    if (hasAny(text, ['reactor', 'control box', 'heel', 'plate', 'collar', 'sensor', 'power supply', 'p aps'])) {
      return { category: 'pedals', subCategory: 'pedal-accessories' };
    }
    return { category: 'pedals', subCategory: 'load-cell-pedals' };
  }

  if (hasAny(text, ['gloves'])) {
    return { category: 'seats-and-ergonomics', subCategory: 'sim-apparel' };
  }

  if (hasAny(text, ['sim ray-bar', 'ray bar'])) {
    return { category: 'display-systems', subCategory: 'dashboard-display' };
  }

  return null;
}

function isSimagicProduct(product) {
  try {
    return new URL(product.url).hostname.replace(/^www\./, '') === 'simagic.com';
  } catch {
    return false;
  }
}

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}
