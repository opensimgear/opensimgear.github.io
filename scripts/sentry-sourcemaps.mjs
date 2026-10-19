import { readdir, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

export function verifySourceMap(script, sourceMap, filename, requiresSources = true) {
  const id = script.match(/\/\/# debugId=([\da-f-]+)/i)?.[1];
  if (!id || id !== (sourceMap.debug_id ?? sourceMap.debugId)) {
    throw new Error(`${filename}: JavaScript and source map debug IDs do not match`);
  }
  if (
    requiresSources &&
    (!sourceMap.mappings ||
      !sourceMap.sources?.length ||
      sourceMap.sourcesContent?.length !== sourceMap.sources.length ||
      !sourceMap.sourcesContent.every((source) => typeof source === 'string') ||
      !sourceMap.sourcesContent.some((source) => source.trim().length > 0))
  ) {
    throw new Error(`${filename}: source map is missing original sourcesContent or mappings`);
  }
  if (/\/\/[#@] sourceMappingURL=/.test(script)) {
    throw new Error(`${filename}: source map must remain hidden`);
  }
}

export function verifyUploadReport(report, expectedIds) {
  const scripts = report.split(/Scripts:?[ \t]*\r?\n/i)[1]?.split(/Source Maps/i)[0];
  const maps = report.split(/Source Maps:?[ \t]*\r?\n/i)[1];
  if (!maps || !/uploaded files to sentry|upload complete|upload completed/i.test(report)) {
    throw new Error('Sentry upload did not confirm uploaded Source Maps');
  }
  if (
    /warning:.*(?:source.?map|debug.?id)|(?:could not|unable to|missing|no) (?:find |detect )?(?:matching )?source.?maps?/i.test(
      report
    )
  ) {
    throw new Error('Sentry upload reported missing source maps or debug IDs');
  }
  for (const id of expectedIds) {
    if (!scripts?.includes(id)) throw new Error(`Sentry upload report is missing script ${id}`);
    if (!maps.includes(id)) throw new Error(`Sentry upload report is missing source map ${id}`);
  }
}

export function requireUploadToken(env) {
  if (env.SENTRY_REQUIRE_UPLOAD === 'true' && !env.SENTRY_AUTH_TOKEN?.trim()) {
    throw new Error('SENTRY_AUTH_TOKEN is required for production deployment');
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const filename = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(filename) : [filename];
      })
    )
  ).flat();
}

function cli(args, env) {
  // Reuse the exact CLI version installed by the Sentry integration.
  const require = createRequire(import.meta.url);
  const astroRequire = createRequire(require.resolve('@sentry/astro'));
  const viteRequire = createRequire(astroRequire.resolve('@sentry/vite-plugin'));
  const coreRequire = createRequire(viteRequire.resolve('@sentry/bundler-plugin-core'));
  const result = spawnSync(coreRequire('@sentry/cli').getPath(), args, {
    env: { ...env, SENTRY_ORG: 'qantic-ntrp', SENTRY_PROJECT: 'open-sim-gear' },
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const report = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  process.stdout.write(report);
  if (result.error || result.status !== 0) throw new Error('Sentry CLI failed', { cause: result.error });
  return report;
}

export async function finalizeSourceMaps(directory, env = process.env, runCli = cli, chunks = []) {
  requireUploadToken(env);
  // Injection happens after all Astro integrations have produced the deployed bytes.
  const clientDirectory = path.join(directory, '_astro');
  const files = await walk(clientDirectory);
  const inventory = new Map(chunks.map((chunk) => [path.join(directory, chunk.filename), chunk]));
  // Astro can inline a generated chunk and remove its JS, leaving an orphan map.
  const scripts = files.filter((filename) => filename.endsWith('.js') && inventory.has(filename));
  if (!scripts.length) throw new Error('No client JavaScript found to verify');
  const assets = scripts.flatMap((filename) => [filename, `${filename}.map`]);
  // A missing map for any surviving compiled chunk must fail before injection/upload.
  await Promise.all(scripts.map((filename) => readFile(`${filename}.map`, 'utf8')));
  runCli(['sourcemaps', 'inject', ...assets], env);
  const ids = [];
  for (const filename of scripts) {
    const script = await readFile(filename, 'utf8');
    const map = JSON.parse(await readFile(`${filename}.map`, 'utf8'));
    verifySourceMap(script, map, filename, inventory.get(filename).requiresSources);
    ids.push(map.debug_id ?? map.debugId);
  }
  console.log(`Verified ${ids.length} client source maps with original sources and matching debug IDs.`);
  if (env.SENTRY_AUTH_TOKEN?.trim()) {
    verifyUploadReport(
      runCli(['sourcemaps', 'upload', '--validate', '--strict', '--wait-for', '60', ...assets], env),
      ids
    );
    console.log('Sentry client source map upload verified.');
  } else {
    console.log('Skipping Sentry upload: no token supplied (local or untrusted PR build).');
  }
  await Promise.all(files.filter((filename) => filename.endsWith('.map')).map((filename) => unlink(filename)));
}

export function recordClientChunks(chunks) {
  return {
    name: 'record-sentry-client-chunks',
    generateBundle(_options, bundle) {
      if (this.environment.name !== 'client') return;
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk' || !output.fileName.endsWith('.js')) continue;
        const requiresSources = Object.entries(output.modules).some(
          ([id, module]) => module.renderedLength > 0 && !id.startsWith('\0') && path.isAbsolute(id)
        );
        chunks.set(output.fileName, { filename: output.fileName, requiresSources });
      }
    },
  };
}

export default function verifiedSentrySourceMaps() {
  const chunks = new Map();
  return {
    name: 'verified-sentry-source-maps',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        requireUploadToken(process.env);
        updateConfig({ vite: { plugins: [recordClientChunks(chunks)] } });
      },
      'astro:build:done': ({ dir }) => finalizeSourceMaps(fileURLToPath(dir), process.env, cli, [...chunks.values()]),
    },
  };
}
