import fs from 'node:fs';
import path from 'node:path';

type SidebarLink = {
  label: string;
  link: string;
};

type SidebarGroup = {
  label: string;
  items: SidebarLink[];
};

type SidebarItem = SidebarLink | SidebarGroup;

type PageMeta = {
  title: string;
  order: number;
  hidden: boolean;
  sidebarLabel?: string;
};

function parseFrontmatter(filePath: string): PageMeta {
  const source = fs.readFileSync(filePath, 'utf8');
  const match = source.match(/^---\n([\s\S]*?)\n---/);

  if (!match) {
    throw new Error(`Missing frontmatter in ${filePath}`);
  }

  const frontmatter = match[1];
  const title = readFrontmatterValue(frontmatter, 'title');
  const sidebarBlock = readIndentedBlock(frontmatter, 'sidebar');

  return {
    title,
    order: Number(readBlockValue(sidebarBlock, 'order') ?? Number.MAX_SAFE_INTEGER),
    hidden: readBlockValue(sidebarBlock, 'hidden') === 'true',
    sidebarLabel: readBlockValue(sidebarBlock, 'label'),
  };
}

function readFrontmatterValue(frontmatter: string, key: string) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));

  if (!match) {
    throw new Error(`Missing ${key} in frontmatter`);
  }

  return stripQuotes(match[1].trim());
}

function readIndentedBlock(frontmatter: string, key: string) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*\\n((?:[ \\t].*\\n?)*)`, 'm'));
  return match?.[1] ?? '';
}

function readBlockValue(block: string, key: string) {
  const match = block.match(new RegExp(`^[ \\t]+${key}:\\s*(.+)$`, 'm'));
  return match ? stripQuotes(match[1].trim()) : undefined;
}

function stripQuotes(value: string) {
  return value.replace(/^['"]|['"]$/g, '');
}

function isDocFile(name: string) {
  return /\.mdx?$/.test(name);
}

function toDocLink(relativePath: string) {
  const withoutExtension = relativePath.replace(/\.mdx?$/, '');
  const slug = withoutExtension === 'index' ? '' : withoutExtension.replace(/\/index$/, '');

  return slug ? `/docs/${slug}/` : '/docs/';
}

function comparePages(a: { order: number; relativePath: string }, b: { order: number; relativePath: string }) {
  return a.order - b.order || a.relativePath.localeCompare(b.relativePath);
}

export function buildDocsSidebar({
  docsRoot = path.resolve(process.cwd(), 'src/content/docs/docs'),
} = {}): SidebarItem[] {
  const entries = fs.readdirSync(docsRoot, { withFileTypes: true });
  const sidebarEntries: Array<(SidebarLink | SidebarGroup) & { order: number; relativePath: string }> = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const sectionRoot = path.join(docsRoot, entry.name);
      const sectionFiles = fs
        .readdirSync(sectionRoot)
        .filter(isDocFile)
        .map((name) => {
          const relativePath = path.posix.join(entry.name, name);
          const meta = parseFrontmatter(path.join(sectionRoot, name));

          return {
            relativePath,
            meta,
          };
        })
        .sort((a, b) =>
          comparePages(
            { order: a.meta.order, relativePath: a.relativePath },
            { order: b.meta.order, relativePath: b.relativePath }
          )
        );

      const landingPage = sectionFiles.find(({ relativePath }) => /\/index\.mdx?$/.test(relativePath));

      if (!landingPage) {
        continue;
      }

      const items = sectionFiles
        .filter(({ meta }) => !meta.hidden)
        .map(({ relativePath, meta }) => ({
          label: meta.title,
          link: toDocLink(relativePath),
        }));

      sidebarEntries.push({
        label: landingPage.meta.sidebarLabel ?? entry.name,
        items,
        order: landingPage.meta.order,
        relativePath: landingPage.relativePath,
      });
      continue;
    }

    if (!isDocFile(entry.name)) {
      continue;
    }

    const relativePath = entry.name;
    const meta = parseFrontmatter(path.join(docsRoot, entry.name));

    if (meta.hidden) {
      continue;
    }

    sidebarEntries.push({
      label: meta.title,
      link: toDocLink(relativePath),
      order: meta.order,
      relativePath,
    });
  }

  return sidebarEntries
    .sort((a, b) => comparePages(a, b))
    .map(({ order: _order, relativePath: _relativePath, ...item }) => item);
}
