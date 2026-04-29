# Monado

- project: Monado
- maintainer_or_org: Monado / freedesktop.org / Collabora contributors
- component_category: vr-and-head-tracking
- subcategory: OpenXR runtime
- maturity_or_status: Active open-source XR runtime; developer site is current and lists Linux, Android, and Windows
  development.
- license: Permissive open-source licenses; exact components vary by repository
- repo_url: https://gitlab.freedesktop.org/monado/monado
- docs_url: https://monado.freedesktop.org/
- source_urls:
  - https://monado.freedesktop.org/
  - https://monado.dev/
  - https://gitlab.freedesktop.org/monado/monado
- key_features:
  - Cross-platform open-source OpenXR runtime for VR/AR on Linux, Android, Windows, and other devices.
  - Implements OpenXR API and supports Vulkan, OpenGL/ES, D3D11, D3D12, and headless applications.
  - Provides XR compositor, mesh-based distortion, multiple projection layers, quad layers, 6DoF tracking frameworks,
    and driver framework.
  - Supports open drivers and integrations including OSVR HDK, Vive/Index paths, North Star, Rift S, PSVR, PS Move, WMR,
    Xreal Air, libsurvive, librealsense, and OpenHMD-derived devices.
- hardware_or_bom:
  - Runtime for existing or DIY XR hardware, not a headset BOM.
  - Supported hardware depends on driver and OS; many native drivers are Linux-focused.
- firmware_or_software_stack:
  - OpenXR runtime/compositor, tracking components, driver framework, SLAM/VIO through Monado Basalt, optional
    libsurvive and other driver integrations.
- build_requirements:
  - Linux/Android/Windows development setup per repository docs.
  - OpenXR loader configuration and hardware-specific dependencies.
- compatibility:
  - OpenXR applications and development tools.
  - Useful for Linux sim/XR experimentation, supported HMDs, and open hardware integration.
- strengths:
  - Current center of gravity for open XR runtime work.
  - Conformant OpenXR implementation and modular driver framework.
  - Better future path than unmaintained OpenHMD for many devices.
- limitations:
  - Many VR hardware drivers are Linux-limited.
  - Windows direct mode for existing HMDs remains constrained by NDA/proprietary API blockers per docs.
  - End-user setup can be complex.
- commercial_analogs:
  - SteamVR runtime
  - Meta PC runtime
  - Windows Mixed Reality/OpenXR runtime
  - Varjo Base runtime
- fit_notes:
  - Most relevant open runtime for DIY/open XR hardware and Linux simulator users.
  - Not a head tracker by itself; it is the runtime layer that can consume tracking and drive HMD display pipelines.
- last_checked: 2026-04-29
