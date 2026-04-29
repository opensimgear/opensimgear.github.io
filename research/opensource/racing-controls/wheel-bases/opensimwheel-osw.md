# OpenSimWheel / OSW

- project: OpenSimWheel / OSW
- maintainer_or_org: Early Virtual-Racing community; tutorial by Martin Ascher / Ascher Racing
- component_category: wheel-bases
- subcategory: legacy direct-drive servo wheel-base architecture
- maturity_or_status: Historic DIY direct-drive reference; largely superseded by Simucube-era commercial products and
  newer open stacks such as OpenFFBoard.
- license: Original tutorial calls it an open-source software project, but exact license and firmware availability are
  unclear in current archives [uncertain].
- repo_url: null
- docs_url: https://boxthislap.org/app/uploads/osw/Argon%20build/OpenSimwheel-Tutorial.pdf
- source_urls:
  - https://boxthislap.org/app/uploads/osw/Argon%20build/OpenSimwheel-Tutorial.pdf
  - https://www.ascher-racing.com/open-simwheel/
  - https://github.com/Ultrawipf/OpenFFBoard/wiki/ODrive-guide
- key_features:
  - Direct-drive wheel using off-the-shelf industrial servo drive, servo motor, STM32F4DISCOVERY controller, and wheel
    shaft adapter.
  - Reference tutorial covers part list, wiring, Granity setup, firmware flashing, torque-controller tuning, clipping,
    and troubleshooting.
  - Popularized small MiGE, big MiGE, Lenze, Granite Argon/VSD-E/Ioni, Q1R quick release, and external braking resistor
    patterns.
- hardware_or_bom:
  - Granite Devices Argon or VSD-E servo drive, MiGE/Lenze servo, STM32F4DISCOVERY, adapter board, 24 V logic supply,
    braking resistor, USB-to-RJ45 adapter, cables, shaft clamp, QR, servo bracket.
  - Example archived ordering list was around EUR 1200 in 2014 tutorial context.
- firmware_or_software_stack:
  - MMos USB HID controller and Granity drive configuration in archived builds [uncertain].
  - Firmware source and license are hard to verify from current public archives [uncertain].
- build_requirements:
  - High-voltage servo wiring, drive configuration, firmware flashing, shielded cables, grounding, braking resistor
    setup, and strong mechanical mounting.
  - Requires careful safety judgment; old docs assume builder can work around obsolete parts and dead links.
- compatibility:
  - PC force-feedback wheel through USB HID controller.
  - Built around industrial servo drives rather than integrated consumer wheel-base electronics.
- strengths:
  - Historically important open DIY pattern for high-torque direct drive.
  - Clear archival tutorial with wiring, tuning, and BOM detail.
  - Established many conventions still used by boutique DD wheel systems.
- limitations:
  - Archive-first project; source, license, and current support are not clean.
  - Some core tooling/firmware links are stale or not clearly open.
  - High cost and high build risk compared with modern kits.
- commercial_analogs:
  - Simucube 1
  - Simucube 2 Sport
  - VRS DirectForce Pro
  - SimXperience AccuForce
- fit_notes:
  - Treat as reference/history for direct-drive architecture, not first pick for new open-source builds.
- last_checked: 2026-04-29
