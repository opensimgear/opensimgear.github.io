# SpaceMonkey

- project: SpaceMonkey
- maintainer_or_org: PHARTGAMES
- component_category: tactile-feedback
- subcategory: telemetry provider for motion, wind, shakers, and LEDs
- maturity_or_status: Released Windows telemetry provider with broad game support and ongoing release notes through
  2020s.
- license: MIT

repo_url: https://github.com/PHARTGAMES/SpaceMonkey

docs_url: https://github.com/PHARTGAMES/SpaceMonkey

source_urls:

- https://github.com/PHARTGAMES/SpaceMonkey
- https://raw.githubusercontent.com/PHARTGAMES/SpaceMonkey/main/README.md
- https://raw.githubusercontent.com/PHARTGAMES/SpaceMonkey/main/LICENSE

key_features:

- Adds telemetry output for games with weak or missing native telemetry.
- Mimics Codemasters Dirt 4 custom UDP and can also write memory-mapped telemetry.
- Includes telemetry visualization, filtering, output configs, haptics interface, and callback/MMF/UDP outputs.
- README says it has been tested with Sim Racing Studio for motion, wind, shakers, and LEDs, SimCommander 4, and
  SimFeedback.

hardware_or_bom:

- Windows PC and target games.
- Downstream hardware depends on the receiver: motion platform, wind, tactile audio/shakers, LEDs, or wheel/pedal
  tooling.

firmware_or_software_stack:

- Windows/.NET telemetry provider with plugins/installers for supported games.
- Supports UDP, memory-mapped file, and callback integration.

build_requirements:

- Build details are repo-specific; releases are installed by downloading the release and running Register.bat as
  administrator.
- Many game integrations require game-specific plugin/mod installation.

compatibility:

- Supports titles such as Dirt 5, Wreckfest, BeamNG.drive, GTA 5, DCS, NASCAR Heat, WRC titles, Richard Burns Rally,
  VTOL VR, IL-2, UEVR profiles, Wreckfest 2, Cyberpunk 2077, and others listed in README.
- Works with software that accepts Dirt 4/Dirt Rally 2.0 custom UDP.

strengths:

- Useful bridge for feeding existing motion, wind, shaker, and LED stacks.
- MIT license and broad game list.
- Lets OSS/commercial receivers reuse a common telemetry shape.

limitations:

- Windows/admin/plugin workflow can be fragile.
- Some game integrations are deprecated or marked broken/WIP in README.
- It is a telemetry bridge, not a complete tactile hardware controller by itself.

commercial_analogs:

- Sim Racing Studio telemetry support layer
- SimCommander game plugins
- SimHub game plugin layer

fit_notes:

- Best cataloged as a telemetry source/bridge for immersion hardware.
- Cross-category project; filed under tactile-feedback because it can feed shakers and haptics, but it also supports
  motion and wind receivers.

last_checked: 2026-04-29
