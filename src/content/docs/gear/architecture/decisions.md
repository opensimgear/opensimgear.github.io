---
title: Implementation baseline
description: Current prototype design choices and the boundaries of recorded validation.
sidebar:
  order: 5
---

This page records the implemented prototype baseline. Open implementation and qualification work is tracked in the [GitHub project](https://github.com/orgs/opensimgear/projects/2).

| Area | Current implementation |
| --- | --- |
| Controllers | STM32G0B1CBT6 on module and gateway PCB 0.1.0; one CAN controller/transceiver per board. |
| Firmware | C with pinned TinyUSB, STM32 HAL/CMSIS and libcanard dependencies. |
| Network | Generated Cyphal application v3 types, Heartbeat/GetInfo, node-ID autoconfiguration and bounded input/configuration transfers. |
| Connectors | USB-C and two parallel 4P4C sockets; contacts 1–4 are BUS_12V, CAN_H, CAN_L and GND. |
| Topology | One linear chain and one external 12 V injection source per gateway; two physical endpoint plugs, no inline termination. |
| Gateway layout | Ten retained slots, up to 128 buttons/four hats/eight axes per profile; explicit registration and Apply layout with USB reconnection. |
| Input ownership | Active direct USB takes priority; retained gateway slots stay neutral and resume only from fresh CAN input. |
| Configuration | One writer, validated drafts, explicit Apply/Save/Discard, stored mapping/calibration and interrupted-write-safe journals. |
| Encoder delivery | Bounded queued press/release events credited by completed USB delivery, with overflow diagnostics and no replay after handoff/reset. |
| Shifter | Three held commands, release-before-rearm and conflict suppression until every contact releases; no automatic neutral. |
| Host application | Tauri 2/Rust/Svelte with simultaneous independent gateway connections and gateway-scoped device state/drafts. |
| Source ownership | Canonical protocol/common code plus checked firmware snapshots; simulations belong to device repositories. |

## Recorded evidence

Native tests cover transport, discovery, configuration, retained layouts, ownership, encoder delivery, fault injection and storage interruption. Cross-builds and static PCB ERC/DRC/parity pass. Pico hardware has macOS acceptance evidence; the Cockpit native UI has multi-gateway simulation evidence.

There is no assembled STM32-chain acceptance evidence. Ten devices/5 m cable is a qualification target rather than a measured electrical rating. Host/simulator interpretation of HID collections and binding stability across descriptor changes are not guaranteed. No production release, public VID/PID allocation or license grant is claimed.
