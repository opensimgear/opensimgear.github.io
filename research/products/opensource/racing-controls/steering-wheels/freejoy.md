# FreeJoy

- project: FreeJoy
- maintainer_or_org: FreeJoy-Team
- component_category: steering-wheels
- subcategory: configurable USB HID input controller for wheels, pedals, shifters, and panels
- maturity_or_status: Mature hobby firmware with large community footprint; active repository.
- license: GPL-3.0
- repo_url: https://github.com/FreeJoy-Team/FreeJoy
- docs_url: https://github.com/FreeJoy-Team/FreeJoy/wiki
- source_urls:
  - https://github.com/FreeJoy-Team/FreeJoy
  - https://github.com/FreeJoy-Team/FreeJoy/wiki
- key_features:
  - Configurable USB HID game-device controller based on cheap STM32F103C8 boards.
  - Intended for HOTAS, pedals, steering wheels, purchased-device customization, and other DIY controls.
  - 8 analog inputs, 128 digital inputs, axis-to-button functions, encoders, hats, shift registers, external ADCs,
    digital sensors, PWM LEDs, and WS2812/PL9823 LEDs with SimHub control.
  - Device name and USB settings are configurable.
- hardware_or_bom:
  - STM32F103C8 "Blue Pill" class board.
  - Buttons, toggles, encoders, hat switches, analog sensors, shift registers, ADC modules, digital magnetic sensors,
    LEDs.
- firmware_or_software_stack:
  - STM32 firmware, bootloader, and FreeJoy configuration utility.
  - Wiki-guided flashing and configuration.
- build_requirements:
  - Flash bootloader/firmware to STM32 board.
  - Configure pins and HID report via FreeJoy tools.
  - Wire sensors cleanly and protect from ESD/shorts in wheel/button plate.
- compatibility:
  - PC USB HID controller.
  - Useful for steering wheels, button plates, pedals, H-shifters, sequential shifters, and handbrakes that do not need
    force feedback.
- strengths:
  - Very flexible general input firmware.
  - Large I/O budget for complex wheels and dashboards.
  - Strong alternative to Arduino Joystick Library for polished HID devices.
- limitations:
  - Not a mechanical component design.
  - STM32 clone quality and flashing process can vary.
  - No force-feedback motor control.
- commercial_analogs:
  - Leo Bodnar BU0836 series
  - Derek Speare Designs button controllers
  - SimHub/USB button plate control boards
- fit_notes:
  - Use when the mechanical wheel/pedals/shifter are already solved and you need a flexible USB brain.
- last_checked: 2026-04-29
