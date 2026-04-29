# DCS-BIOS

project: DCS-BIOS

maintainer_or_org: DCS-Skunkworks / DCS-BIOS contributors

component_category: button-boxes-and-panels

subcategory: DCS cockpit data export and hardware interface

maturity_or_status: Active continuation of original DCS-BIOS. Latest GitHub release observed: DCS-BIOS v0.11.3 on
2026-03-22.

license: GPL-3.0; original DCS-BIOS was SimPL 2.0; bundled socat is GPL-2.0.

repo_url: https://github.com/DCS-Skunkworks/dcs-bios

docs_url: https://dcsbios.com/

source_urls:

- https://github.com/DCS-Skunkworks/dcs-bios
- https://dcsbios.com/
- https://github.com/DCS-Skunkworks/dcs-bios/wiki

key_features:

- `Export.lua` script for DCS: World that lets external hardware/software interact with clickable cockpits.
- Supports panel-builder and software-developer workflows.
- Arduino users can use included release source files and examples.
- Beginner-friendly guide path aims to let panel builders avoid writing code.
- Supports many official DCS modules and several community mods.

hardware_or_bom:

- Depends on panel: Arduino board, switches, encoders, displays, LEDs, serial wiring, and optional RS-485/bridge
  tooling.

firmware_or_software_stack:

- Lua export script, DCS-BIOS data stream, Arduino library/examples, DCSBIOSBridge or socat serial connection, Python
  logging/replay tools.

build_requirements:

- DCS Saved Games `Scripts` installation, Arduino flashing, cockpit control reference lookup, serial port setup.

compatibility:

- DCS: World clickable cockpit modules including A-10C, AH-64D, F/A-18C, F-16C, F-14, Ka-50, UH-1H, Mi-24P, and many
  more listed in README.

strengths:

- De facto open interface for DCS physical cockpits.
- Active maintained fork/continuation.
- Critical dependency for many DCS panels and OpenHornet-style builds.

limitations:

- DCS-specific.
- Requires module support and can break with simulator/export changes.
- Not a physical panel design by itself.

commercial_analogs:

- Thrustmaster Viper Panel
- Virpil Universal Control Panels
- Logitech/Saitek panels when used for cockpit I/O

fit_notes:

- Include as infrastructure: many open panels rely on it even when they are their own hardware projects.

last_checked: 2026-04-29
