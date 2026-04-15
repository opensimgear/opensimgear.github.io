# FAQ Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded FAQ page markup and inline schema payload with a reusable FAQ component backed by one
typed data source.

**Architecture:** Move FAQ content into a typed module in `src/data/faq.ts`, render it through a presentational Astro
component, and generate `FAQPage` JSON-LD from the same data with a helper in `src/utils/structured-data.ts`. Keep
`src/content/docs/faq.mdx` as a thin wrapper that imports data, renders the component, and emits schema.

**Tech Stack:** Astro 6, Starlight, TypeScript, Vitest, MDX

---

## File structure

### New files

- `src/data/faq.ts` - typed FAQ content source shared by page and schema
- `src/components/ui/FAQ.astro` - presentational FAQ renderer

### Modified files

- `src/utils/structured-data.ts` - add FAQ schema builder helper
- `src/tests/docs/structured-data.test.ts` - add TDD coverage for FAQ schema helper
- `src/content/docs/faq.mdx` - remove hardcoded FAQ content and render shared component

### Verification targets

- `pnpm test src/tests/docs/structured-data.test.ts`
- `pnpm build`

## Task 1: add failing FAQ schema tests

**Files:**

- Modify: `src/tests/docs/structured-data.test.ts`
- Read: `src/utils/structured-data.ts`
- Read: `src/content/docs/faq.mdx`

- [ ] **Step 1: Write the failing test**

Add imports at the top of `src/tests/docs/structured-data.test.ts`:

```ts
import { faqItems } from '../../data/faq';
import { buildBreadcrumbSchema, buildFaqSchema, buildSiteSchemas } from '../../utils/structured-data';
```

Append this new test block to `src/tests/docs/structured-data.test.ts`:

```ts
describe('buildFaqSchema', () => {
  it('returns FAQPage JSON-LD derived from shared FAQ data', () => {
    const schema = JSON.parse(buildFaqSchema(faqItems));

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(faqItems.length);

    expect(schema.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: 'What is OpenSimGear?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'OpenSimGear is an open-source project focused on sim racing and flight simulation hardware, firmware, software, calculators, and documentation. The goal is to make it easier for builders and enthusiasts to understand, build, and improve their own sim gear.',
      },
    });
  });

  it('appends bullet content to the answer text when bullets exist', () => {
    const schema = JSON.parse(buildFaqSchema(faqItems));
    const helpEntry = schema.mainEntity.find((item: { name: string }) => item.name === 'How can I help?');

    expect(helpEntry.acceptedAnswer.text).toContain('You can help in a few different ways:');
    expect(helpEntry.acceptedAnswer.text).toContain('improve docs that are thin, unclear, or outdated');
    expect(helpEntry.acceptedAnswer.text).toContain('share hardware designs, build notes, or project references');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test src/tests/docs/structured-data.test.ts
```

Expected: FAIL because `../../data/faq` and `buildFaqSchema` do not exist yet.

- [ ] **Step 3: Commit the failing test**

```bash
git add src/tests/docs/structured-data.test.ts
git commit -m "test: define faq schema behavior"
```

## Task 2: create shared FAQ data source

**Files:**

- Create: `src/data/faq.ts`
- Read: `src/content/docs/faq.mdx`

- [ ] **Step 1: Write minimal shared FAQ data**

Create `src/data/faq.ts` with this content:

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

export const faqIntro =
  'OpenSimGear is still growing, so this page covers the questions people are most likely to ask first.';

export const faqItems: FaqItem[] = [
  {
    question: 'What is OpenSimGear?',
    answer:
      'OpenSimGear is an open-source project focused on sim racing and flight simulation hardware, firmware, software, calculators, and documentation. The goal is to make it easier for builders and enthusiasts to understand, build, and improve their own sim gear.',
  },
  {
    question: 'Is OpenSimGear a store or a hardware manufacturer?',
    answer:
      'No. OpenSimGear is not a store and does not sell finished hardware. It is a documentation and open-source ecosystem project built around shared designs, technical references, and tools for the community.',
  },
  {
    question: 'How can I help?',
    answer: 'You can help in a few different ways:',
    bullets: [
      'improve docs that are thin, unclear, or outdated',
      'share hardware designs, build notes, or project references',
      'fix software issues or help shape site features',
      'test calculators and pages, then report what feels broken or confusing',
    ],
    links: [{ label: 'Read the contributing page', href: '/contributing' }],
  },
  {
    question: 'Which licenses are used in this project?',
    answer: 'OpenSimGear mainly uses two licenses:',
    bullets: [
      'AGPL-3.0 for software-related work',
      'CERN-OHL-S for hardware-related work',
      'Check the license in the specific repository before you reuse anything.',
    ],
    links: [
      { label: 'AGPL-3.0', href: 'https://www.gnu.org/licenses/agpl-3.0.txt' },
      { label: 'CERN-OHL-S', href: 'https://ohwr.org/cern_ohl_s_v2.txt' },
    ],
  },
  {
    question: 'Can I use OpenSimGear designs in my own project?',
    answer:
      'Usually yes, but the exact answer depends on the license attached to the repository or design you want to reuse. If you plan to modify, redistribute, or commercialize the work, read that license first instead of guessing.',
  },
  {
    question: 'Where do I ask questions or get support?',
    answer:
      'If you have a question, send an email or join the Discord community. If your question is about contributing, the contributing page is still the best place to start because it explains where help is useful and how to jump in.',
  },
];
```

- [ ] **Step 2: Run schema test to verify failure changes shape**

Run:

```bash
pnpm test src/tests/docs/structured-data.test.ts
```

Expected: FAIL because `buildFaqSchema` is still missing, but import for `faqItems` now resolves.

- [ ] **Step 3: Commit the shared data file**

```bash
git add src/data/faq.ts
git commit -m "feat: add shared faq data source"
```

## Task 3: implement FAQ schema helper

**Files:**

- Modify: `src/utils/structured-data.ts`
- Test: `src/tests/docs/structured-data.test.ts`

- [ ] **Step 1: Write minimal schema helper implementation**

Update `src/utils/structured-data.ts` imports and add the helper:

```ts
import type { FaqItem } from '../data/faq';

