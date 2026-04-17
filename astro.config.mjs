import path from 'path';
import { defineConfig } from 'astro/config';
import playformCompress from '@playform/compress';
import svelte from '@astrojs/svelte';
import sentry from '@sentry/astro';
import spotlightjs from '@spotlightjs/astro';
import partytown from '@astrojs/partytown';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import starlightLinksValidator from 'starlight-links-validator';
import starlightAutoSidebar from 'starlight-auto-sidebar';
import { shouldIncludeInSitemap } from './src/utils/seo-policy.ts';

import { fileURLToPath } from 'url';

import tailwindcss from '@tailwindcss/vite';

import jopSoftwarecookieconsent from '@jop-software/astro-cookieconsent';
import { cookieConsentSettings } from './cookie-consent.mjs';

import robotsTxt from 'astro-robots-txt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: 'https://www.opensimgear.org',
  integrations: [
    svelte(),
    icon(),
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
        Hero: './src/components/overrides/Hero.astro',
        PageFrame: './src/components/overrides/PageFrame.astro',
      },
      plugins: [starlightLinksValidator(), starlightAutoSidebar()],
    }),
    sitemap({
      filter: (page) => shouldIncludeInSitemap(new URL(page).pathname),
    }),
    robotsTxt(),
    playformCompress(),
    jopSoftwarecookieconsent(cookieConsentSettings),
    sentry({
      enabled: process.env.NODE_ENV !== 'development',
      dsn: 'https://8453bfdc55a4896cbb5cfbe9f8b669a6@o4511237018681344.ingest.de.sentry.io/4511237021565008',
      org: 'qantic-ntrp',
      project: 'open-sim-gear',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
    spotlightjs(),
    partytown({
      config: {
        forward: ['dataLayer.push'],
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

