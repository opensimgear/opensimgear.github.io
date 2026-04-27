import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);
const astroSveltePackagePath = fs.realpathSync(require.resolve('@astrojs/svelte/package.json'));
const astroSvelteDir = path.dirname(astroSveltePackagePath);
const sveltePluginModulePath = path.join(
  astroSvelteDir,
  '..',
  '..',
  '@sveltejs',
  'vite-plugin-svelte',
  'src',
  'index.js'
);
const { svelte } = await import(pathToFileURL(sveltePluginModulePath).href);

export default defineConfig({
  plugins: [svelte()],
  assetsInclude: ['**/*.glb'],
  resolve: {
    alias: {
      '~': path.resolve(import.meta.dirname ?? '.', 'src'),
    },
  },
  test: {
    include: ['src/tests/**/*.test.ts'],
    environment: 'node',
  },
});
