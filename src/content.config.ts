import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { autoSidebarLoader } from 'starlight-auto-sidebar/loader';
import { autoSidebarSchema } from 'starlight-auto-sidebar/schema';

const productValueSchema = z.union([z.string(), z.array(z.string()), z.null()]);
const productImageSchema = z.object({
  url: z.string(),
  asset: z.string(),
  alt: z.string(),
  source_url: z.string().nullable(),
  source_type: z.string(),
  width: z.number(),
  height: z.number(),
  format: z.string(),
});

const products = defineCollection({
  loader: file('src/data/3rdparty-products.json', {
    parser: (text) => JSON.parse(text).products,
  }),
  schema: z.looseObject({
    id: z.string(),
    kind: z.enum(['commercial', 'opensource']),
    name: z.string(),
    title: z.string(),
    slug: z.string(),
    component_category: z.string(),
    component_categories: z.array(z.string()),
    declared_component_category: productValueSchema.optional(),
    category_group: z.string().nullable(),
    subcategory: z.string().nullable(),
    subcategory_path: z.array(z.string()),
    source_file: z.string(),
    last_checked: z.string().nullable(),
    urls: z.object({
      official: z.string().nullable(),
      repo: z.string().nullable(),
      docs: z.string().nullable(),
      sources: z.array(z.string()),
    }),
    organization: z.object({
      manufacturer: z.string().nullable(),
      maintainer_or_org: z.string().nullable(),
      display: z.string().nullable(),
    }),
    availability: z.object({
      status: z.string().nullable(),
      maturity_or_status: z.string().nullable(),
      price_or_msrp: z.string().nullable(),
      region_or_availability: z.string().nullable(),
      license: z.string().nullable(),
    }),
    details: z.record(z.string(), productValueSchema),
    raw_fields: z.record(z.string(), productValueSchema),
    original_field_names: z.record(z.string(), z.string()),
    image: productImageSchema,
    content_markdown: z.string(),
  }),
});

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  products,
  autoSidebar: defineCollection({
    loader: autoSidebarLoader(),
    schema: autoSidebarSchema(),
  }),
};
