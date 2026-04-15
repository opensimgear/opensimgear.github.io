import { normalizeStructuredDataPath, type BreadcrumbItem } from './structured-data';

export type BreadcrumbSidebarEntry = BreadcrumbSidebarLink | BreadcrumbSidebarGroup;

type BreadcrumbSidebarLink = {
  type: 'link';
  label: string;
  href: string;
};

type BreadcrumbSidebarGroup = {
  type: 'group';
  label: string;
  entries: BreadcrumbSidebarEntry[];
};

type BuildDocBreadcrumbItemsOptions = {
  sidebar: BreadcrumbSidebarEntry[];
  pathname: string;
  currentTitle: string;
};

function normalizeComparablePath(pathname: string) {
  return normalizeStructuredDataPath(pathname).slice(0, -1);
}

function findFirstLinkHref(entries: BreadcrumbSidebarEntry[]): string | undefined {
  for (const entry of entries) {
    if (entry.type === 'link') {
      return entry.href;
    }

    const href = findFirstLinkHref(entry.entries);

    if (href) {
      return href;
    }
  }

  return undefined;
}

function isRealAncestorPath(ancestorHref: string, pathname: string) {
  const normalizedAncestor = normalizeComparablePath(ancestorHref);
  const normalizedPathname = normalizeComparablePath(pathname);

  return (
    normalizedAncestor.length > 0 &&
    normalizedAncestor !== normalizedPathname &&
    normalizedPathname.startsWith(`${normalizedAncestor}/`)
  );
}

function buildParentBreadcrumbItems(parents: BreadcrumbSidebarGroup[], pathname: string): BreadcrumbItem[] {
  return parents.flatMap((parent) => {
    const href = findFirstLinkHref(parent.entries);

    return href && isRealAncestorPath(href, pathname) ? [{ name: parent.label, item: href }] : [];
  });
}

function findBreadcrumbItems(
  entries: BreadcrumbSidebarEntry[],
  pathname: string,
  currentTitle: string,
  parents: BreadcrumbSidebarGroup[] = []
): BreadcrumbItem[] | undefined {
  const normalizedPathname = normalizeComparablePath(pathname);

  for (const entry of entries) {
    if (entry.type === 'link' && normalizeComparablePath(entry.href) === normalizedPathname) {
      const currentItemName =
        (currentTitle === 'Hidden' || currentTitle === 'Overview') && parents.at(-1)
          ? parents.at(-1)!.label
          : entry.label;

      return [
        { name: 'Home', item: '/' },
        ...buildParentBreadcrumbItems(parents, pathname),
        { name: currentItemName, item: entry.href },
      ];
    }

    if (entry.type === 'group') {
      const match = findBreadcrumbItems(entry.entries, pathname, currentTitle, [...parents, entry]);

      if (match) {
        return match;
      }
    }
  }

  return undefined;
}

function findGroupBreadcrumbItems(
  entries: BreadcrumbSidebarEntry[],
  pathname: string,
  currentTitle: string,
  parents: BreadcrumbSidebarGroup[] = []
): BreadcrumbItem[] | undefined {
  const normalizedPathname = normalizeComparablePath(pathname);

  for (const entry of entries) {
    if (entry.type !== 'group') {
      continue;
    }

    const nextParents = [...parents, entry];

    for (const child of entry.entries) {
      if (child.type === 'link' && normalizeComparablePath(child.href).startsWith(`${normalizedPathname}/`)) {
        return [
          { name: 'Home', item: '/' },
          ...buildParentBreadcrumbItems(parents, pathname),
          {
            name: currentTitle === 'Hidden' || currentTitle === 'Overview' ? entry.label : currentTitle,
            item: pathname,
          },
        ];
      }
    }

    const nestedMatch = findGroupBreadcrumbItems(entry.entries, pathname, currentTitle, nextParents);

    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return undefined;
}

export function buildDocBreadcrumbItems({ sidebar, pathname, currentTitle }: BuildDocBreadcrumbItemsOptions) {
  return (
    findBreadcrumbItems(sidebar, pathname, currentTitle) ??
    findGroupBreadcrumbItems(sidebar, pathname, currentTitle) ?? [
      { name: 'Home', item: '/' },
      { name: currentTitle, item: pathname },
    ]
  );
}
