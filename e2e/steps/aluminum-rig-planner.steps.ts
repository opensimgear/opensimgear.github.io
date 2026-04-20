import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, Then } = createBdd();

function previewArea(page: Page): Locator {
  return page.locator('.not-content').first();
}

Given('I open the aluminum rig planner page', async ({ page }: { page: Page }) => {
  await page.goto('/calculators/aluminum-rig-planner');
});

Then('I should see the aluminum rig planner heading', async ({ page }: { page: Page }) => {
  await expect(page).toHaveTitle(/8020 Aluminum Rig Planner/i);
  await expect(page.getByRole('heading', { level: 1, name: '8020 Aluminum Rig Planner' })).toBeVisible();
});

Then('I should see the planner section', async ({ page }: { page: Page }) => {
  await expect(page.getByRole('heading', { level: 2, name: 'Planner' })).toBeVisible();
});

Then('I should see the planner controls', async ({ page }: { page: Page }) => {
  const root = previewArea(page);

  await expect(root.getByText('Setup')).toBeVisible();
  await expect(root.getByText('Finish')).toBeVisible();
  await expect(root.getByText('Endcaps')).toBeVisible();
  await expect(root.getByText('Base length')).toBeVisible();
});

Then('I should see the cut list', async ({ page }: { page: Page }) => {
  const root = previewArea(page);

  await expect(root.getByText('Cut list')).toBeVisible();
  await expect(root.getByRole('columnheader', { name: 'Profile' })).toBeVisible();
  await expect(root.getByRole('columnheader', { name: 'Length' })).toBeVisible();
  await expect(root.getByRole('columnheader', { name: 'Qty' })).toBeVisible();
  await expect(root.getByText('80x40').first()).toBeVisible();
});

Then('I should see the 3D rig preview', async ({ page }: { page: Page }) => {
  const root = previewArea(page);
  const canvas = root.locator('canvas');
  const loadingError = root.getByText('3D scene failed to load. Refresh to retry.');
  const sceneReadyTimeoutMs = 20_000;

  await expect
    .poll(
      async () => {
        if (await canvas.isVisible()) {
          return 'ready';
        }

        if (await loadingError.isVisible()) {
          return 'error';
        }

        return 'loading';
      },
      {
        timeout: sceneReadyTimeoutMs,
        message: 'Expected aluminum rig preview canvas to appear before timeout',
      }
    )
    .toBe('ready');
});
