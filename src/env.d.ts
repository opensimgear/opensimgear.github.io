/// <reference types="astro/client" />
import '../.astro/types.d.ts';

declare global {
  interface Window {
    dataLayer: Array<IArguments | unknown[]>;
    gtag?: (...args: unknown[]) => void;
    updateConsent?: () => void;
    cookieConsent?: unknown;
  }
}

export {};
