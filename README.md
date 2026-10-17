# OpenSimGear website

## Development status and disclaimer

This project is heavily under development and is not ready for use. Use it entirely at your own risk. To the fullest extent permitted by applicable law, the authors and contributors disclaim all liability for any damage, loss, or other issues arising from its use.

[OpenSimGear's public website](https://opensimgear.github.io), built with Astro 6, Starlight, Svelte 5 and Tailwind CSS
v4. It contains architecture and DIY guides, simulator-component documentation, a searchable third-party equipment
database and interactive calculators.

## Licensing and contributions

Licensing is under review. Original OpenSimGear code, hardware designs, documentation and other first-party material are
all rights reserved by Ivan Gregurić Ortolan, except where a specific notice identifies another rights holder. There is
no general personal, noncommercial or commercial license grant. Public visibility alone does not authorize reuse,
modification, redistribution, manufacturing or sales.

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
- GitHub Actions builds the static site and deploys to GitHub Pages only after the seven-profile production browser
  smoke matrix passes. Automated deployment changelog/release/Discord jobs are currently disabled.

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

Vitest checks calculator/planner behavior and other utilities. Playwright runs BDD home coverage plus production smoke
checks for documentation navigation with translation-style nested text, calculator hydration and input, bounded
automatic module recovery and manual calculator retry. Install engines with
`pnpm exec playwright install chromium firefox webkit`.

The profiles are `chromium`, `firefox`, `webkit` (desktop), `android-phone` (Pixel 7), `iphone` (iPhone 13), `ipad`
(iPad Pro 11), and `android-tablet` (Galaxy Tab S4). These emulate device settings in desktop browser engines; they do
not establish real-device, iOS Chrome or Google Translate compatibility. Telemetry is blocked in smoke tests.

With no URL override, `pnpm e2e` builds the production site and starts a fresh preview server on `127.0.0.1:4321`. The
port must be free; an existing server is never reused. Each profile runs its matching `-bdd` dependency before the
native smoke checks. To test an already built production preview:

```sh
pnpm build
pnpm preview --host 127.0.0.1 --port 4321
# In another terminal (omit --project to run every profile):
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4321 pnpm e2e --project=iphone
```

An explicit URL disables automatic build and server startup. It must serve production output because module-recovery
tests target emitted `/_astro/` JavaScript assets. CI builds once and passes the same static production output to every
matrix entry. All seven must pass before Pages deployment. Pull requests run the build and matrix without deploying.
Failures retain per-profile screenshots, traces, reports and server logs. Set `PLAYWRIGHT_OUTPUT_DIR` and
`PLAYWRIGHT_REPORT_DIR` to put local artifacts under `.research/`.

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
- `e2e/`: browser features, steps, smoke tests and screenshot baselines.
- `research/`: product and posture research supporting maintained site features.
- `.github/workflows/ci.yml`: Pages build, pre-deployment smoke matrix and deployment.

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

GEAR also documents portable simulator profiles, device-enforced output leases, output-only modules and the Assetto
Corsa Rally telemetry starter. See
[the simulator integration guide](src/content/docs/gear/architecture/simulator-integrations.md). Hardware and live-game
qualification remain deferred.
