import type { StarlightRouteData } from '@astrojs/starlight/route-data';

type SidebarEntry = StarlightRouteData['sidebar'][number];
type SidebarGroup = Extract<SidebarEntry, { type: 'group' }>;
type SidebarLink = Extract<SidebarEntry, { type: 'link' }>;
type HeadEntry = StarlightRouteData['head'][number];

type BuildSeoPageTitleOptions = {
  pageTitle: string;
  siteTitle: string;
  pathname: string;
  sidebar: StarlightRouteData['sidebar'];
};

type SidebarMatch = {
  link: SidebarLink;
  parents: SidebarGroup[];
};

function normalizePathname(pathname: string) {
  const [path] = pathname.split(/[?#]/, 1);

  if (!path || path === '/') {
    return '/';
  }

  return path.endsWith('/') ? path.slice(0, -1) : path;
}

function findSidebarMatch(entries: StarlightRouteData['sidebar'], pathname: string, parents: SidebarGroup[] = []): SidebarMatch | undefined {
  const normalizedPathname = normalizePathname(pathname);

  for (const entry of entries) {
    if (entry.type === 'link' && normalizePathname(entry.href) === normalizedPathname) {
      return { link: entry, parents };
    }

    if (entry.type === 'group') {
      const match = findSidebarMatch(entry.entries, pathname, [...parents, entry]);

      if (match) {
        return match;
      }
    }
  }

  return undefined;
}

function findSidebarDescendantMatch(
  entries: StarlightRouteData['sidebar'],
  pathname: string,
  parents: SidebarGroup[] = []
): SidebarMatch | undefined {
  const normalizedPathname = normalizePathname(pathname);

  for (const entry of entries) {
    if (entry.type === 'link' && normalizePathname(entry.href).startsWith(`${normalizedPathname}/`)) {
      return { link: entry, parents };
    }

    if (entry.type === 'group') {
      const match = findSidebarDescendantMatch(entry.entries, pathname, [...parents, entry]);

      if (match) {
        return match;
      }
    }
  }

  return undefined;
}

function findSidebarGroupMatch(
  entries: StarlightRouteData['sidebar'],
  pathname: string,
  parents: SidebarGroup[] = []
): SidebarMatch | undefined {
  for (const entry of entries) {
    if (entry.type !== 'group') {
      continue;
    }

    const groupParents = [...parents, entry];
    const descendantMatch = findSidebarDescendantMatch(entry.entries, pathname, groupParents);

    if (descendantMatch) {
      return descendantMatch;
    }

    const nestedGroupMatch = findSidebarGroupMatch(entry.entries, pathname, groupParents);

    if (nestedGroupMatch) {
      return nestedGroupMatch;
    }
  }

  return undefined;
}

function isGenericTitle(title: string) {
  return title === 'Overview' || title === 'Hidden';
}

function dedupeTitleParts(parts: string[]) {
  const deduped: string[] = [];

  for (const part of parts) {
    if (!part || deduped.includes(part)) {
      continue;
    }

    deduped.push(part);
  }

  return deduped;
}

function isSeoTitleTag(entry: HeadEntry) {
  return entry.tag === 'title'
    || (entry.tag === 'meta' && entry.attrs?.property === 'og:title')
    || (entry.tag === 'meta' && entry.attrs?.name === 'twitter:title');
}

export function replaceSeoTitleTags(head: StarlightRouteData['head'], seoTitle: string): StarlightRouteData['head'] {
  return head.map((entry) => {
    if (!isSeoTitleTag(entry)) {
      return entry;
    }

    if (entry.tag === 'title') {
      return {
        ...entry,
        content: seoTitle,
      };
    }

    return {
      ...entry,
      attrs: {
        ...entry.attrs,
        content: seoTitle,
      },
    };
  });
}

export function buildSeoPageTitle({ pageTitle, siteTitle, pathname, sidebar }: BuildSeoPageTitleOptions) {
  const match = findSidebarMatch(sidebar, pathname) ?? (isGenericTitle(pageTitle) ? findSidebarGroupMatch(sidebar, pathname) : undefined);
  const topLevelParent = match?.parents[0]?.label;
  const nearestParent = match?.parents.at(-1)?.label;

  if (!topLevelParent) {
    return [pageTitle, siteTitle].join(' | ');
  }

  if (isGenericTitle(pageTitle)) {
    return [`${nearestParent ?? topLevelParent} Overview`, siteTitle].join(' | ');
  }

  return dedupeTitleParts([pageTitle, topLevelParent, siteTitle]).join(' | ');
}
