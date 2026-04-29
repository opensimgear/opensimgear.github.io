# blekenbleu SimHub Custom Serial Profiles

- project: SimHub Profiles / SimHub Custom Serial documentation
- maintainer_or_org: blekenbleu
- component_category: belt-tensioners
- subcategory: SimHub custom serial servo-profile foundation
- maturity_or_status: Public documentation/profile set; used as a base by multiple DIY belt projects.
- license: CC0-1.0 for SimHub-Profiles repository.

repo_url: https://github.com/blekenbleu/SimHub-Profiles

docs_url: https://blekenbleu.github.io/Arduino/SimHubCustomSerial

source_urls:

- https://github.com/blekenbleu/SimHub-Profiles
- https://raw.githubusercontent.com/blekenbleu/SimHub-Profiles/main/LICENSE
- https://blekenbleu.github.io/Arduino/SimHubCustomSerial
- https://github.com/blekenbleu/blekenbleu.github.io/tree/master/Arduino/Blue_ASCII_Servo

key_features:

- Documents SimHub custom serial workflows for Arduino/Blue Pill style devices.
- Provides reusable patterns for mapping SimHub properties to serial actuator values.
- Basis cited by StuyoP's robot-servo belt tensioner and gTenxor acknowledgments.

hardware_or_bom:

- Arduino or STM32 Blue Pill-class board depending on sketch/profile.
- Servo hardware, external servo power, and linkage are project-specific.

firmware_or_software_stack:

- SimHub custom serial profiles and Arduino/Blue Pill serial sketches.

build_requirements:

- SimHub, custom serial profile setup, compatible microcontroller, and local firmware flashing.

compatibility:

- SimHub-supported games and telemetry channels.
- Reused by belt tensioner, servo, light, wind, and other DIY peripherals.

strengths:

- Public-domain style licensing on profile repository.
- Useful generic bridge for projects that need serial haptics without writing a full SimHub plugin.

limitations:

- Not a finished belt tensioner by itself.
- Depends on SimHub.
- Hardware safety and servo mapping are left to downstream projects.

commercial_analogs:

- SimHub Arduino support
- Custom USB controllers bundled with active belt kits

fit_notes:

- Best treated as enabling infrastructure for open belt-tensioner prototypes.
- Filed under belt-tensioners because multiple active-harness projects build on it.

last_checked: 2026-04-29
