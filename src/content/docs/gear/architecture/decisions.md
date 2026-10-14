---
title: Implementation baseline
description: Current prototype design choices and the boundaries of recorded validation.
sidebar:
  order: 5
---

This page records the implemented prototype baseline. Open implementation and qualification work is tracked in the [GitHub project](https://github.com/orgs/opensimgear/projects/2).

## Automatic controller enrollment

The 2026-10-13 decision is automatic CAN-device enrollment into a persistent ordered HID controller list. New identities enable and append automatically. Enabled devices retain neutral collections during temporary absence; explicit Disable removes a collection while remembering the device, and manual Remove forgets an offline record. There is no permanent management collection, unused joystick placeholder or user slot assignment.

Collection removal can shift Windows identities and require game rebinding. Automatic append preserves existing order/controls but also needs Windows/game qualification, especially the single-to-multiple collection transition. See the [complete lifecycle](/gear/architecture/usb-hid/#automatic-enrollment-architecture), [gateway #8](https://github.com/opensimgear/device-gateway/issues/8), [protocol #6](https://github.com/opensimgear/protocol/issues/6) and [Cockpit #5](https://github.com/opensimgear/cockpit/issues/5). The table below records the implementation; physical qualification remains open.

## Current implementation

| Area | Current implementation |
| --- | --- |
| Controllers | STM32G0B1CBT6 on module and gateway PCB 0.1.0; one CAN controller/transceiver per board. |
| Firmware | C with pinned TinyUSB, STM32 HAL/CMSIS and libcanard dependencies. |
| Network | Generated Cyphal application v3 types, Heartbeat/GetInfo, node-ID autoconfiguration, CDC v3 and bounded input/configuration transfers; actions and ordered event reads reuse the existing configuration request/reply envelopes. |
| Connectors | USB-C and two parallel 4P4C sockets; contacts 1–4 are BUS_12V, CAN_H, CAN_L and GND. |
| Topology | One linear chain and one external 12 V injection source per gateway; two physical endpoint plugs, no inline termination. |
| Gateway layout | 32 remembered identities and enabled controllers, up to 128 buttons/four hats/eight axes per profile; automatic append, offline ghosts, disable/enable and guarded removal with saved USB publication. |
| Input ownership | Active direct USB takes priority; enabled gateway controllers stay neutral and resume only from fresh CAN input. |
| Configuration | One writer, validated drafts, explicit Apply/Save/Discard, stored mapping/calibration and interrupted-write-safe journals. |
| Device actions | Revisioned metadata, typed validation and device-owned callbacks through direct CDC or guarded gateway/CAN routing; temporary status LED mode and simulated RGB/boolean LEDs with readable state. No settings claim, flash write or HID descriptor change. |
| Encoder delivery | Bounded queued press/release events credited by completed USB delivery, with overflow diagnostics and no replay after handoff/reset. |
| Panel events | Independent debounced mapped-button ring, boot/stream and route guards, nonconsuming bounded pages and current-head baselines; brief transitions survive host polling intervals without historical replay after recovery. |
| Shifter | Three held commands, release-before-rearm and conflict suppression until every contact releases; no automatic neutral. |
| Host application | Tauri 2/Rust/Svelte with simultaneous independent gateway connections, scoped device state/drafts, manual actions and a background DCS-BIOS A-10C master-caution profile. Installed named catalogue, HID disabled/direct USB inactive, explicit Start, freshness-gated LED and commands. Ambiguous invocations are not replayed automatically. |
| Source ownership | Canonical protocol/common code plus checked firmware snapshots; simulations belong to device repositories. |

## Recorded evidence

Native tests cover transport, discovery, configuration, retained layouts, ownership, encoder delivery, fault injection and storage interruption. The [manual action acceptance record](https://github.com/opensimgear/cockpit/blob/main/docs/verification/2026-10-13-device-actions.md) covers production firmware processes, catalogue validation, LED invocation/readback and uncertain-reply recovery. [Master-caution verification](https://github.com/opensimgear/cockpit/blob/main/docs/verification/2026-10-13-dcs-bios-master-caution.md) records the implemented ordered-event and simulated DCS-BIOS path. Cross-builds and static PCB ERC/DRC/parity pass. Pico hardware has macOS acceptance evidence; the Cockpit native UI has multi-gateway simulation evidence. [Displays, encoder bindings and wider profiles/hardware qualification](/gear/architecture/desktop-cockpit/#device-action-and-dcs-bios-milestones) remain future milestones.

There is no assembled STM32-chain acceptance evidence. Action readback confirms software callback application rather than electrical LED behavior. Ten devices/5 m cable is a qualification target rather than a measured electrical rating. Host/simulator interpretation of HID collections and binding stability across descriptor changes are not guaranteed. No production release, public VID/PID allocation or license grant is claimed.
