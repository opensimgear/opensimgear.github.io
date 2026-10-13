# OpenSimGear website

[OpenSimGear's public website](https://opensimgear.github.io), built with Astro 6, Starlight, Svelte 5 and Tailwind CSS v4. It contains architecture and DIY guides, simulator-component documentation, a searchable third-party equipment database and interactive calculators.

## Current content and tools

- Architecture, communication, hardware and repository guidance for modular sim peripherals.
- Sim racing/flight component guides and a third-party product catalogue generated from maintained research data.
- Actuator sizing and Stewart-platform calculators.
- An aluminum rig planner with 3D geometry, posture/ergonomics tools, monitor placement, measurements and export support.
- Unit tests with Vitest and browser smoke tests with Playwright BDD.
- GitHub Actions builds and deploys the static site to GitHub Pages, then runs smoke tests against the deployed URL. Automated deployment changelog/release/Discord jobs are currently disabled.

Architecture pages describe current Cyphal/CAN input delivery, runtime configuration/calibration and simultaneous gateway management. The device repositories record implementation and validation separately. Physical macOS Pico simulator acceptance does not establish STM32 or Windows/Linux acceptance. Implementation and qualification work is tracked in the [GitHub project](https://github.com/orgs/opensimgear/projects/2).

## Requirements and development

Use Node.js 22, as configured in `.mise.toml`, and pnpm 10.33.1, as declared in `package.json`.

```sh
pnpm install
pnpm dev
```

The development server uses `http://localhost:4321` by default. For a production preview:

```sh
pnpm build
pnpm preview
```

`pnpm build` runs Astro checks before generating the static site in `dist/`.

## Validation

```sh
pnpm test
pnpm e2e
```

Vitest checks calculator/planner behavior and other utilities. Playwright BDD uses Gherkin features and TypeScript steps. With no URL override, it starts a local server on `127.0.0.1:4321` or reuses an existing one outside CI. Install Chromium with `pnpm exec playwright install chromium` before the first browser run.

To test an existing local or deployed site, set its URL explicitly:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4321 pnpm e2e
PLAYWRIGHT_BASE_URL=https://opensimgear.github.io pnpm e2e
```

An explicit URL disables automatic server startup. CI installs Chromium and runs the smoke suite after Pages deployment; failures retain screenshots/traces and browser reports.

## Product data

Research records, shop scrapers and database builders live under `research/products/`. The generated catalogue is `src/data/3rdparty-products.json`; static image assets and source attribution are tracked alongside the research.

```sh
pnpm products:validate
pnpm products:build
```

Review source changes and generated output together. `pnpm products:update` and `pnpm products:update-all` run shop scrapers and require network access; review their options and results before publishing catalogue changes.

## Layout

- `src/content/docs/`: Starlight documentation, guides and calculator pages.
- `src/pages/3rd-party-sim-database/`: product catalogue page and JSON endpoint.
- `src/components/`: site and interactive calculator/planner components.
- `src/tests/`: Vitest suites.
- `e2e/`: browser features, steps and screenshot baselines.
- `research/`: product and posture research supporting maintained site features.
- `.github/workflows/ci.yml`: Pages build/deploy and deployed-site smoke tests.

## Related repositories

- [Device gateway](https://github.com/opensimgear/device-gateway): STM32 USB-to-CAN FD gateway with two parallel powered 4P4C sockets.
- [Device template](https://github.com/opensimgear/device-template): generic STM32 Rev B module, input profiles and production/home-milling PCB sources.
- [Firmware common](https://github.com/opensimgear/firmware-common): shared C input/USB support and pinned dependencies.
- [Protocol](https://github.com/opensimgear/protocol): Cyphal DSDL/transport, CDC/runtime configuration contracts, historical private-v2 reference and conformance tests.
- [Cockpit](https://github.com/opensimgear/cockpit): Tauri/Rust/Svelte desktop app for gateway discovery, registration and input views.
