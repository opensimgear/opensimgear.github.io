---
title: Desktop cockpit
description: Unified multi-gateway device management, configuration, maintenance, and cross-platform validation.
sidebar:
  order: 6
---

The desktop cockpit must support Windows, Linux, and macOS for module configuration, registration, calibration, diagnostics, and firmware updates. Tauri 2 with TypeScript/Svelte and Rust is selected for the prototype; the application is not yet implemented. Standard HID inputs remain independent of the cockpit. SimHub is still the initial Windows output integration, not a cross-platform dependency for configuration; see its [system requirements](https://www.simhubdash.com/download-2/).

## Selected prototype stack

The selected prototype stack is **Tauri 2, a TypeScript/Svelte interface, and a Rust native backend**. Hardware-access validation is required before a production freeze. Tauri separates a web interface from native application logic and uses operating-system webviews rather than bundling its own browser. See the [Tauri introduction](https://v2.tauri.app/start/) and [platform prerequisites](https://v2.tauri.app/start/prerequisites/).

The rationale for this choice is the separation between a shared interface and explicit native device access. Rust commands should own serial enumeration, framing, connection state, and update transitions. Do not depend on Web Serial being available in every system webview. Use a static frontend, such as Svelte with Vite, without an SSR server. The UI receives typed state and invokes bounded operations rather than managing serial handles.

| Option | Proposed hardware path | Tradeoff for this project |
| --- | --- | --- |
| Tauri 2 + TypeScript/Svelte + Rust | Native Rust serial service exposed through application commands | Selected for separation of UI and hardware; requires Rust expertise and testing across different system webviews. |
| Electron + web UI + Node | Native hardware libraries in the main process, with a constrained UI bridge | One web technology stack with [bundled Chromium and Node.js](https://www.electronjs.org/docs/latest/tutorial/introduction), but a larger distribution and native-module packaging to maintain. Electron also documents browser-style [device permission handling](https://www.electronjs.org/docs/latest/tutorial/devices). |
| Flutter + Dart | Native plugins or FFI behind a shared Dart interface | Shared rendered UI; serial and update support still needs qualified plugins or native bindings on each platform. See [Flutter desktop support](https://docs.flutter.dev/platform-integration/desktop). |

These are implementation comparisons, not measured size, performance, or reliability claims. The alternatives document the selection rationale; a working hardware spike must still validate the chosen stack.

## Native device access

[serialport-rs](https://github.com/serialport/serialport-rs) is a candidate Rust serial dependency with Windows, macOS, and Linux port enumeration. Enumeration details need care: Linux USB metadata can depend on libudev, and macOS may expose both callout and dial-in paths for the same device. Identify modules through the application protocol's stable identity, not a saved COM number or device path.

The repository currently seeks additional maintainers, particularly for Windows. Review maintenance activity, outstanding platform issues, releases, and fallback options before committing to it. Library support claims do not replace tests on the intended devices and operating systems.

Initial cockpit state and diagnostics should travel over CDC serial so the app does not contend with games for the HID interface. [hidapi-rs](https://github.com/ruabmbua/hidapi-rs) is an optional diagnostic candidate, not a required replacement driver or the primary configuration transport.

## Session and protocol boundaries

Keep UI state, the shared application protocol, and platform device handling separate. Configuration includes explicit registration, replacement assignment, and notified descriptor changes; it must respect the [registered controller layout](/gear/architecture/usb-hid/). USB configuration and CAN share a versioned, bounded capability model, with transport-specific framing allowed. Incompatible versions produce a diagnostic; backward-compatible additions follow explicit compatibility rules. Exact framing, bounds, acknowledgements, and recovery messages remain implementation work.

The cockpit can configure modules connected directly by USB or through CAN behind any connected gateway. Resolve actions through the current route to the intended stable module identity and confirm the module’s committed result. Firmware updates remain direct-USB-only to the device being updated in v1.

Version 1 works with connected devices only. Offline backup, restore, and export are deferred. Use explicit Apply/Save actions and clearly distinguish draft edits from committed configuration. Do not assume every edit has a live runtime preview. Protected writes must retain the last valid configuration when interrupted; descriptor-changing commits retain their notice and deliberate USB re-enumeration step.

Replacement setup preserves compatible non-calibration settings and the compatible controller slot, but requires fresh calibration where applicable rather than copying old calibration. Axis settings expose the documented type default and an explicit override persisted on the module; synchronize the effective failure policy to the gateway so disconnected modules remain covered. Show unavailable-input diagnostics separately from the HID numeric fallback.

Each module allows one configuration writer across direct USB and gateway/CAN access. Show a busy error for a competing writer rather than taking over. Session release, disconnect cleanup, and expiry handling remain implementation work; configuration ownership is separate from output command ownership.

The cockpit owns a serial port only during an explicit configuration or test session and releases it for SimHub. Explain busy-port failures and provide a clear disconnect action. A future broker could coordinate clients, but a permanently running shared-port service is not part of the initial design. Configuration access alone must not claim telemetry output ownership; an output test needs the explicit command session described under [communication](/gear/architecture/communication/).

Firmware updating is an explicit manual action, never automatic flashing. Verify the model and hardware compatibility before writing firmware and test recovery after interruption. Updating may restart the device and expose a different bootloader port. Preserve the intended target identity through that transition and report failure clearly. Direct-USB updates and SWD recovery are agreed; exact bootloader tooling remains to be selected.

## Unified inventory and gateway routing

The cockpit presents one device list across all connected gateways and standalone USB modules. Selecting a device selects its stable module identity; the native service resolves the current transport. Show a readable gateway label backed by its stable unique identity on each networked module, plus registration, connection, ownership, and health status. Gateway labels are display metadata, never routing keys. Allow filtering or grouping by gateway without making users switch to a separate inventory for each gateway.

Each gateway has its own USB connection and single CAN chain. Enumerate USB candidates without holding every serial port open. During an explicit setup/test session, open the relevant gateway ports, read stable gateway identities and inventory snapshots, and reconcile updates. Release acquired ports when that session ends. Outside a session, retain last-known attachment as cached or unknown, never as proof that a module is still reachable. A port held by SimHub appears busy; avoid inventing a live inventory for an endpoint whose protocol cannot be queried.

The native service should maintain these semantic records; exact types and wire representation belong to the versioned protocol implementation:

| Record | Required state |
| --- | --- |
| Gateway | Stable gateway identity, display label, current USB endpoint/session, protocol/firmware versions, inventory revision, connection/busy state, and chain health. |
| Module | Stable module identity, model/capabilities, compatibility, current and last-known gateway identities, direct USB availability, registration/slot per gateway, and input/output ownership and freshness. |
| Route | Module identity, transport, gateway identity for CAN access, current chain-local node ID, and connection/session generation needed to reject stale work. |

Node IDs may overlap between gateways. Neither a node ID, USB device path, COM number, nor a display label uniquely identifies a device. Both CAN sockets on a gateway share one bus, so the protocol cannot infer a physical socket or cable order. Show gateway attachment rather than claiming socket location.

Merge direct USB and gateway sightings of the same module into one logical device. Track physical gateway attachment independently of the chosen configuration route and the active HID/output owners. Prefer a compatible reachable direct USB configuration route, otherwise use the current gateway; if the preferred route is busy, report that state and use an available alternative only after a successful writer claim. Access through two transports still permits only one writer. Discovery/configuration must not claim an output session implicitly.

Every operation binds the selected module identity to a current endpoint/session. Verify identity and compatibility before addressing it, validate response identity, and ignore responses from expired sessions or superseded inventory revisions. Gateway disconnect/restart invalidates only its routes and pending work; other gateways stay usable. Refresh discovery after reconnect even when the USB path or node ID is unchanged. A failed or changed route ends its writer session and leaves drafts uncommitted; reacquire ownership and require explicit Apply/Save before sending edits. Never replay a pending write automatically on a newly discovered route.

When a module moves to another gateway, update the gateway badge on the same logical device and keep settings/calibration with the module. Retain the old gateway's absent HID slot until explicit removal, and require explicit destination registration unless a compatible slot for that identity already exists there. Notify users before descriptor changes and re-enumerate only affected gateways. Do not promise that simulator bindings or SimHub output profiles follow the device; gateway USB identity and output endpoint change. If the same module identity is reported by two independent gateway chains, show an identity conflict and block automatic routed writes until resolved. Remember the last-known gateway for an unavailable module without displaying it as currently connected.

## Cross-platform validation gate

Build and test the selected stack on all three operating systems before a production freeze. The spike must cover device enumeration, stable identity despite port changes, claim/release, unplug/reconnect, simultaneous direct USB and gateway connections, busy-port conflicts with SimHub on Windows, and application-to-bootloader transitions. Add at least two gateways with overlapping chain-local node IDs and distinct gateway identities. Verify unified inventory, correct targeted writes, deduplication of direct USB/CAN sightings, gateway migration, conflict handling, route invalidation during writes, and isolation of disconnect/re-enumeration effects. Establish a supported gateway count and aggregate module capacity from measurement. Verify that configuration leaves HID input usable except during operations that deliberately restart or re-enumerate the affected device.

The distribution plan must address per-platform builds, Windows signing, macOS signing/notarization, and Linux device permissions and webview dependencies. Document supported operating-system versions and installation requirements after testing. Successful development on one platform is not evidence that the other two are ready.
