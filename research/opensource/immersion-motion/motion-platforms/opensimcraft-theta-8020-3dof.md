# OpenSimCraft Theta 8020 3DOF

- project: SC230 Theta 3DOF Sim Rig
- maintainer_or_org: OpenSimCraft
- component_category: motion-platforms
- subcategory: 80/20 aluminum 3DOF motion cockpit
- maturity_or_status: Early open hardware design; README says current work is finalizing cockpit chassis 1.0.
- license: No explicit license found in repository.

repo_url: https://github.com/OpenSimCraft/theta-8020-3dof

docs_url: https://opensimcraft.github.io/

source_urls:

- https://github.com/OpenSimCraft/theta-8020-3dof
- https://raw.githubusercontent.com/OpenSimCraft/theta-8020-3dof/master/README.md
- https://opensimcraft.github.io/

key_features:

- 3DOF sim rig made from 80/20 T-slot aluminum extrusions.
- Modular chassis layout: cockpit, pitch/yaw, roll, and cradle chassis.
- Intended expansion path from static cockpit to motion chassis.

hardware_or_bom:

- 80/20 T-slot extrusion structure.
- Chassis-specific parts and machining codes are planned.
- README notes BOM verification and STEP conversion as TODOs.

firmware_or_software_stack:

- Repository appears mechanical/CAD focused; motion controller/software stack is not specified in README [uncertain].

build_requirements:

- 80/20 ordering/machining, assembly instructions, CAD/STEP work, and later motion-control integration.

compatibility:

- General sim cockpit/motion chassis use.
- Controller/telemetry compatibility not specified yet [uncertain].

strengths:

- Open, modular 8020 cockpit-to-motion concept.
- Good fit with rig-planning/component taxonomy.

limitations:

- Early status with unfinished BOM and assembly docs.
- No explicit license found.
- Software/actuation stack not defined in top-level docs.

commercial_analogs:

- Sim-Lab P1X plus motion add-ons
- Trak Racer TR160 with motion upgrade
- DOF Reality H3-style compact 3DOF rigs

fit_notes:

- Already appears elsewhere in open-source research, but this file places it inside the
  immersion-motion/motion-platforms category.
- Treat as open design lead until licensing and BOM mature.

last_checked: 2026-04-29
