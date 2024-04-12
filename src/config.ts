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
  site: string;
  contacts: {
    info: string;
    abuse: string;
    legal: string;
  };
  brand: string[];
  social: {
    github: string;
    discord: string;
  };
  navbar: MenuItem[];
  footer: {
    categories: FooterCategory[];
  };
  googleAnalytics: {
    id: string;
  }
}

export const config: Config = {
  site: 'https://opensimgear.org',
  contacts: {
    info: 'info@opensimgear.org',
    abuse: 'abuse@opensimgear.org',
    legal: 'legal@opensimgear.org',
  },
  googleAnalytics: {
    id: 'G-ZQWXBWD37M',
  },
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
            title: 'Code of Conduct',
            path: '/policies/code-of-conduct',
          },
          {
            title: 'Contributing',
            path: '/contributing',
          },
          {
            title: 'Contacts',
            path: '/contacts',
          },
        ],
      },
      {
        title: 'Terms and Policies',
        children: [
          {
            title: 'Licenses',
            path: '/policies/licenses',
          },
          {
            title: 'Privacy Policy',
            path: '/policies/privacy-policy',
          },
          {
            title: 'Terms and Conditions',
            path: '/policies/terms-and-conditions',
          },
        ],
      },
    ],
  },
};
