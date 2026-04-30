import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { autoSidebarLoader } from 'starlight-auto-sidebar/loader';
import { autoSidebarSchema } from 'starlight-auto-sidebar/schema';

const shopSchema = z.object({
  region: z.string().nullable(),
  price: z.number(),
  currency: z.string(),
  url: z.string().nullable(),
});

const products = defineCollection({
  loader: file('src/data/3rdparty-products.json', {
    parser: (text) => JSON.parse(text).products,
  }),
  schema: z.looseObject({
    id: z.string(),
    kind: z.enum(['commercial', 'opensource']),
    slug: z.string(),
    product_name: z.string().optional(),
    project_name: z.string().optional(),
    description: z.string().nullable(),
    manufacturer: z.string().nullable().optional(),
    maker: z.string().nullable().optional(),
    component_category: z.string(),
    component_sub_category: z.string().nullable(),
    product_url: z.string().nullable().optional(),
    project_url: z.string().nullable().optional(),
    picture_url: z.string().nullable(),
    shops: z.array(shopSchema).optional(),
    license: z.string().nullable().optional(),
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
