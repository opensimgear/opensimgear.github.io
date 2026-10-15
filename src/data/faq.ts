type FaqLink = {
  label: string;
  href: string;
};

export type FaqItem = {
  question: string;
  answer: string;
  bullets?: string[];
  links?: FaqLink[];
};

export const faqIntro =
  'OpenSimGear is still growing, so this page covers the questions people are most likely to ask first.';

export const faqItems: FaqItem[] = [
  {
    question: 'What is OpenSimGear?',
    answer:
      'OpenSimGear develops sim racing and flight simulation hardware, firmware, software, calculators and documentation. The public website and repositories describe the architecture and current prototypes. Licensing is under review, and original project material is currently all rights reserved.',
  },
  {
    question: 'Does OpenSimGear currently offer hardware or commercial software licenses?',
    answer:
      'The current hardware remains at prototype status. This website does not currently offer hardware sales or commercial software licenses. Permissions for software use, hardware production and hardware sales are under review; public source access does not authorize them.',
  },
  {
    question: 'Are external contributions accepted?',
    answer:
      'External code, patches, hardware designs, documentation, artwork and other creative contributions are paused while licensing and contribution terms are reviewed. Submitting work does not automatically transfer ownership. Questions and factual bug reports remain possible without submitting proposed patches or designs.',
    links: [{ label: 'Read the contribution policy', href: '/contributing' }],
  },
  {
    question: 'Which licenses are used in this project?',
    answer:
      'Licensing is under review. First-party software, firmware, hardware designs and documentation are currently all rights reserved, with no general personal, noncommercial or commercial license grant. Applicable law, GitHub platform rights, third-party licenses and separate valid permissions remain applicable.',
    links: [{ label: 'Licensing and permissions', href: '/policies/licensing' }],
  },
  {
    question: 'Can I reuse code or designs for a personal or commercial project?',
    answer:
      'There is currently no general permission to reuse original OpenSimGear code or designs, including for personal or noncommercial projects. Public visibility alone does not authorize modification, redistribution, manufacturing or sales. Check the specific notices and any rights provided by law, platform terms, third-party licenses or a separate written agreement.',
    links: [{ label: 'Licensing and permissions', href: '/policies/licensing' }],
  },
  {
    question: 'Where do I ask questions or get support?',
    answer:
      'The website contact details and Discord are available for questions. Factual bug reports can describe a problem and reproduction steps without including a proposed patch or design. Questions about permissions should go to legal@opensimgear.org.',
  },
];
