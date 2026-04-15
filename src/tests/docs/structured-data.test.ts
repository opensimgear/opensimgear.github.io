import { describe, expect, it } from 'vitest';

import { buildBreadcrumbSchema, buildSiteSchemas } from '../../utils/structured-data';

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
