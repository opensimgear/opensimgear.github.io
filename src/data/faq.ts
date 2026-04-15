export type FaqLink = {
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
      'OpenSimGear is an open-source project focused on sim racing and flight simulation hardware, firmware, software, calculators, and documentation. The goal is to make it easier for builders and enthusiasts to understand, build, and improve their own sim gear.',
  },
  {
    question: 'Is OpenSimGear a store or a hardware manufacturer?',
    answer:
      'No. OpenSimGear is not a store and does not sell finished hardware. It is a documentation and open-source ecosystem project built around shared designs, technical references, and tools for the community.',
  },
  {
    question: 'How can I help?',
    answer: 'You can help in a few different ways:',
    bullets: [
      'improve docs that are thin, unclear, or outdated',
      'share hardware designs, build notes, or project references',
      'fix software issues or help shape site features',
      'test calculators and pages, then report what feels broken or confusing',
    ],
    links: [{ label: 'Read the contributing page', href: '/contributing' }],
  },
  {
    question: 'Which licenses are used in this project?',
    answer: 'OpenSimGear mainly uses two licenses:',
    bullets: [
      'AGPL-3.0 for software-related work',
      'CERN-OHL-S for hardware-related work',
      'Check the license in the specific repository before you reuse anything.',
    ],
    links: [
      { label: 'AGPL-3.0', href: 'https://www.gnu.org/licenses/agpl-3.0.txt' },
      { label: 'CERN-OHL-S', href: 'https://ohwr.org/cern_ohl_s_v2.txt' },
    ],
  },
  {
    question: 'Can I use OpenSimGear designs in my own project?',
    answer:
      'Usually yes, but the exact answer depends on the license attached to the repository or design you want to reuse. If you plan to modify, redistribute, or commercialize the work, read that license first instead of guessing.',
  },
  {
    question: 'Where do I ask questions or get support?',
    answer:
      'If you have a question, send an email or join the Discord community. If your question is about contributing, the contributing page is still the best place to start because it explains where help is useful and how to jump in.',
  },
];
