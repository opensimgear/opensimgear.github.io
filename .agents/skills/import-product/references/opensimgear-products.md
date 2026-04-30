# Opensimgear Products DB Reference

## Paths

- Source YAML: `research/products/db/*.yml`
- Generated database: `src/data/3rdparty-products.json`
- Generated image map: `src/data/3rdparty-product-images.ts`
- Image source cache: `scripts/3rdparty-product-image-sources.json`
- Product assets: `src/assets/products/*.webp`
- Generator: `scripts/build-products-database.mjs`

## Generator Behavior

`pnpm products:build` reads every YAML file under `research/products/db`, validates category consistency, assigns stable ids from existing generated JSON, writes `src/data/3rdparty-products.json`, fetches/converts images into WebP assets, writes the image import map, and updates the source cache.

Generator side effects are expected. New products normally create:

- one row in source YAML
- one JSON product row
- one image import/map entry
- one cache entry
- one `src/assets/products/<id>.webp`

## Stable IDs

Commercial ids use:

`commercial:<component_category>:<manufacturer-and-product-slug>`

Do not hand-edit ids in generated JSON. Preserve product names/manufacturers in YAML enough for stable slug matching. If renaming an existing product, check generated id did not unexpectedly churn.

## Product Scope

The database is for simulator hardware/software. For vendor links with broad catalogs:

- Include products relevant to simulation input, cockpit, display, motion, tactile, wind, VR/head tracking, seats/rigs, or simulator software.
- Skip merch, spare parts, cables, warranty, subscriptions, generic accessories, and unrelated gaming products unless user asks.
- For bundles, add when sold as primary simulator product/bundle and existing DB has comparable bundle rows.

## Verification Checklist

- `git status --short` before edits to spot unrelated user changes.
- YAML parse all DB files.
- `pnpm products:build` succeeds.
- `rg -n "<new product name>|<new id>" research/products/db src/data/3rdparty-products.json src/data/3rdparty-product-images.ts scripts/3rdparty-product-image-sources.json`
- Diff new rows and generated assets only.
