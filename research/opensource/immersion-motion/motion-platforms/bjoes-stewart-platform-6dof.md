# Bjoes Stewart Platform 6DOF

- project: Stewart-platform-6DOF
- maintainer_or_org: Bjoes
- component_category: motion-platforms
- subcategory: FlyPT Mover-driven 6DOF Stewart platform
- maturity_or_status: Public DIY build repository; BOM and drawings noted as work in progress.
- license: No explicit license found.

repo_url: https://github.com/Bjoes/Stewart-platform-6DOF

docs_url: https://github.com/Bjoes/Stewart-platform-6DOF

source_urls:

- https://github.com/Bjoes/Stewart-platform-6DOF
- https://raw.githubusercontent.com/Bjoes/Stewart-platform-6DOF/master/README.md
- https://departedreality.com/products/dr-diy-ps

key_features:

- 6DOF simulator with Arduino controllers for FlyPT Mover.
- Uses two Arduino Mega 2560 boards.
- AASD-15A servo drives with 80ST-M02430 servos.
- Modular aluminum extrusion frame with laser-cut brackets and 3D-printed parts.

hardware_or_bom:

- Aluminum extrusion structure.
- Laser-cut brackets and 3D-printed parts.
- Two Arduino Mega 2560 controllers.
- Six AASD-15A drives and 80ST-M02430 servos.
- README says CAD drawings include most items but not nuts/bolts/bearings; BOM is WIP.

firmware_or_software_stack:

- FlyPT Mover as host motion software.
- Arduino Mega controllers for servo-drive output.

build_requirements:

- Fabrication access for extrusion, laser cutting, printing, servo wiring, Arduino flashing, and FlyPT Mover tuning.

compatibility:

- FlyPT Mover.
- AASD-15A servo-drive ecosystem.

strengths:

- Practical high-power 6DOF servo reference.
- Documents real hardware choices and fabrication route.
- Useful bridge between FlyPT Mover and AASD-15A actuators.

limitations:

- No explicit license found.
- BOM incomplete per README.
- FlyPT Mover is free for personal use but not confirmed open source.

commercial_analogs:

- PT Actuator 6DOF systems
- Qubic System 6DOF platforms
- DOF Reality H6/P6

fit_notes:

- Valuable as a build log/reference, weaker as a reusable OSS package because licensing is missing.

last_checked: 2026-04-29
