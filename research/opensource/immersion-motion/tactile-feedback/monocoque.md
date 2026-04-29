# Monocoque

- project: Monocoque
- maintainer_or_org: Spacefreak18
- component_category: tactile-feedback
- subcategory: open telemetry-to-haptics and device manager
- maturity_or_status: Active Linux-first project; GitHub metadata showed updates in April 2026.
- license: GPL-3.0

repo_url: https://github.com/Spacefreak18/monocoque

docs_url: https://spacefreak18.github.io/simapi/

source_urls:

- https://github.com/Spacefreak18/monocoque
- https://spacefreak18.github.io/simapi/

key_features:

- Converts sim telemetry into bass-shaker, simwind, simlight, tachometer, wheel/pedal, and serial outputs.
- Targets 60 FPS processing with modular device/effect handling.
- Includes shaker effects for wheel slip, wheel lock, ABS, engine RPM, and gear shifts.
- Arduino serial examples cover sim lights, simwind, and haptic motor outputs.

hardware_or_bom:

- Standard PC audio output plus bass shakers and amplifier for tactile use.
- Optional Arduino-compatible serial devices for wind, lights, and motor effects.

firmware_or_software_stack:

- Native Linux application using simapi/simshmbridge ecosystem pieces.
- Serial Arduino sketches are used for custom peripheral outputs.

build_requirements:

- CMake plus libraries such as libserialport, hidapi, portaudio, PulseAudio, libuv, libxml2, argtable2, libconfig,
  xdg-basedir, Lua, procps/libproc2, simapi, and simshmbridge.

compatibility:

- Linux-focused.
- Sim support depends on available simapi or shared-memory bridges.
- Can drive tactile, wind, and light hardware from the same telemetry layer.

strengths:

- Open alternative to SimHub-style haptics on Linux.
- Broad device-manager scope beyond just shakers.
- Recent activity makes it more alive than many older DIY tactile projects.

limitations:

- Linux-first and dependency-heavy.
- Smaller ecosystem than SimHub, so profiles and polished device presets are limited.

commercial_analogs:

- SimHub ShakeIt Bass Shakers
- Sim Racing Studio wind and shaker effects
- SimXperience SimVibe

fit_notes:

- Best fit for Linux rigs that need open telemetry-to-haptics and are willing to build profiles/devices.
- Cross-category project; filed under tactile-feedback because shaker output is the most direct immersion component.

last_checked: 2026-04-29
