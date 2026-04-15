# Technical SEO Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `opensimgear.org` technically search-ready by default by enforcing index hygiene, centralizing metadata
and schema generation, protecting stable section roots, and adding automated SEO guardrails.

**Architecture:** Add a small SEO policy layer for indexability decisions, then extend the current title-only metadata
flow into a shared metadata transformer that can set canonical, robots, Open Graph, Twitter, and schema tags from one
place. Back it with route regression tests and repository-level guardrail tests so future content or slug changes cannot
silently reintroduce broken section roots, placeholder indexable pages, or missing metadata.

**Tech Stack:** Astro 6, Starlight, TypeScript, Vitest, static `public/` assets

---

### Task 1: Lock in section-root behavior for `/3rdparty/`

**Files:**

- Modify: `src/tests/docs/sidebar-config.test.ts`
- Test: `src/tests/docs/sidebar-config.test.ts`

- [ ] **Step 1: Update failing test to assert the current `/3rdparty/` root link instead of the old
      `/3rdparty/overview/` path**

```ts
it('uses configured basePath for third-party docs slugs', () => {
  const sidebar = buildDocsSidebar({ docsRoot: thirdPartyRoot, basePath: '/3rdparty' });

  expect(sidebar).toContainEqual({
    label: 'Overview',
    link: '/3rdparty/',
  });

  const beltTensionerGroup = sidebar.find((item) => item.label === 'Belt Tensioner');

  if (!beltTensionerGroup || !('items' in beltTensionerGroup)) {
    throw new Error('Expected Belt Tensioner to be a sidebar group');
  }

  expect(beltTensionerGroup.items).toContainEqual({
    label: 'Flag Ghost Belt Tensioner',
    link: '/3rdparty/belt-tensioner/flagghost/',
  });
});
```

- [ ] **Step 2: Add a second regression test that proves top-level `index.md` always maps to the basePath root**

```ts
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
```

- [ ] **Step 3: Run the focused docs sidebar test file to confirm the regression is covered**

Run: `pnpm test src/tests/docs/sidebar-config.test.ts`

Expected: PASS, with the updated `/3rdparty/` expectations and no remaining references to `/3rdparty/overview/`

- [ ] **Step 4: Commit the route regression coverage**

```bash
git add src/tests/docs/sidebar-config.test.ts
git commit -m "test: cover third-party section root"
```

### Task 2: Add SEO policy tests for indexable versus `noindex` pages

**Files:**

- Create: `src/tests/docs/seo-policy.test.ts`
- Create: `src/utils/seo-policy.ts`
- Test: `src/tests/docs/seo-policy.test.ts`

- [ ] **Step 1: Write failing tests for canonical URL generation, default preview image generation, and
      placeholder-route `noindex` policy**

```ts
import { describe, expect, it } from 'vitest';

import { buildCanonicalUrl, buildDefaultSocialImageUrl, getSeoPolicy } from '../../utils/seo-policy';

describe('getSeoPolicy', () => {
  it('marks known placeholder gear routes as noindex', () => {
    expect(getSeoPolicy('/gear/')).toEqual({ index: false, follow: true });
    expect(getSeoPolicy('/gear/hand-brake/')).toEqual({ index: false, follow: true });
  });

  it('keeps published docs routes indexable by default', () => {
    expect(getSeoPolicy('/docs/components/')).toEqual({ index: true, follow: true });
  });
});

describe('buildCanonicalUrl', () => {
  it('builds an absolute canonical URL from the configured site origin and pathname', () => {
    expect(buildCanonicalUrl('https://www.opensimgear.org', '/3rdparty/')).toBe(
      'https://www.opensimgear.org/3rdparty/'
    );
  });
});

describe('buildDefaultSocialImageUrl', () => {
  it('builds an absolute social preview image URL', () => {
    expect(buildDefaultSocialImageUrl('https://www.opensimgear.org')).toBe(
      'https://www.opensimgear.org/social-preview-default.svg'
    );
  });
});
```

- [ ] **Step 2: Run the focused test file to verify RED because the SEO policy module does not exist yet**

Run: `pnpm test src/tests/docs/seo-policy.test.ts`

