---
title: Gear Overview
description: Understand OpenSimGear's modular controls, USB gateway and Cockpit app, and the current prototype status.
sidebar:
  label: Overview
  order: 1
---

OpenSimGear develops modular controls for sim racing and flight simulation. Its device boards read buttons, switches and
sensors. You can connect a device directly to a computer over USB, or connect several devices through one gateway.

The Cockpit desktop app brings connected devices into one place for configuration, calibration and live input checks.
Normal USB controller input works without Cockpit running.

Licensing is under review. Original project material is currently all rights reserved, with no general personal,
noncommercial or commercial license grant. Read [licensing and permissions](/policies/licensing/) before reusing code
or designs or building from project sources. Third-party licenses and rights provided by law, platform terms or a
separate valid permission remain applicable.

## The three parts

| Part          | What it does                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Device module | Reads the controls in a peripheral, such as a button panel, pedals or shifter. Stores its input mapping and calibration.  |
| Gateway       | Connects a chain of modules to the computer through one USB connection and presents their inputs as separate controllers. |
| Cockpit       | Shows connected gateways and devices, edits settings, manages controller visibility and provides device actions.          |

These are prototype boards and software, rather than finished peripherals. The device template supplies a controller
board and firmware; it does not include a completed pedal set, shifter or enclosure.

## What you can explore today

The implementation includes configurable buttons, axes, hats, rotary encoders and selectors. Cockpit can connect to
multiple gateways, display live inputs and control the current board's status LED. A single A-10C master-caution button
and LED integration is implemented and tested with simulated DCS-BIOS feedback.

Software simulations let you explore discovery, configuration and device actions without assembled STM32 boards. They do
not create USB game controllers in the operating system.

**The system is still under development.** The STM32 module and gateway boards have not been physically validated, and
the master-caution integration has not been verified with live DCS. Read [current status](/gear/architecture/decisions/)
before deciding to build hardware.

## Where to go next

- [How it works](/gear/architecture/): follow a control from the device to your simulator.
- [Hardware and connections](/gear/architecture/hardware/): understand the boards, cables and power requirements.
- [USB controllers](/gear/architecture/usb-hid/): learn what happens when you connect, disable or move devices.
- [Cockpit](/gear/architecture/desktop-cockpit/): configure controls and explore the desktop app.

For general equipment advice, use the [component guides](/docs/components/) and [DIY guides](/docs/diy/).
