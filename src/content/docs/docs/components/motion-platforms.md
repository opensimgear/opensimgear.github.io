---
title: Motion Platforms
description: Compare seat movers, frame movers, and more advanced motion systems used to add body cues in simulator setups.
sidebar:
  order: 28
---

# Motion Platforms

## What it is

A motion platform physically moves the seat, cockpit, or whole rig to create body cues that complement the visual simulation.

## Where it is used

Motion systems are used in advanced sim racing and flight simulation setups.

## Main variants

- seat movers
- rear-traction-loss add-ons
- full-frame movers
- multi-actuator platforms

## How it works

Motion systems do not reproduce real sustained G-forces. They rely on motion cueing: short, timed movements that trick the body into sensing acceleration, road texture, turbulence, or attitude change. That is different from tactile vibration cues, which mainly add texture through transducers, and from sustained body-pressure cueing systems such as g-seats or belt tensioners, which push on the body without moving the whole rig the same way.

## What matters when choosing

- cue quality and how believable the motion feels
- latency from telemetry to physical movement
- maintenance burden across actuators, joints, and fasteners
- tuning risk if the software profile is poorly set up
- payload capacity and rig compatibility
- noise, safety, and service access

## DIY/build considerations

- actuator choice defines speed, load capacity, and service burden
- geometry and pivot placement change the cueing result dramatically
- safety, e-stop behavior, and pinch hazards must be designed in from the start

## Trade-offs and limitations

Motion can be highly immersive, but it is expensive, space-hungry, mechanically complex, and easy to tune badly. A smaller, faster system with well-managed latency can be more convincing than a larger platform with poor profiles or deferred maintenance.

## Related components

- [Tactile Feedback](/docs/components/tactile-feedback/)
- [G-Seats](/docs/components/g-seats/)
- [Force Feedback and Actuation](/docs/diy/force-feedback-and-actuation/)
