---
title: USB HID
description: Current USB inputs, automatic enrollment and controller visibility.
sidebar:
  order: 4
---

## Standalone inputs

Module firmware acquires calibrated inputs and exposes USB HID alongside CDC configuration. The same runtime input model supplies CAN reports. Standalone USB input does not require an active gateway or Cockpit.

The sequential-shifter profile has three held, debounced buttons: up, down and explicit neutral. Rest/stale input releases all commands. Held contacts rearm only after release following startup, reconnect or handoff; conflicts suppress every command until all contacts release. Rotary encoders instead queue distinct direction-button presses and releases with bounded overflow diagnostics.

## Automatic enrollment architecture

The STM32 gateway implements an ordered controller list with [CDC v3](https://github.com/opensimgear/protocol/blob/main/serial/stm32-gateway-v3.md). One gateway USB device has one joystick top-level collection per enabled module. All collections share its VID/PID and serial; modules behind it have no independent USB product identity. Multiple gateways enumerate independently.

The implementation bounds runtime modules, remembered identities and enabled controllers at 32. Each profile supports 128 buttons, four hats and eight 16-bit axes. These are software resource bounds; host/game and physical chain acceptance have not been established at those maxima.

The gateway automatically enables each first-seen compatible CAN identity and appends its advertised HID collection to a persistent ordered controller list. Existing collections keep their relative order, report IDs and control definitions. There is no user slot assignment, Add controller or manual Apply layout onboarding. Enrollment and USB activation work with Cockpit closed.

USB exposes the enabled controller list, with no permanent management collection or unused joystick placeholders. With no enabled controllers, the gateway uses CDC-only USB enumeration. Keep the gateway VID/PID, serial and interface numbering stable wherever the USB configuration permits. Snapshots publish resource bounds and identity-specific admission failures when capacity is exhausted.

Presence and enabled state are independent:

| Device state | Cockpit | Windows HID visibility |
| --- | --- | --- |
| First discovery | Automatically enabled; appended at the end | New controller after automatic USB reconnect |
| Enabled and connected | Online, with live input | Present controller |
| Enabled and temporarily disconnected | Ghosted/offline, with cached identity and controls | Retained controller sending neutral inputs |
| Explicitly disabled, connected or disconnected | Remembered and marked disabled | No collection for this device |
| Manually removed while offline | Remembered entry deleted | Collection removed, if still enabled |

A returning enabled identity resumes its retained collection without USB reconnection when its profile is unchanged. Direct USB ownership continues to neutralize gateway input. A new replacement identity appends independently and uses its own settings/calibration; it does not take over another device's collection.

Disable removes the collection but preserves remembered identity and the explicit disabled state, leaving device settings intact. Repeated announcements and gateway restarts retain it. A disabled device can still be configured over CAN while connected. Explicit Enable appends its collection at the end of the currently enabled list, preserving the order of controllers already exposed; the returning controller may need rebinding. Remove forgets an offline identity, so a later discovery enrolls it as new. Neither disappearance nor gateway startup automatically removes a retained controller.

Before an action removes a published collection, Cockpit warns: “This reconnects the gateway and may require rebinding remaining controllers in your games.” Removing a disabled offline record needs no descriptor change. Survivors keep their relative order and report IDs, although their Windows collection numbers can change.

The gateway batches closely spaced arrivals into a bounded save/reconnect transaction, validates and persists the exact layout before USB detaches, and activates that saved generation. Repeated unchanged announcements do not write flash or reconnect USB. Persistence/resource failure preserves the previous active descriptor and reports the failure. Changes to an existing identity's HID controls are a separate explicit profile-update operation, with binding-change notification.

Publishing a visibility change renews the affected device's CAN lease. Its next assignment rearms acquisition and discards encoder turns made while disabled; configuration resumes after fresh traffic confirms the new route.

Appending preserves existing descriptor order, but Windows' HID hardware-ID format differs between single- and multiple-collection interfaces. With no permanent collection, one-to-two and two-to-one controller transitions need qualification alongside append, disable, removal, re-enable and reboot. Stable report IDs alone do not guarantee saved game bindings. See [Microsoft's collection identity rules](https://learn.microsoft.com/en-us/windows-hardware/drivers/hid/hidclass-hardware-ids-for-top-level-collections) and [gateway #6](https://github.com/opensimgear/device-gateway/issues/6).

## Input ownership

An active direct USB host session takes input priority and leaves the gateway controller neutral. Power-only VBUS does not establish ownership. After direct USB ownership ends, gateway input resumes only from fresh valid state. Old encoder turns cannot replay. Software checks cover ownership transitions; assembled handoff and suspend/resume timing are unmeasured.

The simulated DCS-BIOS master-caution binding uses the independent ordered panel
event stream instead of a HID button binding. Start requires the bound panel's
gateway controller disabled and unpublished, with no active direct USB input.
Cockpit presents the existing Disable confirmation and waits for layout
completion; it does not silently change controller visibility. This prevents
duplicate simulator commands. Actions and event reads continue on the online CAN
route with HID disabled. Stopping the integration does not re-enable HID. See
[the setup flow](/gear/architecture/desktop-cockpit/#dcs-bios-master-caution).

## USB identifiers and evidence

No public OpenSimGear VID/PID allocation is claimed. Build with identifiers you are authorized to use; `0xFFFF/0xFFFF` is a compile-only placeholder. Current firmware/CAD and native simulations have validation records, and the Pico simulator has physical macOS acceptance evidence. No STM32 USB/CAN chain or Windows/Linux physical acceptance is recorded.

See the [gateway implementation](https://github.com/opensimgear/device-gateway), [module implementation](https://github.com/opensimgear/device-template) and [GitHub project](https://github.com/orgs/opensimgear/projects/2).
