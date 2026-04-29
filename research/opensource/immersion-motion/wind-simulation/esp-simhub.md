# ESP-SimHub

- project: ESP-SimHub
- maintainer_or_org: eCrowneEng
- component_category: wind-simulation
- subcategory: ESP8266/ESP32 SimHub firmware for wireless peripherals
- maturity_or_status: Active public firmware project; GitHub metadata showed updates in April 2026.
- license: No explicit license found in repository.

repo_url: https://github.com/eCrowneEng/ESP-SimHub

docs_url: http://ecrowne.com/esp-simhub/getting-started

source_urls:

- https://github.com/eCrowneEng/ESP-SimHub
- https://raw.githubusercontent.com/eCrowneEng/ESP-SimHub/main/README.md
- http://ecrowne.com/
- http://ecrowne.com/esp-simhub/getting-started

key_features:

- SimHub-compatible firmware for ESP8266 and ESP32 boards.
- Supports WiFi serial workflows using Perle TruePort or ESP-NOW bridge/feature-node setups.
- Board configuration can be selected for ESP8266 or ESP32 builds.
- Useful for wind, LEDs, and other SimHub Arduino-style outputs without a direct USB cable.

hardware_or_bom:

- ESP8266 or ESP32 board.
- Wind build still needs fans or blowers plus appropriate MOSFET/driver/power wiring [uncertain; project is generic
  SimHub firmware, not a fan-specific BOM].
- Optional second ESP for ESP-NOW bridge mode.

firmware_or_software_stack:

- PlatformIO/Arduino-style firmware derived from SimHub Arduino setup behavior with compatibility shims.
- Works with SimHub serial protocol over USB or virtual COM/WiFi workflows.

build_requirements:

- Git, Visual Studio Code, PlatformIO, selected ESP board environment, and source edits in src/main.cpp.
- Windows virtual COM setup if using TruePort.

compatibility:

- SimHub custom serial/Arduino output ecosystem.
- ESP8266 and ESP32 targets.

strengths:

- Practical way to remove USB tethering from SimHub wind/peripheral hardware.
- Supports modern ESP boards.
- Active and documented outside GitHub.

limitations:

- No explicit repository license found, so reuse rights are unclear.
- Depends on SimHub, which is not open source.
- Hardware safety/current sizing remains on the builder.

commercial_analogs:

- SimHub Arduino wind controllers
- Sim Racing Studio Hurricane wind control path
- Turnkey USB fan-controller boxes

fit_notes:

- Good fit for DIY wind rigs already standardized on SimHub.
- Not an OSS telemetry-to-wind stack by itself because SimHub remains the host.

last_checked: 2026-04-29
