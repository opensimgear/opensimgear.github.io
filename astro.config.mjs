import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import playformCompress from '@playform/compress';
import sitemap from '@astrojs/sitemap';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind';
import icon from 'astro-icon';

import sentry from '@sentry/astro';
import spotlightjs from '@spotlightjs/astro';

// https://astro.build/config
export default defineConfig({
  site: 'https://opensimgear.org',
  integrations: [
    tailwind(),
    icon(),
    mdx(),
    sitemap(),
    svelte(),
    playformCompress(),
    sentry({
      enabled: process.env.NODE_ENV === 'development',
    }),
    spotlightjs(),
  ],
});
