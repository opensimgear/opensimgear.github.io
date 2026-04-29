import { getCollection } from 'astro:content';

export const prerender = true;

export async function GET() {
  const products = (await getCollection('products'))
    .map((product) => product.data)
    .sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name));

  return new Response(JSON.stringify({ products }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
