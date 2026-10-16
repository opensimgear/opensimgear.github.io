# OpenSimGear website

## Development status and disclaimer

This project is heavily under development and is not ready for use. Use it entirely at your own risk. To the fullest extent permitted by applicable law, the authors and contributors disclaim all liability for any damage, loss, or other issues arising from its use.

[OpenSimGear's public website](https://opensimgear.github.io), built with Astro 6, Starlight, Svelte 5 and Tailwind CSS
v4. It contains architecture and DIY guides, simulator-component documentation, a searchable third-party equipment
database and interactive calculators.

## Licensing and contributions

Licensing is under review. Original OpenSimGear code, hardware designs, documentation and other first-party material
are all rights reserved by Ivan Gregurić Ortolan, except where a specific notice identifies another rights holder.
There is no general personal, noncommercial or commercial license grant. Public visibility alone does not authorize
reuse, modification, redistribution, manufacturing or sales.

Rights provided by applicable law, GitHub platform terms, third-party licenses and separate valid permissions remain
applicable. Third-party licenses and attribution must be preserved. See [LICENSE](LICENSE) and
[licensing and permissions](https://www.opensimgear.org/policies/licensing/).

External creative contributions are paused while licensing and contribution terms are reviewed. Questions and factual
bug reports remain possible without proposed patches, designs or replacement text. Submitting material does not
automatically transfer its ownership. See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[contribution policy](https://www.opensimgear.org/contributing/).

## Current content and tools

- User-focused GEAR documentation explaining the ecosystem, connections, configuration, Cockpit and current prototype
  status.
- Sim racing/flight component guides and a third-party product catalogue generated from maintained research data.
- Actuator sizing and Stewart-platform calculators.
- An aluminum rig planner with 3D geometry, posture/ergonomics tools, monitor placement, measurements and export
  support.
- Unit tests with Vitest and browser smoke tests with Playwright BDD.
- GitHub Actions builds and deploys the static site to GitHub Pages, then runs smoke tests against the deployed URL.
  Automated deployment changelog/release/Discord jobs are currently disabled.

GEAR pages explain the implemented device inputs, automatic controller setup, saved configuration, multi-gateway
Cockpit, LED actions and the simulated DCS-BIOS A-10C panel integration. Hardware wiring and power guidance stays
alongside clear validation limits. Native software checks and synthetic DCS-BIOS feedback do not establish live DCS
behavior, assembled STM32 operation or physical Windows/Linux compatibility. Board-specific fabrication and development
details are linked from their owning repositories.

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

Vitest checks calculator/planner behavior and other utilities. Playwright BDD uses Gherkin features and TypeScript
steps. With no URL override, it starts a local server on `127.0.0.1:4321` or reuses an existing one outside CI. Install
Chromium with `pnpm exec playwright install chromium` before the first browser run.

To test an existing local or deployed site, set its URL explicitly:

```sh
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4321 pnpm e2e
PLAYWRIGHT_BASE_URL=https://opensimgear.github.io pnpm e2e
```

An explicit URL disables automatic server startup. CI installs Chromium and runs the smoke suite after Pages deployment;
failures retain screenshots/traces and browser reports.

## Product data

Research records, shop scrapers and database builders live under `research/products/`. The generated catalogue is
`src/data/3rdparty-products.json`; static image assets and source attribution are tracked alongside the research.

```sh
pnpm products:validate
pnpm products:build
```

Review source changes and generated output together. `pnpm products:update` and `pnpm products:update-all` run shop
scrapers and require network access; review their options and results before publishing catalogue changes.

## Layout

- `src/content/docs/`: Starlight documentation, guides and calculator pages.
- `src/pages/3rd-party-sim-database/`: product catalogue page and JSON endpoint.
- `src/components/`: site and interactive calculator/planner components.
- `src/tests/`: Vitest suites.
- `e2e/`: browser features, steps and screenshot baselines.
- `research/`: product and posture research supporting maintained site features.
- `.github/workflows/ci.yml`: Pages build/deploy and deployed-site smoke tests.

## Related repositories

- [Device gateway](https://github.com/opensimgear/device-gateway): STM32 USB-to-CAN FD gateway with two parallel powered
  4P4C sockets and guarded configuration/action/event routing.
- [Device template](https://github.com/opensimgear/device-template): STM32G0B1CBT6 v0.1.0 starter, input profiles,
  ordered events, status LED actions, native simulation and production/home-milling PCB sources.
- [Firmware common](https://github.com/opensimgear/firmware-common): shared C input/USB/action/event support and pinned
  dependencies.
- [Protocol](https://github.com/opensimgear/protocol): Cyphal DSDL/transport, CDC/configuration/action/event contracts,
  historical private-v2 reference and conformance tests.
- [Cockpit](https://github.com/opensimgear/cockpit): Tauri/Rust/Svelte app with gateway discovery, controller
  visibility, manual actions, live inputs and background DCS-BIOS panel controls, LED and bounded display feedback.

GEAR also documents portable simulator profiles, device-enforced output leases, output-only modules and the Assetto Corsa Rally telemetry starter. See [the simulator integration guide](src/content/docs/gear/architecture/simulator-integrations.md). Hardware and live-game qualification remain deferred.
