---
name: import-product
description: Use when an agent receives a product, vendor, collection, or category URL and must research/scrape current simulator hardware or software products, add or update entries in this repo's `research/products/db/*.yml` products database, then regenerate `src/data/3rdparty-products.json`, product image assets, image source cache, and product image imports with the repo generator. Triggers include “add products from this link”, “scrape this vendor into products db”, “update db from URL”, “regenerate products/images”, or similar product database import tasks.
---

# Import Product

## Core Workflow

1. Read repo instructions first: `AGENTS.md` and any nested instruction file that applies. Follow local constraints.
2. Inspect existing database shape before editing:
   - `rg --files research/products/db`
   - Open likely category YAML file(s), especially entries from same component type or manufacturer.
   - If unsure about target category, inspect all category filenames and existing `component_sub_category` values.
3. Research live source link. Browse if data may be current, price/availability changed, or source attribution matters.
   - Prefer official vendor/product/collection pages.
   - Use Shopify `.js` endpoints when available: `https://host/products/<handle>.js`.
   - For exact product lists on a vendor site, open shop/collection pages and product pages; avoid adding accessories unless user asks.
4. Decide add vs update:
   - Update existing manufacturer/product rows when same product already exists.
   - Add only missing products from requested link/scope.
   - Keep unrelated dirty worktree changes untouched.
5. Edit only `research/products/db/<category>.yml` unless generator output updates are required.
6. Regenerate from repo root:
   - `pnpm products:build`
   - This updates `src/data/3rdparty-products.json`, `src/data/3rdparty-product-images.ts`, `scripts/3rdparty-product-image-sources.json`, and may create `src/assets/products/*.webp`.
7. Verify:
   - YAML parses.
   - Generator exits 0.
   - Diff contains intended product rows and generated outputs only.
   - Use `git status --short` to report unrelated pre-existing changes separately.

## YAML Schema

For commercial products:

```yaml
commercial:
  - product_name: Product Name
    description: Manufacturer Product Name. compact product type. current/pre-order/out of stock if relevant. Key official spec(s).
    manufacturer: Manufacturer
    component_category: category-file-name
    component_sub_category: Existing subcategory style
    product_url: https://official/product
    picture_url: https://official/image.webp
    shops:
      - name: Vendor
        price: 1234.56
        currency: USD
        url: https://official/product
        region: US
```

For open-source projects, follow existing `opensource` rows in same category. Do not invent license certainty; use `[uncertain]` when source is unclear.

## Data Rules

- Use existing category file naming exactly for `component_category`.
- Reuse existing `component_sub_category` vocabulary where possible.
- Keep descriptions compact: `Brand Model. type. status. key specs/source facts.`
- Prices must be numbers, not strings. Use full-payment/current displayed price unless existing DB pattern clearly uses entry price or bundle price.
- Use `shops: []` if no reliable shop price is available.
- Prefer official product image URLs. If image requires CDN URL, use product JSON/media source where possible.
- Mark uncertainty explicitly in description instead of omitting risk.
- Do not add duplicates for mere variants unless the site sells them as distinct product lines and existing DB style supports separate rows.
- Do not add accessory/service pages as products unless user explicitly requests those.

## Commands

Use from repo root:

```bash
ruby -e 'require "yaml"; Dir["research/products/db/*.yml"].each { |f| YAML.load_file(f) }; puts "ok"'
pnpm products:build
git diff -- research/products/db src/data/3rdparty-products.json src/data/3rdparty-product-images.ts scripts/3rdparty-product-image-sources.json src/assets/products
```

If `ruby` is unavailable, use Node with `yaml` dependency or the generator as parse validation.

## References

Read [references/opensimgear-products.md](references/opensimgear-products.md) when schema/generator details are needed.
