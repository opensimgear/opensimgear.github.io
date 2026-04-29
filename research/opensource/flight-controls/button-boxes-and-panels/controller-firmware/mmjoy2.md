# MMJoy2

project: MMJoy2 English mirror

maintainer_or_org: MMjoy project / English mirror maintainers

component_category: joysticks; throttles; rudder-pedals; button-boxes-and-panels

subcategory: legacy joystick controller firmware and configurator documentation

maturity_or_status: Archived read-only GitHub mirror since 2018-10-31. Legacy firmware/software archive, still
referenced by DIY builders.

license: No clear open-source license found in English mirror [uncertain].

repo_url: https://github.com/MMjoy/mmjoy_en

docs_url: https://github.com/MMjoy/mmjoy_en/wiki

source_urls:

- https://github.com/MMjoy/mmjoy_en
- https://github.com/MMjoy/mmjoy_en/tree/master/firmware%20and%20software%20release
- https://sites.google.com/site/mmjoyproject/

key_features:

- English documentation mirror for MMJoy2.
- Repository includes PCB folder, additional docs, and firmware/software release archive.
- Original project and legacy software/firmware are linked from the README.
- Commonly used in DIY USB HID joystick, yoke, throttle, and rudder projects.

hardware_or_bom:

- Common MMJoy2 builds use ATmega32U4/Arduino Pro Micro-class boards, sensors, button matrices, and encoders [uncertain:
  from common builder practice, not directly summarized in README].

firmware_or_software_stack:

- Legacy MMJoy2 firmware and Windows configuration utility [uncertain].

build_requirements:

- Legacy firmware flashing, Windows configurator, wiring sensors/buttons, and simulator calibration.

compatibility:

- USB HID joystick-style devices.
- Modern OS behavior and unsigned-driver/friction points should be validated per build.

strengths:

- Historically important DIY controller firmware.
- Large amount of community knowledge and profiles exist outside the repo.
- Useful bridge for older build logs and designs.

limitations:

- Archived and read-only.
- License is unclear, so it should not be represented as clean open source.
- Better modern alternatives exist, especially FreeJoy and purpose-built HID libraries.

commercial_analogs:

- Leo Bodnar BU0836-style controller boards [outside local commercial corpus]
- Electronics inside Logitech/Saitek panels and DIY button boxes

fit_notes:

- Include because many open build logs reference MMJoy2, but flag as legacy and license-uncertain.

last_checked: 2026-04-29
