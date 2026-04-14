# Docs Sidebar Collapsed Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `components`, `guides`, and `diy` groups inside the Docs sidebar start collapsed by default while keeping
the top-level Docs section open.

**Architecture:** Extend the custom docs sidebar builder to read optional `sidebar.collapsed` metadata from section
landing-page frontmatter and pass that property through to generated Starlight sidebar groups. Then opt the three target
section indexes into collapsed behavior and verify with focused sidebar tests plus a full site build.

**Tech Stack:** Astro, Starlight sidebar config, TypeScript, Vitest, Markdown frontmatter

---

### Task 1: Add failing tests for collapsed sidebar metadata

**Files:**

- Modify: `src/tests/docs/sidebar-config.test.ts`
- Test: `src/tests/docs/sidebar-config.test.ts`

- [ ] **Step 1: Write failing test for explicit collapsed metadata**

```ts
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

  const sidebar = buildDocsSidebar({ docsRoot: fixtureRoot });

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
```

- [ ] **Step 2: Run focused test to verify RED**

Run: `pnpm test src/tests/docs/sidebar-config.test.ts` Expected: FAIL because generated sidebar group does not yet
include `collapsed`

- [ ] **Step 3: Write failing test for default fallback**

```ts
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

  const sidebar = buildDocsSidebar({ docsRoot: fixtureRoot });
  const guidesGroup = sidebar.find((item) => item.label === 'Guides');

  expect(guidesGroup).toBeDefined();
  expect(guidesGroup).not.toHaveProperty('collapsed');
});
```

- [ ] **Step 4: Re-run focused test to verify RED still correct**

Run: `pnpm test src/tests/docs/sidebar-config.test.ts` Expected: FAIL only on explicit collapsed case, while new
fallback assertion is ready for post-fix verification

### Task 2: Implement collapsed metadata support in sidebar builder

**Files:**

- Modify: `src/utils/docs-sidebar.ts`
- Test: `src/tests/docs/sidebar-config.test.ts`

- [ ] **Step 1: Extend page metadata type and parser**

```ts
type SidebarGroup = {
  label: string;
  items: SidebarLink[];
  collapsed?: boolean;
};

type PageMeta = {
  title: string;
  order: number;
  hidden: boolean;
  sidebarLabel?: string;
  sidebarCollapsed?: boolean;
};

return {
  title,
  order: Number(readBlockValue(sidebarBlock, 'order') ?? Number.MAX_SAFE_INTEGER),
  hidden: readBlockValue(sidebarBlock, 'hidden') === 'true',
  sidebarLabel: readBlockValue(sidebarBlock, 'label'),
  sidebarCollapsed: readBlockValue(sidebarBlock, 'collapsed') === 'true' ? true : undefined,
};
```

- [ ] **Step 2: Pass collapsed metadata into generated groups**

```ts
sidebarEntries.push({
  label: landingPage.meta.sidebarLabel ?? entry.name,
  items,
  collapsed: landingPage.meta.sidebarCollapsed,
  order: landingPage.meta.order,
  relativePath: landingPage.relativePath,
});
```

- [ ] **Step 3: Run focused test to verify GREEN**

Run: `pnpm test src/tests/docs/sidebar-config.test.ts` Expected: PASS

### Task 3: Opt target Docs groups into collapsed-by-default behavior

**Files:**

- Modify: `src/content/docs/docs/components/index.md`
- Modify: `src/content/docs/docs/guides/index.md`
- Modify: `src/content/docs/docs/diy/index.md`

- [ ] **Step 1: Add frontmatter flag to components index**

```md
sidebar: label: Components order: 2 collapsed: true
```

- [ ] **Step 2: Add frontmatter flag to guides index**

```md
sidebar: label: Guides order: 3 hidden: true collapsed: true
```

- [ ] **Step 3: Add frontmatter flag to diy index**

```md
sidebar: label: DIY Reference order: 4 hidden: true collapsed: true
```

- [ ] **Step 4: Re-run focused sidebar config test**

Run: `pnpm test src/tests/docs/sidebar-config.test.ts` Expected: PASS

### Task 4: Verify whole-site integration

**Files:**

- Verify only: `astro.config.mjs`
- Verify only: `src/utils/docs-sidebar.ts`
- Verify only: `src/content/docs/docs/components/index.md`
- Verify only: `src/content/docs/docs/guides/index.md`
- Verify only: `src/content/docs/docs/diy/index.md`

- [ ] **Step 1: Run full test suite**

Run: `pnpm test` Expected: PASS

- [ ] **Step 2: Run production build**

Run: `pnpm build` Expected: PASS with Astro check and site build succeeding

- [ ] **Step 3: Inspect git diff for scope sanity**

Run:
`git diff -- docs/superpowers/specs/2026-04-14-docs-sidebar-collapsed-design.md docs/superpowers/plans/2026-04-14-docs-sidebar-collapsed.md src/utils/docs-sidebar.ts src/tests/docs/sidebar-config.test.ts src/content/docs/docs/components/index.md src/content/docs/docs/guides/index.md src/content/docs/docs/diy/index.md`
Expected: Only spec, plan, tests, sidebar builder, and three docs index files changed
