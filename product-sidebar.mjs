import { readFileSync } from 'node:fs';

const productsPath = new URL('./src/data/3rdparty-products.json', import.meta.url);
const productDatabase = JSON.parse(readFileSync(productsPath, 'utf8'));

const kindLabels = {
  commercial: 'Commercial',
  opensource: 'Open Source',
};

const kindOrder = ['opensource', 'commercial'];

function titleCaseSlug(value) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function productHref(product) {
  return `/products/${product.kind}/${product.component_category}/${product.slug}/`;
}

function productName(product) {
  return product.product_name ?? product.project_name ?? '';
}

function compareLabels(a, b) {
  return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
}

function buildCategoryItem(kind, category, products) {
  const categoryProducts = products
    .filter((product) => product.kind === kind && product.component_category === category)
    .map((product) => ({
      label: productName(product),
      link: productHref(product),
    }))
    .sort(compareLabels);

  return {
    label: titleCaseSlug(category),
    collapsed: true,
    items: categoryProducts,
  };
}

function buildKindItem(kind, products) {
  const categories = Array.from(
    new Set(products.filter((product) => product.kind === kind).map((product) => product.component_category))
  ).sort((a, b) => titleCaseSlug(a).localeCompare(titleCaseSlug(b), undefined, { sensitivity: 'base' }));

  return {
    label: kindLabels[kind],
    collapsed: true,
    items: categories.map((category) => buildCategoryItem(kind, category, products)),
  };
}

export const productSidebarItems = [
  { label: 'Product Search', link: '/products/' },
  ...kindOrder.map((kind) => buildKindItem(kind, productDatabase.products)),
];
