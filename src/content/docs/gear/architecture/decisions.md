---
title: Open decisions and validation
description: Decisions still requiring evidence and the first prototype acceptance matrix.
sidebar:
  order: 5
---

## Agreed prototype baseline

| Area | Agreed direction |
| --- | --- |
| Scope | Axes, buttons, encoders, LEDs, backlighting, and small readouts; no video or motor/force-feedback baseline. |
| First module | Sequential shifter; three held, debounced HID buttons for up, down, and explicit neutral; rest/stale releases all three. |
| Scale | Validate up to ten modules and 5 m total cable per gateway chain, typically under 1 m per link; both sides of an inline gateway count together. Aggregate host capacity and supported gateway count need separate validation. |
| Controller and network | STM32G0B1 remains the module baseline, with external CAN FD transceivers and Cyphal/CAN FD. The gateway requires one controller/transceiver path; its MCU/platform and board remain to be selected and validated. |
| Encoder recovery | Discard queued turns and release both direction buttons on disconnect, reset, or input-path handoff. Resume only new detents after fresh valid state; no old queue replay. |
| Configuration writer | One writer per module across USB and gateway/CAN. Competing writers receive a busy error and cannot take over; session cleanup/expiry details require implementation and timing validation. |
| Module firmware | C with TinyUSB and libcanard, using pinned versions tested together before production; exact revisions remain to be selected. |
| USB identifiers | Request pid.codes allocation when open hardware/firmware licensing and publication requirements are met; no submission or identifiers allocated yet. |
| Gateway ports | Two parallel powered-CAN sockets on one linear chain with one controller/transceiver path; one USB connection per gateway presents its registered module controllers. Endpoint or inline gateway placement, no star or ring. |
| Multiple gateways | Separate CAN/power chains and USB connections, one allocator per chain, unique stable gateway/USB serial identities. Cockpit shows one device inventory with each module's current gateway; disconnect/re-enumeration affects only the relevant gateway routes/layout. |
| Ordinary rotary encoders | Two HID direction buttons, with queued press/release per detent. Pulse width, release gap, queue bounds, and CAN event serialization require implementation and measurement; diagnose overflow. |
| Connections | One USB-C and two parallel CAN connectors per module, forming a linear daisy chain. |
| Power | One external 12 V supply per chain with protected gateway injection, qualified cumulative port-path loads, and local module regulation. Do not join gateway power trunks. Standalone USB prioritizes controls; full output brightness may require 12 V. Protected dual-source operation. |
| Conductors | CAN_H, CAN_L, +12 V, GND; no final connector pin numbering. |
| Connector selection route | Qualify a specific premade RJ11/RJ12-style cable first; use an RJ45-style fallback if signal or power requirements fail. Publish the exact pinout after cable qualification. Generic flat telephone cord is not approved. |
| Endpoint termination | Exactly two removable plugs at the physical endpoints, in unused module/gateway sockets. An inline gateway is unterminated; an endpoint gateway has a plug in its spare socket. Start with the usual 120 ohms, then validate against the chosen cable/transceiver. |
| Host inputs | Windows first, portable standard HID goal without per-game companion software; distinct controller per module through the gateway. |
| Gateway collection layout | Registered modules only, fixed while enumerated. Append new registrations with the goal of preserving existing order. Descriptor changes from registration, explicit removal, or reconfiguration require deliberate USB re-enumeration and user notice; temporary CAN disconnects retain registered slots with defined failure values. |
| Outputs/configuration | CDC serial alongside HID on both modules and gateway; SimHub handles outputs, a separate client handles configuration, and module semantics remain simulator-agnostic. |
| Input ownership | Active direct USB takes priority; explicit status makes the gateway suppress duplicate inputs. |
| Input handoff | Automatically resume through available CAN after direct USB disconnects; release the old path, coordinate ownership, and require fresh valid state without duplicates. |
| Shifter rearming | At startup, reconnect, or USB/CAN handoff, each held momentary up/down/neutral contact requires a debounced release and fresh press before reporting. Armed contacts follow held state; no synthesized pulses or automatic neutral command. |
| Replacement modules | Explicit configuration assigns a compatible replacement identity to the old registered slot and unassigns the old identity. Preserve a compatible collection; descriptor changes require notified USB re-enumeration. No automatic same-type takeover. Preserve compatible non-calibration settings, never old calibration; require fresh calibration where applicable. |
| Output priority | An active direct USB serial command session wins over gateway commands. Cable presence or an idle open port alone does not claim ownership; do not mix competing sources. Fresh valid commands are required after handoff. |
| Output takeover | When the active direct USB serial command session ends, automatically use fresh valid gateway commands; otherwise use the agreed fallback. |
| Shifter contact conflict | Suppress all three commands and report a diagnostic; rearm only after all contacts have a debounced release. |
| Desktop cockpit | Configuration, registration, calibration, diagnostics, and updates on Windows, Linux, and macOS, using explicit serial sessions released for SimHub. |
| Desktop stack | [Tauri 2 with TypeScript/Svelte and Rust](/gear/architecture/desktop-cockpit/) is the selected prototype baseline; implementation and hardware validation on all three systems remain pending. |
| Axis failure policy | Document a default per axis type with optional explicit user override persisted on the module. Gateway retains effective policy even when the module is absent; diagnostics distinguish unavailable input from the numeric HID value. |
| Lost output updates | When neither eligible source is fresh, clear status indicators and blank readouts while retaining configured static background lighting; restore telemetry-driven outputs only from fresh valid commands. Numerical timeout remains to be measured. |
| Node allocation and mappings | Each gateway reserves its address and allocates IDs on its own chain; host routes scope node IDs by stable gateway identity and verify module identity/current session. Compatible moves along the same chain retain slots; cross-gateway moves retain logical identity but destination registration is explicit. |
| Setup and persistence | Module setup through direct USB serial or CAN via the USB-connected gateway; calibration stored on modules and identity-based mappings stored on the gateway. Release SimHub's COM connection for setup. |
| Capability model | Shared versioned, bounded semantics over USB configuration and CAN, with transport-specific framing allowed. Reject incompatible versions with diagnostics; backward-compatible additions follow explicit rules. |
| Cockpit configuration scope | Connected devices only in v1, with one logical entry per module and visible current/last-known gateway. Merge direct USB/CAN sightings; resolve current routes, diagnose identity conflicts, invalidate stale sessions, and require fresh claims and explicit Apply/Save after route changes. Offline backup, restore, and export are deferred. |
| Apply/Save | Explicit actions distinguish draft edits from committed configuration; no universal runtime-preview promise. Interrupted writes retain the last valid configuration. Descriptor changes still require notified USB re-enumeration. |
| Firmware updates and recovery | V1 updates require direct USB to the device being updated with SWD debug-header recovery; explicit manual action with target model/hardware checks and tested interruption recovery; no automatic flashing. Detailed tooling remains open. |

