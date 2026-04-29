# Relativty

- project: Relativty
- maintainer_or_org: Relativty / Maxim xyz and Gabriel Combe
- component_category: vr-and-head-tracking
- subcategory: open-source VR headset
- maturity_or_status: Dormant but influential DIY VR headset project; README includes a May 2023 recommended build note.
- license: GPL-3.0
- repo_url: https://github.com/relativty/Relativty
- docs_url: https://github.com/relativty/Relativty#readme
- source_urls:
  - https://github.com/relativty/Relativty
  - https://www.relativty.com/
  - https://www.open-electronics.org/diy-relativty-open-source-vr-headset/
- key_features:
  - Fully open-source hardware, software, and firmware VR headset project with SteamVR support.
  - DIY 3DoF headset baseline, Arduino-compatible electronics, 3D printed mechanical parts, and experimental body
    tracking.
  - README describes dual-screen 2K/120 FPS target and hacker-focused build process.
- hardware_or_bom:
  - 3D printed HMD shell, lenses, strap, foam, dual display module, custom PCB/electronics, screws BOM,
    Arduino-compatible components.
  - Mechanical files live in Relativty_Mechanical_build; electronics include Eagle board files.
- firmware_or_software_stack:
  - Relativty Driver for SteamVR, Arduino-compatible firmware/electronics, Python path setup in older build flow.
- build_requirements:
  - 3D printer, soldering tools, electronics/programming comfort, Arduino tooling, SteamVR setup, and patience debugging
    custom HMD hardware.
- compatibility:
  - SteamVR-oriented.
  - Basic project is 3DoF and lacks built-in controller support; README points users wanting fuller 6DoF/controllers
    toward HadesVR.
- strengths:
  - Clear open-hardware reference for DIY headset architecture.
  - Large star/fork footprint and community history.
  - Good educational project for optics, display, firmware, and SteamVR driver learning.
- limitations:
  - Not a consumer product.
  - 3DoF baseline is limited for modern VR sims and games.
  - Sourcing displays/lenses and debugging electronics can be hard.
  - Dormant/community support risk.
- commercial_analogs:
  - Meta Quest 3/3S as low-cost consumer VR baseline
  - Valve Index
  - Bigscreen Beyond
  - Pimax Crystal Light
- fit_notes:
  - Better research/build platform than practical sim-racing headset in 2026.
  - Useful for open-hardware VR corpus because it exposes headset mechanics, electronics, firmware, and driver layers.
- last_checked: 2026-04-29
