# MobiFlight Panels

project: MobiFlight Panels

maintainer_or_org: MobiFlight

component_category: button-boxes-and-panels

subcategory: open-hardware flight simulator panel designs

maturity_or_status: Active work-in-progress repository with community contributions.

license: GPL-3.0

repo_url: https://github.com/MobiFlight/mobiflight-panels

docs_url: https://github.com/MobiFlight/mobiflight-panels

source_urls:

- https://github.com/MobiFlight/mobiflight-panels
- https://github.com/MobiFlight/mobiflight-templates
- https://www.mobiflight.com

key_features:

- Open-hardware panel designs for flight simulation.
- Intended for Arduino hardware and MobiFlight open-source software.
- Uses SVG design assets and PCB JSON files.
- Panel design philosophy: realistic-looking function and labeling, not necessarily exact 1:1 replica dimensions.
- Uses a Dzus-style mounting width where practical.

hardware_or_bom:

- Acrylic panels, PCB behind panel with 10 mm nylon spacers, Arduino-compatible electronics, switches/buttons/LEDs.
- SVG files for Inkscape/K40 Whisperer CO2 laser workflow.
- PCB JSON files for EasyEDA.

firmware_or_software_stack:

- MobiFlight Connector and MobiFlight firmware.

build_requirements:

- Laser cutter/engraver, acrylic sheet, EasyEDA or PCB workflow, soldering, Arduino hardware, MobiFlight configuration.

compatibility:

- Microsoft Flight Simulator 2020 and other flight simulator software through MobiFlight.

strengths:

- Concrete open panel design files, not just software.
- Pairs directly with active MobiFlight ecosystem.
- Good template system for growing an open panel library.

limitations:

- README warns designs may be early, incomplete, or not fully functional.
- Requires fabrication tools beyond simple 3D printing.
- Not always 1:1 dimensionally accurate.

commercial_analogs:

- Logitech Flight Switch Panel
- Logitech Flight Radio Panel
- Logitech Flight Multi Panel
- Thrustmaster MFD Cougar Pack

fit_notes:

- Strong open-hardware counterpart to commercial panel products.

last_checked: 2026-04-29