## Remaining decisions

| Item | Decision still needed |
| --- | --- |
| Protocol implementation | Define exact USB/CAN framing, bounded types, sizes, compatibility rules, validity/freshness fields, acknowledgements, and addressing for the agreed shared model. |
| Gateway hardware and production integration | Select and validate a platform for one CAN FD controller/transceiver path, two parallel sockets, endpoint/inline power and termination, and concurrent HID/CDC/CAN. The previous multi-controller requirement is superseded; MCU, board, and tested limits remain open. |
| Module templates and encoder implementation | Define per-type axis/button layouts and exact CAN encoder event representation; measure HID pulse/gap and queue limits. Implement and validate the agreed queue discard/release behavior on disconnect, reset, or input-path handoff. |
| Connector, cable, pinout, and power budget | Complete the agreed telephone-style investigation; select exact parts/mapping and establish ratings, supply sizing, and load limits through measurements. |
| USB allocation execution | Meet pid.codes prerequisites, apply, and document actual standalone/gateway identities after allocation. |
| Multi-gateway protocol and limits | Define bounded inventory snapshots/notifications, stable gateway identity, session/revision handling, identity-conflict diagnostics, and stale-route rejection; measure supported gateway count and aggregate host capacity. |
| Configuration session implementation | Define writer claim/release, disconnect cleanup, expiry, and busy-error messages; validate timing without allowing a competing writer to take ownership. |
| Update and recovery procedure | Implementation selection: define bootloader tooling, USB update workflow, interruption handling, and SWD recovery steps; validate before release. |

## Measurement gates

