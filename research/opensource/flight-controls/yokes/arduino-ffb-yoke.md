# Arduino FFB Yoke

project: Arduino_FFB_Yoke

maintainer_or_org: `gagagu` with JR4 hardware contributions

component_category: yokes

subcategory: Arduino-based force-feedback flight yoke

maturity_or_status: Active advanced DIY project. Latest GitHub release observed: Version 2.0.0 on 2025-03-21. README
says project is still in development.

license: GPL-3.0 in repository; README also says commercial use is not allowed, so reuse terms need maintainer
clarification.

repo_url: https://github.com/gagagu/Arduino_FFB_Yoke

docs_url: https://github.com/gagagu/Arduino_FFB_Yoke/wiki

source_urls:

- https://github.com/gagagu/Arduino_FFB_Yoke
- https://github.com/gagagu/Arduino_FFB_Yoke/wiki
- https://www.thingiverse.com/thing:6464701
- https://www.thingiverse.com/thing:6786283

key_features:

- Force-feedback yoke for flight simulators using Arduino.
- Includes 3D components, electronic schematics, Arduino source code, and PCB revisions.
- Newer hardware uses Arduino Pro Micro instead of Arduino Micro.
- Board v2.0 can work with old PCB v1.3.5 and newer PCB v2.0.
- Automatic calibration exists on branch `2.0`, marked alpha by maintainer.

hardware_or_bom:

- Arduino Pro Micro/Micro/Leonardo-class board, PCB, printed mechanical parts, gears/remixes, motors/force-feedback
  mechanics [uncertain], sensors, wiring, and power hardware.

firmware_or_software_stack:

- Arduino sketches and C/C++ support files.
- Requires code folder named `Arduino_FFB_Yoke` for Arduino IDE use.
- References several GitHub projects and Thingiverse models.

build_requirements:

- Advanced electronics and mechanical assembly, Arduino IDE, PCB handling, 3D printing, motor safety, calibration.

compatibility:

- Intended for Flight Simulator and X-Plane-style FFB yoke use.
- Simulator FFB behavior and OS driver path need per-build validation [uncertain].

strengths:

- One of the more concrete open FFB yoke projects.
- Includes hardware, electronics, and code in one repo.
- Active enough to have recent hardware revisions.

limitations:

- Safety risk is called out by maintainer.
- Alpha branch for newer calibration.
- License conflict/extra non-commercial statement should be resolved before reuse.

commercial_analogs:

- Brunner CLS-E NG Yoke
- Fulcrum One Yoke
- Honeycomb Alpha Flight Controls XPC

fit_notes:

- Best suited for advanced FFB/yoke sections, not basic yoke buyer guides.

last_checked: 2026-04-29
