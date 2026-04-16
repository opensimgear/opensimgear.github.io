import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  buildCanonicalUrl,
  buildDefaultSocialImageUrl,
  getSeoPolicy,
  shouldIncludeInSitemap,
} from '../../utils/seo-policy';

describe('getSeoPolicy', () => {
  it('marks 404 pages as noindex, follow', () => {
    expect(getSeoPolicy('/404/', { is404: true })).toEqual({ index: false, follow: true });
    expect(getSeoPolicy('/missing-page/', { is404: true })).toEqual({ index: false, follow: true });
  });

  it('marks placeholder gear pages as noindex, follow', () => {
    expect(getSeoPolicy('/gear/')).toEqual({ index: false, follow: true });
    expect(getSeoPolicy('/gear/hand-brake/')).toEqual({ index: false, follow: true });
  });

  it('marks hidden third-party landing pages as noindex, follow', () => {
    expect(getSeoPolicy('/3rdparty/belt-tensioner/')).toEqual({ index: false, follow: true });
  });

  it('keeps docs pages indexable by default', () => {
    expect(getSeoPolicy('/docs/components/')).toEqual({ index: true, follow: true });
  });
});

describe('shouldIncludeInSitemap', () => {
  it('excludes noindex pages from sitemap output', () => {
    expect(shouldIncludeInSitemap('/gear/')).toBe(false);
    expect(shouldIncludeInSitemap('/gear/hand-brake/')).toBe(false);
    expect(shouldIncludeInSitemap('/3rdparty/belt-tensioner/')).toBe(false);
  });

  it('keeps indexable pages in sitemap output', () => {
    expect(shouldIncludeInSitemap('/docs/components/')).toBe(true);
  });
});

describe('buildCanonicalUrl', () => {
  it('joins site url and pathname into canonical url', () => {
    expect(buildCanonicalUrl('https://www.opensimgear.org', '/3rdparty/')).toBe(
      'https://www.opensimgear.org/3rdparty/'
    );
  });
});

describe('buildDefaultSocialImageUrl', () => {
  it('builds default social image url from site url', () => {
    expect(buildDefaultSocialImageUrl('https://www.opensimgear.org')).toBe(
      'https://www.opensimgear.org/social-preview-default.svg'
    );
  });

  it('ships default social preview asset', () => {
    const asset = readFileSync(new URL('../../../public/social-preview-default.svg', import.meta.url), 'utf8');

    expect(asset).toContain('<svg');
    expect(asset).toContain('width="1200"');
    expect(asset).toContain('height="630"');
    expect(asset).toContain('viewBox="0 0 1200 630"');
    expect(asset).toContain('<title id="title">OpenSimGear social preview</title>');
    expect(asset).toContain('>OpenSimGear</text>');
    expect(asset).toContain('>opensimgear.org</text>');
  });
});
