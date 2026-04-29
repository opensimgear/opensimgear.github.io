# Simchair MKIII

project: Simchair MKIII

maintainer_or_org: `hc625ma`

component_category: collectives; rudder-pedals; throttles; joysticks; button-boxes-and-panels

subcategory: 3D-printable modular helicopter/flight control ecosystem

maturity_or_status: Legacy but substantial public project. MKIII models and I2C controller repositories are public; no
GitHub releases observed.

license: GPL-3.0

repo_url: https://github.com/hc625ma/simchair_models

docs_url: http://hc625ma.org

source_urls:

- https://github.com/hc625ma/simchair_models
- https://github.com/hc625ma/simchair_i2c
- https://github.com/hc625ma/simchair4_models
- https://github.com/hc625ma/simchair4_software
- http://hc625ma.org
- http://hc625ma.org/files/simchair3/
- https://www.thingiverse.com/thing:2919692

key_features:

- 3D-printable Simchair MKIII models with source files and oriented STL files.
- Modular I2C controller system for master and peripheral devices.
- Repository includes collective-related folders such as `simple_collective`, `single_engine_collective`,
  `twin_engine_collective`, and `uh1_head`.
- Also includes B8 stick, Cessna engine/prop controls, universal throttle quadrant, and radio/panel peripherals.
- Designed to scale beyond one controller by using I2C peripherals.

hardware_or_bom:

- 3D printed models, Arduino Leonardo master controller, Arduino Pro Mini or Adafruit ADS1115 per peripheral, I2C
  wiring, sensors/buttons/axes, and per-device hardware.
- Assembly manuals and BOMs are referenced as available on hc625ma.org.

firmware_or_software_stack:

- `simchair_i2c` Arduino sketches.
- Uses MHeironimus ArduinoJoystickLibrary.
- Master controller plus peripheral sketches over I2C.

build_requirements:

- 3D printer, Arduino IDE, soldering, I2C wiring, per-peripheral hardware sourcing, calibration.

compatibility:

- USB HID joystick style output through Arduino Leonardo and joystick library.
- Simulator-specific bindings depend on axis/button mapping.

strengths:

- Rare open collective ecosystem with multiple helicopter control variants.
- GPL license across hardware models and controller software.
- Modular architecture suits complex pits.

limitations:

- Legacy docs/site reliability may vary.
- Requires more electronics integration than one-board joystick projects.
- MKIV repositories exist but have sparse README content.

commercial_analogs:

- Virpil Rotor TCS Plus
- Digital Reality Helicopter Collective Twist Throttle
- Pro Flight Trainer Puma X
- VKB T-Rudders MkV
- Logitech Flight Throttle Quadrant

fit_notes:

- Strongest open-source candidate for collectives/rudder/throttle coverage, especially helicopter-specific docs.

last_checked: 2026-04-29
