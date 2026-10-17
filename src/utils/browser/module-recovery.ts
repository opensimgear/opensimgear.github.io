/** Self-contained so Head can register synchronously, before island imports start. */
export function installModuleRecovery(browser: Window): void {
  let reloading = false;
  const recover = (reason: unknown) => {
    const message = typeof reason === 'string' ? reason : (reason as { message?: unknown })?.message;
    if (typeof message !== 'string') return;
    // Require both a browser module-load failure and the failed built asset URL.
    const match = message.match(
      /(?:Failed to fetch dynamically imported module:|error loading dynamically imported module:|Importing a module script failed[:.]?)\s*(https?:\/\/[^\s"'<>]+|\/_astro\/[^\s"'<>]+)/i
    );
    if (!match || reloading) return;
    let asset: URL;
    try {
      asset = new URL(match[1], browser.location.href);
    } catch {
      return;
    }
    if (asset.origin !== browser.location.origin || !/^\/_astro\/.+\.m?js$/.test(asset.pathname)) return;
    // One automatic reload per tab, including across deployments and page changes.
    // If storage is blocked we cannot safely establish a bound, so leave manual retry.
    try {
      const key = 'opensimgear:module-recovery';
      if (browser.sessionStorage.getItem(key)) return;
      browser.sessionStorage.setItem(key, '1');
      if (browser.sessionStorage.getItem(key) !== '1') return;
    } catch {
      return;
    }
    reloading = true;
    browser.location.reload();
  };
  browser.addEventListener('unhandledrejection', (event) => recover(event.reason));
  browser.addEventListener('error', (event) => recover(event.error ?? event.message));
}

/** Astro catches island import errors; retain a manual retry until hydration succeeds. */
export function installCalculatorRetry(container: HTMLElement): void {
  const island = container.querySelector('astro-island');
  const notice = container.querySelector('[data-calculator-retry]');
  if (!island || !notice) return;
  if (!island.hasAttribute('ssr')) {
    notice.remove();
    return;
  }
  island.addEventListener('astro:hydrate', () => notice.remove(), { once: true });
}