Expected: FAIL with a module resolution error for `../../utils/seo-policy`

- [ ] **Step 3: Add the minimal SEO policy implementation to satisfy the tests**

```ts
type SeoPolicy = {
  index: boolean;
  follow: boolean;
};

const NOINDEX_PREFIXES = ['/gear/'];

export function getSeoPolicy(pathname: string): SeoPolicy {
  const normalizedPath = pathname.endsWith('/') ? pathname : `${pathname}/`;
  const shouldNoindex = NOINDEX_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));

  return {
    index: !shouldNoindex,
    follow: true,
  };
}

export function buildCanonicalUrl(site: string, pathname: string) {
  return new URL(pathname, site).toString();
}

export function buildDefaultSocialImageUrl(site: string) {
  return new URL('/social-preview-default.svg', site).toString();
}
```

- [ ] **Step 4: Re-run the focused SEO policy test file to verify GREEN**

Run: `pnpm test src/tests/docs/seo-policy.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the SEO policy module and tests**

```bash
git add src/utils/seo-policy.ts src/tests/docs/seo-policy.test.ts
git commit -m "feat: add seo index policy"
```

### Task 3: Expand the head logic into a shared metadata transformer

**Files:**

- Create: `src/tests/docs/seo-meta.test.ts`
- Create: `src/utils/seo-meta.ts`
- Modify: `src/components/overrides/Head.astro`
- Test: `src/tests/docs/seo-meta.test.ts`

- [ ] **Step 1: Write failing tests for canonical, robots, Open Graph, and Twitter defaults**

```ts
import { describe, expect, it } from 'vitest';

import type { StarlightRouteData } from '@astrojs/starlight/route-data';

import { applySeoMetadata } from '../../utils/seo-meta';

type HeadEntry = StarlightRouteData['head'][number];

const baseHead: StarlightRouteData['head'] = [
  { tag: 'title', content: 'Overview | OpenSimGear' },
  { tag: 'meta', attrs: { name: 'description', content: 'Existing description' } },
  { tag: 'meta', attrs: { property: 'og:title', content: 'Overview | OpenSimGear' } },
  { tag: 'meta', attrs: { name: 'twitter:title', content: 'Overview | OpenSimGear' } },
];

function findEntry(head: StarlightRouteData['head'], tag: string, attrName: string, attrValue: string) {
  return head.find((entry) => entry.tag === tag && entry.attrs?.[attrName] === attrValue);
}

describe('applySeoMetadata', () => {
  it('adds canonical, robots, og:image, and twitter:image defaults', () => {
    const head = applySeoMetadata({
      head: baseHead,
      pathname: '/docs/components/',
      site: 'https://www.opensimgear.org',
      seoTitle: 'Components Overview | OpenSimGear',
      description: 'Browse the main hardware categories used in sim racing and flight simulation.',
      robots: { index: true, follow: true },
      defaultImageUrl: 'https://www.opensimgear.org/social-preview-default.svg',
    });

    expect(findEntry(head, 'link', 'rel', 'canonical')).toEqual({
      tag: 'link',
      attrs: { rel: 'canonical', href: 'https://www.opensimgear.org/docs/components/' },
    });

    expect(findEntry(head, 'meta', 'name', 'robots')).toEqual({
      tag: 'meta',
      attrs: { name: 'robots', content: 'index, follow' },
    });

    expect(findEntry(head, 'meta', 'property', 'og:image')).toEqual({
      tag: 'meta',
      attrs: { property: 'og:image', content: 'https://www.opensimgear.org/social-preview-default.svg' },
    });

    expect(findEntry(head, 'meta', 'name', 'twitter:image')).toEqual({
      tag: 'meta',
      attrs: { name: 'twitter:image', content: 'https://www.opensimgear.org/social-preview-default.svg' },
    });
  });

  it('writes noindex, follow for placeholder pages', () => {
    const head = applySeoMetadata({
      head: baseHead,
      pathname: '/gear/',
      site: 'https://www.opensimgear.org',
      seoTitle: 'Gear Overview | OpenSimGear',
      description: 'Browse open-source sim racing and flight simulation gear designs.',
      robots: { index: false, follow: true },
      defaultImageUrl: 'https://www.opensimgear.org/social-preview-default.svg',
    });

    expect(findEntry(head, 'meta', 'name', 'robots')).toEqual({
      tag: 'meta',
      attrs: { name: 'robots', content: 'noindex, follow' },
    });
  });
});
```

- [ ] **Step 2: Run the focused metadata test file to verify RED because the shared metadata module does not exist yet**

Run: `pnpm test src/tests/docs/seo-meta.test.ts`

Expected: FAIL with a module resolution error for `../../utils/seo-meta`

- [ ] **Step 3: Implement the shared metadata transformer with tag upsert helpers**

```ts
import type { StarlightRouteData } from '@astrojs/starlight/route-data';

