# OpenJoystick

project: OpenJoystick

maintainer_or_org: Tom Howse / `tjhowse`

component_category: joysticks; throttles

subcategory: 3D-printable parametric flight joystick and throttle

maturity_or_status: Legacy public design. Repository remains available, but no recent release activity was found.

license: GPL per project README; no GitHub license file detected, so exact SPDX status is [uncertain].

repo_url: https://github.com/tjhowse/OpenJoystick

docs_url: http://openjoystick.com

source_urls:

- https://github.com/tjhowse/OpenJoystick
- http://openjoystick.com

key_features:

- 3D-printable joystick and throttle design for flight simulators.
- Parametric OpenSCAD-style design intended for customization.
- Uses low-cost, common components where printed parts are unsuitable.
- Tri-axis Hall-effect sensing for non-contact stick position measurement.
- Includes PCB and hardware design folders in the repository.

hardware_or_bom:

- Printed structure, commonly available switches, bearings, sensors, and PCB assets.
- Hardware details are scattered in repository folders rather than a single current BOM [uncertain].

firmware_or_software_stack:

- Repository includes C++ and electronics assets, but current USB firmware path is not clearly packaged [uncertain].

build_requirements:

- 3D printer, OpenSCAD/CAD comfort, soldering tools, low-cost mechanical components, and electronics assembly.

compatibility:

- Intended for flight simulators as a joystick/throttle device.
- Exact current OS and simulator compatibility is [uncertain].

strengths:

- Fully customizable mechanical concept.
- Hall sensing makes it more serious than many simple potentiometer builds.
- Good historical reference for open flight-stick ergonomics and printable gimbal design.

limitations:

- Legacy state and sparse current docs.
- No turnkey electronics/firmware path visible from the top-level README.
- License metadata is not cleanly detected by GitHub.

commercial_analogs:

- Thrustmaster T.16000M FCS
- Logitech Extreme 3D Pro
- Logitech Flight Throttle Quadrant

fit_notes:

- Useful as a design-history reference for printable joystick and throttle mechanisms, less useful as a "build this
  today" recommendation without extra validation.

last_checked: 2026-04-29
