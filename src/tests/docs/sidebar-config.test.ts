import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildDocsSidebar } from '../../utils/docs-sidebar';

const docsRoot = path.resolve(process.cwd(), 'src/content/docs/docs');
const thirdPartyRoot = path.resolve(process.cwd(), 'src/content/docs/3rdparty');

const tempDirs: string[] = [];

function createDocsFixture(files: Record<string, string>) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-sidebar-'));
  tempDirs.push(tempDir);

  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
  }

  return tempDir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe('buildDocsSidebar', () => {
  it('uses sidebar.label from a section landing page for the group label', () => {
    const fixtureRoot = createDocsFixture({
      'diy/index.md': `---
title: DIY Overview
sidebar:
  label: DIY Reference
  order: 0
---
`,
      'diy/sensors-and-input-detection.md': `---
title: Sensors and Input Detection
sidebar:
  order: 1
---
`,
    });

    const sidebar = buildDocsSidebar({ docsRoot: fixtureRoot, basePath: '/docs' });
    const diyGroup = sidebar.find((item) => item.label === 'DIY Reference');

    expect(diyGroup).toBeDefined();
    expect(diyGroup).toMatchObject({
      label: 'DIY Reference',
    });

    if (!diyGroup || !('items' in diyGroup)) {
      throw new Error('Expected DIY Reference to be a sidebar group');
    }

    expect(diyGroup.items).toEqual([
      { label: 'DIY Overview', link: '/docs/diy/' },
      { label: 'Sensors and Input Detection', link: '/docs/diy/sensors-and-input-detection/' },
    ]);
  });

  it('falls back to the directory name when a section landing page omits sidebar.label', () => {
    const fixtureRoot = createDocsFixture({
      'alpha/index.md': `---
title: Alpha Index
sidebar:
  order: 0
---
`,
      'alpha/child.md': `---
title: Child Page
sidebar:
  order: 1
---
`,
    });

    const sidebar = buildDocsSidebar({ docsRoot: fixtureRoot, basePath: '/docs' });

    expect(sidebar).toMatchObject([
      {
        label: 'alpha',
        items: [
          { label: 'Alpha Index', link: '/docs/alpha/' },
          { label: 'Child Page', link: '/docs/alpha/child/' },
        ],
      },
    ]);
  });

  it('excludes pages marked with sidebar.hidden from generated links', () => {
    const fixtureRoot = createDocsFixture({
      'guides/index.md': `---
title: Guides
sidebar:
  label: Guides
  order: 0
---
`,
      'guides/visible.md': `---
title: Visible Page
sidebar:
  order: 1
---
`,
      'guides/hidden.md': `---
title: Hidden Page
sidebar:
  order: 2
  hidden: true
---
`,
    });

    const sidebar = buildDocsSidebar({ docsRoot: fixtureRoot, basePath: '/docs' });
    const guidesGroup = sidebar.find((item) => item.label === 'Guides');

    if (!guidesGroup || !('items' in guidesGroup)) {
      throw new Error('Expected Guides to be a sidebar group');
    }

    expect(guidesGroup).toMatchObject({
      label: 'Guides',
      items: [
        { label: 'Guides', link: '/docs/guides/' },
        { label: 'Visible Page', link: '/docs/guides/visible/' },
      ],
    });
    expect(guidesGroup.items).not.toContainEqual({ label: 'Hidden Page', link: '/docs/guides/hidden/' });
  });

  it('supports mdx docs and section indexes when building groups', () => {
    const fixtureRoot = createDocsFixture({
      'guides/index.mdx': `---
title: Guides Index
sidebar:
  label: Guide Shelf
  order: 2
---
`,
      'guides/alpha.mdx': `---
title: Alpha Page
sidebar:
  order: 3
---
`,
      'guides/beta.md': `---
title: Beta Page
sidebar:
  order: 1
  label: Beta Label
---
`,
      'guides/hidden.mdx': `---
title: Hidden MDX Page
sidebar:
  order: 4
  hidden: true
---
`,
      'top-level.mdx': `---
title: Top Level MDX
sidebar:
  order: 0
  label: Top Level Label
---
`,
    });

    const sidebar = buildDocsSidebar({ docsRoot: fixtureRoot, basePath: '/docs' });

    expect(sidebar).toEqual([
      { label: 'Top Level MDX', link: '/docs/top-level/' },
      {
        label: 'Guide Shelf',
        items: [
          { label: 'Beta Page', link: '/docs/guides/beta/' },
          { label: 'Guides Index', link: '/docs/guides/' },
          { label: 'Alpha Page', link: '/docs/guides/alpha/' },
        ],
      },
    ]);
  });

  it('passes through sidebar.collapsed from a section landing page', () => {
    const fixtureRoot = createDocsFixture({
      'components/index.md': `---
title: Components Overview
sidebar:
  label: Components
  order: 0
  collapsed: true
---
`,
      'components/child.md': `---
title: Child Page
sidebar:
  order: 1
---
`,
    });

    const sidebar = buildDocsSidebar({ docsRoot: fixtureRoot, basePath: '/docs' });

    expect(sidebar).toMatchObject([
      {
        label: 'Components',
        collapsed: true,
        items: [
          { label: 'Components Overview', link: '/docs/components/' },
          { label: 'Child Page', link: '/docs/components/child/' },
        ],
      },
    ]);
  });

  it('omits collapsed when a section landing page does not define sidebar.collapsed', () => {
    const fixtureRoot = createDocsFixture({
      'guides/index.md': `---
title: Guides Overview
sidebar:
  label: Guides
  order: 0
---
`,
      'guides/child.md': `---
title: Child Page
sidebar:
  order: 1
---
`,
    });

    const sidebar = buildDocsSidebar({ docsRoot: fixtureRoot, basePath: '/docs' });
    const guidesGroup = sidebar.find((item) => item.label === 'Guides');

    expect(guidesGroup).toBeDefined();
    expect(guidesGroup).not.toHaveProperty('collapsed');
  });

  it('preserves the intended top-level docs ordering', () => {
    const sidebar = buildDocsSidebar({ docsRoot, basePath: '/docs' });

    expect(sidebar.map((item) => item.label)).toEqual(['Sim Racing', 'Flight Simulation']);
  });

  it('uses configured basePath for third-party top-level slugs', () => {
    const sidebar = buildDocsSidebar({ docsRoot: thirdPartyRoot, basePath: '/3rdparty' });

    expect(sidebar).toContainEqual({
      label: 'Disclaimer',
      link: '/3rdparty/',
    });
  });

  it('maps a top-level index file to the base path root', () => {
    const fixtureRoot = createDocsFixture({
      'index.md': `---
title: Overview
sidebar:
  order: 0
---
`,
      'belt-tensioner/index.md': `---
title: Belt Tensioner Overview
sidebar:
  label: Belt Tensioner
  order: 1
---
`,
    });

    const sidebar = buildDocsSidebar({ docsRoot: fixtureRoot, basePath: '/3rdparty' });

    expect(sidebar).toContainEqual({
      label: 'Overview',
      link: '/3rdparty/',
    });
  });
});