import { buildCanonicalUrl } from './seo-policy';

type HeadEntry = StarlightRouteData['head'][number];

type ApplySeoMetadataOptions = {
  head: StarlightRouteData['head'];
  pathname: string;
  site: string;
  seoTitle: string;
  description: string;
  robots: { index: boolean; follow: boolean };
  defaultImageUrl: string;
};

function upsertMeta(
  head: StarlightRouteData['head'],
  attrName: 'name' | 'property',
  attrValue: string,
  content: string
) {
  const existing = head.find((entry) => entry.tag === 'meta' && entry.attrs?.[attrName] === attrValue);

  if (existing) {
    existing.attrs = { ...existing.attrs, content };
    return;
  }

  head.push({
    tag: 'meta',
    attrs: { [attrName]: attrValue, content },
  } as HeadEntry);
}

function upsertCanonical(head: StarlightRouteData['head'], href: string) {
  const existing = head.find((entry) => entry.tag === 'link' && entry.attrs?.rel === 'canonical');

  if (existing) {
    existing.attrs = { ...existing.attrs, href };
    return;
  }

  head.push({ tag: 'link', attrs: { rel: 'canonical', href } } as HeadEntry);
}

export function applySeoMetadata({
  head,
  pathname,
  site,
  seoTitle,
  description,
  robots,
  defaultImageUrl,
}: ApplySeoMetadataOptions) {
  const nextHead = [...head];
  const robotsContent = `${robots.index ? 'index' : 'noindex'}, ${robots.follow ? 'follow' : 'nofollow'}`;
  const canonical = buildCanonicalUrl(site, pathname);

  upsertCanonical(nextHead, canonical);
  upsertMeta(nextHead, 'name', 'description', description);
  upsertMeta(nextHead, 'name', 'robots', robotsContent);
  upsertMeta(nextHead, 'property', 'og:title', seoTitle);
  upsertMeta(nextHead, 'property', 'og:description', description);
  upsertMeta(nextHead, 'property', 'og:url', canonical);
  upsertMeta(nextHead, 'property', 'og:image', defaultImageUrl);
  upsertMeta(nextHead, 'name', 'twitter:title', seoTitle);
  upsertMeta(nextHead, 'name', 'twitter:description', description);
  upsertMeta(nextHead, 'name', 'twitter:card', 'summary_large_image');
  upsertMeta(nextHead, 'name', 'twitter:image', defaultImageUrl);

  return nextHead;
}
```

- [ ] **Step 4: Wire the new metadata transformer into the head override**

```astro
---
import Default from '@astrojs/starlight/components/Head.astro';
import GoogleAnalytics from '~/components/util/GoogleAnalytics.astro';
import { config } from '~/config';
import { applySeoMetadata } from '~/utils/seo-meta';
import { buildSeoPageTitle, replaceSeoTitleTags } from '~/utils/page-title';
import { buildDefaultSocialImageUrl, getSeoPolicy } from '~/utils/seo-policy';

const { starlightRoute } = Astro.locals;
const seoTitle = buildSeoPageTitle({
  pageTitle: starlightRoute.entry.data.title,
  siteTitle: starlightRoute.siteTitle,
  pathname: Astro.url.pathname,
  sidebar: starlightRoute.sidebar,
});
const seoDescription = starlightRoute.entry.data.description ?? '';
const seoRobots = getSeoPolicy(Astro.url.pathname);

