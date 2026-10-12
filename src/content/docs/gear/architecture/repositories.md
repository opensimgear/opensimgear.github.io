---
title: Repository structure
description: Current OpenSimGear repository responsibilities, prototype implementation and remaining production work.
sidebar:
  order: 7
---

OpenSimGear currently has six repositories. Device firmware and electronics live with their board targets; shared input and USB code lives in `firmware-common`, prototype contracts in `protocol`, host adapters in `cockpit`, and architecture/user guidance in the website.

## Current implementation

Status reflects the development workspace on **2026-10-12**, including integration changes awaiting publication. Software checks and CAD reviews are recorded separately from hardware acceptance.

| Repository | Implemented responsibility |
| --- | --- |
| [`device-gateway`](https://github.com/opensimgear/device-gateway) | STM32G0B1CBT6 gateway firmware and editable Rev A KiCad sources; USB-C, two parallel powered 4P4C CAN sockets and protected 12 V injection. Private CAN FD v2 discovery, persistent controller slots, USB HID and correlated CDC v2 registry management. Renamed from `gateway`. |
| [`device-template`](https://github.com/opensimgear/device-template) | GitHub template with generic STM32G0B1CBT6 Rev B firmware, eight analogue inputs, 24 digital lines and optional TCA9555 banks. Three build-time profiles, direct USB and private CAN v2 input routing, production and home-milling PCB layouts. |
| [`firmware-common`](https://github.com/opensimgear/firmware-common) | Reusable C debounce/rearming, axes, hats, encoder delivery, profile validation/report packing, TCA9555 acquisition, USB helpers and full-commit dependency pins. |
| [`protocol`](https://github.com/opensimgear/protocol) | Reviewed private CAN FD v2 codec, STM32 CDC v2 specification, shared vectors and cross-firmware conformance checks. Cyphal DSDL remains a placeholder. |
| [`cockpit`](https://github.com/opensimgear/cockpit) | Tauri 2/Rust/Svelte desktop app with native Pico and STM32 adapters, automatic discovery, controller registration, explicit layout application and input views. |
| [`opensimgear.github.io`](https://github.com/opensimgear/opensimgear.github.io) | Astro/Starlight website, architecture and component guides, third-party equipment database and interactive calculators/rig planner. |

The generic template's `shifter` profile implements the sequential up/down/neutral input behavior. A separate `h-shifter` repository and optional organization `.github` repository are not in the current organization inventory.

The Pico simulator has physical macOS browser and Tauri acceptance evidence. STM32 module/gateway firmware cross-builds, native tests and cross-firmware checks pass, and the CAD packages have static review records. No assembled STM32 chain has been physically validated. Windows/Linux device acceptance, production releases, USB allocations and project licensing remain pending.

## Device layout and compatibility

Device repositories use three root directories:

- `firmware/`: application, board port, profiles, build configuration and tests.
- `electronics/`: schematic/PCB sources, BOMs, footprints, fabrication/review exports and electrical validation.
- `hardware/`: mechanical designs, assembly guidance and edition placeholders.

Current module electronics are under `device-template/electronics/boards/starter/rev-b/`, matched to `starter_g0b1cb_rev_b`. Gateway electronics are under `device-gateway/electronics/boards/gateway/rev-a/`, matched to `gateway_g0b1cb_rev_a`. Preserved module Rev A uses a different pin map, historical six-contact CAN wiring and firmware retained at commit `5a78e46`; it is incompatible with current Rev B firmware and four-contact cabling.

Lite/Pro are editions within a device repository. Their mechanical designs remain placeholders: Lite is intended for 3D printing and Pro may use laser-cut construction. Edition names, mechanical revisions, PCB revisions and firmware versions identify separate things. Material changes do not require duplicated firmware or a new physical device identity.

## Dependencies and protocol ownership

CMake/FetchContent pins `firmware-common` to a full commit. Common firmware pins TinyUSB, STM32 HAL/CMSIS, Arm CMSIS, libcanard and protocol sources. Local `FETCHCONTENT_SOURCE_DIR_*` overrides allow coordinated development without changing published pins. Both implemented STM32 board ports use the shared MCU support.

Keep common acquisition/USB implementation in its repository. The generic module currently includes a documented `shared-gateway` codec/journal snapshot to avoid an unpublished dependency; `protocol/tools/verify_can_vendors.py` checks the reviewed codec and firmware copies together. Its cross-firmware runner links actual gateway/module code with the pinned common source. This prototype snapshot needs coordinated updates rather than independent wire changes.

The current CAN transport is **private v2, not Cyphal**. libcanard is pinned scaffolding; application DSDL and subject/service assignments remain unimplemented. Cockpit's Rust adapter consumes actual C formatter vectors without a runtime dependency on the C firmware library. The Pico simulator retains its separate protocol-1 adapter.

## Remaining production work

Runtime module configuration/calibration, output freshness/ownership sessions, SimHub profiles, firmware update/recovery flows, merged direct USB/CAN inventories and simultaneous multi-gateway routing remain future work. Registry management and input delivery do not establish those features.

Production protocol releases need explicit compatibility rules and tested firmware/Cockpit combinations. Hardware acceptance must cover real USB/CAN, input timing, ownership handover, storage interruption, power, cabling and recovery. CAD checks or a successful build alone do not establish these behaviors.

Future device releases should pair firmware with the compatible PCB/mechanical revisions, BOMs, native CAD and manufacturing exports. Generated manifests should record source commits and exact dependency revisions. Select and document licensing for firmware, electronics and mechanics, and complete USB allocation before distributing product builds.
