# Breadcrumb SEO Page Titles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate SEO-friendly metadata titles from page context while keeping visible page titles unchanged.

**Architecture:** Add a focused title helper that derives the current page's parent context from the Starlight sidebar
tree and rewrites generic page names like `Overview` into keyword-forward metadata titles. Then update the custom head
override to replace only title-related tags with the computed SEO title while preserving the rest of Starlight's
generated head.

**Tech Stack:** Astro, Starlight route locals, TypeScript, Vitest

---

### Task 1: Add failing tests for breadcrumb-aware SEO title generation

**Files:**

- Create: `src/tests/docs/page-title.test.ts`
- Test: `src/tests/docs/page-title.test.ts`

- [ ] **Step 1: Write failing tests for generic and descriptive titles**

```ts
import { describe, expect, it } from 'vitest';

import type { SidebarEntry } from '@astrojs/starlight/utils/routing/types';

import { buildSeoPageTitle } from '../../utils/page-title';

const gearSidebar: SidebarEntry[] = [
  {
    type: 'group',
    label: 'Gear',
    collapsed: false,
    badge: undefined,
    entries: [{ type: 'link', label: 'Overview', href: '/gear/', isCurrent: true, badge: undefined, attrs: {} }],
  },
];

const thirdPartySidebar: SidebarEntry[] = [
  {
    type: 'group',
    label: '3rd Party',
    collapsed: false,
    badge: undefined,
    entries: [
      {
        type: 'group',
        label: 'Belt Tensioner',
        collapsed: false,
        badge: undefined,
        entries: [
          {
            type: 'link',
            label: 'SilentChill oDrive Belt Tensioner',
            href: '/3rdparty/belt-tensioner/silentchill/',
            isCurrent: true,
            badge: undefined,
            attrs: {},
          },
        ],
      },
    ],
  },
];

describe('buildSeoPageTitle', () => {
  it('rewrites generic section index titles with parent context', () => {
    expect(
      buildSeoPageTitle({
        pageTitle: 'Overview',
        siteTitle: 'OpenSimGear',
        pathname: '/gear/',
        sidebar: gearSidebar,
      })
    ).toBe('Gear Overview | OpenSimGear');
  });

  it('keeps descriptive titles first and includes parent section context', () => {
    expect(
      buildSeoPageTitle({
        pageTitle: 'SilentChill oDrive Belt Tensioner',
        siteTitle: 'OpenSimGear',
        pathname: '/3rdparty/belt-tensioner/silentchill/',
        sidebar: thirdPartySidebar,
      })
    ).toBe('SilentChill oDrive Belt Tensioner | 3rd Party | OpenSimGear');
  });
});
```

- [ ] **Step 2: Run focused test to verify RED**

Run: `pnpm test src/tests/docs/page-title.test.ts` Expected: FAIL because `src/utils/page-title.ts` does not exist yet

- [ ] **Step 3: Add failing tests for fallback and deduplication**

```ts
it('falls back to the default page title pattern when page is not in sidebar', () => {
  expect(
    buildSeoPageTitle({
      pageTitle: 'Overview',
      siteTitle: 'OpenSimGear',
      pathname: '/gear/',
      sidebar: [],
    })
  ).toBe('Overview | OpenSimGear');
});

it('avoids repeating parent labels after generic-title normalization', () => {
  expect(
    buildSeoPageTitle({
      pageTitle: 'Gear',
      siteTitle: 'OpenSimGear',
      pathname: '/gear/',
      sidebar: gearSidebar,
    })
  ).toBe('Gear | OpenSimGear');
});
```

- [ ] **Step 4: Re-run focused test to verify RED still correct**

Run: `pnpm test src/tests/docs/page-title.test.ts` Expected: FAIL only because the new helper is still missing

### Task 2: Implement the SEO title helper with minimal normalization rules

**Files:**

- Create: `src/utils/page-title.ts`
- Test: `src/tests/docs/page-title.test.ts`

- [ ] **Step 1: Add helper types and sidebar traversal helpers**

```ts
import type { SidebarEntry, SidebarGroup, SidebarLink } from '@astrojs/starlight/utils/routing/types';

type BuildSeoPageTitleOptions = {
  pageTitle: string;
  siteTitle: string;
  pathname: string;
  sidebar: SidebarEntry[];
};

type SidebarMatch = {
  link: SidebarLink;
  parents: string[];
};

function normalizePathname(pathname: string) {
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

function findSidebarMatch(entries: SidebarEntry[], pathname: string, parents: string[] = []): SidebarMatch | undefined {
  for (const entry of entries) {
    if (entry.type === 'link' && normalizePathname(entry.href) === pathname) {
      return { link: entry, parents };
    }

    if (entry.type === 'group') {
      const match = findSidebarMatch(entry.entries, pathname, [...parents, entry.label]);
      if (match) return match;
    }
  }
}
```

