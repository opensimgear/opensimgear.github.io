---
title: Architecture
description: Requirements, proposed system design, and validation plan for modular OpenSimGear controls.
sidebar:
  order: 1
---

OpenSimGear is being designed as a modular system of simulator controls. Each module must work on its own as a USB HID device. Modules may also connect over a separate CAN network to a gateway, which presents their inputs to the host over USB.

This section records the agreed prototype baseline and proposals that still need confirmation or experiments. It does not describe a completed implementation.

## Required behavior

- Every module supports direct, standalone USB HID operation.
- Each module has three connectors: one USB-C for standalone operation and two CAN connectors for daisy chaining modules on a linear bus.
- Each gateway has two parallel CAN ports on one linear chain and one USB host connection presenting its registered module controllers.
- Multiple gateways have separate chains and USB connections. The cockpit presents one device inventory with stable module identities and visible current gateway attachments.
- Adding, removing, or restarting a network module must have defined behavior without restarting the whole system.
- Missing or stale input must never silently remain valid indefinitely.
- Windows is the first target. Standard USB HID inputs should remain portable and need no per-game companion software.
- A desktop cockpit supports configuration, registration, calibration, diagnostics, and firmware updates on Windows, Linux, and macOS.
- Each networked module should appear as a distinct host controller through the gateway; the proposed HID implementation needs validation.

## Proposed system boundary

In standalone mode, a module reads its local sensors, applies calibration and filtering, and publishes USB HID reports. In network mode, it publishes its identity, capabilities, health, and input state to the gateway. The gateway owns the mapping from network controls to host-visible HID fields.

Version 1 covers axes, buttons, encoders, LEDs, backlighting, and small readouts. USB CDC serial serves outputs and configuration alongside HID on the same cable, on both standalone modules and the gateway. SimHub is the initial output integration; a cross-platform desktop cockpit manages configuration and maintenance. Configure modules either directly over USB or over CAN through the USB-connected gateway; v1 firmware updates still require direct USB to the device being updated. The initial SimHub output integration targets Windows; the cockpit requirement does not make SimHub cross-platform. Video panels are outside this baseline; future video would use a separate HDMI/DisplayPort path, not CAN.

Motor power stages, force-feedback commands, emergency stopping, and powered-motion safety need a separate design. The 12 V chain is initially for generally low-power modules, not an established motor-power interface.

## Prototype baseline

STM32G0B1 remains selected for module prototypes, with external CAN FD transceivers and Cyphal over CAN FD. Module firmware uses C, TinyUSB, and libcanard with pinned, jointly tested versions. The gateway needs one CAN FD controller/transceiver path for its two parallel sockets; evaluate its MCU against the composite USB and CAN workload before selection. Production packages, exact library revisions, and gateway integration remain pending. One external 12 V supply powers each gateway chain through protected injection, with local regulation and protected coexistence with standalone USB power. Terminate only the two physical endpoints; an inline gateway is unterminated.

Build modules one at a time toward a system of approximately five to ten. The initial design target is at most ten modules and 5 m of total cable per gateway chain, with typical links shorter than 1 m. These are validation targets, not guaranteed operating limits. Multiple gateways add separate chains; aggregate host capacity and supported gateway count require validation. The gateway exposes controllers for persistently registered modules only, keeping the layout fixed while enumerated. Temporary CAN disconnects retain registered slots; registration, explicit removal, or reconfiguration that changes the descriptor requires a deliberate USB reconnect with user notice.

## Read the design

- [Hardware](/docs/architecture/hardware/) covers the controller baseline, connectors, power, and physical network topology.
- [Communication](/docs/architecture/communication/) covers discovery, input delivery, and failure handling.
- [USB HID](/docs/architecture/usb-hid/) covers standalone operation and gateway mappings.
- [Desktop cockpit](/docs/architecture/desktop-cockpit/) compares application stacks and defines the cross-platform hardware validation.
- [Repository structure proposal](/docs/architecture/repositories/) describes device repositories, shared firmware, protocol definitions, and release ownership.
- [Open decisions and validation](/docs/architecture/decisions/) records unresolved choices and the prototype acceptance matrix.

## First prototype

Start with a sequential shifter using three digital contacts: shift up, shift down, and an explicit neutral command. Once armed, each debounced contact drives a held HID button; firmware does not synthesize pulses. At startup, reconnect, or USB/CAN handoff, any held contact stays blocked until its debounced release and a fresh press. Conflicting contacts suppress all three commands and raise a diagnostic until all contacts have a debounced release. A resting lever sends no command. Stale input releases all three buttons and never generates a neutral command.

Validate standalone USB first, then add the gateway and a second module to exercise controller separation, ownership, output routing, and failure recovery. See the [decision and validation plan](/docs/architecture/decisions/) before committing to a connector pinout or production PCB.
