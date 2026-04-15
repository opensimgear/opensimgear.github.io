# Technical SEO Foundation Design

## Goal

Make `opensimgear.org` technically search-ready by default.

This work should ensure only worthwhile pages are indexable, centralize metadata and structured-data behavior, and add
automated guardrails so SEO regressions are caught during normal development.

## Why This Exists

The site already has sound crawl basics:

- `robots.txt` allows crawl and points at the sitemap
- sitemap generation is enabled and working
- canonical domain and HTTPS behavior are consistent
- recent title work improved one part of metadata generation

However, the site still has several structural SEO gaps:

- thin and placeholder pages remain indexable
- many content files still have missing or weak descriptions
- there is no shared schema layer
- there is no default social preview image system
- internal discovery does not fully match all published routes
- SEO regressions can slip in during routine content changes

This design defines technical foundation work only. It does not include the broader content strategy or editorial
rewrite program.

## Product Outcomes

### Primary outcome

Search engines should index only pages that are worth ranking, and every indexable page should emit strong technical SEO
signals by default.

### Business outcomes

- improve discoverability for docs and calculators
- improve trust through cleaner search snippets and link previews
- reduce crawl waste on placeholders and low-value pages
- reduce SEO regressions as docs content grows

### User outcomes

- shared links should render better previews
- important section roots should resolve consistently
- search snippets should better match page intent
- users should be able to discover important sections through navigation and internal links

## Success Criteria

The implementation should satisfy these measurable outcomes:

- zero intentionally indexable placeholder pages
- zero empty descriptions on indexable content
- shared metadata generation covers title, description, canonical, robots, Open Graph, and Twitter tags
- default social preview image exists for pages that do not define one explicitly
- homepage emits organization and website schema
- breadcrumb-capable documentation pages emit breadcrumb schema when page context is available
- sitemap contains only canonical, indexable URLs
- automated tests cover route stability for section roots such as `/3rdparty/`

## Scope

### In scope

- index versus `noindex` policy
- sitemap inclusion rules
- central metadata generation
- structured data defaults
- default Open Graph and Twitter preview image behavior
- section-root stability and redirect behavior where needed
- navigation and internal discovery improvements for important sections
- automated SEO regression guardrails

### Out of scope

- keyword research and SERP strategy
- bulk content rewriting
- backlink or off-site SEO work
- analytics dashboards and reporting workflows
- full editorial content program

## Current Context

This site uses Astro and Starlight.

Relevant current implementation points:

- `astro.config.mjs` configures the canonical site URL and sitemap generation
- `src/components/overrides/Head.astro` overrides Starlight head rendering
- `src/utils/page-title.ts` already contains breadcrumb-aware title logic
- documentation content lives under `src/content/docs/`
- generated section navigation currently depends on `buildDocsSidebar()` for some content groups

Recent work already improved metadata titles, especially for generic page names such as `Overview`. This design should
build on that foundation rather than replacing it with a separate parallel mechanism.

## Problem Statement

The biggest current SEO weakness is not crawlability. It is index hygiene and metadata completeness.

The site can be crawled and built correctly, but search engines are still exposed to pages that are too thin to rank
well, while richer metadata and structured data are not emitted consistently enough to support strong snippets and link
previews.

Examples from the current audit:

- multiple content files contain empty `description:` frontmatter
- several published pages are effectively placeholders or near-placeholders
- no schema implementation was detected in rendered pages
- no `og:image` or `twitter:image` default system was detected
- some section roots require regression protection so future content moves do not silently break live routes

## Users and Stakeholders

### Search engines and social crawlers

These systems consume metadata, canonical signals, robots directives, structured data, and route structure.

### End users

Visitors arriving from search results, shared links, and docs navigation should land on pages with better preview
quality and fewer low-value dead ends.

### Maintainers and content authors

Contributors should benefit from safe defaults and guardrails without being forced to hand-author complex metadata for
every routine page.

## Requirements

### Requirement 1: Index hygiene policy

The system must explicitly define which page types are indexable.

The implementation should support these outcomes:

