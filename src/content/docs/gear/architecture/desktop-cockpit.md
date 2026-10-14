---
title: Cockpit
description:
  Configure OpenSimGear devices, inspect live inputs, manage controllers and configure the A-10C DCS-BIOS panel
  integration.
sidebar:
  order: 6
---

Cockpit is the OpenSimGear desktop app. It shows connected gateways and devices, edits control mappings and calibration,
displays live inputs and provides device actions. It is still under development.

Normal USB controller input works with Cockpit closed. Configuration uses the app, and the DCS-BIOS integration runs
only while Cockpit is open and the integration is started.

## Finding your devices

Compatible gateways connect automatically and independently. **Gateways** shows each gateway and its devices;
**Devices** combines the inventories; **Topology** shows the computer and each gateway chain.

A failed or restarting gateway does not interrupt the others. Previously connected gateways retain their last-known
devices while offline. Topology shows gateway membership, not physical cable order.

## Configuring controls

Select a device and open its setup controls to edit its name, input mapping and axis calibration. Supported controls
include buttons, hats, encoders, selectors and analogue axes. Expansion inputs can also be configured.

1. Edit the settings and inspect the resulting inputs.
2. Use **Apply** to activate a valid draft.
3. Use **Apply & save** to keep the settings after the module restarts.

For the current STM32 modules, saved settings live on the device. The separate Pico simulation adapter keeps settings in
memory only until reset and uses a different, manual controller setup workflow.

If a change alters the USB control layout, follow the **Update profile** prompt and check your simulator bindings
afterward. See [USB controllers](/gear/architecture/usb-hid/) for disabling, enabling and moving devices.

## Device actions

The **Device actions** panel shows the actions offered by an online device. The current board offers a status LED with
**auto**, **on** and **off** modes. **auto** restores the firmware's normal status indication. Native software
simulations also provide RGB and on/off LED controls.

Use the displayed **Apply** or **Run** control to send an action, and **Refresh state** to read its result when
supported. If a response is lost, the outcome may be uncertain; check the state before sending it again.

Actions remain available with the gateway controller disabled or direct USB input active. LED overrides reset on device
reboot. Older firmware without action support can still provide inputs through its compatible adapter.

<span id="dcs-bios-master-caution"></span>

## DCS-BIOS panel integration

Cockpit provides one saved A-10C profile for buttons, maintained switches, encoders and calibrated axes, with LED and
display feedback. The master-caution button and LED remain available as a preset. Bindings can use several known
modules on different gateways; each device choice includes its gateway.

**Validation uses a synthetic DCS-BIOS peer and software panel simulations. Live DCS and assembled STM32 hardware
remain unverified.** Simulated displays demonstrate the software interface, not physical display support on the
current board.

To configure a profile:

1. Open **DCS-BIOS** in the sidebar, or use the link on a device or gateway card.
2. Enter the installed DCS-BIOS `doc/json` folder and use **Search catalogue**. Select commands and feedback by name
   from the catalogue installed with DCS.
3. Add an input and choose its device, physical control and catalogue command. The controls offered come from the
   device's advertised capabilities. Momentary buttons and maintained switches send explicit states; encoder turns
   send steps. Axes use device calibration and a change threshold in the command's units.
4. For each input device, use **Disable controller**, confirm the USB reconnect/binding warning and wait for the
   update to finish. Disconnect active direct USB input and finish any setup session. These input routes must be
   inactive to avoid duplicate simulator commands. Devices used only for output can keep their USB controllers.
5. Add LED or display feedback and choose an advertised device output. Displays show their size, encoding and byte
   limit. Choose text or numeric formatting, any prefix or suffix, and what to show when feedback is unknown or stale.
6. Adjust UDP settings if needed, then use **Save settings** and **Start DCS-BIOS**.

The defaults send commands to `127.0.0.1:7778` and listen on `0.0.0.0:5010`, using multicast group `239.255.50.10`
through `127.0.0.1`. Leaving the multicast group empty selects unicast feedback. The synthetic catalogue supplied for
software development is only for the local peer; use your installed catalogue with DCS.

A profile supports up to 16 inputs and 16 outputs on eight known modules across four gateways. Button and axis
numbering starts at **0**. Three-position selectors are not offered as maintained switch bindings in this integration.
Display text can be aligned, truncated at whole characters or rejected when it does not fit. The current board's status
LED supports on/off feedback; compatible simulated displays provide bounded text outputs.

Saving or restarting Cockpit does not start the integration. Stop it before editing. An unchanged saved master-caution
profile can still start; saving the two bindings shown in the editor explicitly upgrades it. Unsaved edits remain when
changing views. **Stop DCS-BIOS** is also available from Gateways when a target is offline, and does not re-enable its
USB controller.

The status view shows aircraft, freshness, input readiness, errors, desired and applied output values, and gateway
traffic measurements. Feedback continues through a background service while Cockpit is open, independently of the
view. Display updates use complete feedback frames and keep the newest pending value.

Missing or stale feedback requests the configured fallback text and LED off. An unreachable device cannot confirm that
change until it reconnects. After recovery, old presses and encoder turns are discarded; a held momentary button must release
before a new press is accepted. Maintained switches and available axes synchronize their current state after a fresh
baseline. A view showing fresh feedback can still show an input waiting for release. The running
profile controls its selected output actions.

## Exploring without assembled boards

Independent [gateway simulations](https://github.com/opensimgear/device-gateway/tree/main/simulation) and
[device simulations](https://github.com/opensimgear/device-template/tree/main/simulation) let Cockpit discover and
configure devices through the implemented firmware paths. They do not create operating-system USB controllers, and
Cockpit does not start or manage their processes.

Application build and run instructions are in the [Cockpit repository](https://github.com/opensimgear/cockpit). See
[current status](/gear/architecture/decisions/) for the limits of the available validation.

## Portable simulator integrations

Open **Integrations** for reusable logical device roles, explicit local assignments, validated import/export and catalogue migration diagnostics. DCS-BIOS can use other supported installed aircraft modules. The Assetto Corsa Rally starter binds RPM, gear, speed and derived rev-ratio telemetry to advertised outputs, including RGB/boolean rev lights and the current board LED. Output-only modules need no HID input profile. Device-enforced leases and temporary overrides govern ownership and recovery. See [the setup and telemetry guide](/gear/architecture/simulator-integrations/) for software validation and source limitations.
