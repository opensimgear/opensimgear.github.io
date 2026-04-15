type BuildSiteSchemasOptions = {
  site: string;
  title: string;
};

export type BreadcrumbItem = {
  name: string;
  item: string;
};

type BuildBreadcrumbSchemaOptions = {
  site: string;
  items: BreadcrumbItem[];
};

export function normalizeStructuredDataPath(pathname: string) {
  const [path] = pathname.split(/[?#]/, 1);

  if (!path || path === '/') {
    return '/';
  }

  return path.endsWith('/') ? path : `${path}/`;
}

export function toStructuredDataUrl(site: string, pathname: string) {
  return new URL(normalizeStructuredDataPath(pathname), site).toString();
}

function toJsonString(value: unknown) {
  return JSON.stringify(value);
}

export function buildSiteSchemas({ site, title }: BuildSiteSchemasOptions) {
  return [
    toJsonString({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: title,
      url: toStructuredDataUrl(site, '/'),
    }),
    toJsonString({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: title,
      url: toStructuredDataUrl(site, '/'),
    }),
  ];
}

export function buildBreadcrumbSchema({ site, items }: BuildBreadcrumbSchemaOptions) {
  return toJsonString({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((breadcrumbItem, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: breadcrumbItem.name,
      item: toStructuredDataUrl(site, breadcrumbItem.item),
    })),
  });
}
