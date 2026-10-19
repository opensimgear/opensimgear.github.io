import { mkdtemp, mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  finalizeSourceMaps,
  recordClientChunks,
  requireUploadToken,
  verifySourceMap,
  verifyUploadReport,
} from '~/../scripts/sentry-sourcemaps.mjs';

const id = '12345678-1234-1234-1234-123456789abc';
const script = `console.log('built');\n//# debugId=${id}`;
const map = {
  debug_id: id,
  mappings: 'AAAA',
  sources: ['src/example.ts'],
  sourcesContent: ["console.log('original');"],
};
const report = `Uploaded files to Sentry\nSource Map Upload Report\n  Scripts\n    client.js (debug id ${id})\n  Source Maps\n    client.js.map (debug id ${id})`;
const chunks = [{ filename: '_astro/client.js', requiresSources: true }];
const folders: string[] = [];
afterEach(async () => {
  await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

it('accepts hidden source maps with embedded original sources and matching debug IDs', () => {
  expect(() => verifySourceMap(script, map, 'client.js')).not.toThrow();
});
it.each([
  { ...map, debug_id: 'different' },
  { ...map, mappings: '' },
  { ...map, sourcesContent: undefined },
  { ...map, sourcesContent: [null] },
  { ...map, sourcesContent: [''] },
  { ...map, sourcesContent: ['one', 'extra'] },
  { ...map, sources: [] },
])('rejects unusable maps', (invalid) => {
  expect(() => verifySourceMap(script, invalid, 'client.js')).toThrow('client.js');
});
it('rejects JavaScript without debug IDs or with public source map references', () => {
  expect(() => verifySourceMap('console.log(1)', map, 'client.js')).toThrow();
  expect(() => verifySourceMap(`${script}\n//# sourceMappingURL=client.js.map`, map, 'client.js')).toThrow('hidden');
});
it('requires deployment credentials while allowing local and fork builds', () => {
  expect(() => requireUploadToken({ SENTRY_REQUIRE_UPLOAD: 'true' })).toThrow('required');
  expect(() => requireUploadToken({ SENTRY_REQUIRE_UPLOAD: 'true', SENTRY_AUTH_TOKEN: ' ' })).toThrow();
  expect(() => requireUploadToken({})).not.toThrow();
  expect(() => requireUploadToken({ SENTRY_REQUIRE_UPLOAD: 'true', SENTRY_AUTH_TOKEN: 'test' })).not.toThrow();
});
it('checks real upload report completion and every map debug ID', () => {
  expect(() => verifyUploadReport(report, [id])).not.toThrow();
  for (const invalid of [
    'Upload complete',
    report.replace('Uploaded files to Sentry', ''),
    report.replace('Source Maps', 'Assets'),
    `${report}\nwarning: could not determine a source map reference`,
    report.replace(`${id})`, 'different)').replace(`${id})`, 'different)'),
  ]) {
    expect(() => verifyUploadReport(invalid, [id])).toThrow();
  }
});

describe('final build verification and cleanup', () => {
  async function fixture() {
    const base = path.resolve(process.cwd(), '../.research');
    await mkdir(base, { recursive: true });
    const directory = await mkdtemp(path.join(base, 'sentry-test-'));
    folders.push(directory);
    await mkdir(path.join(directory, '_astro'));
    await writeFile(path.join(directory, '_astro/client.js'), script);
    await writeFile(path.join(directory, '_astro/client.js.map'), JSON.stringify(map));
    return directory;
  }
  it.each([{}, { SENTRY_AUTH_TOKEN: 'test' }])(
    'verifies assets and removes maps after successful optional upload',
    async (env) => {
      const directory = await fixture();
      const runCli = vi.fn((_args: string[], _env: Record<string, string>) => report);
      vi.spyOn(console, 'log').mockImplementation(() => {});
      await finalizeSourceMaps(directory, env, runCli, chunks);
      expect(await readdir(path.join(directory, '_astro'))).toEqual(['client.js']);
      expect(runCli).toHaveBeenCalledTimes(env.SENTRY_AUTH_TOKEN ? 2 : 1);
    }
  );
  it('fails closed and retains maps if upload report verification fails', async () => {
    const directory = await fixture();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(
      finalizeSourceMaps(directory, { SENTRY_AUTH_TOKEN: 'test' }, () => 'Upload complete', chunks)
    ).rejects.toThrow();
    expect(await readdir(path.join(directory, '_astro'))).toContain('client.js.map');
  });
  it('rejects builds without client scripts', async () => {
    const directory = await fixture();
    await rm(path.join(directory, '_astro/client.js'));
    await expect(finalizeSourceMaps(directory, {}, () => '', chunks)).rejects.toThrow('No client JavaScript');
  });
});

it('permits empty maps only for generated helpers and facades', () => {
  const generated = { debug_id: id, sources: [], mappings: '' };
  expect(() => verifySourceMap(script, generated, 'helper.js', false)).not.toThrow();
  expect(() => verifySourceMap(script, generated, 'application.js', true)).toThrow('original');
  expect(() => verifySourceMap('missing ID', generated, 'helper.js', false)).toThrow('debug IDs');
});
it('records browser chunks and classifies original sources separately from virtual helpers and facades', () => {
  const chunks = new Map();
  const plugin = recordClientChunks(chunks);
  const output = (fileName: string, modules: Record<string, { renderedLength: number }>) => ({
    type: 'chunk',
    fileName,
    modules,
  });
  const bundle = {
    app: output('_astro/app.js', { '/project/src/app.ts': { renderedLength: 20 } }),
    helper: output('_astro/helper.js', { '\0vite/preload-helper.js': { renderedLength: 20 } }),
    facade: output('_astro/facade.js', { '/project/src/types.ts': { renderedLength: 0 } }),
    copied: { type: 'asset', fileName: '_astro/vendor.js' },
  };
  plugin.generateBundle.call({ environment: { name: 'ssr' } }, {}, bundle);
  expect([...chunks.values()]).toEqual([]);
  plugin.generateBundle.call({ environment: { name: 'client' } }, {}, bundle);
  expect([...chunks.values()]).toEqual([
    { filename: '_astro/app.js', requiresSources: true },
    { filename: '_astro/helper.js', requiresSources: false },
    { filename: '_astro/facade.js', requiresSources: false },
  ]);
});
it('excludes copied JS and inlined chunks while deleting orphan maps', async () => {
  const base = path.resolve(process.cwd(), '../.research');
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(path.join(base, 'sentry-test-'));
  folders.push(directory);
  await mkdir(path.join(directory, '_astro'));
  await writeFile(path.join(directory, '_astro/client.js'), script);
  await writeFile(path.join(directory, '_astro/client.js.map'), JSON.stringify(map));
  await writeFile(path.join(directory, '_astro/copied.js'), 'vendor');
  await writeFile(path.join(directory, '_astro/inlined.js.map'), '{}');
  const runCli = vi.fn((_args: string[], _env: Record<string, string>) => report);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  await finalizeSourceMaps(directory, { SENTRY_AUTH_TOKEN: 'test' }, runCli, [
    ...chunks,
    { filename: '_astro/inlined.js', requiresSources: true },
  ]);
  expect(await readdir(path.join(directory, '_astro'))).toEqual(['client.js', 'copied.js']);
  expect(runCli.mock.calls[0][0]).toEqual([
    'sourcemaps',
    'inject',
    path.join(directory, '_astro/client.js'),
    path.join(directory, '_astro/client.js.map'),
  ]);
  expect(runCli.mock.calls[1][0]).toContain('--strict');
  expect(runCli.mock.calls[1][0]).toContain('--wait-for');
  await expect(finalizeSourceMaps(directory, {}, runCli, chunks)).rejects.toThrow('ENOENT');
});
