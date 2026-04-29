# FreeJoy

project: FreeJoy

maintainer_or_org: FreeJoy Team

component_category: joysticks; throttles; rudder-pedals; button-boxes-and-panels

subcategory: configurable STM32 USB HID game-device firmware

maturity_or_status: Active project. Latest GitHub release observed: v1.7.3 on 2026-02-21.

license: GPL-3.0

repo_url: https://github.com/FreeJoy-Team/FreeJoy

docs_url: https://github.com/FreeJoy-Team/FreeJoy/wiki

source_urls:

- https://github.com/FreeJoy-Team/FreeJoy
- https://github.com/FreeJoy-Team/FreeJoy/wiki

key_features:

- STM32F103C8 USB HID game-device controller firmware.
- Intended for HOTAS, pedals, steering wheels, and custom devices.
- Supports 8 analog inputs, up to 128 digital inputs, 4 POV hats, 16 encoders, shift registers, digital magnetic
  sensors, external ADCs, PWM lighting, LED matrices, addressable LEDs, and configurable USB identity.
- Axis settings include calibration, smoothing, inversion, deadband, curves, and axis/button transformations.
- External configurator utility handles setup.

hardware_or_bom:

- STM32F103C8 board, switches, encoders, buttons, hats, analog sensors, TLE/AS/MLX digital sensors, ADS1115/MCP ADCs,
  LEDs, optional shift registers.

firmware_or_software_stack:

- FreeJoy firmware plus FreeJoy Configurator utility.
- USB HID game controller output.

build_requirements:

- Flash STM32 firmware, wire controls/sensors, configure with external utility, test HID outputs.

compatibility:

- PC USB HID game-controller use.
- Can underpin joysticks, throttles, rudder pedals, and button boxes.

strengths:

- Feature-rich open firmware for serious custom controllers.
- Current release activity.
- Reduces need to hand-code USB descriptors.

limitations:

- Not a physical control design by itself.
- STM32 wiring/configuration can overwhelm beginner builders.
- Project support and documentation depth vary by feature.

commercial_analogs:

- Leo Bodnar BU0836-style controller boards [outside local commercial corpus]
- Virpil/VKB controller electronics inside high-end controls
- Logitech/Saitek panel electronics when used for panels

fit_notes:

- Best treated as reusable firmware/control electronics, not a component body.

last_checked: 2026-04-29
