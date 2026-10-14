---
title: How it works
description: How OpenSimGear device modules, gateways and Cockpit turn physical controls into simulator inputs.
sidebar:
  order: 1
---

OpenSimGear separates the controls you operate from the connection to your computer. A module reads the buttons and
sensors in a peripheral. A gateway lets several modules share one USB connection. Cockpit provides a common place to
adjust their settings.

## Two ways to connect

**Direct USB:** connect a module to the computer. Its firmware presents the configured controls as a USB controller,
without a gateway or Cockpit running.

**Through a gateway:** connect modules along a CAN cable chain, then connect the gateway to the computer over USB. CAN
is the communication bus between the boards. The gateway discovers compatible modules automatically and presents an
enabled controller for each one.

```text
Direct:       Controls → Module → USB → Computer

Gateway:      Controls → Module → CAN → Gateway → USB → Computer
                                           ↑
                                     Cockpit settings
```

Each gateway serves its own chain. Cockpit can show multiple gateways together, while their USB connections and cable
chains remain independent.

## From a movement to an input

The module reads a contact or sensor and applies its configured mapping and calibration. For example, a pedal sensor
becomes an axis, while a panel switch becomes a button. USB delivers those inputs to the computer; you then assign them
to functions in your simulator.

The firmware supports buttons, analogue axes, eight-way hats, rotary encoders and three-position selectors. The
sequential-shifter profile provides up, down and explicit neutral buttons. Releasing the shifter does not send a neutral
command.

If a module has an active direct USB connection, that connection takes priority. Its gateway controller sends neutral
inputs until direct USB input ends and fresh input arrives over CAN.

## Settings and feedback

Cockpit edits the module's input mapping, name and calibration. **Apply** activates changes; **Apply & save** also
stores them on the module for use after a restart. These settings travel with the module. The gateway separately
remembers which devices are enabled as USB controllers.

Feedback uses device actions: commands that an online module offers to Cockpit. The current board offers status LED
modes. The A-10C DCS-BIOS integration connects configured panel inputs, LEDs and compatible displays; validation currently
uses simulated feedback.

## Explore the system

- [Hardware and connections](/gear/architecture/hardware/): boards, chain wiring and power.
- [Device communication](/gear/architecture/communication/): discovery, input delivery and feedback.
- [USB controllers](/gear/architecture/usb-hid/): automatic setup and connection changes.
- [Cockpit](/gear/architecture/desktop-cockpit/): configuration and DCS-BIOS panel setup.
- [Current status](/gear/architecture/decisions/): what has been checked and what remains unverified.
- [Project sources](/gear/architecture/repositories/): where the hardware and software are maintained.
