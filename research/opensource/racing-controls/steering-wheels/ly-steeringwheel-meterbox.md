# LY SteeringWheel MeterBox

- project: LY steeringWheel MeterBox STM32 FreeRTOS
- maintainer_or_org: Nolimy
- component_category: steering-wheels
- subcategory: formula-style wheel with display and SimHub support
- maturity_or_status: Complete university Formula Student graduation project; repo and external hardware project
  available.
- license: GPL-3.0
- repo_url: https://github.com/Nolimy/steeringWheel_MeterBox_STM32_FreeRTOS
- docs_url: https://github.com/Nolimy/steeringWheel_MeterBox_STM32_FreeRTOS
- source_urls:
  - https://github.com/Nolimy/steeringWheel_MeterBox_STM32_FreeRTOS
  - https://oshwhub.com/nolimy/steeringWheel_project
- key_features:
  - STM32F407 steering wheel for Formula Student car and simulator use.
  - Real-car mode reads CAN data; simulator mode reads SimHub serial data and exposes USB controller buttons.
  - 3.5 inch display, 12 LED shift-light module, programmable buttons, paddle shifters, data logging/upload concepts for
    real-car telemetry.
  - Includes BOM spreadsheet and STEP models for real-car quick release and Logitech G27 simulator adapter.
- hardware_or_bom:
  - STM32F407 electronics, display, LEDs, buttons, paddle shifters, carbon plate/CNC body, resin 3D printed grips and
    housings.
  - BOM and STEP assemblies in repository.
- firmware_or_software_stack:
  - STM32/FreeRTOS firmware.
  - SimHub custom serial device setup for simulator telemetry.
  - CAN handling for real-car mode.
- build_requirements:
  - PCB build, STM32 firmware flashing, display/LED integration, CNC carbon or equivalent plate fabrication, 3D
    printing, SimHub serial scripting.
  - Chinese documentation; translation likely needed for many builders.
- compatibility:
  - Assetto Corsa and Assetto Corsa Competizione tested via SimHub.
  - Can be adapted to Logitech G27 base via included simulator STEP model.
  - Real Formula Student CAN integration is team-specific.
- strengths:
  - More complete wheel/display/mechanical package than many sim-only projects.
  - GPL-licensed software and published hardware project.
  - Good reference for hybrid real-car/sim wheel electronics.
- limitations:
  - Not purpose-built only for sim racing; real-car assumptions appear throughout.
  - Hardware complexity is high.
  - Documentation mostly Chinese.
- commercial_analogs:
  - Cube Controls CSX/F-Core style formula wheels
  - Simagic FX Pro
  - MOZA FSR Formula
  - Fanatec Formula V2.5
- fit_notes:
  - Strong reference for display-rich formula wheel design; overkill for simple GT button plate.
- last_checked: 2026-04-29
