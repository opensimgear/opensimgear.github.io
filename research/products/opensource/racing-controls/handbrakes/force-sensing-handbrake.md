# Force Sensing Handbrake

- project: force_sensing_handbrake
- maintainer_or_org: zhyma
- component_category: handbrakes
- subcategory: load-cell force-sensing handbrake
- maturity_or_status: Complete documented project with bilingual README, CAD/STL, firmware, and Thingiverse mirror;
  older but still useful.
- license: CC-BY-4.0
- repo_url: https://github.com/zhyma/force_sensing_handbrake
- docs_url: https://github.com/zhyma/force_sensing_handbrake
- source_urls:
  - https://github.com/zhyma/force_sensing_handbrake
  - https://www.thingiverse.com/thing:2766811
- key_features:
  - Converts handbrake force into USB joystick axis using load cell rather than displacement.
  - Load-cell design directly measures pull force, avoiding wear of sliding potentiometer and magnetic-field sensitivity
    of hall designs.
  - Includes CAD/STL hardware files, wiring diagrams, Arduino firmware, and HX711 rate modification notes.
- hardware_or_bom:
  - Hydraulic/drift-style handbrake lever, 20 kg load cell, HX711 module, spring, stainless rod/pin, Arduino Pro Micro,
    3D printed sleeves/case/stopper, machined aluminum sensor rack/spacers, screws/nuts.
- firmware_or_software_stack:
  - Arduino sketch in `handbrake/handbrake.ino`.
  - HX711 library and ArduinoJoystickLibrary v2.0.
- build_requirements:
  - Modify/strip handbrake, machine or print sensor mounts, wire HX711, optionally switch HX711 from 10 Hz to 80 Hz,
    flash Arduino, adjust raw-to-axis mapping constants.
- compatibility:
  - PC USB joystick axis.
  - Generic sims that accept analog handbrake input.
- strengths:
  - Stronger sensing concept than simple potentiometer travel.
  - Detailed BOM, CAD, wiring, and firmware.
  - Permissive CC-BY license for docs/hardware files.
- limitations:
  - Requires machining/fitting around a real handbrake chassis.
  - Firmware mapping is manual.
  - Older dependency versions documented.
- commercial_analogs:
  - Heusinkveld Handbrake
  - Fanatec ClubSport Handbrake V2
  - Sim-Lab XB1
  - VNM Handbrake
- fit_notes:
  - Best open handbrake design found for users who want force sensing rather than travel sensing.
- last_checked: 2026-04-29
