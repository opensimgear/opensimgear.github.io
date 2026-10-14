---
title: USB controllers
description: How OpenSimGear controllers appear over USB, and what connecting, disabling or moving a device changes.
sidebar:
  order: 4
---

OpenSimGear firmware presents inputs through **USB HID**, the standard interface used by game controllers. A
direct-connected module provides its own controller. A gateway provides a controller for each enabled module on its
chain, through one USB connection.

Assign those controls in your simulator. Cockpit configures the devices, but ordinary HID input does not require the app
to stay open.

## Automatic controller setup

The current STM32 gateway automatically enables a newly discovered compatible module and adds it to the end of its saved
controller list. You do not need Cockpit to perform this setup. Adding a controller can cause a USB reconnect while the
computer reads the updated list.

The gateway remembers devices and their enabled state across restarts. With no enabled devices, it exposes only its
configuration connection and no empty game controllers.

| Device state             | What you see                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| New compatible device    | Automatically added as an enabled controller.                                             |
| Enabled and connected    | A controller with live inputs.                                                            |
| Enabled but disconnected | An offline entry in Cockpit; its controller remains present with neutral inputs.          |
| Disabled                 | A remembered device with no gateway controller; an online device can still be configured. |
| Removed while offline    | The gateway forgets the device. Reconnecting it treats it as new.                         |

These behaviors are implemented in firmware and software simulations. Their effect on physical STM32 USB controllers and
saved Windows/game bindings has not been validated.

## Disable, enable and remove

Use **Disable** to hide a device's gateway controller without erasing its settings. It stays disabled after reconnection
or gateway restart. **Enable** adds it to the end of the enabled list again.

Use **Remove** to forget an offline device. Temporary disconnection alone does not remove it.

Removing a published controller causes a USB reconnect and can require rebinding other controllers in your simulator.
Cockpit shows a warning before such changes. A game may also need restarting after its controller list changes; binding
retention is not guaranteed.

## Direct USB takes priority

When a module has an active direct USB input connection, its gateway controller remains present but sends neutral
inputs. When direct USB input ends, fresh CAN inputs restore the gateway route. A USB connection that only supplies
power does not take input ownership.

## Changing controls

Calibration and name changes that keep the same control layout do not require a new layout. If a device's configured
buttons, hats or axes change its USB control profile, its enabled gateway controller stays neutral until you explicitly
use **Update profile**.

That update can reconnect USB and change simulator bindings. Check your assignments after changing the layout.

## Moving a module

Mapping and calibration are stored on the module and move with it. Gateway controller lists are stored on each gateway.
The old gateway keeps the module's enabled offline entry until you disable or remove it; the new gateway automatically
adds an unknown device.

If the destination already remembers the device as disabled, it remains disabled. Moving between gateways changes the
USB connection identity, so game bindings may need updating.

## Capacity and compatibility

The software supports up to 32 remembered devices and enabled controllers per gateway. A device profile can contain up
to 128 buttons, four hats and eight axes. These are software limits, not tested physical chain ratings or guarantees
that every simulator accepts that many controls.

No public OpenSimGear USB vendor/product identifier allocation is established. Firmware builders must use identifiers
they are authorized to use; compile-only placeholders are not deployment identifiers.

See [hardware requirements](/gear/architecture/hardware/) and [current validation status](/gear/architecture/decisions/)
before planning a physical setup.
