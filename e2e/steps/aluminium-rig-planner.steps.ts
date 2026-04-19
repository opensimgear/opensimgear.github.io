import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, When, Then } = createBdd();

function plannerRoot(page: Page) {
  return page
    .locator('main .not-content')
    .filter({ has: page.getByRole('heading', { level: 2, name: '3D preview' }) })
    .first();
}

function wheelReachSlider(page: Page): Locator {
  return page
    .locator('div')
    .filter({ has: page.locator('span', { hasText: 'Wheel reach' }) })
    .locator('input[type="range"]');
}

function previewToggle(page: Page): Locator {
  return page.getByText('Enable 3D preview', { exact: true }).locator('..').getByRole('checkbox');
}

function previewArea(page: Page): Locator {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { level: 2, name: '3D preview' }) })
    .first();
}

Given('I open the aluminium rig planner page', async ({ page }: { page: Page }) => {
  await page.goto('/calculators/aluminium-rig-planner');
});

Then('I should see the aluminium rig planner heading', async ({ page }: { page: Page }) => {
  await expect(page).toHaveTitle(/Aluminium Rig Planner/i);
  await expect(page.getByRole('heading', { level: 1, name: 'Aluminium Rig Planner' })).toBeVisible();
});

Then('I should see the profile-only cut list', async ({ page }: { page: Page }) => {
  await expect(page.getByRole('cell', { name: '40x80' }).first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'PROFILE' })).toBeVisible();
});

Then('the planner page should match the visual baseline', async ({ page }: { page: Page }) => {
  await expect(plannerRoot(page)).toHaveScreenshot('aluminium-rig-planner-page.png', {
    animations: 'disabled',
    caret: 'hide',
  });
});

When('I change the planner wheel reach', async ({ page }: { page: Page }) => {
  const slider = wheelReachSlider(page);
  const max = await slider.evaluate((element) => Number((element as HTMLInputElement).max));

  await slider.evaluate((element, value) => {
    const input = element as HTMLInputElement;
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, max);

  await expect(slider).toHaveValue(String(max));
});

When('I enable the 3D rig preview', async ({ page }: { page: Page }) => {
  const toggle = previewToggle(page);

  await toggle.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.checked = true;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(toggle).toBeChecked();
});

Then('I should see posture guidance mentioning wheel reach', async ({ page }: { page: Page }) => {
  await expect(page.getByText(/wheel reach is too long for a relaxed elbow bend/i).first()).toBeVisible();
});

Then('I should see the 3D rig preview', async ({ page }: { page: Page }) => {
  await expect(previewToggle(page)).toBeChecked();
  await expect(previewArea(page).locator('canvas')).toBeVisible();
});
