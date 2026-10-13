---
title: Repositories
description: Current source ownership and independent OpenSimGear repository builds.
sidebar:
  order: 7
---

OpenSimGear has six repositories. Device firmware and electronics live with their board targets, common input/USB/action code in `firmware-common`, canonical contracts in `protocol`, host adapters in `cockpit` and user documentation in the website.

| Repository | Current responsibility |
| --- | --- |
| [device-gateway](https://github.com/opensimgear/device-gateway) | STM32G0B1CBT6 USB/Cyphal gateway, PCB 0.1.0 with powered parallel 4P4C sockets, automatic enrollment, persistent enabled controller order, dynamic HID layouts, routed configuration/actions and independent native/Pico simulations. |
| [device-template](https://github.com/opensimgear/device-template) | STM32G0B1CBT6 module, eight analogue inputs, 24 digital lines, optional TCA9555 banks, persistent runtime configuration/calibration, direct USB/Cyphal input and status LED actions, production/home-milling PCB 0.1.0 and independent JSON-configured simulation with RGB/boolean LED actions. |
| [firmware-common](https://github.com/opensimgear/firmware-common) | Shared C input acquisition, debounce/rearm, axes/hats/encoders, profile/report packing, configuration line parsing, action descriptors/validation/dispatch, USB helpers and pinned dependencies. |
| [protocol](https://github.com/opensimgear/protocol) | Canonical Cyphal application DSDL, generated bindings, shared transport, gateway CDC/runtime configuration/device action contracts, fixtures and cross-firmware conformance. Private CAN FD v2 is historical reference. |
| [cockpit](https://github.com/opensimgear/cockpit) | Tauri/Rust/Svelte application with independent multi-gateway connections, combined inventories, configuration/calibration, automatic enrollment and remembered visibility controls, manual device actions and live input views. |
| [opensimgear.github.io](https://github.com/opensimgear/opensimgear.github.io) | Astro/Starlight documentation, component/DIY guides, third-party equipment database and calculators/rig planner. |

## Dependency ownership

Firmware builds use full-commit dependency pins. Device repositories include checked shared Cyphal snapshots from `protocol`; `protocol/tools/verify_can_vendors.py` checks those snapshots and gateway formatter fixtures. Cross-firmware tests link actual gateway/module code with common source. Change the canonical contract and checked consumers together.

Each repository's integration runner provisions and builds its dependencies independently. Cockpit consumes the normal gateway endpoint and does not launch simulations. Module settings and temporary action state live on modules; remembered device identities, disabled intent and enabled controller order live on gateways. Device callbacks own outputs, and the gateway forwards action metadata without saving it in the registry.

## Version and validation boundaries

One current design per board is identified as PCB 0.1.0 until launch. Firmware, protocol contract and mechanical identifiers have separate meanings; current contract versions do not declare production releases. Existing software/CAD checks and physical Pico macOS evidence have recorded limits. No assembled STM32 chain has physical acceptance evidence, and no public OpenSimGear USB allocation or license grant is claimed.

Implementation, qualification and release work is tracked in the [GitHub project](https://github.com/orgs/opensimgear/projects/2).
