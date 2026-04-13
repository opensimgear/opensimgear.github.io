---
title: Flight Simulation Overview
description: Learn how flight sim hardware fits together, which controls matter for different aircraft types, and where to go deeper in the OpenSimGear wiki.
sidebar:
  order: 1
---

# Flight Simulation Overview

Flight simulation hardware should match the aircraft and procedures you care about most. A compact joystick can cover casual flying well, while more specialized setups may need a yoke or cyclic, a separate throttle, rudder pedals with toe brakes, panels, and better visibility tools. The right setup depends on whether you mostly fly general aviation, airliners, helicopters, or military aircraft.

## What matters most in flight sim hardware

- matching primary controls to the aircraft you fly most
- smooth axes in the stick, yoke, throttle, and pedals
- enough physical inputs for common cockpit flows without hunting for the keyboard
- visibility and situational awareness from displays, head tracking, or VR
- comfort for long sessions and repeatable reach to controls
- whether tactile or motion hardware adds useful cues or only more setup work

## Common setup patterns

### General aviation and airliners

Often prioritize yokes, throttle quadrants, rudder pedals, and accessible panel inputs. Pedal travel, toe-brake feel, and stable mounting matter here because taxiing, crosswind work, and coordinated turns rely on them.

### Stick-based fixed-wing flying

Often prioritize joysticks, HOTAS throttles, hats, triggers, rudder pedals, and head tracking or VR. This bucket fits many combat aircraft, space-constrained desktop setups, and other aircraft that are still flown mainly as stick-and-throttle fixed-wing machines.

### Helicopters and rotorcraft

Usually benefit from a cyclic-style stick, a dedicated collective when possible, anti-torque pedals, and a setup that supports fine low-speed control. Helicopter workflows differ enough from fixed-wing flying that they are worth treating separately rather than folding them into a generic combat category.

### Full-cockpit immersion

May add dedicated panels, larger display systems, VR, tactile cues, or motion, but these only pay off once the main control layout, pedal choice, and seating position already fit the flying you do most.

## Reading paths

- Read [Joysticks](/docs/components/joysticks/) next if you mostly fly stick-based fixed-wing aircraft, or [Yokes](/docs/components/yokes/) if you mostly fly GA and airliners.
- Read [Throttles](/docs/components/throttles/) for fixed-wing engine-control layouts, or [Collectives](/docs/components/collectives/) if you mainly fly helicopters and want rotorcraft-specific ergonomics.
- Read [Rudder Pedals](/docs/components/rudder-pedals/) next when yaw control, toe brakes, or anti-torque pedal feel is the remaining weak point.
- Read [Button Boxes and Panels](/docs/components/button-boxes-and-panels/) when the primary controls are in place and you need faster access to repeat cockpit actions.
- Read [Display Systems](/docs/components/display-systems/) or [VR and Head Tracking](/docs/components/vr-and-head-tracking/) when visibility, scan flow, or keeping sight of real controls becomes the next bottleneck.
- Add [Motion Platforms](/docs/components/motion-platforms/) only when the core controls, seating, and display setup are already stable.

## Related guides

- [Choosing Your First Flight Sim Setup](/docs/guides/choosing-your-first-flight-sim-setup/)
- [Matching Hardware to Goals](/docs/guides/matching-hardware-to-goals/)
- [Buy vs Build](/docs/guides/buy-vs-build/)
