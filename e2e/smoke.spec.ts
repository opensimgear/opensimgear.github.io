import { expect, test } from '@playwright/test';

// Keep the smoke gate independent of telemetry availability. Application assets
// and all other requests remain observable and are never mocked in healthy flows.
test.beforeEach(async ({ context }) => {
  await context.route(/https?:\/\/[^/]*(?:sentry\.io|google-analytics\.com|googletagmanager\.com)\//, (route) =>
    route.abort()
  );
});

test('home navigation survives translation-style nested text', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    if (new URL(request.url()).pathname.startsWith('/_astro/') && /\.m?js(?:\?|$)/.test(request.url())) {
      errors.push(`Application script failed: ${request.url()}`);
    }
  });
  page.on('response', (response) => {
    if (
      new URL(response.url()).pathname.startsWith('/_astro/') &&
      /\.m?js(?:\?|$)/.test(response.url()) &&
      response.status() >= 400
    )
      errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  await page.goto('/');
  await expect(page.getByTestId('page-hero-title')).toBeVisible();
  const link = page.locator('a[href="/getting-started/"]').first();
  await expect(link).toBeVisible();
  // Translators wrap existing text nodes; exercise real click delegation with
  // the same nested DOM shape without contacting a translation service.
  await link.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      if (!node.textContent?.trim()) continue;
      const outer = document.createElement('font');
      const inner = document.createElement('font');
      inner.textContent = node.textContent;
      outer.append(inner);
      node.replaceWith(outer);
    }
  });
  await link.locator('font font').first().click();
  await expect(page).toHaveURL(/\/getting-started\//);
  await expect(page.locator('h1')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const calculator of ['actuator-sizing', 'stewart-platform', 'aluminum-rig-planner']) {
  test(`${calculator} hydrates and accepts input`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => {
      if (new URL(request.url()).pathname.startsWith('/_astro/') && /\.m?js(?:\?|$)/.test(request.url()))
        errors.push(request.url());
    });
    page.on('response', (response) => {
      if (
        new URL(response.url()).pathname.startsWith('/_astro/') &&
        /\.m?js(?:\?|$)/.test(response.url()) &&
        response.status() >= 400
      )
        errors.push(`HTTP ${response.status()}: ${response.url()}`);
    });
    await page.goto(`/calculators/${calculator}/`);
    const calculatorUI = page.locator('[data-calculator-recovery]');
    await expect(calculatorUI.locator('astro-island')).not.toHaveAttribute('ssr', '');
    await expect(calculatorUI.locator('[data-calculator-retry]')).toHaveCount(0);
    if (calculator === 'actuator-sizing') {
      await calculatorUI.getByRole('button', { name: '+ Add custom motor', exact: true }).click();
      await expect(calculatorUI.getByRole('textbox', { name: 'Name', exact: true })).toBeVisible();
      await calculatorUI.getByRole('textbox', { name: 'Name', exact: true }).fill('Smoke motor');
      await expect(calculatorUI.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Smoke motor');
    } else {
      const editableInputs = calculatorUI.locator('input:visible:not([type="hidden"]):not([readonly]):not([disabled])');
      // The responsive layout starts with panes collapsed on phones/tablets.
      if ((await editableInputs.count()) === 0) {
        await calculatorUI
          .getByRole('button', {
            name: calculator === 'stewart-platform' ? 'Parameters' : 'Posture',
            exact: true,
          })
          .click();
      }
      const input = editableInputs.first();
      await expect(input).toBeVisible();
      if ((await input.getAttribute('type')) === 'checkbox') {
        const checked = await input.isChecked();
        await input.setChecked(!checked);
        await expect(input).toBeChecked({ checked: !checked });
      } else {
        const original = await input.inputValue();
        await input.press('ArrowUp');
        await expect(input).not.toHaveValue(original);
      }
    }
    expect(errors).toEqual([]);
  });
}

test('production early handler recovers URL-bearing module errors once', async ({ page }) => {
  const path = '/gear/?smoke=module-recovery#smoke-anchor';
  await page.goto(path);
  const originalURL = page.url();
  const dispatchFailure = () =>
    page.evaluate(() => {
      window.dispatchEvent(
        new ErrorEvent('error', {
          error: new TypeError(
            `Failed to fetch dynamically imported module: ${location.origin}/_astro/missing-smoke.js`
          ),
        })
      );
    });
  await Promise.all([page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame()), dispatchFailure()]);
  await page.waitForLoadState('load');
  expect(page.url()).toBe(originalURL);
  let reloads = 0;
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) reloads++;
  });
  await dispatchFailure();
  await page.waitForTimeout(750);
  expect(reloads).toBe(0);
  expect(page.url()).toBe(originalURL);
});

test('failed calculator import retains manual retry and recovers on reload', async ({ page }) => {
  let failed = false;
  await page.route('**/_astro/*.js', async (route) => {
    if (!failed && /\/index\.[^/]+\.js$/.test(new URL(route.request().url()).pathname)) {
      failed = true;
      await route.abort();
    } else await route.continue();
  });
  await page.goto('/calculators/actuator-sizing/?smoke=retry#calculator');
  const retry = page.getByRole('button', { name: 'Reload and try again' });
  await expect(retry).toBeVisible();
  expect(failed).toBe(true);
  await retry.click();
  await expect(page.locator('[data-calculator-retry]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '+ Add custom motor', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\?smoke=retry#calculator$/);
});