starlightRoute.head = replaceSeoTitleTags(starlightRoute.head, seoTitle);
starlightRoute.head = applySeoMetadata({
  head: starlightRoute.head,
  pathname: Astro.url.pathname,
  site: config.site,
  seoTitle,
  description: seoDescription,
  robots: seoRobots,
  defaultImageUrl: buildDefaultSocialImageUrl(config.site),
});
---
```

- [ ] **Step 5: Re-run the focused metadata test file to verify GREEN**

Run: `pnpm test src/tests/docs/seo-meta.test.ts`

Expected: PASS

- [ ] **Step 6: Commit the shared metadata transformer**

```bash
git add src/utils/seo-meta.ts src/components/overrides/Head.astro src/tests/docs/seo-meta.test.ts
git commit -m "feat: centralize seo metadata tags"
```

### Task 4: Add structured data helpers for homepage and breadcrumb-capable docs pages

**Files:**

- Create: `src/tests/docs/structured-data.test.ts`
- Create: `src/utils/structured-data.ts`
- Modify: `src/components/overrides/Head.astro`
- Test: `src/tests/docs/structured-data.test.ts`

- [ ] **Step 1: Write failing tests for homepage organization and website schema plus breadcrumb schema generation**

```ts
import { describe, expect, it } from 'vitest';

import { buildBreadcrumbSchema, buildSiteSchemas } from '../../utils/structured-data';

describe('buildSiteSchemas', () => {
  it('builds organization and website schema for the homepage', () => {
    const scripts = buildSiteSchemas({
      site: 'https://www.opensimgear.org',
      title: 'OpenSimGear',
    });

    expect(scripts).toHaveLength(2);
    expect(scripts[0]).toContain('Organization');
    expect(scripts[1]).toContain('WebSite');
  });
});

describe('buildBreadcrumbSchema', () => {
  it('builds breadcrumb schema when page and parent labels are known', () => {
    expect(
      buildBreadcrumbSchema({
        site: 'https://www.opensimgear.org',
        pathname: '/docs/components/',
        labels: ['Docs', 'Components', 'Overview'],
      })
    ).toContain('BreadcrumbList');
  });
});
```

- [ ] **Step 2: Run the focused structured-data test file to verify RED because the helper module does not exist yet**

Run: `pnpm test src/tests/docs/structured-data.test.ts`

Expected: FAIL with a module resolution error for `../../utils/structured-data`

- [ ] **Step 3: Implement structured-data helpers that return JSON-LD strings**

```ts
type BreadcrumbSchemaOptions = {
  site: string;
  pathname: string;
  labels: string[];
};

type SiteSchemaOptions = {
  site: string;
  title: string;
};

export function buildSiteSchemas({ site, title }: SiteSchemaOptions) {
  return [
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: title,
      url: site,
    }),
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: title,
      url: site,
    }),
  ];
}

export function buildBreadcrumbSchema({ site, pathname, labels }: BreadcrumbSchemaOptions) {
  if (labels.length < 2) {
    return undefined;
  }

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: labels.map((name, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: index === labels.length - 1 ? new URL(pathname, site).toString() : undefined,
    })),
  });
}
```

- [ ] **Step 4: Emit the JSON-LD scripts from the head override for homepage and breadcrumb-capable docs pages**

```astro
---
import { buildBreadcrumbSchema, buildSiteSchemas } from '~/utils/structured-data';

const breadcrumbLabels = [
  starlightRoute.sidebar.find((entry) => entry.type === 'group' && Astro.url.pathname.startsWith('/docs/'))?.label,
  starlightRoute.entry.data.title,
].filter(Boolean) as string[];

const siteSchemas =
  Astro.url.pathname === '/' ? buildSiteSchemas({ site: config.site, title: starlightRoute.siteTitle }) : [];
const breadcrumbSchema = Astro.url.pathname.startsWith('/docs/')
  ? buildBreadcrumbSchema({
      site: config.site,
      pathname: Astro.url.pathname,
      labels: breadcrumbLabels,
    })
  : undefined;
---

