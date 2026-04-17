import path from 'path';
import { defineConfig } from 'astro/config';
import playformCompress from '@playform/compress';
import svelte from '@astrojs/svelte';
import sentry from '@sentry/astro';
import partytown from '@astrojs/partytown';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import starlightLinksValidator from 'starlight-links-validator';
import starlightAutoSidebar from 'starlight-auto-sidebar';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import jopSoftwarecookieconsent from '@jop-software/astro-cookieconsent';
import robotsTxt from 'astro-robots-txt';
import webmanifest from 'astro-webmanifest';
import checks from '@nuasite/checks';

import { shouldIncludeInSitemap } from './src/utils/seo-policy.ts';
import { cookieConsentSettings } from './cookie-consent.mjs';

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
        light: '~/assets/brand-light.png',
        dark: '~/assets/brand-dark.png',
        alt: `${title} Logo`,
        replacesTitle: true,
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
        PageFrame: './src/components/overrides/PageFrame.astro',
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
    jopSoftwarecookieconsent(cookieConsentSettings),
    sentry({
      org: 'qantic-ntrp',
      project: 'open-sim-gear',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
    partytown({
      config: {
        forward: ['dataLayer.push'],
      },
    }),
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

