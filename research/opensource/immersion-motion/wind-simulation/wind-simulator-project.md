# Wind Simulator Project

- project: Wind Simulator Project
- maintainer_or_org: Crypto69
- component_category: wind-simulation
- subcategory: Arduino Uno PWM PC-fan iRacing wind simulator
- maturity_or_status: Older complete build guide for iRacing.
- license: GPL-3.0

repo_url: https://github.com/Crypto69/Wind-Simulator-Project

docs_url: https://github.com/Crypto69/Wind-Simulator-Project

source_urls:

- https://github.com/Crypto69/Wind-Simulator-Project
- https://raw.githubusercontent.com/Crypto69/Wind-Simulator-Project/master/README.md
- https://raw.githubusercontent.com/Crypto69/Wind-Simulator-Project/master/LICENSE
- https://youtu.be/xUraMKOlKhc

key_features:

- Low-cost iRacing wind simulator using PWM-controlled 4-pin PC fans.
- Reads iRacing telemetry in a .NET app and sends 0-255 fan commands to an Arduino.
- Self-learns top speed during driving and scales fan output.
- Uses directional fan shrouds to make airflow noticeable.

hardware_or_bom:

- Arduino Uno.
- 12 V power supply rated at least 1.5 A.
- Two 120 mm 4-pin PWM PC fans.
- Terminal block, hookup wire, optional voltmeter/soldering iron/3D printer.
- Suggested 3D-printed fan shrouds, Arduino case, and GoPro-style mounts.

firmware_or_software_stack:

- Arduino sketch `WindSimulatorWithPWMH.ino`.
- Sam Knight/RCS101 Fast PWM library.
- Windows .NET application that reads iRacing telemetry and writes serial fan values.

build_requirements:

- Arduino IDE, USB serial setup, Fast PWM library import, fan wiring, and optional printed ducts/cases.

compatibility:

- iRacing only in the provided app.
- Arduino Uno and 4-pin PWM PC fans.

strengths:

- Simple BOM and no motor shield needed because fans accept PWM directly.
- Full build narrative with wiring and 3D-print links.
- GPL-licensed project.

limitations:

- iRacing-specific host app.
- Uses older Arduino IDE workflow and Windows app.
- Fan output is speed-based, not a broad effects engine.

commercial_analogs:

- Sim Racing Studio Hurricane
- Boosted Media-style DIY wind kits
- Turnkey dual-fan simulator wind kits

fit_notes:

- Best fit as a simple reference design for PWM fan wiring and iRacing speed wind.
- Less useful for multi-title rigs unless ported to another telemetry host.

last_checked: 2026-04-29
