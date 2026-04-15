# FAQ component design

## Goal

Replace the hardcoded FAQ page body and inline FAQ schema block in `src/content/docs/faq.mdx` with a reusable FAQ
component backed by one typed data source.

The new design should keep visible content and structured data in sync, avoid brittle MDX mixed-markup issues, and make
future FAQ edits simple.

## Scope

In scope:

- create a typed FAQ data source
- create a reusable Astro FAQ component
- generate FAQ schema from the same data source
- update the FAQ page to render the component
- preserve current FAQ content and links

Out of scope:

- visual redesign of the FAQ page
- collapsible accordion behavior
- rich HTML/MDX answer content
- changes to unrelated structured data

## Chosen approach

Use a TypeScript data module as the single source of truth.

Files:

- `src/data/faq.ts`
- `src/components/ui/FAQ.astro`
- `src/utils/structured-data.ts`
- `src/content/docs/faq.mdx`

Why this approach:

- fits existing Astro + TypeScript patterns better than raw JSON
- gives type safety for questions, answer text, bullets, and optional links
- keeps schema generation close to existing structured-data helpers
- removes the current risk of MDX rendering breaking when JSX and markdown are mixed

## Data model

`src/data/faq.ts` exports a typed array of FAQ items.

Proposed shape:

```ts
export type FaqLink = {
  label: string;
  href: string;
};

export type FaqItem = {
  question: string;
  answer: string;
  bullets?: string[];
  links?: FaqLink[];
};

export const faqItems: FaqItem[] = [...];
```

Constraints:

- `question` is required and used in both page output and schema
- `answer` is plain text only
- `bullets` is optional for list-style answers
- `links` is optional for follow-up actions like contributing, email, or Discord

This keeps content flexible enough for the current page without allowing embedded markup.

## Component design

`src/components/ui/FAQ.astro` receives `items: FaqItem[]`.

Rendering rules:

- render a short intro paragraph only if passed from the page, not from the data array
- render each FAQ item in order
- each question renders as an `h2`
- each answer renders as one paragraph
- optional bullets render as an unordered list
- optional links render as a small follow-up paragraph or list of inline links

The component should stay presentational and avoid owning any schema logic.

## Structured data design

Add a new helper to `src/utils/structured-data.ts` that converts `FaqItem[]` into FAQPage JSON-LD.

Proposed helper:

```ts
export function buildFaqSchema(items: FaqItem[]): string;
```

Behavior:

- returns one JSON string for a `FAQPage`
- maps each item into `Question` + `acceptedAnswer`
- builds answer text from `answer`, then appends bullet items as plain text if bullets exist
- does not include links in schema unless they are represented safely as plain text within the answer text

This avoids schema drifting away from visible content.

## FAQ page design

`src/content/docs/faq.mdx` becomes a thin page wrapper.

It should:

- keep only frontmatter and minimal imports
- import `faqItems`
- import `FAQ.astro`
- import `buildFaqSchema`
- emit one inline `application/ld+json` script using `buildFaqSchema(faqItems)`
- render the reusable component with the FAQ data

The page should no longer hardcode question markup or schema payloads directly.

## Error handling and maintenance

- empty `faqItems` should render no entries and no broken markup
- missing optional fields should be ignored cleanly
- data edits should require touching only `src/data/faq.ts` for normal FAQ updates
- if future needs outgrow plain strings, the next step should be a deliberate data model change, not ad hoc inline HTML
  in the data file

## Testing plan

Use TDD for the new schema helper and component behavior that is practical to verify in this codebase.

Planned tests:

- unit test for `buildFaqSchema(items)`
- verifies `FAQPage` output shape
- verifies answer text is derived from shared FAQ data
- verifies optional bullet content is handled consistently

If there is an existing pattern for Astro component rendering tests in this repo, follow it. If not, keep automated
coverage focused on the data-to-schema path and verify page rendering with build output.

## Migration plan

1. Add failing test for FAQ schema helper.
2. Create typed FAQ data file.
3. Add schema helper and make test pass.
4. Create reusable FAQ Astro component.
5. Replace hardcoded FAQ page content with component + shared data.
6. Run build and verify rendered output.

## Risks

- answer text used in schema must stay meaningfully equivalent to visible content
- mixing links into plain-text schema answers needs care to avoid awkward machine-readable text
- over-designing the data model now would add complexity without current benefit

## Recommendation

Implement the simplest reusable version now: typed TS data, Astro component, shared schema helper, plain-text answers,
optional bullets and links.

That solves current maintenance and SEO problems without adding unnecessary content-format complexity.