| Gate | Required evidence before freezing the design |
| --- | --- |
| Firmware resources | Benchmark memory and scheduling under concurrent USB HID, CDC, CAN, acquisition, and outputs. |
| CAN timing | Select and test arbitration/data rates, priorities, input/output publication rates, freshness deadlines, and recovery budgets; no approved numerical timing values yet. |
| Electrical limits | Validate total cable, pair impedance, taps, termination, hotplug, ESD, supply droop, and cumulative current across the full target chain. |
| Host controller separation | Verify distinct registered controllers and stable assignments within unchanged layouts; document binding effects across descriptor updates. Measure axis/button and resource limits; module-type templates remain open. |
| Desktop hardware access | Validate detection, stable identity, serial claiming/release, reconnects, SimHub contention, and bootloader transitions on all three operating systems; review dependency health and packaging. |
| Serial integration | Supply and test a SimHub profile, bounded framing/addressing, output freshness, explicit ownership claim/keepalive/release, COM access, and configuration workflow. |

Distinct collections share the gateway's USB VID/PID and serial identity. They do not create independent module USB product/serial identities; standalone and gateway bindings may differ, and preservation across descriptor changes is not guaranteed. Ten modules per gateway chain is a validation target, not ten always-visible controllers. Supported aggregate host capacity and gateway count remain to be measured. Reject capacity overflow explicitly rather than remapping existing controls.

## First prototype sequence

Start with the sequential shifter in standalone HID mode, verifying debouncing, held states, and explicit neutral behavior. Add serial configuration and a small output test. Then add the gateway and a second module to validate controller separation, discovery, mappings, and ownership. Expand toward the ten-module/5 m per-chain target only after the power and signal tests support it. Add a second independent gateway to validate unified cockpit management and correct routing before multi-gateway acceptance.

## Prototype acceptance matrix

Use the shifter, a second representative module, and one gateway initially; add a second gateway and independent chain for multi-gateway acceptance. Record firmware versions, wiring, descriptors, host software, and measured timings so failures are reproducible. Latency, timeout, and electrical acceptance limits must be agreed, and the stated cable/module targets validated, before acceptance.

