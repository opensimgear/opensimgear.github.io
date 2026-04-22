import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, Then } = createBdd();

Given('I open the aluminum rig planner page', async ({ page }: { page: Page }) => {
  await page.goto('/calculators/aluminum-rig-planner');
});

Then('I should see the aluminum rig planner heading', async ({ page }: { page: Page }) => {
  await expect(page).toHaveTitle(/8020 Aluminum Rig Planner/i);
  await expect(page.getByTestId('page-title')).toBeVisible();
});

Then('I should see the planner section', async ({ page }: { page: Page }) => {
  await expect(page.getByTestId('aluminum-rig-planner-section-heading')).toBeVisible();
});

Then('I should see the planner controls', async ({ page }: { page: Page }) => {
  await expect(page.getByTestId('aluminum-rig-planner-root')).toBeVisible();
  await expect(page.getByTestId('aluminum-rig-planner-setup-pane')).toBeVisible();
  await expect(page.getByTestId('aluminum-rig-planner-finish-control')).toBeVisible();
  await expect(page.getByTestId('aluminum-rig-planner-endcaps-control')).toBeVisible();
  await expect(page.getByTestId('aluminum-rig-planner-base-length-control')).toBeVisible();
  await expect(page.getByTestId('aluminum-rig-planner-base-width-control')).toBeVisible();
});

Then('I should see the cut list', async ({ page }: { page: Page }) => {
  await expect(page.getByTestId('aluminum-rig-planner-cut-list-pane')).toBeVisible();
  await expect(page.getByTestId('aluminum-rig-planner-cut-list-table')).toBeVisible();
  await expect(page.getByTestId('aluminum-rig-planner-cut-list-profile-header')).toBeVisible();
  await expect(page.getByTestId('aluminum-rig-planner-cut-list-length-header')).toBeVisible();
  await expect(page.getByTestId('aluminum-rig-planner-cut-list-qty-header')).toBeVisible();
  await expect(page.getByTestId('aluminum-rig-planner-cut-list-first-profile')).toBeVisible();
});

Then('I should see the 3D rig preview', async ({ page }: { page: Page }) => {
  await expect(page.getByRole('application', { name: /3D aluminum rig planner viewport/i })).toBeVisible();
  await expect(page.getByTestId('aluminum-rig-planner-preview-error')).toBeHidden();
  await expect(page.getByTestId('aluminum-rig-planner-preview-canvas')).toBeVisible();
});
