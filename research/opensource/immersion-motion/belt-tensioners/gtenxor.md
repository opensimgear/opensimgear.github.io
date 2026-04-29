# gTenxor

- project: gTenxor
- maintainer_or_org: BojoteX / Jesus Altuve
- component_category: belt-tensioners
- subcategory: SimHub plugin and Arduino/gTenxor servo controller
- maturity_or_status: Public prototype/plugin project from 2023; small community footprint.
- license: MIT, stated in README.

repo_url: https://github.com/BojoteX/gTenxor

docs_url: https://github.com/BojoteX/gTenxor

source_urls:

- https://github.com/BojoteX/gTenxor
- https://raw.githubusercontent.com/BojoteX/gTenxor/master/README.md
- https://www.youtube.com/watch?v=l9lmErAqP-A

key_features:

- SimHub plugin controls a seat belt/harness from telemetry.
- Reads acceleration, deceleration, surge, and sway data, then sends servo commands to a gTenxor device or Arduino Uno.
- Provides max tension limit, gain controls, filter strength, force reversal, testing, and auto-reset when the game
  stops.
- Includes Arduino sketch in repository hardware directory.

hardware_or_bom:

- gTenxor servo control unit or Arduino Uno.
- Two servos on PWM pins 9 and 10 when using Arduino Uno.
- External servo power is required.
- Seat belt or harness plus mechanical linkage.

firmware_or_software_stack:

- SimHub plugin DLL plus Arduino sketch/serial servo controller.
- Acknowledges code from blekenbleu Arduino Blue Pill/SimHub custom serial work.

build_requirements:

- SimHub installation, plugin DLL copy into SimHub directory, serial-port setup, Arduino flashing if not using gTenxor
  device, and servo power/mechanical build.

compatibility:

- SimHub-supported games and telemetry channels.
- gTenxor hardware or Arduino Uno fallback.

strengths:

- MIT-licensed plugin with active-belt-specific tuning.
- Offers quick prototype hardware path plus generic Arduino path.
- Controls surge and sway separately.

limitations:

- Depends on SimHub.
- Repository lacks a separate LICENSE file even though README states MIT.
- Harness actuation has safety risk; no certification.

commercial_analogs:

- SimXperience G-Belt
- Qubic System QS-BT1
- Simagic active belt tensioners

fit_notes:

- Better software reference than pure mechanical reference.
- Useful when evaluating SimHub plugin approaches for active harness control.

last_checked: 2026-04-29
