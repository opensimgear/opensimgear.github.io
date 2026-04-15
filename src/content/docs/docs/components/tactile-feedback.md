---
title: Tactile Feedback
description: Learn how tactile transducers work, what they can and cannot simulate, and how to integrate them well.
sidebar:
  order: 26
---

## What it is

Tactile feedback systems use transducers to convert audio or telemetry-derived signals into vibration.

## Where it is used

They are common in advanced sim racing setups and can also support some flight simulation workflows.

## Main variants

- seat-mounted tactile transducers
- pedal-mounted tactile systems
- multi-zone shaker layouts
- audio-driven and telemetry-driven setups

## How it works

These systems do not reproduce full motion. They add vibration cues that can suggest engine behavior, surface texture,
wheel slip, curb strikes, or impacts when the signal chain is clean and the mounts are solid.

## What matters when choosing

- signal quality
- mounting surface
- isolation from the rest of the frame
- number of channels
- tuning effort

## DIY/build considerations

- resonance control matters as much as hardware selection
- amplifier sizing and impedance matching must be safe
- bad mounting can blur all cues into noise

## Trade-offs and limitations

Tactile systems can add useful information at lower cost than motion, but they cannot replace the body cues of a truly
moving system.

The big split is usually between audio-driven setups and telemetry-driven setups. Audio is easier to start with, but it
is less selective. Telemetry takes more setup work, though it usually gives you cleaner cue separation.

## Related components

- [Motion Platforms](/docs/components/motion-platforms/)
- [Power, Safety, and Reliability](/docs/diy/power-safety-and-reliability/)
