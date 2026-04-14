# Group Sidebar Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let docs sidebar groups use `sidebar.label` from each section `index.md` instead of always showing the raw
directory name, while preserving page-level `sidebar.hidden` behavior.

**Architecture:** Replace the `Docs` autogenerate entry with a small build-time sidebar generator that scans
`src/content/docs/docs/`, reads a narrow slice of frontmatter metadata, and emits the same nested Starlight sidebar
shape with custom group labels. Keep Starlight in charge of rendering links, current-page state, and non-docs sections
while preserving existing docs ordering rules and `sidebar.hidden` page filtering.

**Tech Stack:** Astro 6, Starlight, Node.js `fs`/`path`, Vitest

---

## File Structure

- Create: `src/utils/docs-sidebar.js` - build-time docs sidebar generator and frontmatter metadata reader
- Create: `src/tests/docs/sidebar-groups.test.ts` - focused tests for custom group labels, hidden-page behavior, and
  directory-name fallback
- Modify: `astro.config.mjs` - swap `Docs` autogeneration for the generated manual docs sidebar group
- Modify: `src/tests/docs/sidebar-order.test.ts` - keep existing order checks and add a shape-level assertion against
  generated docs groups
- Modify: `src/content/docs/docs/components/index.md` - add explicit `sidebar.label`
- Modify: `src/content/docs/docs/guides/index.md` - add explicit `sidebar.label`
- Modify: `src/content/docs/docs/diy/index.md` - add explicit `sidebar.label`

### Task 1: Build and test docs sidebar generator

**Files:**

- Create: `src/utils/docs-sidebar.js`
- Create: `src/tests/docs/sidebar-groups.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/tests/docs/sidebar-groups.test.ts` with this content:

```ts
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildDocsSidebarGroup } from '../../utils/docs-sidebar.js';

const docsRoot = path.resolve(process.cwd(), 'src/content/docs/docs');

function findGroup(label: string) {
  const docsGroup = buildDocsSidebarGroup(docsRoot);
  const entry = docsGroup.items.find((item) => 'items' in item && item.label === label);
  return entry && 'items' in entry ? entry : undefined;
}

describe('docs sidebar group labels', () => {
  it('uses sidebar.label from section index pages for generated group labels', () => {
    const docsGroup = buildDocsSidebarGroup(docsRoot);
    const labels = docsGroup.items.filter((item) => 'items' in item).map((item) => item.label);

    expect(labels).toContain('Components');
    expect(labels).toContain('Guides');
    expect(labels).toContain('DIY Reference');
  });

  it('keeps the section landing page inside the matching generated group', () => {
    const diyGroup = findGroup('DIY Reference');
    expect(diyGroup).toBeDefined();
    expect(diyGroup?.items[0]).toMatchObject({ slug: 'docs/diy' });
  });

  it('falls back to the directory name when sidebar.label is missing', () => {
    const metadata = {
      title: 'Ignored title',
      sidebar: {},
    };

    expect(buildDocsSidebarGroup.getGroupLabel('sandbox', metadata)).toBe('sandbox');
  });

  it('omits hidden pages from generated links', () => {
    const docsGroup = buildDocsSidebarGroup(docsRoot);

    expect(JSON.stringify(docsGroup.items)).not.toContain('docs/hidden-example');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/tests/docs/sidebar-groups.test.ts` Expected: FAIL with module-not-found or missing export errors
for `../../utils/docs-sidebar.js` / `buildDocsSidebarGroup`

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/docs-sidebar.js` with this content:

```js
import fs from 'node:fs';
import path from 'node:path';

const DOC_EXTENSIONS = new Set(['.md', '.mdx']);

function readFrontmatter(source, filePath) {
  if (!source.startsWith('---\n')) {
    throw new Error(`Missing frontmatter in ${filePath}`);
  }

  const closingIndex = source.indexOf('\n---\n', 4);
  if (closingIndex === -1) {
    throw new Error(`Unterminated frontmatter in ${filePath}`);
  }

  return source.slice(4, closingIndex);
}

