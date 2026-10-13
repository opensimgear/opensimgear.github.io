---
title: Desktop cockpit
description: Multi-gateway configuration, automatic enrollment and device visibility.
sidebar:
  order: 6
---

[Cockpit](https://github.com/opensimgear/cockpit) is a working Tauri 2 desktop application with a Svelte 5/TypeScript interface and Rust native adapters. It discovers gateways, edits device input configuration/calibration, manages enabled controllers and remembered devices and displays live inputs. HID operation remains independent of the application.

## Native access

Rust owns USB serial enumeration, protocol handshakes, connection state and bounded requests. The frontend consumes typed state through Tauri IPC. Browser development uses an HTTP bridge to the same native gateway service; it does not rely on Web Serial availability in an OS webview. STM32 discovery verifies manufacturer/product metadata, a 24-hex UID and a bounded CDC v3 automatic-lifecycle snapshot, with a separate CDC v2 legacy adapter.

## Multiple gateways

Every compatible gateway connects independently. Gateways shows each gateway and its devices; Devices combines inventories; Topology branches from the computer to each gateway chain. One busy, restarting or failed gateway does not interrupt another. Previously connected gateways retain last-known device state while offline.

Operations and drafts are scoped by gateway and module identity. Identical module identities on independent chains currently keep separate state and drafts. Node IDs and USB paths are not global identity keys. A gateway's two sockets are one bus; the UI shows gateway attachment rather than inferred cable order or socket position.

## Configuration and layouts

The STM32 adapter uses the production Cyphal/CAN configuration path. Setup edits names, expansion banks, buttons, hats, encoders, selectors and calibrated axes. Apply activates a validated draft; Apply & save persists settings on the module. Readback follows a renewed lease with bounded retries; reboot stops reconciliation and writes are never replayed.

The STM32 gateway automatically enrolls compatible new devices and publishes saved layouts. Cockpit follows requested and published state through reconnects by gateway UID. Changed profiles remain neutral until an explicit profile update; direct device USB input leaves its enabled gateway controller neutral.

The separate legacy CDC v2 and Pico adapters retain their manual controller workflow. The Pico adapter retains discovery, setup claims and reconnection. Its settings are in RAM until reset. On macOS, Rust applies individual controller names through IOKit.

## Controller visibility workflow

The [USB HID architecture](/gear/architecture/usb-hid/#automatic-enrollment-architecture) uses gateway-owned automatic enrollment, independently of Cockpit.

New identities automatically enable and append to descriptor order. Cockpit shows enabled devices that temporarily disconnect as ghosted, while their Windows HID controllers remain present with neutral inputs. Disable removes a controller from Windows but retains the remembered device and explicit disabled state. An online disabled device remains configurable. Enable appends its collection to the currently enabled list; that controller may need rebinding. Remove forgets an offline record; later rediscovery treats it as new.

Actions that remove a published collection warn that USB reconnects and remaining game bindings may need updating. There is no permanent management collection, unused controller placeholder or user slot allocation. The UI follows gateway state, displays capacity/persistence/profile failures, and retains inventory and selection through expected reconnection by gateway UID without replaying ambiguous mutations.

A module move leaves the source gateway's enabled offline ghost until explicit disable/removal; the destination automatically enrolls an unknown identity. A destination's remembered disabled identity stays disabled. On-module settings/calibration follow the module, but game bindings need not survive a change of gateway USB identity. [Cockpit #4](https://github.com/opensimgear/cockpit/issues/4) tracks moves and duplicate live identities.

## Independent simulation and evidence

Gateway and device simulations run from their owning repositories. Cockpit discovers ordinary gateway endpoints and does not create or manage simulated-device processes. Local streams exercise production handlers without creating OS USB/HID controllers.

Native acceptance covers concurrent gateways, same-identity device isolation, configuration persistence and dynamic layouts. A visible macOS native UI run covered four gateways; physical Pico acceptance covers macOS. These results do not establish assembled STM32 or physical Windows/Linux acceptance.

See [Cockpit's README](https://github.com/opensimgear/cockpit/blob/main/README.md), [verification records](https://github.com/opensimgear/cockpit/tree/main/docs/verification) and the [GitHub project](https://github.com/orgs/opensimgear/projects/2).
