import { describe, expect, it } from 'vitest';

import { buildTwitterMetaHead } from '../../utils/social-meta';

describe('buildTwitterMetaHead', () => {
  it('derives twitter title and description from existing head entries when missing', () => {
    const head = [
      { tag: 'title', content: 'OpenSimGear Docs' },
      { tag: 'meta', attrs: { name: 'description', content: 'Flight sim docs and calculators.' } },
    ];

    expect(buildTwitterMetaHead(head)).toEqual([
      { tag: 'meta', attrs: { name: 'twitter:title', content: 'OpenSimGear Docs' } },
      { tag: 'meta', attrs: { name: 'twitter:description', content: 'Flight sim docs and calculators.' } },
    ]);
  });

  it('does not duplicate twitter title or description when already present', () => {
    const head = [
      { tag: 'title', content: 'OpenSimGear Docs' },
      { tag: 'meta', attrs: { name: 'description', content: 'Flight sim docs and calculators.' } },
      { tag: 'meta', attrs: { name: 'twitter:title', content: 'Custom Twitter Title' } },
      { tag: 'meta', attrs: { name: 'twitter:description', content: 'Custom Twitter Description' } },
    ];

    expect(buildTwitterMetaHead(head)).toEqual([]);
  });
});
