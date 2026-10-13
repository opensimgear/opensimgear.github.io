---
title: Hardware
description: Prototype controllers, powered 4P4C connectors and physical CAN topology.
sidebar:
  order: 2
---

The current module and gateway boards use STM32G0B1CBT6 with USB full-speed and one FDCAN path through an external CAN FD transceiver. Editable KiCad sources, exact-part BOMs and manufacturing exports live with the [device template](https://github.com/opensimgear/device-template/tree/main/electronics) and [gateway](https://github.com/opensimgear/device-gateway/tree/main/electronics). PCB version is 0.1.0 until launch.

## Connectors

Each board has USB-C and two parallel 4P4C powered-CAN sockets. Contact numbering follows the selected manufacturer's drawing and local footprint:

| Contact | Signal |
| --- | --- |
| 1 | BUS_12V |
| 2 | CAN_H |
| 3 | CAN_L |
| 4 | GND |

The four-position sockets are commonly sold as RJ9/RJ10/RJ22. Six-contact historical boards have a different pinout. This is a custom powered-CAN interface and must never connect to telephone equipment. Verify every contact of a straight-through cable before applying power. Reversed handset cords and flat untwisted telephone cables are not qualified.

## Linear CAN chain

Both sockets continue the same CAN pair and power trunk. A local transceiver attaches through a short PCB tap. Socket order has no routing meaning and cannot identify a module's physical position.

Use one gateway per chain and exactly two removable 120 Ω terminator plugs across contacts 2/3 at the physical endpoints. At an endpoint, the gateway's spare socket contains a plug. An inline gateway is unterminated. Relocate termination when an endpoint changes; do not make a star or ring.

```text
Endpoint gateway:
[Terminator] -- Gateway -- Module A -- Module B -- [Terminator]
                  USB
                  to host

Inline gateway:
[Terminator] -- Module A -- Gateway -- Module B -- [Terminator]
                             USB
                             to host
```

Multiple gateways connect independently over USB, with separate CAN and power trunks. Removing a middle module breaks physical continuity; reconnect the cables or use an appropriate bypass coupler. Passive pass-through remains connected during local MCU reset while the connectors and PCB path remain intact. Unpowered transceiver behavior has no physical acceptance evidence.

## Power

One regulated external 12 V supply feeds protected gateway injection and local module regulation. USB powers local electronics without generating 12 V on the trunk. Both boards include reverse-blocking source selection; actual leakage, handover and fault behavior are unmeasured. Do not join independently powered gateway trunks.

The gateway's provisional bench budget is 250 mA total for its 12 V branch and all modules at 20–40 °C, with a supply current limit of 0.5 A. Resettable fuses are fault protection rather than precision current limiters. No production cable-current, hotplug or motor-power rating is established.

## Evidence

Static ERC, DRC and schematic/PCB parity pass. No assembled STM32 chain has been tested. Ten modules/5 m total cable per chain, typically under 1 m per link, are qualification targets rather than supported electrical limits. Native software capacity does not establish a power allowance.

See the [module validation record](https://github.com/opensimgear/device-template/blob/main/electronics/boards/starter/0.1.0/VALIDATION.md), [gateway validation record](https://github.com/opensimgear/device-gateway/blob/main/electronics/boards/gateway/0.1.0/VALIDATION.md) and [GitHub project](https://github.com/orgs/opensimgear/projects/2).
