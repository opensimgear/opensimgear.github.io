# GT7 Shaker for Linux

- project: GT7 Shaker for Linux
- maintainer_or_org: Helskov
- component_category: tactile-feedback
- subcategory: Gran Turismo 7 bass-shaker telemetry converter
- maturity_or_status: Active personal project; README states it is still under development and bugs are expected.
- license: GPL-3.0

repo_url: https://github.com/Helskov/GT7-Shaker-for-linux

docs_url: https://github.com/Helskov/GT7-Shaker-for-linux

source_urls:

- https://github.com/Helskov/GT7-Shaker-for-linux
- https://raw.githubusercontent.com/Helskov/GT7-Shaker-for-linux/main/README.md
- https://raw.githubusercontent.com/Helskov/GT7-Shaker-for-linux/main/LICENSE

key_features:

- Reads GT7 network telemetry from PS4/PS5 and converts it to low-latency audio for bass shakers.
- Handles GT7 UDP heartbeat and Salsa20 telemetry decryption.
- Effects include engine RPM, suspension/road, traction/grip, gear shift, road texture, and collision impact.
- Flask web UI includes dashboard views, live tuning, hardware tests, profiles, tire temperatures, lap/fuel data, and
  mobile keep-awake support.

hardware_or_bom:

- PS4 or PS5 running Gran Turismo 7.
- Linux PC or Raspberry Pi-class Linux host on the same network.
- Soundcard, amplifier, and bass shakers such as ButtKicker or Dayton tactile transducers.

firmware_or_software_stack:

- Python package with Flask, PyAudio, NumPy, audio processing, network manager, and web dashboard modules.
- Installable by pipx from release wheel or from source with requirements.txt.

build_requirements:

- Python 3, virtualenv or pipx, system audio support, and local network access to the console.
- Uses UDP ports 33740 inbound and 33739 outbound, plus port 5000 for the web UI.

compatibility:

- Gran Turismo 7 on PS4/PS5.
- Linux desktop or small Linux rig computer.
- Current roadmap mentions possible motion and wind support, but tactile is the implemented use.

strengths:

- Purpose-built open Linux alternative for GT7 shaker rigs.
- Good UI depth for tuning without a Windows SimHub machine.
- Can run on lightweight hardware mounted to the rig.

limitations:

- Single-title scope.
- Project README warns it is still under development.
- Multi-channel 4.0/5.1 support and wind are planned, not current.

commercial_analogs:

- SimHub ShakeIt Bass Shakers
- ButtKicker Gamer Plus telemetry setups
- Sim Racing Studio U-Shake

fit_notes:

- Strong fit for console GT7 rigs that need tactile feedback without Windows.
- Not a general simulator telemetry hub.

last_checked: 2026-04-29
