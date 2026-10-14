---
title: Hardware and connections
description: OpenSimGear prototype boards, control inputs, powered CAN cables, termination and power requirements.
sidebar:
  order: 2
---

The current hardware consists of a generic device board and a USB-to-CAN gateway. Both use an STM32G0B1CBT6 controller,
USB-C and two powered CAN sockets. The current PCB version is **0.1.0**.

These are unassembled prototype designs. Circuit and layout checks have passed, but assembled boards, cables and power
behavior have not been physically validated. Use the board-specific sources linked below before fabrication or bench
testing.

## Connecting controls

The device board provides eight analogue inputs and 24 digital lines. Optional TCA9555 expansion boards add 16 digital
inputs each. Firmware configuration determines which inputs become buttons, axes, hats, encoders or selectors.

**Control inputs are 3.3 V only.** Use passive contacts that switch to ground or suitable 0–3.3 V sensors. Never connect
5 V or the chain's 12 V supply to an input header. Connect internal wiring with power off. Controls and expansion boards
are not included in the base-board bill of materials.

## CAN sockets and cables

The two four-contact sockets, called **4P4C**, carry both communication and power. They are often sold as RJ9/RJ10/RJ22.
Both sockets connect to the same bus; their order does not determine a device's identity.

| Contact | Connection       |
| ------- | ---------------- |
| 1       | 12 V chain power |
| 2       | CAN_H            |
| 3       | CAN_L            |
| 4       | Ground           |

Contact numbering follows the selected connector's manufacturer drawing, not an assumed viewing direction. Use the
[module pinout](https://github.com/opensimgear/device-template/blob/main/electronics/boards/starter/0.1.0/README.md) and
[gateway connector drawings](https://github.com/opensimgear/device-gateway/blob/main/electronics/boards/gateway/0.1.0/FOOTPRINTS.md).

**These are custom powered ports. Never connect them to telephone or Ethernet equipment.** Verify continuity on every
contact before powering a new cable. Wiring must be straight through, with CAN_H and CAN_L on a suitable twisted pair.
Reversed handset cords and generic flat telephone cables are not qualified.

## One linear chain

Use one gateway per chain. Place exactly two removable **120 Ω termination plugs** across contacts 2 and 3, one at each
physical end of the chain. Termination helps the CAN signal travel cleanly along the cable. Intermediate boards have no
terminator.

```text
Gateway at an end:
[Terminator] — Gateway — Module A — Module B — [Terminator]
                 │
                USB

Gateway in the middle:
[Terminator] — Module A — Gateway — Module B — [Terminator]
                            │
                           USB
```

Do not create a star or ring. Removing a middle board breaks the chain; reconnect the remaining cables or use an
appropriate bypass coupler. Move the termination plugs when the endpoints change.

## Power requirements

One regulated external **12 V supply** powers each gateway chain. The gateway uses a centre-positive 5.5 × 2.1 mm barrel
connector. USB powers local electronics but does not supply 12 V to the chain. Do not join independently powered gateway
chains.

For prototype bench work, use a current-limited supply set to **no more than 0.5 A**. The provisional total budget is
**250 mA for the gateway and all modules at 20–40 °C**. This is not a validated system rating; fuses provide fault
protection rather than a precise current limit.

Cable length, device count, hot plugging and power transitions have no established physical rating. Power off before
connecting unqualified cables. The chain has no established motor-power rating.

## Board sources

- [Device board](https://github.com/opensimgear/device-template/tree/main/electronics/boards/starter/0.1.0): wiring,
  bill of materials and fabrication files.
- [Gateway board](https://github.com/opensimgear/device-gateway/tree/main/electronics/boards/gateway/0.1.0): connectors,
  power and fabrication files.
- [Current status](/gear/architecture/decisions/): software checks and hardware validation limits.
