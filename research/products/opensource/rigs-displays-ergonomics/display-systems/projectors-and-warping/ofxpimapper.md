# ofxPiMapper

- project: ofxPiMapper
- maintainer_or_org: Krisjanis Rijnieks / kr15h
- component_category: display-systems
- subcategory: embedded projection mapping
- maturity_or_status: Mature openFrameworks add-on; active enough to have recent GitHub Actions notes, but Raspberry Pi
  disk image support lags newer Pi hardware.
- license: MIT-style or open-source license in repository LICENSE.md [uncertain exact SPDX]
- repo_url: https://github.com/kr15h/ofxPiMapper
- docs_url: https://ofxpimapper.com/
- source_urls:
  - https://ofxpimapper.com/
  - https://github.com/kr15h/ofxPiMapper
  - https://aaltodoc.aalto.fi/bitstream/handle/123456789/18589/master_Rijnieks_Krisjanis_2015.pdf
- key_features:
  - Projection mapping add-on for openFrameworks, designed to run on Raspberry Pi.
  - Can map images, videos, and generative openFrameworks content.
  - Supports multiple mapping surfaces and modes for presentation, texture mapping, surface editing, and source
    assignment.
- hardware_or_bom:
  - Raspberry Pi or other openFrameworks-capable computer plus projector.
  - Prebuilt disk image historically supported Raspberry Pi through 3B+ with older BCM2837 chip; newer Pi 4/5 support is
    work in progress per project README.
- firmware_or_software_stack:
  - openFrameworks add-on with examples.
  - Raspberry Pi builds may require ofxOMXPlayer; remote examples require ofxJSON.
- build_requirements:
  - openFrameworks environment, repository in addons folder, compiler toolchain.
  - Keyboard/mouse for mapping, projector display setup.
- compatibility:
  - Useful for small auxiliary projection surfaces in cockpits, button-panel overlays, or physical set dressing.
  - Not designed as full simulator-wide warp/blend middleware.
- strengths:
  - Low-cost embedded projection mapping path.
  - Source is adaptable inside custom openFrameworks projects.
  - Runs without a large desktop workstation for small displays.
- limitations:
  - Pi image compatibility caveats.
  - Requires coding/openFrameworks comfort for custom content.
  - Not a turnkey multi-projector simulator calibration tool.
- commercial_analogs:
  - MadMapper mini installations
  - Resolume-based projection mapping
  - BrightSign-style embedded media players with mapping workflows
- fit_notes:
  - Good for cockpit ambient projection, annunciator demos, or experimental dashboards.
  - Not enough alone for high-FOV racing/flight projection visuals.
- last_checked: 2026-04-29
