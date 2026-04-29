# DIY-DirectDrive

- project: DIY-DirectDrive
- maintainer_or_org: Jan Balke
- component_category: wheel-bases
- subcategory: ODrive-based direct-drive wheel software
- maturity_or_status: Source available, small historic Python project; site and repo still reachable but low recent
  activity.
- license: GPL-3.0
- repo_url: https://github.com/JanBalke420/DIY-DirectDrive
- docs_url: https://jan-balke.com/
- source_urls:
  - https://jan-balke.com/
  - https://www.jan-balke.com/downloads.html
  - https://www.jan-balke.com/controller.html
  - https://github.com/JanBalke420/DIY-DirectDrive
  - https://github.com/odriverobotics/ODrive
- key_features:
  - Python software for creating a direct-drive force-feedback wheel with an ODrive Robotics board and industrial servo
    motor.
  - GUI, profile management, friction/damping/inertia/endstop effects, and game interfaces for Assetto Corsa and Assetto
    Corsa Competizione.
  - Intended to send torque commands to ODrive from live game data.
- hardware_or_bom:
  - ODrive-compatible BLDC/servo setup with motor, encoder, wheel adapter, power supply, and safe mounting.
  - ODrive v3.x firmware was open-source; newer ODrive hardware generations no longer have public firmware source
    according to ODrive repo note.
- firmware_or_software_stack:
  - Python 3.5.3 era app using NumPy, PyQt5, PyQtGraph, PYXinput, and ODrive Python tools.
  - ODrive firmware/tools for motor control.
- build_requirements:
  - ODrive motor commissioning, encoder setup, Python environment, and wheel mechanical build.
  - Likely needs modernization for current Python/package versions [uncertain].
- compatibility:
  - PC racing sims with supported game data mappings.
  - ODrive-controlled direct-drive motor systems.
- strengths:
  - Simple, readable proof of an ODrive-based DD wheel stack.
  - Clear official website states free/open source and links to GitHub.
  - Useful reference for telemetry-to-torque experiments.
- limitations:
  - Narrow game support and old Python stack.
  - Does not expose a mature DirectInput FFB HID wheel stack like OpenFFBoard.
  - ODrive open-source status differs by hardware generation.
- commercial_analogs:
  - VRS DirectForce Pro
  - Simucube 2 Sport
  - MOZA R9
  - Fanatec CSL DD
- fit_notes:
  - Good research reference for ODrive DD control; OpenFFBoard is stronger for a current general-purpose DIY wheel base.
- last_checked: 2026-04-29
