---
title: Desktop cockpit
description: Multi-gateway configuration, manual actions and simulated DCS-BIOS master caution.
sidebar:
  order: 6
---

[Cockpit](https://github.com/opensimgear/cockpit) is a working Tauri 2 desktop application with a Svelte 5/TypeScript interface and Rust native adapters. It discovers gateways, edits device input configuration/calibration, manages enabled controllers and remembered devices, displays live inputs, renders manual actions and runs a simulated DCS-BIOS master-caution binding. HID operation remains independent of the application.

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

Visibility changes that remove a published collection warn that USB reconnects and remaining game bindings may need updating. There is no permanent management collection, unused controller placeholder or user slot allocation. The UI follows gateway state, displays capacity/persistence/profile failures, and retains inventory and selection through expected reconnection by gateway UID without replaying ambiguous mutations.

A module move leaves the source gateway's enabled offline ghost until explicit disable/removal; the destination automatically enrolls an unknown identity. A destination's remembered disabled identity stays disabled. On-module settings/calibration follow the module, but game bindings need not survive a change of gateway USB identity. [Cockpit #4](https://github.com/opensimgear/cockpit/issues/4) tracks moves and duplicate live identities.

## Manual device actions

The device workspace's **Device actions** panel discovers an online device's advertised catalogue and provides Apply/Run controls plus Refresh state. Supported parameters include booleans, enums, bounded integers, RGB colors and bounded UTF-8 strings; actions without arguments are also supported. The current board advertises its status LED's `auto`, `on` and `off` modes, while the native simulation advertises RGB LED 1 and boolean LED 2. Older firmware continues to provide inputs with an explicit Unsupported action state.

Actions remain available when the online device's HID controller is disabled or direct USB owns its inputs. These temporary outputs do not claim settings, save flash or change HID descriptors. LED overrides reset on device reboot, and readback confirms software application rather than measured electrical output.

Catalogue and readback state are scoped to gateway identity, epoch, module identity, boot and route. Cockpit validates arguments against the current catalogue revision. Lost invocation replies remain uncertain and are never replayed automatically; Refresh state reconciles readable actions, and Discover again loads changed metadata. See the [action contract](https://github.com/opensimgear/protocol/blob/main/serial/device-actions.md).

## Device action and DCS-BIOS milestones

Manual actions provide the output interface used by the implemented master-caution binding. Progress is tracked in four milestone stories:

1. [Manual device actions](https://github.com/opensimgear/cockpit/issues/13): implemented advertised actions, gateway routing and Cockpit controls.
2. [First DCS-BIOS button and LED path](https://github.com/opensimgear/cockpit/issues/14): implemented simulated master-caution commands, ordered button events and LED feedback.
3. [Displays and encoders](https://github.com/opensimgear/cockpit/issues/15): future bounded text, formatting, encoder bindings and traffic measurements, using the event stream introduced in Milestone 2.
4. [Profiles and hardware qualification](https://github.com/opensimgear/cockpit/issues/16): future wider aircraft coverage, ownership, reconnects and hardware validation.

## DCS-BIOS master caution

One saved A-10C profile sends `UFC_MASTER_CAUTION 1` for a fresh momentary press and `UFC_MASTER_CAUTION 0` for release. Fresh exported `MASTER_CAUTION` feedback drives a readable boolean action or `led.status.set_mode` with `on`/`off`. The native master-caution device simulation has the same logical button 0, ordered events and status LED action as current board firmware.

In an online CAN device's **DCS-BIOS** tab, use **Disable controller**, confirm its existing USB reconnect/binding warning and wait for layout completion. Disconnect active direct USB input. Enter the installed DCS-BIOS `doc/json` directory, zero-based momentary button index and advertised LED action, then **Save settings** and **Start DCS-BIOS**. The native service enforces disabled/unpublished HID and inactive direct USB to prevent duplicate bindings. Saving and application restart do not start the binding; Stop before editing settings.

The catalogue loader resolves named controls, aliases, aircraft-name metadata and update counter from installed files rather than embedding feedback addresses. Defaults are commands to `127.0.0.1:7778`, exports on `0.0.0.0:5010`, multicast group `239.255.50.10` through `127.0.0.1`, and a 1500 ms freshness limit. An empty multicast group permits unicast exports.

A Rust background worker consumes ordered events while Cockpit is open; frontend polling displays status only. Startup, route/stream/boot changes, simulator recovery and cursor gaps establish a current baseline and discard historical presses. A held button must release before a fresh press. Disarm/Stop sends one release only for a press this binding previously forwarded. Missing/stale export, unsupported aircraft and Stop request LED off, with failures visible until the panel is reachable. The running profile manages its bound LED. Gateways provides global Stop even when the bound device is absent. Retained event overwrites count ring evictions rather than lost simulator commands; recovered cursor gaps have a separate counter.

The [local DCS-BIOS peer](https://github.com/opensimgear/cockpit/tree/main/simulation/dcs-bios) uses an authored synthetic catalogue for repeatable software acceptance. Use the installed catalogue with real DCS. [Milestone 2 verification](https://github.com/opensimgear/cockpit/blob/main/docs/verification/2026-10-13-dcs-bios-master-caution.md) records software evidence; assembled button/LED/USB/CAN and live DCS qualification are deferred and do not block this simulated milestone.

## Independent simulation and evidence

Gateway and device simulations run from their owning repositories. Cockpit discovers ordinary gateway endpoints and does not create or manage simulated-device processes. Local streams exercise production handlers without creating OS USB/HID controllers.

Native acceptance covers concurrent gateways, same-identity device isolation, configuration persistence and dynamic layouts. The [device actions acceptance record](https://github.com/opensimgear/cockpit/blob/main/docs/verification/2026-10-13-device-actions.md) covers production firmware processes and manual LED controls, including disabled HID, direct USB and lost-reply recovery. The master-caution record adds ordered events and simulated DCS-BIOS UDP feedback. A visible macOS native UI run covered four gateways; physical Pico acceptance covers macOS. These results do not establish live DCS, assembled STM32 LED/USB/CAN or physical Windows/Linux acceptance.

See [Cockpit's README](https://github.com/opensimgear/cockpit/blob/main/README.md), [verification records](https://github.com/opensimgear/cockpit/tree/main/docs/verification) and the [GitHub project](https://github.com/orgs/opensimgear/projects/2).
