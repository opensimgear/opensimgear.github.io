---
title: Desktop cockpit
description: Multi-gateway configuration, manual actions and simulated DCS-BIOS panel profiles.
sidebar:
  order: 6
---

[Cockpit](https://github.com/opensimgear/cockpit) is a working Tauri 2 desktop application with a Svelte 5/TypeScript interface and Rust native adapters. It discovers gateways, edits device input configuration/calibration, manages enabled controllers and remembered devices, displays live inputs, renders manual actions and runs a simulated DCS-BIOS A-10C panel profile. HID operation remains independent of the application.

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

Manual actions provide the output interface used by the implemented DCS-BIOS panel profile. Progress is tracked in four milestone stories:

1. [Manual device actions](https://github.com/opensimgear/cockpit/issues/13): implemented advertised actions, gateway routing and Cockpit controls.
2. [First DCS-BIOS button and LED path](https://github.com/opensimgear/cockpit/issues/14): implemented simulated master-caution commands, ordered button events and LED feedback.
3. [Displays and encoders](https://github.com/opensimgear/cockpit/issues/15): implemented configurable button/switch/encoder/axis bindings, bounded display formatting and per-gateway traffic measurements, building on the event stream introduced in Milestone 2.
4. [Profiles and hardware qualification](https://github.com/opensimgear/cockpit/issues/16): future wider aircraft coverage, profile import/export, ownership and hardware qualification.

<span id="dcs-bios-master-caution"></span>

## DCS-BIOS panel integration

Cockpit provides one saved A-10C profile for buttons, maintained switches, encoders and calibrated axes, with LED and
display feedback. The master-caution button and LED remain available as a preset. Bindings can use several known
modules on different gateways; each device choice includes its gateway.

**Validation uses a synthetic DCS-BIOS peer and software panel simulations. Live DCS and assembled STM32 hardware
remain unverified.** Simulated displays demonstrate the software interface, not physical display support on the
current board.

To configure a profile:

1. Open **DCS-BIOS** in the sidebar, or use the link on a device or gateway card.
2. Enter the installed DCS-BIOS `doc/json` folder and use **Search catalogue**. Select commands and feedback by name
   from the catalogue installed with DCS.
3. Add an input and choose its device, physical control and catalogue command. The controls offered come from the
   device's advertised capabilities. Momentary buttons and maintained switches send explicit states; encoder turns
   send steps. Axes use device calibration and a change threshold in the command's units.
4. For each input device, use **Disable controller**, confirm the USB reconnect/binding warning and wait for the
   update to finish. Disconnect active direct USB input and finish any setup session. These input routes must be
   inactive to avoid duplicate simulator commands. Devices used only for output can keep their USB controllers.
5. Add LED or display feedback and choose an advertised device output. Displays show their size, encoding and byte
   limit. Choose text or numeric formatting, any prefix or suffix, and what to show when feedback is unknown or stale.
6. Adjust UDP settings if needed, then use **Save settings** and **Start DCS-BIOS**.

The defaults send commands to `127.0.0.1:7778` and listen on `0.0.0.0:5010`, using multicast group `239.255.50.10`
through `127.0.0.1`. Leaving the multicast group empty selects unicast feedback. The synthetic catalogue supplied for
software development is only for the local peer; use your installed catalogue with DCS.

A profile supports up to 16 inputs and 16 outputs on eight known modules across four gateways. Button and axis
numbering starts at **0**. Three-position selectors are not offered as maintained switch bindings in this integration.
Display text can be aligned, truncated at whole characters or rejected when it does not fit. The current board's status
LED supports on/off feedback; compatible simulated displays provide bounded text outputs.

Saving or restarting Cockpit does not start the integration. Stop it before editing. An unchanged saved master-caution
profile can still start; saving the two bindings shown in the editor explicitly upgrades it. Unsaved edits remain when
changing views. **Stop DCS-BIOS** is also available from Gateways when a target is offline, and does not re-enable its
USB controller.

The status view shows aircraft, freshness, input readiness, errors, desired and applied output values, and gateway
traffic measurements. Feedback continues through a background service while Cockpit is open, independently of the
view. Display updates use complete feedback frames and keep the newest pending value.

Missing or stale feedback requests the configured fallback text and LED off. An unreachable device cannot confirm that
change until it reconnects. After recovery, old presses and encoder turns are discarded; a held momentary button must release
before a new press is accepted. Maintained switches and available axes synchronize their current state after a fresh
baseline. A view showing fresh feedback can still show an input waiting for release. The running
profile controls its selected output actions.


## Independent simulation and evidence

Gateway and device simulations run from their owning repositories. Cockpit discovers ordinary gateway endpoints and does not create or manage simulated-device processes. Local streams exercise production handlers without creating OS USB/HID controllers.

Native acceptance covers concurrent gateways, same-identity device isolation, configuration persistence and dynamic layouts. The [device actions acceptance record](https://github.com/opensimgear/cockpit/blob/main/docs/verification/2026-10-13-device-actions.md) covers production firmware processes and manual LED controls, including disabled HID, direct USB and lost-reply recovery. The master-caution record adds ordered events and simulated DCS-BIOS UDP feedback; the extended panel path adds typed inputs, bounded text displays and per-gateway traffic diagnostics. A visible macOS native UI run covered four gateways; physical Pico acceptance covers macOS. These results do not establish live DCS, assembled STM32 LED/USB/CAN or physical Windows/Linux acceptance.

See [Cockpit's README](https://github.com/opensimgear/cockpit/blob/main/README.md), [verification records](https://github.com/opensimgear/cockpit/tree/main/docs/verification) and the [GitHub project](https://github.com/orgs/opensimgear/projects/2).

## Portable simulator integrations

Open **Integrations** for reusable logical device roles, explicit local assignments, validated import/export and catalogue migration diagnostics. DCS-BIOS can use other supported installed aircraft modules. The Assetto Corsa Rally starter binds RPM, gear, speed and derived rev-ratio telemetry to advertised outputs, including RGB/boolean rev lights and the current board LED. Output-only modules need no HID input profile. Device-enforced leases and temporary overrides govern ownership and recovery. See [the setup and telemetry guide](/gear/architecture/simulator-integrations/) for software validation and source limitations.
