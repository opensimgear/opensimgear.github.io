---
title: Communication
description: Implemented Cyphal/CAN input delivery and module configuration.
sidebar:
  order: 3
---

Module and gateway firmware use Cyphal/CAN with generated OpenSimGear DSDL, libcanard 5.0, standard Heartbeat/GetInfo and CAN node-ID autoconfiguration. The current application contract is version 3. Gateway USB CDC retains its version-2 interface and reports `canProtocol=3`. The replaced private CAN v1/v2 frames are incompatible with current firmware.

The canonical [protocol repository](https://github.com/opensimgear/protocol) owns the [DSDL](https://github.com/opensimgear/protocol/tree/main/dsdl), [transport](https://github.com/opensimgear/protocol/tree/main/cyphal), [gateway CDC API](https://github.com/opensimgear/protocol/blob/main/serial/stm32-gateway-v2.md) and [runtime configuration contract](https://github.com/opensimgear/protocol/blob/main/serial/runtime-configuration.md). Firmware snapshots are checked against those sources.

## Identity and discovery

Stable MCU-derived module identities are separate from chain-local node IDs and retained controller slots. Gateways discover bounded input profiles and maintain observed, pending and active registration state. Multiple chains can reuse node IDs; Cockpit requests bind the intended gateway, module identity and current session. A physical socket is not an address.

## Input delivery

Input transfers use source-node, boot/session, sequence and lease checks. The gateway keeps input freshness separate from node presence. Current gateway firmware uses a 250 ms input timeout and 1.5 s presence timeout; these configured values have no physical timing acceptance evidence.

Direct USB input ownership neutralizes the module's retained gateway slot. When direct ownership ends, the CAN route requires fresh valid state before activation. Queued encoder turns are discarded on reset or ownership handoff. Gateway USB completion, rather than elapsed time alone, credits encoder press/release delivery. Overflow and unavailable inputs are diagnostic states.

Buttons release when unavailable; axes use neutral values retained in the registered profile. Shifter momentary contacts require release before rearming after startup, reconnect or handoff. Conflicting shifter contacts suppress all commands until all contacts release, without synthesizing neutral.

## Configuration

One writer owns a module draft across direct USB and gateway/CAN access. Configuration maps buttons, hats, selectors, encoders, axes and expansion contacts, with calibration, inversion, deadzone and Unicode names. Apply activates a validated draft; Save persists it in interrupted-write-safe storage. Discard leaves committed settings intact.

Routed requests bind module identity, boot session, source node, lease and gateway epoch. Configuration activation renews the lease. Control-count, axis-usage or neutral-value changes update the pending gateway profile and require explicit Apply layout; unchanged-shape calibration and name changes retain the layout. Stale routes and responses cannot commit settings or replay writes after reconnect.

## Validation

Native tests cover ten concurrent clients, generated transfers, loss/delay/reordering, collision recovery, direct USB handoff, configuration ownership, flash interruption and gateway reconnection. Seeded stress exercises malformed/duplicate frames, backpressure and simulated bus-off. Assembled electrical behavior, acquisition timing and physical USB/CAN recovery are unverified.

Missing implementation and qualification is tracked in the [GitHub project](https://github.com/orgs/opensimgear/projects/2).