<Default {...Astro.props}><slot /></Default>
{siteSchemas.map((schema) => <script type="application/ld+json" set:html={schema} />)}
{breadcrumbSchema && <script type="application/ld+json" set:html={breadcrumbSchema} />}
{import.meta.env.PROD && <GoogleAnalytics />}
```

- [ ] **Step 5: Re-run the focused structured-data test file to verify GREEN**

Run: `pnpm test src/tests/docs/structured-data.test.ts`

Expected: PASS

- [ ] **Step 6: Commit the structured-data layer**

```bash
git add src/utils/structured-data.ts src/components/overrides/Head.astro src/tests/docs/structured-data.test.ts
git commit -m "feat: add seo structured data"
```

### Task 5: Add a default social preview asset and connect it to production metadata

**Files:**

- Create: `public/social-preview-default.svg`
- Modify: `src/tests/docs/seo-policy.test.ts`
- Test: `src/tests/docs/seo-policy.test.ts`

- [ ] **Step 1: Add a simple branded SVG preview asset that can ship immediately**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">OpenSimGear Social Preview</title>
  <desc id="desc">OpenSimGear open-source sim racing and flight simulation hardware.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" rx="32" />
  <g fill="#e2e8f0">
    <text x="84" y="228" font-size="86" font-family="system-ui, sans-serif" font-weight="700">OpenSimGear</text>
    <text x="84" y="314" font-size="34" font-family="system-ui, sans-serif">Open-source sim racing and flight simulation hardware</text>
    <text x="84" y="404" font-size="28" font-family="system-ui, sans-serif" fill="#94a3b8">Docs, calculators, DIY reference, and community-built gear</text>
  </g>
</svg>
```

- [ ] **Step 2: Extend the SEO policy test to assert the default asset path exists in generated URLs**

```ts
it('uses the default social preview asset path', () => {
  expect(buildDefaultSocialImageUrl('https://www.opensimgear.org')).toBe(
    'https://www.opensimgear.org/social-preview-default.svg'
  );
});
```

- [ ] **Step 3: Run the focused SEO policy test file to confirm the asset path still matches production metadata
      behavior**

Run: `pnpm test src/tests/docs/seo-policy.test.ts`

Expected: PASS

- [ ] **Step 4: Commit the default social preview asset**

```bash
git add public/social-preview-default.svg src/tests/docs/seo-policy.test.ts
git commit -m "feat: add default social preview asset"
```

### Task 6: Add repository guardrails for empty descriptions and placeholder indexable pages

**Files:**

- Create: `src/tests/docs/seo-guardrails.test.ts`
- Create: `src/utils/docs-frontmatter.ts`
- Modify: `src/utils/seo-policy.ts`
- Test: `src/tests/docs/seo-guardrails.test.ts`

- [ ] **Step 1: Write failing repository-level tests that scan docs content and reject indexable placeholder pages**

```ts
import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseDocFrontmatter } from '../../utils/docs-frontmatter';
import { getSeoPolicy } from '../../utils/seo-policy';

const docsRoot = path.resolve(process.cwd(), 'src/content/docs');

function collectDocFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const resolved = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectDocFiles(resolved);
    return /\.mdx?$/.test(entry.name) ? [resolved] : [];
  });
}

describe('SEO content guardrails', () => {
  it('requires every indexable doc page to have a non-empty description', () => {
    const offenders = collectDocFiles(docsRoot)
      .map((filePath) => ({ filePath, parsed: parseDocFrontmatter(filePath) }))
      .filter(({ parsed }) => getSeoPolicy(parsed.pathname).index)
      .filter(({ parsed }) => parsed.description.trim().length === 0)
      .map(({ filePath }) => filePath);

    expect(offenders).toEqual([]);
  });

  it('rejects placeholder copy on indexable doc pages', () => {
    const offenders = collectDocFiles(docsRoot)
      .map((filePath) => ({ filePath, parsed: parseDocFrontmatter(filePath) }))
      .filter(({ parsed }) => getSeoPolicy(parsed.pathname).index)
      .filter(({ parsed }) => /coming soon/i.test(parsed.body))
      .map(({ filePath }) => filePath);

    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the guardrail test file to verify RED against the current repository state**

Run: `pnpm test src/tests/docs/seo-guardrails.test.ts`

Expected: FAIL, initially surfacing the current placeholder gear pages as indexable offenders

- [ ] **Step 3: Add a small frontmatter parser helper and teach the SEO policy to noindex the known placeholder gear
      section**

```ts
// src/utils/docs-frontmatter.ts
import fs from 'node:fs';
import path from 'node:path';

