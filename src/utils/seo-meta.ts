import type { StarlightRouteData } from '@astrojs/starlight/route-data';

import { buildCanonicalUrl, type SeoPolicy } from './seo-policy';

type HeadEntry = StarlightRouteData['head'][number];
type HeadConfig = StarlightRouteData['head'];

type ApplySeoMetadataOptions = {
  pathname: string;
  siteUrl: string;
  description: string;
  seoPolicy: SeoPolicy;
  defaultSocialImageUrl: string;
};

function upsertLink(head: HeadConfig, rel: string, href: string): HeadConfig {
  const index = head.findIndex((entry) => entry.tag === 'link' && entry.attrs?.rel === rel);
  const nextEntry: HeadEntry = {
    tag: 'link',
    attrs: { rel, href },
  };

  if (index === -1) {
    return [...head, nextEntry];
  }

  return head.map((entry, entryIndex) => (entryIndex === index ? nextEntry : entry));
}

function upsertMetaByName(head: HeadConfig, name: string, content: string): HeadConfig {
  const index = head.findIndex((entry) => entry.tag === 'meta' && entry.attrs?.name === name);
  const nextEntry: HeadEntry = {
    tag: 'meta',
    attrs: { name, content },
  };

  if (index === -1) {
    return [...head, nextEntry];
  }

  return head.map((entry, entryIndex) => (entryIndex === index ? nextEntry : entry));
}

function upsertMetaByProperty(head: HeadConfig, property: string, content: string): HeadConfig {
  const index = head.findIndex((entry) => entry.tag === 'meta' && entry.attrs?.property === property);
  const nextEntry: HeadEntry = {
    tag: 'meta',
    attrs: { property, content },
  };

  if (index === -1) {
    return [...head, nextEntry];
  }

  return head.map((entry, entryIndex) => (entryIndex === index ? nextEntry : entry));
}

export function applySeoMetadata(head: HeadConfig, options: ApplySeoMetadataOptions): HeadConfig {
  const { pathname, siteUrl, description, seoPolicy, defaultSocialImageUrl } = options;
  const robots = `${seoPolicy.index ? 'index' : 'noindex'}, ${seoPolicy.follow ? 'follow' : 'nofollow'}`;
  const canonicalUrl = buildCanonicalUrl(siteUrl, pathname);

  let nextHead = upsertLink(head, 'canonical', canonicalUrl);

  nextHead = upsertMetaByName(nextHead, 'description', description);
  nextHead = upsertMetaByName(nextHead, 'robots', robots);
  nextHead = upsertMetaByProperty(nextHead, 'og:description', description);
  nextHead = upsertMetaByProperty(nextHead, 'og:image', defaultSocialImageUrl);
  nextHead = upsertMetaByProperty(nextHead, 'og:url', canonicalUrl);
  nextHead = upsertMetaByName(nextHead, 'twitter:card', 'summary_large_image');
  nextHead = upsertMetaByName(nextHead, 'twitter:description', description);
  nextHead = upsertMetaByName(nextHead, 'twitter:image', defaultSocialImageUrl);

  return nextHead;
}
