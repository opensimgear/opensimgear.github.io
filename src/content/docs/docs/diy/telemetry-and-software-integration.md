---
title: Telemetry and Software Integration
description: Understand how simulator data reaches tactile systems, motion platforms, and other advanced hardware.
sidebar:
  order: 7
---

## What telemetry does

Telemetry provides simulator state that can drive external hardware such as tactile systems, fans, motion platforms, and
dashboards.

## What matters

- data quality
- update rate
- software compatibility
- signal mapping
- failure behavior when data stops or spikes

## Why it matters

Advanced hardware often succeeds or fails at the integration layer rather than the mechanical one.

A strong mechanism with messy signal handling still feels bad. Latency, noisy data, poor filtering, and bad fallback
behavior can turn a solid build into something distracting or unreliable.

## Practical reality

This is one of the least glamorous parts of a build, but it is often the part that decides whether the hardware feels
polished. Good integration is what makes a motion profile feel intentional instead of random, or a tactile setup feel
informative instead of buzzy.
