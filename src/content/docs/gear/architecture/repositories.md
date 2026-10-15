---
title: Project sources
description:
  Find the maintained OpenSimGear hardware designs, firmware, desktop app and shared communication definitions.
sidebar:
  order: 7
---

OpenSimGear's hardware designs and software are maintained in separate repositories. Use these sources to find board
files, firmware instructions or the Cockpit app. For a user-level introduction, start with
[how it works](/gear/architecture/).

## Hardware and firmware

| Source                                                            | What you will find                                                                                                                                                                  |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Device template](https://github.com/opensimgear/device-template) | Generic module PCB, bill of materials, input wiring, firmware profiles and device simulations. This is the controller foundation for a peripheral, not a finished mechanical build. |
| [Device gateway](https://github.com/opensimgear/device-gateway)   | USB-to-CAN gateway PCB, power and connector guidance, gateway firmware and gateway simulations.                                                                                     |

Both current PCB designs are **0.1.0** and remain prototypes. Read their fabrication and validation notes before
ordering boards. Input controls, wiring and enclosures must be considered separately from the controller PCB.

## Desktop app

[Cockpit](https://github.com/opensimgear/cockpit) contains the desktop app, build and run instructions, and verification
records. It handles device configuration, controller visibility, live input display, actions and the implemented
A-10C DCS-BIOS panel integration.

Module mapping and calibration are stored on the module. Enabled controller lists are stored on the gateway. The saved
DCS-BIOS panel profile belongs to Cockpit. This matters when moving hardware or using another computer:
these settings are not all stored in the same place.

## Shared foundations

[Protocol](https://github.com/opensimgear/protocol) defines communication between modules, gateways and Cockpit.
[Firmware common](https://github.com/opensimgear/firmware-common) supplies shared input processing and USB support. You
normally do not need to read these repositories to configure a device.

Use matching module and gateway firmware. The current communication contract is version 3; its version is separate from
the PCB version and does not indicate a production release.

## Documentation and usage terms

The [website repository](https://github.com/opensimgear/opensimgear.github.io) maintains these GEAR pages, equipment
guides and calculators. Board-specific wiring and fabrication instructions stay with the hardware repositories so they
can be read alongside the corresponding design files.

Licensing is under review. First-party OpenSimGear code, hardware designs and documentation are currently **all rights
reserved**, with no general personal, noncommercial or commercial license grant. Public source access does not by
itself grant reuse, manufacturing or sales rights. Applicable law, GitHub platform rights, third-party licenses and
separate valid permissions remain applicable. Read [licensing and permissions](/policies/licensing/) and the relevant
repository's notices before reuse. External creative contributions are paused; see the
[contribution policy](/contributing/).

For the current validation limits, see [current status](/gear/architecture/decisions/).
