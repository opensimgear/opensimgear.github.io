// .prettierrc.mjs
/** @type {import("prettier").Config} */
export default {
  printWidth: 120,
  proseWrap: 'always',
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  useTabs: false,
  plugins: ['prettier-plugin-astro'],
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
  ],
};