type BuildSiteSchemasOptions = {
  site: string;
  title: string;
};

// existing code stays above

function toFaqAnswerText(item: FaqItem) {
  return [item.answer, ...(item.bullets ?? [])].join(' ');
}

export function buildFaqSchema(items: FaqItem[]) {
  return toJsonString({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: toFaqAnswerText(item),
      },
    })),
  });
}
```

Notes:

- Keep `toJsonString` as the common serializer.
- Do not include `links` in schema output yet; visible links stay in page markup only.

- [ ] **Step 2: Run test to verify it passes**

Run:

```bash
pnpm test src/tests/docs/structured-data.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit the schema helper**

```bash
git add src/utils/structured-data.ts src/tests/docs/structured-data.test.ts
git commit -m "feat: add faq structured data helper"
```

## Task 4: build reusable FAQ Astro component

**Files:**

- Create: `src/components/ui/FAQ.astro`
- Read: `src/components/ui/ItemGrid.astro`
- Read: `src/components/ui/Timeline.astro`
- Read: `src/data/faq.ts`

- [ ] **Step 1: Create component with typed props**

Create `src/components/ui/FAQ.astro` with this content:

```astro
---
import type { FaqItem } from '~/data/faq';

export interface Props {
  intro?: string;
  items: FaqItem[];
}

const { intro, items } = Astro.props as Props;
---

{intro && <p>{intro}</p>}

{
  items.map((item) => (
    <section>
      <h2>{item.question}</h2>
      <p>{item.answer}</p>

      {item.bullets && item.bullets.length > 0 && (
        <ul>
          {item.bullets.map((bullet) => (
            <li>{bullet}</li>
          ))}
        </ul>
      )}

      {item.links && item.links.length > 0 && (
        <p>
          {item.links.map((link, index) => (
            <>
              {index > 0 && ' '}
              <a href={link.href}>{link.label}</a>
            </>
          ))}
        </p>
      )}
    </section>
  ))
}
```

- [ ] **Step 2: Review rendered HTML strategy before wiring it in**

Check against requirements:

- question uses `h2`
- answer uses paragraph text
- bullets render as `ul`
- links stay visible but outside schema

Expected: no code change here if component matches design.

- [ ] **Step 3: Commit the component**

```bash
git add src/components/ui/FAQ.astro
git commit -m "feat: add reusable faq component"
```

## Task 5: replace hardcoded FAQ page with shared component

**Files:**

- Modify: `src/content/docs/faq.mdx`
- Read: `src/data/faq.ts`
- Read: `src/components/ui/FAQ.astro`
- Read: `src/utils/structured-data.ts`

- [ ] **Step 1: Replace page implementation with thin wrapper**

Replace the body of `src/content/docs/faq.mdx` with this content:

```mdx
---
title: FAQ
description:
  Frequently asked questions about OpenSimGear, including project scope, licenses, contributions, and where to get help.
---

import FAQ from '~/components/ui/FAQ.astro';
import { faqIntro, faqItems } from '~/data/faq';
import { buildFaqSchema } from '~/utils/structured-data';

<script type="application/ld+json" is:inline set:html={buildFaqSchema(faqItems)} />

<FAQ intro={faqIntro} items={faqItems} />
```

- [ ] **Step 2: Run build to verify page renders and schema stays present**

Run:

```bash
pnpm build
```

Expected:

- `astro check` passes
- build completes successfully
- `/faq/` is generated

- [ ] **Step 3: Verify built FAQ output contains rendered content and FAQ schema**

Run:

```bash
python - <<'PY'
from pathlib import Path
html = Path('dist/faq/index.html').read_text()
for token in ['What is OpenSimGear?', 'How can I help?', 'FAQPage']:
    print(token, token in html)
PY
```

Expected:

```text
What is OpenSimGear? True
How can I help? True
FAQPage True
```

- [ ] **Step 4: Commit the FAQ page refactor**

```bash
git add src/content/docs/faq.mdx
git commit -m "refactor: render faq from shared component"
```

## Task 6: final verification

**Files:**

- Verify: `src/data/faq.ts`
- Verify: `src/components/ui/FAQ.astro`
- Verify: `src/utils/structured-data.ts`
- Verify: `src/content/docs/faq.mdx`
- Verify: `src/tests/docs/structured-data.test.ts`

- [ ] **Step 1: Run targeted test suite**

Run:

```bash
pnpm test src/tests/docs/structured-data.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full build one more time**

Run:

```bash
pnpm build
```

Expected:

- `astro check` returns `0 errors`
- build completes successfully

- [ ] **Step 3: Review git diff for touched FAQ files only**

Run:

```bash
git diff -- src/data/faq.ts src/components/ui/FAQ.astro src/utils/structured-data.ts src/content/docs/faq.mdx src/tests/docs/structured-data.test.ts
```

Expected: diff only shows the shared FAQ refactor and schema helper changes.

- [ ] **Step 4: Commit final polish if needed**

```bash
git add src/data/faq.ts src/components/ui/FAQ.astro src/utils/structured-data.ts src/content/docs/faq.mdx src/tests/docs/structured-data.test.ts
git commit -m "feat: centralize faq content and schema"
```
