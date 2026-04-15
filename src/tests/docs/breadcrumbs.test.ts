import { describe, expect, it } from 'vitest';

import { buildDocBreadcrumbItems } from '../../utils/breadcrumbs';

describe('buildDocBreadcrumbItems', () => {
  it('keeps only real ancestor breadcrumb links', () => {
    const items = buildDocBreadcrumbItems({
      pathname: '/docs/components/buttons/',
      currentTitle: 'Buttons',
      sidebar: [
        {
          type: 'group',
          label: 'Docs',
          entries: [
            { type: 'link', label: 'Sim Racing', href: '/docs/sim-racing/' },
            {
              type: 'group',
              label: 'Components',
              entries: [
                { type: 'link', label: 'Overview', href: '/docs/components/' },
                { type: 'link', label: 'Buttons', href: '/docs/components/buttons/' },
              ],
            },
          ],
        },
      ],
    });

    expect(items).toEqual([
      { name: 'Home', item: '/' },
      { name: 'Components', item: '/docs/components/' },
      { name: 'Buttons', item: '/docs/components/buttons/' },
    ]);
  });

  it('uses current group path without leaking unrelated parent hrefs', () => {
    const items = buildDocBreadcrumbItems({
      pathname: '/docs/components/',
      currentTitle: 'Overview',
      sidebar: [
        {
          type: 'group',
          label: 'Docs',
          entries: [
            { type: 'link', label: 'Sim Racing', href: '/docs/sim-racing/' },
            {
              type: 'group',
              label: 'Components',
              entries: [
                { type: 'link', label: 'Overview', href: '/docs/components/' },
                { type: 'link', label: 'Buttons', href: '/docs/components/buttons/' },
              ],
            },
          ],
        },
      ],
    });

    expect(items).toEqual([
      { name: 'Home', item: '/' },
      { name: 'Components', item: '/docs/components/' },
    ]);
  });
});
