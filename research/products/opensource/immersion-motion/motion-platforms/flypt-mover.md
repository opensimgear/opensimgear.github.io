# FlyPT Mover

- project: FlyPT Mover
- maintainer_or_org: FlyPTMover / FlyPT
- component_category: motion-platforms
- subcategory: modular motion-cueing software
- maturity_or_status: Active personal-use freeware; official site had Mover 3.7 beta download and recent docs crawl.
- license: Free for personal home use; not confirmed open source.

repo_url: https://github.com/FlyPTMover

docs_url: https://www.flyptmover.com/

source_urls:

- https://www.flyptmover.com/
- https://www.flyptmover.com/mover-3-7/downloads
- https://github.com/FlyPTMover

key_features:

- Modular motion simulator software with sources, poses, filters, outputs, and rig previews.
- Supports pose-based motion, classic motion cueing, VR motion compensation, serial/UDP/shared-memory outputs,
  transducer module, joystick sources, calculated sources, soft transitions, parking, and customizable filters.
- Outputs can target SMC3/SPS, ODrive, Thanos, serial strings, UDP, and shared memory per official navigation/docs.

hardware_or_bom:

- Depends on selected rig: SMC3 DC motors, ODrive systems, Thanos/AASD15A systems, custom serial/UDP hardware, or other
  compatible controllers.

firmware_or_software_stack:

- Windows motion-cueing application with many filters and output modules.
- Not a firmware project; pairs with controller firmware/hardware.

build_requirements:

- Windows PC, supported game telemetry source, configured rig geometry, output protocol/controller, and careful tuning.

compatibility:

- Official site lists broad game support and customizable sources for additional games/software.
- Open to DIY custom builds and compatible with commercial rigs sharing communication protocols.

strengths:

- Highly flexible motion-cueing layer for DIY rigs.
- Important companion software for many open-hardware builds.
- Free for personal home use.

limitations:

- Not confirmed open source.
- Documentation site says it is WIP.
- Motion quality depends heavily on user tuning and controller safety.

commercial_analogs:

- Sim Racing Studio motion software
- SimTools
- SimFeedback

fit_notes:

- Include as ecosystem reference because many open-hardware motion projects rely on it.
- Do not classify as OSS unless source/license is verified.

last_checked: 2026-04-29
