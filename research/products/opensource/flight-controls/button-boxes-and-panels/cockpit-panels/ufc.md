# UFC

project: UFC

maintainer_or_org: `escaner`

component_category: button-boxes-and-panels

subcategory: DCS up-front control panel / Arduino button box

maturity_or_status: Small active-ish public project; repository activity observed after 2025, but no major release
stream.

license: GPL-3.0

repo_url: https://github.com/escaner/ufc

docs_url: https://github.com/escaner/ufc/tree/master/doc

source_urls:

- https://github.com/escaner/ufc
- https://github.com/dcs-bios/dcs-bios
- https://github.com/MHeironimus/ArduinoJoystickLibrary
- https://github.com/escaner/REncoder
- https://github.com/escaner/Switch
- https://github.com/fmalpartida/New-LiquidCrystal

key_features:

- Arduino project for a button-box style up-front control panel.
- Interfaces switches, rotary encoders, LCD, and LEDs.
- Can identify as a game controller sending DirectX events.
- Also communicates with DCS through DCS-BIOS.
- Includes schematics and pictures in docs.

hardware_or_bom:

- SparkFun Pro Micro or clone, Robotdyn 4x4 keypad module, 2004 LCD with I2C module, resistors, LEDs, potentiometers,
  pushbutton, protoboard, Dupont terminals, USB cable, 3D-printed PLA case, vinyl/labels, hot glue, wires.

firmware_or_software_stack:

- Arduino sketch using DCS-BIOS, MHeironimus ArduinoJoystickLibrary, REncoder, Switch, New-LiquidCrystal, EEPROM.

build_requirements:

- 3D printer, soldering iron, Arduino libraries, DCS-BIOS setup, wiring, LCD/encoder/button integration.

compatibility:

- DCS through DCS-BIOS.
- DirectX/game-controller events for broader PC mapping.

strengths:

- Concrete, complete small panel build.
- Combines HID and DCS-BIOS paths.
- GPL-3.0 license and explicit BOM-like README.

limitations:

- Narrow UFC-style panel.
- Small maintainer/project footprint.
- Requires hand wiring and Arduino dependency setup.

commercial_analogs:

- Virpil Universal Control Panel 1/2/3
- Thrustmaster Viper Panel
- Thrustmaster MFD Cougar Pack

fit_notes:

- Good representative for single-purpose open cockpit panels.

last_checked: 2026-04-29
