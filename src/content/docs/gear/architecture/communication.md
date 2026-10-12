---
title: Communication
description: Proposed CAN discovery, capability exchange, input freshness, and reconnect behavior.
sidebar:
  order: 3
---

## Transport baseline

Cyphal over CAN FD is selected for the prototype. It offers an established model for typed messages and services, but selecting it does not define OpenSimGear's application interface. The protocol reference is the [Cyphal specification](https://specification.opencyphal.org/Cyphal_Specification.pdf); shared definitions are maintained in the [public regulated data types](https://github.com/OpenCyphal/public_regulated_data_types).

Each gateway serves one CAN chain through two parallel sockets and owns node-ID allocation on that chain. Multiple gateways operate independently, each connected to the host by USB. A node ID is local to its gateway chain and may be reused on another chain. Host routing therefore scopes the current node ID by stable gateway identity and verifies stable module identity. The two sockets share all traffic and do not provide a port address or separate fault domain. Do not join gateway chains; each has one allocator.

The module firmware baseline is C with [TinyUSB](https://github.com/hathach/tinyusb) for USB and [libcanard](https://github.com/OpenCyphal/libcanard) for Cyphal/CAN. Pin and test concrete versions together; no revisions are selected here. These libraries provide protocol components, not a completed board driver or OpenSimGear application. Validate integration, memory, bus utilization, and latency before production. Gateway hardware and its firmware integration remain open. Arbitration and data bit rates, publication rates, priorities, and maximum payload sizes remain design decisions.

## Identity and discovery

Proposed discovery has two separate stages. First, a module obtains or uses a valid network node ID. Second, the gateway learns what that module can do through an OpenSimGear capability schema. Node-ID allocation alone does not describe axes, buttons, calibration, or host mappings.

Each module and gateway exposes a stable unique identity that survives reboot and USB port changes. The transient node ID routes traffic on the current chain. Each gateway reserves its own address, persists chain-local allocations, and stores controller assignments against stable module identity. Moving a registered module between the two sockets or along the same chain retains its compatible controller slot after fresh-state validation; the move alone does not change the USB descriptor. The shared bus cannot identify which physical gateway socket a module uses.

Gateway CDC discovery must identify the gateway and report each module's stable identity, model, hardware/firmware and capability versions, current node ID, registration/slot, input/output ownership, and health/freshness. Inventory snapshots and arrival, loss, restart, and address-change notifications must let the cockpit reconcile one inventory across gateways. Exact messages, bounds, notification delivery, and session/revision representation remain protocol implementation work.

The cockpit keeps the current gateway attachment and last-known gateway separate, merges simultaneous direct-USB and CAN sightings by module identity, and resolves actions through a fresh route. Requests and responses must bind the intended gateway, module identity, and current session; a gateway rejects a stale identity/address pairing instead of acting on a node ID reused by another module. Gateway disconnect or restart invalidates its routes and pending sessions. If the same module identity appears on independent gateway chains, report an identity conflict and block automatic routed writes until resolved.

Moving a module to another gateway updates its cockpit attachment without changing the logical device or its persisted settings/calibration. Its old gateway retains the absent registered slot and failure values until explicit removal. The destination discovers it but requires explicit registration if it has no existing compatible slot there. Registering or removing a slot follows the affected gateway's descriptor/re-enumeration workflow; the cockpit must not promise that game bindings follow a module across gateway USB identities.

The agreed capability model is shared, versioned, and bounded across USB configuration and CAN. It describes module type, firmware/schema version, input and output counts and kinds, value ranges, and configuration features. Shared semantics do not require identical wire framing on both transports. Reject incompatible versions with a diagnostic; allow backward-compatible additions only under explicit compatibility rules. Exact bounds, wire formats, type definitions, and subject/service allocation still need implementation design.

A replacement module does not automatically take over a missing module's slot merely because its type matches. The user explicitly assigns it to the old registered slot through configuration. Verify capability compatibility, update the slot to the replacement's unique identity, and leave the old identity unassigned. Preserve the collection when the descriptor remains compatible; otherwise follow the explicit descriptor-update and USB re-enumeration process. Preserve compatible non-calibration settings, but never copy the old calibration, even between modules of the same type. Require fresh calibration on the replacement wherever calibration applies; the digital-contact shifter does not require an inapplicable axis-calibration step.

## Outputs and configuration

Wire-level module semantics are simulator-agnostic: controls and outputs describe physical capabilities, not a particular game's telemetry names. SimHub on the host resolves telemetry into custom serial messages. A standalone module consumes those over USB CDC; the gateway converts addressed messages into CAN application commands for the intended module.

Output commands need their own freshness and ownership rules. When neither eligible output source supplies fresh valid commands, the agreed fallback is to turn status indicators off and blank readouts while retaining configured static background lighting. Status LEDs and background lighting must be distinguished in configuration; losing telemetry must not turn all backlighting off. Resume telemetry-driven outputs only from fresh, valid commands. The numerical freshness timeout remains to be measured. A connected USB cable or healthy CAN heartbeat alone must not keep an obsolete output command valid.

An active direct USB serial command session takes priority over gateway output commands. Cable presence or an idle open COM port alone does not establish ownership. The explicit claim, keepalive, release, and session protocol still needs implementation; competing sources must not mix fields or interleave commands for the same module. After any handoff, accept only fresh valid commands from the new owner. When the direct session ends, output control automatically falls back to fresh valid gateway commands. If neither source is fresh, use the agreed stale-output fallback; never replay expired commands.

The cross-platform [desktop cockpit](/gear/architecture/desktop-cockpit/) provides configuration, registration, calibration, diagnostics, and updates on Windows, Linux, and macOS. It claims serial access only for an explicit configuration or test session and releases it for SimHub; a shared-port broker is not part of the baseline.

The cockpit configures a module either through its direct USB serial connection or through USB serial on its current gateway, which routes configuration over CAN to that module. The route is selected from the live identity-based inventory; users do not manually choose a CAN socket or node ID. A lost or changed route ends the active configuration session, leaves drafts uncommitted, and requires a fresh claim and explicit Apply/Save before sending edits on the new route. Calibration remains persisted on each module and identity-to-slot mappings on the gateway. Version 1 firmware updates require direct USB to the device being updated, with SWD debug-header recovery. Updates are explicit manual actions, never automatic flashing. Verify the target model and hardware compatibility before writing firmware, and test interrupted-update recovery. CAN firmware updates are not required for the initial prototype. Message formats and the detailed update/recovery procedure still need implementation and validation.

Configuration uses explicit Apply/Save actions. Draft edits are distinct from committed configuration; editing a field does not imply runtime preview or persistence. Protect commits against interrupted writes so the last valid configuration remains available. Descriptor-changing commits still require the notified USB re-enumeration workflow. Version 1 configures connected devices only; offline backup, restore, and export are deferred.

Each module permits one configuration writer at a time, whether reached through direct USB or gateway/CAN. A competing writer receives a busy error and cannot steal ownership. Claim/release, disconnect cleanup, and expiry details remain implementation work, with timing to be validated. Configuration ownership is distinct from telemetry output ownership; output priority cannot override the configuration writer.

## Rotary encoder events

Ordinary rotary encoders map each detent to a queued press and release of one of two HID direction buttons. They are events, unlike the sequential shifter contacts whose armed state is held. Exact CAN event serialization, pulse width, release gap, and bounded queue size remain implementation and measurement work. Report queue overflow as a diagnostic; this design does not guarantee lossless reporting at arbitrary rotation speed.

On disconnect, reset, or input-path handoff, discard queued encoder turns and release both direction buttons. Accept new detents only after fresh valid state is established; never replay the old queue. Event/session tracking and precise implementation boundaries still need validation.

## Proposed lifecycle

1. A module starts, initializes local inputs, and joins the network.
2. The gateway discovers its identity and reads compatible capabilities.
3. The gateway restores or creates a control assignment and waits for valid input.
4. The module publishes input state and health independently.
5. Removal, restart, or expired input marks the affected controls unavailable.
6. Reconnection repeats compatibility checks and restores the saved assignment where possible.

A heartbeat shows that a node is alive. It does not prove that its sensor acquisition or input publication is still working. The gateway therefore needs a separate freshness deadline for input data. A healthy heartbeat with frozen inputs must still trigger the input-failure policy.

Input handoff is automatic: after direct USB disconnects, a module resumes input through CAN when the gateway path is available. Explicit ownership coordination must release the old path before enabling the new one, and the gateway must receive fresh, valid input first. The handoff must not produce duplicate inputs or reuse stale state. If CAN is unavailable, the normal input-failure policy applies.

## Failure behavior

Buttons release on unavailable input. Each axis type has a documented failure default, with an optional explicit user override persisted on the module. Centered steering and released pedals illustrate defaults to define and validate for their respective control types; they are not universal safety guarantees. The gateway must retain the effective failure policy for each registered axis so it can apply it even when the module is missing. Diagnostic unavailability is a separate state from the numeric HID failure value. Holding the last value indefinitely must never be an accidental fallback.

For the first sequential shifter, the behavior is settled: stale input releases shift-up, shift-down, and neutral-command buttons. It never synthesizes a neutral command. Resting position also means no command; the neutral contact is an explicit user action.

At startup, reconnect, or USB/CAN input handoff, each of the three momentary contacts that is already held stays blocked until it has a debounced release followed by a fresh press. After arming, reports follow held contact state without synthesized pulses. This rule is specific to these momentary shifter commands, not a global rule for axes or maintained switches.

If sequential-shifter contacts conflict, suppress all three commands and report a diagnostic. Keep them suppressed until all three contacts have a debounced release; only then rearm for a fresh press. This conflict latch overrides the normal per-contact startup/reconnect/handoff behavior and never generates a neutral command.

The application schema should make validity and restart detection explicit. During recovery, the gateway should wait for fresh, valid state before making controls active again. Sequence tracking can help detect missed or repeated samples, but its precise representation remains open.

A node timeout and a physical chain break have different scopes. Removing a middle module can disconnect every downstream module and disturb termination for the remaining bus. The gateway must mark each affected module's inputs stale independently and apply its failure values; it must not assume that only the unplugged module disappeared. After the chain and termination are restored, rediscovery uses stable identities to recover the same assignments before fresh inputs become active. Passive wiring can preserve downstream communication during a local MCU reset, but cannot preserve continuity across unplugged connectors.

Timeouts must balance responsiveness against normal scheduling jitter and brief packet loss. Measure removal, stalled acquisition, reboot, gateway restart, and network overload separately; each exercises a different failure path. Record both the time to mark an input unavailable and the time to restore it.
