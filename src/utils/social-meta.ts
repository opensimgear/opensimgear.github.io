type HeadAttrs = Record<string, string | boolean | undefined>;

export type HeadEntry = {
  tag: string;
  attrs?: HeadAttrs;
  content?: string;
};

function findMetaContent(head: HeadEntry[], name: string) {
  return head.find((entry) => entry.tag === 'meta' && entry.attrs?.name === name)?.attrs?.content;
}

function findTitleContent(head: HeadEntry[]) {
  return head.find((entry) => entry.tag === 'title')?.content;
}

export function buildTwitterMetaHead(head: HeadEntry[]) {
  const twitterTitle = findMetaContent(head, 'twitter:title');
  const twitterDescription = findMetaContent(head, 'twitter:description');
  const title = findTitleContent(head);
  const description = findMetaContent(head, 'description');

  return [
    ...(!twitterTitle && title ? [{ tag: 'meta', attrs: { name: 'twitter:title', content: title } }] : []),
    ...(!twitterDescription && description
      ? [{ tag: 'meta', attrs: { name: 'twitter:description', content: description } }]
      : []),
  ];
}
