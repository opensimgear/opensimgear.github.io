# OpenHornet

- project: OpenHornet
- maintainer_or_org: OpenHornet / jrsteensen and contributors
- component_category: rigs-and-cockpits
- subcategory: full-scale flight cockpit
- maturity_or_status: Public beta hardware build package; latest captured GitHub release is v0.3.0 "Advancing the
  Airframe" in April 2026 [uncertain year from GitHub page].
- license: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International for OpenHornet works
- repo_url: https://github.com/jrsteensen/OpenHornet
- docs_url: https://openhornet.com/start-here/
- source_urls:
  - https://openhornet.com/start-here/
  - https://github.com/jrsteensen/OpenHornet/releases
  - https://github.com/OpenHornet
  - https://openhornet.com/wp-content/uploads/2018/10/System-Architecture.pdf
- key_features:
  - Open hardware package for a high-fidelity F/A-18C simulator cockpit.
  - Release package includes physical-component fabrication and assembly documentation for structures, panels, PCBs, and
    cables.
  - Project page reports thousands of parts and deep assembly hierarchy, showing large mechanical and electronics scope.
  - Planned/ongoing features include embedded software, cockpit lighting, rudder pedals, HUD/AoA work, and seat cosmetic
    details.
- hardware_or_bom:
  - Mechanical manufacturing files, engineering drawings, construction plans, ECAD/PCB work, cable/interconnect
    material, and user mods are distributed through GitHub releases.
  - Build assumes MDF, acrylic, ABS, thin aluminum, PETG prints, SLA/DLP prints, and SMD electronics assembly.
- firmware_or_software_stack:
  - OpenHornet software is tracked separately at https://github.com/OpenHornet/OpenHornet-software.
  - Hardware package uses microcontrollers, RS485/ABSIS bus concepts, and cockpit electronics; some software was still
    in planned/active development per captured release notes.
- build_requirements:
  - CNC router with roughly X-Carve 1000x1000-class capability.
  - K40-class laser engraver/cutter with LightBurn-capable controller.
  - FDM printer, SLA/DLP printer, general shop tools, soldering tools, SMD rework, multimeter, ESD-safe electronics
    setup.
- compatibility:
  - Intended for F/A-18C home cockpit use, primarily in DCS-style sim environments [uncertain].
  - Can be mixed with some commercial modules through documented user mods, such as Winwing MIP integration in release
    notes.
- strengths:
  - One of the most complete open cockpit ecosystems for modern combat flight simulation.
  - Rich manufacturing package rather than loose concept drawings.
  - Active community and visible release cadence.
- limitations:
  - NonCommercial license limits commercial reuse.
  - Very high build complexity, tooling cost, and validation burden.
  - Release notes include significant known issues for electronics and some assemblies.
- commercial_analogs:
  - NeoEngress F/A-18 trainer cockpit
  - Dogfight Boss F/A-18 cockpit modules
  - Winwing F/A-18 cockpit ecosystem
- fit_notes:
  - Best treated as a long-term cockpit build program, not a weekend rig.
  - Valuable source for dimensions, panel construction, and cockpit electronics patterns even if only partial assemblies
    are built.
- last_checked: 2026-04-29
