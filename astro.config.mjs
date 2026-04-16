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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: 'https://www.opensimgear.org',
  integrations: [
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
          label: 'Gear',
          autogenerate: { directory: 'gear' },
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
        Hero: './src/components/overrides/Hero.astro',
        PageFrame: './src/components/overrides/PageFrame.astro',
      },
      plugins: [starlightLinksValidator(), starlightAutoSidebar()],
    }),
    sitemap({
      filter: (page) => shouldIncludeInSitemap(new URL(page).pathname),
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
    jopSoftwarecookieconsent({
      guiOptions: {
        consentModal: {
          layout: 'bar',
          position: 'bottom',
          equalWeightButtons: false,
          flipButtons: true,
        },
        preferencesModal: {
          layout: 'bar',
          position: 'right',
          equalWeightButtons: false,
          flipButtons: true,
        },
      },
      categories: {
        necessary: {
          readOnly: true,
        },
        analytics: {
          enabled: true,
          services: {
            ga: {
              label:
                '<a href="https://marketingplatform.google.com/about/analytics/terms/us/" target="_blank">Google Analytics</a>',
              cookies: [
                {
                  name: /^(_ga|_gid)/,
                },
              ],
            },
          },
        },
      },
      language: {
        default: 'en',
        autoDetect: 'browser',
        translations: {
          en: {
            consentModal: {
              title: 'Cookie Consent',
              revisionMessage: "Hi, we've made some changes to our cookie policy since the last time you visited!",
              description:
                'Welcome to our website! To ensure the best browsing experience for you, we use cookies. By clicking "Accept" you agree to the use of cookies as outlined in our Privacy Policy. Your privacy and security are paramount to us. Manage your cookie preferences or learn more by clicking "Cookie Settings". Thank you for your trust in us. <br> {{revisionMessage}}',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Reject all',
              showPreferencesBtn: 'Manage preferences',
              footer:
                '<a href="/policies/privacy-policy">Privacy Policy</a>\n<a href="/policies/terms-and-conditions">Terms and conditions</a>',
            },
            preferencesModal: {
              title: 'Consent Preferences Center',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Reject all',
              savePreferencesBtn: 'Save preferences',
              closeIconLabel: 'Close modal',
              serviceCounterLabel: 'Service|Services',
              sections: [
                {
                  title: 'Cookie Usage',
                  description:
                    'In this panel you can express some preferences related to the processing of your personal information. You may review and change expressed choices at any time by resurfacing this panel via the provided link.To deny your consent to the specific processing activities described below, switch the toggles to off or use the “Reject all” button and confirm you want to save your choices.',
                },
                {
                  title: 'Strictly Necessary Cookies <span class="pm__badge">Always Enabled</span>',
                  description:
                    'This functions are necessary for the website to provide the service requested by you, therefore they do not require your consent.',
                  linkedCategory: 'necessary',
                },
                {
                  title: 'Analytics Cookies',
                  description:
                    'This cookies are used to collect information about how visitors use the website to improve the quality of the provided service. The data collected includes the number of visitors, the source where they have come from, and the pages visited in an anonymous form.',
                  linkedCategory: 'analytics',
                },
                {
                  title: 'More information',
                  description: `For any query in relation to the cookie policy and your choices, please contact us at <a class="cc__link" href="mailto:legal@opensimgear.org">legal@opensimgear.org</a>.`,
                },
              ],
            },
          },
        },
      },
      disablePageInteraction: true,
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