function parseMetadata(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const frontmatter = readFrontmatter(source, filePath);
  const title = frontmatter.match(/^title:\s*(.+)$/m)?.[1]?.trim();
  const orderValue = frontmatter.match(/^\s{2}order:\s*(\d+)$/m)?.[1];
  const labelValue = frontmatter.match(/^\s{2}label:\s*(.+)$/m)?.[1]?.trim();
  const hiddenValue = frontmatter.match(/^\s{2}hidden:\s*(true|false)$/m)?.[1];

  if (!title) {
    throw new Error(`Missing title in ${filePath}`);
  }

  return {
    title,
    sidebar: {
      order: orderValue ? Number(orderValue) : Number.MAX_SAFE_INTEGER,
      label: labelValue,
      hidden: hiddenValue === 'true',
    },
  };
}

function slugFromFilePath(docsRoot, filePath) {
  const relativePath = path.relative(docsRoot, filePath).replace(/\\/g, '/');
  const withoutExtension = relativePath.replace(/\.(md|mdx)$/, '');
  return withoutExtension.endsWith('/index')
    ? `docs/${withoutExtension.slice(0, -'/index'.length)}`
    : `docs/${withoutExtension}`;
}

function compareEntries(a, b) {
  if (a.order !== b.order) {
    return a.order - b.order;
  }

  return a.sortKey.localeCompare(b.sortKey);
}

function collectDirectoryItems(docsRoot, directoryPath) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const items = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      const indexPath = ['index.md', 'index.mdx']
        .map((name) => path.join(fullPath, name))
        .find((candidate) => fs.existsSync(candidate));
      const metadata = indexPath ? parseMetadata(indexPath) : { title: entry.name, sidebar: {} };
      const childItems = collectDirectoryItems(docsRoot, fullPath);

      items.push({
        type: 'group',
        label: buildDocsSidebarGroup.getGroupLabel(entry.name, metadata),
        items: childItems,
        order: metadata.sidebar.order ?? Number.MAX_SAFE_INTEGER,
        sortKey: entry.name,
      });
      continue;
    }

    if (!DOC_EXTENSIONS.has(path.extname(entry.name))) continue;

    const metadata = parseMetadata(fullPath);
    if (metadata.sidebar.hidden) continue;

    items.push({
      type: 'link',
      slug: slugFromFilePath(docsRoot, fullPath),
      order: metadata.sidebar.order,
      sortKey: slugFromFilePath(docsRoot, fullPath),
    });
  }

  return items
    .sort(compareEntries)
    .map((item) => (item.type === 'group' ? { label: item.label, items: item.items } : { slug: item.slug }));
}

export function buildDocsSidebarGroup(docsRoot = path.resolve(process.cwd(), 'src/content/docs/docs')) {
  return {
    label: 'Docs',
    items: collectDirectoryItems(docsRoot, docsRoot),
  };
}

