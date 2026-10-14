---
title: Simulator integrations
description: Configure portable panel profiles, output ownership and DCS-BIOS or Assetto Corsa Rally telemetry in Cockpit.
guideSummary: Import a portable profile, assign logical device roles, validate named controls and start a simulator integration explicitly.
sidebar:
  order: 7
---

Cockpit's **Integrations** view connects panel controls and feedback to a simulator provider. DCS-BIOS provides named
commands and outputs from your installed aircraft catalogue. The Assetto Corsa Rally starter provides telemetry
outputs, including numeric channels for configurable rev lights. Firmware receives advertised device actions rather
than game-specific commands.

**Software simulations exercise the production parsers and device contracts. Live DCS, live Rally versions and
assembled hardware remain unverified. Hardware qualification is deferred.** The current board provides its status LED;
RGB LEDs and displays are demonstrated by software fixtures unless a device advertises an implemented endpoint.

## Set up a profile

1. Open **Integrations** and select a provider. For DCS-BIOS, enter the installed `doc/json` directory, aircraft module
   name and local UDP settings. For Rally, choose the Windows shared-memory source and game process ID, or choose
   **Authored synthetic telemetry** for software exploration.
2. Load the provider catalogue. Choose commands and channels by name; addresses and binary source offsets are resolved
   by the provider. A Rally profile offers output bindings only.
3. Add logical device roles such as `radio` or `rev-lights`, then assign each role to an exact gateway and module.
   Refresh device capabilities. Identical module identities on two gateways remain separate choices.
4. Add inputs and outputs. Physical input choices come from device capabilities. For feedback, select a compatible
   advertised endpoint/action and review its format, fallback and display limits.
5. Disable gateway HID and disconnect direct USB input for every input role. Use the existing controller controls in
   [Cockpit](/gear/architecture/desktop-cockpit/) and wait for the layout update. A device used only for feedback can
   keep its unrelated controller input.
6. Use **Validate draft**, review any diagnostics, then **Save validated profile**. Validate the saved settings and
   **Start integration** explicitly. Saving or restarting Cockpit does not start it.

Stop before changing provider settings, bindings or assignments. One integration runs at a time, including the existing
DCS-BIOS editor. Runtime work continues in the native background service while the app is open, independently of the
visible view. USB controller input outside an integration continues to work with Cockpit closed.

Existing master-caution and panel profiles remain available in the DCS-BIOS view without an automatic rewrite. New
portable profiles add device-enforced output ownership and temporary override. The legacy editor's local output guard
does not provide the same competing-client lease protection.

## Import, export and rebinding

A portable document contains a schema version, profile identifier, provider/context, logical roles and named bindings.
Input bindings reference a role, physical control and catalogue command/interface. Output bindings reference a role,
telemetry channel and stable endpoint/action identity. DCS feedback retains the original catalogue output ordinal.

Use **Import JSON file**, or paste a document and choose **Preview import**. Import does not save, start, acquire an
output or assign devices. Local connection settings are separate from the document, and imported roles begin
unassigned. Review each exact target before validating. A similarly named device is never silently substituted.

**Prepare portable export** provides the document as JSON for copying or downloading. Local paths, network settings
and gateway/module assignments stay in Cockpit. Unsupported fields and malformed or oversized documents are rejected.
Export several documents to keep different simulator or aircraft profiles; load and start one explicitly.

Validation reports missing controls, changed supported interfaces, incompatible ranges or output types, changed source
ordinals, unsuitable device capabilities and ownership conflicts. Changing a draft or validation revision requires a
fresh validation. Start checks the current catalogue and routes again. An installed catalogue can change binary
addresses while retaining compatible named controls; incompatible bindings require reviewed edits rather than an
automatic guessed migration.

Physical input references currently use logical indexes or encoder ordinals. Check the advertised mapping when moving
a role to a different panel. A portable role name does not establish that two physical layouts are interchangeable.

## Outputs and temporary override

Start validates the assigned devices and acquires output claims before forwarding input commands. The device enforces
ownership for the physical endpoint across its transports, including actions that share that endpoint. Configuration
sessions and USB/HID input ownership remain separate. Another live owner cannot be displaced by an ordinary manual
action.

Output leases last at most **5000 ms** and renew every **1000 ms**. They are volatile and do not write flash. Each claim
carries a descriptor-validated fallback. Device timers apply it if the owning host disappears. Reboot, route changes or
failed renewal make ownership unavailable until the integration validates and reacquires it safely.

