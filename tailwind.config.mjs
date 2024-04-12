/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';
import preline from 'preline/plugin';
import typography from '@tailwindcss/typography';

export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    'node_modules/preline/dist/*.js',
  ],
  theme: {
    colors: {},
    fontFamily: {
      sans: ['Inter Variable', 'Inter', ...defaultTheme.fontFamily.sans],
      serif: ['Merriweather', 'serif'],
    },
  },
  plugins: [preline, typography],
  safelist: [
    ...[...Array(5).keys()].map((i) => `lg:col-span-${i}`),
  ]
};
