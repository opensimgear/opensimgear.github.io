# Docs Sidebar Slugs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `buildDocsSidebar()` generate correct links for both `/docs/...` and `/3rdparty/...` content trees.

**Architecture:** Move sidebar generation to an explicit config object with `docsRoot` and `basePath`, then thread
`basePath` into link generation instead of hardcoding `/docs`. Keep sorting, grouping, labels, hidden filtering, and
collapsed behavior unchanged.

**Tech Stack:** Astro, Starlight, TypeScript, Vitest, Node `fs`/`path`

---

## File Structure

- Modify: `src/utils/docs-sidebar.ts`
  - add explicit config type for sidebar generation
  - update link builder to accept `basePath`
  - update `buildDocsSidebar()` implementation to use config object
- Modify: `src/tests/docs/sidebar-config.test.ts`
  - keep existing docs assertions working by passing `/docs`
  - add regression coverage for `/3rdparty`
- Modify: `astro.config.mjs`
  - pass `{ docsRoot, basePath }` for `Docs` and `3rd Party`

### Task 1: Add failing regression test for third-party slugs

**Files:**

- Modify: `src/tests/docs/sidebar-config.test.ts`
- Test: `src/tests/docs/sidebar-config.test.ts`

- [ ] **Step 1: Write failing test**

Add `thirdPartyRoot` near existing `docsRoot` constant:

```ts
const docsRoot = path.resolve(process.cwd(), 'src/content/docs/docs');
const thirdPartyRoot = path.resolve(process.cwd(), 'src/content/docs/3rdparty');
```

Add this test near other `buildDocsSidebar` coverage:

```ts
it('uses configured basePath for third-party docs slugs', () => {
  const sidebar = buildDocsSidebar({
    docsRoot: thirdPartyRoot,
    basePath: '/3rdparty',
  });

  expect(sidebar).toContainEqual({
    label: '3rd Party Overview',
    link: '/3rdparty/overview/',
  });

  const beltTensionerGroup = sidebar.find((item) => item.label === 'Belt Tensioner');

  if (!beltTensionerGroup || !('items' in beltTensionerGroup)) {
    throw new Error('Expected Belt Tensioner to be a sidebar group');
  }

  expect(beltTensionerGroup.items).toContainEqual({
    label: 'Belt Tensioner Overview',
    link: '/3rdparty/belt-tensioner/',
  });
  expect(beltTensionerGroup.items).toContainEqual({
    label: 'FlagGhost',
    link: '/3rdparty/belt-tensioner/flagghost/',
  });
});
```

- [ ] **Step 2: Update existing test calls to explicit docs base path**

Replace each current call like:

```ts
buildDocsSidebar({ docsRoot });
buildDocsSidebar({ docsRoot: fixtureRoot });
```

with:

```ts
buildDocsSidebar({ docsRoot, basePath: '/docs' });
buildDocsSidebar({ docsRoot: fixtureRoot, basePath: '/docs' });
```

This keeps docs tests explicit and type-consistent with new API.

- [ ] **Step 3: Run targeted test to verify it fails**

Run:

```bash
pnpm test src/tests/docs/sidebar-config.test.ts
```

Expected: FAIL because `src/utils/docs-sidebar.ts` still hardcodes `/docs/...` and still expects `dir: string` rather
than the object used by tests.

- [ ] **Step 4: Commit red test state only if working in isolated scratch commit flow**

Do not create a normal commit yet. Move directly to implementation.

### Task 2: Implement configurable base path in sidebar helper

**Files:**

- Modify: `src/utils/docs-sidebar.ts`
- Test: `src/tests/docs/sidebar-config.test.ts`

- [ ] **Step 1: Add explicit config type**

Near existing type declarations, add:

```ts
type BuildDocsSidebarOptions = {
  docsRoot: string;
  basePath: string;
};
```

- [ ] **Step 2: Make link builder accept base path**

Replace current helper:

```ts
function toDocLink(relativePath: string) {
  const withoutExtension = relativePath.replace(/\.mdx?$/, '');
  const slug = withoutExtension === 'index' ? '' : withoutExtension.replace(/\/index$/, '');

  return slug ? `/docs/${slug}/` : '/docs/';
}
```

with:

```ts
function toDocLink(relativePath: string, basePath: string) {
  const withoutExtension = relativePath.replace(/\.mdx?$/, '');
  const slug = withoutExtension === 'index' ? '' : withoutExtension.replace(/\/index$/, '');
  const normalizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;

  return slug ? `${normalizedBasePath}/${slug}/` : `${normalizedBasePath}/`;
}
```

- [ ] **Step 3: Update `buildDocsSidebar()` signature and root resolution**

Replace:

```ts
export function buildDocsSidebar(dir: string): SidebarItem[] {
  const docsRoot = path.resolve(process.cwd(), `src/content/docs/${dir}`);
```

with:

```ts
export function buildDocsSidebar({ docsRoot, basePath }: BuildDocsSidebarOptions): SidebarItem[] {
```

Use `docsRoot` directly inside function.

- [ ] **Step 4: Thread `basePath` into generated links**

Update both link creation sites from:

```ts
link: toDocLink(relativePath),
```

to:

```ts
link: toDocLink(relativePath, basePath),
```

- [ ] **Step 5: Run targeted test to verify helper passes**

Run:

```bash
pnpm test src/tests/docs/sidebar-config.test.ts
```

Expected: PASS.

### Task 3: Update Astro config to use explicit sidebar options

**Files:**

- Modify: `astro.config.mjs`
- Test: `src/tests/docs/sidebar-config.test.ts`

- [ ] **Step 1: Update Docs section call**

Replace:

```js
items: buildDocsSidebar('docs'),
```

with:

```js
items: buildDocsSidebar({
  docsRoot: path.resolve(__dirname, './src/content/docs/docs'),
  basePath: '/docs',
}),
```

- [ ] **Step 2: Update 3rd Party section call**

Replace:

```js
items: buildDocsSidebar('3rdparty'),
```

with:

```js
items: buildDocsSidebar({
  docsRoot: path.resolve(__dirname, './src/content/docs/3rdparty'),
  basePath: '/3rdparty',
}),
```

- [ ] **Step 3: Run targeted sidebar test again**

Run:

```bash
pnpm test src/tests/docs/sidebar-config.test.ts
```

Expected: PASS.

### Task 4: Verify full project build stays green

**Files:**

- Verify only: `src/utils/docs-sidebar.ts`, `src/tests/docs/sidebar-config.test.ts`, `astro.config.mjs`

- [ ] **Step 1: Run full test suite**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
pnpm build
```

Expected: PASS with `astro check` and `astro build` succeeding.

- [ ] **Step 3: Review changed files**

Inspect diff for only these intended behaviors:

- helper no longer hardcodes `/docs`
- tests cover `/docs` and `/3rdparty`
- Astro config passes explicit roots and base paths

- [ ] **Step 4: Commit final change**

Run:

```bash
git add astro.config.mjs src/utils/docs-sidebar.ts src/tests/docs/sidebar-config.test.ts
git commit -m "fix: support docs sidebar base paths"
```

Expected: commit created with only sidebar slug fix changes.
