import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const baseURL = process.env.PLAYWRIGHT_BASE_URL;

const testDir = defineBddConfig({
  features: 'e2e/features/**/*.feature',
  steps: ['e2e/steps/**/*.ts'],
});

export default defineConfig({
  testDir,
  globalSetup: './e2e/support/global-setup.ts',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    screenshot: 'only-on-failure',
    ...(baseURL ? { baseURL } : {}),
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
