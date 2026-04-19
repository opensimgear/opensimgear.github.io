declare module 'playwright-bdd' {
  import type { Page } from '@playwright/test';

  type StepFixtures = {
    page: Page;
  };

  type StepFn = (fixtures: StepFixtures) => unknown | Promise<unknown>;

  export function defineBddConfig(options: { features: string; steps: string[]; outputDir?: string }): string;

  export function createBdd(): {
    Given: (text: string, fn: StepFn) => void;
    When: (text: string, fn: StepFn) => void;
    Then: (text: string, fn: StepFn) => void;
  };
}
