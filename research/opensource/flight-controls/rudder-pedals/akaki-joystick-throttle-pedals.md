# Akaki Joystick

project: Akaki Joystick

maintainer_or_org: Akaki Kuumeri / `akakikuumeri`

component_category: joysticks; throttles; rudder-pedals

subcategory: 3D-printable USB HID joystick, throttle, and pedals

maturity_or_status: Small public project, last repository activity appears legacy. No GitHub releases.

license: GPL-3.0

repo_url: https://github.com/akakikuumeri/Akaki-Joystick

docs_url: https://github.com/akakikuumeri/Akaki-Joystick

source_urls:

- https://github.com/akakikuumeri/Akaki-Joystick
- https://www.thingiverse.com/thing:4578169
- https://www.thingiverse.com/thing:4578174

key_features:

- 3D-printable stick, throttle, and rudder pedal ecosystem.
- Arduino Pro Micro presents as a regular USB joystick on Windows and Mac.
- Stick uses two Hall-effect sensors for pitch and roll.
- Independent spring or rubber-band centering on pitch and roll.
- Bearing and no-bearing print variants for different build budgets.

hardware_or_bom:

- Printed STL parts, M3 hardware, optional 7 mm or 17 mm bearings, Hall sensors, magnets, potentiometers, microswitches,
  springs or rubber bands, Arduino Pro Micro.
- Separate Thingiverse files cover throttle unit and pedals.

firmware_or_software_stack:

- Arduino sketches in repository, including `hall_joystick.ino` and `hall_throttle.ino`.
- Uses USB HID joystick behavior through the Pro Micro.

build_requirements:

- 3D printer, soldering, Arduino flashing, basic mechanical fit-up, optional bearing sourcing.

compatibility:

- Windows and Mac as a regular USB joystick per README.
- Simulator-specific mapping depends on the sim.

strengths:

- Covers all three core low-cost controls: stick, throttle, pedals.
- Straightforward Arduino HID build.
- Clear mechanical assembly notes in README.

limitations:

- Small, older project with no releases.
- Pedal and throttle documentation live partly outside GitHub.
- More maker-grade than cockpit-grade.

commercial_analogs:

- Logitech Extreme 3D Pro
- Thrustmaster T.16000M FCS
- Logitech Flight Throttle Quadrant
- Logitech Flight Sim Rudder Pedals

fit_notes:

- Best fit for docs that discuss entry-level printable control sets and Hall-sensor DIY upgrades.

last_checked: 2026-04-29