An owned output offers **Override temporarily**, using the same advertised parameter types and limits as manual device
actions. Choose a duration from **1 to 30000 ms**. The integration retains its claim while continuing to track telemetry.
**Resume telemetry now** or expiry applies the latest fresh value. Unknown or stale feedback cancels an override and
applies the configured fallback.

Stop discards pending fresh writes, releases only momentary presses actually forwarded by that run, applies fallbacks
and releases claims. Lost replies leave the outcome uncertain; readable state is reconciled before another setter. An
unreachable device cannot confirm a fallback until readback succeeds or its lease-expiry behavior completes.

Each gateway has its own I/O worker. Absolute output updates keep the newest pending value, while ordered input events
retain their sequence. Recovery takes a current event baseline and discards historical presses or turns. A held
momentary input must release before a new press is accepted. Fresh feedback alone does not mean input forwarding has
finished its baseline.

## Displays, rev lights and output-only devices

Formats include Boolean/on-off enum feedback, text, rounded integers, fixed decimal text, numeric thresholds and up to
eight increasing RGB bands. A numeric threshold drives an advertised Boolean or on/off enum LED. RGB bands select
colors for an advertised RGB setter. These are configured Cockpit rules over telemetry rather than native game LED
commands.

Displays use their advertised byte limit, cell count and ASCII/UTF-8 encoding. Alignment fills the advertised surface;
truncation preserves whole characters, or overflow can be rejected. Unknown/stale display text is separately configured.
Default LED fallbacks are off or black, and default display fallback is blank. Native desired and applied values show
whether an output has been confirmed.

A valid output-only device can advertise zero buttons, axes and hats. It joins inventory and exposes configuration and
actions without publishing an empty HID controller. Direct device USB exposes CDC, and Cockpit offers no controller
Enable/Disable flow for that device. It can be assigned to an output role through the normal gateway routes.

Profiles support **eight roles/device targets across four gateways**, **16 inputs**, **16 outputs** and a **64 KiB**
document/request limit. Device action command and reply limits remain unchanged. Display strings fit at most 63 UTF-8
bytes and 63 advertised cells, with smaller endpoints enforcing their own limits.

## Assetto Corsa Rally source and simulation

The starter reads the selected Windows game process's existing `acpmf_physics`, `acpmf_graphics` and `acpmf_static`
shared-memory mappings. It checks process lifetime/source epoch, bounded page copies, operational status and an
advancing original physics packet ID. Initial attachment, process/context changes and counter resets establish a new
baseline. Repeated frozen snapshots do not refresh telemetry. Pause, replay, off, invalid pages and stale data fall back.

Normalized named channels are `rpm`, `gear`, `speed_kmh`, optional `max_rpm` and derived `rev_ratio`. Gear uses reverse
`-1`, neutral `0` and forward `1+`. A valid positive maximum RPM is required for the ratio; an observed peak is not
treated as a redline. The rev-light preset uses configurable green/yellow/red ratio bands or a Boolean threshold. When
maximum RPM is unavailable, ratio feedback is unknown; an explicit `rpm` binding can use a chosen absolute threshold.

The layout and conversion are developer-derived from an
[ACR-specific reader](https://github.com/LuizZak/AssettoCorsaRallyTelemetryReader/tree/8bb26990def38ffd0e4afe71e04e85e5ddeb3670)
and an [independent graphics/status parser](https://github.com/decnet100/acr_telemetry/tree/eaef0f29c6712a2e0dbc3bfd8246b84dcdbb9586).
They are not an officially guaranteed binary interface. Shared-memory mapping names are reused by other Assetto games;
they alone do not identify the producer. Live game/version qualification remains pending.

On every platform, the synthetic source supplies authored byte pages through the same decoder and output runtime.
Controls let you change RPM, gear, speed, maximum RPM, source epoch, session status and physics progression. Freeze the
physics packet to observe freshness fallback. Synthetic frames are OpenSimGear test input, not a native Rally UDP
protocol. Native shared-memory acquisition requires Windows.

See the [Cockpit simulator integration guide](https://github.com/opensimgear/cockpit/blob/main/docs/simulator-integrations.md)
for source details and runtime behavior, [communication](/gear/architecture/communication/) for device contracts, and
[current status](/gear/architecture/decisions/) for validation limits.
