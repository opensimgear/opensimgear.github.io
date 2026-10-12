---
title: Hardware
description: Proposed controllers, physical CAN topology, connectors, and power boundaries.
sidebar:
  order: 2
---

## Module controller

STM32G0B1 is the prototype controller baseline; the family includes native USB full-speed and FDCAN peripherals. An external CAN FD transceiver is required between the controller and cable. Production part/package selection must also account for sensor inputs, pin multiplexing, memory, and firmware needs. See the [ST datasheet](https://www.st.com/resource/en/datasheet/stm32g0b1vc.pdf).

A prototype should exercise USB HID, CDC serial, and CAN concurrently while acquiring representative inputs and driving low-power outputs. Module firmware uses C with TinyUSB and libcanard, with pinned versions tested together before a production freeze. The production package and transceiver remain open.

## Gateway controller

The gateway has **two parallel CAN ports on one linear chain** and one USB connection to the host. Both sockets have the same pinout and pass the bus through the gateway; one CAN FD controller and external transceiver attach through a short PCB tap. The gateway can sit at either end or in the middle of the chain. No firmware forwarding is needed between sockets, and neither socket is an independent segment.

Gateway hardware selection remains open. The single-chain requirement removes the previous need for a multi-controller platform. Evaluate STM32G0B1 against the actual USB HID/CDC/CAN workload before selecting a gateway part, package, or board. Validate pin access, memory, bounded queues, scheduling, latency, and registered-controller USB descriptors. Use USB full-speed initially; selection and measured capacity remain pending.

Multiple gateways connect to the same host independently over USB. Each has its own CAN chain and power feed. Do not connect two gateways to the same CAN chain or join their power trunks; this baseline has one allocator and one supply injection point per chain. The cockpit combines the separate networks into one device inventory.

## Separate connections

Each module requires three connectors: one USB-C for direct host connection and two CAN connectors for daisy chaining. The CAN connectors have identical pinouts and are electrically parallel pass-through connections on the same bus segment. One local CAN FD transceiver connects through a short PCB tap. These are not independent CAN ports, a repeater, or a firmware forwarding path.

The required signal set is CAN_H, CAN_L, +12 V, and GND: four conductors, not a final connector pin numbering. The exact connector part, cable specification, shielding, and final pinout remain open. Priorities are a compact locking connector, inexpensive premade cables, and suitable current capacity. Mating safety, grounding, polarity protection, and live-connection behavior must be specified.

The agreed selection route is to qualify a specific premade RJ11/RJ12-style cable first. The exact 6P4C versus 6P6C connector and ratings remain open; publish the pinout only after cable selection and validation. At least four populated conductors are required for the CAN pair, +12 V, and GND. The label “RJ11” alone guarantees neither four wires nor a twisted data pair; two-wire cords are insufficient. Qualify the exact cable's straight-through mapping, twisted CAN pair, and wire/contact ratings for cumulative chain current. This is a custom powered-CAN connection, never a connection to telephone lines or telephone equipment.

Ordinary flat telephone cord is not approved. The normal CAN cable target is a controlled twisted pair around 120 ohms; the selected cable must pass signal-integrity and power tests. RJ45-style cabling is the fallback if the telephone-style candidate fails signal or power requirements. The fallback still requires qualification; it is not a selected part or pinout.

USB-C implementation must explicitly address CC configuration and VBUS detection. A USB-C receptacle alone does not provide a complete USB device power interface. The [USB Type-C specification, Revision 2.0](https://www.usb.org/sites/default/files/USB%20Type-C%20Spec%20R2.0%20-%20August%202019.pdf) provides background on these mechanisms; implementation must use the applicable specification and compliance requirements.

## CAN daisy chain

Connect modules and one gateway into a single linear physical chain, with termination only at the two physical endpoints. Intermediate devices, including an inline gateway, remain unterminated. A resistor across CAN_H and CAN_L at each endpoint limits signal reflections; the usual starting point is 120 ohms, subject to validation with the chosen cable and transceiver.

Gateway and module CAN sockets are parallel pass-through connections. A cable can continue the chain from either socket; socket order has no routing meaning. Do not make a star, close a ring, or attach a second gateway to the chain.

The removable terminator is a small plug containing that resistor, inserted in each endpoint device's unused CAN connector. If the gateway is at an endpoint, place one plug in its spare socket and the other in the final module's spare socket. If the gateway is inline, put both plugs at the endpoint modules and none at the gateway. Move the plug whenever an endpoint moves. No fixed gateway termination may remain enabled in inline placement. Exact connector and resistor specifications follow cable/transceiver validation.

```text
Gateway at an endpoint:
[Terminator] -- Gateway -- Module A -- Module B -- [Terminator]
                  USB         USB-C A     USB-C B
                  to host     independent independent

Gateway inline (still one chain):
[Terminator] -- Module A -- Gateway -- Module B -- [Terminator]
                             USB
                             to host

Multiple gateways:
Host USB -- Gateway A -- its own chain
Host USB -- Gateway B -- its own chain
            Separate CAN and power trunks; one cockpit inventory
```

Each USB-C connection is independent of the CAN chain. [TI's CAN physical-layer application note](https://www.ti.com/lit/an/sloa101b/sloa101b.pdf) explains the linear topology, short taps, and transceiver-dependent hotplug behavior. The prototype must establish cable length, PCB tap length, node count, and arbitration/data bit rates together.

The initial validation target is up to ten modules and 5 m total cable per gateway chain, with typical links under 1 m. Count cable on both sides of an inline gateway together; these are not per-socket allowances. Multiple gateways add separate chains; aggregate host capacity and the supported gateway count require separate validation. Validate that complete configuration at the selected rates and loads before claiming it as a supported limit.

Both gateway sockets share CAN traffic and the chain power trunk. A fault can affect the whole chain; port protection does not create separate CAN fault domains. Report the affected gateway and modules. Validate fault containment between independent gateway chains without assuming USB or shared upstream supplies provide galvanic isolation.

Removing a middle module physically breaks the backbone and may also interrupt bus power to downstream modules. Restore the chain by reconnecting cables or using a bypass coupler, while maintaining correct endpoint termination. Removing the final module requires relocating its termination. Extending the chain can briefly disturb termination; discovery support does not guarantee uninterrupted insertion or removal.

Passive pass-through should remain continuous during an MCU reset or loss of the local electronics rail, provided the connectors and PCB path remain connected. Verify that the unpowered transceiver does not load or disrupt the bus. This differs from physically unplugging a module.

## Power boundaries

One external 12 V supply per chain feeds protected power injection at its gateway; modules regulate it locally. The two gateway sockets continue the powered trunk. Qualify protection and both port paths for endpoint and inline placement, including loads on both sides and total injection current. Do not tie separate gateway power trunks or inject multiple supplies into one chain. Protection/current-limit components and ratings remain to be selected and tested. Standalone USB powers low-power module electronics without requiring the chain supply. Controls take priority within the available USB power budget. Reduce or disable LED, backlight, and readout loads as needed; full brightness may require 12 V. Available-power detection and limits require validation.

USB and CAN power may be present simultaneously. The design must prevent reverse current into the host, the network supply, or an unpowered module. Power-source selection, current limiting, and backfeed protection therefore belong in the schematic from the first prototype.

Route the 12 V supply through the module ahead of its protected local power input. USB must never backfeed the trunk. Upstream cables, connectors, and pass-through traces must carry cumulative downstream current, not just one module's load. Budget voltage drop through every cable and connection so the final module receives adequate voltage under worst-case load.

Before enabling network hotplug, validate inrush, contact sequencing, ground offset, ESD/transient protection, and supply droop at maximum load. Verify that an unpowered transceiver does not disrupt the bus. Logical discovery alone does not establish hotplug support.

The initial power budget covers input electronics, sensors, LEDs, backlighting, and small readouts. Higher-power actuators require separately specified power distribution and fault behavior. Supply sizing and per-module current limits remain to be measured and agreed.
