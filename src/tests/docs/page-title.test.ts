import { describe, expect, it } from 'vitest';

import type { StarlightRouteData } from '@astrojs/starlight/route-data';

import { buildSeoPageTitle, replaceSeoTitleTags } from '../../utils/page-title';

type SidebarEntry = StarlightRouteData['sidebar'][number];
type SidebarGroup = Extract<SidebarEntry, { type: 'group' }>;
type SidebarLink = Extract<SidebarEntry, { type: 'link' }>;
type HeadConfig = StarlightRouteData['head'];

function createSidebarLink(label: string, href: string): SidebarLink {
  return {
    type: 'link',
    label,
    href,
    isCurrent: false,
    badge: undefined,
    attrs: {},
  };
}

function createSidebarGroup(label: string, entries: SidebarEntry[]): SidebarGroup {
  return {
    type: 'group',
    label,
    entries,
    collapsed: false,
    badge: undefined,
  };
}

const gearSidebar: SidebarEntry[] = [
  createSidebarGroup('Gear', [createSidebarLink('Overview', '/gear/')]),
];

const thirdPartySidebar: SidebarEntry[] = [
  createSidebarGroup('3rd Party', [
    createSidebarLink('Overview', '/3rdparty/overview/'),
    createSidebarGroup('Belt Tensioner', [
      createSidebarLink('Overview', '/3rdparty/belt-tensioner/'),
      createSidebarLink('SilentChill oDrive Belt Tensioner', '/3rdparty/belt-tensioner/silentchill/'),
      createSidebarLink('Flag Ghost Belt Tensioner', '/3rdparty/belt-tensioner/flagghost/'),
    ]),
  ]),
];

const thirdPartySidebarWithHiddenLandingPage: SidebarEntry[] = [
  createSidebarGroup('3rd Party', [
    createSidebarLink('Overview', '/3rdparty/overview/'),
    createSidebarGroup('Belt Tensioner', [
      createSidebarLink('SilentChill oDrive Belt Tensioner', '/3rdparty/belt-tensioner/silentchill/'),
      createSidebarLink('Flag Ghost Belt Tensioner', '/3rdparty/belt-tensioner/flagghost/'),
    ]),
  ]),
];

describe('buildSeoPageTitle', () => {
  it('rewrites a generic section index title with parent context', () => {
    expect(
      buildSeoPageTitle({
        pageTitle: 'Overview',
        siteTitle: 'OpenSimGear',
        pathname: '/gear/',
        sidebar: gearSidebar,
      })
    ).toBe('Gear Overview | OpenSimGear');
  });

  it('keeps a descriptive page title first and appends parent section context', () => {
    expect(
      buildSeoPageTitle({
        pageTitle: 'SilentChill oDrive Belt Tensioner',
        siteTitle: 'OpenSimGear',
        pathname: '/3rdparty/belt-tensioner/silentchill/',
        sidebar: thirdPartySidebar,
      })
    ).toBe('SilentChill oDrive Belt Tensioner | 3rd Party | OpenSimGear');
  });

  it('falls back to page title when page is not present in sidebar', () => {
    expect(
      buildSeoPageTitle({
        pageTitle: 'Overview',
        siteTitle: 'OpenSimGear',
        pathname: '/gear/missing/',
        sidebar: gearSidebar,
      })
    ).toBe('Overview | OpenSimGear');
  });

  it('rewrites a nested generic overview title with nearest parent context', () => {
    expect(
      buildSeoPageTitle({
        pageTitle: 'Overview',
        siteTitle: 'OpenSimGear',
        pathname: '/3rdparty/belt-tensioner/',
        sidebar: thirdPartySidebar,
      })
    ).toBe('Belt Tensioner Overview | OpenSimGear');
  });

  it('rewrites a hidden nested landing page title from matching group context', () => {
    expect(
      buildSeoPageTitle({
        pageTitle: 'Hidden',
        siteTitle: 'OpenSimGear',
        pathname: '/3rdparty/belt-tensioner/',
        sidebar: thirdPartySidebarWithHiddenLandingPage,
      })
    ).toBe('Belt Tensioner Overview | OpenSimGear');
  });

  it('does not fall back to placeholder hidden title when descendants match by path prefix', () => {
    expect(
      buildSeoPageTitle({
        pageTitle: 'Hidden',
        siteTitle: 'OpenSimGear',
        pathname: '/3rdparty/belt-tensioner/',
        sidebar: thirdPartySidebarWithHiddenLandingPage,
      })
    ).not.toBe('Hidden | OpenSimGear');
  });

  it('deduplicates parent context when normalized title would repeat it', () => {
    expect(
      buildSeoPageTitle({
        pageTitle: 'Gear',
        siteTitle: 'OpenSimGear',
        pathname: '/gear/',
        sidebar: gearSidebar,
      })
    ).toBe('Gear | OpenSimGear');
  });
});

describe('replaceSeoTitleTags', () => {
  it('replaces only title-related tags with the computed SEO title', () => {
    const head: HeadConfig = [
      { tag: 'title', content: 'Overview | OpenSimGear' },
      { tag: 'meta', attrs: { property: 'og:title', content: 'Overview' } },
      { tag: 'meta', attrs: { name: 'twitter:title', content: 'Overview' } },
      { tag: 'meta', attrs: { name: 'description', content: 'Existing description' } },
      { tag: 'link', attrs: { rel: 'canonical', href: 'https://example.com/gear/' } },
    ];

    expect(replaceSeoTitleTags(head, 'Gear Overview | OpenSimGear')).toEqual([
      { tag: 'title', content: 'Gear Overview | OpenSimGear' },
      { tag: 'meta', attrs: { property: 'og:title', content: 'Gear Overview | OpenSimGear' } },
      { tag: 'meta', attrs: { name: 'twitter:title', content: 'Gear Overview | OpenSimGear' } },
      { tag: 'meta', attrs: { name: 'description', content: 'Existing description' } },
      { tag: 'link', attrs: { rel: 'canonical', href: 'https://example.com/gear/' } },
    ]);
  });

  it('leaves unrelated tags untouched when no twitter title tag exists', () => {
    const head: HeadConfig = [
      { tag: 'title', content: 'SilentChill oDrive Belt Tensioner | OpenSimGear' },
      { tag: 'meta', attrs: { property: 'og:title', content: 'SilentChill oDrive Belt Tensioner' } },
      { tag: 'meta', attrs: { property: 'og:description', content: 'Existing OG description' } },
    ];

    expect(replaceSeoTitleTags(head, 'SilentChill oDrive Belt Tensioner | 3rd Party | OpenSimGear')).toEqual([
      { tag: 'title', content: 'SilentChill oDrive Belt Tensioner | 3rd Party | OpenSimGear' },
      {
        tag: 'meta',
        attrs: { property: 'og:title', content: 'SilentChill oDrive Belt Tensioner | 3rd Party | OpenSimGear' },
      },
      { tag: 'meta', attrs: { property: 'og:description', content: 'Existing OG description' } },
    ]);
  });
});
