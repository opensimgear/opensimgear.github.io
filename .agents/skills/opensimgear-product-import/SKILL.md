---
name: opensimgear-product-import
description:
  Research and import third-party OpenSimGear products from vendor pages or product lists. Use when Codex needs to
  analyze commercial/open-source sim hardware products, create research markdown files under research/products, update
  /Users/ntrp/_pws/opensimgear/website/src/data/3rdparty-products.json, download product images into
  src/assets/products, and regenerate src/data/3rdparty-product-images.ts.
---

# OpenSimGear Product Import

## Scope

Use this skill inside `/Users/ntrp/_pws/opensimgear/website` for the full product-ingestion flow:

1. Research a source page and extract product facts.
2. Create one markdown research note per product.
3. Update `src/data/3rdparty-products.json`.
4. Pull product images into `src/assets/products`.
5. Regenerate `src/data/3rdparty-product-images.ts`.
6. Verify the build and product counts.
7. Skip any products marked as accessories or bundles that are not standalone components.

## Workflow

Start from the current repo state:

```bash
pwd
git status --short
rg --files research src/data scripts | sort
```

Inspect existing schema and examples before adding content:

```bash
jq '.products[0]' src/data/3rdparty-products.json
find research/products -name '*.md' | sed -n '1,20p'
sed -n '1,160p' scripts/download-product-images.mjs
sed -n '1,80p' src/data/3rdparty-product-images.ts
```

If the source is a live vendor page, browse or fetch it. Prefer structured data from page JSON, embedded API payloads,
or HTML product cards over manual copying.

## Research Notes

Write one markdown file per product under:

```text
research/products/commercial/<domain>/<category>/<slug>.md
research/products/opensource/<domain>/<category>/<slug>.md
```

For commercial sim hardware, usually use:

```text
research/products/commercial/flight-controls/<category>/<slug>.md
```

Keep each note factual and source-backed. Include at least:

- product title
- vendor/manufacturer
- official/source URL
- category
- price/currency when shown
- image URL and image source URL when available
- short notes on compatibility, variants, or bundled parts

Use stable lowercase slugs. Do not overwrite unrelated research notes.

## Database Update

Update `src/data/3rdparty-products.json` after creating notes. Match the existing field style in the file.

Required conventions:

- `id`: `<type>:<category>:<slug>`, for example `commercial:joysticks:winctrl-orion2-joystick-base`
- `source_file`: exact markdown path
- `image.url`: remote original image URL
- `image.source_url`: product detail page or image source page
- `image.source_type`: usually `official`
- `image.alt`: `<title> product photo`
- leave `image.asset`, `width`, `height`, and `format` empty or missing until the image pull step fills them

After editing, check duplicates and parseability:

```bash
jq empty src/data/3rdparty-products.json
jq -r '.products[].id' src/data/3rdparty-products.json | sort | uniq -d
```

## Pull Images

Use the bundled helper when importing a focused batch. It downloads images for products whose `source_file` starts with
a prefix, converts them to WebP, updates JSON metadata, and regenerates the import map for every product with a local
asset.

From the repo root:

```bash
node .agents/skills/opensimgear-product-import/scripts/pull-product-images.mjs \
  --source-prefix research/products/commercial/
```

Use a narrower prefix for a single vendor/category:

```bash
node .agents/skills/opensimgear-product-import/scripts/pull-product-images.mjs \
  --source-prefix research/products/commercial/flight-controls/joysticks/
```

Use `--refresh-assets` only when remote images should overwrite existing local files.

If the repo-local `scripts/download-product-images.mjs` is appropriate, it can be used instead, but a focused prefix
avoids unrelated failures such as remote rate limits on old records.

## Verification

Verify imported products:

```bash
jq -r '[.products[] | select(.source_file|startswith("research/products/commercial/"))] | length' src/data/3rdparty-products.json
jq -r '[.products[] | select(.source_file|startswith("research/products/commercial/")) | select((.image.asset|length)==0 or .image.width==0 or .image.height==0)] | length' src/data/3rdparty-products.json
```

Verify local assets exist:

```bash
node --input-type=module <<'NODE'
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const db = JSON.parse(await readFile('src/data/3rdparty-products.json', 'utf8'));
const rows = db.products.filter((p) => p.source_file?.startsWith('research/products/commercial/'));
const missing = rows.filter((p) => !p.image?.asset || !existsSync(p.image.asset));
console.log(JSON.stringify({ rows: rows.length, missingImages: missing.length }, null, 2));
NODE
```

Run the project check:

```bash
pnpm build
```

Report product count, missing-image count, changed files, and any build warnings. Do not stage or commit unless the user
asks.
