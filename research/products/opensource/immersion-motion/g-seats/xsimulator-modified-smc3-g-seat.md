# XSimulator Modified SMC3 for G-Seat

- project: Modified SMC3 code for G-Seat
- maintainer_or_org: BlazinH / XSimulator community
- component_category: g-seats
- subcategory: adapted SMC3 control code for g-seat actuation
- maturity_or_status: Forum FAQ entry published 2019; source linked from forum post.
- license: Not stated on visible FAQ page [uncertain]; upstream SMC3 is MIT.

repo_url: null

docs_url: https://www.xsimulator.net/community/faq/modified-smc3-code-for-g-seat.325/

source_urls:

- https://www.xsimulator.net/community/faq/modified-smc3-code-for-g-seat.325/
- https://github.com/SimulatorMotorController/SMC3

key_features:

- XSimulator FAQ points to modified SMC3 code for g-seat use by BlazinH.
- Reuses SMC3-style Arduino motion-control foundation for seat panel/servo/actuator outputs [uncertain].
- Intended for g-seat category in XSimulator FAQ.

hardware_or_bom:

- Arduino-compatible controller and g-seat actuators/servos [uncertain].
- Motor driver/feedback hardware depends on the modified SMC3 implementation [uncertain].

firmware_or_software_stack:

- Modified SMC3 Arduino firmware linked from XSimulator forum.
- SimTools/FlyPT-style motion-output host likely used through XSimulator ecosystem [uncertain].

build_requirements:

- XSimulator account may be required for linked post/download.
- Arduino flashing, motor/servo driver wiring, and SimTools output tuning.

compatibility:

- XSimulator/SimTools DIY motion ecosystem.
- Upstream SMC3 supports up to 3 motors; g-seat variant behavior needs source inspection [uncertain].

strengths:

- Connects g-seat control to a known DIY motion-controller base.
- More actuator-controller oriented than simple RC-servo examples.

limitations:

- Sparse public metadata and forum-gated detail.
- License for modifications is unclear.
- Safety and calibration risk are high for seat-pressure hardware.

commercial_analogs:

- SimXperience GS-5
- GS-4 style servo-panel g-seats
- SRS U-Shake is tactile-only, but competes as lower-effort seat feedback.

fit_notes:

- Treat as a lead, not a verified open-hardware package.
- Worth deeper inspection if XSimulator downloads are accessible.

last_checked: 2026-04-29
