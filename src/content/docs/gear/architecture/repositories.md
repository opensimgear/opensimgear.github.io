---
title: Repositories
description: Current source ownership and independent OpenSimGear repository builds.
sidebar:
  order: 7
---

OpenSimGear has six repositories. Device firmware and electronics live with their board targets, common input/USB/action/event code in `firmware-common`, canonical contracts in `protocol`, host adapters and DCS-BIOS bindings in `cockpit` and user documentation in the website.

| Repository | Current responsibility |
| --- | --- |
| [device-gateway](https://github.com/opensimgear/device-gateway) | STM32G0B1CBT6 USB/Cyphal gateway, PCB 0.1.0 with powered parallel 4P4C sockets, automatic enrollment, persistent enabled controller order, dynamic HID layouts, routed configuration/actions/events and independent native/Pico simulations. |
| [device-template](https://github.com/opensimgear/device-template) | STM32G0B1CBT6 module, eight analogue inputs, 24 digital lines, optional TCA9555 banks, persistent runtime configuration/calibration, direct USB/Cyphal input, ordered mapped-button events and status LED actions; PCB 0.1.0 and independent JSON-configured simulation including the same master-caution button/LED contract and a radio panel with typed inputs and bounded display ports. |
| [firmware-common](https://github.com/opensimgear/firmware-common) | Shared C input acquisition, debounce/rearm, axes/hats/encoders, profile/report packing, bounded independent event collector, configuration parsing, action descriptors/validation/dispatch, USB helpers and pinned dependencies. |
| [protocol](https://github.com/opensimgear/protocol) | Canonical Cyphal application DSDL, generated bindings, shared transport, gateway CDC/runtime configuration/device action/panel event contracts, fixtures and cross-firmware conformance. Private CAN FD v2 is historical reference. |
| [cockpit](https://github.com/opensimgear/cockpit) | Tauri/Rust/Svelte application with independent multi-gateway connections, configuration/calibration, automatic enrollment and visibility, manual actions, live inputs and one saved background DCS-BIOS A-10C profile with typed multi-gateway input/output bindings, installed catalogue queries, display formatting, traffic metrics and a local UDP peer. |
| [opensimgear.github.io](https://github.com/opensimgear/opensimgear.github.io) | Astro/Starlight documentation, component/DIY guides, third-party equipment database and calculators/rig planner. |

## Dependency ownership

Firmware builds use full-commit dependency pins. Device repositories include checked shared Cyphal snapshots from `protocol`; `protocol/tools/verify_can_vendors.py` checks those snapshots and gateway formatter fixtures. Cross-firmware tests link actual gateway/module code with common source. Change the canonical contract and checked consumers together.

Each repository's integration runner provisions and builds its dependencies independently. Cockpit consumes the normal gateway endpoint and does not launch simulated devices. Module settings, ordered input history and temporary action state live on modules; remembered identities, disabled intent and enabled controller order live on gateways. Device callbacks own outputs, and the gateway forwards metadata/events without storing simulator bindings. Cockpit saves one A-10C panel profile in application settings, requires explicit Start and resolves named command interfaces and feedback addresses from the installed DCS-BIOS catalogue. Unchanged legacy master-caution settings remain usable and upgrade only on explicit Save; wider aircraft profiles and import/export remain future work. Its synthetic UDP peer and catalogue are development tools owned by Cockpit.

## Version and validation boundaries

One current design per board is identified as PCB 0.1.0 until launch. Firmware, protocol contract and mechanical identifiers have separate meanings; current contract versions do not declare production releases. Existing software/CAD checks and physical Pico macOS evidence have recorded limits. No assembled STM32 chain has physical acceptance evidence, and no public OpenSimGear USB allocation or license grant is claimed.

Implementation, qualification and release work is tracked in the [GitHub project](https://github.com/orgs/opensimgear/projects/2).
