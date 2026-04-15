import { describe, expect, it } from 'vitest';

import { faqItems } from '../../data/faq';
import { buildBreadcrumbSchema, buildFaqSchema, buildSiteSchemas } from '../../utils/structured-data';

describe('buildSiteSchemas', () => {
  it('returns organization and website JSON-LD strings for homepage metadata', () => {
    const schemas = buildSiteSchemas({
      site: 'https://www.opensimgear.org',
      title: 'OpenSimGear',
    });

    const [organizationSchema, websiteSchema] = schemas.map((schema) => JSON.parse(schema));

    expect(schemas).toHaveLength(2);
    expect(organizationSchema['@type']).toBe('Organization');
    expect(organizationSchema.name).toBe('OpenSimGear');
    expect(organizationSchema.url).toBe('https://www.opensimgear.org/');
    expect(websiteSchema['@type']).toBe('WebSite');
    expect(websiteSchema.name).toBe('OpenSimGear');
    expect(websiteSchema.url).toBe('https://www.opensimgear.org/');
  });
});

describe('buildBreadcrumbSchema', () => {
  it('returns breadcrumb list JSON-LD string for docs pages', () => {
    const schema = JSON.parse(
      buildBreadcrumbSchema({
        site: 'https://www.opensimgear.org',
        items: [
          { name: 'Home', item: '/' },
          { name: 'Docs', item: '/docs' },
          { name: 'Components', item: '/docs/components/' },
          { name: 'Buttons', item: '/docs/components/buttons/' },
        ],
      })
    );

    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.opensimgear.org/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Docs',
        item: 'https://www.opensimgear.org/docs/',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Components',
        item: 'https://www.opensimgear.org/docs/components/',
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: 'Buttons',
        item: 'https://www.opensimgear.org/docs/components/buttons/',
      },
    ]);
  });

  it('normalizes breadcrumb item paths before building absolute URLs', () => {
    const schema = JSON.parse(
      buildBreadcrumbSchema({
        site: 'https://www.opensimgear.org',
        items: [
          { name: 'Home', item: '/' },
          { name: 'Docs', item: '/docs?ref=nav#top' },
          { name: 'Buttons', item: '/docs/components/buttons?tab=seo' },
        ],
      })
    );

    expect(schema.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.opensimgear.org/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Docs',
        item: 'https://www.opensimgear.org/docs/',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Buttons',
        item: 'https://www.opensimgear.org/docs/components/buttons/',
      },
    ]);
  });
});

describe('buildFaqSchema', () => {
  it('returns FAQPage JSON-LD derived from faq items', () => {
    const items = [
      {
        question: 'What is OpenSimGear?',
        answer: 'OpenSimGear helps builders understand and improve sim gear.',
      },
      {
        question: 'Is it open source?',
        answer: 'Yes, docs and tooling are shared openly.',
      },
    ];
    const schema = JSON.parse(buildFaqSchema(items));

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(items.length);

    expect(schema.mainEntity).toEqual([
      {
        '@type': 'Question',
        name: 'What is OpenSimGear?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'OpenSimGear helps builders understand and improve sim gear.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is it open source?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, docs and tooling are shared openly.',
        },
      },
    ]);
  });

  it('appends bullet content to the answer text when bullets exist', () => {
    const items = [
      {
        question: 'How can I help?',
        answer: 'You can help in a few different ways:',
        bullets: [
          'improve docs that are thin, unclear, or outdated',
          'share hardware designs, build notes, or project references',
        ],
      },
    ];
    const schema = JSON.parse(buildFaqSchema(items));
    const helpEntry = schema.mainEntity.find((item: { name: string }) => item.name === 'How can I help?');

    expect(helpEntry).toBeDefined();
    expect(helpEntry.acceptedAnswer.text).toBe(
      'You can help in a few different ways:\n- improve docs that are thin, unclear, or outdated\n- share hardware designs, build notes, or project references'
    );
  });

  it('adds visible link labels to answer text without embedding raw URLs', () => {
    const items = [
      {
        question: 'How can I help?',
        answer: 'You can help in a few different ways:',
        links: [{ label: 'Read the contributing page', href: '/contributing' }],
      },
    ];
    const schema = JSON.parse(buildFaqSchema(items));

    expect(schema.mainEntity[0].acceptedAnswer.text).toBe(
      'You can help in a few different ways:\nRelated links:\n- Read the contributing page'
    );
    expect(schema.mainEntity[0].acceptedAnswer.text).not.toContain('/contributing');
  });

  it('builds FAQ schema from shared faq data with stable structure', () => {
    const schema = JSON.parse(buildFaqSchema(faqItems));
    const questions = schema.mainEntity.map((item: { name: string }) => item.name);
    const helpEntry = schema.mainEntity.find((item: { name: string }) => item.name === 'How can I help?');

    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(faqItems.length);
    expect(questions).toContain('How can I help?');
    expect(questions).toContain('Which licenses are used in this project?');
    expect(helpEntry.acceptedAnswer.text).toContain('Read the contributing page');
    expect(helpEntry.acceptedAnswer.text).not.toContain('/contributing');
  });
});
