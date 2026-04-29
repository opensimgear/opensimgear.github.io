# 6DOF Rotary Stewart Motion Simulator

- project: 6DOF Rotary Stewart Motion Simulator
- maintainer_or_org: knaufinator
- component_category: motion-platforms
- subcategory: 6DOF rotary Stewart platform with AC servos
- maturity_or_status: Active advanced DIY project; GitHub metadata showed updates in March 2026.
- license: MIT

repo_url: https://github.com/knaufinator/6DOF-Rotary-Stewart-Motion-Simulator

docs_url: https://github.com/knaufinator/6DOF-Rotary-Stewart-Motion-Simulator

source_urls:

- https://github.com/knaufinator/6DOF-Rotary-Stewart-Motion-Simulator
- https://raw.githubusercontent.com/knaufinator/6DOF-Rotary-Stewart-Motion-Simulator/phoenix/README.md
- https://raw.githubusercontent.com/knaufinator/6DOF-Rotary-Stewart-Motion-Simulator/phoenix/LICENSE

key_features:

- Full-stack 6DOF motion simulator using rotary Stewart geometry.
- ESP32-S3 firmware with hardware-timed high-rate step generation.
- Native desktop control app with OpenGL/ImGui and validation tools.
- Supports test signals, playback, Assetto Corsa shared memory, and SimTools UDP input.

hardware_or_bom:

- Steel base about 31 inch diameter using 1/2 inch material.
- Six 750 W AC servos with 50:1 planetary gearboxes.
- AASD-15A servo drives.
- ESP32-S3 custom PCB and SN75174N RS-422 line drivers.
- Rod ends/Panhard bar kits and platform structure.

firmware_or_software_stack:

- ESP-IDF v5.5 firmware.
- C++17 desktop control application using OpenGL/ImGui.
- CMake-based build and validation utilities.

build_requirements:

- Advanced fabrication, servo-drive wiring, ESP-IDF toolchain, CMake/C++ build environment, and motion safety
  validation.

compatibility:

- Assetto Corsa shared memory.
- SimTools UDP with documented ports/settings.
- Test/playback sources for commissioning.

strengths:

- Modern, source-available full-stack 6DOF reference.
- Uses high-performance servo hardware.
- MIT license and detailed README safety warning.

limitations:

- Complex, high-voltage/high-force build.
- Custom PCB and fabrication requirements are substantial.
- Focused on advanced builders, not first-time motion rigs.

commercial_analogs:

- Motion Systems PS-6TM
- PT Actuator 6DOF systems
- Qubic System QS-S25/QS-220 class hexapods

fit_notes:

- Strong candidate for open 6DOF architecture research.
- Highest technical depth among surveyed motion-platform projects.

last_checked: 2026-04-29
