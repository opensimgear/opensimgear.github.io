export type SeoPolicy = {
  index: boolean;
  follow: boolean;
};

const NOINDEX_PATHS_LIST = ['/404'] as const;

const NOINDEX_PATHS = new Set<string>(NOINDEX_PATHS_LIST);

function normalizePathname(pathname: string) {
  const [path] = pathname.split(/[?#]/, 1);

  if (!path || path === '/') {
    return '/';
  }

  return path.endsWith('/') ? path.slice(0, -1) : path;
}

export function getSeoPolicy(pathname: string): SeoPolicy {
  return {
    index: !NOINDEX_PATHS.has(normalizePathname(pathname)),
    follow: true,
  };
}

export function shouldIncludeInSitemap(pathname: string) {
  return getSeoPolicy(pathname).index;
}

export function buildCanonicalUrl(siteUrl: string, pathname: string) {
  return new URL(pathname, siteUrl).toString();
}

export function buildDefaultSocialImageUrl(siteUrl: string) {
  return buildCanonicalUrl(siteUrl, '/images/social-image.png');
}
