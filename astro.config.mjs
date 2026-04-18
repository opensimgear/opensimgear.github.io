import path from 'path';
import { defineConfig } from 'astro/config';
import playformCompress from '@playform/compress';
import svelte from '@astrojs/svelte';
import sentry from '@sentry/astro';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import starlightLinksValidator from 'starlight-links-validator';
import starlightAutoSidebar from 'starlight-auto-sidebar';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import robotsTxt from 'astro-robots-txt';
import webmanifest from 'astro-webmanifest';
import checks from '@nuasite/checks';
import spotlightjs from '@spotlightjs/astro';
import starlightLlmsTxt from 'starlight-llms-txt';

import { shouldIncludeInSitemap } from './src/utils/seo-policy.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const title = 'OpenSimGear';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.opensimgear.org',
  integrations: [
    svelte(),
    icon(),
    starlight({
      title,
      logo: {
        light: '~/assets/logo-light.svg',
        dark: '~/assets/logo-dark.svg',
        alt: `${title} Logo`,
        replacesTitle: false,
      },
      editLink: {
        baseUrl: 'https://github.com/opensimgear/opensimgear.github.io/edit/main/',
      },
      social: [
        {
          label: 'Github',
          icon: 'github',
          href: 'https://github.com/orgs/opensimgear/repositories',
        },
        {
          label: 'Discord',
          icon: 'discord',
          href: 'https://discord.gg/ShBdugyn',
        },
      ],
      customCss: ['./src/styles/global.css'],
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
          badge: {
            text: 'WIP',
            variant: 'caution',
          },
        },
        {
          label: 'Calculators',
          autogenerate: { directory: 'calculators' },
        },
        {
          label: '3rd Party',
          autogenerate: { directory: '3rdparty' },
          badge: {
            text: 'WIP',
            variant: 'caution',
          },
        },
      ],
      components: {
        Head: './src/components/overrides/Head.astro',
        SiteTitle: './src/components/overrides/SiteTitle.astro',
      },
      plugins: [starlightLinksValidator(), starlightAutoSidebar()],
    }),
    sitemap({
      filter: (page) => shouldIncludeInSitemap(new URL(page).pathname),
    }),
    robotsTxt(),
    webmanifest({
      name: title,
      icon: 'src/assets/logo.svg',
      lang: 'en-US',
      description: 'Open Source Sim Racing & Flight Simulation Hardware',
      start_url: '/',
      theme_color: '#ABD0A5',
      background_color: '#16181C',
      display: 'standalone',
      insertAppleTouchLinks: true,
    }),
    playformCompress(),
    sentry({
      org: 'qantic-ntrp',
      project: 'open-sim-gear',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
    // spotlightjs(),
    checks({
      mode: 'full', // 'auto' | 'full' | 'essential'
      seo: { titleMaxLength: 70 },
      geo: { minContentLength: 500 },
      performance: { maxHtmlSize: 200_000 },
      accessibility: true,
      failOnError: true,
      failOnWarning: false,
      reportJson: true,
      overrides: {
        'seo/noindex-detected': false, // disable entirely
      },
    }),
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
    plugins: [tailwindcss()],
  },
});
