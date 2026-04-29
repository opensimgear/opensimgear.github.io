# MobiFlight Connector

project: MobiFlight Connector

maintainer_or_org: MobiFlight

component_category: button-boxes-and-panels

subcategory: open-source home cockpit connector and Arduino firmware ecosystem

maturity_or_status: Active project. Latest GitHub release observed: 11.0.1 bugfix release on 2026-03-27.

license: MIT

repo_url: https://github.com/MobiFlight/MobiFlight-Connector

docs_url: https://docs.mobiflight.com/

source_urls:

- https://github.com/MobiFlight/MobiFlight-Connector
- https://mobiflight.com
- https://docs.mobiflight.com/
- https://github.com/MobiFlight/MobiFlight-Connector/wiki

key_features:

- Open-source project for building home cockpit inputs and outputs.
- Connects buttons, switches, lights, displays, and other cockpit hardware through Arduino-style modules.
- Includes PC application, firmware source, support files, and tests.
- Repository topics include MSFS 2020, FSX, Prepar3D, X-Plane, Arduino, and home cockpit.
- Designed to avoid dependence on closed proprietary panel drivers.

hardware_or_bom:

- Arduino modules, switches, buttons, encoders, LEDs, displays, and wiring.
- Exact BOM depends on each panel/control.

firmware_or_software_stack:

- MobiFlight Connector PC application, MobiFlight firmware, CommandMessenger, C# solution, tests.

build_requirements:

- Windows development environment for source builds, or release install for users.
- Arduino-compatible boards and wiring for hardware.

compatibility:

- Microsoft Flight Simulator 2020, FSX, Prepar3D, X-Plane, and other sims via MobiFlight support paths.

strengths:

- Mature open ecosystem for panels and home cockpit controls.
- Active releases and documentation.
- Works with generic hardware rather than proprietary panels only.

limitations:

- More panel/I/O oriented than primary axes.
- Windows-centric build/application path.
- Sim-specific variables/events still require configuration.

commercial_analogs:

- Logitech Flight Switch Panel
- Logitech Flight Radio Panel
- Logitech Flight Multi Panel
- Virpil Universal Control Panel 1/2/3

fit_notes:

- Core open-source reference for button boxes and panels.

last_checked: 2026-04-29
