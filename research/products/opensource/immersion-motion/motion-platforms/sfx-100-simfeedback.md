# SFX-100 / SimFeedback

- project: SFX-100 / SimFeedback AC Servo
- maintainer_or_org: Rausch IT / SimFeedback community
- component_category: motion-platforms
- subcategory: 4-actuator DIY linear motion platform
- maturity_or_status: Mature DIY community platform with sponsor/member access model; official site reported hundreds of
  builders.
- license: Mixed: documentation/images/STLs under CC BY-NC-SA 4.0; SimFeedback core and Arduino firmware are
  freeware/donationware, not open source; telemetry plugins on GitHub are MIT-style per official downloads page.

repo_url: https://github.com/SimFeedback/SimFeedback-AC-Servo

docs_url: https://opensfx.com/

source_urls:

- https://opensfx.com/
- https://opensfx.com/downloads/
- https://opensfx.com/documentation/
- https://github.com/SimFeedback/SimFeedback-AC-Servo
- https://raw.githubusercontent.com/SimFeedback/SimFeedback-AC-Servo/master/README.md
- https://raw.githubusercontent.com/wiki/SimFeedback/SimFeedback-AC-Servo/License.md

key_features:

- Four SFX-100 linear actuators using AC servos and ball screws.
- Official site lists 100 mm travel, 245 mm/s velocity, and 200 kg+ rig capability.
- SimFeedback reads racing-sim telemetry and sends commands to an Arduino-based AC servo controller.
- Supports motion plus tactile output through sound card.

hardware_or_bom:

- Four SFX-100 actuators with 3D-printed parts, off-the-shelf components, and ball-screw linear mechanics.
- 750 W 240 V AC servos, AC servo drives, Arduino controller, mains wiring, and rig mounting.
- Shopping lists and build docs are on official site/wiki.

firmware_or_software_stack:

- SimFeedback PC software.
- Arduino firmware supplied by project but not open source.
- MIT-style telemetry plugins on GitHub.

build_requirements:

- Moderate DIY mechanical/electrical skill, 3D printer, mains-voltage safety competence, Arduino flashing, and
  sponsor/member flow for current access.

compatibility:

- Official site references Assetto Corsa, iRacing, rFactor 2, and other popular racing sims through telemetry providers.
- Hardware pattern has influenced many SFX-like commercial/DIY actuator systems.

strengths:

- Landmark DIY motion-platform design with strong build documentation.
- Proven high-performance actuator recipe.
- Open hardware/documentation portions are reusable for non-commercial private builds.

limitations:

- Core software and Arduino firmware are not open source.
- Non-commercial restrictions block commercial reuse.
- Sponsor/access model and anti-clone posture make onboarding harder.

commercial_analogs:

- PT Actuator 4-post systems
- Sigma Integrale DK2 motion
- eRacing Lab RS Mega platform

fit_notes:

- Include as open-hardware-adjacent rather than fully OSS.
- Essential reference for SFX-style motion platforms, but not ideal for a clean open-source stack.

last_checked: 2026-04-29