buildDocsSidebarGroup.getGroupLabel = function getGroupLabel(directoryName, metadata) {
  const label = metadata.sidebar?.label?.trim();
  return label || directoryName;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/tests/docs/sidebar-groups.test.ts` Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/docs-sidebar.js src/tests/docs/sidebar-groups.test.ts
git commit -m "feat(docs): add sidebar group generator"
```

### Task 2: Wire generated docs sidebar into Starlight config

**Files:**

- Modify: `astro.config.mjs`
- Modify: `src/tests/docs/sidebar-order.test.ts`

- [ ] **Step 1: Write the failing test**

Update `src/tests/docs/sidebar-order.test.ts` to import the new helper and add this assertion near the existing suites:

```ts
import { buildDocsSidebarGroup } from '../../utils/docs-sidebar.js';

it('keeps top-level docs pages and generated groups in the intended sequence', () => {
  const docsGroup = buildDocsSidebarGroup();

  expect(docsGroup.items.map((item) => ('slug' in item ? item.slug : item.label))).toEqual([
    'docs/sim-racing',
    'docs/flight-simulation',
    'Components',
    'Guides',
    'DIY Reference',
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/tests/docs/sidebar-order.test.ts` Expected: FAIL because current docs content does not yet expose
`DIY Reference` as the generated group label and config still uses raw autogeneration

- [ ] **Step 3: Write minimal implementation**

Update `astro.config.mjs` imports and sidebar config to this shape:

```js
import { buildDocsSidebarGroup } from './src/utils/docs-sidebar.js';

// inside starlight({ sidebar: [...] })
sidebar: [
  {
    label: 'Start Here',
    items: [
      { label: 'Getting started', link: '/getting-started' },
      { label: 'Contributing', link: '/contributing' },
      { label: 'FAQ', link: '/faq' },
    ],
  },
  buildDocsSidebarGroup(),
  {
    label: 'Calculators',
    autogenerate: { directory: 'calculators' },
  },
  {
    label: 'Gear',
    autogenerate: { directory: 'gear' },
  },
  {
    label: '3rd Party',
    autogenerate: { directory: '3rdparty' },
  },
],
```

Keep the rest of `astro.config.mjs` unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/tests/docs/sidebar-groups.test.ts src/tests/docs/sidebar-order.test.ts` Expected:
`sidebar-groups.test.ts` stays PASS and `sidebar-order.test.ts` reflects generated docs structure except for the
upcoming content-label update

- [ ] **Step 5: Commit**

```bash
git add astro.config.mjs src/tests/docs/sidebar-order.test.ts
git commit -m "refactor(docs): build docs sidebar manually"
```

### Task 3: Add explicit section labels and verify build

**Files:**

- Modify: `src/content/docs/docs/components/index.md`
- Modify: `src/content/docs/docs/guides/index.md`
- Modify: `src/content/docs/docs/diy/index.md`

- [ ] **Step 1: Write the failing test**

Update frontmatter expectations in `src/tests/docs/sidebar-groups.test.ts` to require all three human-facing labels.
Also make the hidden-page assertion target a real hidden test fixture or temporary fixture created inside the test.

```ts
expect(labels).toEqual(expect.arrayContaining(['Components', 'Guides', 'DIY Reference']));
```

If the assertion already exists from Task 1, leave it in place and use this step as the red check for the content
update.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/tests/docs/sidebar-groups.test.ts src/tests/docs/sidebar-order.test.ts` Expected: FAIL because
the section landing pages do not yet set `sidebar.label`

- [ ] **Step 3: Write minimal implementation**

Add `sidebar.label` to these files:

`src/content/docs/docs/components/index.md`

```md
sidebar: label: Components order: 2
```

`src/content/docs/docs/guides/index.md`

```md
sidebar: label: Guides order: 3
```

`src/content/docs/docs/diy/index.md`

```md
sidebar: label: DIY Reference order: 4
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/tests/docs/sidebar-groups.test.ts src/tests/docs/sidebar-order.test.ts` Expected: PASS

- [ ] **Step 5: Verify full site build**

Run: `pnpm build` Expected: `astro check` passes and Astro production build completes successfully

- [ ] **Step 6: Commit**

```bash
git add src/content/docs/docs/components/index.md src/content/docs/docs/guides/index.md src/content/docs/docs/diy/index.md
git commit -m "docs: add explicit docs section labels"
```

## Self-Review

- Spec coverage checked: helper, fallback, hidden-page preservation, content updates, tests, and `pnpm build`
  verification all mapped to tasks.
- Placeholder scan checked: no `TODO`, `TBD`, or undefined “handle later” steps remain.
- Type consistency checked: plan uses `buildDocsSidebarGroup()` and `buildDocsSidebarGroup.getGroupLabel()` consistently
  across test and implementation steps.

Plan complete and saved to `docs/superpowers/plans/2026-04-14-group-sidebar-labels.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
