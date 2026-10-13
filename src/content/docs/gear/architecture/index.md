---
title: Architecture
description: Current prototype architecture for modular OpenSimGear controls.
sidebar:
  order: 1
---

OpenSimGear's input prototype supports standalone USB HID modules and Cyphal/CAN modules connected through a USB gateway. The module and gateway firmware use C, TinyUSB and libcanard on STM32G0B1CBT6. Cockpit is a Tauri 2 application with Rust, Svelte and TypeScript.

## Current behavior

- Modules acquire and map local inputs, apply calibration and expose USB HID plus CDC configuration.
- A gateway discovers module identities and capabilities, routes configuration over CAN and automatically enables new compatible devices and appends their USB HID collections in persistent descriptor order.
- Each gateway supports up to 32 runtime modules, remembered identities and enabled controllers; each profile supports 128 buttons, four hats and eight axes. Temporary absence retains enabled controllers with configured neutral values.
- Direct USB input takes priority. Gateway input resumes from fresh state after direct USB ownership ends.
- Runtime configuration uses one writer, separate drafts, explicit Apply/Save and interrupted-write-safe storage. The gateway saves and publishes controller lifecycle changes automatically; changes to retained control definitions require explicit profile update and USB reconnection.
- Cockpit connects to multiple gateways independently and combines their inventories. Gateway identity scopes requests and separates identical module sightings on different chains.

## Controller visibility

Enabled devices that temporarily disappear remain neutral controllers and ghosted Cockpit entries. Explicit Disable hides a controller from Windows while remembering it; manual Remove forgets an offline entry and warns about possible rebinding. No permanent management collection or unused controllers are exposed. See the [USB HID lifecycle](/gear/architecture/usb-hid/#automatic-enrollment-architecture).

## Physical design

PCB version 0.1.0 uses USB-C and two parallel powered 4P4C CAN sockets. Both sockets continue one linear bus with one local CAN controller/transceiver; they are not separate segments. One external 12 V supply powers each gateway chain. Independent gateway CAN and power trunks remain separate. Termination belongs at the two physical endpoints; an inline gateway is unterminated.

The software accepts up to 32 modules. Ten modules and 5 m total cable remain initial bench targets, not qualified electrical limits. No assembled STM32 module/gateway chain has been physically validated. CAD checks and native simulation establish source behavior rather than measured power, timing or host compatibility.

## Sequential shifter

The shifter profile has three digital commands: up, down and explicit neutral. Armed buttons follow debounced held contacts without synthesized pulses. Rest and stale input release every command without generating neutral. A contact held at startup, reconnect or input handoff must release before a fresh press. Conflicting contacts suppress all commands until every contact has a debounced release.

## Architecture references

- [Hardware](/gear/architecture/hardware/): current connectors, controllers, power and topology.
- [Communication](/gear/architecture/communication/): implemented discovery, delivery and configuration.
- [USB HID](/gear/architecture/usb-hid/): standalone input and retained gateway controllers.
- [Desktop cockpit](/gear/architecture/desktop-cockpit/): current host behavior and acceptance evidence.
- [Repositories](/gear/architecture/repositories/): source ownership and independent builds.
- [Implementation baseline](/gear/architecture/decisions/): current design choices and validation boundaries.

Implementation and qualification work is tracked in the [GitHub project](https://github.com/orgs/opensimgear/projects/2).
