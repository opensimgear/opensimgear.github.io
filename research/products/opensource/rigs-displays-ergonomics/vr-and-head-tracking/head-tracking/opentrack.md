# opentrack

- project: opentrack
- maintainer_or_org: opentrack contributors / Stanislaw Halik
- component_category: vr-and-head-tracking
- subcategory: head tracking software
- maturity_or_status: Active and mature; GitHub shows latest release opentrack 2026.1.0 on 2025-12-31.
- license: Mostly ISC, with a few proprietary dependencies noted by project
- repo_url: https://github.com/opentrack/opentrack
- docs_url: https://github.com/opentrack/opentrack/wiki
- source_urls:
  - https://github.com/opentrack/opentrack
  - https://github.com/opentrack/opentrack/releases
  - https://github.com/opentrack/opentrack/wiki
- key_features:
  - Tracks user head rotation/position and relays it to games and flight simulation software.
  - Supports many input trackers: PointTracker IR LEDs, ArUco markers, UDP relay, joystick axes, Arduino Hatire,
    RealSense, Wiimote, neural-net webcam tracking, Tobii, TrackHat, Eyeware Beam, and others.
  - Supports outputs including SimConnect, FreeTrack protocol, UDP, virtual joystick, Wine freetrack glue, X-Plane
    plugin path, mouse output, FlightGear, FSUIPC, and SteamVR bridge.
  - Runs on Windows, GNU/Linux, and older/unmaintained macOS path.
- hardware_or_bom:
  - Can run with webcam plus printed marker, IR LED clip, TrackHat-style hardware, Tobii/Eyeware devices, RealSense,
    Wiimote, or other supported sensors.
  - No single BOM because it is tracker/protocol middleware.
- firmware_or_software_stack:
  - C++17/Qt/OpenCV-style desktop app with modular tracker, filter, and protocol plugins.
  - Integrates with simulator APIs and legacy headtracking protocols.
- build_requirements:
  - Windows builds with MSVC or MinGW; Linux builds documented in wiki.
  - Users normally install release binaries on Windows.
- compatibility:
  - Broad simulator support via FreeTrack/TrackIR-like paths, SimConnect, FSUIPC, X-Plane, FlightGear, virtual joystick,
    and UDP.
  - Strong fit for DCS, MSFS, X-Plane, IL-2, space sims, and other monitor-based cockpits.
- strengths:
  - De facto open-source headtracking hub.
  - Flexible input/output matrix and mature filtering.
  - Lets users avoid proprietary TrackIR hardware.
- limitations:
  - Setup can be confusing because many tracker/filter/protocol combinations exist.
  - Quality depends heavily on camera, lighting, marker geometry, and profile tuning.
  - Some commercial trackers are supported through their own drivers/services.
- commercial_analogs:
  - NaturalPoint TrackIR 5
  - Tobii Eye Tracker 5
  - TrackHat Sensor V2
  - DelanClip Fusion Pro
- fit_notes:
  - Best open default for monitor users who want view movement while keeping physical controls visible.
  - Pair with AITrack or NeuralNet tracker for no-LED webcam tracking.
- last_checked: 2026-04-29