- [ ] **Step 2: Implement minimal SEO title composition**

```ts
function buildDefaultTitle(pageTitle: string, siteTitle: string) {
  return `${pageTitle} | ${siteTitle}`;
}

function isGenericTitle(title: string) {
  return ['overview'].includes(title.trim().toLowerCase());
}

function dedupe(parts: string[]) {
  return parts.filter((part, index) => part && parts.indexOf(part) === index);
}

export function buildSeoPageTitle({ pageTitle, siteTitle, pathname, sidebar }: BuildSeoPageTitleOptions) {
  const normalizedPathname = normalizePathname(pathname);
  const match = findSidebarMatch(sidebar, normalizedPathname);

  if (!match) {
    return buildDefaultTitle(pageTitle, siteTitle);
  }

  const nearestParent = match.parents.at(-1);
  if (isGenericTitle(pageTitle) && nearestParent) {
    return dedupe([`${nearestParent} ${pageTitle}`, siteTitle]).join(' | ');
  }

  const topLevelParent = match.parents[0];
  return dedupe([pageTitle, topLevelParent, siteTitle]).join(' | ');
}
```

- [ ] **Step 3: Run focused test to verify GREEN**

Run: `pnpm test src/tests/docs/page-title.test.ts` Expected: PASS

### Task 3: Replace head title tags with the computed SEO title

**Files:**

- Modify: `src/components/overrides/Head.astro`
- Modify: `src/utils/page-title.ts`
- Test: `src/tests/docs/page-title.test.ts`

- [ ] **Step 1: Update the helper to also expose title-tag matching support if needed**

```ts
export function isTitleTag(tag: { tag: string; attrs?: Record<string, string> }) {
  return (
    tag.tag === 'title' ||
    (tag.tag === 'meta' && tag.attrs?.property === 'og:title') ||
    (tag.tag === 'meta' && tag.attrs?.name === 'twitter:title')
  );
}
```

- [ ] **Step 2: Replace default title tags in the custom head override**

```astro
---
import GoogleAnalytics from '~/components/util/GoogleAnalytics.astro';
import { buildSeoPageTitle, isTitleTag } from '~/utils/page-title';

const route = Astro.locals.starlightRoute;
const seoTitle = buildSeoPageTitle({
  pageTitle: route.entry.data.title,
  siteTitle: route.siteTitle,
  pathname: Astro.url.pathname,
  sidebar: route.sidebar,
});

const head = route.head.map((entry) => {
  if (entry.tag === 'title') {
    return { ...entry, content: seoTitle };
  }

  if (entry.tag === 'meta' && entry.attrs?.property === 'og:title') {
    return { ...entry, attrs: { ...entry.attrs, content: seoTitle } };
  }

  if (entry.tag === 'meta' && entry.attrs?.name === 'twitter:title') {
    return { ...entry, attrs: { ...entry.attrs, content: seoTitle } };
  }

  return entry;
});
---

{head.map(({ tag: Tag, attrs, content }) => <Tag {...attrs} set:html={content} />)}
{import.meta.env.PROD && <GoogleAnalytics />}
```

- [ ] **Step 3: Add focused helper coverage for title-tag matching if helper extraction was needed**

```ts
it('identifies html and social title tags for replacement', () => {
  expect(isTitleTag({ tag: 'title' })).toBe(true);
  expect(isTitleTag({ tag: 'meta', attrs: { property: 'og:title' } })).toBe(true);
  expect(isTitleTag({ tag: 'meta', attrs: { name: 'twitter:title' } })).toBe(true);
  expect(isTitleTag({ tag: 'meta', attrs: { name: 'description' } })).toBe(false);
});
```

- [ ] **Step 4: Run focused test to verify GREEN remains intact**

Run: `pnpm test src/tests/docs/page-title.test.ts` Expected: PASS

### Task 4: Verify site integration and guard against regressions

**Files:**

- Verify only: `src/utils/page-title.ts`
- Verify only: `src/components/overrides/Head.astro`
- Verify only: `src/tests/docs/page-title.test.ts`

- [ ] **Step 1: Run full test suite**

Run: `pnpm test` Expected: PASS

- [ ] **Step 2: Run production build**

Run: `pnpm build` Expected: PASS with `astro check` and `astro build` succeeding

- [ ] **Step 3: Inspect git diff for scope sanity**

Run:
`git diff -- docs/superpowers/specs/2026-04-14-breadcrumb-seo-page-titles-design.md docs/superpowers/plans/2026-04-14-breadcrumb-seo-page-titles.md src/components/overrides/Head.astro src/utils/page-title.ts src/tests/docs/page-title.test.ts`

Expected: Only spec, plan, title helper, head override, and focused tests changed
