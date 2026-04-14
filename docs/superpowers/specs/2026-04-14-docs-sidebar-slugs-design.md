# Docs Sidebar Slugs Design

## Context

- `astro.config.mjs` now calls `buildDocsSidebar('docs')` for the `Docs` section and `buildDocsSidebar('3rdparty')` for
  the `3rd Party` section.
- `src/utils/docs-sidebar.ts` currently hardcodes generated links to `/docs/...`.
- That hardcoded base path produces incorrect links for content loaded from `src/content/docs/3rdparty`, which should
  resolve under `/3rdparty/...`.
- Existing tests already indicate the helper should accept a configuration object with a filesystem root instead of a
  bare string, but the implementation still expects a string.

## Goal

Make `buildDocsSidebar()` generate correct links for both documentation trees while preserving current ordering,
grouping, label, and collapsed behavior.

## Recommended Approach

Normalize `buildDocsSidebar()` to accept a configuration object:

```ts
buildDocsSidebar({ docsRoot, basePath });
```

Why this approach:

- removes the hardcoded `/docs` assumption cleanly
- supports both `docs` and `3rdparty` without duplicating slug logic
- aligns implementation with existing tests and future extension points

## Design

### API

- Change `buildDocsSidebar()` to accept:
  - `docsRoot: string` - absolute filesystem path to the content subtree
  - `basePath: string` - URL prefix for generated links, such as `/docs` or `/3rdparty`
- Keep helper internal behavior the same otherwise.

### Link generation

- Replace the hardcoded `toDocLink()` logic with a version that receives `basePath`.
- Rules:
  - `index.md` or `index.mdx` at subtree root maps to `<basePath>/`
  - nested `section/index.md` maps to `<basePath>/section/`
  - nested `section/page.md` maps to `<basePath>/section/page/`
- Generated URLs should always end with `/`, matching current site style.

### Sidebar generation

- Keep directory traversal logic unchanged:
  - top-level files become sidebar links
  - top-level directories with landing pages become sidebar groups
  - landing page metadata still controls group label, order, and collapsed state
  - `sidebar.hidden` still excludes pages from output
- `3rdparty` should use same grouping and ordering rules as `docs`.

### Astro config integration

- Update `astro.config.mjs` to pass explicit config objects:

```ts
buildDocsSidebar({
  docsRoot: path.resolve(__dirname, './src/content/docs/docs'),
  basePath: '/docs',
});

buildDocsSidebar({
  docsRoot: path.resolve(__dirname, './src/content/docs/3rdparty'),
  basePath: '/3rdparty',
});
```

## Testing Plan

Follow TDD:

1. Add failing test proving `3rdparty` links use `/3rdparty/...` instead of `/docs/...`.
2. Keep existing docs tests passing with `/docs/...` links.
3. Verify grouped section indexes and regular pages both generate correct slugs for each base path.

## Error Handling

- No new runtime fallback behavior.
- Missing frontmatter or missing landing pages should continue behaving exactly as today.
- Scope stays focused on slug generation and input normalization only.

## Out of Scope

- changing sidebar structure
- changing Starlight routing conventions
- refactoring frontmatter parsing
- adding auto-detection of base path from filesystem location
