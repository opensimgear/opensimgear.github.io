import { describe, expect, it } from 'vitest';

import type { StarlightRouteData } from '@astrojs/starlight/route-data';

import { applySeoMetadata } from '../../utils/seo-meta';

type HeadConfig = StarlightRouteData['head'];

describe('applySeoMetadata', () => {
  it('adds canonical and default indexable metadata for docs pages', () => {
    const head: HeadConfig = [{ tag: 'title', content: 'Components | OpenSimGear' }];
    const result = applySeoMetadata(head, {
      pathname: '/docs/components/',
      siteUrl: 'https://www.opensimgear.org',
      description: 'Reusable OpenSimGear UI components.',
      seoPolicy: { index: true, follow: true },
      defaultSocialImageUrl: 'https://www.opensimgear.org/social-preview-default.svg',
    });

    expect(result).toContainEqual({
      tag: 'link',
      attrs: { rel: 'canonical', href: 'https://www.opensimgear.org/docs/components/' },
    });
    expect(result).toContainEqual({
      tag: 'meta',
      attrs: { name: 'robots', content: 'index, follow' },
    });
    expect(result).toContainEqual({
      tag: 'meta',
      attrs: { property: 'og:image', content: 'https://www.opensimgear.org/social-preview-default.svg' },
    });
    expect(result).toContainEqual({
      tag: 'meta',
      attrs: { property: 'og:url', content: 'https://www.opensimgear.org/docs/components/' },
    });
    expect(result).toContainEqual({
      tag: 'meta',
      attrs: { name: 'twitter:card', content: 'summary_large_image' },
    });
    expect(result).toContainEqual({
      tag: 'meta',
      attrs: { name: 'twitter:image', content: 'https://www.opensimgear.org/social-preview-default.svg' },
    });
  });

  it('writes noindex robots metadata for gear pages', () => {
    expect(
      applySeoMetadata([], {
        pathname: '/gear/',
        siteUrl: 'https://www.opensimgear.org',
        description: '',
        seoPolicy: { index: false, follow: true },
        defaultSocialImageUrl: 'https://www.opensimgear.org/social-preview-default.svg',
      })
    ).toContainEqual({
      tag: 'meta',
      attrs: { name: 'robots', content: 'noindex, follow' },
    });
  });
});
