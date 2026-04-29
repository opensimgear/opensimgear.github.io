# Motion4Sim AASD15A Servo Controller Firmware

- project: AASD15A Servo Controller for Motion Simrigs
- maintainer_or_org: motion4sim
- component_category: motion-platforms
- subcategory: public firmware for AASD15A/SFX/6DOF/belt controller
- maturity_or_status: Public firmware release repository with ongoing version notes through v3.30.
- license: No explicit license found.

repo_url: https://github.com/motion4sim/AASD15A-Servo-Controller-for-Motion-Simrigs

docs_url: https://github.com/motion4sim/AASD15A-Servo-Controller-for-Motion-Simrigs

source_urls:

- https://github.com/motion4sim/AASD15A-Servo-Controller-for-Motion-Simrigs
- https://raw.githubusercontent.com/motion4sim/AASD15A-Servo-Controller-for-Motion-Simrigs/master/README.md

key_features:

- Firmware for Motion4Sim M4S controller family.
- Supports AASD15A servo drives, SFX-like rigs, linear/rotary rigs, and 6DOF configurations per version notes.
- Version notes mention belt actuator support, dashboard/handheld support, hardware pulsing improvements, SimHub
  support, SRS, and SimTools.

hardware_or_bom:

- Motion4Sim M4S controller hardware.
- AASD15A servo drives and compatible AC servo actuators.
- Optional belt actuator/dashboard/handheld hardware depending on configuration.

firmware_or_software_stack:

- Controller firmware releases and configuration workflow around Motion4Sim hardware.
- Integrates with SimHub, SRS, SimTools, and similar motion hosts depending on version.

build_requirements:

- Motion4Sim hardware, firmware flashing/update process, servo-drive wiring, and host software setup.

compatibility:

- AASD15A servo-drive rigs.
- SFX-style 3DOF/4DOF, 6DOF, belt, and other motion topologies called out in release notes.
- SimHub, Sim Racing Studio, and SimTools support mentioned.

strengths:

- Covers several modern motion-rig topologies.
- Includes belt support, making it relevant across motion and restraint effects.
- Public release notes show active evolution.

limitations:

- No explicit open-source license found.
- Repository appears firmware-release oriented; source availability is unclear.
- Hardware tied to Motion4Sim ecosystem.

commercial_analogs:

- Thanos AMC-AASD15A controller
- PT Actuator controller boxes
- Sim Racing Studio motion boxes

fit_notes:

- Include as public-firmware ecosystem reference, not clean OSS.
- Useful for mapping current AASD15A controller feature expectations.

last_checked: 2026-04-29
