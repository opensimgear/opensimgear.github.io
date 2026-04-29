# Belt Tensioner Robot Servo

- project: Belt-Tensioner-Robot-Servo
- maintainer_or_org: StuyoP
- component_category: belt-tensioners
- subcategory: SimHub active belt tensioner using hobby servos
- maturity_or_status: Older working DIY project; GitHub metadata showed last update in 2022.
- license: GPL-3.0

repo_url: https://github.com/StuyoP/Belt-Tensioner-Robot-Servo

docs_url: https://github.com/StuyoP/Belt-Tensioner-Robot-Servo

source_urls:

- https://github.com/StuyoP/Belt-Tensioner-Robot-Servo
- https://raw.githubusercontent.com/StuyoP/Belt-Tensioner-Robot-Servo/main/README.md
- https://www.youtube.com/watch?v=5ap_1Gf3ZiI
- https://www.thingiverse.com/thing:5148973

key_features:

- Active sim-racing harness tensioner controlled from SimHub.
- Uses general acceleration values such as sway and global acceleration G.
- Includes reset behavior when the game stops.
- Provides 3D-print resources for rollers and PSU box.

hardware_or_bom:

- Arduino Nano.
- Two DSServo RDS5160 SSG 60 kg 8.4 V 180-degree servos with full metal brackets.
- XL4005/XL4015/XL6009 buck/boost module.
- Optional supercapacitors, XT60 connector, voltmeter, fuse, and printed parts.
- README notes 35 kg servos failed; 60 kg servos are recommended.

firmware_or_software_stack:

- SimHub profile and Arduino/custom serial approach based on blekenbleu SimHub Custom Serial/Blue Pill work.

build_requirements:

- SimHub, Arduino flashing, external servo power supply, printed/mechanical belt linkage, and careful current handling.

compatibility:

- SimHub-supported games exposing acceleration telemetry.
- Arduino Nano and standard serial link.

strengths:

- Clear sim-racing use case with realistic BOM and power warnings.
- GPL-licensed and based on public SimHub serial patterns.
- Explicit servo torque/current lessons from build experience.

limitations:

- Depends on closed-source SimHub.
- Safety-critical harness forces need conservative mechanical stops and emergency release.
- Servo durability/noise may be limiting.

commercial_analogs:

- SimXperience G-Belt
- Qubic System QS-BT1
- PT Actuator belt tensioner modules

fit_notes:

- Strong DIY reference for low-cost belt-tensioner mechanics.
- Use as a research input, not a drop-in safety-certified product.

last_checked: 2026-04-29
