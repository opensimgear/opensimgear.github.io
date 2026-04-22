import type { PlannerCurrencyCode, PlannerCurrencyMode } from './types';

export const DEFAULT_CURRENCY_LOCALE = 'en-US';

const EURO_AREA_REGIONS = new Set([
  'AT',
  'BE',
  'BG',
  'CY',
  'DE',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PT',
  'SI',
  'SK',
]);

export function resolvePlannerLocale() {
  if (typeof navigator === 'undefined') {
    return DEFAULT_CURRENCY_LOCALE;
  }

  const preferredLocales =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages
      : navigator.language
        ? [navigator.language]
        : [DEFAULT_CURRENCY_LOCALE];

  return new Intl.NumberFormat(preferredLocales).resolvedOptions().locale;
}

export function detectPlannerCurrencyFromLocale(locale: string): PlannerCurrencyCode {
  try {
    const region = new Intl.Locale(locale).maximize().region;
    return region && EURO_AREA_REGIONS.has(region) ? 'EUR' : 'USD';
  } catch {
    return 'USD';
  }
}

export function resolvePlannerCurrency(mode: PlannerCurrencyMode, locale: string): PlannerCurrencyCode {
  if (mode === 'eur') {
    return 'EUR';
  }

  if (mode === 'usd') {
    return 'USD';
  }

  return detectPlannerCurrencyFromLocale(locale);
}

export function formatPlannerMoney(value: number, locale: string, currency: PlannerCurrencyCode) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
