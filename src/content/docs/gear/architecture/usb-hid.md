---
title: USB HID
description: Current standalone USB inputs and registered gateway controller behavior.
sidebar:
  order: 4
---

## Standalone inputs

Module firmware acquires calibrated inputs and exposes USB HID alongside CDC configuration. The same runtime input model supplies CAN reports. Standalone USB input does not require an active gateway or Cockpit.

The sequential-shifter profile has three held, debounced buttons: up, down and explicit neutral. Rest/stale input releases all commands. Held contacts rearm only after release following startup, reconnect or handoff; conflicts suppress every command until all contacts release. Rotary encoders instead queue distinct direction-button presses and releases with bounded overflow diagnostics.

## Registered gateway controllers

One gateway USB device has a joystick top-level collection and stable report ID for each registered module. It is a CAN-to-HID device rather than a USB hub. The implemented capacity is ten retained slots, each with up to 128 buttons, four hats and eight 16-bit axes. Host/game acceptance of those maxima has not been physically established.

Discovery does not automatically add a host controller. Register/unregister edits the pending registry. Explicit Apply layout persists it, rebuilds the descriptor and reconnects USB. Temporary CAN absence retains a registered slot with released buttons and configured axis neutral values. Descriptor/profile mismatches retain neutral inputs until a compatible active layout is applied.

Stable identities preserve compatible assignments through node-ID changes. All collections share the gateway's VID/PID and USB serial identity; a module behind the gateway has no independent USB product identity. Game bindings can differ between standalone and gateway modes or change with descriptors. Multiple gateways enumerate independently and do not merge OS HID devices.

## Input ownership

An active direct USB host session takes input priority and leaves the gateway slot neutral. Power-only VBUS does not establish ownership. After direct USB ownership ends, gateway input resumes only from fresh valid state. Old encoder turns cannot replay. Software checks cover ownership transitions; assembled handoff and suspend/resume timing are unmeasured.

## USB identifiers and evidence

No public OpenSimGear VID/PID allocation is claimed. Build with identifiers you are authorized to use; `0xFFFF/0xFFFF` is a compile-only placeholder. Current firmware/CAD and native simulations have validation records, and the Pico simulator has physical macOS acceptance evidence. No STM32 USB/CAN chain or Windows/Linux physical acceptance is recorded.

See the [gateway implementation](https://github.com/opensimgear/device-gateway), [module implementation](https://github.com/opensimgear/device-template) and [GitHub project](https://github.com/orgs/opensimgear/projects/2).
