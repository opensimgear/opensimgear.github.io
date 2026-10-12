---
title: Repository structure
description: GitHub repository boundaries, the STM32G0B1 device-template draft, shared dependencies, and the implementation roadmap.
sidebar:
  order: 7
---

The agreed repository boundaries are in place in the `opensimgear` GitHub organization. A first STM32G0B1 HID plus CDC hello-world implementation and editable KiCad starter board are being developed in `device-template`, with reusable support in `firmware-common`. These are draft branch changes, not merged or released implementations. The broader app, protocol, device integration, and release workflow below remain a roadmap.

## Initialization status

The six repositories started with READMEs and source-directory placeholders. `gateway`, `h-shifter`, `protocol`, and `cockpit` remain scaffolds. `h-shifter` keeps its existing name; its first implementation target is the agreed sequential up/down/neutral prototype. The existing website remains the documentation home, and `device-template` is enabled as a GitHub template. Device scaffolds include the three root folders and Lite/Pro mechanical folders.

The draft implementation is on [`device-template` branch `feat/stm32g0b1-starter`](https://github.com/opensimgear/device-template/tree/feat/stm32g0b1-starter) and [`firmware-common` branch `feat/stm32g0b1-template-support`](https://github.com/opensimgear/firmware-common/tree/feat/stm32g0b1-template-support). It adds buildable firmware, pinned dependencies, common behavior tests, and editable schematic/PCB sources. Mechanical designs, application Cyphal/discovery/gateway integration, protocol schemas, and the cockpit app remain unimplemented. Physical hardware validation, releases, and licensing are pending. Gateway MCU and board selection remain undecided; the optional `.github` repository has not been created.

## Repository responsibilities

| Repository | Responsibility |
| --- | --- |
| [`gateway`](https://github.com/opensimgear/gateway) | Device firmware, mechanical hardware, and electronics for the two-port, single-chain gateway. Gateway hardware remains intentionally undecided. |
| [`h-shifter`](https://github.com/opensimgear/h-shifter) | Existing device repository; keep this name and begin with the agreed three-contact sequential up/down/neutral prototype. The name does not change that behavior. |
| [`firmware-common`](https://github.com/opensimgear/firmware-common) | Draft shared button/rearming and bounded serial-line behavior, USB descriptor builders, and pinned dependencies; broader transport, health, configuration, encoder queues, and failure handling remain planned. |
| [`device-template`](https://github.com/opensimgear/device-template) | GitHub device scaffold with draft STM32G0B1 HID plus CDC hello-world firmware and an editable KiCad starter schematic and placed, unrouted PCB. |
| [`protocol`](https://github.com/opensimgear/protocol) | Canonical CAN DSDL and USB schema definitions, version rules, compatibility tests, and test vectors. Shared semantics may use different wire framing. |
| [`cockpit`](https://github.com/opensimgear/cockpit) | Tauri/Svelte/Rust desktop app, protocol adapters, and SimHub integration profiles. |
| [`opensimgear.github.io`](https://github.com/opensimgear/opensimgear.github.io) | Existing website: canonical architecture, cross-device guidance, and user documentation. |
| `.github` | Optional organization profile, community templates, and reusable CI workflows. |

These boundaries keep device-specific assembly and build instructions in each device README while the website explains the system. Common code does not imply one fixed USB descriptor or product identifier: device firmware owns its capability profile, hardware revisions, pin maps, and product identity. USB allocations remain pending.

## Device repository layout

Use the same root structure for `gateway`, `h-shifter`, and new devices. This tree depicts the intended completed layout; scaffolds use READMEs and tracked placeholders for otherwise empty source directories. The template draft implements its firmware and a starter board at `electronics/boards/starter/rev-a/`, matched to `firmware/boards/starter_g0b1cb/`:

```text
README.md
device.yaml (optional)
firmware/
  src/
  include/
  boards/
  tests/
  CMakeLists.txt
  CMakePresets.json
  cmake/dependencies.cmake
hardware/
  cad/
  drawings/
  assembly.md
  bom.csv
electronics/
  kicad/
  bom.csv
  wiring.md
```

`hardware/` contains mechanical design; `electronics/` contains circuits and PCB design. Optional `device.yaml` holds model, hardware revisions, and product/profile metadata. Generate release manifests from actual build versions and dependency pins; do not maintain a second manual common/protocol version list. The README documents build, flashing, ports/pinouts, calibration/update behavior, hardware compatibility, and native CAD source locations. Optional `docs/` holds linked detail. Editable sources belong in Git; generated exports, firmware binaries, and manufacturing outputs belong in releases rather than duplicated build directories.

Licensing policy is not selected. Before publication and any USB allocation application, document coverage for firmware, mechanical designs, and electronics, using either clearly scoped separate licenses or an explicitly suitable combined policy. Add license files once that decision is made.

## Device editions and revisions

Keep one repository per device, with Lite, Pro, and future editions in ordinary folders. Do not create a repository or long-lived branch per edition. Lite is intended to use 3D-printed construction; laser-cut construction is a possibility for Pro, not a finalized fabrication choice. An edition name, mechanical revision, PCB revision, and firmware version identify different things and evolve independently.

For devices with multiple editions, extend the root layout like this:

```text
hardware/variants/
  lite/rev-a/
    cad/
    drawings/
    assembly.md
    bom.csv
  pro/rev-a/
    cad/
    drawings/
    assembly.md
    bom.csv
electronics/boards/controller/rev-a/
  kicad/
  bom.csv
  wiring.md
firmware/
  boards/
  profiles/
variants/             # optional build cross-references
  lite.yaml
  pro.yaml
```

The names and `rev-a` paths illustrate the organization; they do not select a board or approve a hardware revision. Keep a common PCB and firmware implementation once. Lite and Pro can share the same PCB revision, firmware board configuration, and capability profile when only their construction differs. Add a second board only when electrical design or board configuration actually differs; add profiles for real capability differences.

The root README should compare editions and link to each edition's README or assembly guide. A simple compatibility table can map each supported edition to its mechanical revision, shared PCB revision, firmware board/profile, and compatible firmware version. Optional `variants/lite.yaml` and `variants/pro.yaml` can hold those BOM/build cross-references instead; this proposal does not require a manifest format or new tooling.

Case materials alone do not automatically change product identity or capabilities. USB identities remain pending allocation. Capability or descriptor changes must follow the existing [registered layout and reconnect policy](/docs/architecture/usb-hid/), including user notice and deliberate USB re-enumeration when the descriptor changes.

## Shared code and pinned dependencies

Proposed common-code layout makes descriptor ownership explicit:

```text
firmware-common/
  include/opensimgear/
  src/
    usb/          # descriptor builders and USB behavior
    can/
    inputs/
    outputs/
    config/
    diagnostics/
  ports/          # optional, for validated platform bindings
  cmake/
  tests/
  CMakeLists.txt
  README.md
protocol/
  dsdl/
  serial/
  compatibility/
  test-vectors/
```

Common code owns generic mechanisms such as debouncing and rearming. Device profiles own product policies, including which shifter contacts conflict and how a product exposes its controls. Platform bindings must correspond to real validated targets.

CMake, Ninja, and Arm GNU are the proposed firmware build tools. Device `dependencies.cmake` is its sole dependency-pin source and pins `firmware-common` to a full commit. Common firmware pins the protocol source and its TinyUSB/libcanard dependencies centrally, avoiding competing dependency graphs. [CMake FetchContent](https://cmake.org/cmake/help/latest/module/FetchContent.html) supports this source-dependency workflow; use exact revisions and an explicit local-checkout override for coordinated development.

Do not copy shared headers into devices or require Git submodules. Device code supplies profiles and hardware hooks; common code implements reusable behavior against them. Gateway board configuration must stop with a clear error until real hardware is selected. Two parallel gateway sockets require one CAN controller/transceiver path, but an unvalidated MCU placeholder must never masquerade as a working gateway board.

`protocol` releases independently. Common firmware consumes a pinned revision; the cockpit pins a compatible protocol release through its own Rust/TypeScript adapter, without depending on the C firmware library. Generate bindings where supported; otherwise verify adapters against the same conformance vectors. This proposal does not assume a supported DSDL-to-Rust generator.

## A usable device template

`device-template` is enabled as a [GitHub template repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository), so **Use this template** creates the three root folders and README from the repository's default branch. The starter implementation currently lives on the draft branch linked above; it is not yet part of a merged release.

The draft firmware targets the custom `starter_g0b1cb` board with STM32G0B1CBT6. Its C/TinyUSB application exposes one physical, debounced HID joystick button and CDC serial diagnostics: hello/info, LED control, and internal CAN FD loopback. The transceiver stays in standby during that diagnostic; loopback does not test the external bus. No automatic button presses are generated. Common code supplies descriptor helpers, input rearming, bounded line handling, and dependency pins. The console is diagnostic-only: shared capability/configuration exchange, application Cyphal traffic, discovery, gateway registration, and transport handoff are still future integration work.

Editable KiCad 10 project, schematic, PCB, local libraries, BOM, pinout, power paths, and validation notes live under `electronics/boards/starter/rev-a/`. The PCB has placed footprints and schematic nets but **no routed copper**. Its draft revision identifies these editable sources; it is not approval to fabricate. Mechanical designs under `hardware/` remain placeholders.

Local checks establish the following limited baseline:

| Check | Draft result |
| --- | --- |
| Firmware compilation | Compiled with Arm GNU 15.3; not flashed or physically tested |
| Shared-code native tests | Two tests pass |
| Schematic ERC | Zero violations |
| PCB checks | Zero geometric violations and zero schematic/PCB parity violations; 108 missing connections remain |

Overall PCB DRC cannot pass until routing is complete. Electrical design review, routing, manufacturing checks, physical USB/CAN and power tests, and flashing/recovery validation remain required. These checks do not establish USB compliance, cable qualification, hot-plug behavior, or fabrication readiness.

The firmware and electronics READMEs document the starter target and bring-up procedures. Rename model/profile identifiers, select and validate the actual device board, and supply USB identifiers you are authorized to use before flashing or releasing a derived device. No public OpenSimGear USB identifiers are allocated; compile-only test identifiers are not assigned product identities.

## Cockpit, validation, and releases

Use `cockpit/src/` for the interface, `src-tauri/` for native services, and `integration-profiles/` for SimHub integration. Initial SimHub support remains Windows-specific. Supply versioned, ready-to-use profiles and test them against the current protocol. Automatic profile generation from registered capabilities/mappings is a proposed cockpit convenience, not an agreed feature. Common firmware owns protocol behavior, not simulator-specific telemetry mappings.

Proposed CI should build actual configured device boards and the template reference target. Common-code host tests cover observable behavior. Protocol conformance and device builds exercise pinned revisions; common-code PR matrices must additionally override the common dependency with the candidate revision against known device baselines, rather than only testing old pins. Cockpit builds cover all three operating systems without claiming hardware validation. Run electronics ERC/DRC and CAD review checks when suitable tools are available.

Release each device with matched firmware, BOMs, CAD/manufacturing exports, and hardware compatibility. Release notes or a generated manifest should list supported editions and their mechanical/PCB revisions, the source commit, firmware tag, exact common/protocol dependency revisions, and relevant exports for each edition. Include assigned USB identities only after allocation. Keep edition names, mechanical/PCB revisions, and firmware versions independently identifiable.

Continue the template draft through review, PCB routing, and bench validation while defining the production protocol. Integrate that protocol into shared firmware and the template before implementing discovery, gateway behavior, and the sequential prototype in `h-shifter`. Develop cockpit support alongside that first device and maintain the existing website throughout. Finalize gateway hardware before its board implementation. Licensing work precedes any public USB identifier application.
