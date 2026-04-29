# AMC-AASD15A Firmware

- project: AMC-AASD15A Firmware
- maintainer_or_org: Thanos / tronicgr
- component_category: motion-platforms
- subcategory: AASD15A servo motion controller firmware
- maturity_or_status: Active public firmware/manual repository with release notes through 2025.
- license: No explicit open-source license found; firmware/source openness unclear [uncertain].

repo_url: https://github.com/tronicgr/AMC-AASD15A-Firmware

docs_url: https://github.com/tronicgr/AMC-AASD15A-Firmware/tree/master/Manual-and-Datasheets

source_urls:

- https://github.com/tronicgr/AMC-AASD15A-Firmware
- https://raw.githubusercontent.com/tronicgr/AMC-AASD15A-Firmware/master/README.md
- https://github.com/tronicgr/AMC-AASD15A-Firmware/tree/master/Manual-and-Datasheets

key_features:

- Firmware/manual repository for AMC-AASD15A controller.
- Release notes mention support for SimHub, SRS, SimTools, belt tensioners, platform presets, 4DOF plus traction loss
  and surge, hexapod rotary profiles, and spike filters.
- Includes Thanos utility/configuration tooling and SimTools plugin materials.

hardware_or_bom:

- AMC-AASD15A motion controller.
- AASD15A servo drives and compatible AC servo actuators.
- Optional traction-loss, surge, belt, or hexapod hardware depending on firmware mode.

firmware_or_software_stack:

- AMC-AASD15A firmware binaries/config files, manuals, Thanos utility, SimTools/SRS/SimHub integration path.

build_requirements:

- AMC-AASD15A hardware, firmware update process, servo-drive wiring, and host software configuration.

compatibility:

- AASD15A-based motion rigs.
- SimTools, Sim Racing Studio, and SimHub mentioned in release notes/manual context.

strengths:

- Widely referenced in DIY and commercial AASD15A motion builds.
- Feature-rich support for many rig topologies.
- Strong documentation/manual footprint.

limitations:

- Not confirmed open source; repository lacks explicit OSS license and appears binary/manual oriented.
- Proprietary controller dependency.
- High-voltage servo safety burden remains with builder.

commercial_analogs:

- Motion4Sim M4S controller
- PT Actuator controller boxes
- Qubic System controllers

fit_notes:

- Include because user explicitly requested AMC-AASD15A if applicable.
- Treat as public firmware/documentation, not OSS, unless source/license is later verified.

last_checked: 2026-04-29
