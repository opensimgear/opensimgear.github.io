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
  footer: {
    categories: FooterCategory[];
  };
  googleAnalytics: {
    id: string;
  };
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
    discord: 'https://discord.gg/f7yWUF6zUs',
  },
  footer: {
    categories: [
      {
        title: 'Project',
        children: [
          {
            title: 'Code of Conduct',
            path: '/policies/code-of-conduct',
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
            title: 'Terms and Conditions',
            path: '/policies/terms-and-conditions',
          },
          {
            title: 'Privacy Policy',
            path: '/policies/privacy-policy',
          },
        ],
      },
    ],
  },
};
