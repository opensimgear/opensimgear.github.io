# HadesVR

- project: HadesVR
- maintainer_or_org: HadesVR
- component_category: vr-and-head-tracking
- subcategory: DIY SteamVR-compatible headset/controllers
- maturity_or_status: Active-ish DIY project; latest captured GitHub release 1.5 from 2023, with open issues and active
  docs.
- license: MIT
- repo_url: https://github.com/HadesVR/HadesVR
- docs_url: https://hadesvr.github.io/
- source_urls:
  - https://github.com/HadesVR/HadesVR
  - https://github.com/HadesVR/HadesVR/tree/main/docs
- key_features:
  - DIY SteamVR-compatible VR setup for tinkerers.
  - Includes DIY controllers that can emulate HTC Vive wands or many Valve Index Knuckles controller aspects.
  - Includes headset tracking electronics and integrated wireless receiver for controller data.
  - Uses outside-in tracking with PlayStation Move cameras and PSMoveService/PSMoveServiceEX.
  - Modes include headset plus controllers, headset-only, and controller-only.
- hardware_or_bom:
  - HadesVR Basic HMD PCB, wand controller hardware, optional custom controller PCBs/shells, RF receiver,
    LEDs/ping-pong-ball tracking markers, PlayStation Move cameras.
  - README warns some custom hardware/prints are missing or WIP, especially certain controller shells and Knuckles
    controller parts.
- firmware_or_software_stack:
  - Custom SteamVR driver, PSMoveServiceEX/PSMoveService tracking, microcontroller firmware/electronics for headset and
    controllers.
- build_requirements:
  - PCB assembly/sourcing, through-hole and potentially SMD soldering, 3D printing, microcontroller flashing, SteamVR
    driver setup, camera tracking calibration.
- compatibility:
  - SteamVR applications.
  - Can emulate Vive wands/Index-like controllers, but inside-out tracking and full-body tracking are not supported per
    README.
- strengths:
  - More complete interaction stack than Relativty because controllers are central.
  - MIT license and practical docs.
  - Interesting path for open controller/HMD experimentation.
- limitations:
  - WIP hardware warnings are serious.
  - Relies on external camera tracking and PSMoveService stack.
  - Not turnkey, and reliability may fall short of commercial SteamVR hardware.
- commercial_analogs:
  - Valve Index kit
  - HTC Vive tracker/controller ecosystem
  - Tundra/Vive tracking accessories
- fit_notes:
  - More relevant to VR makers than sim racers wanting plug-and-play.
  - Good open-source reference for SteamVR controller emulation and outside-in DIY tracking.
- last_checked: 2026-04-29