- pages that are truly ready for search should remain indexable
- placeholder, near-empty, or explicitly work-in-progress pages should be `noindex` or excluded from the sitemap until
  ready
- indexability decisions should be deterministic and testable
- maintainers should not need to remember manual cleanup rules page-by-page

This requirement exists because build success alone is not enough. A page can build correctly and still be poor search
inventory.

### Requirement 2: Shared metadata platform

The site should generate metadata through one shared path instead of piecemeal behavior.

This shared metadata system should emit, at minimum:

- HTML `<title>`
- `meta name="description"`
- canonical URL link tag
- robots directives
- `og:title`
- `og:description`
- `og:url`
- `og:image`
- `twitter:title`
- `twitter:description`
- `twitter:card`
- `twitter:image`

The current breadcrumb-aware title helper should become one piece of this broader metadata platform rather than staying
an isolated solution.

### Requirement 3: Safe fallback behavior

Metadata generation must fail safe when page context is incomplete.

Examples:

- if breadcrumb context cannot be resolved, use safe default title behavior
- if a page lacks custom social media assets, use a default preview image
- if schema requirements are incomplete, do not emit partial or misleading schema

This prevents brittle logic and keeps metadata output predictable across all route types.

### Requirement 4: Structured data layer

The site should emit useful JSON-LD only when the page context supports it.

Minimum schema targets for this phase:

- homepage emits organization schema
- homepage emits website schema
- docs pages with reliable breadcrumb context emit breadcrumb schema

Schema should be omitted rather than guessed when required fields are missing.

### Requirement 5: Discovery and route stability

Important section roots and canonical routes must stay stable and discoverable.

This includes:

- keeping valid section roots such as `/3rdparty/` resolvable
- adding regression protection so content moves or file renames do not silently break those roots later
- ensuring internal navigation and links expose important crawl targets
- keeping sitemap URLs aligned with canonical live routes

This design does not assume every section root needs a redirect. It assumes every intended public root should be tested
and preserved intentionally.

### Requirement 6: SEO guardrails

The build and test layer should catch common SEO regressions before deployment.

Guardrails for this phase should cover:

- empty descriptions on indexable pages
- placeholder text on indexable pages
- missing default metadata tags
- sitemap inclusion mistakes
- section-root route regressions

The purpose is not to block all work-in-progress content. The purpose is to block accidental publication of low-quality
search inventory.

## Non-Functional Requirements

- preserve existing Astro and Starlight architectural patterns
- keep author burden low and avoid large new frontmatter requirements unless strongly justified
- keep metadata logic centralized and easy to reason about
- make route and metadata behavior testable with repo-local tests and `pnpm build`
- prefer explicit rules over heuristic-heavy inference

## Options Considered

### Option A - Recommended: Technical SEO foundation first

Focus this PRD on index hygiene, metadata centralization, schema defaults, route stability, internal discovery, and
guardrails.

Pros:

- clear implementation boundary
- high leverage for future SEO work
- avoids mixing infrastructure and editorial rewrites
- supports future content expansion without rebuilding technical layer twice

Cons:

- some thin pages may still need later content work after technical foundation lands
- immediate ranking gains may be more modest than a combined technical-plus-editorial project

### Option B - Technical foundation plus top-page remediation

Combine technical work with a rewrite of a small number of the weakest published pages.

Pros:

- faster visible improvements on a few important pages
- can remove worst thin-page examples immediately

Cons:

- mixes platform and editorial scope
- can obscure which work belongs in reusable SEO foundation versus page-specific content work

### Option C - Full SEO program

Include technical foundation, keyword mapping, content briefs, refresh workflows, and measurement.

Pros:

- comprehensive long-term strategy

Cons:

- too broad for a single spec-to-plan-to-build cycle
- higher risk of slow execution and muddled priorities

## Chosen Approach

Use Option A.

The site should first become technically search-ready by default. Once that foundation exists, a follow-on PRD can
target high-value content expansion and page-quality improvements.

## Proposed Solution Shape

### Layer 1: SEO policy layer

Introduce an explicit concept of search readiness.

