---
title: Wheel Bases
description:
  Compare gear-driven, belt-driven, and direct-drive wheel bases and understand the trade-offs that matter in sim
  racing.
sidebar:
  order: 4
---

## What it is

A wheel base is the force-feedback drive unit that reads steering input and generates torque at the wheel.

## Where it is used

Wheel bases are a core sim racing component.

## Main variants

- gear-driven bases
- belt-driven bases
- direct-drive bases

## How it works

The base combines motor control, steering position sensing, and force-feedback output. Gear-driven bases send torque
through reduction gears, belt-driven bases add compliance through belts and pulleys, and direct-drive bases mount the
wheel directly to the motor shaft. That drive path determines backlash, friction, peak torque behavior, and how
faithfully small force-feedback details reach your hands.

## What matters when choosing

- torque fidelity across both small and large forces
- detail, smoothness, and backlash behavior
- thermal behavior under long sessions
- mounting strength and flex control
- safety features such as e-stops, slew-rate limits, and sane tuning defaults
- software support and control quality

## DIY/build considerations

- gear and belt systems can hide motor harshness, but they introduce compliance or backlash
- direct-drive systems require strong mounts and careful power management
- motor control tuning affects feel as much as raw torque numbers
- emergency stop strategy matters for higher-torque systems

## Trade-offs and limitations

Gear-driven bases are usually the cheapest and most compact, but gear mesh can add noise and notchiness. Belt-driven
bases often feel smoother while still limiting peak torque and long-session thermal stability. Direct drive usually
offers the best torque fidelity and response, but it raises cost, mounting demands, and safety expectations.
Lower-torque systems can still be effective when matched to realistic expectations and solid pedals.

## Related components

- [Steering Wheels](/docs/components/steering-wheels/)
- [Rigs and Cockpits](/docs/components/rigs-and-cockpits/)
- [Force Feedback and Actuation](/docs/diy/force-feedback-and-actuation/)
