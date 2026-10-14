---
title: Communication
description: Implemented Cyphal/CAN inputs, configuration, actions and ordered panel events.
sidebar:
  order: 3
---

Module and gateway firmware use Cyphal/CAN with generated OpenSimGear DSDL, libcanard 5.0, standard Heartbeat/GetInfo and CAN node-ID autoconfiguration. The current application contract is version 3. Gateway USB CDC uses its correlated version-3 interface and reports `canProtocol=3`; Cockpit retains a separate adapter for legacy CDC v2 gateways. The replaced private CAN v1/v2 frames are incompatible with current firmware.

The canonical [protocol repository](https://github.com/opensimgear/protocol) owns the [DSDL](https://github.com/opensimgear/protocol/tree/main/dsdl), [transport](https://github.com/opensimgear/protocol/tree/main/cyphal), [gateway CDC API](https://github.com/opensimgear/protocol/blob/main/serial/stm32-gateway-v3.md), [runtime configuration contract](https://github.com/opensimgear/protocol/blob/main/serial/runtime-configuration.md), [device action contract](https://github.com/opensimgear/protocol/blob/main/serial/device-actions.md) and [panel event contract](https://github.com/opensimgear/protocol/blob/main/serial/panel-input-events.md). Firmware snapshots are checked against those sources.

## Identity and discovery

Stable MCU-derived module identities are separate from chain-local node IDs and ordered USB controllers. Gateways discover bounded input profiles and maintain observed presence, enabled intent and published USB state. Multiple chains can reuse node IDs; Cockpit requests bind the intended gateway, module identity and current session. A physical socket is not an address.

## Input delivery

Input transfers use source-node, boot/session, sequence and lease checks. The gateway keeps input freshness separate from node presence. Current gateway firmware uses a 250 ms input timeout and 1.5 s presence timeout; these configured values have no physical timing acceptance evidence.

Direct USB input ownership neutralizes the module's enabled gateway controller. When direct ownership ends, the CAN route requires fresh valid state before activation. Queued encoder turns are discarded on reset or ownership handoff. Gateway USB completion, rather than elapsed time alone, credits encoder press/release delivery. Overflow and unavailable inputs are diagnostic states.

Buttons release when unavailable; axes use neutral values retained in the retained profile. Shifter momentary contacts require release before rearming after startup, reconnect or handoff. Conflicting shifter contacts suppress all commands until all contacts release, without synthesizing neutral.

## Configuration

One writer owns a module draft across direct USB and gateway/CAN access. Configuration maps buttons, hats, selectors, encoders, axes and expansion contacts, with calibration, inversion, deadzone and Unicode names. Apply activates a validated draft; Save persists it in interrupted-write-safe storage. Discard leaves committed settings intact.

Routed requests bind module identity, boot session, source node, lease and gateway epoch. Configuration activation renews the lease. Control-count, axis-usage or neutral-value changes produce a profile mismatch and require explicit profile update with a binding warning; unchanged-shape calibration and name changes retain the layout. Online disabled devices remain configurable. Stale routes and responses cannot commit settings or replay writes after reconnect.

## Device actions

Devices advertise a bounded, revisioned action catalogue with stable identifiers, parameter types and readable-state metadata. Cockpit renders manual controls from that catalogue. The shared device handler supports booleans, enums, bounded integers, RGB colors, bounded UTF-8 strings and actions without arguments, and validates every invocation before calling the device.

Direct module CDC and routed gateway requests use the same action handler. CAN actions reuse the existing bounded configuration request/reply envelopes, with separate dispatch and a top-level `targetAction` result in the gateway reply. Actions do not claim a settings draft, write flash or change HID descriptors. Periodic application Status proves the current lease even when HID is disabled or direct USB owns inputs, so online devices remain reachable for actions.

The current board exposes its status LED's `auto`, `on` and `off` modes; the native device simulation exposes RGB and boolean LEDs, plus a master-caution profile with that same board-status action. Applied state confirms device callback application. LED overrides are temporary and reset on reboot. A lost invocation reply leaves its outcome uncertain; Cockpit never automatically replays it and can reconcile readable state. The simulated DCS-BIOS master-caution binding uses the status LED or a boolean action. Displays and encoder simulator bindings remain future [milestones](/gear/architecture/desktop-cockpit/#device-action-and-dcs-bios-milestones).

## Ordered panel events

The shared event collector retains 64 debounced mapped-button transitions independently of HID enablement, direct USB ownership and encoder HID acknowledgements. `events state` establishes current head, held buttons, boot/stream and overflow. `events read` returns nonconsuming pages of up to 16 consecutive records. Acquisition preserves brief press/release pairs between host reads. Encoder detents produce ordered pairs, although Milestone 2 rejects encoder controls for its momentary binding.

Gateway requests reuse bounded configuration envelopes, seal identity/boot/source/node/lease/epoch and return a separate `targetEvents` result. Application Status maintains reachability with HID disabled. Configuration activation starts a new stream and clears history. Consumers baseline at the current head after startup, simulator recovery, route changes or cursor gaps, require a held button to release before rearming, and never replay historical presses. Disarming releases a previously forwarded press once without replaying a historical press. Ring overwrites report evictions; an actual cursor gap is a separate error and counter requiring rebaseline.

Cockpit's Rust background worker consumes this stream and the DCS-BIOS UDP export stream. Installed catalogue metadata identifies aircraft, advancing update counter and named master-caution feedback. Fresh supported-aircraft feedback gates commands, and freshness loss requests LED off. UI polling only presents status. See [the setup flow](/gear/architecture/desktop-cockpit/#dcs-bios-master-caution).

## Validation

Native tests cover ten concurrent clients, generated transfers, loss/delay/reordering, collision recovery, direct USB handoff, configuration ownership, flash interruption and gateway reconnection. Action acceptance exercises production firmware processes for catalogue discovery, LED invocation/readback, stale requests and lost replies. Seeded stress exercises malformed/duplicate frames, backpressure and simulated bus-off. These results establish software behavior; assembled electrical LED behavior, acquisition timing and physical USB/CAN recovery are unverified.

Missing implementation and qualification is tracked in the [GitHub project](https://github.com/orgs/opensimgear/projects/2).
