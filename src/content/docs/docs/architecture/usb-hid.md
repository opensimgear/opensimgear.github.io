---
title: USB HID
description: Standalone and gateway controllers, USB ownership, and SimHub serial outputs.
sidebar:
  order: 4
---

## Standalone modules

Every module must present a useful USB HID interface when connected directly to a host. Its local configuration defines how physical inputs become buttons or axes, including calibration and ranges. The proposed design shares this calibrated input model across USB and CAN so both paths agree on ranges and neutral values. Network availability must not be a prerequisite for this path.

Windows is the first target, with portable standard USB HID input as the goal. Inputs must not require per-game companion software. The first module is a sequential shifter with three debounced digital contacts: shift up, shift down, and explicit neutral command. Once armed, HID buttons follow held contact states without generated pulses; all are released at rest or when input becomes stale. Any contact held at startup, reconnect, or USB/CAN handoff remains blocked until a debounced release and fresh press. This is specific to the three momentary commands. Conflicting contacts suppress all three commands and report a diagnostic; rearm only after all contacts are debounced released.

A HID report descriptor describes the meaning and layout of reports. The host learns that layout during enumeration; changing the report bytes does not redefine the interface. The [Linux HID introduction](https://docs.kernel.org/hid/hidintro.html) explains this descriptor/report relationship.

Controls take priority within the available standalone USB power budget. Lighting and readout loads may be reduced or disabled; full brightness may require 12 V.

Actual descriptor choices need host and simulator testing. A standards-compliant descriptor alone does not guarantee that every target game accepts the same button counts, axis usages, or multiple report collections.

## USB identifiers

The agreed identifier route is to request a pid.codes allocation when the project is eligible. Its [application requirements](https://pid.codes/howto/) require publicly available, modifiable hardware and firmware under recognized open-source licenses; the project must satisfy those prerequisites before applying. No allocation or submission is claimed here, and no VID/PID values are assigned by this document. Define standalone and gateway product identities through the actual allocation process.

## Rotary encoders

An ordinary rotary encoder uses two HID direction buttons. Queue a distinct press/release for each detent in its direction, preserving a release gap between repeated presses. Pulse width, gap, queue bounds, and host-supported rate must be measured; overflow must raise a diagnostic. This event behavior does not change the sequential shifter’s held-button behavior. CAN event representation remains open. On disconnect, reset, or input-path handoff, discard queued turns and release both direction buttons; accept new detents only after fresh valid state, without replaying old turns.

## Registered gateway controllers

The gateway is a USB device that converts application data into HID reports; it is not a USB hub or a transparent forwarder of module USB traffic. One gateway USB device presents a distinct host controller for each persistently registered module on its single CAN chain. The implementation uses HID game-controller top-level collections with stable module assignments. Windows represents HID top-level collections separately in its HID device model, but simulator behavior still needs testing. See [Microsoft's top-level collection documentation](https://learn.microsoft.com/en-us/windows-hardware/drivers/hid/top-level-collections).

Build the layout from registered modules only and keep it fixed while the gateway remains enumerated. First registration appends a collection with the goal of preserving existing order. First registration, explicit removal from the registry, or reconfiguration that changes the descriptor requires deliberate USB re-enumeration with notice that bindings may need updating. A temporary CAN unplug does not unregister the module: its slot stays visible, buttons release, and axes use their defined failure values.

Ten modules per gateway chain is the initial validation target, not ten always-visible controllers. Multiple gateways enumerate independently with unique USB serial identities; aggregate host/game capacity still requires validation. Exact axis/button capacities, module-type templates, and memory, endpoint, host, and game constraints remain open. Target games must be tested across layout changes; preserving their bindings after a descriptor update is not guaranteed.

All collections share the gateway's USB VID/PID and USB serial identity. A CAN module does not gain an independent USB product or serial identity behind this gateway. Stable collection assignments aim to preserve gateway-mode bindings, but identical bindings between standalone and gateway operation are not guaranteed.

Persist assignments using stable module identity and local control identifiers. A node-ID or socket change within the same gateway chain must not reorder the host’s controls. Moving the same registered identity along that chain preserves its slot when capabilities remain compatible and fresh state is available; the move itself does not change the descriptor. Maximum aggregate input capacity is bounded by the active descriptor and validated resource limits. An unknown module appears as a discovery candidate; it does not automatically create a collection or reroute existing controls. The user registers it through an explicit layout update and USB re-enumeration. Ordinary hotplug never changes the descriptor automatically. When capacity is exhausted, reject registration explicitly rather than silently moving existing controls.

A move to another gateway preserves the cockpit device identity and module settings, but HID slots belong to each gateway. The old slot remains present with failure values until explicitly removed. The destination requires explicit registration unless it already has a compatible slot for that identity. Apply descriptor changes and notified USB re-enumeration only to the affected gateway. Game bindings may change because the gateway USB identity changes; the cockpit inventory does not virtualize or merge HID devices.

Supported module combinations and descriptor details still require validation. Persistent assignments aim to keep unchanged layouts predictable; they do not provide independent per-module USB identities or guarantee bindings across descriptor changes.

Assign replacement hardware explicitly to the old registered slot using the configuration tool. Matching module types do not authorize automatic takeover. Verify capabilities, map the replacement identity to the slot, and unassign the old identity. Preserve the existing collection when descriptor-compatible; a changed descriptor requires the normal notified USB re-enumeration. Preserve compatible non-calibration settings, but never transfer the old calibration, even for the same module type. Require fresh calibration wherever applicable; a digital-contact shifter need not perform axis calibration.

Each axis uses its documented type-specific failure default or an explicit user override persisted on the module. The gateway retains the effective policy for registered axes so it remains available after disconnection. Diagnostics must report unavailable input separately from the numeric value emitted over HID.

## Simultaneous USB and CAN

A module can be physically connected to USB and CAN at the same time. Without an ownership rule, a simulator could receive the same physical input from both the standalone device and the gateway.

Direct USB inputs take priority while an active host USB session is established: the gateway suppresses that module's input contribution, while network health and configuration remain available. This requires an explicit ownership status in the application protocol. VBUS presence alone is insufficient to distinguish a working host session from a power-only connection.

When direct USB disconnects, input automatically resumes through the available CAN/gateway path. Ownership coordination releases the old path before enabling the new one, with fresh valid state required and no duplicate input contribution. If CAN is unavailable, normal failure behavior applies. The handoff mechanism and timing still need validation; this agreed behavior is not a claim of completed implementation.

## SimHub outputs and readouts

Both standalone modules and the gateway expose USB CDC serial alongside HID over the same USB cable. SimHub is the initial integration for LEDs, backlights, and small readouts. The [desktop cockpit](/docs/architecture/desktop-cockpit/) uses serial for configuration, registration, calibration, diagnostics, and updates on Windows, Linux, and macOS. SimHub remains the initial Windows output integration. SimHub's [custom serial device support](https://github.com/SHWotever/SimHub/wiki/Custom-serial-devices) provides the host-side starting point; OpenSimGear's message framing, addressing, and configuration commands still need definition and testing.

The host translates simulator telemetry into physical output values. Modules do not encode game-specific telemetry semantics. Gateway serial messages identify the destination module, and the gateway carries those commands over CAN. With multiple gateways, bind each serial output session/profile to the stable gateway identity and its module identities; node IDs alone are insufficient. Gateway moves require updating the output route/profile, and expired commands must not follow the move. Small readouts carry bounded values/text or display commands, not video streams. Future video panels would need a separate HDMI/DisplayPort connection.

The initial integration needs a supplied SimHub profile that maps telemetry to module identities or logical module/channel addresses. It is not a native automatic discovery driver. Define a simple bounded, framed serial protocol and validate it with SimHub's custom messages. Output update frequency is independent of input reports and depends on application settings and edition.

Setup can reach a module over direct USB serial or via the USB-connected gateway and CAN. Initial firmware updates require direct USB to the device being updated, with SWD debug-header recovery. Flashing is manually initiated with model/hardware checks and tested interruption recovery. SimHub and a configuration tool cannot simultaneously own the same COM port. Setup or updating must release SimHub's serial connection, unless a future service explicitly multiplexes access. HID input stays independent of serial-port ownership; firmware updating can still restart or re-enumerate the device.

Output ownership is distinct from HID input ownership. An active direct USB serial command session takes priority over gateway outputs; a cable or idle open COM port alone does not claim ownership. Explicit claim/keepalive/release handling remains to be implemented, with one source controlling a module at a time and fresh valid commands required after handoff. When that session ends, control automatically falls back to fresh valid gateway commands.

The agreed fallback when neither eligible source has fresh valid output commands clears status indicators and readouts while retaining configured static background lighting, and restores telemetry-driven outputs only from fresh valid commands from the authorized owner. Timeout values remain to be measured; see [communication](/docs/architecture/communication/). Standard input operation remains independent of SimHub.

## Host validation

Test both USB paths on target operating systems and simulators: enumeration, saved bindings, restarts, simultaneous connections, module arrival order, and multiple gateway USB identities. Verify that re-enumerating or losing one gateway leaves the other gateways operational and measure binding changes when a module moves between gateways. Measure latency from physical input to host-visible report.
