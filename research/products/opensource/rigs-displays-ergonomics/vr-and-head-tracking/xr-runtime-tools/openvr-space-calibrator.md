# OpenVR Space Calibrator

- project: OpenVR Space Calibrator
- maintainer_or_org: pushrax
- component_category: vr-and-head-tracking
- subcategory: mixed tracking-space calibration
- maturity_or_status: Mature but old upstream; latest captured release v1.4 from 2022, with community forks in use
  [uncertain].
- license: MIT
- repo_url: https://github.com/pushrax/OpenVR-SpaceCalibrator
- docs_url: https://github.com/pushrax/OpenVR-SpaceCalibrator/wiki
- source_urls:
  - https://github.com/pushrax/OpenVR-SpaceCalibrator
  - https://lvra.gitlab.io/docs/steamvr/spacecal/
- key_features:
  - Aligns multiple SteamVR/OpenVR tracking systems so tracked devices from one vendor can be used with another
    HMD/tracking space.
  - Works in background after calibration and can automate applying saved profiles.
  - Includes SteamVR dashboard overlay workflow and installer that sets SteamVR multi-driver configuration.
- hardware_or_bom:
  - Mixed VR hardware such as Rift CV1/Rift S/Quest/WMR HMDs with Vive trackers, Vive wands, Index controllers, or other
    tracked devices.
  - Requires at least one reference and one target device for calibration.
- firmware_or_software_stack:
  - C++ OpenVR app and driver components.
  - Builds with Visual Studio 2017; no external dependencies per README.
- build_requirements:
  - SteamVR, Windows, supported mixed-device setup, installer or Visual Studio build.
  - Calibration requires careful paired-device movement and periodic recalibration if spaces drift.
- compatibility:
  - SteamVR/OpenVR mixed tracking systems.
  - Rift CV1 x Vive devices work well per README; inside-out HMDs x Vive devices can work but drift when moving around.
- strengths:
  - Solves a real mixed-VR rig problem for trackers/controllers.
  - MIT license and clear calibration workflow.
  - Useful for sim users combining seated HMDs with Lighthouse accessories.
- limitations:
  - Calibration drift, especially with wireless Quest/inside-out systems.
  - Some combinations do not work, such as non-Rift HMD with Touch controllers per README.
  - Upstream is old; current best fork may vary.
- commercial_analogs:
  - Native SteamVR Lighthouse ecosystem
  - Vendor mixed-tracking calibration tools
  - Tundra/Vive tracker-only homogeneous setups
- fit_notes:
  - Useful for VR sim cockpits that need extra tracked props, hands, or accessories.
  - Less important for seated VR racing if no external trackers are used.
- last_checked: 2026-04-29
