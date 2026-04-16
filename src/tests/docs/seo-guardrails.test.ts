import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseDocFrontmatter } from '../../utils/docs-frontmatter';
import { getSeoPolicy } from '../../utils/seo-policy';

const docsRoot = path.resolve('src/content/docs');

function collectDocFiles(root: string): string[] {
  const entries = fs.readdirSync(root, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      return collectDocFiles(fullPath);
    }

    return /\.mdx?$/.test(entry.name) ? [fullPath] : [];
  });
}

function createTempDocFile(source: string) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-guardrails-'));
  const filePath = path.join(tempDir, 'src/content/docs/example.mdx');

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, source, 'utf8');

  return filePath;
}

describe('docs SEO guardrails', () => {
  it('parses frontmatter with BOM and CRLF line endings', () => {
    const filePath = createTempDocFile(
      '\ufeff---\r\ntitle: Example\r\ndescription: Example description\r\n---\r\n\r\nBody copy\r\n'
    );

    expect(parseDocFrontmatter(filePath)).toMatchObject({
      pathname: '/example/',
      frontmatter: 'title: Example\r\ndescription: Example description',
      title: 'Example',
      description: 'Example description',
    });
    expect(parseDocFrontmatter(filePath).body).toContain('Body copy');
  });

  it('parses description with inline value plus continued indented lines', () => {
    const filePath = createTempDocFile(`---
title: Example
description: First sentence.
  Second sentence.
  Third sentence.
sidebar:
  hidden: true
---
`);

    expect(parseDocFrontmatter(filePath).description).toBe('First sentence. Second sentence. Third sentence.');
  });

  it('parses multiline descriptions without swallowing sibling frontmatter keys', () => {
    expect(parseDocFrontmatter(path.join(docsRoot, '3rdparty/index.md')).description).toBe(
      'Third-party sim racing and flight simulation projects collected by OpenSimGear, including community belt tensioners and other DIY hardware ideas.'
    );
    expect(parseDocFrontmatter(path.join(docsRoot, '3rdparty/belt-tensioners/flagghost.mdx')).description).toBe(
      'Overview of the Flag Ghost belt tensioner project, a community DIY harness tensioner using stepper motors and printed parts for sim racing cueing.'
    );
  });

  it('requires non-empty descriptions for indexable pages', () => {
    const failures = collectDocFiles(docsRoot)
      .map(parseDocFrontmatter)
      .filter(({ pathname }) => getSeoPolicy(pathname).index)
      .filter(({ description }) => description.trim().length === 0)
      .map(({ pathname }) => pathname);

    expect(failures).toEqual([]);
  });

  it('blocks placeholder copy on indexable pages', () => {
    const failures = collectDocFiles(docsRoot)
      .map(parseDocFrontmatter)
      .filter(({ pathname }) => getSeoPolicy(pathname).index)
      .filter(({ description, body }) => /coming soon/i.test(description) || /coming soon/i.test(body))
      .map(({ pathname }) => pathname);

    expect(failures).toEqual([]);
  });

  it('blocks placeholder metadata on indexable pages', () => {
    const failures = collectDocFiles(docsRoot)
      .map(parseDocFrontmatter)
      .filter(({ pathname }) => getSeoPolicy(pathname).index)
      .filter(({ title, description }) => /^(hidden)$/i.test(title.trim()) || /^(hidden)$/i.test(description.trim()))
      .map(({ pathname }) => pathname);

    expect(failures).toEqual([]);
  });
});