| Scenario | Required evidence |
| --- | --- |
| Competing configuration writers | A second USB or gateway/CAN writer receives busy without stealing ownership; test release, disconnect cleanup, and expiry. |
| Configuration via gateway and direct USB | Both paths target the correct module identity and commit settings to the module; interrupted writes retain the last valid configuration. |
| Encoder detents and overload | Each detent produces its direction press/release within validated timing/rate limits; overflow is diagnosed. Disconnect, reset, and input-path handoff discard queued turns and release both buttons; only new detents resume after fresh valid state. |
| Gateway hardware capacity | Selected platform serves two parallel sockets through one CAN FD controller/transceiver path and meets memory, descriptor, scheduling, and traffic budgets at the ten-module per-chain target. |
| Same-chain move and fault | Compatible registered identity retains its slot after moving along the chain or between sockets, without descriptor change after fresh-state validation. Chain diagnostics identify the gateway and affected modules; sockets are not separate fault domains. |
| Gateway endpoint and inline placement | Both socket arrangements form one bus; exactly two endpoint plugs, no gateway termination inline. Cable on both sides counts toward one length/load budget. |
| Two gateways with overlapping node IDs | Unique gateway identities scope routing correctly; one device inventory shows attachments and writes/outputs reach only the intended stable module identity. |
| Direct USB and CAN sightings | One logical device entry retains gateway attachment while direct USB owns input and the selected configuration route respects the single writer. |
| Cross-gateway module move | Same cockpit identity/settings/calibration, updated attachment, old slot absent with failure values, and explicit destination registration when needed. Notify descriptor changes only on affected gateways and document game/profile binding effects. |
| Gateway loss or re-enumeration | Only its routes/pending sessions invalidate; other gateway devices remain usable. Reconnect refreshes inventory before action; cached attachment is not shown as live. |
| Route change during Apply/Save | End the old writer session, do not replay pending edits, and require fresh ownership and explicit Apply/Save. Reject stale responses and reused node IDs with mismatched module identity. |
| Duplicate identities on independent chains | Show conflict, preserve diagnostic gateway sightings, and block automatic routed writes until resolved. |
| Multi-gateway serial ownership | Open ports only for explicit sessions; a busy gateway is reported without blocking other gateway access, and cached inventory is labelled last-known. |
| USB output power limit | Inputs remain usable while lighting/readout loads are reduced or disabled within the available USB budget. |
| Manual firmware update | Reject wrong model/hardware images; flash only after explicit action and validate interrupted-update recovery. |
| Direct USB, network absent | Each module enumerates and all intended controls work independently. |
| Two modules through gateway | Host sees distinct controllers; inputs map correctly within the agreed latency budget, with stable collection assignments. |
| Shifter rest, hold, and stale state | Armed buttons follow debounced contacts without pulses; rest/stale releases all three and never generates neutral. |
| Held shifter contact at startup, reconnect, or input handoff | Each held contact stays blocked until debounced release and fresh press; released contacts operate normally without global suppression of other control types. |
| Conflicting shifter contacts | All three commands remain suppressed with a diagnostic until every contact is debounced released; partial release does not rearm. |
| Direct output session ends | Fresh valid gateway commands take over automatically; with neither source fresh, clear indicators/readouts and retain static lighting. |
| Desktop cockpit on Windows, Linux, and macOS | Device identity survives port changes; serial access is claimed/released correctly; reconnect, busy-port errors, and USB update/bootloader recovery work. |
| Capability version compatibility | USB configuration and CAN interpret the same capabilities; incompatible versions fail with diagnostics, and allowed additions obey explicit compatibility rules. |
| Configuration Apply/Save interruption | Draft edits remain distinct from committed settings; interrupted writes preserve the last valid configuration, and descriptor-changing commits follow notified re-enumeration. |
| Replacement assignment | Same-type discovery does not steal a slot; explicit compatible reassignment updates identity and leaves the old identity unassigned. Compatible non-calibration settings survive, old calibration does not; fresh calibration is required where applicable. Descriptor changes follow notified re-enumeration. |
| Missing axis module | Gateway applies the documented default or persisted explicit override using its retained policy, while diagnostics separately report unavailable input. |
| Competing output sources | Active direct serial commands win; cable presence/idle COM alone does not claim ownership. No mixed sources or stale commands appear after handoff. |
| SimHub output and serial handover | Profile routes commands correctly; stale updates clear indicators/readouts but preserve static background lighting, and only fresh valid commands restore outputs. Setup releases the COM connection cleanly. |
| Reconnect or remove a module within an unchanged layout | Existing host bindings stay stable; removal triggers the documented failure values within the deadline. |
| Registration, explicit removal, or reconfiguration changing the descriptor | User notice and deliberate USB re-enumeration apply the new layout; test and document binding effects without assuming bindings are preserved. |
| Middle module removal and bypass | All affected inputs become stale; reconnecting cables or a bypass coupler restores continuity, correct termination, and the same assignments. |
| Final module removal or chain extension | Relocated endpoint termination restores a valid two-termination bus; measure disruption and recovery during the change. |
| Local MCU reset or electronics rail loss | Connected passive pass-through preserves downstream communication and any trunk power; the unpowered local transceiver does not disrupt the bus. |
| Module reboot or new node ID | Stable identity restores the same assignment after fresh valid input arrives. |
| Heartbeat continues, input stops | Freshness monitoring detects the fault despite node liveness. |
| Gateway restart | Assignments recover; buttons remain released and axes use their retained failure policies until fresh valid input is available. |
| USB and CAN connected together | One intended host input path is active; no duplicate button or axis events occur. |
| Direct USB disconnect with CAN available | Input resumes automatically through the gateway after ownership handoff and fresh valid state; no duplicate or stale input is emitted. |
| USB power only | Ownership follows the documented host-session rule. |
| Either power source removed | No backfeed, unintended reset propagation, or unsafe input state occurs. |
| Live connection and maximum load | Inrush, supply droop, bus errors, and recovery meet the agreed electrical limits. |
| Worst-case cumulative 12 V bus power | Upstream cables, connectors, and traces carry downstream load within ratings; final-node voltage stays in range and USB never backfeeds the trunk. |
| Unknown schema or full slot map | Gateway reports incompatibility or capacity exhaustion without corrupting existing mappings. |

Motor control, force feedback, and video require separate designs beyond this baseline.
