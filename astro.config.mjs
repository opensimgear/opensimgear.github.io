import path from 'path';
import { defineConfig } from 'astro/config';
import playformCompress from '@playform/compress';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind';
import sentry from '@sentry/astro';
import spotlightjs from '@spotlightjs/astro';
import partytown from '@astrojs/partytown';
import starlight from '@astrojs/starlight';
import icon from 'astro-icon';

import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: 'https://opensimgear.org',
  integrations: [
    tailwind({ applyBaseStyles: false }),
    starlight({
      title: 'OpenSimGear',
      logo: {
        light: '~/assets/logo.png',
        dark: '~/assets/logo-dark.png',
        alt: 'OpenSimGear Logo',
        replacesTitle: true,
      },
      editLink: {
        baseUrl: 'https://github.com/opensimgear/opensimgear.github.io/edit/main/',
      },
      social: {
        github: 'https://github.com/orgs/opensimgear/repositories',
        discord: 'https://discord.gg/f7yWUF6zUs',
      },
      customCss: ['./src/custom.css'],
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'Getting started', link: '/getting-started' },
            { label: 'Contributing', link: '/contributing' },
            { label: 'FAQ', link: '/faq' },
          ],
        },
        {
          label: 'Docs',
          autogenerate: { directory: 'docs' },
        },
        {
          label: 'Calculators',
          autogenerate: { directory: 'calculators' },
        },
        {
          label: 'Gear',
          autogenerate: { directory: 'gear' },
        },
      ],
      components: {
        Head: './src/components/overrides/Head.astro',
        Hero: './src/components/overrides/Hero.astro',
        PageFrame: './src/components/overrides/PageFrame.astro',
      },
      plugins: [],
    }),
    icon(),
    svelte(),
    sentry({
      enabled: process.env.NODE_ENV === 'development',
    }),
    spotlightjs(),
    partytown({
      config: {
        forward: ['dataLayer.push'],
      },
    }),
    playformCompress(),
  ],
  vite: {
    resolve: {
      alias: {
        '~': path.resolve(__dirname, './src'),
      },
    },
    ssr: {
      noExternal: ['three'],
    },
  },
});
