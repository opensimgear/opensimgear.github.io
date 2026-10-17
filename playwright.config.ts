import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const defaultBaseURL = 'http://127.0.0.1:4321';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || defaultBaseURL;

const bddTestDir = defineBddConfig({
  features: 'e2e/features/**/*.feature',
  steps: ['e2e/steps/**/*.ts'],
});

const profiles = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'android-phone', use: { ...devices['Pixel 7'] } },
  { name: 'iphone', use: { ...devices['iPhone 13'] } },
  { name: 'ipad', use: { ...devices['iPad Pro 11'] } },
  { name: 'android-tablet', use: { ...devices['Galaxy Tab S4'] } },
];

export default defineConfig({
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || 'test-results',
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: process.env.PLAYWRIGHT_REPORT_DIR || 'playwright-report' }]]
    : [['list']],
  expect: {
    toHaveScreenshot: {
      pathTemplate: 'e2e/__screenshots__{/projectName}/{testName}/{arg}{ext}',
    },
  },
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 4321',
        reuseExistingServer: false,
        timeout: 240_000,
        url: defaultBaseURL,
      },
  // BDD resolves step definitions from its generated testDir. Each native
  // profile depends on its matching BDD project so --project selects both.
  projects: profiles.flatMap(({ name, use }) => [
    { name: `${name}-bdd`, testDir: bddTestDir, testMatch: '**/*.spec.js', use },
    { name, testDir: 'e2e', testMatch: '**/*.spec.ts', use, dependencies: [`${name}-bdd`] },
  ]),
});
