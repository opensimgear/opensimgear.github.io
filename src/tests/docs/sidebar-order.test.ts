import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const docsRoot = path.resolve(process.cwd(), 'src/content/docs/docs');

const topLevelEntries = [
  ['sim-racing.md', 0],
  ['flight-simulation.md', 1],
] as const;

const sectionEntries = {
  components: [
    'components/steering-wheels.md',
    'components/wheel-bases.md',
    'components/pedals.md',
    'components/shifters.md',
    'components/handbrakes.md',
    'components/joysticks.md',
    'components/yokes.md',
    'components/throttles.md',
    'components/collectives.md',
    'components/rudder-pedals.md',
    'components/button-boxes-and-panels.md',
    'components/rigs-and-cockpits.md',
    'components/seats-and-ergonomics.md',
    'components/display-systems.md',
    'components/vr-and-head-tracking.md',
    'components/tactile-feedback.md',
    'components/wind-simulation.md',
    'components/belt-tensioners.md',
    'components/g-seats.md',
    'components/motion-platforms.md',
  ],
} as const;

function readSidebarOrder(relativePath: string) {
  const source = fs.readFileSync(path.join(docsRoot, relativePath), 'utf8');
  const match = source.match(/sidebar:\s*\n(?:\s+.+\n)*\s+order:\s*(\d+)/);

  if (!match) {
    throw new Error(`Missing sidebar.order in ${relativePath}`);
  }

  return Number(match[1]);
}

describe('docs sidebar ordering', () => {
  it('keeps the top-level docs landing pages in the intended sequence', () => {
    const orders = topLevelEntries.map(([relativePath, expectedOrder]) => ({
      relativePath,
      expectedOrder,
      actualOrder: readSidebarOrder(relativePath),
    }));

    expect(orders).toEqual(
      topLevelEntries.map(([relativePath, expectedOrder]) => ({
        relativePath,
        expectedOrder,
        actualOrder: expectedOrder,
      }))
    );
  });

  it('gives each section overview page the lowest order in its section', () => {
    const sectionIndexes = {
      components: readSidebarOrder('components/overview.md'),
    };

    for (const [section, pages] of Object.entries(sectionEntries)) {
      const minChildOrder = Math.min(...pages.map((relativePath) => readSidebarOrder(relativePath)));
      expect(sectionIndexes[section as keyof typeof sectionIndexes]).toBeLessThan(minChildOrder);
    }
  });
});
