/** @type {import('tailwindcss').Config} */
import defaultTheme from 'tailwindcss/defaultTheme';
import typography from '@tailwindcss/typography';
import starlightPlugin from '@astrojs/starlight-tailwind';

// Generated color palettes
const accent = {
  200: '#a0d9ab',
  600: '#00823a',
  900: '#003e18',
  950: '#002d0f',
};
const gray = {
  100: '#f6f6f6',
  200: '#eeedee',
  300: '#c2c1c2',
  400: '#8d8b8c',
  500: '#595758',
  700: '#393839',
  800: '#282627',
  900: '#191818',
};

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        accent,
        gray,
      },
    },
    fontFamily: {
      sans: ['Inter Variable', 'Inter', ...defaultTheme.fontFamily.sans],
      serif: ['Merriweather', 'serif'],
    },
  },
  plugins: [typography(), starlightPlugin()],
  safelist: [...[...Array(5).keys()].map((i) => `lg:col-span-${i}`)],
};
