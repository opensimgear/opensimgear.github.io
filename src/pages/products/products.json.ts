import { getCollection } from 'astro:content';

export const prerender = true;

export async function GET() {
  const products = (await getCollection('products'))
    .map((product) => product.data)
    .sort((a, b) =>
      (a.product_name ?? a.project_name ?? '').localeCompare(b.product_name ?? b.project_name ?? '')
    );

  return new Response(JSON.stringify({ products }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
