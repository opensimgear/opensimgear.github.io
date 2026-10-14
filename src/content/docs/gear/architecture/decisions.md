---
title: Current status
description:
  What OpenSimGear implements today, what software checks demonstrate and what has not been physically validated.
sidebar:
  order: 5
---

OpenSimGear is a work in progress. Device and gateway firmware, prototype PCB designs and the Cockpit app are
implemented, but the STM32 boards have not been assembled and physically validated. There is no production release.

## Implemented capabilities

| Area                  | Available implementation                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Device inputs         | Buttons, axes, hats, encoders and selectors, with configurable mapping and calibration.                                            |
| Connections           | Direct USB controller input or CAN modules through a USB gateway.                                                                  |
| Controller management | Automatic discovery and enrollment, remembered controllers, neutral inputs while offline, and explicit Disable, Enable and Remove. |
| Settings              | Validated changes and saved module configuration that survives restart.                                                            |
| Cockpit               | Multiple gateways, device setup, live inputs and manual device actions.                                                            |
| Feedback              | Current-board status LED actions; LED and bounded text display endpoints in software simulation.                                                      |
| Simulator integration | One configurable A-10C profile with typed inputs and LED/display feedback, using simulated DCS-BIOS.                                       |
| Hardware files        | Device and gateway PCB 0.1.0 sources, bills of materials and fabrication exports.                                                  |

## What the checks establish

Native software tests exercise discovery, input delivery, settings persistence, controller changes and actions. The
DCS-BIOS checks use a synthetic peer and simulated panels. These checks support the software behavior described here; they do
not measure a physical board, LED or cable chain.

Circuit, PCB layout and schematic-to-board consistency checks have passed. Those checks help review the design files,
but they do not establish electrical performance or manufacturing approval.

A separate Pico gateway simulation has physical macOS acceptance evidence. That evidence does not validate the STM32
boards or establish physical Windows/Linux compatibility.

## Before choosing a physical setup

The following have no established acceptance evidence for the STM32 system:

- Assembled USB/CAN operation, physical inputs and LED behavior.
- Cable length, device-count ratings, power transitions and hot plugging.
- Windows/Linux physical operation and saved simulator bindings after controller-list changes.
- Panel controls and feedback with live DCS, including physical displays.

The gateway's 32-device software capacity is not a qualified chain size. No tested maximum cable length is published.
Follow the [prototype power and wiring guidance](/gear/architecture/hardware/) rather than inferring an electrical
rating from software limits.

## Check the evidence

- [Device board validation](https://github.com/opensimgear/device-template/blob/main/electronics/boards/starter/0.1.0/VALIDATION.md)
- [Gateway board validation](https://github.com/opensimgear/device-gateway/blob/main/electronics/boards/gateway/0.1.0/VALIDATION.md)
- [Cockpit verification records](https://github.com/opensimgear/cockpit/tree/main/docs/verification)

Verification records describe the revisions tested at the time. Use the
[project sources](/gear/architecture/repositories/) to check the current implementation when selecting firmware or
preparing a build.
