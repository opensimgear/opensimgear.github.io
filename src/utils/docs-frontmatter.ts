import fs from 'node:fs';
import path from 'node:path';

const DOCS_ROOT = path.resolve('src/content/docs');
const DOCS_ROOT_SEGMENT = 'src/content/docs/';

export type ParsedDocFrontmatter = {
  filePath: string;
  pathname: string;
  frontmatter: string;
  title: string;
  description: string;
  body: string;
};

export function parseDocFrontmatter(filePath: string): ParsedDocFrontmatter {
  const source = fs.readFileSync(filePath, 'utf8');
  const match = source.match(/^\ufeff?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const frontmatter = match?.[1] ?? '';
  const body = source.slice(match?.[0].length ?? 0);

  return {
    filePath,
    pathname: toDocPathname(filePath),
    frontmatter,
    title: readFrontmatterValue(frontmatter, 'title'),
    description: readFrontmatterValue(frontmatter, 'description'),
    body,
  };
}

function toDocPathname(filePath: string) {
  const normalizedFilePath = filePath.split(path.sep).join('/');
  const docsRootIndex = normalizedFilePath.lastIndexOf(DOCS_ROOT_SEGMENT);
  const relativePath =
    docsRootIndex >= 0
      ? normalizedFilePath.slice(docsRootIndex + DOCS_ROOT_SEGMENT.length)
      : path.relative(DOCS_ROOT, filePath).split(path.sep).join('/');
  const withoutExtension = relativePath.replace(/\.mdx?$/, '');
  const slug = withoutExtension === 'index' ? '' : withoutExtension.replace(/\/index$/, '');

  return slug ? `/${slug}/` : '/';
}

function readFrontmatterValue(frontmatter: string, key: string) {
  const lines = frontmatter.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(new RegExp(`^${key}:\\s*(.*)$`));

    if (!match) {
      continue;
    }

    const value = match[1].trim();
    const parts = value && !isBlockIndicator(value) ? [stripQuotes(value)] : [];

    if (parts.length === 1 && !hasIndentedContinuation(lines, index + 1)) {
      return parts[0];
    }

    let blockIndex = index + 1;

    while (blockIndex < lines.length && /^[ \t]+/.test(lines[blockIndex])) {
      parts.push(lines[blockIndex].replace(/^[ \t]+/, '').trim());
      blockIndex += 1;
    }

    return isLiteralBlockIndicator(value) ? parts.join('\n').trim() : parts.join(' ').trim();
  }

  return '';
}

function hasIndentedContinuation(lines: string[], index: number) {
  return index < lines.length && /^[ \t]+/.test(lines[index]);
}

function isBlockIndicator(value: string) {
  return value === '' || value === '>' || value === '>-' || value === '|' || value === '|-';
}

function isLiteralBlockIndicator(value: string) {
  return value === '|' || value === '|-';
}

function stripQuotes(value: string) {
  return value.replace(/^['"]|['"]$/g, '');
}
