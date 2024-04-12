type MenuItem = {
  title: string;
  path: string;
  children?: MenuItem[];
  badge?: boolean;
};

type FooterCategory = {
  title: string;
  children: FooterItem[];
};

type FooterItem = {
  title: string;
  path: string;
};

export interface Config {
  brand: string[];
  social: {
    github: string;
    discord: string;
  };
  navbar: MenuItem[];
  footer: {
    categories: FooterCategory[];
  };
}

export const config: Config = {
  brand: ['Open', 'Sim', 'Gear'],
  social: {
    github: 'https://github.com/orgs/opensimgear/repositories',
    discord: 'https://discord.gg/SyfGA4eA3j',
  },
  navbar: [
    {
      title: 'Docs',
      path: '/docs',
    },
    {
      title: 'About',
      path: '/about',
    },
  ],
  footer: {
    categories: [
      {
        title: 'Project',
        children: [
          {
            title: 'About',
            path: '/about',
          },
          {
            title: 'Contributing',
            path: '/contributing',
          },
        ],
      },
      {
        title: 'Terms and Policies',
        children: [
          {
            title: 'Code of Conduct',
            path: '/policies/code-of-conduct',
          },
          {
            title: 'License',
            path: '/policies/license',
          },
          {
            title: 'Privacy Policy',
            path: '/policies/privacy-policy',
          },
          {
            title: 'Terms of Service',
            path: '/policies/terms-of-service',
          },
        ],
      },
    ],
  },
};
