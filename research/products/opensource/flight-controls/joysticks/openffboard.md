# OpenFFBoard

project: OpenFFBoard

maintainer_or_org: Ultrawipf / OpenFFBoard community

component_category: joysticks

subcategory: universal force-feedback USB HID controller platform

maturity_or_status: Active advanced project. Latest GitHub release observed: OpenFFBoard v1.17.0 on 2026-04-17.

license: MIT

repo_url: https://github.com/Ultrawipf/OpenFFBoard

docs_url: https://hackaday.io/project/163904-open-ffboard

source_urls:

- https://github.com/Ultrawipf/OpenFFBoard
- https://hackaday.io/project/163904-open-ffboard
- https://github.com/Ultrawipf/OpenFFBoard/wiki
- https://github.com/Ultrawipf/OpenFFBoard-hardware
- https://github.com/Ultrawipf/OpenFFBoard-configurator

key_features:

- Universal open force-feedback interface for DIY simulation devices.
- Main modes include FFB Wheel and FFB Joystick.
- FFB Joystick mode exposes a USB two-axis force-feedback device.
- Supports multiple motor-driver backends, including ODrive, VESC, PWM, MyActuator, and OpenFFBoard TMC4671.
- Supports analog/digital inputs, command interface, configurator, hardware submodule, wiki, and Doxygen docs.

hardware_or_bom:

- OpenFFBoard hardware, compatible motor driver, motor, encoder, power supply, enclosure, and optional input
  peripherals.
- Exact BOM depends on motor-driver path and joystick/wheel class.

firmware_or_software_stack:

- C/C++ firmware, OpenFFBoard Configurator GUI, Git submodules for hardware/configurator, USB HID FFB.

build_requirements:

- Advanced electronics assembly, firmware flashing, motor driver setup, encoder setup, force-feedback safety tuning.

compatibility:

- USB HID force-feedback device.
- Game/simulator support varies by title and FFB implementation.

strengths:

- One of the strongest open platforms for FFB experimentation.
- Active releases and broad driver support.
- Can underpin joystick projects that need serious force feedback.

limitations:

- README says firmware is experimental and intended for advanced users.
- Mostly a controller platform, not a finished flight-stick mechanical design.
- Requires careful motor safety and matching firmware/configurator versions.

commercial_analogs:

- Brunner CLS force-feedback flight controls [outside local commercial corpus]
- Virpil/VKB high-end sticks when used as a non-FFB custom base analog

fit_notes:

- Best positioned in docs as an enabling platform for FFB joysticks/yokes rather than a complete component.

last_checked: 2026-04-29
