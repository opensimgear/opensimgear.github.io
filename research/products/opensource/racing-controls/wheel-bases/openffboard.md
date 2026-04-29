# OpenFFBoard

- project: OpenFFBoard
- maintainer_or_org: Yannick Richter / Ultrawipf
- component_category: wheel-bases
- subcategory: modular force-feedback controller and motor-driver ecosystem
- maturity_or_status: Active ongoing project with current firmware, hardware, wiki, and configurator repositories.
- license: MIT for main firmware; MIT top-level hardware license with possible subfolder exceptions; GPL-3.0 for
  configurator.
- repo_url: https://github.com/Ultrawipf/OpenFFBoard
- docs_url: https://github.com/Ultrawipf/OpenFFBoard/wiki
- source_urls:
  - https://hackaday.io/project/163904-open-ffboard
  - https://github.com/Ultrawipf/OpenFFBoard
  - https://github.com/Ultrawipf/OpenFFBoard-hardware
  - https://github.com/Ultrawipf/OpenFFBoard-configurator
  - https://github.com/Ultrawipf/OpenFFBoard/wiki/ODrive-guide
  - https://ultrawipf.github.io/OpenFFBoard/doxygen/
- key_features:
  - Universal USB HID force-feedback interface for DIY wheels, joysticks, and other simulator controls.
  - Supports custom TMC4671 motor driver, ODrive over CAN, VESC over CAN, PWM outputs, and Granite SimpleMotion drives.
  - Supports ABN, BISS-C, MT6825, SinCos, ODrive, and VESC encoder paths.
  - Inputs can include local analog pins, CAN button and analog sources, PCF8574 I2C, SPI shift registers, Logitech
    analog shifter, and some Thrustmaster wheel inputs.
  - Configurator supports tuning, firmware upload, profiles, effect monitoring, encoder settings, and settings
    dump/load.
- hardware_or_bom:
  - STM32F407-based OpenFFBoard main controller.
  - Optional OpenFFBoard TMC4671 driver board, ODrive, VESC, Granite Ioni/Argon, or other supported driver.
  - Servo or stepper motor, encoder, 36 V or 48 V power supply, braking/safety hardware, E-stop, wheel shaft adapter,
    and rigid mount.
  - Hardware repository includes main board, TMC4671 driver, BISS-C adapter, SPI button board, load-cell amplifiers, and
    acrylic case files.
- firmware_or_software_stack:
  - OpenFFBoard firmware in C/C++ for STM32 using FreeRTOS and TinyUSB.
  - GTK-based OpenFFBoard configurator.
  - Doxygen documentation and GitHub wiki.
- build_requirements:
  - Advanced electronics build; hardware repo warns fine-pitch/QFN soldering and 2 oz copper for motor driver thermal
    performance.
  - Motor controller, encoder, power supply, braking resistor/regen handling, emergency stop, and mechanically rigid
    mounting.
  - Manual driver setup for ODrive/VESC torque mode when using those backends.
- compatibility:
  - PC USB HID force-feedback wheel/controller.
  - Works with motor-driver backends listed above when configured correctly.
  - Open ecosystem for separate USB wheels, button plates, pedals, and shifters.
- strengths:
  - Strongest current open-source wheel-base control stack found.
  - Modular firmware/hardware split lets builders choose motor drivers and sensors.
  - Broad documentation, active updates, and real community builds.
- limitations:
  - Safety-critical high-power build; wrong wiring or tuning can be dangerous.
  - Not a single turnkey mechanical design.
  - Hardware assembly can exceed casual soldering skill.
- commercial_analogs:
  - Simucube 2 Sport/Pro
  - VRS DirectForce Pro
  - MOZA R9/R12
  - Fanatec CSL DD / ClubSport DD
- fit_notes:
  - Best fit for advanced builders who want modern open firmware around a DIY direct-drive base, not for low-effort
    plug-and-play.
- last_checked: 2026-04-29
