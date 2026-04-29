# SMC3

- project: SMC3
- maintainer_or_org: SimulatorMotorController
- component_category: motion-platforms
- subcategory: Arduino motion platform motor controller
- maturity_or_status: Stable older DIY controller; GitHub metadata showed last update in 2023.
- license: MIT

repo_url: https://github.com/SimulatorMotorController/SMC3

docs_url: https://github.com/SimulatorMotorController/SMC3

source_urls:

- https://github.com/SimulatorMotorController/SMC3
- https://raw.githubusercontent.com/SimulatorMotorController/SMC3/master/README.md
- http://github.com/SimulatorMotorController/SMC3Utils

key_features:

- Arduino Uno R3 controller for up to three motion-simulator motors.
- Analog feedback with PID loop at 4096 updates per second per motor.
- Supports H-bridge Mode 1 for MonsterMoto-style drivers and Mode 2 for IBT-2 direct high/low side drivers.
- Companion Windows SMC3 Utils app for setup and tuning.

hardware_or_bom:

- Arduino Uno R3.
- Up to three DC motors with analog position feedback.
- H-bridge drivers such as MonsterMoto or IBT-2 depending on mode.
- Power supplies, feedback pots/sensors, and motion frame hardware.

firmware_or_software_stack:

- Arduino firmware plus SMC3 Utils setup application.
- Typically driven by SimTools, FlyPT Mover, or similar motion-output software.

build_requirements:

- Arduino IDE/flashing, motor-driver wiring, feedback sensor calibration, PID tuning, and host motion software
  configuration.

compatibility:

- 2DOF/3DOF DIY DC motor platforms.
- Motion host software that can output SMC3-compatible serial commands.

strengths:

- MIT license and small, understandable firmware.
- Common reference controller across XSimulator DIY builds.
- Good for low-cost DC motor motion rigs.

limitations:

- Limited to three motors.
- Designed around analog feedback DC motor rigs, not modern servo drives.
- Safety interlocks must be engineered by the builder.

commercial_analogs:

- Pololu/JRK-based DIY motion controllers
- Thanos motion controller in low-axis configs
- Entry-level 2DOF seat mover controller boards

fit_notes:

- Core open-source motion-controller baseline.
- Also appears in g-seat adaptation leads.

last_checked: 2026-04-29
