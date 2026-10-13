---
title: Desktop cockpit
description: Implemented multi-gateway discovery, input configuration and controller registration.
sidebar:
  order: 6
---

[Cockpit](https://github.com/opensimgear/cockpit) is a working Tauri 2 desktop application with a Svelte 5/TypeScript interface and Rust native adapters. It discovers gateways, edits device input configuration/calibration, manages retained controller slots and displays live inputs. HID operation remains independent of the application.

## Native access

Rust owns USB serial enumeration, protocol handshakes, connection state and bounded requests. The frontend consumes typed state through Tauri IPC. Browser development uses an HTTP bridge to the same native gateway service; it does not rely on Web Serial availability in an OS webview. STM32 discovery verifies manufacturer/product metadata, a 24-hex UID and a bounded CDC version-2 snapshot.

## Multiple gateways

Every compatible gateway connects independently. Gateways shows each gateway and its devices; Devices combines inventories; Topology branches from the computer to each gateway chain. One busy, restarting or failed gateway does not interrupt another. Previously connected gateways retain last-known device state while offline.

Operations and drafts are scoped by gateway and module identity. Identical module identities on independent chains currently keep separate state and drafts. Node IDs and USB paths are not global identity keys. A gateway's two sockets are one bus; the UI shows gateway attachment rather than inferred cable order or socket position.

## Configuration and layouts

The STM32 adapter uses the production Cyphal/CAN configuration path. Setup edits names, expansion banks, buttons, hats, encoders, selectors and calibrated axes. Apply activates a validated draft; Apply & save persists settings on the module. Readback follows a renewed lease with bounded retries; reboot stops reconciliation and writes are never replayed.

Add controller stages discovered capabilities. Explicit Apply layout saves the registry, rebuilds USB HID and reconnects by gateway UID. Stale/offline devices and changed profiles retain neutral slots until valid configuration and layout are active. Direct device USB input leaves its gateway slot neutral.

The Pico adapter retains discovery, setup claims and reconnection. Its settings are in RAM until reset. On macOS, Rust applies individual controller names through IOKit.

## Independent simulation and evidence

Gateway and device simulations run from their owning repositories. Cockpit discovers ordinary gateway endpoints and does not create or manage simulated-device processes. Local streams exercise production handlers without creating OS USB/HID controllers.

Native acceptance covers concurrent gateways, same-identity device isolation, configuration persistence and dynamic layouts. A visible macOS native UI run covered four gateways; physical Pico acceptance covers macOS. These results do not establish assembled STM32 or physical Windows/Linux acceptance.

See [Cockpit's README](https://github.com/opensimgear/cockpit/blob/main/README.md), [verification records](https://github.com/opensimgear/cockpit/tree/main/docs/verification) and the [GitHub project](https://github.com/orgs/opensimgear/projects/2).
