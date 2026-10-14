---
title: Device communication
description: How OpenSimGear discovers modules, delivers inputs, stores settings and sends device feedback.
sidebar:
  order: 3
---

Modules communicate with their gateway over CAN, using the Cyphal protocol. The gateway carries their inputs to the
computer over USB. Cockpit uses a separate USB configuration connection to read device information, change settings and
send actions.

You do not need to manage CAN addresses for normal operation. Firmware handles discovery and address selection.

## Recognizing devices

Each module has a stable identity derived from its controller. The gateway uses this identity to remember a device, even
after it disconnects or restarts. A socket is a connection point, not a device address.

Cockpit groups devices by gateway. Its topology view shows which gateway a device belongs to; it does not identify the
physical cable order or socket position.

## Keeping inputs current

A connected module sends its mapped inputs to the gateway. If input stops arriving, the gateway releases buttons and
returns axes to their configured neutral values. An enabled offline controller remains present on the computer, so a
temporary cable interruption does not remove it from the controller list.

A direct USB input connection takes priority over the gateway route. When it ends, gateway input resumes from fresh
data. Encoder turns queued before a restart or connection handoff are discarded.

For momentary shifter contacts, a button held during startup or reconnection must be released before it can trigger a
new press. Conflicting shifter contacts suppress all commands until every contact is released.

## Changing configuration

A module accepts one settings editor at a time. Cockpit prepares changes as a draft, validates them and applies them
when requested. Saving stores the configuration on the module; leaving a draft unapplied does not change the active
settings.

Changes to calibration or names can retain the existing controller layout. Changes to the number or type of controls
require a [profile update](/gear/architecture/usb-hid/#changing-controls), which can affect simulator bindings.

## Sending feedback

Online devices advertise the actions they provide. Cockpit uses that information to display the available controls. The
current board offers status LED modes: automatic indication, on and off. Software simulations also offer RGB and on/off
LED actions; those do not establish RGB hardware support on the board.

Actions remain available when the device's gateway controller is disabled. LED overrides are temporary and reset when
the device restarts. If a reply is lost, Cockpit does not automatically repeat the action. Use **Refresh state** to
check a readable action's result.

## Inputs and displays for DCS-BIOS

Modules retain an ordered history of mapped button presses and releases. DCS-BIOS reads those events independently of
normal USB controller input, so short debounced presses and encoder turns can be captured between Cockpit reads.
Advertised capabilities distinguish momentary buttons, maintained switches and encoder controls. Calibrated axis
samples are available separately, including when the device's USB controller is disabled.

After startup or recovery, the integration starts from the current state instead of replaying old commands. A held
momentary button must release before a new press is accepted; maintained switches and available axes synchronize their
current absolute state after a fresh baseline. Display and LED updates use complete DCS feedback frames; pending
absolute values keep the newest update rather than accumulating obsolete output writes. Device output size and encoding
determine what text can fit.

See [Cockpit setup](/gear/architecture/desktop-cockpit/#dcs-bios-panel-integration) for named catalogue selection, input
requirements and validation limits.

## Firmware compatibility

Current module and gateway firmware use the version-3 communication contract. The older private CAN v1/v2 protocols are
incompatible with it. Use matching firmware when connecting boards; a legacy Cockpit adapter does not make older CAN
firmware compatible with current modules.

## Owned outputs and other games

Simulator feedback uses volatile physical-endpoint leases, separate from configuration writers and HID ownership. Claims carry a private capability token, bounded expiry and descriptor-validated fallback. Devices reject competing writers and apply fallback after expiry or affected route loss. Portable simulator providers use the same advertised actions: the Assetto Corsa Rally starter supplies typed telemetry and rev-light formatting without adding game-specific commands to boards. Output-only devices enroll and retain guarded routes while publishing no input controller. See [simulator integrations](/gear/architecture/simulator-integrations/) and the [canonical lease contract](https://github.com/opensimgear/protocol/blob/main/serial/output-ownership.md).