function toPathname(filePath: string) {
  const relativePath = path.relative(path.resolve(process.cwd(), 'src/content/docs'), filePath).replace(/\\/g, '/');
  const withoutExtension = relativePath.replace(/\.mdx?$/, '');
  const slug = withoutExtension === 'index' ? '' : withoutExtension.replace(/\/index$/, '');
  return slug ? `/${slug}/` : '/';
}

export function parseDocFrontmatter(filePath: string) {
  const source = fs.readFileSync(filePath, 'utf8');
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    throw new Error(`Missing frontmatter in ${filePath}`);
  }

  const frontmatter = match[1];
  const body = match[2];
  const singleLineDescription = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim();
  const multilineDescription = frontmatter.match(/^description:\s*\n((?:[ \t].*\n?)*)/m)?.[1] ?? '';
  const description =
    singleLineDescription && singleLineDescription !== ''
      ? singleLineDescription
      : multilineDescription.replace(/^[ \t]+/gm, '').trim();

  return {
    pathname: toPathname(filePath),
    description,
    body,
  };
}

// src/utils/seo-policy.ts
const NOINDEX_PREFIXES = ['/gear/'];
```

- [ ] **Step 4: Re-run the guardrail test file to verify GREEN after the placeholder routes become `noindex` and
      multiline descriptions parse correctly**

Run: `pnpm test src/tests/docs/seo-guardrails.test.ts`

Expected: PASS

- [ ] **Step 5: Commit the repository guardrails**

```bash
git add src/utils/docs-frontmatter.ts src/utils/seo-policy.ts src/tests/docs/seo-guardrails.test.ts
git commit -m "test: add seo content guardrails"
```

### Task 7: Run verification suite and fix any integration fallout

**Files:**

- Modify: `src/components/overrides/Head.astro`
- Modify: `src/utils/seo-meta.ts`
- Modify: `src/utils/structured-data.ts`
- Modify: `src/utils/seo-policy.ts`
- Modify: `src/tests/docs/sidebar-config.test.ts`
- Modify: `src/tests/docs/seo-policy.test.ts`
- Modify: `src/tests/docs/seo-meta.test.ts`
- Modify: `src/tests/docs/structured-data.test.ts`
- Modify: `src/tests/docs/seo-guardrails.test.ts`

- [ ] **Step 1: Run all docs SEO-focused tests together**

Run:
`pnpm test src/tests/docs/sidebar-config.test.ts src/tests/docs/page-title.test.ts src/tests/docs/seo-policy.test.ts src/tests/docs/seo-meta.test.ts src/tests/docs/structured-data.test.ts src/tests/docs/seo-guardrails.test.ts`

Expected: PASS

- [ ] **Step 2: Run the full project test suite to catch unrelated fallout**

Run: `pnpm test`

Expected: PASS

- [ ] **Step 3: Run the production build to verify Astro, Starlight, sitemap, and head generation still succeed**

Run: `pnpm build`

Expected: PASS, with the usual third-party package warnings but no build failures

- [ ] **Step 4: If any verification fails, make the smallest fix in the affected SEO module and re-run only the failing
      command before returning to the full verification sequence**

```ts
// Example minimal fix pattern in src/utils/seo-meta.ts
if (description.trim().length > 0) {
  upsertMeta(nextHead, 'name', 'description', description);
  upsertMeta(nextHead, 'property', 'og:description', description);
  upsertMeta(nextHead, 'name', 'twitter:description', description);
}
```

- [ ] **Step 5: Commit the verified technical SEO foundation**

```bash
git add src/components/overrides/Head.astro src/utils/seo-policy.ts src/utils/seo-meta.ts src/utils/structured-data.ts src/utils/docs-frontmatter.ts public/social-preview-default.svg src/tests/docs/sidebar-config.test.ts src/tests/docs/seo-policy.test.ts src/tests/docs/seo-meta.test.ts src/tests/docs/structured-data.test.ts src/tests/docs/seo-guardrails.test.ts
git commit -m "feat: add technical seo foundation"
```