This layer determines whether a page is:

- indexable
- `noindex`
- excluded from the sitemap until it meets readiness requirements

This should prevent low-value pages from entering search inventory simply because they compile.

### Layer 2: Shared metadata layer

Centralize metadata generation in one shared path.

This layer should:

- reuse current title logic
- extend it to descriptions, canonical URLs, robots directives, Open Graph tags, Twitter tags, and default preview
  images
- keep fallback behavior explicit and safe

### Layer 3: Structured data layer

Add schema output where page context is trustworthy.

This should begin with:

- organization schema on homepage
- website schema on homepage
- breadcrumb schema on docs pages with known breadcrumb context

### Layer 4: Discovery layer

Align live navigation and internal links with canonical published content.

This layer should:

- keep important section roots stable
- expose important published sections through navigation or other meaningful internal linking paths
- reduce mismatch between what is indexed and what users can easily discover

### Layer 5: Guardrail layer

Add tests and build-time assertions for SEO-critical invariants.

These checks should make SEO regressions visible during routine development instead of after deploy.

## Delivery Phases

### Phase 1: Index hygiene and route regression safety

- define indexable versus `noindex` page rules
- keep placeholder and thin pages out of search path until ready
- add regression coverage for valid section roots such as `/3rdparty/`
- confirm sitemap and index policy stay aligned

### Phase 2: Metadata platform

- centralize title, description, canonical, robots, Open Graph, Twitter, and default preview image logic
- preserve safe fallback behavior for routes with partial context

### Phase 3: Schema and internal discovery

- add homepage organization and website schema
- add breadcrumb schema for docs pages with valid context
- improve internal exposure of important published sections and pages

### Phase 4: Guardrails

- add build and test checks for metadata completeness, index readiness, sitemap rules, and route stability

## Risks and Mitigations

### Risk: Over-broad `noindex` rules hide pages that should rank

Mitigation:

- start with explicit narrow rules
- target known placeholder and thin-page patterns first
- verify representative routes in tests

### Risk: Schema emitted with incomplete or wrong context

Mitigation:

- emit schema only when all required fields are available
- keep schema types limited in this phase
- validate rendered output during verification

### Risk: Metadata refactor diverges from Starlight behavior

Mitigation:

- preserve Starlight defaults as fallback
- scope override carefully to SEO-relevant tags
- keep logic centralized and covered by tests

### Risk: Guardrails are too strict for work-in-progress docs workflow

Mitigation:

- separate “buildable” from “search-ready”
- permit WIP content to exist while preventing accidental indexation
- keep rules explicit so contributors understand how to satisfy them

### Risk: Section-root behavior breaks again after file moves or renames

Mitigation:

- add route-level regression coverage for intended public roots
- treat section-root behavior as product behavior, not incidental filesystem behavior

## Validation Strategy

Implementation should be considered complete only when all of the following are verified:

- `pnpm build` passes
- representative tests cover homepage, docs page, calculator page, and `noindex` placeholder page
- rendered output assertions verify title, description, canonical, robots, Open Graph, Twitter, and schema behavior
- sitemap contains only canonical indexable URLs
- route regression checks confirm valid section roots such as `/3rdparty/` resolve correctly
- manual browser spot checks confirm rendered metadata and schema on representative pages

## Implementation Boundary

The implementation plan that follows this spec should cover:

1. defining search-readiness and indexation rules
2. implementing or extending shared metadata generation
3. adding default preview-image behavior
4. adding homepage organization and website schema
5. adding breadcrumb schema for docs pages with valid context
6. adding route regression coverage for intended section roots
7. adding guardrails for empty descriptions, placeholder indexable pages, and sitemap mismatches
8. verifying output with tests and `pnpm build`

## Follow-On Work

After this foundation lands, the next SEO spec should focus on content quality and page expansion.

That follow-on work can cover:

- rewriting the thinnest published pages
- improving section introductions
- keyword mapping and topic clustering
- expanding high-value pages such as calculators, gear pages, and key docs landing pages

This keeps technical SEO foundation separate from editorial growth work.
