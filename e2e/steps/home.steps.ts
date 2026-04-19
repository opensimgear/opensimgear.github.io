import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, Then } = createBdd();

Given('I open the home page', async ({ page }: { page: Page }) => {
  await page.goto('/');
});

Then('I should see the home hero heading', async ({ page }: { page: Page }) => {
  await expect(page).toHaveTitle(/OpenSimGear/i);
  await expect(page.getByRole('heading', { level: 1, name: /open source/i })).toBeVisible();
});
