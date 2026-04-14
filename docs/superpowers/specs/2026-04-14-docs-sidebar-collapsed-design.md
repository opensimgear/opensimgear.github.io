# Docs Sidebar Collapsed Groups Design

## Goal

Make `components`, `guides`, and `diy` groups inside Docs sidebar render closed by default, while keeping top-level
`Docs` section open.

## Current State

- `astro.config.mjs` defines top-level `Docs` sidebar section and delegates its items to `buildDocsSidebar()`.
- `src/utils/docs-sidebar.ts` builds custom group objects from files under `src/content/docs/docs`.
- Group labels and ordering already come from section index frontmatter.
- No current support exists for per-group collapsed state.

## Proposed Change

Add optional `sidebar.collapsed` frontmatter support for section landing pages in `src/content/docs/docs/*/index.md`.

`buildDocsSidebar()` will:

- parse `sidebar.collapsed` from frontmatter
- attach `collapsed` to generated sidebar group objects when present
- preserve existing behavior when field is omitted

Section indexes will opt in explicitly:

- `src/content/docs/docs/components/index.md` -> `sidebar.collapsed: true`
- `src/content/docs/docs/guides/index.md` -> `sidebar.collapsed: true`
- `src/content/docs/docs/diy/index.md` -> `sidebar.collapsed: true`

## Why This Approach

- Keeps sidebar behavior next to section content metadata.
- Avoids hardcoded folder-name rules in application logic.
- Scales to future Docs groups without more code branching.
- Preserves current group order, labels, links, and hidden-page behavior.

## Data Flow

1. Section index frontmatter defines `sidebar.label`, `sidebar.order`, optional `sidebar.hidden`, optional
   `sidebar.collapsed`.
2. `parseFrontmatter()` reads values into page metadata.
3. `buildDocsSidebar()` uses landing page metadata to build sidebar group.
4. Starlight receives sidebar group object with `collapsed: true` for targeted sections.

## Error Handling and Compatibility

- Missing `sidebar.collapsed` means no `collapsed` property emitted, preserving current default behavior.
- Non-target sections remain unchanged.
- Top-level `Docs` group in `astro.config.mjs` remains open because only nested groups gain collapsed metadata.

## Testing

Add coverage in `src/tests/docs/sidebar-config.test.ts` for two cases:

- groups include `collapsed: true` when section landing page frontmatter sets it
- groups omit `collapsed` when frontmatter does not set it

Run:

- `pnpm test src/tests/docs/sidebar-config.test.ts`
- `pnpm build`

## Scope

This change only affects generated Docs sidebar group default expansion state. It does not change content ordering,
URLs, page visibility, or non-Docs sidebar sections.
